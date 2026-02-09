/**
 * مركز الاجتماعات والقرارات
 */
import { useState, useEffect } from "react";
import {
  Row,
  Col,
  Card,
  Button,
  Input,
  Select,
  Tag,
  Space,
  message,
  Empty,
  Modal,
  Form,
  InputNumber,
  Statistic,
  Tabs,
  List,
} from "antd";
import {
  CalendarOutlined,
  PlusOutlined,
  PlayCircleOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  TeamOutlined,
  GlobalOutlined,
  EnvironmentOutlined,
  PushpinOutlined,
} from "@ant-design/icons";
import { PageHeader, DateDisplay, LoadingSkeleton } from "../components/shared";
import { API_BASE, getAuthHeaders } from "../utils/api";

const { TextArea } = Input;

interface Meeting {
  id: string;
  meetingNumber: string;
  title: string;
  meetingType: string;
  scheduledAt: string;
  duration: number | null;
  locationType: string;
  location: string | null;
  status: string;
  createdAt: string;
}

interface Decision {
  id: string;
  decisionNumber: string;
  title: string;
  category: string;
  priority: string;
  status: string;
  deadline: string | null;
}

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  draft: { label: "مسودة", color: "default" },
  scheduled: { label: "مجدول", color: "blue" },
  in_progress: { label: "جاري", color: "orange" },
  completed: { label: "مكتمل", color: "green" },
  cancelled: { label: "ملغي", color: "red" },
  postponed: { label: "مؤجل", color: "purple" },
};

const TYPE_CONFIG: Record<string, { label: string; icon: React.ReactNode }> = {
  regular: { label: "عادي", icon: <CalendarOutlined /> },
  board: { label: "مجلس إدارة", icon: <TeamOutlined /> },
  emergency: { label: "طوارئ", icon: <ClockCircleOutlined /> },
  workshop: { label: "ورشة عمل", icon: <TeamOutlined /> },
  training: { label: "تدريبي", icon: <TeamOutlined /> },
};

const DECISION_STATUS: Record<string, { label: string; color: string }> = {
  pending: { label: "معلق", color: "gold" },
  in_progress: { label: "جاري التنفيذ", color: "blue" },
  completed: { label: "منجز", color: "green" },
  cancelled: { label: "ملغي", color: "red" },
  overdue: { label: "متأخر", color: "magenta" },
};

const PRIORITY_CONFIG: Record<string, { label: string; color: string }> = {
  low: { label: "منخفضة", color: "default" },
  medium: { label: "متوسطة", color: "blue" },
  high: { label: "عالية", color: "orange" },
  urgent: { label: "عاجلة", color: "red" },
};

