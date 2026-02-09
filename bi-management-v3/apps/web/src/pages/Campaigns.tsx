import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Row, Col, Card, Button, Input, Select, Form, Modal, Tag, Space, message, Statistic, Empty, DatePicker } from "antd";
import { PlusOutlined, RocketOutlined, TeamOutlined, DollarOutlined, RiseOutlined } from "@ant-design/icons";
import { PageHeader, StatusTag, MoneyDisplay, DateDisplay, LoadingSkeleton } from "../components/shared";
import { API_BASE, getAuthHeaders } from "../utils/api";

type Campaign = {
  id: string;
  code: string | null;
  name: string;
  type: string | null;
  status: string;
  budget: number | null;
  actualCost: number | null;
  expectedRevenue: number | null;
  actualRevenue: number | null;
  startDate: string | null;
  endDate: string | null;
  membersCount: number;
};

type CampStats = {
  total: number;
  active: number;
  totalBudget: number;
  totalRevenue: number;
  roi: number;
};

const STATUS_CONFIG: Record<string, { color: string; label: string }> = {
  draft: { color: "default", label: "مسودة" },
  planned: { color: "blue", label: "مخطط" },
  active: { color: "green", label: "نشط" },
  paused: { color: "orange", label: "متوقف" },
  completed: { color: "purple", label: "مكتمل" },
  cancelled: { color: "red", label: "ملغي" },
};

const TYPE_LABELS: Record<string, string> = {
  email: "بريد إلكتروني",
  social: "وسائل تواصل",
  content: "محتوى",
  event: "فعالية",
  webinar: "ويبنار",
  advertising: "إعلانات",
};

