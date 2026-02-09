/**
 * لوحة التحليلات المتقدمة
 */
import { useState, useEffect } from "react";
import { Row, Col, Card, Button, Input, Select, Space, Empty, Modal, Form, Tabs, Tag, Statistic } from "antd";
import {
  LineChartOutlined,
  AppstoreOutlined,
  PlusOutlined,
  DashboardOutlined,
  FileTextOutlined,
  BarChartOutlined,
  RiseOutlined,
  FallOutlined,
  SettingOutlined,
} from "@ant-design/icons";
import { PageHeader, LoadingSkeleton } from "../components/shared";
import { API_BASE, getAuthHeaders } from "../utils/api";

interface Dashboard {
  id: string;
  name: string;
  description: string | null;
  dashboardType: string;
  isDefault: boolean;
  createdAt: string;
}

interface Metric {
  id: string;
  name: string;
  code: string | null;
  category: string | null;
  unit: string | null;
  format: string;
  targetValue: string | null;
  direction: string;
}

interface ScheduledReport {
  id: string;
  name: string;
  reportType: string;
  frequency: string;
  format: string;
  lastRunAt: string | null;
  nextRunAt: string | null;
  isActive: boolean;
}

const DASHBOARD_TYPES: Record<string, { label: string; icon: React.ReactNode }> = {
  custom: { label: "مخصصة", icon: <SettingOutlined /> },
  department: { label: "قسم", icon: <AppstoreOutlined /> },
  executive: { label: "تنفيذية", icon: <DashboardOutlined /> },
  operational: { label: "تشغيلية", icon: <BarChartOutlined /> },
};

const FREQUENCY_CONFIG: Record<string, { label: string }> = {
  daily: { label: "يومي" },
  weekly: { label: "أسبوعي" },
  monthly: { label: "شهري" },
  quarterly: { label: "ربع سنوي" },
};

const FORMAT_CONFIG: Record<string, { label: string; color: string }> = {
  pdf: { label: "PDF", color: "red" },
  excel: { label: "Excel", color: "green" },
  csv: { label: "CSV", color: "blue" },
};

