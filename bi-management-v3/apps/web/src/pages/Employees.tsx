import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { API_BASE, getAuthHeaders } from "../utils/api";
import {
  Row,
  Col,
  Card,
  Button,
  Input,
  Select,
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
  CalendarOutlined,
  UserOutlined,
  IdcardOutlined,
  EyeOutlined,
  ClockCircleOutlined,
  DollarOutlined,
} from "@ant-design/icons";
import { PageHeader, MoneyDisplay, DateDisplay, LoadingSkeleton } from "../components/shared";

type Employee = {
  id: string;
  employeeCode: string | null;
  departmentId: string | null;
  positionId: string | null;
  salary: number | null;
  hireDate: string | null;
  isActive: number | null;
  user: {
    id: string;
    fullName: string;
    email: string | null;
    phone: string | null;
    avatar: string | null;
  } | null;
  department: {
    id: string;
    name: string;
  } | null;
  position: {
    id: string;
    name: string;
  } | null;
};

type Stats = {
  totalEmployees: number;
  activeEmployees: number;
  presentToday: number;
  onLeaveToday: number;
};

export default function Employees() {
  const [data, setData] = useState<Employee[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string | undefined>(undefined);
  const navigate = useNavigate();

  useEffect(() => {
    document.title = "الموظفون | BI Management v3";
  }, []);

  useEffect(() => {
    setLoading(true);

    const params = new URLSearchParams({ page: String(page), limit: "50" });
    if (statusFilter) params.append("status", statusFilter);

    Promise.all([
      fetch(`${API_BASE}/api/employees?${params}`, { headers: getAuthHeaders() }).then((r) => r.json()),
      fetch(`${API_BASE}/api/employees/stats`, { headers: getAuthHeaders() }).then((r) => r.json()),
    ])
      .then(([employees, statsData]) => {
        setData(employees.items || []);
        setStats(statsData);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [page, statusFilter]);

  // Filtering
  const filteredData = data.filter((e) => {
    const q = search.toLowerCase();
    const name = e.user?.fullName?.toLowerCase() || "";
    const code = e.employeeCode?.toLowerCase() || "";
    return name.includes(q) || code.includes(q);
  });

  if (loading && data.length === 0) {
    return (
      <div>
        <PageHeader
          title="الموظفون"
          breadcrumbs={[{ title: "الموارد البشرية" }, { title: "الموظفون" }]}
        />
        <LoadingSkeleton type="list" rows={6} />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="الموظفون"
        subtitle="إدارة بيانات الموظفين والحضور والرواتب"
        breadcrumbs={[{ title: "الموارد البشرية" }, { title: "الموظفون" }]}
        extra={
          <Space>
            <Button onClick={() => navigate("/hr/departments")}>الأقسام</Button>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => navigate("/hr/employees/new")}
            >
              إضافة موظف
            </Button>
          </Space>
        }
      />

      {/* Quick Stats */}
      {stats && (
        <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
          <Col xs={12} sm={6}>
            <Card>
              <Statistic
                title="إجمالي الموظفين"
                value={stats.totalEmployees}
                prefix={<TeamOutlined style={{ color: "#3b82f6" }} />}
                valueStyle={{ color: "#3b82f6" }}
              />
            </Card>
          </Col>
          <Col xs={12} sm={6}>
            <Card>
              <Statistic
                title="موظف نشط"
                value={stats.activeEmployees}
                prefix={<CheckCircleOutlined style={{ color: "#22c55e" }} />}
                valueStyle={{ color: "#22c55e" }}
              />
            </Card>
          </Col>
          <Col xs={12} sm={6}>
            <Card>
              <Statistic
                title="حاضر اليوم"
                value={stats.presentToday}
                prefix={<ClockCircleOutlined style={{ color: "#f59e0b" }} />}
                valueStyle={{ color: "#f59e0b" }}
              />
            </Card>
          </Col>
          <Col xs={12} sm={6}>
            <Card>
              <Statistic
                title="في إجازة"
                value={stats.onLeaveToday}
                prefix={<CalendarOutlined style={{ color: "#ec4899" }} />}
                valueStyle={{ color: "#ec4899" }}
              />
            </Card>
          </Col>
        </Row>
      )}

      {/* Filters */}
      <Space wrap style={{ marginBottom: 24 }}>
        <Input
          placeholder="بحث بالاسم أو الكود..."
          prefix={<SearchOutlined />}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ width: 250 }}
          allowClear
        />
        <Select
          placeholder="جميع الحالات"
          value={statusFilter}
          onChange={setStatusFilter}
          allowClear
          style={{ width: 150 }}
          options={[
            { value: "active", label: "نشط" },
            { value: "inactive", label: "غير نشط" },
          ]}
        />
      </Space>

      {/* Employees Grid */}
      {filteredData.length === 0 ? (
        <Card>
          <Empty
            description="لا يوجد موظفون"
            image={Empty.PRESENTED_IMAGE_SIMPLE}
          >
            <Button type="primary" onClick={() => navigate("/hr/employees/new")}>
              إضافة أول موظف
            </Button>
          </Empty>
        </Card>
      ) : (
        <Row gutter={[16, 16]}>
          {filteredData.map((emp) => (
            <Col xs={24} sm={12} lg={8} xl={6} key={emp.id}>
              <Card
                hoverable
                style={{
                  borderRight: emp.isActive
                    ? "4px solid #22c55e"
                    : "4px solid #ef4444",
                }}
                actions={[
                  <Link to={`/hr/employees/${emp.id}`} key="details">
                    <Button type="text" icon={<EyeOutlined />} size="small">
                      التفاصيل
                    </Button>
                  </Link>,
                  <Link to={`/hr/attendance?employee=${emp.id}`} key="attendance">
                    <Button type="text" icon={<ClockCircleOutlined />} size="small">
                      الحضور
                    </Button>
                  </Link>,
                  <Link to={`/hr/salaries?employee=${emp.id}`} key="salary">
                    <Button type="text" icon={<DollarOutlined />} size="small">
                      الراتب
                    </Button>
                  </Link>,
                ]}
              >
                <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                  <Avatar
                    size={52}
                    src={emp.user?.avatar}
                    style={{
                      background: emp.user?.avatar
                        ? undefined
                        : "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)",
                      fontSize: 22,
                      fontWeight: 600,
                    }}
                  >
                    {!emp.user?.avatar && (emp.user?.fullName?.charAt(0) || "م")}
                  </Avatar>
                  <div style={{ flex: 1 }}>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "flex-start",
                        marginBottom: 4,
                      }}
                    >
                      <div style={{ fontWeight: 600, fontSize: 15 }}>
                        {emp.user?.fullName || "موظف"}
                      </div>
                      <Tag color={emp.isActive ? "green" : "red"}>
                        {emp.isActive ? "نشط" : "غير نشط"}
                      </Tag>
                    </div>
                    <div style={{ fontSize: 13, color: "#64748b", marginBottom: 8 }}>
                      <IdcardOutlined /> {emp.employeeCode || "—"} •{" "}
                      {emp.position?.name || "بدون منصب"}
                    </div>
                    <Space size={4} wrap style={{ marginBottom: 8 }}>
                      {emp.department?.name && (
                        <Tag color="blue">{emp.department.name}</Tag>
                      )}
                    </Space>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        fontSize: 12,
                        color: "#94a3b8",
                      }}
                    >
                      <span>
                        الراتب: <MoneyDisplay amount={emp.salary || 0} size="small" />
                      </span>
                    </div>
                    <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 4 }}>
                      تعيين: <DateDisplay date={emp.hireDate} />
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
          <Button onClick={() => setPage((p) => p + 1)}>التالي</Button>
        </div>
      )}
    </div>
  );
}
