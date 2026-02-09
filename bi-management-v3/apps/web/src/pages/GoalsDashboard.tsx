/**
 * صفحة لوحة الأهداف والمؤشرات
 */
import { useState, useEffect } from "react";
import { Row, Col, Card, Button, Select, Tag, Space, message, Statistic, Progress, Modal, Input, Form, DatePicker, Empty } from "antd";
import { PlusOutlined, AimOutlined, SyncOutlined, DashboardOutlined, TrophyOutlined, WarningOutlined, CloseCircleOutlined, CheckCircleOutlined, RiseOutlined } from "@ant-design/icons";
import { PageHeader, DateDisplay, LoadingSkeleton } from "../components/shared";
import { API_BASE, getAuthHeaders } from "../utils/api";

interface KPI {
  id: string;
  name: string;
  category: string;
  kpiType: string;
  unit: string | null;
  direction: string;
}

interface Goal {
  id: string;
  name: string;
  description: string | null;
  targetValue: string;
  currentValue: string;
  progressPercentage: number;
  status: string;
  priority: string;
  period: string;
  startDate: string;
  endDate: string;
  scope: string;
}

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  not_started: { label: "لم يبدأ", color: "default" },
  on_track: { label: "على المسار", color: "success" },
  at_risk: { label: "في خطر", color: "warning" },
  behind: { label: "متأخر", color: "error" },
  achieved: { label: "تحقق", color: "blue" },
  exceeded: { label: "تجاوز", color: "purple" },
};

const CATEGORY_CONFIG: Record<string, { label: string; icon: string }> = {
  sales: { label: "المبيعات", icon: "💰" },
  finance: { label: "المالية", icon: "📊" },
  operations: { label: "العمليات", icon: "⚙️" },
  hr: { label: "الموارد البشرية", icon: "👥" },
  customer: { label: "العملاء", icon: "🤝" },
  inventory: { label: "المخزون", icon: "📦" },
};

const PRIORITY_COLORS: Record<string, string> = {
  low: "default",
  medium: "warning",
  high: "error",
  critical: "purple",
};

