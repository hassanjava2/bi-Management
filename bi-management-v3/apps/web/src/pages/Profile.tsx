import { useEffect, useState } from "react";
import {
  Row,
  Col,
  Card,
  Button,
  Input,
  Form,
  Tag,
  Space,
  message,
  Avatar,
  Descriptions,
} from "antd";
import {
  UserOutlined,
  EditOutlined,
  LockOutlined,
  MailOutlined,
  PhoneOutlined,
  SaveOutlined,
  CloseOutlined,
} from "@ant-design/icons";
import { PageHeader, LoadingSkeleton } from "../components/shared";
import { API_BASE, getAuthHeaders, onAuthFailure } from "../utils/api";

type UserData = {
  userId: string;
  username: string;
  fullName?: string;
  email?: string | null;
  phone?: string | null;
  roleId?: string | null;
  role?: string | null;
};

const ROLE_LABELS: Record<string, { label: string; color: string }> = {
  viewer: { label: "مشاهد", color: "default" },
  editor: { label: "محرر", color: "blue" },
  admin: { label: "مدير", color: "gold" },
  super_admin: { label: "مدير عام", color: "red" },
};

export default function Profile() {
  const [user, setUser] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Edit mode
  const [editing, setEditing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [profileForm] = Form.useForm();

  // Password change
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [passwordSubmitting, setPasswordSubmitting] = useState(false);
  const [passwordForm] = Form.useForm();

  useEffect(() => {
    document.title = "الملف الشخصي | BI Management v3";
  }, []);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = () => {
    setLoading(true);
    fetch(`${API_BASE}/api/auth/me`, { headers: getAuthHeaders() })
      .then((r) => {
        if (r.status === 401) {
          onAuthFailure();
          throw new Error("انتهت الجلسة");
        }
        return r.ok ? r.json() : Promise.reject(new Error("فشل التحميل"));
      })
      .then((data) => {
        setUser(data.user);
        profileForm.setFieldsValue({
          fullName: data.user.fullName || "",
          email: data.user.email || "",
          phone: data.user.phone || "",
        });
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  };

  const handleSaveProfile = async (values: { fullName: string; email: string; phone: string }) => {
    setError("");

    if (!values.fullName?.trim()) {
      message.error("يرجى إدخال الاسم الكامل");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`${API_BASE}/api/users/${user?.userId}`, {
        method: "PUT",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          fullName: values.fullName.trim(),
          email: values.email?.trim() || null,
          phone: values.phone?.trim() || null,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "فشل التحديث");
      }

      message.success("تم تحديث البيانات بنجاح");
      setEditing(false);
      fetchProfile();
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : "حدث خطأ";
      setError(errorMsg);
      message.error(errorMsg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleChangePassword = async (values: {
    currentPassword: string;
    newPassword: string;
    confirmPassword: string;
  }) => {
    setError("");

    if (!values.currentPassword || !values.newPassword) {
      message.error("يرجى إدخال كلمة المرور الحالية والجديدة");
      return;
    }

    if (values.newPassword.length < 6) {
      message.error("كلمة المرور الجديدة يجب أن تكون 6 أحرف على الأقل");
      return;
    }

    if (values.newPassword !== values.confirmPassword) {
      message.error("كلمة المرور الجديدة غير متطابقة");
      return;
    }

    setPasswordSubmitting(true);
    try {
      const res = await fetch(`${API_BASE}/api/auth/change-password`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          currentPassword: values.currentPassword,
          newPassword: values.newPassword,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "فشل تغيير كلمة المرور");
      }

      message.success("تم تغيير كلمة المرور بنجاح");
      setShowPasswordForm(false);
      passwordForm.resetFields();
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : "حدث خطأ";
      setError(errorMsg);
      message.error(errorMsg);
    } finally {
      setPasswordSubmitting(false);
    }
  };

  const cancelEdit = () => {
    setEditing(false);
    profileForm.setFieldsValue({
      fullName: user?.fullName || "",
      email: user?.email || "",
      phone: user?.phone || "",
    });
  };

  const cancelPasswordChange = () => {
    setShowPasswordForm(false);
    passwordForm.resetFields();
  };

  if (loading) {
    return (
      <div>
        <PageHeader
          title="الملف الشخصي"
          subtitle="إدارة معلومات الحساب"
          breadcrumbs={[{ title: "الملف الشخصي" }]}
        />
        <LoadingSkeleton type="form" rows={4} />
      </div>
    );
  }

  const roleConfig = user?.role ? ROLE_LABELS[user.role] : { label: user?.role || "—", color: "default" };

  return (
    <div>
      <PageHeader
        title="الملف الشخصي"
        subtitle="إدارة معلومات الحساب"
        breadcrumbs={[{ title: "الملف الشخصي" }]}
        extra={
          <Space>
            <UserOutlined style={{ fontSize: 20, color: "#8c8c8c" }} />
          </Space>
        }
      />

      {error && (
        <Card style={{ marginBottom: 16, borderColor: "#ff4d4f" }}>
          <div style={{ color: "#ff4d4f" }}>{error}</div>
        </Card>
      )}

      {user && (
        <Row gutter={24}>
          <Col xs={24} lg={16}>
            {/* Profile Card */}
            <Card style={{ marginBottom: 24 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 24 }}>
                <Avatar
                  size={64}
                  style={{
                    background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
                    fontSize: 24,
                    fontWeight: 600,
                  }}
                >
                  {(user.fullName || user.username).charAt(0).toUpperCase()}
                </Avatar>
                <div>
                  <div style={{ fontSize: 20, fontWeight: 600 }}>{user.fullName || user.username}</div>
                  <div style={{ color: "#8c8c8c" }}>@{user.username}</div>
                </div>
              </div>

              {!editing ? (
                <>
                  <Descriptions column={1} bordered size="small">
                    <Descriptions.Item label={<><MailOutlined /> البريد الإلكتروني</>}>
                      {user.email || "—"}
                    </Descriptions.Item>
                    <Descriptions.Item label={<><PhoneOutlined /> رقم الهاتف</>}>
                      {user.phone || "—"}
                    </Descriptions.Item>
                    <Descriptions.Item label={<><LockOutlined /> الصلاحية</>}>
                      <Tag color={roleConfig.color}>{roleConfig.label}</Tag>
                    </Descriptions.Item>
                  </Descriptions>

                  <div style={{ marginTop: 24 }}>
                    <Space>
                      <Button
                        type="primary"
                        icon={<EditOutlined />}
                        onClick={() => setEditing(true)}
                      >
                        تعديل البيانات
                      </Button>
                      <Button
                        icon={<LockOutlined />}
                        onClick={() => setShowPasswordForm(!showPasswordForm)}
                      >
                        تغيير كلمة المرور
                      </Button>
                    </Space>
                  </div>
                </>
              ) : (
                <Form
                  form={profileForm}
                  layout="vertical"
                  onFinish={handleSaveProfile}
                >
                  <Form.Item
                    label="الاسم الكامل"
                    name="fullName"
                    rules={[{ required: true, message: "يرجى إدخال الاسم الكامل" }]}
                  >
                    <Input prefix={<UserOutlined />} />
                  </Form.Item>

                  <Form.Item label="البريد الإلكتروني" name="email">
                    <Input prefix={<MailOutlined />} type="email" />
                  </Form.Item>

                  <Form.Item label="رقم الهاتف" name="phone">
                    <Input prefix={<PhoneOutlined />} dir="ltr" style={{ textAlign: "left" }} />
                  </Form.Item>

                  <Form.Item>
                    <Space>
                      <Button
                        type="primary"
                        htmlType="submit"
                        loading={submitting}
                        icon={<SaveOutlined />}
                      >
                        حفظ
                      </Button>
                      <Button onClick={cancelEdit} icon={<CloseOutlined />}>
                        إلغاء
                      </Button>
                    </Space>
                  </Form.Item>
                </Form>
              )}
            </Card>

            {/* Password Change Form */}
            {showPasswordForm && (
              <Card title={<><LockOutlined /> تغيير كلمة المرور</>}>
                <Form
                  form={passwordForm}
                  layout="vertical"
                  onFinish={handleChangePassword}
                >
                  <Form.Item
                    label="كلمة المرور الحالية"
                    name="currentPassword"
                    rules={[{ required: true, message: "يرجى إدخال كلمة المرور الحالية" }]}
                  >
                    <Input.Password prefix={<LockOutlined />} />
                  </Form.Item>

                  <Form.Item
                    label="كلمة المرور الجديدة"
                    name="newPassword"
                    rules={[
                      { required: true, message: "يرجى إدخال كلمة المرور الجديدة" },
                      { min: 6, message: "كلمة المرور يجب أن تكون 6 أحرف على الأقل" },
                    ]}
                  >
                    <Input.Password prefix={<LockOutlined />} placeholder="6 أحرف على الأقل" />
                  </Form.Item>

                  <Form.Item
                    label="تأكيد كلمة المرور"
                    name="confirmPassword"
                    dependencies={["newPassword"]}
                    rules={[
                      { required: true, message: "يرجى تأكيد كلمة المرور" },
                      ({ getFieldValue }) => ({
                        validator(_, value) {
                          if (!value || getFieldValue("newPassword") === value) {
                            return Promise.resolve();
                          }
                          return Promise.reject(new Error("كلمة المرور غير متطابقة"));
                        },
                      }),
                    ]}
                  >
                    <Input.Password prefix={<LockOutlined />} />
                  </Form.Item>

                  <Form.Item>
                    <Space>
                      <Button
                        type="primary"
                        htmlType="submit"
                        loading={passwordSubmitting}
                        icon={<LockOutlined />}
                      >
                        تغيير كلمة المرور
                      </Button>
                      <Button onClick={cancelPasswordChange} icon={<CloseOutlined />}>
                        إلغاء
                      </Button>
                    </Space>
                  </Form.Item>
                </Form>
              </Card>
            )}
          </Col>
        </Row>
      )}
    </div>
  );
}
