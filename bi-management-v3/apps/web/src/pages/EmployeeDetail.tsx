/**
 * صفحة تفاصيل الموظف
 */
import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import {
  Row,
  Col,
  Card,
  Descriptions,
  Button,
  Tag,
  Space,
  Statistic,
  List,
  Avatar,
  message,
  Empty,
} from "antd";
import {
  EditOutlined,
  ArrowRightOutlined,
  UserOutlined,
  PhoneOutlined,
  MailOutlined,
  BankOutlined,
  ClockCircleOutlined,
  CalendarOutlined,
} from "@ant-design/icons";
import { PageHeader, StatusTag, MoneyDisplay, DateDisplay, LoadingSkeleton } from "../components/shared";
import { API_BASE, getAuthHeaders } from "../utils/api";

type Employee = {
  id: string;
  employeeCode: string | null;
  salary: number | null;
  salaryType: string | null;
  hireDate: string | null;
  contractType: string | null;
  workStartTime: string | null;
  workEndTime: string | null;
  bankName: string | null;
  bankAccount: string | null;
  emergencyContact: string | null;
  emergencyPhone: string | null;
  isActive: number | null;
  user: {
    id: string;
    fullName: string;
    email: string | null;
    phone: string | null;
    avatar: string | null;
  } | null;
  department: { id: string; name: string } | null;
  position: { id: string; name: string } | null;
  recentAttendance: Array<{
    id: string;
    date: string;
    checkIn: string | null;
    checkOut: string | null;
    status: string;
    workHours: number | null;
  }>;
  recentLeaves: Array<{
    id: string;
    type: string;
    startDate: string;
    endDate: string;
    days: number;
    status: string;
  }>;
};

const ATTENDANCE_STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  present: { label: "حاضر", color: "success" },
  absent: { label: "غائب", color: "error" },
  late: { label: "متأخر", color: "warning" },
  leave: { label: "إجازة", color: "processing" },
};

const LEAVE_STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  pending: { label: "قيد المراجعة", color: "warning" },
  approved: { label: "موافق عليه", color: "success" },
  rejected: { label: "مرفوض", color: "error" },
};

const LEAVE_TYPE_CONFIG: Record<string, string> = {
  annual: "سنوية",
  sick: "مرضية",
  personal: "شخصية",
};

