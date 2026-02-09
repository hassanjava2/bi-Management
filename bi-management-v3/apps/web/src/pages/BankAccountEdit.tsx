import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Row, Col, Card, Form, Input, Select, Button, InputNumber, message, Space, Switch } from "antd";
import { SaveOutlined, ArrowRightOutlined } from "@ant-design/icons";
import { PageHeader, LoadingSkeleton } from "../components/shared";
import { API_BASE, getAuthHeaders } from "../utils/api";

type Branch = {
  id: string;
  nameAr: string;
  code: string;
};

const ACCOUNT_TYPES = [
  { value: "current", label: "جاري" },
  { value: "savings", label: "توفير" },
  { value: "deposit", label: "وديعة" },
];

const CURRENCIES = [
  { value: "IQD", label: "دينار عراقي (د.ع)" },
  { value: "USD", label: "دولار أمريكي ($)" },
];

export default function BankAccountEdit() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [accountNumber, setAccountNumber] = useState("");
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    document.title = "تعديل حساب بنكي | BI Management v3";
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [bankRes, branchesRes] = await Promise.all([
          fetch(`${API_BASE}/api/bank-accounts/${id}`, { headers: getAuthHeaders() }),
          fetch(`${API_BASE}/api/branches?limit=50`, { headers: getAuthHeaders() }),
        ]);

        if (!bankRes.ok) throw new Error("فشل تحميل الحساب البنكي");

        const [data, branchesData] = await Promise.all([bankRes.json(), branchesRes.json()]);

        setAccountNumber(data.accountNumber || "");
        setIsActive(data.isActive !== 0);
        setBranches(branchesData.data || []);

        form.setFieldsValue({
          accountNumber: data.accountNumber || "",
          bankName: data.bankName || "",
          accountName: data.accountName || "",
          branchName: data.branchName || "",
          balance: data.balance || 0,
          currency: data.currency || "IQD",
          iban: data.iban || "",
          swiftCode: data.swiftCode || "",
          branchId: data.branchId || undefined,
          accountType: data.accountType || "current",
          isActive: data.isActive !== 0,
          notes: data.notes || "",
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
    setSubmitting(true);
    try {
      const res = await fetch(`${API_BASE}/api/bank-accounts/${id}`, {
        method: "PUT",
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
          isActive: values.isActive ? 1 : 0,
          notes: values.notes?.trim() || null,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "فشل تحديث الحساب البنكي");
      }

      message.success("تم تحديث الحساب البنكي بنجاح");
      navigate("/bank-accounts");
    } catch (err: unknown) {
      message.error(err instanceof Error ? err.message : "حدث خطأ");
    } finally {
      setSubmitting(false);
    }
  };

  const breadcrumbs = [
    { label: "الحسابات البنكية", href: "/bank-accounts" },
    { label: "تعديل حساب بنكي" },
  ];

  if (loading) {
    return <LoadingSkeleton />;
  }

  return (
    <div>
      <PageHeader
        title="تعديل الحساب البنكي"
        subtitle={accountNumber ? `رقم الحساب: ${accountNumber}` : undefined}
        breadcrumbs={breadcrumbs}
        extra={
          <Space>
            <span
              style={{
                padding: "4px 12px",
                background: isActive ? "#dcfce7" : "#fee2e2",
                color: isActive ? "#15803d" : "#b91c1c",
                borderRadius: "6px",
                fontWeight: 600,
                fontSize: "0.9rem",
              }}
            >
              {isActive ? "نشط" : "غير نشط"}
            </span>
            <Button
              icon={<ArrowRightOutlined />}
              onClick={() => navigate("/bank-accounts")}
            >
              العودة للحسابات البنكية
            </Button>
          </Space>
        }
      />

      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        onValuesChange={(changedValues) => {
          if ("isActive" in changedValues) {
            setIsActive(changedValues.isActive);
          }
        }}
      >
        <Row gutter={[24, 24]}>
          {/* Bank Info Card */}
          <Col xs={24} lg={12}>
            <Card title="معلومات البنك">
              <Form.Item
                name="bankName"
                label="اسم البنك"
                rules={[{ required: true, message: "يرجى إدخال اسم البنك" }]}
              >
                <Input placeholder="اسم البنك" />
              </Form.Item>

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

              <Form.Item name="isActive" label="حالة الحساب" valuePropName="checked">
                <Switch checkedChildren="نشط" unCheckedChildren="غير نشط" />
              </Form.Item>
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
                <Input.TextArea placeholder="ملاحظات..." rows={2} />
              </Form.Item>
            </Card>
          </Col>
        </Row>

        {/* Financial Info Card */}
        <Card title="المعلومات المالية" style={{ marginTop: 24 }}>
          <Row gutter={[24, 24]}>
            <Col xs={24} md={8}>
              <Form.Item name="balance" label="الرصيد الحالي">
                <InputNumber
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
                  const balance = getFieldValue("balance") || 0;
                  const currency = getFieldValue("currency");
                  const isPositive = balance >= 0;
                  return (
                    <div
                      style={{
                        padding: "16px",
                        background: isPositive
                          ? "linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%)"
                          : "linear-gradient(135deg, #fee2e2 0%, #fecaca 100%)",
                        borderRadius: "8px",
                        textAlign: "center",
                        marginTop: 30,
                      }}
                    >
                      <div
                        style={{
                          fontSize: "0.8rem",
                          color: isPositive ? "#1e40af" : "#991b1b",
                          marginBottom: "4px",
                        }}
                      >
                        الرصيد الحالي
                      </div>
                      <div
                        style={{
                          fontSize: "1.5rem",
                          fontWeight: 700,
                          color: isPositive ? "#1d4ed8" : "#b91c1c",
                        }}
                      >
                        {Number(balance).toLocaleString()} {currency}
                      </div>
                    </div>
                  );
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
              حفظ التعديلات
            </Button>
          </Space>
        </div>
      </Form>
    </div>
  );
}
