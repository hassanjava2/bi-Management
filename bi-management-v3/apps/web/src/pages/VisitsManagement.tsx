/**
 * صفحة إدارة الزيارات والوفود
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
  Checkbox,
  TimePicker,
  Segmented,
  Popconfirm,
} from "antd";
import {
  PlusOutlined,
  UserOutlined,
  TeamOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  CalendarOutlined,
  StopOutlined,
  LoginOutlined,
  LogoutOutlined,
  PhoneOutlined,
  MailOutlined,
  BankOutlined,
  IdcardOutlined,
  EnvironmentOutlined,
  CarOutlined,
  CoffeeOutlined,
  ContactsOutlined,
} from "@ant-design/icons";
import { PageHeader, LoadingSkeleton, DateDisplay } from "../components/shared";
import { API_BASE, getAuthHeaders } from "../utils/api";

interface Visit {
  id: string;
  visitNumber: string;
  title: string;
  purpose: string;
  visitType: string;
  visitorName: string;
  visitorCompany: string | null;
  visitorPhone: string | null;
  visitorsCount: number;
  scheduledDate: string;
  scheduledStartTime: string | null;
  scheduledEndTime: string | null;
  actualArrival: string | null;
  actualDeparture: string | null;
  meetingRoom: string | null;
  status: string;
  badgeNumber: string | null;
  createdAt: string;
}

interface Stats {
  totalVisits: number;
  todayVisits: number;
  scheduledVisits: number;
  currentVisitors: number;
  completedVisits: number;
  blacklistedVisitors: number;
}

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  scheduled: { label: "مجدول", color: "blue" },
  checked_in: { label: "تم الوصول", color: "success" },
  in_progress: { label: "جارية", color: "purple" },
  completed: { label: "مكتملة", color: "default" },
  cancelled: { label: "ملغاة", color: "error" },
  no_show: { label: "لم يحضر", color: "warning" },
};

const TYPE_CONFIG: Record<string, string> = {
  client: "عميل",
  supplier: "مورد",
  official: "رسمية",
  inspection: "تفتيش",
  delegation: "وفد",
  other: "أخرى",
};

export default function VisitsManagement() {
  const [visits, setVisits] = useState<Visit[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [activeTab, setActiveTab] = useState<"today" | "all">("today");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterType, setFilterType] = useState("");
  const [form] = Form.useForm();

  useEffect(() => {
    fetchData();
  }, [activeTab, filterStatus, filterType]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [statsRes, visitsRes] = await Promise.all([
        fetch(`${API_BASE}/api/visits/stats`, { headers: getAuthHeaders() }),
        activeTab === "today"
          ? fetch(`${API_BASE}/api/visits/today`, { headers: getAuthHeaders() })
          : fetch(
              `${API_BASE}/api/visits?${filterStatus ? `status=${filterStatus}&` : ""}${filterType ? `type=${filterType}` : ""}`,
              { headers: getAuthHeaders() }
            ),
      ]);

      if (statsRes.ok) setStats(await statsRes.json());
      if (visitsRes.ok) setVisits(await visitsRes.json());
    } catch (error) {
      console.error("Error:", error);
      message.error("حدث خطأ في تحميل البيانات");
    }
    setLoading(false);
  };

  const createVisit = async () => {
    try {
      const values = await form.validateFields();
      const payload = {
        ...values,
        scheduledDate: values.scheduledDate?.format("YYYY-MM-DD"),
        scheduledStartTime: values.scheduledStartTime?.format("HH:mm"),
        scheduledEndTime: values.scheduledEndTime?.format("HH:mm"),
        visitorsCount: Number(values.visitorsCount),
      };

      const res = await fetch(`${API_BASE}/api/visits`, {
        method: "POST",
        headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        message.success("تم إنشاء الزيارة بنجاح");
        setShowModal(false);
        form.resetFields();
        fetchData();
      } else {
        message.error("حدث خطأ في إنشاء الزيارة");
      }
    } catch (error) {
      console.error("Error:", error);
    }
  };

  const checkIn = async (id: string) => {
    const badgeNumber = `V-${Date.now().toString(36).toUpperCase()}`;
    try {
      const res = await fetch(`${API_BASE}/api/visits/${id}/checkin`, {
        method: "POST",
        headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ badgeNumber }),
      });
      if (res.ok) {
        message.success("تم تسجيل الوصول بنجاح");
        fetchData();
      }
    } catch (error) {
      console.error("Error:", error);
      message.error("حدث خطأ في تسجيل الوصول");
    }
  };

  const checkOut = async (id: string) => {
    try {
      const res = await fetch(`${API_BASE}/api/visits/${id}/checkout`, {
        method: "POST",
        headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      if (res.ok) {
        message.success("تم تسجيل المغادرة بنجاح");
        fetchData();
      }
    } catch (error) {
      console.error("Error:", error);
      message.error("حدث خطأ في تسجيل المغادرة");
    }
  };

  const cancelVisit = async (id: string) => {
    try {
      const res = await fetch(`${API_BASE}/api/visits/${id}/cancel`, {
        method: "PATCH",
        headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      if (res.ok) {
        message.success("تم إلغاء الزيارة");
        fetchData();
      }
    } catch (error) {
      console.error("Error:", error);
      message.error("حدث خطأ في إلغاء الزيارة");
    }
  };

  const columns = [
    {
      title: "رقم الزيارة",
      dataIndex: "visitNumber",
      key: "visitNumber",
      width: 120,
      render: (text: string) => <span style={{ fontFamily: "monospace" }}>{text}</span>,
    },
    {
      title: "العنوان",
      dataIndex: "title",
      key: "title",
      render: (text: string, record: Visit) => (
        <Space direction="vertical" size={0}>
          <span style={{ fontWeight: 600 }}>{text}</span>
          <span style={{ fontSize: "0.85rem", color: "#6b7280" }}>{record.purpose}</span>
        </Space>
      ),
    },
    {
      title: "الزائر",
      key: "visitor",
      render: (_: any, record: Visit) => (
        <Space direction="vertical" size={0}>
          <span>
            <UserOutlined /> {record.visitorName}
          </span>
          {record.visitorCompany && (
            <span style={{ fontSize: "0.85rem", color: "#6b7280" }}>
              <BankOutlined /> {record.visitorCompany}
            </span>
          )}
          {record.visitorsCount > 1 && (
            <Tag color="blue">
              <TeamOutlined /> {record.visitorsCount} أشخاص
            </Tag>
          )}
        </Space>
      ),
    },
    {
      title: "النوع",
      dataIndex: "visitType",
      key: "visitType",
      width: 90,
      render: (type: string) => <Tag>{TYPE_CONFIG[type] || type}</Tag>,
    },
    {
      title: "الحالة",
      dataIndex: "status",
      key: "status",
      width: 110,
      render: (status: string) => {
        const config = STATUS_CONFIG[status] || STATUS_CONFIG.scheduled;
        return <Tag color={config.color}>{config.label}</Tag>;
      },
    },
    {
      title: "التاريخ والوقت",
      key: "datetime",
      width: 180,
      render: (_: any, record: Visit) => (
        <Space direction="vertical" size={0}>
          <span>
            <CalendarOutlined /> <DateDisplay date={record.scheduledDate} />
          </span>
          {record.scheduledStartTime && (
            <span style={{ fontSize: "0.85rem", color: "#6b7280" }}>
              <ClockCircleOutlined /> {record.scheduledStartTime}
              {record.scheduledEndTime && ` - ${record.scheduledEndTime}`}
            </span>
          )}
        </Space>
      ),
    },
    {
      title: "القاعة / البطاقة",
      key: "details",
      width: 140,
      render: (_: any, record: Visit) => (
        <Space direction="vertical" size={0}>
          {record.meetingRoom && (
            <span>
              <EnvironmentOutlined /> {record.meetingRoom}
            </span>
          )}
          {record.badgeNumber && (
            <Tag color="green">
              <IdcardOutlined /> {record.badgeNumber}
            </Tag>
          )}
        </Space>
      ),
    },
    {
      title: "الإجراءات",
      key: "actions",
      width: 200,
      render: (_: any, record: Visit) => (
        <Space size="small">
          {record.status === "scheduled" && (
            <>
              <Button
                type="primary"
                size="small"
                icon={<LoginOutlined />}
                onClick={() => checkIn(record.id)}
              >
                تسجيل وصول
              </Button>
              <Popconfirm
                title="هل تريد إلغاء الزيارة؟"
                onConfirm={() => cancelVisit(record.id)}
                okText="نعم"
                cancelText="لا"
              >
                <Button danger size="small" icon={<StopOutlined />}>
                  إلغاء
                </Button>
              </Popconfirm>
            </>
          )}
          {(record.status === "checked_in" || record.status === "in_progress") && (
            <Button
              size="small"
              icon={<LogoutOutlined />}
              onClick={() => checkOut(record.id)}
            >
              تسجيل مغادرة
            </Button>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="إدارة الزيارات والوفود"
        subtitle="تنظيم ومتابعة زيارات الضيوف والوفود"
        breadcrumbs={[
          { label: "الرئيسية", href: "/" },
          { label: "إدارة الزيارات والوفود" },
        ]}
        icon={<ContactsOutlined />}
        extra={
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setShowModal(true)}>
            زيارة جديدة
          </Button>
        }
      />

      {/* الإحصائيات */}
      {stats && (
        <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
          <Col xs={12} sm={8} md={4}>
            <Card>
              <Statistic
                title="زيارات اليوم"
                value={stats.todayVisits}
                valueStyle={{ color: "#3b82f6" }}
                prefix={<CalendarOutlined />}
              />
            </Card>
          </Col>
          <Col xs={12} sm={8} md={4}>
            <Card>
              <Statistic
                title="الزوار الحاليين"
                value={stats.currentVisitors}
                valueStyle={{ color: "#10b981" }}
                prefix={<UserOutlined />}
              />
            </Card>
          </Col>
          <Col xs={12} sm={8} md={4}>
            <Card>
              <Statistic
                title="مجدولة"
                value={stats.scheduledVisits}
                valueStyle={{ color: "#f59e0b" }}
                prefix={<ClockCircleOutlined />}
              />
            </Card>
          </Col>
          <Col xs={12} sm={8} md={4}>
            <Card>
              <Statistic
                title="مكتملة"
                value={stats.completedVisits}
                valueStyle={{ color: "#6b7280" }}
                prefix={<CheckCircleOutlined />}
              />
            </Card>
          </Col>
          <Col xs={12} sm={8} md={4}>
            <Card>
              <Statistic
                title="إجمالي الزيارات"
                value={stats.totalVisits}
                valueStyle={{ color: "#8b5cf6" }}
                prefix={<TeamOutlined />}
              />
            </Card>
          </Col>
          <Col xs={12} sm={8} md={4}>
            <Card>
              <Statistic
                title="القائمة السوداء"
                value={stats.blacklistedVisitors}
                valueStyle={{ color: "#ef4444" }}
                prefix={<StopOutlined />}
              />
            </Card>
          </Col>
        </Row>
      )}

      {/* التبويبات */}
      <Segmented
        value={activeTab}
        onChange={(value) => setActiveTab(value as any)}
        options={[
          { label: "زيارات اليوم", value: "today" },
          { label: "جميع الزيارات", value: "all" },
        ]}
        style={{ marginBottom: 16 }}
      />

      {/* الفلاتر */}
      {activeTab === "all" && (
        <Card style={{ marginBottom: 16 }}>
          <Row gutter={16}>
            <Col xs={12} sm={8} md={6}>
              <Select
                placeholder="الحالة"
                value={filterStatus || undefined}
                onChange={(value) => setFilterStatus(value || "")}
                allowClear
                style={{ width: "100%" }}
                options={[
                  { value: "", label: "جميع الحالات" },
                  ...Object.entries(STATUS_CONFIG).map(([k, v]) => ({ value: k, label: v.label })),
                ]}
              />
            </Col>
            <Col xs={12} sm={8} md={6}>
              <Select
                placeholder="النوع"
                value={filterType || undefined}
                onChange={(value) => setFilterType(value || "")}
                allowClear
                style={{ width: "100%" }}
                options={[
                  { value: "", label: "جميع الأنواع" },
                  ...Object.entries(TYPE_CONFIG).map(([k, v]) => ({ value: k, label: v })),
                ]}
              />
            </Col>
          </Row>
        </Card>
      )}

      {/* الجدول */}
      <Card>
        {loading ? (
          <LoadingSkeleton />
        ) : visits.length === 0 ? (
          <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="لا توجد زيارات" />
        ) : (
          <Table
            columns={columns}
            dataSource={visits}
            rowKey="id"
            pagination={{ pageSize: 10, showSizeChanger: true, showTotal: (total) => `${total} زيارة` }}
          />
        )}
      </Card>

      {/* موديل إضافة زيارة */}
      <Modal
        title={
          <Space>
            <ContactsOutlined />
            <span>زيارة جديدة</span>
          </Space>
        }
        open={showModal}
        onOk={createVisit}
        onCancel={() => {
          setShowModal(false);
          form.resetFields();
        }}
        okText="حفظ"
        cancelText="إلغاء"
        width={700}
      >
        <Form
          form={form}
          layout="vertical"
          initialValues={{ visitType: "client", visitorsCount: 1 }}
        >
          <Form.Item
            name="title"
            label="العنوان"
            rules={[{ required: true, message: "العنوان مطلوب" }]}
          >
            <Input placeholder="عنوان الزيارة" />
          </Form.Item>

          <Form.Item
            name="purpose"
            label="الغرض"
            rules={[{ required: true, message: "الغرض مطلوب" }]}
          >
            <Input placeholder="الغرض من الزيارة" />
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="visitType" label="نوع الزيارة">
                <Select
                  options={Object.entries(TYPE_CONFIG).map(([k, v]) => ({ value: k, label: v }))}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="visitorsCount" label="عدد الزوار">
                <InputNumber style={{ width: "100%" }} min={1} />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="visitorName"
                label="اسم الزائر"
                rules={[{ required: true, message: "اسم الزائر مطلوب" }]}
              >
                <Input placeholder="اسم الزائر الرئيسي" prefix={<UserOutlined />} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="visitorCompany" label="الشركة">
                <Input placeholder="اسم الشركة" prefix={<BankOutlined />} />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="visitorPhone" label="الهاتف">
                <Input placeholder="رقم الهاتف" prefix={<PhoneOutlined />} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="visitorEmail" label="البريد الإلكتروني">
                <Input placeholder="البريد الإلكتروني" prefix={<MailOutlined />} />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={8}>
              <Form.Item
                name="scheduledDate"
                label="تاريخ الزيارة"
                rules={[{ required: true, message: "التاريخ مطلوب" }]}
              >
                <DatePicker style={{ width: "100%" }} placeholder="اختر التاريخ" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="scheduledStartTime" label="وقت البدء">
                <TimePicker style={{ width: "100%" }} format="HH:mm" placeholder="وقت البدء" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="scheduledEndTime" label="وقت الانتهاء">
                <TimePicker style={{ width: "100%" }} format="HH:mm" placeholder="وقت الانتهاء" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="meetingRoom" label="قاعة الاجتماع">
            <Input placeholder="اسم أو رقم القاعة" prefix={<EnvironmentOutlined />} />
          </Form.Item>

          <Form.Item label="خدمات إضافية">
            <Space size="large">
              <Form.Item name="escortRequired" valuePropName="checked" noStyle>
                <Checkbox>
                  <UserOutlined /> يحتاج مرافق
                </Checkbox>
              </Form.Item>
              <Form.Item name="refreshmentsNeeded" valuePropName="checked" noStyle>
                <Checkbox>
                  <CoffeeOutlined /> ضيافة
                </Checkbox>
              </Form.Item>
              <Form.Item name="parkingNeeded" valuePropName="checked" noStyle>
                <Checkbox>
                  <CarOutlined /> موقف سيارة
                </Checkbox>
              </Form.Item>
            </Space>
          </Form.Item>

          <Form.Item name="notes" label="ملاحظات">
            <Input.TextArea rows={2} placeholder="ملاحظات إضافية" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
