import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Row, Col, Card, Form, Input, Select, Button, InputNumber, message, Space } from "antd";
import { SaveOutlined, ArrowRightOutlined } from "@ant-design/icons";
import { PageHeader, LoadingSkeleton } from "../components/shared";
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

const TYPE_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  receipt: { label: "سند قبض", color: "#15803d", bg: "#dcfce7" },
  payment: { label: "سند صرف", color: "#b91c1c", bg: "#fee2e2" },
  transfer: { label: "سند تحويل", color: "#1d4ed8", bg: "#dbeafe" },
};

const VOUCHER_TYPES = [
  { value: "receipt", label: "سند قبض" },
  { value: "payment", label: "سند صرف" },
  { value: "transfer", label: "سند تحويل" },
];

const CURRENCIES = [
  { value: "IQD", label: "IQD" },
  { value: "USD", label: "USD" },
];

const PAYMENT_METHODS = [
  { value: "cash", label: "نقدي" },
  { value: "bank_transfer", label: "تحويل بنكي" },
  { value: "check", label: "شيك" },
  { value: "credit_card", label: "بطاقة ائتمان" },
];

export default function VoucherEdit() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [voucherNumber, setVoucherNumber] = useState("");
  const [voucherType, setVoucherType] = useState("receipt");
  const [paymentMethod, setPaymentMethod] = useState("cash");

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [cashRegisters, setCashRegisters] = useState<CashRegister[]>([]);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);

  useEffect(() => {
    document.title = "تعديل سند | BI Management v3";
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [voucherRes, customersRes, suppliersRes, cashRes, bankRes] = await Promise.all([
          fetch(`${API_BASE}/api/vouchers/${id}`, { headers: getAuthHeaders() }),
          fetch(`${API_BASE}/api/customers?limit=200`, { headers: getAuthHeaders() }),
          fetch(`${API_BASE}/api/suppliers?limit=200`, { headers: getAuthHeaders() }),
          fetch(`${API_BASE}/api/cash-registers?limit=50`, { headers: getAuthHeaders() }),
          fetch(`${API_BASE}/api/bank-accounts?limit=50`, { headers: getAuthHeaders() }),
        ]);

        if (!voucherRes.ok) throw new Error("فشل تحميل السند");

        const [data, customersData, suppliersData, cashData, bankData] = await Promise.all([
          voucherRes.json(),
          customersRes.json(),
          suppliersRes.json(),
          cashRes.json(),
          bankRes.json(),
        ]);

        setVoucherNumber(data.voucherNumber || "");
        setVoucherType(data.type || "receipt");
        setPaymentMethod(data.paymentMethod || "cash");
        setCustomers(customersData.data || []);
        setSuppliers(suppliersData.data || []);
        setCashRegisters(cashData.data || []);
        setBankAccounts(bankData.data || []);

        form.setFieldsValue({
          type: data.type || "receipt",
          amount: data.amount || 0,
          currency: data.currency || "IQD",
          paymentMethod: data.paymentMethod || "cash",
          description: data.description || "",
          notes: data.notes || "",
          customerId: data.customerId || undefined,
          supplierId: data.supplierId || undefined,
          cashRegisterId: data.cashRegisterId || undefined,
          bankAccountId: data.bankAccountId || undefined,
          referenceNumber: data.referenceNumber || "",
        });
      } catch (err) {
        message.error(err instanceof Error ? err.message : "فشل التحميل");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id, form]);

  const handleSubmit = async (values: any) => {
    const amountNum = values.amount;
    if (!amountNum || amountNum <= 0) {
      message.error("يرجى إدخال مبلغ صحيح");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`${API_BASE}/api/vouchers/${id}`, {
        method: "PUT",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          type: values.type,
          amount: amountNum,
          currency: values.currency,
          paymentMethod: values.paymentMethod,
          description: values.description?.trim() || null,
          notes: values.notes?.trim() || null,
          customerId: values.customerId || null,
          supplierId: values.supplierId || null,
          cashRegisterId: values.cashRegisterId || null,
          bankAccountId: values.bankAccountId || null,
          referenceNumber: values.referenceNumber?.trim() || null,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "فشل تحديث السند");
      }

      message.success("تم تحديث السند بنجاح");
      navigate(`/vouchers/${id}`);
    } catch (err: unknown) {
      message.error(err instanceof Error ? err.message : "حدث خطأ");
    } finally {
      setSubmitting(false);
    }
  };

  const typeConfig = TYPE_CONFIG[voucherType];

  const breadcrumbs = [
    { label: "السندات", href: "/vouchers" },
    { label: voucherNumber || "تعديل سند", href: `/vouchers/${id}` },
    { label: "تعديل" },
  ];

  if (loading) {
    return <LoadingSkeleton />;
  }

  return (
    <div>
      <PageHeader
        title="تعديل السند"
        subtitle={voucherNumber ? `رقم السند: ${voucherNumber}` : undefined}
        breadcrumbs={breadcrumbs}
        extra={
          <Space>
            <span
              style={{
                padding: "4px 12px",
                background: typeConfig.bg,
                color: typeConfig.color,
                borderRadius: "6px",
                fontWeight: 600,
              }}
            >
              {typeConfig.label}
            </span>
            <Button
              icon={<ArrowRightOutlined />}
              onClick={() => navigate(`/vouchers/${id}`)}
            >
              العودة للسند
            </Button>
          </Space>
        }
      />

      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        onValuesChange={(changedValues) => {
          if ("type" in changedValues) {
            setVoucherType(changedValues.type);
          }
          if ("paymentMethod" in changedValues) {
            setPaymentMethod(changedValues.paymentMethod);
          }
        }}
      >
        <Row gutter={[24, 24]}>
          {/* Voucher Info Card */}
          <Col xs={24} lg={12}>
            <Card title="معلومات السند">
              <Form.Item
                name="type"
                label="نوع السند"
                rules={[{ required: true, message: "يرجى اختيار نوع السند" }]}
              >
                <Select options={VOUCHER_TYPES} />
              </Form.Item>

              <Row gutter={16}>
                <Col span={16}>
                  <Form.Item
                    name="amount"
                    label="المبلغ"
                    rules={[{ required: true, message: "يرجى إدخال المبلغ" }]}
                  >
                    <InputNumber
                      placeholder="أدخل المبلغ"
                      min={0}
                      step={0.01}
                      style={{ width: "100%" }}
                      formatter={(value) =>
                        `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")
                      }
                      parser={(value) => value!.replace(/,/g, "") as any}
                    />
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item name="currency" label="العملة">
                    <Select options={CURRENCIES} />
                  </Form.Item>
                </Col>
              </Row>

              <Form.Item name="paymentMethod" label="طريقة الدفع">
                <Select options={PAYMENT_METHODS} />
              </Form.Item>

              <Form.Item name="referenceNumber" label="رقم المرجع">
                <Input placeholder="رقم مرجعي اختياري" />
              </Form.Item>
            </Card>
          </Col>

          {/* Party & Destination Card */}
          <Col xs={24} lg={12}>
            <Card title="الأطراف">
              {voucherType === "receipt" && (
                <Form.Item name="customerId" label="من العميل">
                  <Select
                    placeholder="-- اختر العميل --"
                    allowClear
                    showSearch
                    optionFilterProp="label"
                    options={customers.map((c) => ({
                      value: c.id,
                      label: `${c.nameAr} (${c.code})`,
                    }))}
                  />
                </Form.Item>
              )}

              {voucherType === "payment" && (
                <Form.Item name="supplierId" label="إلى المورد">
                  <Select
                    placeholder="-- اختر المورد --"
                    allowClear
                    showSearch
                    optionFilterProp="label"
                    options={suppliers.map((s) => ({
                      value: s.id,
                      label: `${s.nameAr} (${s.code})`,
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
                      value: cr.id,
                      label: cr.name,
                    }))}
                  />
                </Form.Item>
              )}

              {(paymentMethod === "bank_transfer" || paymentMethod === "check") &&
                bankAccounts.length > 0 && (
                  <Form.Item name="bankAccountId" label="الحساب البنكي">
                    <Select
                      placeholder="-- اختر الحساب --"
                      allowClear
                      options={bankAccounts.map((ba) => ({
                        value: ba.id,
                        label: `${ba.accountName} - ${ba.bankName}`,
                      }))}
                    />
                  </Form.Item>
                )}

              <Form.Item name="description" label="الوصف">
                <Input placeholder="وصف مختصر للسند" />
              </Form.Item>

              <Form.Item name="notes" label="ملاحظات">
                <Input.TextArea placeholder="ملاحظات إضافية..." rows={3} />
              </Form.Item>
            </Card>
          </Col>
        </Row>

        {/* Preview Card */}
        <Form.Item shouldUpdate noStyle>
          {({ getFieldValue }) => {
            const amount = getFieldValue("amount");
            const currency = getFieldValue("currency");
            const description = getFieldValue("description");
            if (amount && amount > 0) {
              return (
                <Card
                  style={{
                    marginTop: 24,
                    background: typeConfig.bg,
                    border: `2px solid ${typeConfig.color}30`,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      flexWrap: "wrap",
                      gap: "1rem",
                    }}
                  >
                    <div>
                      <div style={{ fontSize: "0.9rem", color: typeConfig.color, marginBottom: "4px" }}>
                        {typeConfig.label}
                      </div>
                      <div style={{ fontSize: "2rem", fontWeight: 700, color: typeConfig.color }}>
                        {Number(amount).toLocaleString()} {currency}
                      </div>
                    </div>
                    {description && (
                      <div style={{ color: "#475569", maxWidth: "300px" }}>{description}</div>
                    )}
                  </div>
                </Card>
              );
            }
            return null;
          }}
        </Form.Item>

        {/* Actions */}
        <div style={{ marginTop: 24, display: "flex", justifyContent: "flex-end" }}>
          <Space>
            <Button onClick={() => navigate(`/vouchers/${id}`)}>إلغاء</Button>
            <Button
              type="primary"
              htmlType="submit"
              loading={submitting}
              icon={<SaveOutlined />}
              style={{ background: typeConfig.color, borderColor: typeConfig.color }}
            >
              حفظ التعديلات
            </Button>
          </Space>
        </div>
      </Form>
    </div>
  );
}