export default function AnalyticsDashboard() {
  const [dashboards, setDashboards] = useState<Dashboard[]>([]);
  const [metrics, setMetrics] = useState<Metric[]>([]);
  const [reports, setReports] = useState<ScheduledReport[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<string>("dashboards");
  const [showDashboardModal, setShowDashboardModal] = useState(false);
  const [showMetricModal, setShowMetricModal] = useState(false);
  const [dashboardForm] = Form.useForm();
  const [metricForm] = Form.useForm();

  useEffect(() => { loadData(); }, [activeTab]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [statsRes] = await Promise.all([fetch(`${API_BASE}/api/analytics/stats`)]);
      if (statsRes.ok) setStats(await statsRes.json());

      if (activeTab === "dashboards") {
        const res = await fetch(`${API_BASE}/api/analytics/dashboards`);
        if (res.ok) setDashboards(await res.json());
      } else if (activeTab === "metrics") {
        const res = await fetch(`${API_BASE}/api/analytics/metrics`);
        if (res.ok) setMetrics(await res.json());
      } else if (activeTab === "reports") {
        const res = await fetch(`${API_BASE}/api/analytics/scheduled-reports`);
        if (res.ok) setReports(await res.json());
      }
    } catch (error) { console.error(error); }
    finally { setLoading(false); }
  };

  const createDashboard = async () => {
    try {
      const values = await dashboardForm.validateFields();
      const res = await fetch(`${API_BASE}/api/analytics/dashboards`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      if (res.ok) {
        setShowDashboardModal(false);
        dashboardForm.resetFields();
        loadData();
      }
    } catch (error) { console.error(error); }
  };

  const createMetric = async () => {
    try {
      const values = await metricForm.validateFields();
      const res = await fetch(`${API_BASE}/api/analytics/metrics`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...values,
          targetValue: values.targetValue || null,
        }),
      });
      if (res.ok) {
        setShowMetricModal(false);
        metricForm.resetFields();
        loadData();
      }
    } catch (error) { console.error(error); }
  };

  const tabItems = [
    { key: "dashboards", label: <span><DashboardOutlined /> اللوحات</span> },
    { key: "metrics", label: <span><LineChartOutlined /> المؤشرات</span> },
    { key: "reports", label: <span><FileTextOutlined /> التقارير المجدولة</span> },
  ];

  const getHeaderExtra = () => {
    if (activeTab === "dashboards") {
      return (
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setShowDashboardModal(true)}>
          لوحة جديدة
        </Button>
      );
    }
    if (activeTab === "metrics") {
      return (
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setShowMetricModal(true)}>
          مؤشر جديد
        </Button>
      );
    }
    return null;
  };

  return (
    <div>
      <PageHeader
        title="التحليلات المتقدمة"
        subtitle="لوحات المعلومات والمؤشرات والتقارير المجدولة"
        icon={<LineChartOutlined />}
        breadcrumbs={[
          { label: "الرئيسية", path: "/" },
          { label: "التحليلات المتقدمة" },
        ]}
        extra={getHeaderExtra()}
      />

      {/* الإحصائيات */}
      {stats && (
        <Row gutter={[12, 12]} style={{ marginBottom: 24 }}>
          <Col xs={12} sm={8} md={4} lg={4}>
            <Card bordered={false} style={{ background: "#dbeafe", textAlign: "center" }}>
              <Statistic
                title={<span style={{ color: "#1e40af" }}>لوحات المعلومات</span>}
                value={stats.dashboards}
                valueStyle={{ color: "#2563eb", fontWeight: 700 }}
              />
            </Card>
          </Col>
          <Col xs={12} sm={8} md={4} lg={4}>
            <Card bordered={false} style={{ background: "#d1fae5", textAlign: "center" }}>
              <Statistic
                title={<span style={{ color: "#047857" }}>العناصر</span>}
                value={stats.widgets}
                valueStyle={{ color: "#059669", fontWeight: 700 }}
              />
            </Card>
          </Col>
          <Col xs={12} sm={8} md={4} lg={4}>
            <Card bordered={false} style={{ background: "#fef3c7", textAlign: "center" }}>
              <Statistic
                title={<span style={{ color: "#92400e" }}>المؤشرات</span>}
                value={stats.metrics}
                valueStyle={{ color: "#d97706", fontWeight: 700 }}
              />
            </Card>
          </Col>
          <Col xs={12} sm={8} md={4} lg={4}>
            <Card bordered={false} style={{ background: "#ede9fe", textAlign: "center" }}>
              <Statistic
                title={<span style={{ color: "#6d28d9" }}>التقارير المجدولة</span>}
                value={stats.scheduledReports}
                valueStyle={{ color: "#7c3aed", fontWeight: 700 }}
              />
            </Card>
          </Col>
          <Col xs={12} sm={8} md={4} lg={4}>
            <Card bordered={false} style={{ background: "#fee2e2", textAlign: "center" }}>
              <Statistic
                title={<span style={{ color: "#b91c1c" }}>التنبيهات</span>}
                value={stats.alerts}
                valueStyle={{ color: "#dc2626", fontWeight: 700 }}
              />
            </Card>
          </Col>
        </Row>
      )}

      {/* التبويبات */}
      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        items={tabItems}
        style={{ marginBottom: 16 }}
      />

      {/* المحتوى */}
      {loading ? <LoadingSkeleton /> : (
        activeTab === "dashboards" ? (
          dashboards.length === 0 ? (
            <Card>
              <Empty
                image={<DashboardOutlined style={{ fontSize: 64, color: "#d1d5db" }} />}
                description={
                  <div>
                    <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>لا توجد لوحات معلومات</div>
                    <div style={{ color: "#6b7280" }}>أنشئ لوحة جديدة لبدء تتبع بياناتك</div>
                  </div>
                }
              >
                <Button type="primary" icon={<PlusOutlined />} onClick={() => setShowDashboardModal(true)}>
                  إنشاء لوحة جديدة
                </Button>
              </Empty>
            </Card>
          ) : (
            <Row gutter={[16, 16]}>
              {dashboards.map(dashboard => {
                const type = DASHBOARD_TYPES[dashboard.dashboardType] || DASHBOARD_TYPES.custom;
                return (
                  <Col xs={24} sm={12} md={8} key={dashboard.id}>
                    <Card
                      hoverable
                      onClick={() => alert(`فتح لوحة: ${dashboard.name}`)}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
                        <div style={{
                          width: 45,
                          height: 45,
                          background: "#dbeafe",
                          borderRadius: 10,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: 20,
                          color: "#2563eb",
                        }}>
                          {type.icon}
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 600 }}>{dashboard.name}</div>
                          <div style={{ fontSize: 12, color: "#6b7280" }}>{type.label}</div>
                        </div>
                        {dashboard.isDefault && <Tag color="success">افتراضي</Tag>}
                      </div>
                      {dashboard.description && (
                        <p style={{ fontSize: 13, color: "#6b7280", margin: "0 0 12px" }}>{dashboard.description}</p>
                      )}
                      <div style={{ fontSize: 12, color: "#9ca3af" }}>
                        أُنشئ: {new Date(dashboard.createdAt).toLocaleDateString("ar-IQ")}
                      </div>
                    </Card>
                  </Col>
                );
              })}
            </Row>
          )
        ) : activeTab === "metrics" ? (
          metrics.length === 0 ? (
            <Card>
              <Empty
                image={<LineChartOutlined style={{ fontSize: 64, color: "#d1d5db" }} />}
                description={
                  <div>
                    <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>لا توجد مؤشرات مخصصة</div>
                    <div style={{ color: "#6b7280" }}>أضف مؤشرات لتتبع أداء عملك</div>
                  </div>
                }
              >
                <Button type="primary" icon={<PlusOutlined />} onClick={() => setShowMetricModal(true)}>
                  إضافة مؤشر جديد
                </Button>
              </Empty>
            </Card>
          ) : (
            <Space direction="vertical" style={{ width: "100%" }} size={12}>
              {metrics.map(metric => (
                <Card key={metric.id} size="small">
                  <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                    <div style={{
                      width: 50,
                      height: 50,
                      background: "#f0fdf4",
                      borderRadius: 10,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 24,
                    }}>
                      {metric.direction === "higher_is_better" ? <RiseOutlined style={{ color: "#22c55e" }} /> : <FallOutlined style={{ color: "#ef4444" }} />}
                    </div>
                    <div style={{ flex: 1 }}>
                      <Space align="center" size={8}>
                        <span style={{ fontWeight: 600 }}>{metric.name}</span>
                        {metric.code && <Tag style={{ fontFamily: "monospace" }}>{metric.code}</Tag>}
                      </Space>
                      <div style={{ fontSize: 13, color: "#6b7280", marginTop: 4 }}>
                        <Space split="•">
                          {metric.category && <span>التصنيف: {metric.category}</span>}
                          {metric.unit && <span>الوحدة: {metric.unit}</span>}
                          {metric.targetValue && <span style={{ color: "#059669" }}>الهدف: {metric.targetValue}</span>}
                        </Space>
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </Space>
          )
        ) : (
          reports.length === 0 ? (
            <Card>
              <Empty
                image={<FileTextOutlined style={{ fontSize: 64, color: "#d1d5db" }} />}
                description={
                  <div>
                    <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>لا توجد تقارير مجدولة</div>
                    <div style={{ color: "#6b7280" }}>قم بجدولة تقارير لإرسالها تلقائياً</div>
                  </div>
                }
              />
            </Card>
          ) : (
            <Space direction="vertical" style={{ width: "100%" }} size={12}>
              {reports.map(report => {
                const freq = FREQUENCY_CONFIG[report.frequency] || FREQUENCY_CONFIG.daily;
                const format = FORMAT_CONFIG[report.format] || FORMAT_CONFIG.pdf;
                return (
                  <Card key={report.id} size="small">
                    <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                      <Tag color={format.color} style={{ fontSize: 14, padding: "4px 12px" }}>{format.label}</Tag>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 600, marginBottom: 4 }}>{report.name}</div>
                        <Space size={8} style={{ fontSize: 13, color: "#6b7280" }}>
                          <span>{freq.label}</span>
                          <span>•</span>
                          <span>{format.label}</span>
                          {report.lastRunAt && (
                            <>
                              <span>•</span>
                              <span>آخر تشغيل: {new Date(report.lastRunAt).toLocaleDateString("ar-IQ")}</span>
                            </>
                          )}
                        </Space>
                      </div>
                      <Tag color={report.isActive ? "success" : "default"}>
                        {report.isActive ? "نشط" : "متوقف"}
                      </Tag>
                    </div>
                  </Card>
                );
              })}
            </Space>
          )
        )
      )}

      {/* موديل لوحة جديدة */}
      <Modal
        title={<span><DashboardOutlined /> لوحة معلومات جديدة</span>}
        open={showDashboardModal}
        onCancel={() => setShowDashboardModal(false)}
        onOk={createDashboard}
        okText="إنشاء"
        cancelText="إلغاء"
        destroyOnClose
      >
        <Form form={dashboardForm} layout="vertical" initialValues={{ dashboardType: "custom" }}>
          <Form.Item
            name="name"
            label="اسم اللوحة"
            rules={[{ required: true, message: "اسم اللوحة مطلوب" }]}
          >
            <Input placeholder="أدخل اسم اللوحة" />
          </Form.Item>
          <Form.Item name="description" label="الوصف">
            <Input.TextArea rows={3} placeholder="وصف اللوحة (اختياري)" />
          </Form.Item>
          <Form.Item name="dashboardType" label="النوع">
            <Select>
              {Object.entries(DASHBOARD_TYPES).map(([k, v]) => (
                <Select.Option key={k} value={k}>
                  {v.icon} {v.label}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
        </Form>
      </Modal>

      {/* موديل مؤشر جديد */}
      <Modal
        title={<span><LineChartOutlined /> مؤشر جديد</span>}
        open={showMetricModal}
        onCancel={() => setShowMetricModal(false)}
        onOk={createMetric}
        okText="إنشاء"
        cancelText="إلغاء"
        width={550}
        destroyOnClose
      >
        <Form form={metricForm} layout="vertical" initialValues={{ format: "number", direction: "higher_is_better" }}>
          <Row gutter={16}>
            <Col span={16}>
              <Form.Item
                name="name"
                label="اسم المؤشر"
                rules={[{ required: true, message: "اسم المؤشر مطلوب" }]}
              >
                <Input placeholder="أدخل اسم المؤشر" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="code" label="الكود">
                <Input placeholder="مثال: SALES_TOTAL" />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="category" label="التصنيف">
                <Input placeholder="تصنيف المؤشر" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="unit" label="الوحدة">
                <Input placeholder="مثال: %, دينار" />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="direction" label="الاتجاه">
                <Select>
                  <Select.Option value="higher_is_better">الأعلى أفضل</Select.Option>
                  <Select.Option value="lower_is_better">الأقل أفضل</Select.Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="targetValue" label="القيمة المستهدفة">
                <Input type="number" placeholder="الهدف (اختياري)" />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>
    </div>
  );
}
