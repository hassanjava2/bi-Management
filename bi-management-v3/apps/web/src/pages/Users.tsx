import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { fetchList } from "../utils/api";
import {
  Row,
  Col,
  Card,
  Button,
  Input,
  Tag,
  Space,
  Statistic,
  Avatar,
  Empty,
} from "antd";
import {
  PlusOutlined,
  SearchOutlined,
  TeamOutlined,
  CheckCircleOutlined,
  LockOutlined,
  EditOutlined,
  UserOutlined,
  MailOutlined,
} from "@ant-design/icons";
import { PageHeader, StatusTag, DateDisplay, LoadingSkeleton } from "../components/shared";

type User = {
  id: string;
  username: string;
  email: string | null;
  fullName: string;
  role: string | null;
  roleName?: string | null;
  isActive: number | null;
  isLocked: number | null;
  lastLogin?: string | null;
  createdAt: string | null;
};

export default function Users() {
  const [data, setData] = useState<User[]>([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    document.title = "المستخدمون | BI Management v3";
  }, []);

  useEffect(() => {
    setLoading(true);
    fetchList<User>("/api/users", page)
      .then((r) => setData(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [page]);

  // Stats
  const totalUsers = data.length;
  const activeUsers = data.filter((u) => u.isActive && !u.isLocked).length;
  const lockedUsers = data.filter((u) => u.isLocked).length;

  // Filtering
  const filteredData = data.filter((u) => {
    const q = search.toLowerCase();
    return (
      u.username.toLowerCase().includes(q) ||
      u.fullName.toLowerCase().includes(q) ||
      (u.email && u.email.toLowerCase().includes(q))
    );
  });

  if (loading && data.length === 0) {
    return (
      <div>
        <PageHeader
          title="المستخدمون"
          breadcrumbs={[{ title: "الإعدادات" }, { title: "المستخدمون" }]}
        />
        <LoadingSkeleton type="list" rows={6} />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="المستخدمون"
        subtitle="إدارة حسابات المستخدمين والصلاحيات"
        breadcrumbs={[{ title: "الإعدادات" }, { title: "المستخدمون" }]}
        extra={
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => navigate("/users/new")}
          >
            إضافة مستخدم
          </Button>
        }
      />

      {/* Quick Stats */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={12} sm={8} md={6}>
          <Card>
            <Statistic
              title="إجمالي المستخدمين"
              value={totalUsers}
              prefix={<TeamOutlined style={{ color: "#3b82f6" }} />}
              valueStyle={{ color: "#3b82f6" }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={8} md={6}>
          <Card>
            <Statistic
              title="نشط"
              value={activeUsers}
              prefix={<CheckCircleOutlined style={{ color: "#22c55e" }} />}
              valueStyle={{ color: "#22c55e" }}
            />
          </Card>
        </Col>
        {lockedUsers > 0 && (
          <Col xs={12} sm={8} md={6}>
            <Card>
              <Statistic
                title="مقفل"
                value={lockedUsers}
                prefix={<LockOutlined style={{ color: "#ef4444" }} />}
                valueStyle={{ color: "#ef4444" }}
              />
            </Card>
          </Col>
        )}
      </Row>

      {/* Search */}
      <div style={{ marginBottom: 24 }}>
        <Input
          placeholder="بحث بالاسم أو البريد..."
          prefix={<SearchOutlined />}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ width: 300 }}
          allowClear
        />
      </div>

      {/* Users Grid */}
      {filteredData.length === 0 ? (
        <Card>
          <Empty description="لا يوجد مستخدمون مطابقون للبحث" />
        </Card>
      ) : (
        <Row gutter={[16, 16]}>
          {filteredData.map((user) => (
            <Col xs={24} sm={12} lg={8} xl={6} key={user.id}>
              <Card
                hoverable
                style={{
                  borderRight: user.isLocked
                    ? "4px solid #ef4444"
                    : user.isActive
                    ? "4px solid #22c55e"
                    : "4px solid #f59e0b",
                }}
                actions={[
                  <Link to={`/users/${user.id}/edit`} key="edit">
                    <Button type="text" icon={<EditOutlined />}>
                      تعديل
                    </Button>
                  </Link>,
                ]}
              >
                <div style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>
                  <Avatar
                    size={48}
                    style={{
                      background: "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)",
                      fontSize: 20,
                      fontWeight: 600,
                    }}
                  >
                    {user.fullName.charAt(0)}
                  </Avatar>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: 16, marginBottom: 4 }}>
                      {user.fullName}
                    </div>
                    <div
                      style={{
                        fontSize: 13,
                        color: "#64748b",
                        fontFamily: "monospace",
                        marginBottom: 8,
                      }}
                    >
                      @{user.username}
                    </div>
                    <div
                      style={{
                        fontSize: 13,
                        color: "#94a3b8",
                        display: "flex",
                        alignItems: "center",
                        gap: 4,
                        marginBottom: 12,
                      }}
                    >
                      <MailOutlined />
                      {user.email || "لا يوجد بريد"}
                    </div>
                    <Space size={4} wrap>
                      {user.isLocked ? (
                        <Tag color="red">مقفل</Tag>
                      ) : user.isActive ? (
                        <Tag color="green">نشط</Tag>
                      ) : (
                        <Tag color="warning">غير نشط</Tag>
                      )}
                      {user.roleName && <Tag color="purple">{user.roleName}</Tag>}
                    </Space>
                    <div style={{ marginTop: 12, fontSize: 12, color: "#94a3b8" }}>
                      منذ <DateDisplay date={user.createdAt} />
                    </div>
                  </div>
                </div>
              </Card>
            </Col>
          ))}
        </Row>
      )}

      {/* Pagination */}
      {data.length >= 20 && (
        <div
          style={{
            marginTop: 24,
            display: "flex",
            gap: 8,
            justifyContent: "center",
          }}
        >
          <Button disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
            السابق
          </Button>
          <span
            style={{
              padding: "4px 16px",
              background: "#3730a3",
              color: "#fff",
              borderRadius: 8,
              fontWeight: 500,
              display: "flex",
              alignItems: "center",
            }}
          >
            {page}
          </span>
          <Button disabled={data.length < 20} onClick={() => setPage((p) => p + 1)}>
            التالي
          </Button>
        </div>
      )}
    </div>
  );
}
