/**
 * إدارة المخاطر
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
  Slider,
  Segmented,
  Tooltip,
} from "antd";
import {
  PlusOutlined,
  WarningOutlined,
  AlertOutlined,
  AppstoreOutlined,
  ExclamationCircleOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  EyeOutlined,
  CloseCircleOutlined,
} from "@ant-design/icons";
import { PageHeader, LoadingSkeleton, DateDisplay } from "../components/shared";
import { API_BASE, getAuthHeaders } from "../utils/api";

interface Risk {
  id: string;
  riskNumber: string;
  title: string;
  description: string | null;
  category: string;
  probability: number;
  impact: number;
  riskScore: number;
  riskLevel: string;
  status: string;
  createdAt: string;
}

interface Incident {
  id: string;
  title: string;
  severity: string;
  status: string;
  occurredAt: string;
}

const LEVEL_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  low: { label: "منخفض", color: "success", bg: "#d1fae5" },
  medium: { label: "متوسط", color: "warning", bg: "#fef3c7" },
  high: { label: "مرتفع", color: "error", bg: "#fee2e2" },
  critical: { label: "حرج", color: "purple", bg: "#ede9fe" },
};

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  identified: { label: "محدد", color: "default" },
  analyzed: { label: "قيد التحليل", color: "processing" },
  treatment: { label: "قيد المعالجة", color: "warning" },
  monitoring: { label: "مراقبة", color: "purple" },
  closed: { label: "مغلق", color: "success" },
};

const CATEGORY_CONFIG: Record<string, { label: string; icon: string }> = {
  operational: { label: "تشغيلي", icon: "⚙️" },
  financial: { label: "مالي", icon: "💰" },
  strategic: { label: "استراتيجي", icon: "🎯" },
  compliance: { label: "امتثال", icon: "📋" },
  technology: { label: "تقني", icon: "💻" },
  market: { label: "سوقي", icon: "📊" },
};

export default function RiskManagement() {
  const [risks, setRisks] = useState<Risk[]>([]);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"risks" | "incidents" | "matrix">("risks");
  const [filter, setFilter] = useState({ category: "", level: "", search: "" });
  const [showModal, setShowModal] = useState(false);
  const [form] = Form.useForm();

  useEffect(() => {
    loadData();
  }, [activeTab, filter]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [statsRes] = await Promise.all([
        fetch(`${API_BASE}/api/risks/stats`, { headers: getAuthHeaders() }),
      ]);
      if (statsRes.ok) setStats(await statsRes.json());

      if (activeTab === "risks") {
        const params = new URLSearchParams();
        if (filter.category) params.append("category", filter.category);
        if (filter.level) params.append("level", filter.level);
        if (filter.search) params.append("search", filter.search);
        const res = await fetch(`${API_BASE}/api/risks?${params}`, { headers: getAuthHeaders() });
        if (res.ok) setRisks((await res.json()).risks || []);
      } else if (activeTab === "incidents") {
        const res = await fetch(`${API_BASE}/api/risks/incidents`, { headers: getAuthHeaders() });
        if (res.ok) setIncidents(await res.json());
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
      const res = await fetch(`${API_BASE}/api/risks`, {
        method: "POST",
        headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      if (res.ok) {
        message.success("تم إضافة المخاطرة بنجاح");
        setShowModal(false);
        form.resetFields();
        loadData();
      } else {
        message.error("حدث خطأ في إضافة المخاطرة");
      }
    } catch (error) {
      console.error(error);
    }
  };

  const updateStatus = async (id: string, status: string) => {
    try {
      await fetch(`${API_BASE}/api/risks/${id}`, {
        method: "PATCH",
        headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      message.success("تم تحديث الحالة");
      loadData();
    } catch (error) {
      console.error(error);
      message.error("حدث خطأ في تحديث الحالة");
    }
  };

  const riskColumns = [
    {
      title: "رقم المخاطرة",
      dataIndex: "riskNumber",
      key: "riskNumber",
      width: 120,
      render: (text: string) => <span style={{ fontFamily: "monospace" }}>{text}</span>,
    },
    {
      title: "العنوان",
      dataIndex: "title",
      key: "title",
      render: (text: string, record: Risk) => (
        <Space direction="vertical" size={0}>
          <span style={{ fontWeight: 600 }}>{text}</span>
          {record.description && (
            <span style={{ fontSize: "0.85rem", color: "#6b7280" }}>
              {record.description.substring(0, 60)}...
            </span>
          )}
        </Space>
      ),
    },
    {
      title: "التصنيف",
      dataIndex: "category",
      key: "category",
      width: 120,
      render: (category: string) => {
        const cat = CATEGORY_CONFIG[category] || CATEGORY_CONFIG.operational;
        return (
          <span>
            {cat.icon} {cat.label}
          </span>
        );
      },
    },
    {
      title: "المستوى",
      dataIndex: "riskLevel",
      key: "riskLevel",
      width: 120,
      render: (level: string, record: Risk) => {
        const config = LEVEL_CONFIG[level] || LEVEL_CONFIG.medium;
        return (
          <Tag color={config.color}>
            {config.label} ({record.riskScore})
          </Tag>
        );
      },
    },
    {
      title: "الاحتمالية / التأثير",
      key: "probability_impact",
      width: 140,
      render: (_: any, record: Risk) => (
        <span style={{ fontSize: "0.85rem" }}>
          {record.probability}/5 × {record.impact}/5
        </span>
      ),
    },
    {
      title: "الحالة",
      dataIndex: "status",
      key: "status",
      width: 130,
      render: (status: string, record: Risk) => {
        const config = STATUS_CONFIG[status] || STATUS_CONFIG.identified;
        return (
          <Select
            value={status}
            size="small"
            style={{ width: 120 }}
            onChange={(value) => updateStatus(record.id, value)}
            options={Object.entries(STATUS_CONFIG).map(([k, v]) => ({
              value: k,
              label: v.label,
            }))}
          />
        );
      },
    },
  ];

  const incidentColumns = [
    {
      title: "العنوان",
      dataIndex: "title",
      key: "title",
    },
    {
      title: "الشدة",
      dataIndex: "severity",
      key: "severity",
      render: (severity: string) => {
        const config = LEVEL_CONFIG[severity] || LEVEL_CONFIG.medium;
        return <Tag color={config.color}>{config.label}</Tag>;
      },
    },
    {
      title: "الحالة",
      dataIndex: "status",
      key: "status",
      render: (status: string) => {
        const config = STATUS_CONFIG[status] || STATUS_CONFIG.identified;
        return <Tag color={config.color}>{config.label}</Tag>;
      },
    },
    {
      title: "تاريخ الحدوث",
      dataIndex: "occurredAt",
      key: "occurredAt",
      render: (date: string) => <DateDisplay date={date} />,
    },
  ];

  const renderMatrix = () => {
    const levels = [5, 4, 3, 2, 1];
    const getColor = (p: number, i: number) => {
      const score = p * i;
      if (score <= 4) return "#d1fae5";
      if (score <= 9) return "#fef3c7";
      if (score <= 15) return "#fee2e2";
      return "#ede9fe";
    };

    return (
      <Card title="مصفوفة المخاطر">
        <div style={{ display: "flex", gap: "0.5rem", justifyContent: "center" }}>
          <div
            style={{
              width: "80px",
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            <span style={{ writingMode: "vertical-rl", transform: "rotate(180deg)", fontWeight: 600 }}>
              الاحتمالية
            </span>
          </div>
          <div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 60px)", gap: "4px" }}>
              {levels.map((p) =>
                levels.map((i) => (
                  <Tooltip key={`${p}-${i}`} title={`الاحتمالية: ${p} × التأثير: ${6 - i} = ${p * (6 - i)}`}>
                    <div
                      style={{
                        width: "60px",
                        height: "60px",
                        background: getColor(p, 6 - i),
                        borderRadius: "6px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontWeight: 600,
                        fontSize: "0.85rem",
                        cursor: "pointer",
                      }}
                    >
                      {p * (6 - i)}
                    </div>
                  </Tooltip>
                ))
              )}
            </div>
            <div style={{ display: "flex", justifyContent: "center", marginTop: "0.5rem", fontWeight: 600 }}>
              التأثير
            </div>
          </div>
        </div>
        <div style={{ display: "flex", gap: "1rem", justifyContent: "center", marginTop: "1.5rem" }}>
          {Object.entries(LEVEL_CONFIG).map(([k, v]) => (
            <div key={k} style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <div style={{ width: "20px", height: "20px", background: v.bg, borderRadius: "4px" }} />
              <span>{v.label}</span>
            </div>
          ))}
        </div>
      </Card>
    );
  };

  return (
    <div>
      <PageHeader
        title="إدارة المخاطر"
        subtitle="تحديد وتقييم ومعالجة المخاطر"
        breadcrumbs={[
          { label: "الرئيسية", href: "/" },
          { label: "إدارة المخاطر" },
        ]}
        icon={<WarningOutlined />}
        extra={
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setShowModal(true)}>
            مخاطرة جديدة
          </Button>
        }
      />

      {/* الإحصائيات */}
      {stats && (
        <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
          <Col xs={12} sm={8} md={4}>
            <Card>
              <Statistic title="إجمالي المخاطر" value={stats.total} />
            </Card>
          </Col>
          <Col xs={12} sm={8} md={4}>
            <Card style={{ background: LEVEL_CONFIG.critical.bg }}>
              <Statistic
                title="حرجة"
                value={stats.byLevel?.critical || 0}
                valueStyle={{ color: "#7c3aed" }}
                prefix={<ExclamationCircleOutlined />}
              />
            </Card>
          </Col>
          <Col xs={12} sm={8} md={4}>
            <Card style={{ background: LEVEL_CONFIG.high.bg }}>
              <Statistic
                title="مرتفعة"
                value={stats.byLevel?.high || 0}
                valueStyle={{ color: "#dc2626" }}
                prefix={<AlertOutlined />}
              />
            </Card>
          </Col>
          <Col xs={12} sm={8} md={4}>
            <Card style={{ background: LEVEL_CONFIG.medium.bg }}>
              <Statistic
                title="متوسطة"
                value={stats.byLevel?.medium || 0}
                valueStyle={{ color: "#d97706" }}
                prefix={<ClockCircleOutlined />}
              />
            </Card>
          </Col>
          <Col xs={12} sm={8} md={4}>
            <Card style={{ background: LEVEL_CONFIG.low.bg }}>
              <Statistic
                title="منخفضة"
                value={stats.byLevel?.low || 0}
                valueStyle={{ color: "#059669" }}
                prefix={<CheckCircleOutlined />}
              />
            </Card>
          </Col>
          <Col xs={12} sm={8} md={4}>
            <Card style={{ background: "#fef2f2" }}>
              <Statistic
                title="حوادث مفتوحة"
                value={stats.openIncidents || 0}
                valueStyle={{ color: "#dc2626" }}
                prefix={<CloseCircleOutlined />}
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
          { label: "⚠️ المخاطر", value: "risks" },
          { label: "🚨 الحوادث", value: "incidents" },
          { label: "📊 المصفوفة", value: "matrix" },
        ]}
        style={{ marginBottom: 16 }}
      />

      {/* الفلاتر */}
      {activeTab === "risks" && (
        <Card style={{ marginBottom: 16 }}>
          <Row gutter={16}>
            <Col xs={24} sm={12} md={8}>
              <Input.Search
                placeholder="بحث..."
                value={filter.search}
                onChange={(e) => setFilter({ ...filter, search: e.target.value })}
                onSearch={() => loadData()}
                allowClear
              />
            </Col>
            <Col xs={12} sm={6} md={4}>
              <Select
                placeholder="التصنيف"
                value={filter.category || undefined}
                onChange={(value) => setFilter({ ...filter, category: value || "" })}
                allowClear
                style={{ width: "100%" }}
                options={[
                  { value: "", label: "كل التصنيفات" },
                  ...Object.entries(CATEGORY_CONFIG).map(([k, v]) => ({
                    value: k,
                    label: `${v.icon} ${v.label}`,
                  })),
                ]}
              />
            </Col>
            <Col xs={12} sm={6} md={4}>
              <Select
                placeholder="المستوى"
                value={filter.level || undefined}
                onChange={(value) => setFilter({ ...filter, level: value || "" })}
                allowClear
                style={{ width: "100%" }}
                options={[
                  { value: "", label: "كل المستويات" },
                  ...Object.entries(LEVEL_CONFIG).map(([k, v]) => ({
                    value: k,
                    label: v.label,
                  })),
                ]}
              />
            </Col>
          </Row>
        </Card>
      )}

      {/* المحتوى */}
      {loading ? (
        <LoadingSkeleton />
      ) : activeTab === "matrix" ? (
        renderMatrix()
      ) : activeTab === "risks" ? (
        <Card>
          {risks.length === 0 ? (
            <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="لا توجد مخاطر مسجلة" />
          ) : (
            <Table
              columns={riskColumns}
              dataSource={risks}
              rowKey="id"
              pagination={{ pageSize: 10, showSizeChanger: true, showTotal: (total) => `${total} مخاطرة` }}
            />
          )}
        </Card>
      ) : (
        <Card>
          {incidents.length === 0 ? (
            <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="لا توجد حوادث" />
          ) : (
            <Table
              columns={incidentColumns}
              dataSource={incidents}
              rowKey="id"
              pagination={{ pageSize: 10, showSizeChanger: true, showTotal: (total) => `${total} حادثة` }}
            />
          )}
        </Card>
      )}

      {/* موديل إضافة */}
      <Modal
        title={
          <Space>
            <WarningOutlined />
            <span>مخاطرة جديدة</span>
          </Space>
        }
        open={showModal}
        onOk={handleCreate}
        onCancel={() => {
          setShowModal(false);
          form.resetFields();
        }}
        okText="إضافة"
        cancelText="إلغاء"
        width={550}
      >
        <Form
          form={form}
          layout="vertical"
          initialValues={{ category: "operational", probability: 3, impact: 3 }}
        >
          <Form.Item
            name="title"
            label="عنوان المخاطرة"
            rules={[{ required: true, message: "عنوان المخاطرة مطلوب" }]}
          >
            <Input placeholder="أدخل عنوان المخاطرة" />
          </Form.Item>

          <Form.Item name="description" label="الوصف">
            <Input.TextArea rows={3} placeholder="وصف المخاطرة" />
          </Form.Item>

          <Form.Item name="category" label="التصنيف">
            <Select
              options={Object.entries(CATEGORY_CONFIG).map(([k, v]) => ({
                value: k,
                label: `${v.icon} ${v.label}`,
              }))}
            />
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="probability" label="الاحتمالية (1-5)">
                <Slider min={1} max={5} marks={{ 1: "1", 2: "2", 3: "3", 4: "4", 5: "5" }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="impact" label="التأثير (1-5)">
                <Slider min={1} max={5} marks={{ 1: "1", 2: "2", 3: "3", 4: "4", 5: "5" }} />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item noStyle shouldUpdate>
            {({ getFieldValue }) => {
              const probability = getFieldValue("probability") || 3;
              const impact = getFieldValue("impact") || 3;
              const score = probability * impact;
              return (
                <Card size="small" style={{ textAlign: "center", background: "#f9fafb" }}>
                  <span style={{ color: "#6b7280" }}>درجة المخاطرة: </span>
                  <span style={{ fontWeight: 700, fontSize: "1.2rem" }}>{score}</span>
                </Card>
              );
            }}
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
