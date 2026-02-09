/**
 * إدارة الأحداث والفعاليات
 */
import { useState, useEffect } from "react";
import {
  Row,
  Col,
  Card,
  Table,
  Button,
  Input,
  Select,
  Form,
  Modal,
  Tag,
  Space,
  message,
  Statistic,
  Empty,
  DatePicker,
  InputNumber,
  Popconfirm,
} from "antd";
import {
  PlusOutlined,
  CalendarOutlined,
  TeamOutlined,
  CheckCircleOutlined,
  PlayCircleOutlined,
  ClockCircleOutlined,
  StarOutlined,
  SendOutlined,
  UnlockOutlined,
  CaretRightOutlined,
  StopOutlined,
  EnvironmentOutlined,
  GlobalOutlined,
  SyncOutlined,
} from "@ant-design/icons";
import { PageHeader, LoadingSkeleton, DateDisplay } from "../components/shared";
import { API_BASE, getAuthHeaders } from "../utils/api";

interface Event {
  id: string;
  eventNumber: string;
  title: string;
  eventType: string;
  startDate: string;
  endDate: string;
  locationType: string;
  venue: string | null;
  maxAttendees: number | null;
  currentAttendees: number;
  status: string;
  registrationFee: string | null;
}

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  draft: { label: "مسودة", color: "default" },
  published: { label: "منشور", color: "blue" },
  registration_open: { label: "التسجيل مفتوح", color: "success" },
  registration_closed: { label: "التسجيل مغلق", color: "warning" },
  ongoing: { label: "جاري", color: "purple" },
  completed: { label: "مكتمل", color: "default" },
  cancelled: { label: "ملغي", color: "error" },
  postponed: { label: "مؤجل", color: "orange" },
};

const TYPE_CONFIG: Record<string, { label: string; icon: string }> = {
  conference: { label: "مؤتمر", icon: "🎤" },
  seminar: { label: "ندوة", icon: "📢" },
  workshop: { label: "ورشة عمل", icon: "🛠️" },
  exhibition: { label: "معرض", icon: "🖼️" },
  celebration: { label: "احتفال", icon: "🎉" },
  training: { label: "تدريب", icon: "📚" },
  meeting: { label: "اجتماع", icon: "👥" },
  webinar: { label: "ويبينار", icon: "💻" },
};

const LOCATION_TYPE_CONFIG: Record<string, { label: string; icon: React.ReactNode }> = {
  physical: { label: "حضوري", icon: <EnvironmentOutlined /> },
  virtual: { label: "افتراضي", icon: <GlobalOutlined /> },
  hybrid: { label: "مختلط", icon: <SyncOutlined /> },
};

