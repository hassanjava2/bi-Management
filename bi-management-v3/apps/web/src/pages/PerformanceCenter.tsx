/**
 * مركز تقييم الأداء
 */
import { useState, useEffect } from "react";
import { Row, Col, Card, Button, Tag, Space, message, Statistic, Progress, Modal, Input, Form, DatePicker, InputNumber, Empty, Segmented } from "antd";
import { PlusOutlined, BarChartOutlined, CalendarOutlined, AimOutlined, CheckCircleOutlined, ClockCircleOutlined, SyncOutlined, PlayCircleOutlined } from "@ant-design/icons";
import { PageHeader, DateDisplay, LoadingSkeleton } from "../components/shared";
import { API_BASE, getAuthHeaders } from "../utils/api";

interface Cycle {
  id: string;
  name: string;
  cycleType: string;
  year: number;
  startDate: string;
  endDate: string;
  status: string;
}

interface Goal {
  id: string;
  title: string;
  description: string | null;
  targetValue: string | null;
  currentValue: string | null;
  progress: number;
  status: string;
  dueDate: string | null;
}

const CYCLE_STATUS: Record<string, { label: string; color: string }> = {
  draft: { label: "مسودة", color: "default" },
  active: { label: "نشطة", color: "success" },
  completed: { label: "مكتملة", color: "blue" },
  archived: { label: "مؤرشفة", color: "default" },
};

const GOAL_STATUS: Record<string, { label: string; color: string }> = {
  not_started: { label: "لم يبدأ", color: "default" },
  in_progress: { label: "قيد التنفيذ", color: "processing" },
  completed: { label: "مكتمل", color: "success" },
  cancelled: { label: "ملغي", color: "error" },
};

