import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Row, Col, Card, Form, Input, Select, Button, InputNumber, Switch, message, Space, Alert } from "antd";
import { SaveOutlined, ArrowRightOutlined, PhoneOutlined, MailOutlined, EnvironmentOutlined, GlobalOutlined, UserOutlined } from "@ant-design/icons";
import { PageHeader, LoadingSkeleton } from "../components/shared";
import { API_BASE, getAuthHeaders } from "../utils/api";

const TYPE_OPTIONS = [
  { value: "local", label: "محلي" },
  { value: "international", label: "دولي" },
  { value: "manufacturer", label: "مصنع" },
  { value: "distributor", label: "موزع" },
];

export default function SupplierEdit() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [supplierName, setSupplierName] = useState("");

  useEffect(() => {
    document.title = "تعديل مورد | BI Management v3";
  }, []);

  useEffect(() => {
    if (!id) {
      setError("معرف المورد مطلوب");
      setLoading(false);
      return;
    }

    fetch(`${API_BASE}/api/suppliers/${id}`, { headers: getAuthHeaders() })
      .then((res) => {
        if (!res.ok) throw new Error("المورد غير موجود");
        return res.json();
      })
      .then((data) => {
        setSupplierName(data.nameAr || data.name);
        form.setFieldsValue({
          name: data.name || "",
          nameAr: data.nameAr || "",
          code: data.code || "",
          type: data.type || "local",
          contactPerson: data.contactPerson || "",
          phone: data.phone || "",
          phone2: data.phone2 || "",
          email: data.email || "",
          website: data.website || "",
          city: data.city || "",
          country: data.country || "",
          address: data.address || "",
          creditLimit: data.creditLimit || 0,
          isActive: data.isActive === 1,
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
        type: values.type || null,
        contactPerson: (values.contactPerson as string)?.trim() || null,
        phone: (values.phone as string)?.trim() || null,
        phone2: (values.phone2 as string)?.trim() || null,
        email: (values.email as string)?.trim() || null,
        website: (values.website as string)?.trim() || null,
        city: (values.city as string)?.trim() || null,
        country: (values.country as string)?.trim() || null,
        address: (values.address as string)?.trim() || null,
        creditLimit: values.creditLimit || 0,
        isActive: values.isActive ? 1 : 0,
        notes: (values.notes as string)?.trim() || null,
      };

      const res = await fetch(`${API_BASE}/api/suppliers/${id}`, {
        method: "PUT",
        headers: getAuthHeaders(),
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "فشل تحديث المورد");
      }

      message.success("تم تحديث بيانات المورد بنجاح");
      navigate(`/suppliers/${id}`);
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
          title="تعديل المورد"
          breadcrumbs={[
            { title: "الموردين", href: "/suppliers" },
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
          title="تعديل المورد"
          breadcrumbs={[
            { title: "الموردين", href: "/suppliers" },
            { title: "خطأ" },
          ]}
        />
        <Alert
          message="خطأ"
          description={error}
          type="error"
          showIcon
          action={
            <Button type="link" onClick={() => navigate("/suppliers")}>
              العودة للموردين
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title={`تعديل المورد: ${supplierName}`}
        breadcrumbs={[
          { title: "الموردين", href: "/suppliers" },
          { title: supplierName, href: `/suppliers/${id}` },
          { title: "تعديل" },
        ]}
        extra={
          <Button icon={<ArrowRightOutlined />} onClick={() => navigate(`/suppliers/${id}`)}>
            العودة للتفاصيل
          </Button>
        }
      />

      <Form form={form} layout="vertical" onFinish={handleSubmit} style={{ maxWidth: 900 }}>
        <Card title="المعلومات الأساسية" style={{ marginBottom: 24 }}>
          <Row gutter={16}>
            <Col xs={24} md={8}>
              <Form.Item name="code" label="الكود">
                <Input placeholder="كود المورد" />
              </Form.Item>
            </Col>
            <Col xs={24} md={8}>
              <Form.Item
                name="name"
                label="الاسم (إنجليزي)"
                rules={[{ required: true, message: "الاسم مطلوب" }]}
              >
                <Input placeholder="Supplier Name" />
              </Form.Item>
            </Col>
            <Col xs={24} md={8}>
              <Form.Item name="nameAr" label="الاسم (عربي)">
                <Input placeholder="اسم المورد" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col xs={24} md={8}>
              <Form.Item name="type" label="نوع المورد">
                <Select options={TYPE_OPTIONS} allowClear placeholder="اختر النوع" />
              </Form.Item>
            </Col>
            <Col xs={24} md={8}>
              <Form.Item name="contactPerson" label="جهة الاتصال">
                <Input prefix={<UserOutlined />} placeholder="اسم جهة الاتصال" />
              </Form.Item>
            </Col>
            <Col xs={12} md={4}>
              <Form.Item name="isActive" label="نشط" valuePropName="checked">
                <Switch checkedChildren="نعم" unCheckedChildren="لا" />
              </Form.Item>
            </Col>
          </Row>
        </Card>

        <Card title="معلومات الاتصال" style={{ marginBottom: 24 }}>
          <Row gutter={16}>
            <Col xs={24} md={8}>
              <Form.Item name="phone" label="الهاتف">
                <Input prefix={<PhoneOutlined />} placeholder="رقم الهاتف" />
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
            <Col xs={24} md={24}>
              <Form.Item name="website" label="الموقع الإلكتروني">
                <Input prefix={<GlobalOutlined />} placeholder="https://example.com" />
              </Form.Item>
            </Col>
          </Row>
        </Card>

        <Card title="العنوان" style={{ marginBottom: 24 }}>
          <Row gutter={16}>
            <Col xs={24} md={8}>
              <Form.Item name="city" label="المدينة">
                <Input prefix={<EnvironmentOutlined />} placeholder="المدينة" />
              </Form.Item>
            </Col>
            <Col xs={24} md={8}>
              <Form.Item name="country" label="الدولة">
                <Input prefix={<GlobalOutlined />} placeholder="الدولة" />
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

          <Form.Item name="address" label="العنوان التفصيلي">
            <Input.TextArea rows={2} placeholder="العنوان الكامل..." />
          </Form.Item>
        </Card>

        <Card title="ملاحظات" style={{ marginBottom: 24 }}>
          <Form.Item name="notes" style={{ marginBottom: 0 }}>
            <Input.TextArea rows={4} placeholder="أضف ملاحظات عن المورد..." />
          </Form.Item>
        </Card>

        <Space>
          <Button onClick={() => navigate(`/suppliers/${id}`)}>إلغاء</Button>
          <Button type="primary" htmlType="submit" loading={submitting} icon={<SaveOutlined />}>
            حفظ التعديلات
          </Button>
        </Space>
      </Form>
    </div>
  );
}
