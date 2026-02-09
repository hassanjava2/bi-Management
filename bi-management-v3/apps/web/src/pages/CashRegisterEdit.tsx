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

const CURRENCIES = [
  { value: "IQD", label: "دينار عراقي (د.ع)" },
  { value: "USD", label: "دولار أمريكي ($)" },
];

export default function CashRegisterEdit() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [code, setCode] = useState("");
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    document.title = "تعديل صندوق | BI Management v3";
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [cashRes, branchesRes] = await Promise.all([
          fetch(`${API_BASE}/api/cash-registers/${id}`, { headers: getAuthHeaders() }),
          fetch(`${API_BASE}/api/branches?limit=50`, { headers: getAuthHeaders() }),
        ]);

        if (!cashRes.ok) throw new Error("فشل تحميل الصندوق");

        const [data, branchesData] = await Promise.all([cashRes.json(), branchesRes.json()]);

        setCode(data.code || "");
        setIsActive(data.isActive !== 0);
        setBranches(branchesData.data || []);

        form.setFieldsValue({
          code: data.code || "",
          name: data.name || "",
          balance: data.balance || 0,
          currency: data.currency || "IQD",
          branchId: data.branchId || undefined,
          description: data.description || "",
          isActive: data.isActive !== 0,
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
      const res = await fetch(`${API_BASE}/api/cash-registers/${id}`, {
        method: "PUT",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          code: values.code.trim(),
          name: values.name.trim(),
          balance: values.balance || 0,
          currency: values.currency,
          branchId: values.branchId || null,
          description: values.description?.trim() || null,
          isActive: values.isActive ? 1 : 0,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "فشل تحديث الصندوق");
      }

      message.success("تم تحديث الصندوق بنجاح");
      navigate("/cash-registers");
    } catch (err: unknown) {
      message.error(err instanceof Error ? err.message : "حدث خطأ");
    } finally {
      setSubmitting(false);
    }
  };

  const breadcrumbs = [
    { label: "الصناديق", href: "/cash-registers" },
    { label: "تعديل صندوق" },
  ];

  if (loading) {
    return <LoadingSkeleton />;
  }

  return (
    <div>
      <PageHeader
        title="تعديل الصندوق"
        subtitle={code ? `كود الصندوق: ${code}` : undefined}
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
              onClick={() => navigate("/cash-registers")}
            >
              العودة للصناديق
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
                    <Input style={{ fontFamily: "monospace" }} />
                  </Form.Item>
                </Col>
                <Col span={16}>
                  <Form.Item
                    name="name"
                    label="اسم الصندوق"
                    rules={[{ required: true, message: "يرجى إدخال اسم الصندوق" }]}
                  >
                    <Input />
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
                <Input.TextArea rows={3} />
              </Form.Item>

              <Form.Item name="isActive" label="حالة الصندوق" valuePropName="checked">
                <Switch checkedChildren="نشط" unCheckedChildren="غير نشط" />
              </Form.Item>
            </Card>
          </Col>

          {/* Financial Info Card */}
          <Col xs={24} lg={12}>
            <Card title="المعلومات المالية">
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

              <Form.Item name="currency" label="العملة">
                <Select options={CURRENCIES} />
              </Form.Item>

              <Form.Item shouldUpdate noStyle>
                {({ getFieldValue }) => {
                  const balance = getFieldValue("balance") || 0;
                  const currency = getFieldValue("currency");
                  const isPositive = balance >= 0;
                  return (
                    <div
                      style={{
                        marginTop: 16,
                        padding: "20px",
                        background: isPositive
                          ? "linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)"
                          : "linear-gradient(135deg, #fee2e2 0%, #fecaca 100%)",
                        borderRadius: "8px",
                        textAlign: "center",
                      }}
                    >
                      <div
                        style={{
                          fontSize: "0.8rem",
                          color: isPositive ? "#92400e" : "#991b1b",
                          marginBottom: "4px",
                        }}
                      >
                        الرصيد الحالي
                      </div>
                      <div
                        style={{
                          fontSize: "1.75rem",
                          fontWeight: 700,
                          color: isPositive ? "#b45309" : "#b91c1c",
                        }}
                      >
                        {Number(balance).toLocaleString()} {currency}
                      </div>
                    </div>
                  );
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
              حفظ التعديلات
            </Button>
          </Space>
        </div>
      </Form>
    </div>
  );
}
