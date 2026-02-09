import { useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import {
  Row,
  Col,
  Card,
  Table,
  Button,
  Select,
  Space,
  message,
  Statistic,
  Empty,
  Avatar,
  DatePicker,
} from "antd";
import {
  UserOutlined,
  TeamOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  ExclamationCircleOutlined,
  CalendarOutlined,
  LoginOutlined,
  LogoutOutlined,
} from "@ant-design/icons";
import { PageHeader, StatusTag, LoadingSkeleton } from "../components/shared";
import { API_BASE, getAuthHeaders } from "../utils/api";
import type { ColumnsType } from "antd/es/table";
import dayjs from "dayjs";

type AttendanceRecord = {
  id: string;
  employeeId: string;
  date: string;
  checkIn: string | null;
  checkOut: string | null;
  workHours: number | null;
  overtimeHours: number | null;
  status: string;
  notes: string | null;
  employee: {
    id: string;
    employeeCode: string;
    user: { fullName: string; avatar: string | null } | null;
  } | null;
};

type TodaySummary = {
  present: number;
  absent: number;
  late: number;
  onLeave: number;
};

const statusConfig: Record<string, { color: string; text: string }> = {
  present: { color: "success", text: "حاضر" },
  absent: { color: "error", text: "غائب" },
  late: { color: "warning", text: "متأخر" },
  leave: { color: "processing", text: "إجازة" },
};

export default function Attendance() {
  const [searchParams] = useSearchParams();
  const employeeId = searchParams.get("employee");

  const [data, setData] = useState<AttendanceRecord[]>([]);
  const [todaySummary, setTodaySummary] = useState<TodaySummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [dateFilter, setDateFilter] = useState(dayjs());
  const [statusFilter, setStatusFilter] = useState("");

  useEffect(() => {
    document.title = "سجل الحضور | BI Management v3";
  }, []);

  useEffect(() => {
    setLoading(true);

    const params = new URLSearchParams({ date: dateFilter.format("YYYY-MM-DD") });
    if (employeeId) params.append("employeeId", employeeId);
    if (statusFilter) params.append("status", statusFilter);

    Promise.all([
      fetch(`${API_BASE}/api/attendance?${params}`, { headers: getAuthHeaders() }).then((r) => r.json()),
      fetch(`${API_BASE}/api/attendance/today`, { headers: getAuthHeaders() }).then((r) => r.json()),
    ])
      .then(([attendanceRes, todayRes]) => {
        setData(attendanceRes.items || []);
        setTodaySummary(todayRes.summary);
      })
      .catch((e) => message.error(e.message))
      .finally(() => setLoading(false));
  }, [dateFilter, statusFilter, employeeId]);

  const handleCheckIn = async (empId: string) => {
    try {
      const res = await fetch(`${API_BASE}/api/attendance`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({ employeeId: empId }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error);
      }
      message.success("تم تسجيل الدخول بنجاح");
      window.location.reload();
    } catch (err) {
      message.error(err instanceof Error ? err.message : "فشل تسجيل الدخول");
    }
  };

  const handleCheckOut = async (empId: string) => {
    try {
      const res = await fetch(`${API_BASE}/api/attendance/checkout/${empId}`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({}),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error);
      }
      message.success("تم تسجيل الخروج بنجاح");
      window.location.reload();
    } catch (err) {
      message.error(err instanceof Error ? err.message : "فشل تسجيل الخروج");
    }
  };

  const columns: ColumnsType<AttendanceRecord> = [
    {
      title: "الموظف",
      dataIndex: "employee",
      key: "employee",
      render: (_, record) => (
        <Space>
          <Avatar
            src={record.employee?.user?.avatar}
            icon={<UserOutlined />}
            style={{ background: "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)" }}
          >
            {record.employee?.user?.fullName?.charAt(0) || "م"}
          </Avatar>
          <div>
            <div style={{ fontWeight: 500 }}>{record.employee?.user?.fullName || "موظف"}</div>
            <div style={{ fontSize: "12px", color: "#8c8c8c" }}>{record.employee?.employeeCode}</div>
          </div>
        </Space>
      ),
    },
    {
      title: "الدخول",
      dataIndex: "checkIn",
      key: "checkIn",
      render: (checkIn) => (
        <span style={{ fontWeight: 500 }}>{checkIn || "-"}</span>
      ),
    },
    {
      title: "الخروج",
      dataIndex: "checkOut",
      key: "checkOut",
      render: (checkOut) => (
        <span style={{ fontWeight: 500 }}>{checkOut || "-"}</span>
      ),
    },
    {
      title: "ساعات العمل",
      dataIndex: "workHours",
      key: "workHours",
      render: (workHours) => (workHours ? `${workHours.toFixed(1)} ساعة` : "-"),
    },
    {
      title: "الحالة",
      dataIndex: "status",
      key: "status",
      render: (status) => {
        const config = statusConfig[status] || { color: "default", text: status };
        return <StatusTag status={config.color as any} text={config.text} />;
      },
    },
    {
      title: "إجراءات",
      key: "actions",
      render: (_, record) => (
        <Space>
          {!record.checkIn && (
            <Button
              type="primary"
              size="small"
              icon={<LoginOutlined />}
              style={{ background: "#52c41a", borderColor: "#52c41a" }}
              onClick={() => handleCheckIn(record.employeeId)}
            >
              تسجيل دخول
            </Button>
          )}
          {record.checkIn && !record.checkOut && (
            <Button
              danger
              size="small"
              icon={<LogoutOutlined />}
              onClick={() => handleCheckOut(record.employeeId)}
            >
              تسجيل خروج
            </Button>
          )}
          {record.checkIn && record.checkOut && (
            <span style={{ color: "#8c8c8c", fontSize: "12px" }}>مكتمل</span>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="سجل الحضور والانصراف"
        subtitle={dateFilter.locale("ar").format("dddd، D MMMM YYYY")}
        breadcrumbs={[
          { title: "الرئيسية", path: "/" },
          { title: "الموارد البشرية", path: "/hr" },
          { title: "الحضور والانصراف" },
        ]}
        extra={
          <Link to="/hr/employees">
            <Button icon={<TeamOutlined />}>الموظفون</Button>
          </Link>
        }
      />

      {/* Stats Cards */}
      {todaySummary && (
        <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
          <Col xs={12} sm={6}>
            <Card style={{ background: "linear-gradient(135deg, #f6ffed 0%, #d9f7be 100%)" }}>
              <Statistic
                title="حاضر"
                value={todaySummary.present}
                prefix={<CheckCircleOutlined style={{ color: "#52c41a" }} />}
                valueStyle={{ color: "#52c41a" }}
              />
            </Card>
          </Col>
          <Col xs={12} sm={6}>
            <Card style={{ background: "linear-gradient(135deg, #fff2f0 0%, #ffccc7 100%)" }}>
              <Statistic
                title="غائب"
                value={todaySummary.absent}
                prefix={<CloseCircleOutlined style={{ color: "#ff4d4f" }} />}
                valueStyle={{ color: "#ff4d4f" }}
              />
            </Card>
          </Col>
          <Col xs={12} sm={6}>
            <Card style={{ background: "linear-gradient(135deg, #fffbe6 0%, #ffe58f 100%)" }}>
              <Statistic
                title="متأخر"
                value={todaySummary.late}
                prefix={<ExclamationCircleOutlined style={{ color: "#faad14" }} />}
                valueStyle={{ color: "#faad14" }}
              />
            </Card>
          </Col>
          <Col xs={12} sm={6}>
            <Card style={{ background: "linear-gradient(135deg, #e6f4ff 0%, #bae0ff 100%)" }}>
              <Statistic
                title="إجازة"
                value={todaySummary.onLeave}
                prefix={<CalendarOutlined style={{ color: "#1890ff" }} />}
                valueStyle={{ color: "#1890ff" }}
              />
            </Card>
          </Col>
        </Row>
      )}

      {/* Filters */}
      <Card style={{ marginBottom: 16 }}>
        <Space wrap>
          <DatePicker
            value={dateFilter}
            onChange={(date) => date && setDateFilter(date)}
            placeholder="اختر التاريخ"
            style={{ width: 200 }}
          />
          <Select
            value={statusFilter}
            onChange={(value) => setStatusFilter(value)}
            placeholder="جميع الحالات"
            style={{ minWidth: 150 }}
            allowClear
          >
            <Select.Option value="">جميع الحالات</Select.Option>
            <Select.Option value="present">حاضر</Select.Option>
            <Select.Option value="absent">غائب</Select.Option>
            <Select.Option value="late">متأخر</Select.Option>
            <Select.Option value="leave">إجازة</Select.Option>
          </Select>
        </Space>
      </Card>

      {/* Attendance Table */}
      <Card bodyStyle={{ padding: 0 }}>
        {loading ? (
          <LoadingSkeleton />
        ) : data.length === 0 ? (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description="لا توجد سجلات لهذا اليوم"
            style={{ padding: "48px 0" }}
          />
        ) : (
          <Table
            columns={columns}
            dataSource={data}
            rowKey="id"
            pagination={{
              pageSize: 10,
              showSizeChanger: true,
              showTotal: (total) => `إجمالي ${total} سجل`,
            }}
          />
        )}
      </Card>
    </div>
  );
}
