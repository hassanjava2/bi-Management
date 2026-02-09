/**
 * مركز التدريب والتطوير
 */
import { useState, useEffect } from "react";
import { Row, Col, Card, Button, Select, Tag, Space, message, Statistic, Modal, Input, Form, InputNumber, Empty, Segmented } from "antd";
import { PlusOutlined, BookOutlined, CalendarOutlined, TeamOutlined, SafetyCertificateOutlined, ClockCircleOutlined, DesktopOutlined, EnvironmentOutlined, SendOutlined } from "@ant-design/icons";
import { PageHeader, DateDisplay, LoadingSkeleton } from "../components/shared";
import { API_BASE, getAuthHeaders } from "../utils/api";

interface Course {
  id: string;
  title: string;
  description: string | null;
  category: string;
  level: string;
  courseType: string;
  durationHours: number | null;
  instructorName: string | null;
  status: string;
  maxParticipants: number | null;
  cost: string | null;
  createdAt: string;
}

interface Session {
  id: string;
  courseId: string;
  title: string | null;
  startDate: string;
  endDate: string;
  locationType: string;
  location: string | null;
  status: string;
  maxParticipants: number | null;
  currentParticipants: number;
}

const CATEGORY_CONFIG: Record<string, { label: string; icon: string; color: string }> = {
  technical: { label: "تقني", icon: "💻", color: "blue" },
  soft_skills: { label: "مهارات ناعمة", icon: "🤝", color: "purple" },
  compliance: { label: "امتثال", icon: "📋", color: "red" },
  management: { label: "إدارة", icon: "👔", color: "orange" },
  sales: { label: "مبيعات", icon: "💰", color: "green" },
  general: { label: "عام", icon: "📚", color: "default" },
};

const LEVEL_CONFIG: Record<string, { label: string; color: string }> = {
  beginner: { label: "مبتدئ", color: "success" },
  intermediate: { label: "متوسط", color: "warning" },
  advanced: { label: "متقدم", color: "error" },
};

const TYPE_CONFIG: Record<string, { label: string; icon: React.ReactNode }> = {
  classroom: { label: "حضوري", icon: <EnvironmentOutlined /> },
  online: { label: "عن بعد", icon: <DesktopOutlined /> },
  hybrid: { label: "مختلط", icon: <TeamOutlined /> },
  self_paced: { label: "ذاتي", icon: <BookOutlined /> },
};

