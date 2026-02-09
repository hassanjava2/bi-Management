import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Row, Col, Card, Table, Button, Input, Select, Form, Modal, Tag, Space, message, Statistic, Empty } from "antd";
import { PlusOutlined, SearchOutlined, UserOutlined, EyeOutlined } from "@ant-design/icons";
import { PageHeader, StatusTag, MoneyDisplay, LoadingSkeleton } from "../components/shared";
import { API_BASE, getAuthHeaders } from "../utils/api";
import type { ColumnsType } from "antd/es/table";

type Lead = {
  id: string;
  code: string | null;
  name: string;
  company: string | null;
  email: string | null;
  phone: string | null;
  source: string | null;
  status: string;
  priority: string;
  estimatedValue: number | null;
  nextFollowUp: string | null;
  assignedUser: { id: string; fullName: string } | null;
};

type LeadStats = {
  total: number;
  new: number;
  qualified: number;
  converted: number;
  lost: number;
};

const STATUS_CONFIG: Record<string, { color: string; label: string }> = {
  new: { color: "blue", label: "جديد" },
  contacted: { color: "orange", label: "تم التواصل" },
  qualified: { color: "green", label: "مؤهل" },
  converted: { color: "purple", label: "محول" },
  lost: { color: "red", label: "خسارة" },
};

const PRIORITY_CONFIG: Record<string, { color: string; label: string }> = {
  high: { color: "red", label: "عالي" },
  medium: { color: "orange", label: "متوسط" },
  low: { color: "default", label: "منخفض" },
};

const SOURCE_LABELS: Record<string, string> = {
  website: "الموقع",
  referral: "إحالة",
  social: "وسائل التواصل",
  cold_call: "اتصال مباشر",
  event: "فعالية",
  other: "أخرى",
};

