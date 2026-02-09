/**
 * صفحة إدارة الميزانية
 */
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
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
  Progress,
  DatePicker,
  InputNumber,
  Alert,
  List,
} from "antd";
import {
  PlusOutlined,
  WalletOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  FileTextOutlined,
  DollarOutlined,
  CalendarOutlined,
  ExclamationCircleOutlined,
  WarningOutlined,
} from "@ant-design/icons";
import { PageHeader, StatusTag, MoneyDisplay, DateDisplay, LoadingSkeleton } from "../components/shared";
import { API_BASE, getAuthHeaders } from "../utils/api";
import type { ColumnsType } from "antd/es/table";
import dayjs from "dayjs";

interface Budget {
  id: string;
  name: string;
  fiscalYear: number;
  totalBudget: string;
  totalSpent: string;
  status: string;
  startDate: string;
  endDate: string;
}

interface BudgetDetail extends Budget {
  items: Array<{ id: string; name: string; category: string; budgetedAmount: string; spentAmount: string }>;
  expenses: Array<{ id: string; description: string; amount: string; expenseDate: string }>;
  alerts: Array<{ id: string; message: string; severity: string }>;
}

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  draft: { label: "مسودة", color: "default" },
  pending_approval: { label: "بانتظار الموافقة", color: "warning" },
  approved: { label: "معتمدة", color: "processing" },
  active: { label: "نشطة", color: "success" },
  closed: { label: "مغلقة", color: "default" },
};

