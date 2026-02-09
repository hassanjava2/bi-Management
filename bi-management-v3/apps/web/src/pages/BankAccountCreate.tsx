import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Row, Col, Card, Form, Input, Select, Button, InputNumber, message, Space } from "antd";
import { SaveOutlined, ArrowRightOutlined } from "@ant-design/icons";
import { PageHeader } from "../components/shared";
import { API_BASE, getAuthHeaders } from "../utils/api";

type Branch = {
  id: string;
  nameAr: string;
  code: string;
};

const COMMON_BANKS = [
  "مصرف الرافدين",
  "مصرف الرشيد",
  "البنك المركزي العراقي",
  "مصرف بغداد",
  "مصرف الشرق الأوسط",
  "المصرف العراقي للتجارة",
  "مصرف الاستثمار العراقي",
  "مصرف آشور",
  "مصرف الموصل",
  "مصرف كردستان",
];

const ACCOUNT_TYPES = [
  { value: "current", label: "جاري" },
  { value: "savings", label: "توفير" },
  { value: "deposit", label: "وديعة" },
];

const CURRENCIES = [
  { value: "IQD", label: "دينار عراقي (د.ع)" },
  { value: "USD", label: "دولار أمريكي ($)" },
];

export default function BankAccountCreate() {
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [showCustomBank, setShowCustomBank] = useState(false);

  useEffect(() => {
    document.title = "إضافة حساب بنكي | BI Management v3";

    // Load branches
    fetch(`${API_BASE}/api/branches?limit=50`, { headers: getAuthHeaders() })
      .then((r) => r.json())
      .then((res) => setBranches(res.data || []))
      .catch(() => {});
  }, []);

  const handleBankChange = (value: string) => {
    if (value === "other") {
      setShowCustomBank(true);
      form.setFieldValue("bankName", "");
    } else {
      setShowCustomBank(false);
    }
  };

  const handleSubmit = async (values: any) => {
    setSubmitting(true);
    try {
      const res = await fetch(`${API_BASE}/api/bank-accounts`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          accountNumber: values.accountNumber.trim(),
          bankName: values.bankName.trim(),
          accountName: values.accountName?.trim() || null,
          branchName: values.branchName?.trim() || null,
          balance: values.balance || 0,
          currency: values.currency,
          iban: values.iban?.trim() || null,
          swiftCode: values.swiftCode?.trim() || null,
          branchId: values.branchId || null,
          accountType: values.accountType,
          notes: values.notes?.trim() || null,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "فشل إنشاء الحساب البنكي");
      }

      message.success("تم إنشاء الحساب البنكي بنجاح");
      navigate("/bank-accounts");
    } catch (err: unknown) {
      message.error(err instanceof Error ? err.message : "حدث خطأ");
    } finally {
      setSubmitting(false);
    }
  };

  const breadcrumbs = [
    { label: "الحسابات البنكية", href: "/bank-accounts" },
    { label: "إضافة حساب بنكي" },
  ];

  return (
    <div>
      <PageHeader
        title="إضافة حساب بنكي"
        subtitle="إضافة حساب بنكي جديد للنظام"
        breadcrumbs={breadcrumbs}
        extra={
          <Button
            icon={<ArrowRightOutlined />}
            onClick={() => navigate("/bank-accounts")}
          >
            العودة للحسابات البنكية
          </Button>
        }
      />

      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        initialValues={{
          currency: "IQD",
          accountType: "current",
          balance: 0,
        }}
      >
        <Row gutter={[24, 24]}>
          {/* Bank Info Card */}
          <Col xs={24} lg={12}>
            <Card title="معلومات البنك">
              <Form.Item
                name="bankName"
                label="اسم البنك"
                rules={[{ required: true, message: "يرجى اختيار أو إدخال اسم البنك" }]}
              >
                {showCustomBank ? (
                  <Input placeholder="أدخل اسم البنك" />
                ) : (
                  <Select
                    placeholder="-- اختر البنك --"
                    onChange={handleBankChange}
                    options={[
                      ...COMMON_BANKS.map((bank) => ({ value: bank, label: bank })),
                      { value: "other", label: "أخرى..." },
                    ]}
                  />
                )}
              </Form.Item>

              {showCustomBank && (
                <Button
                  type="link"
                  onClick={() => {
                    setShowCustomBank(false);
                    form.setFieldValue("bankName", undefined);
                  }}
                  style={{ marginBottom: 16 }}
                >
                  العودة للقائمة
                </Button>
              )}

              <Form.Item name="branchName" label="فرع البنك">
                <Input placeholder="اسم فرع البنك" />
              </Form.Item>

              <Form.Item name="accountType" label="نوع الحساب">
                <Select options={ACCOUNT_TYPES} />
              </Form.Item>

              {branches.length > 0 && (
                <Form.Item name="branchId" label="فرع الشركة">
                  <Select
                    placeholder="-- اختر الفرع --"
                    allowClear
                    options={branches.map((b) => ({
                      value: b.id,
                      label: `${b.nameAr} (${b.code})`,
                    }))}
                  />
                </Form.Item>
              )}
            </Card>
          </Col>

          {/* Account Info Card */}
          <Col xs={24} lg={12}>
            <Card title="معلومات الحساب">
              <Form.Item
                name="accountNumber"
                label="رقم الحساب"
                rules={[{ required: true, message: "يرجى إدخال رقم الحساب" }]}
              >
                <Input
                  placeholder="رقم الحساب البنكي"
                  style={{ fontFamily: "monospace", letterSpacing: "1px" }}
                />
              </Form.Item>

              <Form.Item name="accountName" label="اسم الحساب">
                <Input placeholder="اسم صاحب الحساب" />
              </Form.Item>

              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item name="iban" label="IBAN">
                    <Input
                      placeholder="رقم IBAN"
                      style={{ fontFamily: "monospace", fontSize: "0.85rem" }}
                    />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item name="swiftCode" label="SWIFT Code">
                    <Input
                      placeholder="رمز SWIFT"
                      style={{ fontFamily: "monospace" }}
                    />
                  </Form.Item>
                </Col>
              </Row>

              <Form.Item name="notes" label="ملاحظات">
                <Input.TextArea
                  placeholder="ملاحظات اختيارية..."
                  rows={2}
                />
              </Form.Item>
            </Card>
          </Col>
        </Row>

        {/* Financial Info Card */}
        <Card title="المعلومات المالية" style={{ marginTop: 24 }}>
          <Row gutter={[24, 24]}>
            <Col xs={24} md={8}>
              <Form.Item name="balance" label="الرصيد الافتتاحي">
                <InputNumber
                  placeholder="0"
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

            <Col xs={24} md={8}>
              <Form.Item name="currency" label="العملة">
                <Select options={CURRENCIES} />
              </Form.Item>
            </Col>

            <Col xs={24} md={8}>
              <Form.Item shouldUpdate noStyle>
                {({ getFieldValue }) => {
                  const balance = getFieldValue("balance");
                  const currency = getFieldValue("currency");
                  if (balance && balance > 0) {
                    return (
                      <div
                        style={{
                          padding: "16px",
                          background: "linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%)",
                          borderRadius: "8px",
                          textAlign: "center",
                          marginTop: 30,
                        }}
                      >
                        <div style={{ fontSize: "0.8rem", color: "#1e40af", marginBottom: "4px" }}>
                          الرصيد الافتتاحي
                        </div>
                        <div style={{ fontSize: "1.5rem", fontWeight: 700, color: "#1d4ed8" }}>
                          {Number(balance).toLocaleString()} {currency}
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              </Form.Item>
            </Col>
          </Row>
        </Card>

        {/* Actions */}
        <div style={{ marginTop: 24, display: "flex", justifyContent: "flex-end" }}>
          <Space>
            <Button onClick={() => navigate("/bank-accounts")}>إلغاء</Button>
            <Button
              type="primary"
              htmlType="submit"
              loading={submitting}
              icon={<SaveOutlined />}
            >
              حفظ الحساب
            </Button>
          </Space>
        </div>
      </Form>
    </div>
  );
}
