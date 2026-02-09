import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { API_BASE } from "../utils/api";
import { Form, Input, Button, Card, Typography, Alert, Space } from "antd";
import { UserOutlined, LockOutlined, LoginOutlined } from "@ant-design/icons";

const { Title, Text } = Typography;

export default function Login() {
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const [form] = Form.useForm();

  useEffect(() => {
    document.title = "تسجيل الدخول | BI Management v3";
  }, []);

  async function handleSubmit(values: { username: string; password: string }) {
    setError("");
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "فشل تسجيل الدخول");
        return;
      }
      if (data.token) {
        localStorage.setItem("token", data.token);
        if (data.user) {
          localStorage.setItem("user", JSON.stringify(data.user));
        }
        navigate("/", { replace: true });
      }
    } catch {
      setError("خطأ في الاتصال بالخادم");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "linear-gradient(135deg, #1e1b4b 0%, #0f172a 50%, #0c0a09 100%)",
        padding: 16,
      }}
    >
      <div style={{ width: "100%", maxWidth: 420 }}>
        {/* Logo/Brand */}
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <img
            src="/assets/logo.svg"
            alt="BI Management"
            style={{
              width: 100,
              height: 100,
              margin: "0 auto 16px",
              borderRadius: 20,
              boxShadow: "0 20px 40px rgba(0, 0, 0, 0.3)",
            }}
          />
          <Title level={2} style={{ margin: 0, color: "#fff" }}>
            BI Management
          </Title>
          <Text style={{ color: "#94a3b8" }}>نظام إدارة الأعمال المتكامل</Text>
        </div>

        {/* Login Card */}
        <Card
          style={{
            borderRadius: 16,
            boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.4)",
          }}
          styles={{
            body: { padding: 32 },
          }}
        >
          <Title level={4} style={{ textAlign: "center", marginBottom: 24 }}>
            تسجيل الدخول
          </Title>

          {error && (
            <Alert
              message={error}
              type="error"
              showIcon
              style={{ marginBottom: 24 }}
              closable
              onClose={() => setError("")}
            />
          )}

          <Form
            form={form}
            layout="vertical"
            onFinish={handleSubmit}
            autoComplete="on"
            size="large"
          >
            <Form.Item
              name="username"
              label="اسم المستخدم"
              rules={[{ required: true, message: "يرجى إدخال اسم المستخدم" }]}
            >
              <Input
                prefix={<UserOutlined style={{ color: "#94a3b8" }} />}
                placeholder="أدخل اسم المستخدم"
                autoComplete="username"
              />
            </Form.Item>

            <Form.Item
              name="password"
              label="كلمة المرور"
              rules={[{ required: true, message: "يرجى إدخال كلمة المرور" }]}
            >
              <Input.Password
                prefix={<LockOutlined style={{ color: "#94a3b8" }} />}
                placeholder="أدخل كلمة المرور"
                autoComplete="current-password"
              />
            </Form.Item>

            <Form.Item style={{ marginBottom: 0, marginTop: 32 }}>
              <Button
                type="primary"
                htmlType="submit"
                loading={loading}
                icon={<LoginOutlined />}
                block
                style={{
                  height: 48,
                  fontSize: 16,
                  fontWeight: 600,
                  background: "linear-gradient(135deg, #3730a3 0%, #6366f1 100%)",
                  border: "none",
                  boxShadow: "0 10px 20px rgba(55, 48, 163, 0.3)",
                }}
              >
                {loading ? "جاري الدخول..." : "تسجيل الدخول"}
              </Button>
            </Form.Item>
          </Form>
        </Card>

        {/* Footer */}
        <Text
          style={{
            display: "block",
            textAlign: "center",
            marginTop: 24,
            color: "#64748b",
            fontSize: 12,
          }}
        >
          BI Management v3.0 - 2026
        </Text>
      </div>
    </div>
  );
}
