/**
 * إدارة المصروفات
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
  Tabs,
  DatePicker,
  InputNumber,
} from "antd";
import {
  PlusOutlined,
  DollarOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  CreditCardOutlined,
  WalletOutlined,
  ShoppingOutlined,
  RocketOutlined,
  DesktopOutlined,
  SoundOutlined,
  BookOutlined,
  FileTextOutlined,
} from "@ant-design/icons";
import { PageHeader, StatusTag, MoneyDisplay, DateDisplay, LoadingSkeleton } from "../components/shared";
import { API_BASE, getAuthHeaders } from "../utils/api";
import type { ColumnsType } from "antd/es/table";

interface Expense {
  id: string;
  requestNumber: string;
  title: string;
  category: string;
  amount: string;
  currency: string;
  status: string;
  expenseDate: string | null;
  vendorName: string | null;
  createdAt: string;
}

interface Advance {
  id: string;
  advanceNumber: string;
  purpose: string;
  amount: string;
  remainingAmount: string | null;
  status: string;
  createdAt: string;
}

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  draft: { label: "مسودة", color: "default" },
  submitted: { label: "مُقدم", color: "processing" },
  pending_approval: { label: "بانتظار الموافقة", color: "warning" },
  approved: { label: "موافق عليه", color: "success" },
  rejected: { label: "مرفوض", color: "error" },
  paid: { label: "تم الدفع", color: "purple" },
  cancelled: { label: "ملغي", color: "default" },
};

const ADVANCE_STATUS: Record<string, { label: string; color: string }> = {
  pending: { label: "معلقة", color: "warning" },
  approved: { label: "موافق عليها", color: "processing" },
  disbursed: { label: "مصروفة", color: "purple" },
  settled: { label: "مسواة", color: "success" },
  cancelled: { label: "ملغاة", color: "error" },
};

const CATEGORY_CONFIG: Record<string, { label: string; icon: React.ReactNode }> = {
  operational: { label: "تشغيلية", icon: <ShoppingOutlined /> },
  travel: { label: "سفر", icon: <RocketOutlined /> },
  equipment: { label: "معدات", icon: <DesktopOutlined /> },
  marketing: { label: "تسويق", icon: <SoundOutlined /> },
  training: { label: "تدريب", icon: <BookOutlined /> },
  other: { label: "أخرى", icon: <FileTextOutlined /> },
};

export default function ExpenseManagement() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [advances, setAdvances] = useState<Advance[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<string>("expenses");
  const [filter, setFilter] = useState({ status: "", category: "" });
  const [showModal, setShowModal] = useState(false);
  const [form] = Form.useForm();

  useEffect(() => {
    loadData();
  }, [activeTab, filter]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [statsRes] = await Promise.all([fetch(`${API_BASE}/api/expenses/stats`)]);
      if (statsRes.ok) setStats(await statsRes.json());

      if (activeTab === "expenses") {
        const params = new URLSearchParams();
        if (filter.status) params.append("status", filter.status);
        if (filter.category) params.append("category", filter.category);
        const res = await fetch(`${API_BASE}/api/expenses/requests?${params}`);
        if (res.ok) setExpenses((await res.json()).expenses || []);
      } else {
        const res = await fetch(`${API_BASE}/api/expenses/advances`);
        if (res.ok) setAdvances(await res.json());
      }
    } catch (error) {
      console.error(error);
      message.error("حدث خطأ في تحميل البيانات");
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (values: any) => {
    try {
      const payload = {
        title: values.title,
        description: values.description,
        category: values.category,
        amount: values.amount,
        vendorName: values.vendorName,
        expenseDate: values.expenseDate?.format("YYYY-MM-DD"),
        requesterId: "current_user",
      };
      const res = await fetch(`${API_BASE}/api/expenses/requests`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        message.success("تم إنشاء طلب المصروف بنجاح");
        setShowModal(false);
        form.resetFields();
        loadData();
      } else {
        message.error("فشل في إنشاء الطلب");
      }
    } catch (error) {
      console.error(error);
      message.error("حدث خطأ");
    }
  };

  const submitExpense = async (id: string) => {
    try {
      await fetch(`${API_BASE}/api/expenses/requests/${id}/submit`, { method: "POST" });
      message.success("تم تقديم الطلب");
      loadData();
    } catch (error) {
      console.error(error);
      message.error("حدث خطأ");
    }
  };

  const approveExpense = async (id: string) => {
    try {
      await fetch(`${API_BASE}/api/expenses/requests/${id}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ approverId: "current_user" }),
      });
      message.success("تمت الموافقة على الطلب");
      loadData();
    } catch (error) {
      console.error(error);
      message.error("حدث خطأ");
    }
  };

  const rejectExpense = async (id: string) => {
    Modal.confirm({
      title: "رفض الطلب",
      content: (
        <Input.TextArea
          id="reject-reason"
          placeholder="سبب الرفض"
          rows={3}
        />
      ),
      okText: "رفض",
      cancelText: "إلغاء",
      okButtonProps: { danger: true },
      onOk: async () => {
        const reason = (document.getElementById("reject-reason") as HTMLTextAreaElement)?.value;
        if (!reason) {
          message.warning("يرجى إدخال سبب الرفض");
          return Promise.reject();
        }
        try {
          await fetch(`${API_BASE}/api/expenses/requests/${id}/reject`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ approverId: "current_user", reason }),
          });
          message.success("تم رفض الطلب");
          loadData();
        } catch (error) {
          console.error(error);
          message.error("حدث خطأ");
        }
      },
    });
  };

  const payExpense = async (id: string) => {
    try {
      await fetch(`${API_BASE}/api/expenses/requests/${id}/pay`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentMethod: "bank_transfer" }),
      });
      message.success("تم الدفع بنجاح");
      loadData();
    } catch (error) {
      console.error(error);
      message.error("حدث خطأ");
    }
  };

  const expenseColumns: ColumnsType<Expense> = [
    {
      title: "رقم الطلب",
      dataIndex: "requestNumber",
      key: "requestNumber",
      width: 120,
      render: (text) => <span style={{ fontFamily: "monospace" }}>{text}</span>,
    },
    {
      title: "العنوان",
      dataIndex: "title",
      key: "title",
      render: (text, record) => (
        <div>
          <div style={{ fontWeight: 500 }}>{text}</div>
          <div style={{ fontSize: 12, color: "#6b7280" }}>
            {record.vendorName && <span>{record.vendorName} • </span>}
            {record.expenseDate && <DateDisplay date={record.expenseDate} />}
          </div>
        </div>
      ),
    },
    {
      title: "الفئة",
      dataIndex: "category",
      key: "category",
      width: 120,
      render: (category) => {
        const config = CATEGORY_CONFIG[category] || CATEGORY_CONFIG.other;
        return (
          <Space>
            {config.icon}
            <span>{config.label}</span>
          </Space>
        );
      },
    },
    {
      title: "المبلغ",
      dataIndex: "amount",
      key: "amount",
      width: 140,
      render: (amount, record) => (
        <span style={{ fontWeight: 600, color: "#059669" }}>
          <MoneyDisplay amount={amount} currency={record.currency === "IQD" ? "د.ع" : record.currency} />
        </span>
      ),
    },
    {
      title: "الحالة",
      dataIndex: "status",
      key: "status",
      width: 140,
      render: (status) => {
        const config = STATUS_CONFIG[status] || STATUS_CONFIG.draft;
        return <Tag color={config.color}>{config.label}</Tag>;
      },
    },
    {
      title: "الإجراءات",
      key: "actions",
      width: 180,
      render: (_, record) => (
        <Space size="small">
          {record.status === "draft" && (
            <Button type="link" size="small" onClick={() => submitExpense(record.id)}>
              تقديم
            </Button>
          )}
          {(record.status === "submitted" || record.status === "pending_approval") && (
            <>
              <Button type="link" size="small" onClick={() => approveExpense(record.id)}>
                موافقة
              </Button>
              <Button type="link" size="small" danger onClick={() => rejectExpense(record.id)}>
                رفض
              </Button>
            </>
          )}
          {record.status === "approved" && (
            <Button type="link" size="small" onClick={() => payExpense(record.id)}>
              دفع
            </Button>
          )}
        </Space>
      ),
    },
  ];

  const advanceColumns: ColumnsType<Advance> = [
    {
      title: "رقم السلفة",
      dataIndex: "advanceNumber",
      key: "advanceNumber",
      width: 120,
      render: (text) => <span style={{ fontFamily: "monospace" }}>{text}</span>,
    },
    {
      title: "الغرض",
      dataIndex: "purpose",
      key: "purpose",
    },
    {
      title: "المبلغ",
      dataIndex: "amount",
      key: "amount",
      width: 140,
      render: (amount) => (
        <span style={{ fontWeight: 600 }}>
          <MoneyDisplay amount={amount} currency="د.ع" />
        </span>
      ),
    },
    {
      title: "المتبقي",
      key: "remaining",
      width: 140,
      render: (_, record) => {
        const remaining = Number(record.remainingAmount || record.amount);
        return record.status === "disbursed" && remaining > 0 ? (
          <span style={{ color: "#dc2626" }}>
            <MoneyDisplay amount={remaining.toString()} currency="د.ع" />
          </span>
        ) : (
          "-"
        );
      },
    },
    {
      title: "الحالة",
      dataIndex: "status",
      key: "status",
      width: 120,
      render: (status) => {
        const config = ADVANCE_STATUS[status] || ADVANCE_STATUS.pending;
        return <Tag color={config.color}>{config.label}</Tag>;
      },
    },
  ];

  const breadcrumbs = [
    { title: "الرئيسية", path: "/" },
    { title: "إدارة المصروفات" },
  ];

  if (loading && !stats) {
    return <LoadingSkeleton />;
  }

  return (
    <div>
      <PageHeader
        title="إدارة المصروفات"
        subtitle="طلبات المصروفات والسلف والموافقات"
        breadcrumbs={breadcrumbs}
        icon={<DollarOutlined />}
        extra={
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setShowModal(true)}>
            طلب مصروف
          </Button>
        }
      />

      {/* الإحصائيات */}
      {stats && (
        <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
          <Col xs={12} sm={8} md={4}>
            <Card size="small">
              <Statistic
                title="إجمالي الطلبات"
                value={stats.totalRequests}
                valueStyle={{ fontSize: 24 }}
              />
            </Card>
          </Col>
          <Col xs={12} sm={8} md={4}>
            <Card size="small" style={{ background: "#fef3c7" }}>
              <Statistic
                title="معلقة"
                value={stats.pendingRequests}
                valueStyle={{ fontSize: 24, color: "#d97706" }}
                prefix={<ClockCircleOutlined />}
              />
            </Card>
          </Col>
          <Col xs={12} sm={8} md={4}>
            <Card size="small" style={{ background: "#d1fae5" }}>
              <Statistic
                title="موافق عليها"
                value={stats.approvedRequests}
                valueStyle={{ fontSize: 24, color: "#059669" }}
                prefix={<CheckCircleOutlined />}
              />
            </Card>
          </Col>
          <Col xs={12} sm={8} md={4}>
            <Card size="small" style={{ background: "#ede9fe" }}>
              <Statistic
                title="مدفوعة"
                value={stats.paidRequests}
                valueStyle={{ fontSize: 24, color: "#7c3aed" }}
                prefix={<CreditCardOutlined />}
              />
            </Card>
          </Col>
          <Col xs={12} sm={8} md={4}>
            <Card size="small" style={{ background: "#dbeafe" }}>
              <Statistic
                title="المدفوع (د.ع)"
                value={Number(stats.totalPaidAmount || 0).toLocaleString()}
                valueStyle={{ fontSize: 20, color: "#2563eb" }}
              />
            </Card>
          </Col>
          <Col xs={12} sm={8} md={4}>
            <Card size="small" style={{ background: "#fee2e2" }}>
              <Statistic
                title="سلف نشطة"
                value={stats.activeAdvances}
                valueStyle={{ fontSize: 24, color: "#dc2626" }}
                prefix={<WalletOutlined />}
              />
            </Card>
          </Col>
        </Row>
      )}

      {/* التبويبات والمحتوى */}
      <Card>
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          items={[
            {
              key: "expenses",
              label: (
                <span>
                  <DollarOutlined /> المصروفات
                </span>
              ),
              children: (
                <>
                  {/* الفلاتر */}
                  <Row gutter={16} style={{ marginBottom: 16 }}>
                    <Col xs={24} sm={12} md={6}>
                      <Select
                        style={{ width: "100%" }}
                        placeholder="كل الحالات"
                        allowClear
                        value={filter.status || undefined}
                        onChange={(value) => setFilter({ ...filter, status: value || "" })}
                        options={Object.entries(STATUS_CONFIG).map(([k, v]) => ({
                          value: k,
                          label: v.label,
                        }))}
                      />
                    </Col>
                    <Col xs={24} sm={12} md={6}>
                      <Select
                        style={{ width: "100%" }}
                        placeholder="كل الفئات"
                        allowClear
                        value={filter.category || undefined}
                        onChange={(value) => setFilter({ ...filter, category: value || "" })}
                        options={Object.entries(CATEGORY_CONFIG).map(([k, v]) => ({
                          value: k,
                          label: (
                            <Space>
                              {v.icon}
                              {v.label}
                            </Space>
                          ),
                        }))}
                      />
                    </Col>
                  </Row>

                  {expenses.length === 0 ? (
                    <Empty
                      image={<DollarOutlined style={{ fontSize: 64, color: "#d9d9d9" }} />}
                      description="لا توجد طلبات مصروفات"
                    />
                  ) : (
                    <Table
                      dataSource={expenses}
                      columns={expenseColumns}
                      rowKey="id"
                      loading={loading}
                      pagination={{ pageSize: 10 }}
                    />
                  )}
                </>
              ),
            },
            {
              key: "advances",
              label: (
                <span>
                  <WalletOutlined /> السلف
                </span>
              ),
              children: advances.length === 0 ? (
                <Empty
                  image={<WalletOutlined style={{ fontSize: 64, color: "#d9d9d9" }} />}
                  description="لا توجد سلف"
                />
              ) : (
                <Table
                  dataSource={advances}
                  columns={advanceColumns}
                  rowKey="id"
                  loading={loading}
                  pagination={{ pageSize: 10 }}
                />
              ),
            },
          ]}
        />
      </Card>

      {/* موديل إضافة */}
      <Modal
        title="طلب مصروف جديد"
        open={showModal}
        onCancel={() => setShowModal(false)}
        footer={null}
        width={550}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleCreate}
          initialValues={{
            category: "operational",
            expenseDate: null,
          }}
        >
          <Form.Item
            name="title"
            label="العنوان"
            rules={[{ required: true, message: "العنوان مطلوب" }]}
          >
            <Input placeholder="أدخل عنوان المصروف" />
          </Form.Item>

          <Form.Item name="description" label="الوصف">
            <Input.TextArea rows={2} placeholder="وصف تفصيلي (اختياري)" />
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="amount"
                label="المبلغ"
                rules={[{ required: true, message: "المبلغ مطلوب" }]}
              >
                <InputNumber
                  style={{ width: "100%" }}
                  min={0}
                  formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")}
                  parser={(value) => value!.replace(/\$\s?|(,*)/g, "")}
                  placeholder="0"
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="category" label="الفئة">
                <Select
                  options={Object.entries(CATEGORY_CONFIG).map(([k, v]) => ({
                    value: k,
                    label: (
                      <Space>
                        {v.icon}
                        {v.label}
                      </Space>
                    ),
                  }))}
                />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="vendorName" label="المورد/البائع">
                <Input placeholder="اسم المورد (اختياري)" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="expenseDate" label="تاريخ المصروف">
                <DatePicker style={{ width: "100%" }} placeholder="اختر التاريخ" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item style={{ marginBottom: 0, marginTop: 24 }}>
            <Space style={{ width: "100%", justifyContent: "flex-end" }}>
              <Button onClick={() => setShowModal(false)}>إلغاء</Button>
              <Button type="primary" htmlType="submit">
                إنشاء
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
