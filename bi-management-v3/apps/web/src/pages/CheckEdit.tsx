import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Row,
  Col,
  Card,
  Form,
  Input,
  Select,
  Button,
  InputNumber,
  DatePicker,
  message,
  Space,
  Tag,
} from "antd";
import { SaveOutlined, ArrowRightOutlined } from "@ant-design/icons";
import { PageHeader, LoadingSkeleton } from "../components/shared";
import { API_BASE, getAuthHeaders } from "../utils/api";
import dayjs from "dayjs";

type Customer = {
  id: string;
  nameAr: string;
  code: string;
};

type Supplier = {
  id: string;
  nameAr: string;
  code: string;
};

type BankAccount = {
  id: string;
  accountName: string;
  bankName: string;
};

const TYPE_CONFIG: Record<string, { label: string; color: string; bg: string; partyLabel: string }> = {
  incoming: { label: "شيك وارد", color: "#1d4ed8", bg: "#dbeafe", partyLabel: "من العميل" },
  outgoing: { label: "شيك صادر", color: "#b45309", bg: "#fef3c7", partyLabel: "إلى المورد" },
};

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  pending: { label: "معلق", color: "#64748b", bg: "#f1f5f9" },
  deposited: { label: "مودع", color: "#1d4ed8", bg: "#dbeafe" },
  cleared: { label: "صُرف", color: "#15803d", bg: "#dcfce7" },
  bounced: { label: "مرتجع", color: "#b91c1c", bg: "#fee2e2" },
  cancelled: { label: "ملغي", color: "#94a3b8", bg: "#f1f5f9" },
};

