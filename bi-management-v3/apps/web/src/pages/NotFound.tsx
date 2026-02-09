import { useEffect } from "react";
import { Link } from "react-router-dom";
import { Result, Button, Space, Typography } from "antd";
import {
  HomeOutlined,
  ArrowLeftOutlined,
  FileTextOutlined,
  UserOutlined,
  ShoppingOutlined,
  BarChartOutlined,
} from "@ant-design/icons";

const { Text } = Typography;

export default function NotFound() {
  useEffect(() => {
    document.title = "404 | BI Management v3";
  }, []);

  const quickLinks = [
    { path: "/invoices", label: "الفواتير", icon: <FileTextOutlined /> },
    { path: "/customers", label: "العملاء", icon: <UserOutlined /> },
    { path: "/products", label: "المنتجات", icon: <ShoppingOutlined /> },
    { path: "/reports", label: "التقارير", icon: <BarChartOutlined /> },
  ];

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "2rem",
        direction: "rtl",
        background: "linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)",
      }}
    >
      <Result
        status="404"
        title="الصفحة غير موجودة"
        subTitle="عذراً، الصفحة التي تبحث عنها غير موجودة أو تم نقلها."
        extra={
          <Space direction="vertical" size="large" style={{ width: "100%" }}>
            <Space wrap style={{ justifyContent: "center" }}>
              <Link to="/">
                <Button type="primary" icon={<HomeOutlined />} size="large">
                  الصفحة الرئيسية
                </Button>
              </Link>
              <Button
                icon={<ArrowLeftOutlined />}
                size="large"
                onClick={() => window.history.back()}
              >
                الرجوع للخلف
              </Button>
            </Space>

            <div style={{ textAlign: "center", marginTop: 24 }}>
              <Text type="secondary" style={{ marginBottom: 12, display: "block" }}>
                روابط سريعة
              </Text>
              <Space wrap style={{ justifyContent: "center" }}>
                {quickLinks.map((link) => (
                  <Link key={link.path} to={link.path}>
                    <Button type="link" icon={link.icon}>
                      {link.label}
                    </Button>
                  </Link>
                ))}
              </Space>
            </div>
          </Space>
        }
        style={{
          background: "#fff",
          borderRadius: 24,
          boxShadow: "0 20px 60px rgba(0, 0, 0, 0.1)",
          padding: "48px 32px",
          maxWidth: 550,
        }}
      />
    </div>
  );
}
