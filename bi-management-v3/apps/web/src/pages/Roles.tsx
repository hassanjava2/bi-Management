import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { API_BASE, getAuthHeaders, onAuthFailure } from "../utils/api";
import {
  Row,
  Col,
  Card,
  Button,
  Tag,
  Space,
  Statistic,
  Empty,
} from "antd";
import {
  PlusOutlined,
  SafetyCertificateOutlined,
  EditOutlined,
  LockOutlined,
} from "@ant-design/icons";
import { PageHeader, LoadingSkeleton } from "../components/shared";

type Role = {
  id: string;
  name: string;
  nameAr: string | null;
  description: string | null;
  color: string | null;
  icon: string | null;
  isSystem: number | null;
  securityLevel: number | null;
};

export default function Roles() {
  const [data, setData] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    document.title = "الأدوار | BI Management v3";
  }, []);

  useEffect(() => {
    fetch(`${API_BASE}/api/roles`, { headers: getAuthHeaders() })
      .then((r) => {
        if (r.status === 401) {
          onAuthFailure();
          throw new Error("انتهت الجلسة");
        }
        return r.ok ? r.json() : Promise.reject(new Error("فشل التحميل"));
      })
      .then((res) => setData(res.data ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // Stats
  const systemRoles = data.filter((r) => r.isSystem).length;
  const customRoles = data.filter((r) => !r.isSystem).length;

  if (loading) {
    return (
      <div>
        <PageHeader
          title="الأدوار"
          breadcrumbs={[{ title: "الإعدادات" }, { title: "الأدوار" }]}
        />
        <LoadingSkeleton type="card" rows={4} />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="الأدوار"
        subtitle="إدارة أدوار المستخدمين والصلاحيات"
        breadcrumbs={[{ title: "الإعدادات" }, { title: "الأدوار" }]}
        extra={
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => navigate("/roles/new")}
          >
            إضافة دور
          </Button>
        }
      />

      {/* Quick Stats */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={12} sm={8}>
          <Card>
            <Statistic
              title="إجمالي الأدوار"
              value={data.length}
              prefix={<SafetyCertificateOutlined style={{ color: "#8b5cf6" }} />}
              valueStyle={{ color: "#8b5cf6" }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={8}>
          <Card>
            <Statistic
              title="أدوار النظام"
              value={systemRoles}
              prefix={<LockOutlined style={{ color: "#3b82f6" }} />}
              valueStyle={{ color: "#3b82f6" }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={8}>
          <Card>
            <Statistic
              title="أدوار مخصصة"
              value={customRoles}
              prefix={<SafetyCertificateOutlined style={{ color: "#22c55e" }} />}
              valueStyle={{ color: "#22c55e" }}
            />
          </Card>
        </Col>
      </Row>

      {/* Roles Grid */}
      {data.length === 0 ? (
        <Card>
          <Empty description="لا توجد أدوار" />
        </Card>
      ) : (
        <Row gutter={[16, 16]}>
          {data.map((role) => (
            <Col xs={24} sm={12} lg={8} xl={6} key={role.id}>
              <Card
                hoverable
                style={{
                  borderRight: `4px solid ${role.color || "#64748b"}`,
                }}
                actions={[
                  <Link to={`/roles/${role.id}/edit`} key="edit">
                    <Button type="text" icon={<EditOutlined />}>
                      تعديل
                    </Button>
                  </Link>,
                ]}
              >
                <div style={{ minHeight: 100 }}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                      marginBottom: 12,
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 16 }}>
                        {role.nameAr || role.name}
                      </div>
                      {role.nameAr && (
                        <div style={{ fontSize: 13, color: "#64748b" }}>
                          {role.name}
                        </div>
                      )}
                    </div>
                    {role.isSystem === 1 && (
                      <Tag color="blue">مضمن</Tag>
                    )}
                  </div>

                  {role.description && (
                    <div
                      style={{
                        fontSize: 13,
                        color: "#64748b",
                        marginBottom: 12,
                        lineHeight: 1.5,
                      }}
                    >
                      {role.description}
                    </div>
                  )}

                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <Tag color={role.color || "default"}>
                      مستوى الأمان: {role.securityLevel || 1}
                    </Tag>
                  </div>
                </div>
              </Card>
            </Col>
          ))}
        </Row>
      )}
    </div>
  );
}