export default function CheckEdit() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const [type, setType] = useState("incoming");
  const [status, setStatus] = useState("pending");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);

  useEffect(() => {
    document.title = "تعديل شيك | BI Management v3";
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [checkRes, customersRes, suppliersRes, bankRes] = await Promise.all([
          fetch(`${API_BASE}/api/checks/${id}`, { headers: getAuthHeaders() }),
          fetch(`${API_BASE}/api/customers?limit=200`, { headers: getAuthHeaders() }),
          fetch(`${API_BASE}/api/suppliers?limit=200`, { headers: getAuthHeaders() }),
          fetch(`${API_BASE}/api/bank-accounts?limit=50`, { headers: getAuthHeaders() }),
        ]);

        if (!checkRes.ok) throw new Error("فشل تحميل الشيك");

        const [data, customersData, suppliersData, bankData] = await Promise.all([
          checkRes.json(),
          customersRes.json(),
          suppliersRes.json(),
          bankRes.json(),
        ]);

        setType(data.type || "incoming");
        setStatus(data.status || "pending");

        form.setFieldsValue({
          checkNumber: data.checkNumber || "",
          type: data.type || "incoming",
          amount: data.amount || undefined,
          bankName: data.bankName || "",
          accountNumber: data.accountNumber || "",
          issueDate: data.issueDate ? dayjs(data.issueDate) : undefined,
          dueDate: data.dueDate ? dayjs(data.dueDate) : undefined,
          depositDate: data.depositDate ? dayjs(data.depositDate) : undefined,
          clearDate: data.clearDate ? dayjs(data.clearDate) : undefined,
          payee: data.payee || "",
          drawer: data.drawer || "",
          customerId: data.customerId || undefined,
          supplierId: data.supplierId || undefined,
          bankAccountId: data.bankAccountId || undefined,
          status: data.status || "pending",
          description: data.description || data.notes || "",
        });

        setCustomers(customersData.data || []);
        setSuppliers(suppliersData.data || []);
        setBankAccounts(bankData.data || []);
      } catch (err) {
        message.error(err instanceof Error ? err.message : "فشل التحميل");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id, form]);

  const handleSubmit = async (values: Record<string, unknown>) => {
    setSubmitting(true);
    try {
      const res = await fetch(`${API_BASE}/api/checks/${id}`, {
        method: "PUT",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          checkNumber: (values.checkNumber as string).trim(),
          type: values.type,
          amount: values.amount,
          bankName: (values.bankName as string)?.trim() || null,
          accountNumber: (values.accountNumber as string)?.trim() || null,
          issueDate: values.issueDate ? (values.issueDate as dayjs.Dayjs).format("YYYY-MM-DD") : null,
          dueDate: values.dueDate ? (values.dueDate as dayjs.Dayjs).format("YYYY-MM-DD") : null,
          depositDate: values.depositDate ? (values.depositDate as dayjs.Dayjs).format("YYYY-MM-DD") : null,
          clearDate: values.clearDate ? (values.clearDate as dayjs.Dayjs).format("YYYY-MM-DD") : null,
          payee: (values.payee as string)?.trim() || null,
          drawer: (values.drawer as string)?.trim() || null,
          customerId: values.customerId || null,
          supplierId: values.supplierId || null,
          bankAccountId: values.bankAccountId || null,
          status: values.status,
          description: (values.description as string)?.trim() || null,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "فشل تحديث الشيك");
      }

      message.success("تم تحديث الشيك بنجاح");
      navigate(`/checks/${id}`);
    } catch (err: unknown) {
      message.error(err instanceof Error ? err.message : "حدث خطأ");
    } finally {
      setSubmitting(false);
    }
  };

  const typeConfig = TYPE_CONFIG[type];
  const statusConfig = STATUS_CONFIG[status] || STATUS_CONFIG.pending;
  const checkNumber = Form.useWatch("checkNumber", form);
  const amount = Form.useWatch("amount", form);
  const dueDate = Form.useWatch("dueDate", form);

  if (loading) {
    return <LoadingSkeleton />;
  }

  return (
    <div>
      <PageHeader
        title="تعديل الشيك"
        subtitle={checkNumber ? `رقم الشيك: ${checkNumber}` : undefined}
        breadcrumbs={[
          { label: "الرئيسية", path: "/" },
          { label: "الشيكات", path: "/checks" },
          { label: "تعديل الشيك" },
        ]}
        extra={
          <Space>
            <Tag style={{ background: typeConfig.bg, color: typeConfig.color, border: "none", fontWeight: 600 }}>
              {typeConfig.label}
            </Tag>
            <Tag style={{ background: statusConfig.bg, color: statusConfig.color, border: "none", fontWeight: 600 }}>
              {statusConfig.label}
            </Tag>
            <Button icon={<ArrowRightOutlined />} onClick={() => navigate(`/checks/${id}`)}>
              العودة للشيك
            </Button>
          </Space>
        }
      />

      <Form form={form} layout="vertical" onFinish={handleSubmit}>
        <Row gutter={24}>
          <Col xs={24} lg={12}>
            <Card title="معلومات الشيك" style={{ marginBottom: 24 }}>
              <Form.Item name="type" label="نوع الشيك" rules={[{ required: true }]}>
                <Select onChange={(value) => setType(value)}>
                  {Object.entries(TYPE_CONFIG).map(([key, config]) => (
                    <Select.Option key={key} value={key}>
                      {config.label}
                    </Select.Option>
                  ))}
                </Select>
              </Form.Item>

              <Row gutter={16}>
                <Col xs={24} md={12}>
                  <Form.Item
                    name="checkNumber"
                    label="رقم الشيك"
                    rules={[{ required: true, message: "يرجى إدخال رقم الشيك" }]}
                  >
                    <Input placeholder="أدخل رقم الشيك" />
                  </Form.Item>
                </Col>
                <Col xs={24} md={12}>
                  <Form.Item
                    name="amount"
                    label="المبلغ"
                    rules={[{ required: true, message: "يرجى إدخال المبلغ" }]}
                  >
                    <InputNumber
                      placeholder="أدخل المبلغ"
                      min={0}
                      step={0.01}
                      style={{ width: "100%", fontWeight: 600 }}
                      formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")}
                    />
                  </Form.Item>
                </Col>
              </Row>

              <Row gutter={16}>
                <Col xs={24} md={12}>
                  <Form.Item name="bankName" label="اسم البنك">
                    <Input placeholder="أدخل اسم البنك" />
                  </Form.Item>
                </Col>
                <Col xs={24} md={12}>
                  <Form.Item name="accountNumber" label="رقم الحساب">
                    <Input placeholder="أدخل رقم الحساب" />
                  </Form.Item>
                </Col>
              </Row>

              <Form.Item
                name="status"
                label="الحالة"
                rules={[{ required: true }]}
              >
                <Select onChange={(value) => setStatus(value)}>
                  {Object.entries(STATUS_CONFIG).map(([key, config]) => (
                    <Select.Option key={key} value={key}>
                      <Tag style={{ background: config.bg, color: config.color, border: "none" }}>
                        {config.label}
                      </Tag>
                    </Select.Option>
                  ))}
                </Select>
              </Form.Item>
            </Card>
          </Col>

          <Col xs={24} lg={12}>
            <Card title="التواريخ والأطراف" style={{ marginBottom: 24 }}>
              <Row gutter={16}>
                <Col xs={24} md={12}>
                  <Form.Item name="issueDate" label="تاريخ الإصدار">
                    <DatePicker style={{ width: "100%" }} placeholder="اختر التاريخ" />
                  </Form.Item>
                </Col>
                <Col xs={24} md={12}>
                  <Form.Item
                    name="dueDate"
                    label="تاريخ الاستحقاق"
                    rules={[{ required: true, message: "يرجى إدخال تاريخ الاستحقاق" }]}
                  >
                    <DatePicker style={{ width: "100%" }} placeholder="اختر التاريخ" />
                  </Form.Item>
                </Col>
              </Row>

              {(status === "deposited" || status === "cleared") && (
                <Row gutter={16}>
                  <Col xs={24} md={12}>
                    <Form.Item name="depositDate" label="تاريخ الإيداع">
                      <DatePicker style={{ width: "100%" }} placeholder="اختر التاريخ" />
                    </Form.Item>
                  </Col>
                  {status === "cleared" && (
                    <Col xs={24} md={12}>
                      <Form.Item name="clearDate" label="تاريخ الصرف">
                        <DatePicker style={{ width: "100%" }} placeholder="اختر التاريخ" />
                      </Form.Item>
                    </Col>
                  )}
                </Row>
              )}

              <Row gutter={16}>
                <Col xs={24} md={12}>
                  <Form.Item name="payee" label="المستفيد">
                    <Input placeholder="أدخل اسم المستفيد" />
                  </Form.Item>
                </Col>
                <Col xs={24} md={12}>
                  <Form.Item name="drawer" label="الساحب">
                    <Input placeholder="أدخل اسم الساحب" />
                  </Form.Item>
                </Col>
              </Row>

              {type === "incoming" && customers.length > 0 && (
                <Form.Item name="customerId" label={typeConfig.partyLabel}>
                  <Select placeholder="اختر العميل" allowClear>
                    {customers.map((c) => (
                      <Select.Option key={c.id} value={c.id}>
                        {c.nameAr} ({c.code})
                      </Select.Option>
                    ))}
                  </Select>
                </Form.Item>
              )}

              {type === "outgoing" && suppliers.length > 0 && (
                <Form.Item name="supplierId" label={typeConfig.partyLabel}>
                  <Select placeholder="اختر المورد" allowClear>
                    {suppliers.map((s) => (
                      <Select.Option key={s.id} value={s.id}>
                        {s.nameAr} ({s.code})
                      </Select.Option>
                    ))}
                  </Select>
                </Form.Item>
              )}

              {bankAccounts.length > 0 && (
                <Form.Item name="bankAccountId" label="الحساب البنكي المرتبط">
                  <Select placeholder="اختر الحساب" allowClear>
                    {bankAccounts.map((ba) => (
                      <Select.Option key={ba.id} value={ba.id}>
                        {ba.accountName} - {ba.bankName}
                      </Select.Option>
                    ))}
                  </Select>
                </Form.Item>
              )}

              <Form.Item name="description" label="الوصف / ملاحظات">
                <Input.TextArea rows={3} placeholder="أضف ملاحظات..." />
              </Form.Item>
            </Card>
          </Col>
        </Row>

        {/* Preview Card */}
        {amount && amount > 0 && checkNumber && (
          <Card
            style={{
              marginBottom: 24,
              background: typeConfig.bg,
              border: `2px solid ${typeConfig.color}30`,
            }}
            bodyStyle={{ padding: "20px 24px" }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
                gap: 16,
              }}
            >
              <div>
                <Space style={{ marginBottom: 8 }}>
                  <span style={{ fontSize: "0.9rem", color: typeConfig.color, fontWeight: 600 }}>
                    {typeConfig.label}
                  </span>
                  <Tag style={{ background: statusConfig.bg, color: statusConfig.color, border: "none" }}>
                    {statusConfig.label}
                  </Tag>
                </Space>
                <div style={{ fontSize: "1rem", color: "#64748b" }}>شيك رقم: {checkNumber}</div>
                {dueDate && (
                  <div style={{ fontSize: "0.875rem", color: "#94a3b8", marginTop: 4 }}>
                    يستحق: {dueDate.format("YYYY/MM/DD")}
                  </div>
                )}
              </div>
              <div style={{ textAlign: "left" }}>
                <div style={{ fontSize: "2rem", fontWeight: 700, color: typeConfig.color }}>
                  {Number(amount).toLocaleString()} IQD
                </div>
              </div>
            </div>
          </Card>
        )}

        <Space>
          <Button onClick={() => navigate(`/checks/${id}`)}>إلغاء</Button>
          <Button
            type="primary"
            htmlType="submit"
            loading={submitting}
            icon={<SaveOutlined />}
            style={{
              background: `linear-gradient(135deg, ${typeConfig.color} 0%, ${typeConfig.color}dd 100%)`,
              borderColor: typeConfig.color,
            }}
          >
            حفظ التعديلات
          </Button>
        </Space>
      </Form>
    </div>
  );
}