export default function Campaigns() {
  const [data, setData] = useState<Campaign[]>([]);
  const [stats, setStats] = useState<CampStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form] = Form.useForm();

  useEffect(() => {
    document.title = "الحملات التسويقية | BI Management v3";
  }, []);

  const loadData = () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (statusFilter) params.append("status", statusFilter);

    Promise.all([
      fetch(`${API_BASE}/api/campaigns?${params}`, { headers: getAuthHeaders() }).then((r) => r.json()),
      fetch(`${API_BASE}/api/campaigns/stats`, { headers: getAuthHeaders() }).then((r) => r.json()),
    ])
      .then(([campsRes, statsRes]) => {
        setData(campsRes.items || []);
        setStats(statsRes);
      })
      .catch((e) => message.error(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
  }, [statusFilter]);

  const handleSubmit = async (values: any) => {
    setSubmitting(true);
    try {
      const res = await fetch(`${API_BASE}/api/campaigns`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          ...values,
          budget: values.budget ? parseFloat(values.budget) : null,
          expectedRevenue: values.expectedRevenue ? parseFloat(values.expectedRevenue) : null,
          startDate: values.startDate?.format("YYYY-MM-DD"),
          endDate: values.endDate?.format("YYYY-MM-DD"),
        }),
      });

      if (!res.ok) throw new Error("فشل في إنشاء الحملة");

      message.success("تم إنشاء الحملة بنجاح");
      setModalOpen(false);
      form.resetFields();
      loadData();
    } catch (err) {
      message.error(err instanceof Error ? err.message : "حدث خطأ");
    } finally {
      setSubmitting(false);
    }
  };

  const formatCurrency = (n: number | null) => {
    if (!n) return "-";
    return n.toLocaleString() + " IQD";
  };

  return (
    <div>
      <PageHeader
        title="الحملات التسويقية"
        subtitle="إدارة ومتابعة الحملات التسويقية"
        breadcrumbs={[
          { label: "CRM", path: "/crm" },
          { label: "الحملات التسويقية" },
        ]}
        extra={
          <Space>
            <Link to="/crm/leads">
              <Button>العملاء المحتملين</Button>
            </Link>
            <Button type="primary" icon={<PlusOutlined />} onClick={() => setModalOpen(true)}>
              حملة جديدة
            </Button>
          </Space>
        }
      />

      {/* Stats Cards */}
      {stats && (
        <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
          <Col xs={12} sm={6}>
            <Card>
              <Statistic
                title="إجمالي الحملات"
                value={stats.total}
                valueStyle={{ color: "#1d4ed8" }}
                prefix={<RocketOutlined />}
              />
            </Card>
          </Col>
          <Col xs={12} sm={6}>
            <Card>
              <Statistic
                title="نشطة"
                value={stats.active}
                valueStyle={{ color: "#15803d" }}
                prefix={<TeamOutlined />}
              />
            </Card>
          </Col>
          <Col xs={12} sm={6}>
            <Card>
              <Statistic
                title="إجمالي الميزانية"
                value={stats.totalBudget}
                valueStyle={{ color: "#b45309" }}
                prefix={<DollarOutlined />}
                formatter={(value) => formatCurrency(Number(value))}
              />
            </Card>
          </Col>
          <Col xs={12} sm={6}>
            <Card>
              <Statistic
                title="العائد ROI"
                value={stats.roi.toFixed(0)}
                valueStyle={{ color: "#7c3aed" }}
                prefix={<RiseOutlined />}
                suffix="%"
              />
            </Card>
          </Col>
        </Row>
      )}

      {/* Filters */}
      <Card style={{ marginBottom: 16 }}>
        <Space wrap>
          <Select
            placeholder="جميع الحالات"
            value={statusFilter || undefined}
            onChange={(value) => setStatusFilter(value || "")}
            style={{ width: 150 }}
            allowClear
            options={[
              { value: "draft", label: "مسودة" },
              { value: "planned", label: "مخطط" },
              { value: "active", label: "نشط" },
              { value: "paused", label: "متوقف" },
              { value: "completed", label: "مكتمل" },
            ]}
          />
        </Space>
      </Card>

      {/* Campaign Cards */}
      {loading ? (
        <Card>
          <LoadingSkeleton />
        </Card>
      ) : data.length === 0 ? (
        <Card>
          <Empty description="لا توجد حملات" image={Empty.PRESENTED_IMAGE_SIMPLE} />
        </Card>
      ) : (
        <Row gutter={[16, 16]}>
          {data.map((campaign) => (
            <Col xs={24} sm={12} lg={8} key={campaign.id}>
              <Link to={`/crm/campaigns/${campaign.id}`} style={{ textDecoration: "none" }}>
                <Card hoverable>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
                    <div>
                      <h3 style={{ margin: 0, fontSize: "1.1rem", color: "#1e293b" }}>{campaign.name}</h3>
                      <span style={{ fontSize: "0.8rem", color: "#64748b" }}>{campaign.code}</span>
                    </div>
                    <StatusTag status={campaign.status} config={STATUS_CONFIG} />
                  </div>

                  <Row gutter={[12, 12]}>
                    <Col span={12}>
                      <div style={{ fontSize: "0.75rem", color: "#94a3b8" }}>النوع</div>
                      <div style={{ fontWeight: 500 }}>{TYPE_LABELS[campaign.type || ""] || campaign.type || "-"}</div>
                    </Col>
                    <Col span={12}>
                      <div style={{ fontSize: "0.75rem", color: "#94a3b8" }}>المشاركين</div>
                      <div style={{ fontWeight: 500 }}>{campaign.membersCount}</div>
                    </Col>
                    <Col span={12}>
                      <div style={{ fontSize: "0.75rem", color: "#94a3b8" }}>الميزانية</div>
                      <div style={{ fontWeight: 500 }}><MoneyDisplay amount={campaign.budget} /></div>
                    </Col>
                    <Col span={12}>
                      <div style={{ fontSize: "0.75rem", color: "#94a3b8" }}>الإيرادات</div>
                      <div style={{ fontWeight: 500, color: "#15803d" }}><MoneyDisplay amount={campaign.actualRevenue} /></div>
                    </Col>
                  </Row>

                  <div style={{ borderTop: "1px solid #f1f5f9", paddingTop: 12, marginTop: 12, fontSize: "0.8rem", color: "#64748b" }}>
                    <DateDisplay date={campaign.startDate} /> - <DateDisplay date={campaign.endDate} />
                  </div>
                </Card>
              </Link>
            </Col>
          ))}
        </Row>
      )}

      {/* Add Campaign Modal */}
      <Modal
        title="إنشاء حملة جديدة"
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        footer={null}
        width={600}
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item name="name" label="اسم الحملة" rules={[{ required: true, message: "اسم الحملة مطلوب" }]}>
            <Input />
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="type" label="النوع">
                <Select placeholder="اختر النوع" allowClear>
                  <Select.Option value="email">بريد إلكتروني</Select.Option>
                  <Select.Option value="social">وسائل تواصل</Select.Option>
                  <Select.Option value="content">محتوى</Select.Option>
                  <Select.Option value="event">فعالية</Select.Option>
                  <Select.Option value="webinar">ويبنار</Select.Option>
                  <Select.Option value="advertising">إعلانات</Select.Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="budget" label="الميزانية">
                <Input type="number" placeholder="0" suffix="IQD" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="startDate" label="تاريخ البدء">
                <DatePicker style={{ width: "100%" }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="endDate" label="تاريخ الانتهاء">
                <DatePicker style={{ width: "100%" }} />
              </Form.Item>
            </Col>
          </Row>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 16 }}>
            <Button onClick={() => setModalOpen(false)}>إلغاء</Button>
            <Button type="primary" htmlType="submit" loading={submitting}>
              إنشاء الحملة
            </Button>
          </div>
        </Form>
      </Modal>
    </div>
  );
}
