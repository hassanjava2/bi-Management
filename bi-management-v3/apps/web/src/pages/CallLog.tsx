/**
 * صفحة سجل المكالمات
 */
import { useState, useEffect } from "react";
import { Row, Col, Card, Table, Button, Input, Select, Tag, Space, message, Statistic, Modal, Form } from "antd";
import { PhoneOutlined, PlusOutlined, SearchOutlined, ClockCircleOutlined, BellOutlined } from "@ant-design/icons";
import { PageHeader, LoadingSkeleton, DateDisplay } from "../components/shared";
import { API_BASE, getAuthHeaders } from "../utils/api";

interface Call {
  id: string;
  callType: string;
  callPurpose: string;
  callerName: string | null;
  callerPhone: string;
  status: string;
  duration: number | null;
  startTime: string;
  notes: string | null;
  outcome: string | null;
  followUpRequired: boolean;
  customerId: string | null;
}

const CALL_TYPES: Record<string, { label: string; icon: React.ReactNode }> = {
  inbound: { label: "واردة", icon: <PhoneOutlined /> },
  outbound: { label: "صادرة", icon: <PhoneOutlined /> },
};

const CALL_PURPOSE: Record<string, { label: string; color: string }> = {
  general: { label: "عامة", color: "default" },
  sales: { label: "مبيعات", color: "green" },
  support: { label: "دعم", color: "blue" },
  followup: { label: "متابعة", color: "purple" },
  collection: { label: "تحصيل", color: "red" },
  survey: { label: "استبيان", color: "orange" },
};

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  completed: { label: "مكتملة", color: "success" },
  missed: { label: "فائتة", color: "error" },
  busy: { label: "مشغول", color: "warning" },
  failed: { label: "فاشلة", color: "default" },
  voicemail: { label: "بريد صوتي", color: "purple" },
};