export default function PerformanceCenter() {
  const [cycles, setCycles] = useState<Cycle[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<string>("cycles");
  const [showCycleModal, setShowCycleModal] = useState(false);
  const [showGoalModal, setShowGoalModal] = useState(false);
  const [cycleForm] = Form.useForm();
  const [goalForm] = Form.useForm();

  useEffect(() => { loadData(); }, [activeTab]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [statsRes] = await Promise.all([fetch(`${API_BASE}/api/performance/stats`, { headers: getAuthHeaders() })]);
      if (statsRes.ok) setStats(await statsRes.json());

      if (activeTab === "cycles") {
        const res = await fetch(`${API_BASE}/api/performance/cycles`, { headers: getAuthHeaders() });
        if (res.ok) setCycles(await res.json());
      } else if (activeTab === "goals") {
        const res = await fetch(`${API_BASE}/api/performance/goals`, { headers: getAuthHeaders() });
        if (res.ok) setGoals(await res.json());
      }
    } catch (error) { console.error(error); }
    finally { setLoading(false); }
  };

  const createCycle = async (values: any) => {
    try {
      const res = await fetch(`${API_BASE}/api/performance/cycles`, {
        method: "POST",
        headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({
          name: values.name,
          cycleType: "annual",
          year: new Date().getFullYear(),
          startDate: values.dates?.[0]?.format("YYYY-MM-DD"),
          endDate: values.dates?.[1]?.format("YYYY-MM-DD"),
          goalsWeight: values.goalsWeight,
          competenciesWeight: values.competenciesWeight,
        }),
      });
      if (res.ok) {
        message.success("تم إنشاء دورة التقييم بنجاح");
        setShowCycleModal(false);
        cycleForm.resetFields();
        loadData();
      } else {
        message.error("فشل في إنشاء دورة التقييم");
      }
    } catch (error) {
      console.error(error);
      message.error("حدث خطأ أثناء إنشاء دورة التقييم");
    }
  };

  const activateCycle = async (id: string) => {
    try {
      await fetch(`${API_BASE}/api/performance/cycles/${id}/activate`, { method: "PATCH", headers: getAuthHeaders() });
      message.success("تم تفعيل الدورة");
      loadData();
    } catch (error) {
      console.error(error);
      message.error("فشل في تفعيل الدورة");
    }
  };

  const createGoal = async (values: any) => {
    try {
      const res = await fetch(`${API_BASE}/api/performance/goals`, {
        method: "POST",
        headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({
          title: values.title,
          description: values.description,
          targetValue: values.targetValue || null,
          unit: values.unit,
          dueDate: values.dueDate?.format("YYYY-MM-DD"),
          employeeId: "current_user",
        }),
      });
      if (res.ok) {
        message.success("تم إنشاء الهدف بنجاح");
        setShowGoalModal(false);
        goalForm.resetFields();
        loadData();
      } else {
        message.error("فشل في إنشاء الهدف");
      }
    } catch (error) {
      console.error(error);
      message.error("حدث خطأ أثناء إنشاء الهدف");
    }
  };

  const updateGoalProgress = async (id: string) => {
    const progress = prompt("أدخل نسبة التقدم (0-100):");
    if (!progress) return;
    try {
      await fetch(`${API_BASE}/api/performance/goals/${id}/progress`, {
        method: "PATCH",
        headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ progress: parseInt(progress) }),
      });
      message.success("تم تحديث التقدم");
      loadData();
    } catch (error) {
      console.error(error);
      message.error("فشل في تحديث التقدم");
    }
  };

  if (loading && !stats) {
    return <LoadingSkeleton />;
  }

  return (
    <div>
      <PageHeader
        title="تقييم الأداء"
        subtitle="إدارة دورات التقييم وأهداف الأداء"
        breadcrumbs={[
          { label: "الرئيسية", href: "/" },
          { label: "تقييم الأداء" },
        ]}
        icon={<BarChartOutlined />}
        extra={
          <Space>
            {activeTab === "cycles" && (
              <Button type="primary" icon={<PlusOutlined />} onClick={() => setShowCycleModal(true)}>
                دورة تقييم
              </Button>
            )}
            {activeTab === "goals" && (
              <Button type="primary" icon={<PlusOutlined />} onClick={() => setShowGoalModal(true)}>
                هدف جديد
              </Button>
            )}
          </Space>
        }
      />

      {/* الإحصائيات */}
      {stats && (
        <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
          <Col xs={12} sm={8} md={4}>
            <Card size="small">
              <Statistic
                title="دورات نشطة"
                value={stats.activeCycles}
                prefix={<PlayCircleOutlined />}
                valueStyle={{ color: "#059669" }}
              />
            </Card>
          </Col>
          <Col xs={12} sm={8} md={5}>
            <Card size="small">
              <Statistic
                title="تقييمات معلقة"
                value={stats.pendingReviews}
                prefix={<ClockCircleOutlined />}
                valueStyle={{ color: "#d97706" }}
              />
            </Card>
          </Col>
          <Col xs={12} sm={8} md={5}>
            <Card size="small">
              <Statistic
                title="تقييمات مكتملة"
                value={stats.completedReviews}
                prefix={<CheckCircleOutlined />}
                valueStyle={{ color: "#2563eb" }}
              />
            </Card>
          </Col>
          <Col xs={12} sm={8} md={5}>
            <Card size="small">
              <Statistic
                title="الأهداف"
                value={stats.totalGoals}
                prefix={<AimOutlined />}
                valueStyle={{ color: "#7c3aed" }}
              />
            </Card>
          </Col>
          <Col xs={12} sm={8} md={5}>
            <Card size="small">
              <Statistic
                title="نسبة تحقيق الأهداف"
                value={stats.goalsCompletionRate}
                suffix="%"
                valueStyle={{ color: "#16a34a" }}
              />
            </Card>
          </Col>
        </Row>
      )}

      {/* التبويبات */}
      <Segmented
        value={activeTab}
        onChange={(value) => setActiveTab(value as string)}
        options={[
          { label: <Space><CalendarOutlined /> دورات التقييم</Space>, value: "cycles" },
          { label: <Space><AimOutlined /> الأهداف</Space>, value: "goals" },
        ]}
        style={{ marginBottom: 16 }}
      />

      {/* المحتوى */}
      {loading ? (
        <LoadingSkeleton />
      ) : activeTab === "cycles" ? (
        cycles.length === 0 ? (
          <Card>
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description="لا توجد دورات تقييم"
            >
              <Button type="primary" icon={<PlusOutlined />} onClick={() => setShowCycleModal(true)}>
                إنشاء دورة تقييم
              </Button>
            </Empty>
          </Card>
        ) : (
          <Space direction="vertical" style={{ width: "100%" }} size={12}>
            {cycles.map(cycle => {
              const status = CYCLE_STATUS[cycle.status] || CYCLE_STATUS.draft;
              return (
                <Card key={cycle.id} size="small">
                  <Row align="middle" gutter={16}>
                    <Col>
                      <div style={{
                        width: 50,
                        height: 50,
                        background: cycle.status === "active" ? "#d1fae5" : "#f3f4f6",
                        borderRadius: 10,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontWeight: 700,
                        color: cycle.status === "active" ? "#059669" : "#6b7280",
                      }}>
                        {cycle.year}
                      </div>
                    </Col>
                    <Col flex={1}>
                      <Space>
                        <span style={{ fontWeight: 600 }}>{cycle.name}</span>
                        <Tag color={status.color}>{status.label}</Tag>
                      </Space>
                      <div style={{ fontSize: 13, color: "#6b7280", marginTop: 4 }}>
                        <DateDisplay date={cycle.startDate} /> - <DateDisplay date={cycle.endDate} />
                      </div>
                    </Col>
                    <Col>
                      {cycle.status === "draft" && (
                        <Button
                          type="primary"
                          ghost
                          size="small"
                          icon={<PlayCircleOutlined />}
                          onClick={() => activateCycle(cycle.id)}
                        >
                          تفعيل
                        </Button>
                      )}
                    </Col>
                  </Row>
                </Card>
              );
            })}
          </Space>
        )
      ) : (
        goals.length === 0 ? (
          <Card>
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description="لا توجد أهداف"
            >
              <Button type="primary" icon={<PlusOutlined />} onClick={() => setShowGoalModal(true)}>
                إنشاء هدف جديد
              </Button>
            </Empty>
          </Card>
        ) : (
          <Space direction="vertical" style={{ width: "100%" }} size={12}>
            {goals.map(goal => {
              const status = GOAL_STATUS[goal.status] || GOAL_STATUS.not_started;
              return (
                <Card key={goal.id} size="small">
                  <Row justify="space-between" align="top">
                    <Col flex={1}>
                      <Space style={{ marginBottom: 4 }}>
                        <span style={{ fontWeight: 600 }}>{goal.title}</span>
                        <Tag color={status.color}>{status.label}</Tag>
                      </Space>
                      {goal.description && (
                        <p style={{ fontSize: 13, color: "#6b7280", margin: "4px 0 0" }}>{goal.description}</p>
                      )}
                    </Col>
                    <Col>
                      <Button
                        type="primary"
                        ghost
                        size="small"
                        icon={<SyncOutlined />}
                        onClick={() => updateGoalProgress(goal.id)}
                      >
                        تحديث
                      </Button>
                    </Col>
                  </Row>
                  <div style={{ marginTop: 12 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 4 }}>
                      <span>التقدم</span>
                      <span style={{ fontWeight: 600 }}>{goal.progress}%</span>
                    </div>
                    <Progress
                      percent={goal.progress}
                      status={goal.progress >= 100 ? "success" : "active"}
                      showInfo={false}
                    />
                  </div>
                  {goal.dueDate && (
                    <div style={{ fontSize: 12, color: "#9ca3af", marginTop: 8 }}>
                      الاستحقاق: <DateDisplay date={goal.dueDate} />
                    </div>
                  )}
                </Card>
              );
            })}
          </Space>
        )
      )}

      {/* موديل دورة التقييم */}
      <Modal
        title={<Space><CalendarOutlined /> دورة تقييم جديدة</Space>}
        open={showCycleModal}
        onCancel={() => setShowCycleModal(false)}
        footer={null}
        width={500}
      >
        <Form
          form={cycleForm}
          layout="vertical"
          onFinish={createCycle}
          initialValues={{ goalsWeight: 50, competenciesWeight: 50 }}
        >
          <Form.Item
            name="name"
            label="اسم الدورة"
            rules={[{ required: true, message: "يرجى إدخال اسم الدورة" }]}
          >
            <Input placeholder="مثال: تقييم الأداء السنوي 2026" />
          </Form.Item>

          <Form.Item
            name="dates"
            label="الفترة الزمنية"
            rules={[{ required: true, message: "يرجى تحديد الفترة الزمنية" }]}
          >
            <DatePicker.RangePicker style={{ width: "100%" }} />
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="goalsWeight" label="وزن الأهداف %">
                <InputNumber min={0} max={100} style={{ width: "100%" }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="competenciesWeight" label="وزن الكفاءات %">
                <InputNumber min={0} max={100} style={{ width: "100%" }} />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item style={{ marginBottom: 0, textAlign: "left" }}>
            <Space>
              <Button onClick={() => setShowCycleModal(false)}>إلغاء</Button>
              <Button type="primary" htmlType="submit">إنشاء</Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* موديل الهدف */}
      <Modal
        title={<Space><AimOutlined /> هدف جديد</Space>}
        open={showGoalModal}
        onCancel={() => setShowGoalModal(false)}
        footer={null}
        width={500}
      >
        <Form
          form={goalForm}
          layout="vertical"
          onFinish={createGoal}
        >
          <Form.Item
            name="title"
            label="عنوان الهدف"
            rules={[{ required: true, message: "يرجى إدخال عنوان الهدف" }]}
          >
            <Input />
          </Form.Item>

          <Form.Item name="description" label="الوصف">
            <Input.TextArea rows={3} />
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="targetValue" label="القيمة المستهدفة">
                <InputNumber style={{ width: "100%" }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="unit" label="الوحدة">
                <Input placeholder="مثال: عميل، مبيعات" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="dueDate" label="تاريخ الاستحقاق">
            <DatePicker style={{ width: "100%" }} />
          </Form.Item>

          <Form.Item style={{ marginBottom: 0, textAlign: "left" }}>
            <Space>
              <Button onClick={() => setShowGoalModal(false)}>إلغاء</Button>
              <Button type="primary" htmlType="submit">إنشاء</Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
