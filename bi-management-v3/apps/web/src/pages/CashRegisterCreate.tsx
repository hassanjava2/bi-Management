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

const CURRENCIES = [
  { value: "IQD", label: "دينار عراقي (د.ع)" },
  { value: "USD", label: "دولار أمريكي ($)" },
];

export default function CashRegisterCreate() {
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);
  const [branches, setBranches] = useState<Branch[]>([]);

  useEffect(() => {
    document.title = "إنشاء صندوق | BI Management v3";

    // Load branches
    fetch(`${API_BASE}/api/branches?limit=50`, { headers: getAuthHeaders() })
      .then((r) => r.json())
      .then((res) => setBranches(res.data || []))
      .catch(() => {});
  }, []);

  const handleSubmit = async (values: any) => {
    setSubmitting(true);
    try {
      const res = await fetch(`${API_BASE}/api/cash-registers`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          code: values.code.trim(),
          name: values.name.trim(),
          balance: values.balance || 0,
          currency: values.currency,
          branchId: values.branchId || null,
          description: values.description?.trim() || null,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "فشل إنشاء الصندوق");
      }

      message.success("تم إنشاء الصندوق بنجاح");
      navigate("/cash-registers");
    } catch (err: unknown) {
      message.error(err instanceof Error ? err.message : "حدث خطأ");
    } finally {
      setSubmitting(false);
    }
  };

  const breadcrumbs = [
    { label: "الصناديق", href: "/cash-registers" },
    { label: "إنشاء صندوق جديد" },
  ];

  return (
    <div>
      <PageHeader
        title="إنشاء صندوق جديد"
        subtitle="إضافة صندوق نقدي جديد للنظام"
        breadcrumbs={breadcrumbs}
        extra={
          <Button
            icon={<ArrowRightOutlined />}
            onClick={() => navigate("/cash-registers")}
          >
            العودة للصناديق
          </Button>
        }
      />

      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        initialValues={{
          currency: "IQD",
          balance: 0,
        }}
      >
        <Row gutter={[24, 24]}>
          {/* Basic Info Card */}
          <Col xs={24} lg={12}>
            <Card title="معلومات الصندوق">
              <Row gutter={16}>
                <Col span={8}>
                  <Form.Item
                    name="code"
                    label="الكود"
                    rules={[{ required: true, message: "يرجى إدخال الكود" }]}
                  >
                    <Input
                      placeholder="CR001"
                      style={{ fontFamily: "monospace" }}
                    />
                  </Form.Item>
                </Col>
                <Col span={16}>
                  <Form.Item
                    name="name"
                    label="اسم الصندوق"
                    rules={[{ required: true, message: "يرجى إدخال اسم الصندوق" }]}
                  >
                    <Input placeholder="الصندوق الرئيسي" />
                  </Form.Item>
                </Col>
              </Row>

              {branches.length > 0 && (
                <Form.Item name="branchId" label="الفرع">
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

              <Form.Item name="description" label="الوصف">
                <Input.TextArea
                  placeholder="وصف اختياري للصندوق..."
                  rows={3}
                />
              </Form.Item>
            </Card>
          </Col>

          {/* Financial Info Card */}
          <Col xs={24} lg={12}>
            <Card title="المعلومات المالية">
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

              <Form.Item name="currency" label="العملة">
                <Select options={CURRENCIES} />
              </Form.Item>

              <Form.Item shouldUpdate noStyle>
                {({ getFieldValue }) => {
                  const balance = getFieldValue("balance");
                  const currency = getFieldValue("currency");
                  if (balance && balance > 0) {
                    return (
                      <div
                        style={{
                          marginTop: 16,
                          padding: "20px",
                          background: "linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)",
                          borderRadius: "8px",
                          textAlign: "center",
                        }}
                      >
                        <div style={{ fontSize: "0.8rem", color: "#92400e", marginBottom: "4px" }}>
                          الرصيد الافتتاحي
                        </div>
                        <div style={{ fontSize: "1.75rem", fontWeight: 700, color: "#b45309" }}>
                          {Number(balance).toLocaleString()} {currency}
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              </Form.Item>
            </Card>
          </Col>
        </Row>

        {/* Actions */}
        <div style={{ marginTop: 24, display: "flex", justifyContent: "flex-end" }}>
          <Space>
            <Button onClick={() => navigate("/cash-registers")}>إلغاء</Button>
            <Button
              type="primary"
              htmlType="submit"
              loading={submitting}
              icon={<SaveOutlined />}
              style={{ background: "#f59e0b", borderColor: "#f59e0b" }}
            >
              حفظ الصندوق
            </Button>
          </Space>
        </div>
      </Form>
    </div>
  );
}
