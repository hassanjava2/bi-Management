import { useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import {
  Row,
  Col,
  Card,
  Table,
  Button,
  Input,
  Select,
  Form,
  Modal,
  Tag,
  Space,
  message,
  Statistic,
  Empty,
  Avatar,
  DatePicker,
} from "antd";
import {
  PlusOutlined,
  UserOutlined,
  TeamOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  CalendarOutlined,
} from "@ant-design/icons";
import { PageHeader, StatusTag, DateDisplay, LoadingSkeleton } from "../components/shared";
import { API_BASE, getAuthHeaders } from "../utils/api";
import type { ColumnsType } from "antd/es/table";
import dayjs from "dayjs";

type Leave = {
  id: string;
  employeeId: string;
  type: string;
  startDate: string;
  endDate: string;
  days: number;
  reason: string | null;
  status: string;
  createdAt: string;
  employee: {
    id: string;
    employeeCode: string;
    user: { fullName: string; avatar: string | null } | null;
  } | null;
};

type LeaveStats = {
  pending: number;
  approved: number;
  rejected: number;
  currentlyOnLeave: number;
};

const statusConfig: Record<string, { color: string; text: string }> = {
  pending: { color: "warning", text: "قيد المراجعة" },
  approved: { color: "success", text: "موافق عليه" },
  rejected: { color: "error", text: "مرفوض" },
};

const leaveTypeConfig: Record<string, { color: string; text: string }> = {
  annual: { color: "blue", text: "سنوية" },
  sick: { color: "red", text: "مرضية" },
  personal: { color: "purple", text: "شخصية" },
  maternity: { color: "pink", text: "أمومة" },
  unpaid: { color: "default", text: "بدون راتب" },
};

export default function Leaves() {
  const [searchParams] = useSearchParams();
  const employeeId = searchParams.get("employee");

  const [data, setData] = useState<Leave[]>([]);
  const [stats, setStats] = useState<LeaveStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [employees, setEmployees] = useState<Array<{ id: string; employeeCode: string; user: { fullName: string } | null }>>([]);

  const [form] = Form.useForm();

  useEffect(() => {
    document.title = "الاجازات | BI Management v3";

    // Load employees for form
    fetch(`${API_BASE}/api/employees?limit=500`, { headers: getAuthHeaders() })
      .then((r) => r.json())
      .then((res) => setEmployees(res.items || []))
      .catch(() => {});
  }, []);

  const loadData = () => {
    setLoading(true);

    const params = new URLSearchParams();
    if (employeeId) params.append("employeeId", employeeId);
    if (statusFilter) params.append("status", statusFilter);
    if (typeFilter) params.append("type", typeFilter);

    Promise.all([
      fetch(`${API_BASE}/api/leaves?${params}`, { headers: getAuthHeaders() }).then((r) => r.json()),
      fetch(`${API_BASE}/api/leaves/stats`, { headers: getAuthHeaders() }).then((r) => r.json()),
    ])
      .then(([leavesRes, statsRes]) => {
        setData(leavesRes.items || []);
        setStats(statsRes);
      })
      .catch((e) => message.error(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
  }, [statusFilter, typeFilter, employeeId]);

  const handleSubmit = async (values: {
    employeeId: string;
    type: string;
    dates: [dayjs.Dayjs, dayjs.Dayjs];
    reason: string;
  }) => {
    setSubmitting(true);
    try {
      const res = await fetch(`${API_BASE}/api/leaves`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          employeeId: values.employeeId,
          type: values.type,
          startDate: values.dates[0].format("YYYY-MM-DD"),
          endDate: values.dates[1].format("YYYY-MM-DD"),
          reason: values.reason || "",
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error);
      }

      message.success("تم إرسال طلب الإجازة بنجاح");
      setShowForm(false);
      form.resetFields();
      loadData();
    } catch (err) {
      message.error(err instanceof Error ? err.message : "فشل إنشاء الطلب");
    } finally {
      setSubmitting(false);
    }
  };

  const handleApprove = async (id: string) => {
    try {
      await fetch(`${API_BASE}/api/leaves/${id}/approve`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({ approvedBy: "current-user" }),
      });
      message.success("تمت الموافقة على الطلب");
      loadData();
    } catch {
      message.error("فشل الموافقة");
    }
  };

  const handleReject = async (id: string) => {
    Modal.confirm({
      title: "رفض الطلب",
      content: (
        <Input.TextArea
          id="rejection-reason"
          placeholder="سبب الرفض (اختياري)"
          rows={3}
        />
      ),
      okText: "رفض",
      okType: "danger",
      cancelText: "إلغاء",
      onOk: async () => {
        const reason = (document.getElementById("rejection-reason") as HTMLTextAreaElement)?.value || "";
        try {
          await fetch(`${API_BASE}/api/leaves/${id}/reject`, {
            method: "POST",
            headers: getAuthHeaders(),
            body: JSON.stringify({ approvedBy: "current-user", rejectionReason: reason }),
          });
          message.success("تم رفض الطلب");
          loadData();
        } catch {
          message.error("فشل الرفض");
        }
      },
    });
  };

  const columns: ColumnsType<Leave> = [
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
      title: "نوع الإجازة",
      dataIndex: "type",
      key: "type",
      render: (type) => {
        const config = leaveTypeConfig[type] || { color: "default", text: type };
        return <Tag color={config.color}>{config.text}</Tag>;
      },
    },
    {
      title: "الفترة",
      key: "period",
      render: (_, record) => (
        <Space direction="vertical" size={0}>
          <Space>
            <DateDisplay date={record.startDate} />
            <span>-</span>
            <DateDisplay date={record.endDate} />
          </Space>
          <span style={{ color: "#8c8c8c", fontSize: "12px" }}>{record.days} يوم</span>
        </Space>
      ),
    },
    {
      title: "السبب",
      dataIndex: "reason",
      key: "reason",
      render: (reason) => reason || "-",
      ellipsis: true,
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
          {record.status === "pending" && (
            <>
              <Button
                type="primary"
                size="small"
                icon={<CheckCircleOutlined />}
                style={{ background: "#52c41a", borderColor: "#52c41a" }}
                onClick={() => handleApprove(record.id)}
              >
                موافقة
              </Button>
              <Button
                danger
                size="small"
                icon={<CloseCircleOutlined />}
                onClick={() => handleReject(record.id)}
              >
                رفض
              </Button>
            </>
          )}
          {record.status !== "pending" && (
            <span style={{ color: "#8c8c8c", fontSize: "12px" }}>
              {statusConfig[record.status]?.text || record.status}
            </span>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="طلبات الاجازات"
        subtitle="إدارة طلبات إجازات الموظفين"
        breadcrumbs={[
          { title: "الرئيسية", path: "/" },
          { title: "الموارد البشرية", path: "/hr" },
          { title: "الإجازات" },
        ]}
        extra={
          <Space>
            <Link to="/hr/employees">
              <Button icon={<TeamOutlined />}>الموظفون</Button>
            </Link>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => setShowForm(true)}
            >
              طلب إجازة
            </Button>
          </Space>
        }
      />

      {/* Stats Cards */}
      {stats && (
        <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
          <Col xs={12} sm={6}>
            <Card style={{ background: "linear-gradient(135deg, #fffbe6 0%, #ffe58f 100%)" }}>
              <Statistic
                title="قيد المراجعة"
                value={stats.pending}
                prefix={<ClockCircleOutlined style={{ color: "#faad14" }} />}
                valueStyle={{ color: "#faad14" }}
              />
            </Card>
          </Col>
          <Col xs={12} sm={6}>
            <Card style={{ background: "linear-gradient(135deg, #f6ffed 0%, #d9f7be 100%)" }}>
              <Statistic
                title="موافق عليها"
                value={stats.approved}
                prefix={<CheckCircleOutlined style={{ color: "#52c41a" }} />}
                valueStyle={{ color: "#52c41a" }}
              />
            </Card>
          </Col>
          <Col xs={12} sm={6}>
            <Card style={{ background: "linear-gradient(135deg, #fff2f0 0%, #ffccc7 100%)" }}>
              <Statistic
                title="مرفوضة"
                value={stats.rejected}
                prefix={<CloseCircleOutlined style={{ color: "#ff4d4f" }} />}
                valueStyle={{ color: "#ff4d4f" }}
              />
            </Card>
          </Col>
          <Col xs={12} sm={6}>
            <Card style={{ background: "linear-gradient(135deg, #e6f4ff 0%, #bae0ff 100%)" }}>
              <Statistic
                title="في إجازة حالياً"
                value={stats.currentlyOnLeave}
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
          <Select
            value={statusFilter}
            onChange={(value) => setStatusFilter(value)}
            placeholder="جميع الحالات"
            style={{ minWidth: 150 }}
            allowClear
          >
            <Select.Option value="">جميع الحالات</Select.Option>
            <Select.Option value="pending">قيد المراجعة</Select.Option>
            <Select.Option value="approved">موافق عليها</Select.Option>
            <Select.Option value="rejected">مرفوضة</Select.Option>
          </Select>
          <Select
            value={typeFilter}
            onChange={(value) => setTypeFilter(value)}
            placeholder="جميع الأنواع"
            style={{ minWidth: 150 }}
            allowClear
          >
            <Select.Option value="">جميع الأنواع</Select.Option>
            <Select.Option value="annual">سنوية</Select.Option>
            <Select.Option value="sick">مرضية</Select.Option>
            <Select.Option value="personal">شخصية</Select.Option>
            <Select.Option value="maternity">أمومة</Select.Option>
            <Select.Option value="unpaid">بدون راتب</Select.Option>
          </Select>
        </Space>
      </Card>

      {/* Leaves Table */}
      <Card bodyStyle={{ padding: 0 }}>
        {loading ? (
          <LoadingSkeleton />
        ) : data.length === 0 ? (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description="لا توجد طلبات إجازات"
            style={{ padding: "48px 0" }}
          >
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => setShowForm(true)}
            >
              طلب إجازة جديد
            </Button>
          </Empty>
        ) : (
          <Table
            columns={columns}
            dataSource={data}
            rowKey="id"
            pagination={{
              pageSize: 10,
              showSizeChanger: true,
              showTotal: (total) => `إجمالي ${total} طلب`,
            }}
          />
        )}
      </Card>

      {/* Add Leave Modal */}
      <Modal
        title="طلب إجازة جديد"
        open={showForm}
        onCancel={() => {
          setShowForm(false);
          form.resetFields();
        }}
        footer={null}
        destroyOnClose
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          initialValues={{
            employeeId: employeeId || "",
            type: "annual",
          }}
        >
          <Form.Item
            label="الموظف"
            name="employeeId"
            rules={[{ required: true, message: "الموظف مطلوب" }]}
          >
            <Select placeholder="اختر الموظف" showSearch optionFilterProp="children">
              {employees.map((e) => (
                <Select.Option key={e.id} value={e.id}>
                  {e.user?.fullName || e.employeeCode}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            label="نوع الإجازة"
            name="type"
            rules={[{ required: true, message: "نوع الإجازة مطلوب" }]}
          >
            <Select>
              <Select.Option value="annual">سنوية</Select.Option>
              <Select.Option value="sick">مرضية</Select.Option>
              <Select.Option value="personal">شخصية</Select.Option>
              <Select.Option value="maternity">أمومة</Select.Option>
              <Select.Option value="unpaid">بدون راتب</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item
            label="فترة الإجازة"
            name="dates"
            rules={[{ required: true, message: "فترة الإجازة مطلوبة" }]}
          >
            <DatePicker.RangePicker style={{ width: "100%" }} />
          </Form.Item>

          <Form.Item label="السبب" name="reason">
            <Input.TextArea rows={3} placeholder="سبب الإجازة..." />
          </Form.Item>

          <Form.Item style={{ marginBottom: 0, marginTop: 24 }}>
            <Space style={{ width: "100%", justifyContent: "flex-end" }}>
              <Button
                onClick={() => {
                  setShowForm(false);
                  form.resetFields();
                }}
              >
                إلغاء
              </Button>
              <Button type="primary" htmlType="submit" loading={submitting}>
                {submitting ? "جاري الإرسال..." : "إرسال الطلب"}
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
