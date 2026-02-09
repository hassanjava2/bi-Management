/**
 * صفحة الإعدادات
 */
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Row, Col, Card, Statistic, Space } from "antd";
import {
  UserOutlined,
  SafetyOutlined,
  LockOutlined,
  BankOutlined,
  ShopOutlined,
  ProfileOutlined,
  SettingOutlined,
} from "@ant-design/icons";
import { PageHeader, LoadingSkeleton } from "../components/shared";
import { API_BASE, getAuthHeaders } from "../utils/api";

type Stats = {
  users: number;
  roles: number;
  branches: number;
  warehouses: number;
};

const SETTINGS_SECTIONS = [
  {
    title: "إدارة المستخدمين",
    items: [
      { to: "/users", label: "المستخدمون", desc: "إدارة حسابات المستخدمين", icon: <UserOutlined />, color: "#6366f1" },
      { to: "/roles", label: "الأدوار", desc: "تعريف أدوار وصلاحيات", icon: <SafetyOutlined />, color: "#8b5cf6" },
      { to: "/permissions", label: "الصلاحيات", desc: "إدارة صلاحيات النظام", icon: <LockOutlined />, color: "#ec4899" },
    ],
  },
  {
    title: "إعدادات الشركة",
    items: [
      { to: "/branches", label: "الفروع", desc: "إدارة فروع الشركة", icon: <BankOutlined />, color: "#10b981" },
      { to: "/warehouses", label: "المخازن", desc: "إدارة المخازن والمستودعات", icon: <ShopOutlined />, color: "#f59e0b" },
    ],
  },
  {
    title: "الحساب الشخصي",
    items: [
      { to: "/profile", label: "الملف الشخصي", desc: "تعديل بياناتك الشخصية", icon: <ProfileOutlined />, color: "#3b82f6" },
    ],
  },
];

export default function Settings() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    document.title = "الإعدادات | BI Management v3";

    setLoading(true);
    setError(null);
    fetch(`${API_BASE}/api/stats`, { headers: getAuthHeaders() })
      .then((r) => {
        if (!r.ok) {
          throw new Error(`فشل تحميل الإحصائيات: ${r.status} ${r.statusText}`);
        }
        return r.json();
      })
      .then((data) => {
        setStats(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "حدث خطأ أثناء تحميل الإحصائيات");
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div style={{ padding: 24 }}>
        <LoadingSkeleton />
      </div>
    );
  }

  return (
    <div style={{ padding: 24 }}>
      <PageHeader
        title="الإعدادات"
        breadcrumbs={[{ title: "الإعدادات" }]}
      />
      <p style={{ color: "#64748b", marginBottom: 24 }}>
        إدارة النظام والمستخدمين والإعدادات العامة
      </p>

      {/* Quick Stats */}
      {stats && (
        <Row gutter={[16, 16]} style={{ marginBottom: 32 }}>
          <Col xs={12} sm={6}>
            <Card>
              <Statistic
                title="مستخدم"
                value={stats.users}
                valueStyle={{ color: "#6366f1" }}
                prefix={<UserOutlined />}
              />
            </Card>
          </Col>
          <Col xs={12} sm={6}>
            <Card>
              <Statistic
                title="دور"
                value={stats.roles}
                valueStyle={{ color: "#8b5cf6" }}
                prefix={<SafetyOutlined />}
              />
            </Card>
          </Col>
          <Col xs={12} sm={6}>
            <Card>
              <Statistic
                title="فرع"
                value={stats.branches}
                valueStyle={{ color: "#10b981" }}
                prefix={<BankOutlined />}
              />
            </Card>
          </Col>
          <Col xs={12} sm={6}>
            <Card>
              <Statistic
                title="مخزن"
                value={stats.warehouses}
                valueStyle={{ color: "#f59e0b" }}
                prefix={<ShopOutlined />}
              />
            </Card>
          </Col>
        </Row>
      )}

      {/* Settings Sections */}
      <Space direction="vertical" size={32} style={{ width: "100%" }}>
        {SETTINGS_SECTIONS.map((section) => (
          <div key={section.title}>
            <h3 style={{ fontSize: 14, color: "#64748b", marginBottom: 16, fontWeight: 500 }}>
              {section.title}
            </h3>
            <Row gutter={[16, 16]}>
              {section.items.map(({ to, label, desc, icon, color }) => (
                <Col xs={24} sm={12} lg={8} key={to}>
                  <Link to={to} style={{ textDecoration: "none" }}>
                    <Card
                      hoverable
                      style={{ height: "100%" }}
                    >
                      <Space align="start">
                        <div
                          style={{
                            width: 48,
                            height: 48,
                            borderRadius: 10,
                            backgroundColor: `${color}15`,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: 24,
                            color: color,
                          }}
                        >
                          {icon}
                        </div>
                        <div>
                          <div style={{ fontWeight: 600, marginBottom: 4, color: "#1f2937" }}>{label}</div>
                          <div style={{ fontSize: 14, color: "#64748b" }}>{desc}</div>
                        </div>
                      </Space>
                    </Card>
                  </Link>
                </Col>
              ))}
            </Row>
          </div>
        ))}
      </Space>

      {/* System Info */}
      <Card
        title={
          <Space>
            <SettingOutlined />
            معلومات النظام
          </Space>
        }
        style={{ marginTop: 32 }}
      >
        <Row gutter={[16, 8]}>
          <Col xs={12} sm={8}>
            <div style={{ color: "#64748b", fontSize: 14 }}>اسم النظام</div>
            <div style={{ fontWeight: 500 }}>BI Management v3</div>
          </Col>
          <Col xs={12} sm={8}>
            <div style={{ color: "#64748b", fontSize: 14 }}>الإصدار</div>
            <div style={{ fontWeight: 500 }}>3.0.0</div>
          </Col>
          <Col xs={12} sm={8}>
            <div style={{ color: "#64748b", fontSize: 14 }}>البنية</div>
            <div style={{ fontWeight: 500 }}>Hono + React + PostgreSQL</div>
          </Col>
        </Row>
      </Card>
    </div>
  );
}
