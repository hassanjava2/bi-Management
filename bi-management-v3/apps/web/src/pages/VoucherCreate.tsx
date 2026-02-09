import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Row, Col, Card, Form, Input, Select, Button, InputNumber, message, Space } from "antd";
import { SaveOutlined } from "@ant-design/icons";
import { PageHeader, MoneyDisplay } from "../components/shared";
import { API_BASE, getAuthHeaders } from "../utils/api";

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

type CashRegister = {
  id: string;
  name: string;
};

type BankAccount = {
  id: string;
  accountName: string;
  bankName: string;
};

const TYPE_CONFIG: Record<string, { label: string; color: string; bg: string; icon: string }> = {
  receipt: { label: "سند قبض", color: "#15803d", bg: "#dcfce7", icon: "📥" },
  payment: { label: "سند صرف", color: "#b91c1c", bg: "#fee2e2", icon: "📤" },
  transfer: { label: "سند تحويل", color: "#1d4ed8", bg: "#dbeafe", icon: "🔄" },
};

export default function VoucherCreate() {
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const [type, setType] = useState("receipt");
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [amount, setAmount] = useState<number | null>(null);
  const [currency, setCurrency] = useState("IQD");
  const [submitting, setSubmitting] = useState(false);

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [cashRegisters, setCashRegisters] = useState<CashRegister[]>([]);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);

  useEffect(() => {
    document.title = "إنشاء سند | BI Management v3";

    Promise.all([
      fetch(`${API_BASE}/api/customers?limit=200`, { headers: getAuthHeaders() }).then((r) => r.json()),
      fetch(`${API_BASE}/api/suppliers?limit=200`, { headers: getAuthHeaders() }).then((r) => r.json()),
      fetch(`${API_BASE}/api/cash-registers?limit=50`, { headers: getAuthHeaders() }).then((r) => r.json()),
      fetch(`${API_BASE}/api/bank-accounts?limit=50`, { headers: getAuthHeaders() }).then((r) => r.json()),
    ])
      .then(([customersRes, suppliersRes, cashRes, bankRes]) => {
        setCustomers(customersRes.data || []);
        setSuppliers(suppliersRes.data || []);
        setCashRegisters(cashRes.data || []);
        setBankAccounts(bankRes.data || []);
      })
      .catch(() => {});
  }, []);

  const handleSubmit = async (values: Record<string, unknown>) => {
    const amountNum = values.amount as number;
    if (!amountNum || amountNum <= 0) {
      message.error("يرجى إدخال مبلغ صحيح");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`${API_BASE}/api/vouchers`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          type,
          amount: amountNum,
          currency: values.currency,
          paymentMethod: values.paymentMethod,
          description: (values.description as string)?.trim() || null,
          notes: (values.notes as string)?.trim() || null,
          customerId: values.customerId || null,
          supplierId: values.supplierId || null,
          cashRegisterId: values.cashRegisterId || null,
          bankAccountId: values.bankAccountId || null,
          referenceNumber: (values.referenceNumber as string)?.trim() || null,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "فشل إنشاء السند");
      }

      const created = await res.json();
      message.success("تم إنشاء السند بنجاح");
      navigate(`/vouchers/${created.id}`);
    } catch (err: unknown) {
      message.error(err instanceof Error ? err.message : "حدث خطأ");
    } finally {
      setSubmitting(false);
    }
  };

  const typeConfig = TYPE_CONFIG[type];

  const breadcrumbs = [
    { label: "الرئيسية", href: "/" },
    { label: "السندات", href: "/vouchers" },
    { label: "إنشاء سند" },
  ];

  return (
    <div>
      <PageHeader
        title="إنشاء سند جديد"
        breadcrumbs={breadcrumbs}
        extra={
          <span
            style={{
              padding: "0.5rem 1rem",
              background: typeConfig.bg,
              color: typeConfig.color,
              borderRadius: "8px",
              fontWeight: 600,
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
            }}
          >
            <span>{typeConfig.icon}</span>
            {typeConfig.label}
          </span>
        }
      />

      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        initialValues={{
          type: "receipt",
          currency: "IQD",
          paymentMethod: "cash",
        }}
      >
        <Row gutter={24}>
          {/* Voucher Info */}
          <Col xs={24} lg={12}>
            <Card title="معلومات السند" style={{ marginBottom: 24 }}>
              <Form.Item label="نوع السند" required>
                <Space style={{ width: "100%", display: "flex" }}>
                  {Object.entries(TYPE_CONFIG).map(([key, config]) => (
                    <Button
                      key={key}
                      type={type === key ? "primary" : "default"}
                      onClick={() => setType(key)}
                      style={{
                        flex: 1,
                        background: type === key ? config.color : undefined,
                        borderColor: type === key ? config.color : undefined,
                      }}
                    >
                      <span>{config.icon}</span> {config.label}
                    </Button>
                  ))}
                </Space>
              </Form.Item>

              <Row gutter={16}>
                <Col xs={24} sm={16}>
                  <Form.Item
                    name="amount"
                    label="المبلغ"
                    rules={[{ required: true, message: "يرجى إدخال المبلغ" }]}
                  >
                    <InputNumber
                      min={0}
                      step={0.01}
                      style={{ width: "100%", fontSize: "1.1rem" }}
                      placeholder="أدخل المبلغ"
                      onChange={(value) => setAmount(value)}
                    />
                  </Form.Item>
                </Col>
                <Col xs={24} sm={8}>
                  <Form.Item name="currency" label="العملة">
                    <Select
                      onChange={(value) => setCurrency(value)}
                      options={[
                        { label: "IQD", value: "IQD" },
                        { label: "USD", value: "USD" },
                      ]}
                    />
                  </Form.Item>
                </Col>
              </Row>

              <Form.Item name="paymentMethod" label="طريقة الدفع">
                <Select
                  onChange={(value) => setPaymentMethod(value)}
                  options={[
                    { label: "نقدي", value: "cash" },
                    { label: "تحويل بنكي", value: "bank_transfer" },
                    { label: "شيك", value: "check" },
                    { label: "بطاقة ائتمان", value: "credit_card" },
                  ]}
                />
              </Form.Item>

              <Form.Item name="referenceNumber" label="رقم المرجع">
                <Input placeholder="رقم مرجعي اختياري" />
              </Form.Item>
            </Card>
          </Col>

          {/* Party & Destination */}
          <Col xs={24} lg={12}>
            <Card title="الأطراف" style={{ marginBottom: 24 }}>
              {type === "receipt" && (
                <Form.Item name="customerId" label="من العميل">
                  <Select
                    placeholder="-- اختر العميل --"
                    allowClear
                    showSearch
                    optionFilterProp="label"
                    options={customers.map((c) => ({
                      label: `${c.nameAr} (${c.code})`,
                      value: c.id,
                    }))}
                  />
                </Form.Item>
              )}

              {type === "payment" && (
                <Form.Item name="supplierId" label="إلى المورد">
                  <Select
                    placeholder="-- اختر المورد --"
                    allowClear
                    showSearch
                    optionFilterProp="label"
                    options={suppliers.map((s) => ({
                      label: `${s.nameAr} (${s.code})`,
                      value: s.id,
                    }))}
                  />
                </Form.Item>
              )}

              {paymentMethod === "cash" && cashRegisters.length > 0 && (
                <Form.Item name="cashRegisterId" label="الصندوق">
                  <Select
                    placeholder="-- اختر الصندوق --"
                    allowClear
                    options={cashRegisters.map((cr) => ({
                      label: cr.name,
                      value: cr.id,
                    }))}
                  />
                </Form.Item>
              )}

              {(paymentMethod === "bank_transfer" || paymentMethod === "check") && bankAccounts.length > 0 && (
                <Form.Item name="bankAccountId" label="الحساب البنكي">
                  <Select
                    placeholder="-- اختر الحساب --"
                    allowClear
                    options={bankAccounts.map((ba) => ({
                      label: `${ba.accountName} - ${ba.bankName}`,
                      value: ba.id,
                    }))}
                  />
                </Form.Item>
              )}

              <Form.Item name="description" label="الوصف">
                <Input placeholder="وصف مختصر للسند" />
              </Form.Item>

              <Form.Item name="notes" label="ملاحظات">
                <Input.TextArea rows={3} placeholder="ملاحظات إضافية..." />
              </Form.Item>
            </Card>
          </Col>
        </Row>

        {/* Preview Card */}
        {amount && amount > 0 && (
          <Card
            style={{
              marginBottom: 24,
              background: typeConfig.bg,
              border: `2px solid ${typeConfig.color}30`,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem" }}>
              <div>
                <div style={{ fontSize: "0.9rem", color: typeConfig.color, marginBottom: "0.25rem" }}>{typeConfig.label}</div>
                <div style={{ fontSize: "2rem", fontWeight: 700, color: typeConfig.color }}>
                  <MoneyDisplay amount={amount} currency={currency} />
                </div>
              </div>
              {form.getFieldValue("description") && (
                <div style={{ color: "#475569", maxWidth: "300px" }}>{form.getFieldValue("description")}</div>
              )}
            </div>
          </Card>
        )}

        {/* Actions */}
        <div style={{ display: "flex", gap: "0.75rem", justifyContent: "flex-end" }}>
          <Space>
            <Button onClick={() => navigate("/vouchers")}>إلغاء</Button>
            <Button
              type="primary"
              htmlType="submit"
              icon={<SaveOutlined />}
              loading={submitting}
              style={{ background: typeConfig.color }}
            >
              حفظ السند
            </Button>
          </Space>
        </div>
      </Form>
    </div>
  );
}
