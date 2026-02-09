/**
 * صفحة تعديل الفرع
 */
import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, Form, Input, Switch, Button, message, Space, Alert, Row, Col } from "antd";
import { SaveOutlined, ArrowRightOutlined } from "@ant-design/icons";
import { PageHeader, LoadingSkeleton } from "../components/shared";
import { API_BASE, getAuthHeaders } from "../utils/api";

export default function BranchEdit() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    document.title = "تعديل الفرع | BI Management v3";
  }, []);

  useEffect(() => {
    if (!id) {
      setError("معرف الفرع مطلوب");
      setLoading(false);
      return;
    }

    fetch(`${API_BASE}/api/branches/${id}`, { headers: getAuthHeaders() })
      .then((r) => {
        if (!r.ok) throw new Error("الفرع غير موجود");
        return r.json();
      })
      .then((branch) => {
        form.setFieldsValue({
          code: branch.code || "",
          name: branch.name || "",
          nameAr: branch.nameAr || "",
          address: branch.address || "",
          city: branch.city || "",
          phone: branch.phone || "",
          email: branch.email || "",
          isMain: branch.isMain === 1,
          isActive: branch.isActive === 1,
        });
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [id, form]);

  const handleSubmit = async (values: Record<string, unknown>) => {
    setSubmitting(true);
    try {
      const res = await fetch(`${API_BASE}/api/branches/${id}`, {
        method: "PUT",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          code: values.code || null,
          name: values.name,
          nameAr: values.nameAr || null,
          address: values.address || null,
          city: values.city || null,
          phone: values.phone || null,
          email: values.email || null,
          isMain: values.isMain ? 1 : 0,
          isActive: values.isActive ? 1 : 0,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "فشل تحديث الفرع");
      }

      message.success("تم تحديث الفرع بنجاح");
      navigate(`/branches/${id}`);
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
          title="تعديل الفرع"
          breadcrumbs={[
            { title: "الفروع", href: "/branches" },
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
          title="تعديل الفرع"
          breadcrumbs={[
            { title: "الفروع", href: "/branches" },
            { title: "خطأ" },
          ]}
        />
        <Alert
          message="خطأ"
          description={error}
          type="error"
          showIcon
          action={
            <Button type="link" onClick={() => navigate("/branches")}>
              العودة للفروع
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="تعديل الفرع"
        breadcrumbs={[
          { title: "الفروع", href: "/branches" },
          { title: "تعديل" },
        ]}
        extra={
          <Button icon={<ArrowRightOutlined />} onClick={() => navigate(`/branches/${id}`)}>
            العودة للتفاصيل
          </Button>
        }
      />

      <Card style={{ maxWidth: 800 }}>
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Row gutter={16}>
            <Col xs={24} sm={8}>
              <Form.Item name="code" label="كود الفرع">
                <Input placeholder="مثال: BR001" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={8}>
              <Form.Item
                name="name"
                label="الاسم (إنجليزي)"
                rules={[{ required: true, message: "الاسم مطلوب" }]}
              >
                <Input placeholder="اسم الفرع بالإنجليزية" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={8}>
              <Form.Item name="nameAr" label="الاسم (عربي)">
                <Input placeholder="اسم الفرع بالعربية" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="address" label="العنوان">
            <Input.TextArea rows={2} placeholder="العنوان الكامل للفرع..." />
          </Form.Item>

          <Row gutter={16}>
            <Col xs={24} sm={8}>
              <Form.Item name="city" label="المدينة">
                <Input placeholder="المدينة" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={8}>
              <Form.Item name="phone" label="الهاتف">
                <Input placeholder="رقم الهاتف" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={8}>
              <Form.Item name="email" label="البريد الإلكتروني">
                <Input type="email" placeholder="البريد الإلكتروني" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col xs={12} sm={6}>
              <Form.Item name="isMain" label="فرع رئيسي" valuePropName="checked">
                <Switch checkedChildren="نعم" unCheckedChildren="لا" />
              </Form.Item>
            </Col>
            <Col xs={12} sm={6}>
              <Form.Item name="isActive" label="الحالة" valuePropName="checked">
                <Switch checkedChildren="نشط" unCheckedChildren="غير نشط" />
              </Form.Item>
            </Col>
          </Row>

          <Space>
            <Button onClick={() => navigate(`/branches/${id}`)}>إلغاء</Button>
            <Button type="primary" htmlType="submit" icon={<SaveOutlined />} loading={submitting}>
              حفظ التعديلات
            </Button>
          </Space>
        </Form>
      </Card>
    </div>
  );
}
