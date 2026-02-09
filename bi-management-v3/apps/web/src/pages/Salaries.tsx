import { useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import {
  Row,
  Col,
  Card,
  Table,
  Button,
  Select,
  Form,
  Modal,
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
  DollarOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  FileTextOutlined,
  WalletOutlined,
} from "@ant-design/icons";
import { PageHeader, StatusTag, MoneyDisplay, DateDisplay, LoadingSkeleton } from "../components/shared";
import { API_BASE, getAuthHeaders } from "../utils/api";
import type { ColumnsType } from "antd/es/table";
import dayjs from "dayjs";

type Salary = {
  id: string;
  employeeId: string;
  periodStart: string;
  periodEnd: string;
  basicSalary: number;
  allowances: number;
  overtime: number;
  bonuses: number;
  deductions: number;
  advancesDeducted: number;
  netSalary: number;
  status: string;
  paidAt: string | null;
  employee: {
    id: string;
    employeeCode: string;
    user: { fullName: string; avatar: string | null } | null;
  } | null;
};

type SalaryStats = {
  totalPaid: number;
  totalPending: number;
  totalDraft: number;
  monthlyTotal: number;
};

const statusConfig: Record<string, { color: string; text: string }> = {
  draft: { color: "default", text: "مسودة" },
  approved: { color: "warning", text: "بانتظار الدفع" },
  paid: { color: "success", text: "مدفوع" },
};

export default function Salaries() {
  const [searchParams] = useSearchParams();
  const employeeId = searchParams.get("employee");

  const [data, setData] = useState<Salary[]>([]);
  const [stats, setStats] = useState<SalaryStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [generating, setGenerating] = useState(false);

  const [form] = Form.useForm();

  useEffect(() => {
    document.title = "الرواتب | BI Management v3";

    // Set default period to current month
    const now = new Date();
    const start = dayjs(new Date(now.getFullYear(), now.getMonth(), 1));
    const end = dayjs(new Date(now.getFullYear(), now.getMonth() + 1, 0));
    form.setFieldsValue({ periodStart: start, periodEnd: end });
  }, [form]);

  const loadData = () => {
    setLoading(true);

    const params = new URLSearchParams();
    if (employeeId) params.append("employeeId", employeeId);
    if (statusFilter) params.append("status", statusFilter);

    Promise.all([
      fetch(`${API_BASE}/api/salaries?${params}`, { headers: getAuthHeaders() }).then((r) => r.json()),
      fetch(`${API_BASE}/api/salaries/stats`, { headers: getAuthHeaders() }).then((r) => r.json()),
    ])
      .then(([salariesRes, statsRes]) => {
        setData(salariesRes.items || []);
        setStats(statsRes);
      })
      .catch((e) => message.error(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
  }, [statusFilter, employeeId]);

  const handleGenerate = async (values: { periodStart: dayjs.Dayjs; periodEnd: dayjs.Dayjs }) => {
    setGenerating(true);
    try {
      const res = await fetch(`${API_BASE}/api/salaries/generate`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          periodStart: values.periodStart.format("YYYY-MM-DD"),
          periodEnd: values.periodEnd.format("YYYY-MM-DD"),
          createdBy: "current-user",
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      message.success(`تم إنشاء ${data.salaries?.length || 0} كشف راتب`);
      setShowGenerateModal(false);
      loadData();
    } catch (err) {
      message.error(err instanceof Error ? err.message : "فشل إنشاء الرواتب");
    } finally {
      setGenerating(false);
    }
  };

  const handleApprove = async (id: string) => {
    try {
      await fetch(`${API_BASE}/api/salaries/${id}/approve`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({ approvedBy: "current-user" }),
      });
      message.success("تمت الموافقة بنجاح");
      loadData();
    } catch {
      message.error("فشل الموافقة");
    }
  };

  const handlePay = async (id: string) => {
    Modal.confirm({
      title: "تأكيد الدفع",
      content: "اختر طريقة الدفع",
      okText: "تحويل بنكي",
      cancelText: "نقدي",
      onOk: async () => {
        try {
          await fetch(`${API_BASE}/api/salaries/${id}/pay`, {
            method: "POST",
            headers: getAuthHeaders(),
            body: JSON.stringify({ paymentMethod: "تحويل بنكي" }),
          });
          message.success("تم الدفع بنجاح");
          loadData();
        } catch {
          message.error("فشل الدفع");
        }
      },
      onCancel: async () => {
        try {
          await fetch(`${API_BASE}/api/salaries/${id}/pay`, {
            method: "POST",
            headers: getAuthHeaders(),
            body: JSON.stringify({ paymentMethod: "نقدي" }),
          });
          message.success("تم الدفع بنجاح");
          loadData();
        } catch {
          message.error("فشل الدفع");
        }
      },
    });
  };

  const formatCurrency = (n: number) => {
    return n.toLocaleString("ar-SA") + " د.ع";
  };

  const columns: ColumnsType<Salary> = [
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
      title: "الفترة",
      key: "period",
      render: (_, record) => (
        <Space direction="vertical" size={0}>
          <DateDisplay date={record.periodStart} />
          <span style={{ color: "#8c8c8c" }}>إلى</span>
          <DateDisplay date={record.periodEnd} />
        </Space>
      ),
    },
    {
      title: "الراتب الأساسي",
      dataIndex: "basicSalary",
      key: "basicSalary",
      render: (value) => <MoneyDisplay amount={value} />,
    },
    {
      title: "الإضافات",
      key: "additions",
      render: (_, record) => (
        <span style={{ color: "#52c41a" }}>
          +{formatCurrency(record.allowances + record.overtime + record.bonuses)}
        </span>
      ),
    },
    {
      title: "الخصومات",
      key: "deductions",
      render: (_, record) => (
        <span style={{ color: "#ff4d4f" }}>
          -{formatCurrency(record.deductions + record.advancesDeducted)}
        </span>
      ),
    },
    {
      title: "الصافي",
      dataIndex: "netSalary",
      key: "netSalary",
      render: (value) => (
        <span style={{ fontWeight: 600, color: "#1890ff" }}>
          <MoneyDisplay amount={value} />
        </span>
      ),
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
          {record.status === "draft" && (
            <Button
              type="primary"
              size="small"
              style={{ background: "#faad14", borderColor: "#faad14" }}
              onClick={() => handleApprove(record.id)}
            >
              موافقة
            </Button>
          )}
          {record.status === "approved" && (
            <Button
              type="primary"
              size="small"
              style={{ background: "#52c41a", borderColor: "#52c41a" }}
              onClick={() => handlePay(record.id)}
            >
              دفع
            </Button>
          )}
          {record.status === "paid" && (
            <span style={{ color: "#8c8c8c", fontSize: "12px" }}>
              {record.paidAt ? <DateDisplay date={record.paidAt} /> : "مدفوع"}
            </span>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="كشوفات الرواتب"
        subtitle="إدارة رواتب الموظفين والمدفوعات"
        breadcrumbs={[
          { title: "الرئيسية", path: "/" },
          { title: "الموارد البشرية", path: "/hr" },
          { title: "الرواتب" },
        ]}
        extra={
          <Space>
            <Link to="/hr/employees">
              <Button icon={<TeamOutlined />}>الموظفون</Button>
            </Link>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => setShowGenerateModal(true)}
            >
              إنشاء كشوفات
            </Button>
          </Space>
        }
      />

      {/* Stats Cards */}
      {stats && (
        <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
          <Col xs={12} sm={6}>
            <Card style={{ background: "linear-gradient(135deg, #f6ffed 0%, #d9f7be 100%)" }}>
              <Statistic
                title="إجمالي المدفوع"
                value={stats.totalPaid}
                prefix={<CheckCircleOutlined style={{ color: "#52c41a" }} />}
                valueStyle={{ color: "#52c41a", fontSize: "18px" }}
                suffix="د.ع"
              />
            </Card>
          </Col>
          <Col xs={12} sm={6}>
            <Card style={{ background: "linear-gradient(135deg, #fffbe6 0%, #ffe58f 100%)" }}>
              <Statistic
                title="بانتظار الدفع"
                value={stats.totalPending}
                prefix={<ClockCircleOutlined style={{ color: "#faad14" }} />}
                valueStyle={{ color: "#faad14", fontSize: "18px" }}
                suffix="د.ع"
              />
            </Card>
          </Col>
          <Col xs={12} sm={6}>
            <Card style={{ background: "linear-gradient(135deg, #f5f5f5 0%, #e8e8e8 100%)" }}>
              <Statistic
                title="مسودات"
                value={stats.totalDraft}
                prefix={<FileTextOutlined style={{ color: "#8c8c8c" }} />}
                valueStyle={{ color: "#595959", fontSize: "18px" }}
                suffix="د.ع"
              />
            </Card>
          </Col>
          <Col xs={12} sm={6}>
            <Card style={{ background: "linear-gradient(135deg, #e6f4ff 0%, #bae0ff 100%)" }}>
              <Statistic
                title="هذا الشهر"
                value={stats.monthlyTotal}
                prefix={<WalletOutlined style={{ color: "#1890ff" }} />}
                valueStyle={{ color: "#1890ff", fontSize: "18px" }}
                suffix="د.ع"
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
            <Select.Option value="draft">مسودة</Select.Option>
            <Select.Option value="approved">بانتظار الدفع</Select.Option>
            <Select.Option value="paid">مدفوع</Select.Option>
          </Select>
        </Space>
      </Card>

      {/* Salaries Table */}
      <Card bodyStyle={{ padding: 0 }}>
        {loading ? (
          <LoadingSkeleton />
        ) : data.length === 0 ? (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description="لا توجد كشوفات رواتب"
            style={{ padding: "48px 0" }}
          >
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => setShowGenerateModal(true)}
            >
              إنشاء كشوفات جديدة
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
              showTotal: (total) => `إجمالي ${total} كشف`,
            }}
          />
        )}
      </Card>

      {/* Generate Modal */}
      <Modal
        title="إنشاء كشوفات الرواتب"
        open={showGenerateModal}
        onCancel={() => setShowGenerateModal(false)}
        footer={null}
        destroyOnClose
      >
        <p style={{ color: "#8c8c8c", marginBottom: 16 }}>
          سيتم إنشاء كشف راتب لجميع الموظفين النشطين للفترة المحددة
        </p>
        <Form form={form} layout="vertical" onFinish={handleGenerate}>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label="من تاريخ"
                name="periodStart"
                rules={[{ required: true, message: "التاريخ مطلوب" }]}
              >
                <DatePicker style={{ width: "100%" }} placeholder="اختر التاريخ" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="إلى تاريخ"
                name="periodEnd"
                rules={[{ required: true, message: "التاريخ مطلوب" }]}
              >
                <DatePicker style={{ width: "100%" }} placeholder="اختر التاريخ" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item style={{ marginBottom: 0, marginTop: 16 }}>
            <Space style={{ width: "100%", justifyContent: "flex-end" }}>
              <Button onClick={() => setShowGenerateModal(false)}>إلغاء</Button>
              <Button type="primary" htmlType="submit" loading={generating}>
                {generating ? "جاري الإنشاء..." : "إنشاء الكشوفات"}
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