export default function EmployeeDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    document.title = "تفاصيل الموظف | BI Management v3";

    fetch(`${API_BASE}/api/employees/${id}`, { headers: getAuthHeaders() })
      .then((r) => r.json())
      .then((data) => {
        if (data.error) throw new Error(data.error);
        setEmployee(data);
      })
      .catch((e) => {
        setError(e.message);
        message.error("فشل في تحميل بيانات الموظف");
      })
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <LoadingSkeleton />;

  if (error || !employee) {
    return (
      <div style={{ padding: 24 }}>
        <Empty
          description={error || "لم يتم العثور على الموظف"}
          image={Empty.PRESENTED_IMAGE_SIMPLE}
        >
          <Button type="primary" onClick={() => navigate("/hr/employees")}>
            العودة للموظفين
          </Button>
        </Empty>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title={employee.user?.fullName || "موظف"}
        breadcrumbs={[
          { label: "الموارد البشرية", path: "/hr" },
          { label: "الموظفين", path: "/hr/employees" },
          { label: employee.user?.fullName || "تفاصيل الموظف" },
        ]}
        extra={
          <Space>
            <Button type="primary" icon={<EditOutlined />} onClick={() => navigate(`/hr/employees/${id}/edit`)}>
              تعديل
            </Button>
            <Button icon={<ArrowRightOutlined />} onClick={() => navigate("/hr/employees")}>
              العودة
            </Button>
          </Space>
        }
      />

      {/* بطاقة الموظف الرئيسية */}
      <Card style={{ marginBottom: 16 }}>
        <Row gutter={24} align="middle">
          <Col>
            <Avatar
              size={80}
              icon={<UserOutlined />}
              src={employee.user?.avatar}
              style={{
                background: "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)",
                fontSize: 32,
              }}
            >
              {employee.user?.fullName?.charAt(0) || "م"}
            </Avatar>
          </Col>
          <Col flex={1}>
            <h2 style={{ margin: "0 0 4px" }}>{employee.user?.fullName || "موظف"}</h2>
            <Space>
              <span style={{ color: "#666" }}>{employee.employeeCode}</span>
              <span style={{ color: "#666" }}>-</span>
              <span style={{ color: "#666" }}>{employee.position?.name || "بدون منصب"}</span>
            </Space>
            <div style={{ marginTop: 8 }}>
              <Tag color={employee.isActive ? "success" : "error"}>
                {employee.isActive ? "نشط" : "غير نشط"}
              </Tag>
            </div>
          </Col>
          <Col>
            <Space direction="vertical" size={0} align="end">
              {employee.user?.phone && (
                <span style={{ color: "#666" }}>
                  <PhoneOutlined style={{ marginLeft: 6 }} />
                  {employee.user.phone}
                </span>
              )}
              {employee.user?.email && (
                <span style={{ color: "#666" }}>
                  <MailOutlined style={{ marginLeft: 6 }} />
                  {employee.user.email}
                </span>
              )}
            </Space>
          </Col>
        </Row>
      </Card>

      <Row gutter={16}>
        <Col span={12}>
          {/* معلومات التوظيف */}
          <Card title="معلومات التوظيف" style={{ marginBottom: 16 }}>
            <Descriptions column={1}>
              <Descriptions.Item label="القسم">
                {employee.department?.name || "-"}
              </Descriptions.Item>
              <Descriptions.Item label="تاريخ التعيين">
                {employee.hireDate ? <DateDisplay date={employee.hireDate} /> : "-"}
              </Descriptions.Item>
              <Descriptions.Item label="نوع العقد">
                {employee.contractType || "-"}
              </Descriptions.Item>
              <Descriptions.Item label="أوقات الدوام">
                <Space>
                  <ClockCircleOutlined />
                  {employee.workStartTime || "-"} - {employee.workEndTime || "-"}
                </Space>
              </Descriptions.Item>
            </Descriptions>
          </Card>

          {/* معلومات الراتب */}
          <Card title="معلومات الراتب">
            <Descriptions column={1}>
              <Descriptions.Item label="الراتب الأساسي">
                {employee.salary ? (
                  <span style={{ color: "#15803d", fontWeight: 600 }}>
                    <MoneyDisplay amount={employee.salary} />
                  </span>
                ) : (
                  "-"
                )}
              </Descriptions.Item>
              <Descriptions.Item label="نوع الراتب">
                {employee.salaryType || "-"}
              </Descriptions.Item>
              <Descriptions.Item label="البنك">
                <Space>
                  <BankOutlined />
                  {employee.bankName || "-"}
                </Space>
              </Descriptions.Item>
              <Descriptions.Item label="رقم الحساب">
                {employee.bankAccount || "-"}
              </Descriptions.Item>
            </Descriptions>
          </Card>
        </Col>

        <Col span={12}>
          {/* سجل الحضور الأخير */}
          <Card
            title="سجل الحضور الأخير"
            extra={
              <Link to={`/hr/attendance?employee=${id}`} style={{ color: "#6366f1" }}>
                عرض الكل
              </Link>
            }
            style={{ marginBottom: 16 }}
          >
            {employee.recentAttendance.length === 0 ? (
              <Empty description="لا يوجد سجل حضور" image={Empty.PRESENTED_IMAGE_SIMPLE} />
            ) : (
              <List
                dataSource={employee.recentAttendance}
                renderItem={(a) => {
                  const statusCfg = ATTENDANCE_STATUS_CONFIG[a.status] || { label: a.status, color: "default" };
                  return (
                    <List.Item
                      style={{ padding: "12px", background: "#fafafa", borderRadius: 8, marginBottom: 8 }}
                    >
                      <List.Item.Meta
                        avatar={<CalendarOutlined style={{ fontSize: 20, color: "#6366f1" }} />}
                        title={<DateDisplay date={a.date} />}
                        description={
                          <span style={{ color: "#666" }}>
                            {a.checkIn || "-"} - {a.checkOut || "-"}
                          </span>
                        }
                      />
                      <Tag color={statusCfg.color}>{statusCfg.label}</Tag>
                    </List.Item>
                  );
                }}
              />
            )}
          </Card>

          {/* الإجازات الأخيرة */}
          <Card
            title="الإجازات الأخيرة"
            extra={
              <Link to={`/hr/leaves?employee=${id}`} style={{ color: "#6366f1" }}>
                عرض الكل
              </Link>
            }
          >
            {employee.recentLeaves.length === 0 ? (
              <Empty description="لا توجد إجازات" image={Empty.PRESENTED_IMAGE_SIMPLE} />
            ) : (
              <List
                dataSource={employee.recentLeaves}
                renderItem={(l) => {
                  const statusCfg = LEAVE_STATUS_CONFIG[l.status] || { label: l.status, color: "default" };
                  const typeLabel = LEAVE_TYPE_CONFIG[l.type] || l.type;
                  return (
                    <List.Item
                      style={{ padding: "12px", background: "#fafafa", borderRadius: 8, marginBottom: 8 }}
                    >
                      <List.Item.Meta
                        title={`${typeLabel} (${l.days} يوم)`}
                        description={
                          <span style={{ color: "#666" }}>
                            <DateDisplay date={l.startDate} /> - <DateDisplay date={l.endDate} />
                          </span>
                        }
                      />
                      <Tag color={statusCfg.color}>{statusCfg.label}</Tag>
                    </List.Item>
                  );
                }}
              />
            )}
          </Card>
        </Col>
      </Row>
    </div>
  );
}