export default function GoalsDashboard() {
  const [kpis, setKpis] = useState<KPI[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");
  const [showAddGoalModal, setShowAddGoalModal] = useState(false);
  const [form] = Form.useForm();

  useEffect(() => { loadData(); }, [statusFilter]);

  const loadData = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter) params.append("status", statusFilter);

      const [kpisRes, goalsRes, statsRes] = await Promise.all([
        fetch(`${API_BASE}/api/kpis`, { headers: getAuthHeaders() }),
        fetch(`${API_BASE}/api/kpis/goals?${params}`, { headers: getAuthHeaders() }),
        fetch(`${API_BASE}/api/kpis/stats`, { headers: getAuthHeaders() }),
      ]);
      if (kpisRes.ok) setKpis((await kpisRes.json()).kpis || []);
      if (goalsRes.ok) setGoals((await goalsRes.json()).goals || []);
      if (statsRes.ok) setStats(await statsRes.json());
    } catch (error) { console.error(error); }
    finally { setLoading(false); }
  };

  const handleAddGoal = async (values: any) => {
    try {
      const res = await fetch(`${API_BASE}/api/kpis/goals`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          name: values.name,
          targetValue: values.targetValue,
          period: values.period,
          priority: values.priority,
          startDate: values.dates?.[0]?.format("YYYY-MM-DD"),
          endDate: values.dates?.[1]?.format("YYYY-MM-DD"),
        }),
      });
      if (res.ok) {
        message.success("تم إنشاء الهدف بنجاح");
        setShowAddGoalModal(false);
        form.resetFields();
        loadData();
      } else {
        message.error("فشل في إنشاء الهدف");
      }
    } catch (error) {
      console.error(error);
      message.error("حدث خطأ أثناء إنشاء الهدف");
    }
  };

  const updateGoalProgress = async (goalId: string) => {
    const value = prompt("أدخل القيمة الحالية:");
    if (!value) return;
    try {
      await fetch(`${API_BASE}/api/kpis/goals/${goalId}/update`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({ currentValue: value }),
      });
      message.success("تم تحديث التقدم");
      loadData();
    } catch (error) {
      console.error(error);
      message.error("فشل في تحديث التقدم");
    }
  };

  const getProgressStatus = (percentage: number): "success" | "normal" | "exception" | "active" => {
    if (percentage >= 100) return "success";
    if (percentage >= 75) return "active";
    if (percentage >= 50) return "normal";
    return "exception";
  };

  if (loading) {
    return <LoadingSkeleton />;
  }

  return (
    <div>
      <PageHeader
        title="الأهداف والمؤشرات"
        subtitle="تتبع أداء الشركة ومؤشرات النجاح"
        breadcrumbs={[
          { label: "الرئيسية", href: "/" },
          { label: "الأهداف والمؤشرات" },
        ]}
        icon={<AimOutlined />}
        extra={
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setShowAddGoalModal(true)}>
            هدف جديد
          </Button>
        }
      />

      {/* الإحصائيات */}
      {stats && (
        <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
          <Col xs={12} sm={8} md={4}>
            <Card size="small">
              <Statistic
                title="مؤشرات الأداء"
                value={stats.totalKpis}
                prefix={<DashboardOutlined />}
                valueStyle={{ color: "#2563eb" }}
              />
            </Card>
          </Col>
          <Col xs={12} sm={8} md={4}>
            <Card size="small">
              <Statistic
                title="الأهداف"
                value={stats.totalGoals}
                prefix={<AimOutlined />}
              />
            </Card>
          </Col>
          <Col xs={12} sm={8} md={4}>
            <Card size="small">
              <Statistic
                title="محقق"
                value={stats.goalsByStatus?.achieved || 0}
                prefix={<TrophyOutlined />}
                valueStyle={{ color: "#059669" }}
              />
            </Card>
          </Col>
          <Col xs={12} sm={8} md={4}>
            <Card size="small">
              <Statistic
                title="على المسار"
                value={stats.goalsByStatus?.on_track || 0}
                prefix={<CheckCircleOutlined />}
                valueStyle={{ color: "#059669" }}
              />
            </Card>
          </Col>
          <Col xs={12} sm={8} md={4}>
            <Card size="small">
              <Statistic
                title="في خطر"
                value={stats.goalsByStatus?.at_risk || 0}
                prefix={<WarningOutlined />}
                valueStyle={{ color: "#d97706" }}
              />
            </Card>
          </Col>
          <Col xs={12} sm={8} md={4}>
            <Card size="small">
              <Statistic
                title="متأخر"
                value={stats.goalsByStatus?.behind || 0}
                prefix={<CloseCircleOutlined />}
                valueStyle={{ color: "#dc2626" }}
              />
            </Card>
          </Col>
        </Row>
      )}

      {/* الفلاتر */}
      <Space style={{ marginBottom: 16 }}>
        <Select
          value={statusFilter}
          onChange={setStatusFilter}
          style={{ width: 200 }}
          placeholder="كل الحالات"
          allowClear
        >
          {Object.entries(STATUS_CONFIG).map(([k, v]) => (
            <Select.Option key={k} value={k}>{v.label}</Select.Option>
          ))}
        </Select>
      </Space>

      {/* الأهداف */}
      {goals.length === 0 ? (
        <Card>
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description="لا توجد أهداف"
          >
            <Button type="primary" icon={<PlusOutlined />} onClick={() => setShowAddGoalModal(true)}>
              ابدأ بإضافة أهداف لتتبع الأداء
            </Button>
          </Empty>
        </Card>
      ) : (
        <Row gutter={[16, 16]}>
          {goals.map(goal => {
            const status = STATUS_CONFIG[goal.status] || STATUS_CONFIG.on_track;
            return (
              <Col xs={24} sm={12} lg={8} key={goal.id}>
                <Card
                  title={
                    <Space>
                      <AimOutlined />
                      <span>{goal.name}</span>
                    </Space>
                  }
                  extra={<Tag color={PRIORITY_COLORS[goal.priority]}>{goal.priority}</Tag>}
                  actions={[
                    <Tag color={status.color} key="status">{status.label}</Tag>,
                    <span key="date"><DateDisplay date={goal.endDate} /></span>,
                    <Button type="link" size="small" icon={<SyncOutlined />} onClick={() => updateGoalProgress(goal.id)} key="update">
                      تحديث
                    </Button>,
                  ]}
                >
                  {goal.description && (
                    <p style={{ color: "#6b7280", marginBottom: 16 }}>{goal.description}</p>
                  )}

                  {/* شريط التقدم */}
                  <div style={{ marginBottom: 16 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                      <span>التقدم</span>
                      <span style={{ fontWeight: 600 }}>{goal.progressPercentage}%</span>
                    </div>
                    <Progress
                      percent={goal.progressPercentage}
                      status={getProgressStatus(goal.progressPercentage)}
                      showInfo={false}
                    />
                  </div>

                  {/* القيم */}
                  <Row gutter={16}>
                    <Col span={8}>
                      <Statistic
                        title="الحالي"
                        value={Number(goal.currentValue)}
                        valueStyle={{ fontSize: 16 }}
                      />
                    </Col>
                    <Col span={8}>
                      <Statistic
                        title="الهدف"
                        value={Number(goal.targetValue)}
                        valueStyle={{ fontSize: 16 }}
                      />
                    </Col>
                    <Col span={8}>
                      <Statistic
                        title="المتبقي"
                        value={Math.max(0, Number(goal.targetValue) - Number(goal.currentValue))}
                        valueStyle={{ fontSize: 16 }}
                      />
                    </Col>
                  </Row>
                </Card>
              </Col>
            );
          })}
        </Row>
      )}

      {/* مؤشرات الأداء */}
      {kpis.length > 0 && (
        <div style={{ marginTop: 32 }}>
          <Card title={<Space><DashboardOutlined /> مؤشرات الأداء الرئيسية</Space>}>
            <Row gutter={[12, 12]}>
              {kpis.map(kpi => {
                const category = CATEGORY_CONFIG[kpi.category] || CATEGORY_CONFIG.sales;
                return (
                  <Col xs={12} sm={8} md={6} lg={4} key={kpi.id}>
                    <Card size="small">
                      <Space direction="vertical" size={4}>
                        <Space>
                          <span style={{ fontSize: 20 }}>{category.icon}</span>
                          <span style={{ fontWeight: 500 }}>{kpi.name}</span>
                        </Space>
                        <span style={{ fontSize: 12, color: "#9ca3af" }}>
                          {category.label} • {kpi.unit || "قيمة"}
                        </span>
                      </Space>
                    </Card>
                  </Col>
                );
              })}
            </Row>
          </Card>
        </div>
      )}

      {/* موديل إضافة */}
      <Modal
        title={<Space><AimOutlined /> هدف جديد</Space>}
        open={showAddGoalModal}
        onCancel={() => setShowAddGoalModal(false)}
        footer={null}
        width={500}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleAddGoal}
          initialValues={{ period: "monthly", priority: "medium" }}
        >
          <Form.Item
            name="name"
            label="اسم الهدف"
            rules={[{ required: true, message: "يرجى إدخال اسم الهدف" }]}
          >
            <Input placeholder="مثال: تحقيق مبيعات 100 مليون" />
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="targetValue"
                label="القيمة المستهدفة"
                rules={[{ required: true, message: "يرجى إدخال القيمة المستهدفة" }]}
              >
                <Input type="number" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="period" label="الفترة">
                <Select>
                  <Select.Option value="daily">يومي</Select.Option>
                  <Select.Option value="weekly">أسبوعي</Select.Option>
                  <Select.Option value="monthly">شهري</Select.Option>
                  <Select.Option value="quarterly">ربع سنوي</Select.Option>
                  <Select.Option value="yearly">سنوي</Select.Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="dates" label="الفترة الزمنية">
            <DatePicker.RangePicker style={{ width: "100%" }} />
          </Form.Item>

          <Form.Item name="priority" label="الأولوية">
            <Select>
              <Select.Option value="low">منخفضة</Select.Option>
              <Select.Option value="medium">متوسطة</Select.Option>
              <Select.Option value="high">عالية</Select.Option>
              <Select.Option value="critical">حرجة</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item style={{ marginBottom: 0, textAlign: "left" }}>
            <Space>
              <Button onClick={() => setShowAddGoalModal(false)}>إلغاء</Button>
              <Button type="primary" htmlType="submit">إنشاء</Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
