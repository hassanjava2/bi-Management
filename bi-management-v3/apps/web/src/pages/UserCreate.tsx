import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Row, Col, Card, Form, Input, Select, Button, message, Space } from "antd";
import { SaveOutlined } from "@ant-design/icons";
import { PageHeader } from "../components/shared";
import { API_BASE, getAuthHeaders } from "../utils/api";

type Role = {
  id: string;
  name: string;
  nameAr: string | null;
};

export default function UserCreate() {
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const [roles, setRoles] = useState<Role[]>([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    document.title = "إضافة مستخدم | BI Management v3";
    fetch(`${API_BASE}/api/roles`, { headers: getAuthHeaders() })
      .then((r) => r.json())
      .then((res) => setRoles(res.data || []))
      .catch(() => {});
  }, []);

  const handleSubmit = async (values: Record<string, unknown>) => {
    const username = (values.username as string)?.trim();
    const password = values.password as string;
    const fullName = (values.fullName as string)?.trim();

    if (!username || !password || !fullName) {
      message.error("يرجى إدخال اسم المستخدم وكلمة المرور والاسم الكامل");
      return;
    }

    if (password.length < 6) {
      message.error("كلمة المرور يجب أن تكون 6 أحرف على الأقل");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`${API_BASE}/api/users`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          username,
          password,
          fullName,
          email: (values.email as string)?.trim() || null,
          phone: (values.phone as string)?.trim() || null,
          role: values.role,
          roleId: values.roleId || null,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "فشل إنشاء المستخدم");
      }

      message.success("تم إضافة المستخدم بنجاح");
      navigate("/users");
    } catch (err: unknown) {
      message.error(err instanceof Error ? err.message : "حدث خطأ");
    } finally {
      setSubmitting(false);
    }
  };

  const breadcrumbs = [
    { label: "الرئيسية", href: "/" },
    { label: "المستخدمين", href: "/users" },
    { label: "إضافة مستخدم" },
  ];

  return (
    <div>
      <PageHeader title="إضافة مستخدم جديد" breadcrumbs={breadcrumbs} />

      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        initialValues={{
          role: "viewer",
        }}
        style={{ maxWidth: 600 }}
      >
        <Card title="معلومات المستخدم" style={{ marginBottom: 24 }}>
          <Row gutter={16}>
            <Col xs={24} sm={12}>
              <Form.Item
                name="username"
                label="اسم المستخدم"
                rules={[{ required: true, message: "يرجى إدخال اسم المستخدم" }]}
              >
                <Input placeholder="اسم المستخدم للدخول" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item
                name="password"
                label="كلمة المرور"
                rules={[
                  { required: true, message: "يرجى إدخال كلمة المرور" },
                  { min: 6, message: "كلمة المرور يجب أن تكون 6 أحرف على الأقل" },
                ]}
              >
                <Input.Password placeholder="6 أحرف على الأقل" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="fullName"
            label="الاسم الكامل"
            rules={[{ required: true, message: "يرجى إدخال الاسم الكامل" }]}
          >
            <Input placeholder="الاسم الكامل" />
          </Form.Item>

          <Row gutter={16}>
            <Col xs={24} sm={12}>
              <Form.Item
                name="email"
                label="البريد الإلكتروني"
                rules={[{ type: "email", message: "يرجى إدخال بريد إلكتروني صحيح" }]}
              >
                <Input placeholder="example@domain.com" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item name="phone" label="رقم الهاتف">
                <Input placeholder="07xxxxxxxxx" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col xs={24} sm={12}>
              <Form.Item name="role" label="الصلاحية">
                <Select
                  options={[
                    { label: "مشاهد", value: "viewer" },
                    { label: "محرر", value: "editor" },
                    { label: "مدير", value: "admin" },
                    { label: "مدير عام", value: "super_admin" },
                  ]}
                />
              </Form.Item>
            </Col>
            {roles.length > 0 && (
              <Col xs={24} sm={12}>
                <Form.Item name="roleId" label="الدور">
                  <Select
                    placeholder="بدون دور محدد"
                    allowClear
                    options={roles.map((r) => ({
                      label: r.nameAr || r.name,
                      value: r.id,
                    }))}
                  />
                </Form.Item>
              </Col>
            )}
          </Row>
        </Card>

        {/* Actions */}
        <div style={{ display: "flex", gap: "0.75rem", justifyContent: "flex-end" }}>
          <Space>
            <Button onClick={() => navigate("/users")}>إلغاء</Button>
            <Button type="primary" htmlType="submit" icon={<SaveOutlined />} loading={submitting}>
              إضافة المستخدم
            </Button>
          </Space>
        </div>
      </Form>
    </div>
  );
}