export default function BudgetManagement() {
  const navigate = useNavigate();
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [selectedBudget, setSelectedBudget] = useState<BudgetDetail | null>(null);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [form] = Form.useForm();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [res, statsRes] = await Promise.all([
        fetch(`${API_BASE}/api/budgets`, { headers: getAuthHeaders() }),
        fetch(`${API_BASE}/api/budgets/stats`, { headers: getAuthHeaders() }),
      ]);
      if (res.ok) setBudgets((await res.json()).budgets || []);
      if (statsRes.ok) setStats(await statsRes.json());
    } catch (error) {
      console.error(error);
      message.error("حدث خطأ في تحميل البيانات");
    } finally {
      setLoading(false);
    }
  };

  const loadBudgetDetail = async (id: string) => {
    try {
      const res = await fetch(`${API_BASE}/api/budgets/${id}`, { headers: getAuthHeaders() });
      if (res.ok) setSelectedBudget(await res.json());
    } catch (error) {
      console.error(error);
    }
  };

  const handleCreate = async (values: any) => {
    try {
      const payload = {
        name: values.name,
        fiscalYear: values.fiscalYear,
        totalBudget: values.totalBudget,
        startDate: values.startDate?.format("YYYY-MM-DD"),
        endDate: values.endDate?.format("YYYY-MM-DD"),
      };
      const res = await fetch(`${API_BASE}/api/budgets`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        message.success("تم إنشاء الميزانية بنجاح");
        setShowCreateModal(false);
        form.resetFields();
        loadData();
      } else {
        message.error("فشل في إنشاء الميزانية");
      }
    } catch (error) {
      console.error(error);
      message.error("حدث خطأ");
    }
  };

  const changeStatus = async (id: string, status: string) => {
    try {
      await fetch(`${API_BASE}/api/budgets/${id}/status`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({ status }),
      });
      message.success("تم تحديث الحالة");
      loadData();
      if (selectedBudget?.id === id) loadBudgetDetail(id);
    } catch (error) {
      console.error(error);
      message.error("حدث خطأ");
    }
  };

  const getSpentPercentage = (spent: string, total: string) => {
    const s = parseFloat(spent || "0");
    const t = parseFloat(total || "1");
    return Math.min((s / t) * 100, 100);
  };

  const getProgressStatus = (percent: number): "success" | "normal" | "exception" | "active" => {
    if (percent > 90) return "exception";
    if (percent > 70) return "active";
    return "success";
  };

  const columns: ColumnsType<Budget> = [
    {
      title: "اسم الميزانية",
      dataIndex: "name",
      key: "name",
      render: (text, record) => (
        <a onClick={() => loadBudgetDetail(record.id)} style={{ fontWeight: 500 }}>
          {text}
        </a>
      ),
    },
    {
      title: "السنة المالية",
      dataIndex: "fiscalYear",
      key: "fiscalYear",
      width: 120,
    },
    {
      title: "الحالة",
      dataIndex: "status",
      key: "status",
      width: 140,
      render: (status) => {
        const config = STATUS_CONFIG[status] || STATUS_CONFIG.draft;
        return <Tag color={config.color}>{config.label}</Tag>;
      },
    },
    {
      title: "إجمالي الميزانية",
      dataIndex: "totalBudget",
      key: "totalBudget",
      width: 160,
      render: (value) => <MoneyDisplay amount={value} currency="IQD" />,
    },
    {
      title: "المصروف",
      dataIndex: "totalSpent",
      key: "totalSpent",
      width: 160,
      render: (value) => <MoneyDisplay amount={value} currency="IQD" />,
    },
    {
      title: "نسبة الصرف",
      key: "progress",
      width: 180,
      render: (_, record) => {
        const percent = getSpentPercentage(record.totalSpent, record.totalBudget);
        return (
          <Progress
            percent={Math.round(percent)}
            size="small"
            status={getProgressStatus(percent)}
          />
        );
      },
    },
  ];

  const breadcrumbs = [
    { title: "الرئيسية", path: "/" },
    { title: "إدارة الميزانية" },
  ];

  if (loading) {
    return <LoadingSkeleton />;
  }

  return (
    <div>
      <PageHeader
        title="إدارة الميزانية"
        subtitle="التخطيط المالي ومتابعة الصرف"
        breadcrumbs={breadcrumbs}
        icon={<WalletOutlined />}
        extra={
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setShowCreateModal(true)}>
            ميزانية جديدة
          </Button>
        }
      />

      {/* الميزانية النشطة */}
      {stats?.activeBudget && (
        <Card
          style={{
            marginBottom: 24,
            background: "linear-gradient(135deg, #059669 0%, #047857 100%)",
            border: "none",
          }}
          bodyStyle={{ padding: 24 }}
        >
          <Row justify="space-between" align="top">
            <Col>
              <div style={{ color: "rgba(255,255,255,0.8)", fontSize: 14 }}>
                الميزانية النشطة {stats.activeBudget.fiscalYear}
              </div>
              <div style={{ color: "#fff", fontSize: 24, fontWeight: 700, marginTop: 4 }}>
                {stats.activeBudget.name}
              </div>
            </Col>
            <Col style={{ textAlign: "left" }}>
              <div style={{ color: "#fff", fontSize: 32, fontWeight: 700 }}>
                {Number(stats.activeBudget.totalBudget).toLocaleString()} IQD
              </div>
              <div style={{ color: "rgba(255,255,255,0.8)", fontSize: 14 }}>
                إجمالي الميزانية
              </div>
            </Col>
          </Row>
          <div style={{ marginTop: 16 }}>
            <Row justify="space-between" style={{ marginBottom: 8, color: "#fff", fontSize: 14 }}>
              <span>المصروف: {Number(stats.activeBudget.totalSpent).toLocaleString()} IQD</span>
              <span>
                {getSpentPercentage(stats.activeBudget.totalSpent, stats.activeBudget.totalBudget).toFixed(1)}%
              </span>
            </Row>
            <Progress
              percent={getSpentPercentage(stats.activeBudget.totalSpent, stats.activeBudget.totalBudget)}
              showInfo={false}
              strokeColor="#fff"
              trailColor="rgba(255,255,255,0.3)"
            />
          </div>
        </Card>
      )}

      <Row gutter={24}>
        {/* قائمة الميزانيات */}
        <Col xs={24} lg={selectedBudget ? 12 : 24}>
          <Card title="جميع الميزانيات" style={{ marginBottom: 24 }}>
            {budgets.length === 0 ? (
              <Empty
                image={<WalletOutlined style={{ fontSize: 64, color: "#d9d9d9" }} />}
                description="لا توجد ميزانيات"
              />
            ) : (
              <Table
                dataSource={budgets}
                columns={columns}
                rowKey="id"
                pagination={{ pageSize: 10 }}
                onRow={(record) => ({
                  onClick: () => loadBudgetDetail(record.id),
                  style: {
                    cursor: "pointer",
                    background: selectedBudget?.id === record.id ? "#f0f9ff" : undefined,
                  },
                })}
              />
            )}
          </Card>
        </Col>

        {/* تفاصيل الميزانية */}
        {selectedBudget && (
          <Col xs={24} lg={12}>
            <Card
              title={selectedBudget.name}
              extra={
                <Space>
                  {selectedBudget.status === "draft" && (
                    <Button
                      size="small"
                      type="primary"
                      ghost
                      onClick={() => changeStatus(selectedBudget.id, "pending_approval")}
                    >
                      طلب موافقة
                    </Button>
                  )}
                  {selectedBudget.status === "pending_approval" && (
                    <Button
                      size="small"
                      type="primary"
                      onClick={() => changeStatus(selectedBudget.id, "active")}
                    >
                      تفعيل
                    </Button>
                  )}
                </Space>
              }
              style={{ marginBottom: 24 }}
            >
              {/* التنبيهات */}
              {selectedBudget.alerts?.length > 0 && (
                <div style={{ marginBottom: 16 }}>
                  {selectedBudget.alerts.map((alert) => (
                    <Alert
                      key={alert.id}
                      message={alert.message}
                      type={alert.severity === "critical" ? "error" : "warning"}
                      showIcon
                      icon={alert.severity === "critical" ? <ExclamationCircleOutlined /> : <WarningOutlined />}
                      style={{ marginBottom: 8 }}
                    />
                  ))}
                </div>
              )}

              {/* البنود */}
              <div style={{ marginBottom: 16 }}>
                <h4 style={{ marginBottom: 12, fontWeight: 600 }}>بنود الميزانية</h4>
                {selectedBudget.items?.length === 0 ? (
                  <Empty description="لا توجد بنود" image={Empty.PRESENTED_IMAGE_SIMPLE} />
                ) : (
                  <List
                    dataSource={selectedBudget.items}
                    renderItem={(item) => {
                      const percent = getSpentPercentage(item.spentAmount, item.budgetedAmount);
                      return (
                        <List.Item style={{ padding: "12px 0" }}>
                          <div style={{ width: "100%" }}>
                            <Row justify="space-between" style={{ marginBottom: 4 }}>
                              <span style={{ fontWeight: 500 }}>{item.name}</span>
                              <span>{Number(item.budgetedAmount).toLocaleString()} IQD</span>
                            </Row>
                            <Progress percent={Math.round(percent)} size="small" />
                          </div>
                        </List.Item>
                      );
                    }}
                  />
                )}
              </div>
            </Card>

            {/* آخر المصروفات */}
            <Card title="آخر المصروفات">
              {selectedBudget.expenses?.length === 0 ? (
                <Empty description="لا توجد مصروفات" image={Empty.PRESENTED_IMAGE_SIMPLE} />
              ) : (
                <List
                  dataSource={selectedBudget.expenses?.slice(0, 5)}
                  renderItem={(exp) => (
                    <List.Item>
                      <List.Item.Meta
                        title={exp.description}
                        description={<DateDisplay date={exp.expenseDate} />}
                      />
                      <div style={{ fontWeight: 600 }}>
                        <MoneyDisplay amount={exp.amount} currency="IQD" />
                      </div>
                    </List.Item>
                  )}
                />
              )}
            </Card>
          </Col>
        )}
      </Row>

      {/* موديل إنشاء */}
      <Modal
        title="ميزانية جديدة"
        open={showCreateModal}
        onCancel={() => setShowCreateModal(false)}
        footer={null}
        width={500}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleCreate}
          initialValues={{
            fiscalYear: new Date().getFullYear(),
          }}
        >
          <Form.Item
            name="name"
            label="اسم الميزانية"
            rules={[{ required: true, message: "اسم الميزانية مطلوب" }]}
          >
            <Input placeholder="أدخل اسم الميزانية" />
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="fiscalYear" label="السنة المالية">
                <InputNumber style={{ width: "100%" }} min={2020} max={2030} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="totalBudget"
                label="إجمالي الميزانية"
                rules={[{ required: true, message: "إجمالي الميزانية مطلوب" }]}
              >
                <InputNumber
                  style={{ width: "100%" }}
                  min={0}
                  formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")}
                  parser={(value) => value!.replace(/\$\s?|(,*)/g, "")}
                  placeholder="0"
                />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="startDate" label="تاريخ البداية">
                <DatePicker style={{ width: "100%" }} placeholder="اختر التاريخ" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="endDate" label="تاريخ النهاية">
                <DatePicker style={{ width: "100%" }} placeholder="اختر التاريخ" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item style={{ marginBottom: 0, marginTop: 24 }}>
            <Space style={{ width: "100%", justifyContent: "flex-end" }}>
              <Button onClick={() => setShowCreateModal(false)}>إلغاء</Button>
              <Button type="primary" htmlType="submit">
                إنشاء
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