export default function EventsManagement() {
  const [events, setEvents] = useState<Event[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({ status: "", type: "" });
  const [showModal, setShowModal] = useState(false);
  const [form] = Form.useForm();

  useEffect(() => {
    loadData();
  }, [filter]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [statsRes] = await Promise.all([
        fetch(`${API_BASE}/api/events/stats`, { headers: getAuthHeaders() }),
      ]);
      if (statsRes.ok) setStats(await statsRes.json());

      const params = new URLSearchParams();
      if (filter.status) params.append("status", filter.status);
      if (filter.type) params.append("type", filter.type);

      const res = await fetch(`${API_BASE}/api/events?${params}`, { headers: getAuthHeaders() });
      if (res.ok) setEvents(await res.json());
    } catch (error) {
      console.error(error);
      message.error("حدث خطأ في تحميل البيانات");
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    try {
      const values = await form.validateFields();
      const payload = {
        ...values,
        startDate: values.startDate?.toISOString(),
        endDate: values.endDate?.toISOString(),
        organizerId: "current_user",
      };

      const res = await fetch(`${API_BASE}/api/events`, {
        method: "POST",
        headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        message.success("تم إنشاء الفعالية بنجاح");
        setShowModal(false);
        form.resetFields();
        loadData();
      } else {
        message.error("حدث خطأ في إنشاء الفعالية");
      }
    } catch (error) {
      console.error(error);
    }
  };

  const updateStatus = async (id: string, action: string) => {
    try {
      await fetch(`${API_BASE}/api/events/${id}/${action}`, {
        method: "PATCH",
        headers: getAuthHeaders(),
      });
      message.success("تم تحديث حالة الفعالية");
      loadData();
    } catch (error) {
      console.error(error);
      message.error("حدث خطأ في تحديث الحالة");
    }
  };

  const columns = [
    {
      title: "رقم الفعالية",
      dataIndex: "eventNumber",
      key: "eventNumber",
      width: 130,
      render: (text: string, record: Event) => {
        const type = TYPE_CONFIG[record.eventType] || TYPE_CONFIG.conference;
        return (
          <Space>
            <span style={{ fontSize: "1.2rem" }}>{type.icon}</span>
            <span style={{ fontFamily: "monospace" }}>{text}</span>
          </Space>
        );
      },
    },
    {
      title: "العنوان",
      dataIndex: "title",
      key: "title",
      render: (text: string, record: Event) => (
        <Space direction="vertical" size={0}>
          <span style={{ fontWeight: 600 }}>{text}</span>
          {record.venue && (
            <span style={{ fontSize: "0.85rem", color: "#6b7280" }}>
              <EnvironmentOutlined /> {record.venue}
            </span>
          )}
        </Space>
      ),
    },
    {
      title: "النوع",
      dataIndex: "eventType",
      key: "eventType",
      width: 100,
      render: (type: string) => {
        const config = TYPE_CONFIG[type] || TYPE_CONFIG.conference;
        return <Tag>{config.label}</Tag>;
      },
    },
    {
      title: "الحالة",
      dataIndex: "status",
      key: "status",
      width: 130,
      render: (status: string) => {
        const config = STATUS_CONFIG[status] || STATUS_CONFIG.draft;
        return <Tag color={config.color}>{config.label}</Tag>;
      },
    },
    {
      title: "التاريخ",
      key: "dates",
      width: 200,
      render: (_: any, record: Event) => (
        <Space direction="vertical" size={0}>
          <span>
            <CalendarOutlined /> من: <DateDisplay date={record.startDate} />
          </span>
          <span>
            <CalendarOutlined /> إلى: <DateDisplay date={record.endDate} />
          </span>
        </Space>
      ),
    },
    {
      title: "طريقة الحضور",
      dataIndex: "locationType",
      key: "locationType",
      width: 110,
      render: (type: string) => {
        const config = LOCATION_TYPE_CONFIG[type] || LOCATION_TYPE_CONFIG.physical;
        return (
          <Tag icon={config.icon}>
            {config.label}
          </Tag>
        );
      },
    },
    {
      title: "الحضور",
      key: "attendees",
      width: 100,
      render: (_: any, record: Event) => (
        <span>
          <TeamOutlined /> {record.currentAttendees || 0}
          {record.maxAttendees ? `/${record.maxAttendees}` : ""}
        </span>
      ),
    },
    {
      title: "الرسوم",
      dataIndex: "registrationFee",
      key: "registrationFee",
      width: 100,
      render: (fee: string | null) =>
        fee ? `${Number(fee).toLocaleString()} د.ع` : <Tag color="green">مجاني</Tag>,
    },
    {
      title: "الإجراءات",
      key: "actions",
      width: 120,
      render: (_: any, record: Event) => (
        <Space size="small">
          {record.status === "draft" && (
            <Popconfirm
              title="هل تريد نشر الفعالية؟"
              onConfirm={() => updateStatus(record.id, "publish")}
              okText="نعم"
              cancelText="لا"
            >
              <Button type="primary" size="small" icon={<SendOutlined />}>
                نشر
              </Button>
            </Popconfirm>
          )}
          {record.status === "published" && (
            <Popconfirm
              title="هل تريد فتح التسجيل؟"
              onConfirm={() => updateStatus(record.id, "open-registration")}
              okText="نعم"
              cancelText="لا"
            >
              <Button type="primary" size="small" icon={<UnlockOutlined />} style={{ background: "#10b981" }}>
                فتح التسجيل
              </Button>
            </Popconfirm>
          )}
          {record.status === "registration_open" && (
            <Popconfirm
              title="هل تريد بدء الفعالية؟"
              onConfirm={() => updateStatus(record.id, "start")}
              okText="نعم"
              cancelText="لا"
            >
              <Button size="small" icon={<CaretRightOutlined />} style={{ background: "#8b5cf6", color: "#fff" }}>
                بدء
              </Button>
            </Popconfirm>
          )}
          {record.status === "ongoing" && (
            <Popconfirm
              title="هل تريد إنهاء الفعالية؟"
              onConfirm={() => updateStatus(record.id, "complete")}
              okText="نعم"
              cancelText="لا"
            >
              <Button type="primary" size="small" icon={<StopOutlined />}>
                إنهاء
              </Button>
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="إدارة الفعاليات"
        subtitle="تنظيم وإدارة الأحداث والفعاليات"
        breadcrumbs={[
          { label: "الرئيسية", href: "/" },
          { label: "إدارة الفعاليات" },
        ]}
        icon={<CalendarOutlined />}
        extra={
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setShowModal(true)}>
            فعالية جديدة
          </Button>
        }
      />

      {/* الإحصائيات */}
      {stats && (
        <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
          <Col xs={12} sm={8} md={4}>
            <Card>
              <Statistic
                title="إجمالي الفعاليات"
                value={stats.totalEvents}
                prefix={<CalendarOutlined />}
              />
            </Card>
          </Col>
          <Col xs={12} sm={8} md={4}>
            <Card style={{ background: "#dbeafe" }}>
              <Statistic
                title="قادمة"
                value={stats.upcomingEvents}
                valueStyle={{ color: "#2563eb" }}
                prefix={<ClockCircleOutlined />}
              />
            </Card>
          </Col>
          <Col xs={12} sm={8} md={4}>
            <Card style={{ background: "#ede9fe" }}>
              <Statistic
                title="جارية"
                value={stats.ongoingEvents}
                valueStyle={{ color: "#7c3aed" }}
                prefix={<PlayCircleOutlined />}
              />
            </Card>
          </Col>
          <Col xs={12} sm={8} md={4}>
            <Card style={{ background: "#d1fae5" }}>
              <Statistic
                title="مكتملة"
                value={stats.completedEvents}
                valueStyle={{ color: "#059669" }}
                prefix={<CheckCircleOutlined />}
              />
            </Card>
          </Col>
          <Col xs={12} sm={8} md={4}>
            <Card style={{ background: "#fef3c7" }}>
              <Statistic
                title="تسجيلات"
                value={stats.totalRegistrations}
                valueStyle={{ color: "#d97706" }}
                prefix={<TeamOutlined />}
              />
            </Card>
          </Col>
          <Col xs={12} sm={8} md={4}>
            <Card style={{ background: "#f3f4f6" }}>
              <Statistic
                title="متوسط التقييم"
                value={stats.avgRating}
                valueStyle={{ color: "#4b5563" }}
                prefix={<StarOutlined />}
              />
            </Card>
          </Col>
        </Row>
      )}

      {/* الفلاتر */}
      <Card style={{ marginBottom: 16 }}>
        <Row gutter={16}>
          <Col xs={12} sm={8} md={6}>
            <Select
              placeholder="الحالة"
              value={filter.status || undefined}
              onChange={(value) => setFilter({ ...filter, status: value || "" })}
              allowClear
              style={{ width: "100%" }}
              options={[
                { value: "", label: "كل الحالات" },
                ...Object.entries(STATUS_CONFIG).map(([k, v]) => ({ value: k, label: v.label })),
              ]}
            />
          </Col>
          <Col xs={12} sm={8} md={6}>
            <Select
              placeholder="النوع"
              value={filter.type || undefined}
              onChange={(value) => setFilter({ ...filter, type: value || "" })}
              allowClear
              style={{ width: "100%" }}
              options={[
                { value: "", label: "كل الأنواع" },
                ...Object.entries(TYPE_CONFIG).map(([k, v]) => ({
                  value: k,
                  label: `${v.icon} ${v.label}`,
                })),
              ]}
            />
          </Col>
        </Row>
      </Card>

      {/* الجدول */}
      <Card>
        {loading ? (
          <LoadingSkeleton />
        ) : events.length === 0 ? (
          <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="لا توجد فعاليات" />
        ) : (
          <Table
            columns={columns}
            dataSource={events}
            rowKey="id"
            pagination={{ pageSize: 10, showSizeChanger: true, showTotal: (total) => `${total} فعالية` }}
          />
        )}
      </Card>

      {/* موديل إضافة فعالية */}
      <Modal
        title={
          <Space>
            <CalendarOutlined />
            <span>فعالية جديدة</span>
          </Space>
        }
        open={showModal}
        onOk={handleCreate}
        onCancel={() => {
          setShowModal(false);
          form.resetFields();
        }}
        okText="إنشاء"
        cancelText="إلغاء"
        width={650}
      >
        <Form
          form={form}
          layout="vertical"
          initialValues={{ eventType: "conference", locationType: "physical", maxAttendees: 100 }}
        >
          <Form.Item
            name="title"
            label="العنوان"
            rules={[{ required: true, message: "العنوان مطلوب" }]}
          >
            <Input placeholder="أدخل عنوان الفعالية" />
          </Form.Item>

          <Form.Item name="description" label="الوصف">
            <Input.TextArea rows={2} placeholder="وصف الفعالية" />
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="startDate"
                label="تاريخ البدء"
                rules={[{ required: true, message: "تاريخ البدء مطلوب" }]}
              >
                <DatePicker
                  showTime
                  style={{ width: "100%" }}
                  placeholder="اختر تاريخ ووقت البدء"
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="endDate"
                label="تاريخ الانتهاء"
                rules={[{ required: true, message: "تاريخ الانتهاء مطلوب" }]}
              >
                <DatePicker
                  showTime
                  style={{ width: "100%" }}
                  placeholder="اختر تاريخ ووقت الانتهاء"
                />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="eventType" label="النوع">
                <Select
                  options={Object.entries(TYPE_CONFIG).map(([k, v]) => ({
                    value: k,
                    label: `${v.icon} ${v.label}`,
                  }))}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="locationType" label="نوع الحضور">
                <Select
                  options={Object.entries(LOCATION_TYPE_CONFIG).map(([k, v]) => ({
                    value: k,
                    label: v.label,
                  }))}
                />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={16}>
              <Form.Item name="venue" label="المكان">
                <Input placeholder="موقع أو رابط الفعالية" prefix={<EnvironmentOutlined />} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="maxAttendees" label="الحد الأقصى">
                <InputNumber style={{ width: "100%" }} min={1} placeholder="عدد الحضور" />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>
    </div>
  );
}