export default function TrainingCenter() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<string>("courses");
  const [filter, setFilter] = useState({ category: "", level: "", search: "" });
  const [showModal, setShowModal] = useState(false);
  const [form] = Form.useForm();

  useEffect(() => { loadData(); }, [activeTab, filter]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [statsRes] = await Promise.all([fetch(`${API_BASE}/api/training/stats`, { headers: getAuthHeaders() })]);
      if (statsRes.ok) setStats(await statsRes.json());

      if (activeTab === "courses") {
        const params = new URLSearchParams();
        if (filter.category) params.append("category", filter.category);
        if (filter.level) params.append("level", filter.level);
        if (filter.search) params.append("search", filter.search);
        const res = await fetch(`${API_BASE}/api/training/courses?${params}`, { headers: getAuthHeaders() });
        if (res.ok) setCourses((await res.json()).courses || []);
      } else if (activeTab === "sessions") {
        const res = await fetch(`${API_BASE}/api/training/sessions?upcoming=true`, { headers: getAuthHeaders() });
        if (res.ok) setSessions(await res.json());
      }
    } catch (error) { console.error(error); }
    finally { setLoading(false); }
  };

  const handleCreate = async (values: any) => {
    try {
      const res = await fetch(`${API_BASE}/api/training/courses`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          title: values.title,
          description: values.description,
          category: values.category,
          level: values.level,
          courseType: values.courseType,
          durationHours: values.durationHours || null,
          instructorName: values.instructorName,
          maxParticipants: values.maxParticipants || null,
          cost: values.cost || null,
        }),
      });
      if (res.ok) {
        message.success("تم إنشاء الدورة بنجاح");
        setShowModal(false);
        form.resetFields();
        loadData();
      } else {
        message.error("فشل في إنشاء الدورة");
      }
    } catch (error) {
      console.error(error);
      message.error("حدث خطأ أثناء إنشاء الدورة");
    }
  };

  const publishCourse = async (id: string) => {
    try {
      await fetch(`${API_BASE}/api/training/courses/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "published" }),
      });
      message.success("تم نشر الدورة");
      loadData();
    } catch (error) {
      console.error(error);
      message.error("فشل في نشر الدورة");
    }
  };

  if (loading && !stats) {
    return <LoadingSkeleton />;
  }

  return (
    <div>
      <PageHeader
        title="مركز التدريب"
        subtitle="إدارة الدورات التدريبية وتطوير الموظفين"
        breadcrumbs={[
          { label: "الرئيسية", href: "/" },
          { label: "مركز التدريب" },
        ]}
        icon={<BookOutlined />}
        extra={
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setShowModal(true)}>
            دورة جديدة
          </Button>
        }
      />

      {/* الإحصائيات */}
      {stats && (
        <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
          <Col xs={12} sm={8} md={4}>
            <Card size="small">
              <Statistic
                title="الدورات"
                value={stats.totalCourses}
                prefix={<BookOutlined />}
              />
            </Card>
          </Col>
          <Col xs={12} sm={8} md={4}>
            <Card size="small">
              <Statistic
                title="جلسات قادمة"
                value={stats.upcomingSessions}
                prefix={<CalendarOutlined />}
                valueStyle={{ color: "#2563eb" }}
              />
            </Card>
          </Col>
          <Col xs={12} sm={8} md={4}>
            <Card size="small">
              <Statistic
                title="التسجيلات"
                value={stats.totalEnrollments}
                prefix={<TeamOutlined />}
                valueStyle={{ color: "#d97706" }}
              />
            </Card>
          </Col>
          <Col xs={12} sm={8} md={4}>
            <Card size="small">
              <Statistic
                title="المكتملة"
                value={stats.completedEnrollments}
                valueStyle={{ color: "#059669" }}
              />
            </Card>
          </Col>
          <Col xs={12} sm={8} md={4}>
            <Card size="small">
              <Statistic
                title="الشهادات"
                value={stats.totalCertificates}
                prefix={<SafetyCertificateOutlined />}
                valueStyle={{ color: "#7c3aed" }}
              />
            </Card>
          </Col>
          <Col xs={12} sm={8} md={4}>
            <Card size="small">
              <Statistic
                title="نسبة الإكمال"
                value={stats.completionRate}
                suffix="%"
                valueStyle={{ color: "#16a34a" }}
              />
            </Card>
          </Col>
        </Row>
      )}

      {/* التبويبات */}
      <Segmented
        value={activeTab}
        onChange={(value) => setActiveTab(value as string)}
        options={[
          { label: <Space><BookOutlined /> الدورات</Space>, value: "courses" },
          { label: <Space><CalendarOutlined /> الجلسات</Space>, value: "sessions" },
        ]}
        style={{ marginBottom: 16 }}
      />

      {/* الفلاتر */}
      {activeTab === "courses" && (
        <Space style={{ marginBottom: 16 }} wrap>
          <Input.Search
            placeholder="بحث..."
            value={filter.search}
            onChange={(e) => setFilter({ ...filter, search: e.target.value })}
            style={{ width: 200 }}
            allowClear
          />
          <Select
            value={filter.category}
            onChange={(value) => setFilter({ ...filter, category: value })}
            style={{ width: 150 }}
            placeholder="كل التصنيفات"
            allowClear
          >
            {Object.entries(CATEGORY_CONFIG).map(([k, v]) => (
              <Select.Option key={k} value={k}>{v.icon} {v.label}</Select.Option>
            ))}
          </Select>
          <Select
            value={filter.level}
            onChange={(value) => setFilter({ ...filter, level: value })}
            style={{ width: 150 }}
            placeholder="كل المستويات"
            allowClear
          >
            {Object.entries(LEVEL_CONFIG).map(([k, v]) => (
              <Select.Option key={k} value={k}>{v.label}</Select.Option>
            ))}
          </Select>
        </Space>
      )}

      {/* المحتوى */}
      {loading ? (
        <LoadingSkeleton />
      ) : activeTab === "courses" ? (
        courses.length === 0 ? (
          <Card>
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description="لا توجد دورات"
            >
              <Button type="primary" icon={<PlusOutlined />} onClick={() => setShowModal(true)}>
                إنشاء دورة جديدة
              </Button>
            </Empty>
          </Card>
        ) : (
          <Row gutter={[16, 16]}>
            {courses.map(course => {
              const cat = CATEGORY_CONFIG[course.category] || CATEGORY_CONFIG.general;
              const level = LEVEL_CONFIG[course.level] || LEVEL_CONFIG.beginner;
              const type = TYPE_CONFIG[course.courseType] || TYPE_CONFIG.classroom;
              return (
                <Col xs={24} sm={12} lg={8} key={course.id}>
                  <Card
                    hoverable
                    style={{ borderTop: `4px solid ${cat.color === "default" ? "#6b7280" : ""}` }}
                    styles={{ body: { padding: 16 } }}
                  >
                    <Space style={{ marginBottom: 8 }} wrap>
                      <span style={{ fontSize: 24 }}>{cat.icon}</span>
                      <Tag color={level.color}>{level.label}</Tag>
                      <Tag icon={type.icon}>{type.label}</Tag>
                    </Space>
                    <h3 style={{ fontWeight: 600, margin: "8px 0" }}>{course.title}</h3>
                    {course.description && (
                      <p style={{ fontSize: 13, color: "#6b7280", margin: "0 0 12px" }}>
                        {course.description.substring(0, 80)}...
                      </p>
                    )}
                    <Space style={{ fontSize: 13, color: "#6b7280", marginBottom: 12 }} wrap>
                      {course.durationHours && (
                        <span><ClockCircleOutlined /> {course.durationHours} ساعة</span>
                      )}
                      {course.instructorName && (
                        <span><TeamOutlined /> {course.instructorName}</span>
                      )}
                    </Space>
                    <Row justify="space-between" align="middle">
                      <Col>
                        {course.cost ? (
                          <span style={{ fontWeight: 600, color: "#059669" }}>
                            {Number(course.cost).toLocaleString()} د.ع
                          </span>
                        ) : (
                          <Tag color="success">مجاني</Tag>
                        )}
                      </Col>
                      <Col>
                        {course.status === "draft" && (
                          <Button
                            type="primary"
                            ghost
                            size="small"
                            icon={<SendOutlined />}
                            onClick={() => publishCourse(course.id)}
                          >
                            نشر
                          </Button>
                        )}
                      </Col>
                    </Row>
                  </Card>
                </Col>
              );
            })}
          </Row>
        )
      ) : (
        sessions.length === 0 ? (
          <Card>
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description="لا توجد جلسات قادمة"
            />
          </Card>
        ) : (
          <Space direction="vertical" style={{ width: "100%" }} size={12}>
            {sessions.map(session => (
              <Card key={session.id} size="small">
                <Row align="middle" gutter={16}>
                  <Col>
                    <div style={{
                      width: 60,
                      height: 60,
                      background: "#dbeafe",
                      borderRadius: 10,
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                    }}>
                      <span style={{ fontSize: 18, fontWeight: 700, color: "#2563eb" }}>
                        {new Date(session.startDate).getDate()}
                      </span>
                      <span style={{ fontSize: 11, color: "#1e40af" }}>
                        {new Date(session.startDate).toLocaleDateString("ar-IQ", { month: "short" })}
                      </span>
                    </div>
                  </Col>
                  <Col flex={1}>
                    <h3 style={{ fontWeight: 600, margin: 0 }}>{session.title || "جلسة تدريبية"}</h3>
                    <Space style={{ marginTop: 4 }}>
                      {session.locationType === "online" ? (
                        <Tag icon={<DesktopOutlined />}>عن بعد</Tag>
                      ) : (
                        <Tag icon={<EnvironmentOutlined />}>{session.location || "حضوري"}</Tag>
                      )}
                      <span style={{ color: "#6b7280", fontSize: 13 }}>
                        {new Date(session.startDate).toLocaleTimeString("ar-IQ", { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </Space>
                  </Col>
                  <Col>
                    <Statistic
                      title="المشاركون"
                      value={session.currentParticipants}
                      suffix={`/ ${session.maxParticipants || "∞"}`}
                      valueStyle={{ fontSize: 16 }}
                    />
                  </Col>
                </Row>
              </Card>
            ))}
          </Space>
        )
      )}

      {/* موديل إضافة */}
      <Modal
        title={<Space><BookOutlined /> دورة تدريبية جديدة</Space>}
        open={showModal}
        onCancel={() => setShowModal(false)}
        footer={null}
        width={550}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleCreate}
          initialValues={{ category: "general", level: "beginner", courseType: "classroom" }}
        >
          <Form.Item
            name="title"
            label="عنوان الدورة"
            rules={[{ required: true, message: "يرجى إدخال عنوان الدورة" }]}
          >
            <Input />
          </Form.Item>

          <Form.Item name="description" label="الوصف">
            <Input.TextArea rows={3} />
          </Form.Item>

          <Row gutter={16}>
            <Col span={8}>
              <Form.Item name="category" label="التصنيف">
                <Select>
                  {Object.entries(CATEGORY_CONFIG).map(([k, v]) => (
                    <Select.Option key={k} value={k}>{v.icon} {v.label}</Select.Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="level" label="المستوى">
                <Select>
                  {Object.entries(LEVEL_CONFIG).map(([k, v]) => (
                    <Select.Option key={k} value={k}>{v.label}</Select.Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="courseType" label="النوع">
                <Select>
                  {Object.entries(TYPE_CONFIG).map(([k, v]) => (
                    <Select.Option key={k} value={k}>{v.label}</Select.Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="durationHours" label="المدة (ساعات)">
                <InputNumber min={1} style={{ width: "100%" }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="instructorName" label="اسم المدرب">
                <Input />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="maxParticipants" label="الحد الأقصى للمشاركين">
                <InputNumber min={1} style={{ width: "100%" }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="cost" label="التكلفة">
                <InputNumber min={0} style={{ width: "100%" }} placeholder="اتركه فارغاً للمجانية" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item style={{ marginBottom: 0, textAlign: "left" }}>
            <Space>
              <Button onClick={() => setShowModal(false)}>إلغاء</Button>
              <Button type="primary" htmlType="submit">إنشاء</Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
