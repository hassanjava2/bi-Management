import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Row, Col, Card, Form, Input, Select, Button, Switch, message, Space } from "antd";
import { SaveOutlined, ArrowRightOutlined } from "@ant-design/icons";
import { PageHeader, LoadingSkeleton } from "../components/shared";
import { API_BASE, getAuthHeaders } from "../utils/api";

type Role = {
  id: string;
  name: string;
  nameAr: string | null;
};

export default function UserEdit() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    document.title = "تعديل مستخدم | BI Management v3";

    Promise.all([
      fetch(`${API_BASE}/api/users/${id}`, { headers: getAuthHeaders() }).then((r) => r.json()),
      fetch(`${API_BASE}/api/roles`, { headers: getAuthHeaders() }).then((r) => r.json()),
    ])
      .then(([user, rolesRes]) => {
        form.setFieldsValue({
          fullName: user.fullName || "",
          email: user.email || "",
          phone: user.phone || "",
          role: user.role || "viewer",
          roleId: user.roleId || undefined,
          isActive: user.isActive === 1,
          isLocked: user.isLocked === 1,
          newPassword: "",
        });
        setRoles(rolesRes.data || []);
      })
      .catch((err) => message.error(err.message))
      .finally(() => setLoading(false));
  }, [id, form]);

  const handleSubmit = async (values: Record<string, unknown>) => {
    setSubmitting(true);
    try {
      const payload: Record<string, unknown> = {
        fullName: (values.fullName as string).trim(),
        email: (values.email as string)?.trim() || null,
        phone: (values.phone as string)?.trim() || null,
        role: values.role,
        roleId: values.roleId || null,
        isActive: values.isActive ? 1 : 0,
        isLocked: values.isLocked ? 1 : 0,
      };

      if (values.newPassword) {
        payload.password = values.newPassword;
      }

      const res = await fetch(`${API_BASE}/api/users/${id}`, {
        method: "PUT",
        headers: getAuthHeaders(),
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "فشل تحديث المستخدم");
      }

      message.success("تم تحديث المستخدم بنجاح");
      navigate("/users");
    } catch (err: unknown) {
      message.error(err instanceof Error ? err.message : "حدث خطأ");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <LoadingSkeleton />;
  }

  return (
    <div>
      <PageHeader
        title="تعديل المستخدم"
        breadcrumbs={[
          { label: "الرئيسية", path: "/" },
          { label: "المستخدمين", path: "/users" },
          { label: "تعديل المستخدم" },
        ]}
        extra={
          <Button
            icon={<ArrowRightOutlined />}
            onClick={() => navigate("/users")}
          >
            العودة للمستخدمين
          </Button>
        }
      />

      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        style={{ maxWidth: 800 }}
      >
        <Card title="المعلومات الأساسية" style={{ marginBottom: 24 }}>
          <Row gutter={16}>
            <Col xs={24} md={12}>
              <Form.Item
                name="fullName"
                label="الاسم الكامل"
                rules={[{ required: true, message: "يرجى إدخال الاسم الكامل" }]}
              >
                <Input placeholder="أدخل الاسم الكامل" />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item
                name="email"
                label="البريد الإلكتروني"
                rules={[{ type: "email", message: "البريد الإلكتروني غير صحيح" }]}
              >
                <Input placeholder="أدخل البريد الإلكتروني" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col xs={24} md={12}>
              <Form.Item name="phone" label="رقم الهاتف">
                <Input placeholder="أدخل رقم الهاتف" />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item
                name="newPassword"
                label="كلمة مرور جديدة"
                rules={[
                  {
                    min: 6,
                    message: "كلمة المرور يجب أن تكون 6 أحرف على الأقل",
                  },
                ]}
              >
                <Input.Password placeholder="اتركها فارغة للإبقاء على الحالية" />
              </Form.Item>
            </Col>
          </Row>
        </Card>

        <Card title="الصلاحيات والحالة" style={{ marginBottom: 24 }}>
          <Row gutter={16}>
            <Col xs={24} md={12}>
              <Form.Item
                name="role"
                label="الصلاحية"
                rules={[{ required: true, message: "يرجى اختيار الصلاحية" }]}
              >
                <Select placeholder="اختر الصلاحية">
                  <Select.Option value="viewer">مشاهد</Select.Option>
                  <Select.Option value="editor">محرر</Select.Option>
                  <Select.Option value="admin">مدير</Select.Option>
                  <Select.Option value="super_admin">مدير عام</Select.Option>
                </Select>
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              {roles.length > 0 && (
                <Form.Item name="roleId" label="الدور">
                  <Select placeholder="اختر الدور" allowClear>
                    {roles.map((r) => (
                      <Select.Option key={r.id} value={r.id}>
                        {r.nameAr || r.name}
                      </Select.Option>
                    ))}
                  </Select>
                </Form.Item>
              )}
            </Col>
          </Row>

          <Row gutter={16}>
            <Col xs={12} md={6}>
              <Form.Item name="isActive" label="نشط" valuePropName="checked">
                <Switch checkedChildren="نعم" unCheckedChildren="لا" />
              </Form.Item>
            </Col>
            <Col xs={12} md={6}>
              <Form.Item name="isLocked" label="مقفل" valuePropName="checked">
                <Switch checkedChildren="نعم" unCheckedChildren="لا" />
              </Form.Item>
            </Col>
          </Row>
        </Card>

        <Space>
          <Button onClick={() => navigate("/users")}>إلغاء</Button>
          <Button
            type="primary"
            htmlType="submit"
            loading={submitting}
            icon={<SaveOutlined />}
          >
            حفظ التعديلات
          </Button>
        </Space>
      </Form>
    </div>
  );
}