export default function MeetingsCenter() {
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [decisions, setDecisions] = useState<Decision[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<string>("meetings");
  const [filter, setFilter] = useState({ status: "", type: "" });
  const [showModal, setShowModal] = useState(false);
  const [form] = Form.useForm();

  useEffect(() => {
    loadData();
  }, [activeTab, filter]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [statsRes] = await Promise.all([fetch(`${API_BASE}/api/meetings/stats`)]);
      if (statsRes.ok) setStats(await statsRes.json());

      if (activeTab === "meetings") {
        const params = new URLSearchParams();
        if (filter.status) params.append("status", filter.status);
        if (filter.type) params.append("type", filter.type);
        const res = await fetch(`${API_BASE}/api/meetings?${params}`);
        if (res.ok) setMeetings(await res.json());
      } else {
        const res = await fetch(`${API_BASE}/api/meetings/decisions/all`);
        if (res.ok) setDecisions(await res.json());
      }
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
      const res = await fetch(`${API_BASE}/api/meetings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...values, organizerId: "current_user" }),
      });
      if (res.ok) {
        message.success("تم إنشاء الاجتماع بنجاح");
        setShowModal(false);
        form.resetFields();
        loadData();
      } else {
        message.error("فشل في إنشاء الاجتماع");
      }
    } catch (error) {
      console.error(error);
    }
  };

  const startMeeting = async (id: string) => {
    try {
      await fetch(`${API_BASE}/api/meetings/${id}/start`, { method: "POST" });
      message.success("تم بدء الاجتماع");
      loadData();
    } catch (error) {
      console.error(error);
      message.error("فشل في بدء الاجتماع");
    }
  };

  const endMeeting = async (id: string) => {
    Modal.confirm({
      title: "إنهاء الاجتماع",
      content: (
        <TextArea
          id="meeting-minutes"
          placeholder="أدخل محضر الاجتماع (اختياري)"
          rows={4}
        />
      ),
      okText: "إنهاء",
      cancelText: "إلغاء",
      onOk: async () => {
        const minutesEl = document.getElementById("meeting-minutes") as HTMLTextAreaElement;
        try {
          await fetch(`${API_BASE}/api/meetings/${id}/end`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ minutesText: minutesEl?.value }),
          });
          message.success("تم إنهاء الاجتماع");
          loadData();
        } catch (error) {
          console.error(error);
          message.error("فشل في إنهاء الاجتماع");
        }
      },
    });
  };

  const updateDecisionStatus = async (id: string, status: string) => {
    try {
      await fetch(`${API_BASE}/api/meetings/decisions/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      message.success("تم تحديث حالة القرار");
      loadData();
    } catch (error) {
      console.error(error);
      message.error("فشل في تحديث الحالة");
    }
  };

  const getLocationIcon = (type: string) => {
    switch (type) {
      case "virtual":
        return <GlobalOutlined />;
      case "hybrid":
        return <TeamOutlined />;
      default:
        return <EnvironmentOutlined />;
    }
  };

  const getLocationLabel = (type: string) => {
    switch (type) {
      case "virtual":
        return "افتراضي";
      case "hybrid":
        return "مختلط";
      default:
        return "حضوري";
    }
  };

  const tabItems = [
    {
      key: "meetings",
      label: (
        <span>
          <CalendarOutlined /> الاجتماعات
        </span>
      ),
      children: (
        <>
          {/* الفلاتر */}
          <Space style={{ marginBottom: 16 }} wrap>
            <Select
              value={filter.status || undefined}
              onChange={(value) => setFilter({ ...filter, status: value || "" })}
              placeholder="كل الحالات"
              allowClear
              style={{ width: 150 }}
            >
              {Object.entries(STATUS_CONFIG).map(([k, v]) => (
                <Select.Option key={k} value={k}>
                  {v.label}
                </Select.Option>
              ))}
            </Select>
            <Select
              value={filter.type || undefined}
              onChange={(value) => setFilter({ ...filter, type: value || "" })}
              placeholder="كل الأنواع"
              allowClear
              style={{ width: 150 }}
            >
              {Object.entries(TYPE_CONFIG).map(([k, v]) => (
                <Select.Option key={k} value={k}>
                  {v.icon} {v.label}
                </Select.Option>
              ))}
            </Select>
          </Space>

          {/* قائمة الاجتماعات */}
          {loading ? (
            <LoadingSkeleton type="list" rows={4} />
          ) : meetings.length === 0 ? (
            <Empty description="لا توجد اجتماعات" image={Empty.PRESENTED_IMAGE_SIMPLE} />
          ) : (
            <List
              dataSource={meetings}
              renderItem={(meeting) => {
                const status = STATUS_CONFIG[meeting.status] || STATUS_CONFIG.scheduled;
                const type = TYPE_CONFIG[meeting.meetingType] || TYPE_CONFIG.regular;
                return (
                  <Card
                    key={meeting.id}
                    size="small"
                    style={{
                      marginBottom: 12,
                      borderRight: `4px solid ${
                        status.color === "default"
                          ? "#d9d9d9"
                          : status.color === "blue"
                          ? "#1890ff"
                          : status.color === "orange"
                          ? "#fa8c16"
                          : status.color === "green"
                          ? "#52c41a"
                          : status.color === "red"
                          ? "#ff4d4f"
                          : "#722ed1"
                      }`,
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                      <div style={{ flex: 1 }}>
                        <Space size="small" style={{ marginBottom: 4 }}>
                          <span style={{ fontSize: 12, color: "#8c8c8c", fontFamily: "monospace" }}>
                            {meeting.meetingNumber}
                          </span>
                          <Tag color={status.color}>{status.label}</Tag>
                          <Tag icon={type.icon}>{type.label}</Tag>
                        </Space>
                        <h4 style={{ margin: "4px 0 8px" }}>{meeting.title}</h4>
                        <Space size="middle" wrap style={{ color: "#8c8c8c", fontSize: 13 }}>
                          <span>
                            <CalendarOutlined /> <DateDisplay date={meeting.scheduledAt} format="datetime" />
                          </span>
                          {meeting.duration && (
                            <span>
                              <ClockCircleOutlined /> {meeting.duration} دقيقة
                            </span>
                          )}
                          {meeting.location && (
                            <span>
                              <EnvironmentOutlined /> {meeting.location}
                            </span>
                          )}
                          <span>
                            {getLocationIcon(meeting.locationType)} {getLocationLabel(meeting.locationType)}
                          </span>
                        </Space>
                      </div>
                      <Space>
                        {meeting.status === "scheduled" && (
                          <Button
                            type="primary"
                            size="small"
                            icon={<PlayCircleOutlined />}
                            onClick={() => startMeeting(meeting.id)}
                            style={{ background: "#faad14" }}
                          >
                            بدء
                          </Button>
                        )}
                        {meeting.status === "in_progress" && (
                          <Button
                            type="primary"
                            size="small"
                            icon={<CheckCircleOutlined />}
                            onClick={() => endMeeting(meeting.id)}
                            style={{ background: "#52c41a" }}
                          >
                            إنهاء
                          </Button>
                        )}
                      </Space>
                    </div>
                  </Card>
                );
              }}
            />
          )}
        </>
      ),
    },
    {
      key: "decisions",
      label: (
        <span>
          <PushpinOutlined /> القرارات
        </span>
      ),
      children: loading ? (
        <LoadingSkeleton type="list" rows={4} />
      ) : decisions.length === 0 ? (
        <Empty description="لا توجد قرارات" image={Empty.PRESENTED_IMAGE_SIMPLE} />
      ) : (
        <List
          dataSource={decisions}
          renderItem={(decision) => {
            const status = DECISION_STATUS[decision.status] || DECISION_STATUS.pending;
            const priority = PRIORITY_CONFIG[decision.priority] || PRIORITY_CONFIG.medium;
            return (
              <Card key={decision.id} size="small" style={{ marginBottom: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div>
                    <Space size="small" style={{ marginBottom: 4 }}>
                      <span style={{ fontSize: 12, color: "#8c8c8c", fontFamily: "monospace" }}>
                        {decision.decisionNumber}
                      </span>
                      <Tag color={status.color}>{status.label}</Tag>
                      <Tag color={priority.color}>{priority.label}</Tag>
                    </Space>
                    <h4 style={{ margin: "4px 0 0" }}>{decision.title}</h4>
                    {decision.deadline && (
                      <div style={{ fontSize: 13, color: "#8c8c8c", marginTop: 4 }}>
                        <CalendarOutlined /> الموعد النهائي: <DateDisplay date={decision.deadline} />
                      </div>
                    )}
                  </div>
                  <Select
                    value={decision.status}
                    onChange={(value) => updateDecisionStatus(decision.id, value)}
                    size="small"
                    style={{ width: 130 }}
                  >
                    {Object.entries(DECISION_STATUS).map(([k, v]) => (
                      <Select.Option key={k} value={k}>
                        {v.label}
                      </Select.Option>
                    ))}
                  </Select>
                </div>
              </Card>
            );
          }}
        />
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="مركز الاجتماعات"
        subtitle="إدارة الاجتماعات والقرارات والمتابعة"
        breadcrumbs={[{ title: "مركز الاجتماعات" }]}
        extra={
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setShowModal(true)}>
            اجتماع جديد
          </Button>
        }
      />

      {/* الإحصائيات */}
      {stats && (
        <Row gutter={[12, 12]} style={{ marginBottom: 24 }}>
          <Col xs={12} sm={8} md={4}>
            <Card size="small">
              <Statistic title="إجمالي الاجتماعات" value={stats.totalMeetings} />
            </Card>
          </Col>
          <Col xs={12} sm={8} md={4}>
            <Card size="small" style={{ background: "#e6f7ff" }}>
              <Statistic title="مجدولة" value={stats.scheduledMeetings} valueStyle={{ color: "#1890ff" }} />
            </Card>
          </Col>
          <Col xs={12} sm={8} md={4}>
            <Card size="small" style={{ background: "#fff7e6" }}>
              <Statistic title="جارية" value={stats.inProgressMeetings} valueStyle={{ color: "#fa8c16" }} />
            </Card>
          </Col>
          <Col xs={12} sm={8} md={4}>
            <Card size="small" style={{ background: "#f6ffed" }}>
              <Statistic title="مكتملة" value={stats.completedMeetings} valueStyle={{ color: "#52c41a" }} />
            </Card>
          </Col>
          <Col xs={12} sm={8} md={4}>
            <Card size="small" style={{ background: "#fff1f0" }}>
              <Statistic title="قرارات معلقة" value={stats.pendingDecisions} valueStyle={{ color: "#ff4d4f" }} />
            </Card>
          </Col>
          <Col xs={12} sm={8} md={4}>
            <Card size="small" style={{ background: "#f9f0ff" }}>
              <Statistic title="مهام معلقة" value={stats.pendingActions} valueStyle={{ color: "#722ed1" }} />
            </Card>
          </Col>
        </Row>
      )}

      {/* التبويبات */}
      <Card>
        <Tabs activeKey={activeTab} onChange={setActiveTab} items={tabItems} />
      </Card>

      {/* موديل إضافة اجتماع */}
      <Modal
        title="اجتماع جديد"
        open={showModal}
        onOk={handleCreate}
        onCancel={() => {
          setShowModal(false);
          form.resetFields();
        }}
        okText="إنشاء"
        cancelText="إلغاء"
        width={600}
      >
        <Form form={form} layout="vertical" initialValues={{ meetingType: "regular", duration: 60, locationType: "physical" }}>
          <Form.Item name="title" label="العنوان" rules={[{ required: true, message: "العنوان مطلوب" }]}>
            <Input placeholder="عنوان الاجتماع" />
          </Form.Item>
          <Form.Item name="description" label="الوصف">
            <TextArea rows={2} placeholder="وصف الاجتماع (اختياري)" />
          </Form.Item>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="scheduledAt"
                label="التاريخ والوقت"
                rules={[{ required: true, message: "التاريخ مطلوب" }]}
              >
                <Input type="datetime-local" style={{ width: "100%" }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="duration" label="المدة (دقيقة)">
                <InputNumber min={15} max={480} style={{ width: "100%" }} />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="meetingType" label="النوع">
                <Select>
                  {Object.entries(TYPE_CONFIG).map(([k, v]) => (
                    <Select.Option key={k} value={k}>
                      {v.icon} {v.label}
                    </Select.Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="locationType" label="نوع الحضور">
                <Select>
                  <Select.Option value="physical">
                    <EnvironmentOutlined /> حضوري
                  </Select.Option>
                  <Select.Option value="virtual">
                    <GlobalOutlined /> افتراضي
                  </Select.Option>
                  <Select.Option value="hybrid">
                    <TeamOutlined /> مختلط
                  </Select.Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="location" label="المكان">
            <Input placeholder="اسم القاعة أو رابط الاجتماع" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
