import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Row, Col, Card, Form, Input, Select, Button, InputNumber, Switch, message, Space, Alert } from "antd";
import { SaveOutlined, ArrowRightOutlined, PhoneOutlined, MailOutlined, EnvironmentOutlined } from "@ant-design/icons";
import { PageHeader, LoadingSkeleton } from "../components/shared";
import { API_BASE, getAuthHeaders } from "../utils/api";

const TYPE_OPTIONS = [
  { value: "retail", label: "قطاعي" },
  { value: "wholesale", label: "جملة" },
  { value: "company", label: "شركة" },
];

export default function CustomerEdit() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [customerName, setCustomerName] = useState("");

  useEffect(() => {
    document.title = "تعديل عميل | BI Management v3";
  }, []);

  useEffect(() => {
    if (!id) {
      setError("معرف العميل مطلوب");
      setLoading(false);
      return;
    }

    fetch(`${API_BASE}/api/customers/${id}`, { headers: getAuthHeaders() })
      .then((res) => {
        if (!res.ok) throw new Error("العميل غير موجود");
        return res.json();
      })
      .then((data) => {
        setCustomerName(data.nameAr || data.name);
        form.setFieldsValue({
          name: data.name || "",
          nameAr: data.nameAr || "",
          code: data.code || "",
          phone: data.phone || "",
          phone2: data.phone2 || "",
          email: data.email || "",
          address: data.address || "",
          city: data.city || "",
          type: data.type || "retail",
          creditLimit: data.creditLimit || 0,
          isActive: data.isActive === 1,
          isBlocked: data.isBlocked === 1,
          notes: data.notes || "",
        });
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [id, form]);

  const handleSubmit = async (values: Record<string, unknown>) => {
    setSubmitting(true);
    try {
      const payload = {
        name: (values.name as string)?.trim(),
        nameAr: (values.nameAr as string)?.trim() || null,
        code: (values.code as string)?.trim() || null,
        phone: (values.phone as string)?.trim(),
        phone2: (values.phone2 as string)?.trim() || null,
        email: (values.email as string)?.trim() || null,
        address: (values.address as string)?.trim() || null,
        city: (values.city as string)?.trim() || null,
        type: values.type,
        creditLimit: values.creditLimit || 0,
        isActive: values.isActive ? 1 : 0,
        isBlocked: values.isBlocked ? 1 : 0,
        notes: (values.notes as string)?.trim() || null,
      };

      const res = await fetch(`${API_BASE}/api/customers/${id}`, {
        method: "PUT",
        headers: getAuthHeaders(),
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "فشل تحديث العميل");
      }

      message.success("تم تحديث بيانات العميل بنجاح");
      navigate(`/customers/${id}`);
    } catch (err: unknown) {
      message.error(err instanceof Error ? err.message : "حدث خطأ");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div>
        <PageHeader
          title="تعديل العميل"
          breadcrumbs={[
            { title: "العملاء", href: "/customers" },
            { title: "تعديل" },
          ]}
        />
        <LoadingSkeleton type="form" rows={8} />
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <PageHeader
          title="تعديل العميل"
          breadcrumbs={[
            { title: "العملاء", href: "/customers" },
            { title: "خطأ" },
          ]}
        />
        <Alert
          message="خطأ"
          description={error}
          type="error"
          showIcon
          action={
            <Button type="link" onClick={() => navigate("/customers")}>
              العودة للعملاء
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title={`تعديل العميل: ${customerName}`}
        breadcrumbs={[
          { title: "العملاء", href: "/customers" },
          { title: customerName, href: `/customers/${id}` },
          { title: "تعديل" },
        ]}
        extra={
          <Button icon={<ArrowRightOutlined />} onClick={() => navigate(`/customers/${id}`)}>
            العودة للتفاصيل
          </Button>
        }
      />

      <Form form={form} layout="vertical" onFinish={handleSubmit} style={{ maxWidth: 900 }}>
        <Card title="المعلومات الأساسية" style={{ marginBottom: 24 }}>
          <Row gutter={16}>
            <Col xs={24} md={8}>
              <Form.Item name="code" label="الكود">
                <Input placeholder="كود العميل" />
              </Form.Item>
            </Col>
            <Col xs={24} md={8}>
              <Form.Item
                name="name"
                label="الاسم (إنجليزي)"
                rules={[{ required: true, message: "الاسم مطلوب" }]}
              >
                <Input placeholder="Customer Name" />
              </Form.Item>
            </Col>
            <Col xs={24} md={8}>
              <Form.Item name="nameAr" label="الاسم (عربي)">
                <Input placeholder="اسم العميل" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col xs={24} md={8}>
              <Form.Item
                name="phone"
                label="الهاتف"
                rules={[{ required: true, message: "رقم الهاتف مطلوب" }]}
              >
                <Input prefix={<PhoneOutlined />} placeholder="07xxxxxxxxx" />
              </Form.Item>
            </Col>
            <Col xs={24} md={8}>
              <Form.Item name="phone2" label="هاتف إضافي">
                <Input prefix={<PhoneOutlined />} placeholder="رقم إضافي" />
              </Form.Item>
            </Col>
            <Col xs={24} md={8}>
              <Form.Item
                name="email"
                label="البريد الإلكتروني"
                rules={[{ type: "email", message: "البريد الإلكتروني غير صحيح" }]}
              >
                <Input prefix={<MailOutlined />} placeholder="email@example.com" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col xs={24} md={12}>
              <Form.Item name="city" label="المدينة">
                <Input prefix={<EnvironmentOutlined />} placeholder="المدينة" />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item name="address" label="العنوان">
                <Input prefix={<EnvironmentOutlined />} placeholder="العنوان التفصيلي" />
              </Form.Item>
            </Col>
          </Row>
        </Card>

        <Card title="الإعدادات المالية" style={{ marginBottom: 24 }}>
          <Row gutter={16}>
            <Col xs={24} md={8}>
              <Form.Item name="type" label="نوع العميل">
                <Select options={TYPE_OPTIONS} />
              </Form.Item>
            </Col>
            <Col xs={24} md={8}>
              <Form.Item name="creditLimit" label="حد الائتمان">
                <InputNumber
                  style={{ width: "100%" }}
                  min={0}
                  placeholder="0"
                  formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")}
                />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col xs={12} md={6}>
              <Form.Item name="isActive" label="نشط" valuePropName="checked">
                <Switch checkedChildren="نعم" unCheckedChildren="لا" />
              </Form.Item>
            </Col>
            <Col xs={12} md={6}>
              <Form.Item name="isBlocked" label="محظور" valuePropName="checked">
                <Switch checkedChildren="نعم" unCheckedChildren="لا" />
              </Form.Item>
            </Col>
          </Row>
        </Card>

        <Card title="ملاحظات" style={{ marginBottom: 24 }}>
          <Form.Item name="notes" style={{ marginBottom: 0 }}>
            <Input.TextArea rows={4} placeholder="أضف ملاحظات عن العميل..." />
          </Form.Item>
        </Card>

        <Space>
          <Button onClick={() => navigate(`/customers/${id}`)}>إلغاء</Button>
          <Button type="primary" htmlType="submit" loading={submitting} icon={<SaveOutlined />}>
            حفظ التعديلات
          </Button>
        </Space>
      </Form>
    </div>
  );
}
