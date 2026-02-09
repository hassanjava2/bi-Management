/**
 * صفحة إدارة الرخص والتصاريح
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
  Segmented,
  DatePicker,
  InputNumber,
  Popconfirm,
} from "antd";
import {
  PlusOutlined,
  SafetyCertificateOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  ExclamationCircleOutlined,
  StopOutlined,
  ReloadOutlined,
  PauseCircleOutlined,
  PlayCircleOutlined,
  BellOutlined,
} from "@ant-design/icons";
import { PageHeader, LoadingSkeleton, DateDisplay } from "../components/shared";
import { API_BASE, getAuthHeaders } from "../utils/api";
import dayjs from "dayjs";

interface License {
  id: string;
  licenseNumber: string;
  name: string;
  description: string | null;
  licenseType: string;
  issuingAuthority: string;
  externalLicenseNumber: string | null;
  issueDate: string;
  expiryDate: string;
  status: string;
  renewalCount: number;
  createdAt: string;
}

interface Stats {
  licenses: {
    total: number;
    active: number;
    expiringSoon: number;
    expired: number;
    pending: number;
  };
  applications: {
    total: number;
    pending: number;
  };
  alerts: {
    unread: number;
  };
}

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  pending: { label: "قيد الانتظار", color: "warning" },
  active: { label: "نشطة", color: "success" },
  expiring_soon: { label: "تنتهي قريباً", color: "orange" },
  expired: { label: "منتهية", color: "error" },
  suspended: { label: "موقوفة", color: "default" },
  cancelled: { label: "ملغاة", color: "default" },
  under_renewal: { label: "قيد التجديد", color: "purple" },
};

const TYPE_CONFIG: Record<string, string> = {
  commercial: "تجارية",
  professional: "مهنية",
  operational: "تشغيلية",
  health: "صحية",
  safety: "سلامة",
  environmental: "بيئية",
  import_export: "استيراد/تصدير",
  construction: "بناء",
  other: "أخرى",
};

export default function LicensesManagement() {
  const [licenses, setLicenses] = useState<License[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [activeTab, setActiveTab] = useState<"all" | "expiring" | "applications">("all");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterType, setFilterType] = useState("");
  const [form] = Form.useForm();

  useEffect(() => {
    fetchData();
  }, [activeTab, filterStatus, filterType]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [statsRes, licensesRes] = await Promise.all([
        fetch(`${API_BASE}/api/licenses/stats`, { headers: getAuthHeaders() }),
        activeTab === "expiring"
          ? fetch(`${API_BASE}/api/licenses/expiring`, { headers: getAuthHeaders() })
          : fetch(
              `${API_BASE}/api/licenses?${filterStatus ? `status=${filterStatus}&` : ""}${filterType ? `type=${filterType}` : ""}`,
              { headers: getAuthHeaders() }
            ),
      ]);

      if (statsRes.ok) setStats(await statsRes.json());
      if (licensesRes.ok) setLicenses(await licensesRes.json());
    } catch (error) {
      console.error("Error:", error);
      message.error("حدث خطأ في تحميل البيانات");
    }
    setLoading(false);
  };

  const createLicense = async () => {
    try {
      const values = await form.validateFields();
      const payload = {
        ...values,
        issueDate: values.issueDate?.format("YYYY-MM-DD"),
        expiryDate: values.expiryDate?.format("YYYY-MM-DD"),
        renewalPeriodMonths: Number(values.renewalPeriodMonths),
        renewalReminderDays: Number(values.renewalReminderDays),
      };

      const res = await fetch(`${API_BASE}/api/licenses`, {
        method: "POST",
        headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        message.success("تم إضافة الرخصة بنجاح");
        setShowModal(false);
        form.resetFields();
        fetchData();
      } else {
        message.error("حدث خطأ في إضافة الرخصة");
      }
    } catch (error) {
      console.error("Error:", error);
    }
  };

  const renewLicense = async (id: string) => {
    Modal.confirm({
      title: "تجديد الرخصة",
      content: (
        <DatePicker
          id="renewal-date-picker"
          placeholder="تاريخ الانتهاء الجديد"
          style={{ width: "100%", marginTop: 16 }}
        />
      ),
      okText: "تجديد",
      cancelText: "إلغاء",
      onOk: async () => {
        const dateInput = document.getElementById("renewal-date-picker") as HTMLInputElement;
        const newExpiryDate = dateInput?.value;
        if (!newExpiryDate) {
          message.warning("يرجى اختيار تاريخ الانتهاء الجديد");
          return Promise.reject();
        }

        try {
          const res = await fetch(`${API_BASE}/api/licenses/${id}/renew`, {
            method: "POST",
            headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
            body: JSON.stringify({ newExpiryDate }),
          });
          if (res.ok) {
            message.success("تم تجديد الرخصة بنجاح");
            fetchData();
          }
        } catch (error) {
          console.error("Error:", error);
          message.error("حدث خطأ في تجديد الرخصة");
        }
      },
    });
  };

  const suspendLicense = async (id: string) => {
    try {
      const res = await fetch(`${API_BASE}/api/licenses/${id}/suspend`, {
        method: "PATCH",
        headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ reason: "تعليق مؤقت" }),
      });
      if (res.ok) {
        message.success("تم تعليق الرخصة");
        fetchData();
      }
    } catch (error) {
      console.error("Error:", error);
      message.error("حدث خطأ في تعليق الرخصة");
    }
  };

  const reactivateLicense = async (id: string) => {
    try {
      const res = await fetch(`${API_BASE}/api/licenses/${id}/reactivate`, {
        method: "PATCH",
        headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      if (res.ok) {
        message.success("تم إعادة تفعيل الرخصة");
        fetchData();
      }
    } catch (error) {
      console.error("Error:", error);
      message.error("حدث خطأ في إعادة تفعيل الرخصة");
    }
  };

  const getDaysUntilExpiry = (expiryDate: string) => {
    const expiry = new Date(expiryDate);
    const today = new Date();
    const diffTime = expiry.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const getExpiryTag = (expiryDate: string) => {
    const days = getDaysUntilExpiry(expiryDate);
    if (days < 0) return <Tag color="error">منتهية منذ {Math.abs(days)} يوم</Tag>;
    if (days <= 30) return <Tag color="orange">تنتهي خلال {days} يوم</Tag>;
    if (days <= 60) return <Tag color="warning">تنتهي خلال {days} يوم</Tag>;
    return <Tag color="success">متبقي {days} يوم</Tag>;
  };

  const columns = [
    {
      title: "رقم الرخصة",
      dataIndex: "licenseNumber",
      key: "licenseNumber",
      width: 130,
      render: (text: string) => <span style={{ fontFamily: "monospace" }}>{text}</span>,
    },
    {
      title: "اسم الرخصة",
      dataIndex: "name",
      key: "name",
      render: (text: string, record: License) => (
        <Space direction="vertical" size={0}>
          <span style={{ fontWeight: 600 }}>{text}</span>
          <span style={{ fontSize: "0.85rem", color: "#6b7280" }}>{record.issuingAuthority}</span>
        </Space>
      ),
    },
    {
      title: "النوع",
      dataIndex: "licenseType",
      key: "licenseType",
      width: 100,
      render: (type: string) => <Tag>{TYPE_CONFIG[type] || type}</Tag>,
    },
    {
      title: "الحالة",
      dataIndex: "status",
      key: "status",
      width: 120,
      render: (status: string) => {
        const config = STATUS_CONFIG[status] || STATUS_CONFIG.pending;
        return <Tag color={config.color}>{config.label}</Tag>;
      },
    },
    {
      title: "تاريخ الإصدار",
      dataIndex: "issueDate",
      key: "issueDate",
      width: 120,
      render: (date: string) => <DateDisplay date={date} />,
    },
    {
      title: "تاريخ الانتهاء",
      dataIndex: "expiryDate",
      key: "expiryDate",
      width: 180,
      render: (date: string) => (
        <Space direction="vertical" size={0}>
          <DateDisplay date={date} />
          {getExpiryTag(date)}
        </Space>
      ),
    },
    {
      title: "التجديدات",
      dataIndex: "renewalCount",
      key: "renewalCount",
      width: 90,
      render: (count: number) => (count > 0 ? <Tag color="blue">{count}</Tag> : "-"),
    },
    {
      title: "الإجراءات",
      key: "actions",
      width: 180,
      render: (_: any, record: License) => (
        <Space size="small">
          {record.status === "active" && (
            <>
              <Button
                type="primary"
                size="small"
                icon={<ReloadOutlined />}
                onClick={() => renewLicense(record.id)}
              >
                تجديد
              </Button>
              <Popconfirm
                title="هل تريد تعليق الرخصة؟"
                onConfirm={() => suspendLicense(record.id)}
                okText="نعم"
                cancelText="لا"
              >
                <Button size="small" icon={<PauseCircleOutlined />}>
                  تعليق
                </Button>
              </Popconfirm>
            </>
          )}
          {record.status === "suspended" && (
            <Button
              type="primary"
              size="small"
              icon={<PlayCircleOutlined />}
              onClick={() => reactivateLicense(record.id)}
            >
              إعادة تفعيل
            </Button>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="إدارة الرخص والتصاريح"
        subtitle="متابعة وتجديد الرخص والتصاريح"
        breadcrumbs={[
          { label: "الرئيسية", href: "/" },
          { label: "إدارة الرخص والتصاريح" },
        ]}
        icon={<SafetyCertificateOutlined />}
        extra={
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setShowModal(true)}>
            رخصة جديدة
          </Button>
        }
      />

      {/* الإحصائيات */}
      {stats && (
        <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
          <Col xs={12} sm={8} md={4}>
            <Card>
              <Statistic
                title="إجمالي الرخص"
                value={stats.licenses.total}
                valueStyle={{ color: "#3b82f6" }}
                prefix={<SafetyCertificateOutlined />}
              />
            </Card>
          </Col>
          <Col xs={12} sm={8} md={4}>
            <Card>
              <Statistic
                title="نشطة"
                value={stats.licenses.active}
                valueStyle={{ color: "#10b981" }}
                prefix={<CheckCircleOutlined />}
              />
            </Card>
          </Col>
          <Col xs={12} sm={8} md={4}>
            <Card>
              <Statistic
                title="تنتهي قريباً"
                value={stats.licenses.expiringSoon}
                valueStyle={{ color: "#f97316" }}
                prefix={<ClockCircleOutlined />}
              />
            </Card>
          </Col>
          <Col xs={12} sm={8} md={4}>
            <Card>
              <Statistic
                title="منتهية"
                value={stats.licenses.expired}
                valueStyle={{ color: "#ef4444" }}
                prefix={<StopOutlined />}
              />
            </Card>
          </Col>
          <Col xs={12} sm={8} md={4}>
            <Card>
              <Statistic
                title="طلبات معلقة"
                value={stats.applications.pending}
                valueStyle={{ color: "#8b5cf6" }}
                prefix={<ExclamationCircleOutlined />}
              />
            </Card>
          </Col>
          <Col xs={12} sm={8} md={4}>
            <Card>
              <Statistic
                title="تنبيهات"
                value={stats.alerts.unread}
                valueStyle={{ color: "#f59e0b" }}
                prefix={<BellOutlined />}
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
          { label: "جميع الرخص", value: "all" },
          { label: "تنتهي قريباً", value: "expiring" },
          { label: "الطلبات", value: "applications" },
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
                  { value: "active", label: "نشطة" },
                  { value: "expired", label: "منتهية" },
                  { value: "suspended", label: "موقوفة" },
                  { value: "pending", label: "قيد الانتظار" },
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
        ) : licenses.length === 0 ? (
          <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="لا توجد رخص" />
        ) : (
          <Table
            columns={columns}
            dataSource={licenses}
            rowKey="id"
            pagination={{ pageSize: 10, showSizeChanger: true, showTotal: (total) => `${total} رخصة` }}
          />
        )}
      </Card>

      {/* موديل إضافة رخصة */}
      <Modal
        title={
          <Space>
            <SafetyCertificateOutlined />
            <span>رخصة جديدة</span>
          </Space>
        }
        open={showModal}
        onOk={createLicense}
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
          initialValues={{ licenseType: "commercial", renewalPeriodMonths: 12, renewalReminderDays: 60 }}
        >
          <Form.Item
            name="name"
            label="اسم الرخصة"
            rules={[{ required: true, message: "اسم الرخصة مطلوب" }]}
          >
            <Input placeholder="أدخل اسم الرخصة" />
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="licenseType" label="نوع الرخصة">
                <Select
                  options={Object.entries(TYPE_CONFIG).map(([k, v]) => ({ value: k, label: v }))}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="issuingAuthority"
                label="الجهة المصدرة"
                rules={[{ required: true, message: "الجهة المصدرة مطلوبة" }]}
              >
                <Input placeholder="الجهة المصدرة" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="externalLicenseNumber" label="رقم الرخصة الخارجي">
            <Input placeholder="رقم الرخصة الخارجي" />
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="issueDate"
                label="تاريخ الإصدار"
                rules={[{ required: true, message: "تاريخ الإصدار مطلوب" }]}
              >
                <DatePicker style={{ width: "100%" }} placeholder="اختر التاريخ" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="expiryDate"
                label="تاريخ الانتهاء"
                rules={[{ required: true, message: "تاريخ الانتهاء مطلوب" }]}
              >
                <DatePicker style={{ width: "100%" }} placeholder="اختر التاريخ" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="licenseFee" label="رسوم الرخصة">
                <InputNumber style={{ width: "100%" }} min={0} placeholder="رسوم الرخصة" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="renewalFee" label="رسوم التجديد">
                <InputNumber style={{ width: "100%" }} min={0} placeholder="رسوم التجديد" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="renewalPeriodMonths" label="فترة التجديد (شهور)">
                <InputNumber style={{ width: "100%" }} min={1} max={120} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="renewalReminderDays" label="التذكير قبل (أيام)">
                <InputNumber style={{ width: "100%" }} min={1} max={365} />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="description" label="الوصف">
            <Input.TextArea rows={2} placeholder="وصف الرخصة" />
          </Form.Item>

          <Form.Item name="notes" label="ملاحظات">
            <Input.TextArea rows={2} placeholder="ملاحظات إضافية" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