export default function Leads() {
  const [data, setData] = useState<Lead[]>([]);
  const [stats, setStats] = useState<LeadStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form] = Form.useForm();

  useEffect(() => {
    document.title = "العملاء المحتملين | BI Management v3";
  }, []);

  const loadData = () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (statusFilter) params.append("status", statusFilter);

    Promise.all([
      fetch(`${API_BASE}/api/leads?${params}`, { headers: getAuthHeaders() }).then((r) => r.json()),
      fetch(`${API_BASE}/api/leads/stats`, { headers: getAuthHeaders() }).then((r) => r.json()),
    ])
      .then(([leadsRes, statsRes]) => {
        setData(leadsRes.items || []);
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
      const res = await fetch(`${API_BASE}/api/leads`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          ...values,
          estimatedValue: values.estimatedValue ? parseFloat(values.estimatedValue) : null,
        }),
      });

      if (!res.ok) throw new Error("فشل في إنشاء العميل المحتمل");

      message.success("تم إضافة العميل المحتمل بنجاح");
      setModalOpen(false);
      form.resetFields();
      loadData();
    } catch (err) {
      message.error(err instanceof Error ? err.message : "حدث خطأ");
    } finally {
      setSubmitting(false);
    }
  };

  const filteredData = data.filter((lead) => {
    const q = search.toLowerCase();
    return (
      lead.name.toLowerCase().includes(q) ||
      (lead.company && lead.company.toLowerCase().includes(q)) ||
      (lead.email && lead.email.toLowerCase().includes(q))
    );
  });

  const columns: ColumnsType<Lead> = [
    {
      title: "العميل",
      dataIndex: "name",
      key: "name",
      render: (_, record) => (
        <div>
          <div style={{ fontWeight: 500 }}>{record.name}</div>
          <div style={{ fontSize: "0.8rem", color: "#64748b" }}>
            {record.company && <span>{record.company} - </span>}
            {record.email || record.phone || "-"}
          </div>
        </div>
      ),
    },
    {
      title: "المصدر",
      dataIndex: "source",
      key: "source",
      render: (source) => SOURCE_LABELS[source] || "-",
    },
    {
      title: "القيمة المتوقعة",
      dataIndex: "estimatedValue",
      key: "estimatedValue",
      render: (value) => <MoneyDisplay amount={value} />,
    },
    {
      title: "الأولوية",
      dataIndex: "priority",
      key: "priority",
      render: (priority) => {
        const config = PRIORITY_CONFIG[priority] || PRIORITY_CONFIG.medium;
        return <Tag color={config.color}>{config.label}</Tag>;
      },
    },
    {
      title: "الحالة",
      dataIndex: "status",
      key: "status",
      render: (status) => <StatusTag status={status} config={STATUS_CONFIG} />,
    },
    {
      title: "إجراءات",
      key: "actions",
      render: (_, record) => (
        <Link to={`/crm/leads/${record.id}`}>
          <Button type="text" icon={<EyeOutlined />}>
            التفاصيل
          </Button>
        </Link>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="العملاء المحتملين (Leads)"
        subtitle="إدارة ومتابعة العملاء المحتملين"
        breadcrumbs={[
          { label: "CRM", path: "/crm" },
          { label: "العملاء المحتملين" },
        ]}
        extra={
          <Space>
            <Link to="/crm/opportunities">
              <Button>الفرص</Button>
            </Link>
            <Button type="primary" icon={<PlusOutlined />} onClick={() => setModalOpen(true)}>
              إضافة عميل محتمل
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
                title="جديد"
                value={stats.new}
                valueStyle={{ color: "#1d4ed8" }}
                prefix={<UserOutlined />}
              />
            </Card>
          </Col>
          <Col xs={12} sm={6}>
            <Card>
              <Statistic
                title="مؤهل"
                value={stats.qualified}
                valueStyle={{ color: "#15803d" }}
              />
            </Card>
          </Col>
          <Col xs={12} sm={6}>
            <Card>
              <Statistic
                title="محول"
                value={stats.converted}
                valueStyle={{ color: "#7c3aed" }}
              />
            </Card>
          </Col>
          <Col xs={12} sm={6}>
            <Card>
              <Statistic
                title="خسارة"
                value={stats.lost}
                valueStyle={{ color: "#b91c1c" }}
              />
            </Card>
          </Col>
        </Row>
      )}

      {/* Filters */}
      <Card style={{ marginBottom: 16 }}>
        <Space wrap>
          <Input
            placeholder="بحث..."
            prefix={<SearchOutlined />}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ width: 250 }}
            allowClear
          />
          <Select
            placeholder="جميع الحالات"
            value={statusFilter || undefined}
            onChange={(value) => setStatusFilter(value || "")}
            style={{ width: 150 }}
            allowClear
            options={[
              { value: "new", label: "جديد" },
              { value: "contacted", label: "تم التواصل" },
              { value: "qualified", label: "مؤهل" },
              { value: "converted", label: "محول" },
              { value: "lost", label: "خسارة" },
            ]}
          />
        </Space>
      </Card>

      {/* Data Table */}
      <Card>
        {loading ? (
          <LoadingSkeleton />
        ) : filteredData.length === 0 ? (
          <Empty description="لا يوجد عملاء محتملين" image={Empty.PRESENTED_IMAGE_SIMPLE} />
        ) : (
          <Table
            columns={columns}
            dataSource={filteredData}
            rowKey="id"
            pagination={{ pageSize: 10, showSizeChanger: true, showTotal: (total) => `${total} عميل` }}
          />
        )}
      </Card>

      {/* Add Lead Modal */}
      <Modal
        title="إضافة عميل محتمل جديد"
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        footer={null}
        width={600}
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="name" label="الاسم" rules={[{ required: true, message: "الاسم مطلوب" }]}>
                <Input />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="company" label="الشركة">
                <Input />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="email" label="البريد" rules={[{ type: "email", message: "بريد غير صالح" }]}>
                <Input />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="phone" label="الهاتف">
                <Input />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="source" label="المصدر">
                <Select placeholder="اختر المصدر" allowClear>
                  <Select.Option value="website">الموقع</Select.Option>
                  <Select.Option value="referral">إحالة</Select.Option>
                  <Select.Option value="social">وسائل التواصل</Select.Option>
                  <Select.Option value="cold_call">اتصال مباشر</Select.Option>
                  <Select.Option value="event">فعالية</Select.Option>
                  <Select.Option value="other">أخرى</Select.Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="priority" label="الأولوية" initialValue="medium">
                <Select>
                  <Select.Option value="low">منخفض</Select.Option>
                  <Select.Option value="medium">متوسط</Select.Option>
                  <Select.Option value="high">عالي</Select.Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={24}>
              <Form.Item name="estimatedValue" label="القيمة المتوقعة">
                <Input type="number" placeholder="0" suffix="IQD" />
              </Form.Item>
            </Col>
          </Row>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 16 }}>
            <Button onClick={() => setModalOpen(false)}>إلغاء</Button>
            <Button type="primary" htmlType="submit" loading={submitting}>
              حفظ
            </Button>
          </div>
        </Form>
      </Modal>
    </div>
  );
}