const formatDuration = (seconds: number | null) => {
  if (!seconds) return "-";
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${String(secs).padStart(2, "0")}`;
};

export default function CallLog() {
  const [calls, setCalls] = useState<Call[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [search, setSearch] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [form] = Form.useForm();

  useEffect(() => { loadData(); }, [typeFilter, statusFilter, search]);

  const loadData = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (typeFilter) params.append("type", typeFilter);
      if (statusFilter) params.append("status", statusFilter);
      if (search) params.append("search", search);

      const [res, statsRes] = await Promise.all([
        fetch(`${API_BASE}/api/calls?${params}`, { headers: getAuthHeaders() }),
        fetch(`${API_BASE}/api/calls/stats/overview`, { headers: getAuthHeaders() }),
      ]);
      if (res.ok) setCalls((await res.json()).calls || []);
      if (statsRes.ok) setStats(await statsRes.json());
    } catch (error) {
      console.error(error);
      message.error("حدث خطأ في تحميل البيانات");
    }
    finally { setLoading(false); }
  };

  const handleAddCall = async () => {
    try {
      const values = await form.validateFields();
      const res = await fetch(`${API_BASE}/api/calls`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          ...values,
          duration: values.duration ? parseInt(values.duration) * 60 : null,
          startTime: new Date().toISOString(),
        }),
      });
      if (res.ok) {
        message.success("تم تسجيل المكالمة بنجاح");
        setShowAddModal(false);
        form.resetFields();
        loadData();
      } else {
        message.error("فشل في تسجيل المكالمة");
      }
    } catch (error) {
      console.error(error);
    }
  };

  const columns = [
    {
      title: "المتصل",
      dataIndex: "callerName",
      key: "caller",
      render: (_: any, record: Call) => (
        <div>
          <div style={{ fontWeight: 500 }}>{record.callerName || record.callerPhone}</div>
          {record.callerName && <div style={{ fontSize: "0.8rem", color: "#6b7280" }}>{record.callerPhone}</div>}
        </div>
      ),
    },
    {
      title: "النوع",
      dataIndex: "callType",
      key: "callType",
      align: "center" as const,
      render: (type: string) => {
        const config = CALL_TYPES[type] || CALL_TYPES.outbound;
        return <Space>{config.icon} {config.label}</Space>;
      },
    },
    {
      title: "الغرض",
      dataIndex: "callPurpose",
      key: "callPurpose",
      align: "center" as const,
      render: (purpose: string) => {
        const config = CALL_PURPOSE[purpose] || CALL_PURPOSE.general;
        return <Tag color={config.color}>{config.label}</Tag>;
      },
    },
    {
      title: "المدة",
      dataIndex: "duration",
      key: "duration",
      align: "center" as const,
      render: (duration: number | null) => (
        <span style={{ fontFamily: "monospace" }}>
          <ClockCircleOutlined style={{ marginLeft: 4 }} />
          {formatDuration(duration)}
        </span>
      ),
    },
    {
      title: "الحالة",
      dataIndex: "status",
      key: "status",
      align: "center" as const,
      render: (status: string, record: Call) => {
        const config = STATUS_CONFIG[status] || STATUS_CONFIG.completed;
        return (
          <Space>
            <Tag color={config.color}>{config.label}</Tag>
            {record.followUpRequired && <BellOutlined style={{ color: "#f59e0b" }} />}
          </Space>
        );
      },
    },
    {
      title: "التاريخ",
      dataIndex: "startTime",
      key: "startTime",
      align: "center" as const,
      render: (date: string) => <DateDisplay date={date} format="datetime" />,
    },
  ];

  return (
    <div>
      <PageHeader
        title="سجل المكالمات"
        subtitle="تتبع وإدارة المكالمات مع العملاء"
        icon={<PhoneOutlined />}
        breadcrumbs={[
          { label: "الرئيسية", path: "/" },
          { label: "سجل المكالمات" },
        ]}
        extra={
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setShowAddModal(true)}>
            تسجيل مكالمة
          </Button>
        }
      />

      {/* الإحصائيات */}
      {stats && (
        <Row gutter={[12, 12]} style={{ marginBottom: 24 }}>
          <Col span={24} md={4}>
            <Card style={{ background: "#dbeafe", border: "none" }}>
              <Statistic
                title={<span style={{ color: "#1e40af" }}>مكالمات اليوم</span>}
                value={stats.today?.total || 0}
                valueStyle={{ color: "#2563eb" }}
              />
            </Card>
          </Col>
          <Col span={12} md={5}>
            <Card style={{ background: "#d1fae5", border: "none" }}>
              <Statistic
                title={<span style={{ color: "#047857" }}>مكتملة</span>}
                value={stats.byStatus?.completed || 0}
                valueStyle={{ color: "#059669" }}
              />
            </Card>
          </Col>
          <Col span={12} md={5}>
            <Card style={{ background: "#fee2e2", border: "none" }}>
              <Statistic
                title={<span style={{ color: "#b91c1c" }}>فائتة</span>}
                value={stats.byStatus?.missed || 0}
                valueStyle={{ color: "#dc2626" }}
              />
            </Card>
          </Col>
          <Col span={12} md={5}>
            <Card style={{ background: "#fef3c7", border: "none" }}>
              <Statistic
                title={<span style={{ color: "#92400e" }}>صادرة</span>}
                value={stats.byType?.outbound || 0}
                valueStyle={{ color: "#d97706" }}
                prefix={<PhoneOutgoing />}
              />
            </Card>
          </Col>
          <Col span={12} md={5}>
            <Card style={{ background: "#ede9fe", border: "none" }}>
              <Statistic
                title={<span style={{ color: "#5b21b6" }}>واردة</span>}
                value={stats.byType?.inbound || 0}
                valueStyle={{ color: "#7c3aed" }}
                prefix={<PhoneIncoming />}
              />
            </Card>
          </Col>
        </Row>
      )}

      {/* الفلاتر */}
      <Card style={{ marginBottom: 16 }}>
        <Space wrap size="middle">
          <Input
            placeholder="بحث برقم الهاتف أو الاسم..."
            prefix={<SearchOutlined />}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ width: 250 }}
            allowClear
          />
          <Select
            placeholder="كل الأنواع"
            value={typeFilter || undefined}
            onChange={(val) => setTypeFilter(val || "")}
            style={{ width: 140 }}
            allowClear
          >
            <Select.Option value="inbound">واردة</Select.Option>
            <Select.Option value="outbound">صادرة</Select.Option>
          </Select>
          <Select
            placeholder="كل الحالات"
            value={statusFilter || undefined}
            onChange={(val) => setStatusFilter(val || "")}
            style={{ width: 140 }}
            allowClear
          >
            {Object.entries(STATUS_CONFIG).map(([k, v]) => (
              <Select.Option key={k} value={k}>{v.label}</Select.Option>
            ))}
          </Select>
        </Space>
      </Card>

      {/* الجدول */}
      {loading ? (
        <LoadingSkeleton type="table" />
      ) : (
        <Card>
          <Table
            dataSource={calls}
            columns={columns}
            rowKey="id"
            pagination={{ pageSize: 10, showSizeChanger: true, showTotal: (total) => `إجمالي ${total} مكالمة` }}
            locale={{ emptyText: <div style={{ padding: "2rem" }}><PhoneOutlined style={{ fontSize: 48, color: "#d1d5db" }} /><p>لا توجد مكالمات</p></div> }}
          />
        </Card>
      )}

      {/* موديل إضافة مكالمة */}
      <Modal
        title={<Space><PhoneOutlined /> تسجيل مكالمة</Space>}
        open={showAddModal}
        onCancel={() => { setShowAddModal(false); form.resetFields(); }}
        onOk={handleAddCall}
        okText="حفظ"
        cancelText="إلغاء"
        width={500}
      >
        <Form form={form} layout="vertical" initialValues={{ callType: "outbound", callPurpose: "general" }}>
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name="callType" label="النوع">
                <Select>
                  {Object.entries(CALL_TYPES).map(([k, v]) => (
                    <Select.Option key={k} value={k}>{v.icon} {v.label}</Select.Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="callPurpose" label="الغرض">
                <Select>
                  {Object.entries(CALL_PURPOSE).map(([k, v]) => (
                    <Select.Option key={k} value={k}>{v.label}</Select.Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name="callerPhone" label="رقم الهاتف" rules={[{ required: true, message: "رقم الهاتف مطلوب" }]}>
                <Input placeholder="رقم الهاتف" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="callerName" label="اسم المتصل">
                <Input placeholder="اسم المتصل" />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name="duration" label="المدة (دقائق)">
                <Input type="number" placeholder="المدة بالدقائق" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="outcome" label="النتيجة">
                <Select placeholder="-- اختر --" allowClear>
                  <Select.Option value="successful">ناجحة</Select.Option>
                  <Select.Option value="callback_needed">يحتاج متابعة</Select.Option>
                  <Select.Option value="not_interested">غير مهتم</Select.Option>
                  <Select.Option value="wrong_number">رقم خاطئ</Select.Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="notes" label="ملاحظات">
            <Input.TextArea rows={2} placeholder="ملاحظات إضافية" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
