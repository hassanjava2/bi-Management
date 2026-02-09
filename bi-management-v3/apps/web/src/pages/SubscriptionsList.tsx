/**
 * صفحة إدارة الاشتراكات
 */
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Row,
  Col,
  Card,
  Button,
  Input,
  Select,
  Form,
  Modal,
  Tag,
  Space,
  Statistic,
  Empty,
  message,
} from "antd";
import {
  PlusOutlined,
  SearchOutlined,
  SyncOutlined,
  PauseCircleOutlined,
  PlayCircleOutlined,
  CloseCircleOutlined,
  ReloadOutlined,
  WarningOutlined,
} from "@ant-design/icons";
import { PageHeader, MoneyDisplay, LoadingSkeleton } from "../components/shared";
import { API_BASE, getAuthHeaders } from "../utils/api";

interface Subscription {
  id: string;
  subscriptionNumber: string;
  customerName: string;
  planName: string;
  price: string;
  status: string;
  billingCycle: string;
  currentPeriodEnd: string | null;
  createdAt: string;
}

interface Plan {
  id: string;
  name: string;
  nameAr: string;
  price: string;
  billingCycle: string;
  features: string[] | null;
}

const STATUS_CONFIG: Record<string, { label: string; color: "default" | "purple" | "success" | "error" | "warning" }> = {
  pending: { label: "معلق", color: "default" },
  trial: { label: "تجريبي", color: "purple" },
  active: { label: "نشط", color: "success" },
  past_due: { label: "متأخر", color: "error" },
  paused: { label: "موقوف", color: "warning" },
  cancelled: { label: "ملغي", color: "default" },
  expired: { label: "منتهي", color: "error" },
};

const CYCLE_LABELS: Record<string, string> = {
  monthly: "شهري",
  quarterly: "ربع سنوي",
  yearly: "سنوي",
  weekly: "أسبوعي",
};

export default function SubscriptionsList() {
  const navigate = useNavigate();
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("active");
  const [search, setSearch] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [form] = Form.useForm();

  useEffect(() => {
    loadData();
  }, [statusFilter, search]);

  const loadData = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter) params.append("status", statusFilter);
      if (search) params.append("search", search);

      const [res, statsRes, plansRes] = await Promise.all([
        fetch(`${API_BASE}/api/subscriptions?${params}`, { headers: getAuthHeaders() }),
        fetch(`${API_BASE}/api/subscriptions/stats`, { headers: getAuthHeaders() }),
        fetch(`${API_BASE}/api/subscriptions/plans?active=true`, { headers: getAuthHeaders() }),
      ]);
      if (res.ok) setSubscriptions((await res.json()).subscriptions || []);
      if (statsRes.ok) setStats(await statsRes.json());
      if (plansRes.ok) setPlans((await plansRes.json()).plans || []);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const selectPlan = (planId: string) => {
    const plan = plans.find((p) => p.id === planId);
    if (plan) {
      form.setFieldsValue({
        price: plan.price,
        billingCycle: plan.billingCycle,
      });
    }
  };

  const handleCreate = async () => {
    try {
      const values = await form.validateFields();
      if (!values.customerName || !values.price) {
        message.error("يرجى ملء الحقول المطلوبة");
        return;
      }
      const plan = plans.find((p) => p.id === values.planId);
      const res = await fetch(`${API_BASE}/api/subscriptions`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          ...values,
          planName: plan?.name || "خطة مخصصة",
        }),
      });
      if (res.ok) {
        message.success("تم إنشاء الاشتراك بنجاح");
        setShowCreateModal(false);
        form.resetFields();
        loadData();
      } else {
        message.error("فشل في إنشاء الاشتراك");
      }
    } catch (error) {
      console.error(error);
    }
  };

  const changeStatus = async (id: string, status: string) => {
    if (status === "cancelled") {
      Modal.confirm({
        title: "تأكيد الإلغاء",
        content: "هل أنت متأكد من إلغاء الاشتراك؟",
        okText: "نعم، إلغاء",
        cancelText: "لا",
        okType: "danger",
        onOk: async () => {
          await performStatusChange(id, status);
        },
      });
    } else {
      await performStatusChange(id, status);
    }
  };

  const performStatusChange = async (id: string, status: string) => {
    try {
      await fetch(`${API_BASE}/api/subscriptions/${id}/status`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({ status }),
      });
      message.success("تم تحديث الحالة");
      loadData();
    } catch (error) {
      console.error(error);
      message.error("فشل في تحديث الحالة");
    }
  };

  const renewSubscription = async (id: string) => {
    try {
      await fetch(`${API_BASE}/api/subscriptions/${id}/renew`, {
        method: "POST",
        headers: getAuthHeaders(),
      });
      message.success("تم تجديد الاشتراك");
      loadData();
    } catch (error) {
      console.error(error);
      message.error("فشل في تجديد الاشتراك");
    }
  };

  const daysUntilExpiry = (date: string | null) => {
    if (!date) return null;
    const diff = new Date(date).getTime() - Date.now();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  };

  if (loading && !stats) {
    return <LoadingSkeleton />;
  }

  return (
    <div>
      <PageHeader
        title="الاشتراكات"
        subtitle="إدارة اشتراكات العملاء والخدمات المتكررة"
        breadcrumbs={[
          { label: "الرئيسية", path: "/" },
          { label: "الاشتراكات" },
        ]}
        extra={
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setShowCreateModal(true)}>
            اشتراك جديد
          </Button>
        }
      />

      {/* Stats Cards */}
      {stats && (
        <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
          <Col xs={12} md={4} lg={4}>
            <Card size="small" style={{ background: "#f6ffed" }}>
              <Statistic
                title="نشطة"
                value={stats.byStatus?.active || 0}
                valueStyle={{ color: "#52c41a" }}
              />
            </Card>
          </Col>
          <Col xs={12} md={4} lg={4}>
            <Card size="small" style={{ background: "#f9f0ff" }}>
              <Statistic
                title="تجريبية"
                value={stats.byStatus?.trial || 0}
                valueStyle={{ color: "#722ed1" }}
              />
            </Card>
          </Col>
          <Col xs={12} md={4} lg={4}>
            <Card size="small" style={{ background: "#fff1f0" }}>
              <Statistic
                title="متأخرة"
                value={stats.byStatus?.past_due || 0}
                valueStyle={{ color: "#f5222d" }}
              />
            </Card>
          </Col>
          <Col xs={12} md={4} lg={4}>
            <Card size="small" style={{ background: "#e6f7ff" }}>
              <Statistic
                title="جديدة هذا الشهر"
                value={stats.newThisMonth || 0}
                valueStyle={{ color: "#1890ff" }}
              />
            </Card>
          </Col>
          <Col xs={12} md={4} lg={4}>
            <Card
              size="small"
              style={{ background: stats.expiringThisWeek > 0 ? "#fffbe6" : "#fafafa" }}
            >
              <Statistic
                title="تنتهي هذا الأسبوع"
                value={stats.expiringThisWeek || 0}
                valueStyle={{ color: "#d48806" }}
                prefix={stats.expiringThisWeek > 0 ? <WarningOutlined /> : undefined}
              />
            </Card>
          </Col>
        </Row>
      )}

      {/* Filters */}
      <Space style={{ marginBottom: 16, width: "100%" }} size="middle">
        <Input
          placeholder="بحث برقم الاشتراك أو اسم العميل..."
          prefix={<SearchOutlined />}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ width: 300 }}
          allowClear
        />
        <Select
          value={statusFilter}
          onChange={setStatusFilter}
          style={{ width: 150 }}
          options={[
            { label: "كل الحالات", value: "" },
            { label: "نشطة", value: "active" },
            { label: "تجريبية", value: "trial" },
            { label: "متأخرة", value: "past_due" },
            { label: "موقوفة", value: "paused" },
            { label: "ملغاة", value: "cancelled" },
          ]}
        />
      </Space>

      {/* Subscriptions List */}
      {loading ? (
        <LoadingSkeleton />
      ) : subscriptions.length === 0 ? (
        <Card>
          <Empty
            image={<SyncOutlined style={{ fontSize: 64, color: "#d9d9d9" }} />}
            description="لا توجد اشتراكات"
          />
        </Card>
      ) : (
        <Space direction="vertical" style={{ width: "100%" }} size="middle">
          {subscriptions.map((sub) => {
            const status = STATUS_CONFIG[sub.status] || STATUS_CONFIG.pending;
            const days = daysUntilExpiry(sub.currentPeriodEnd);
            return (
              <Card key={sub.id} hoverable size="small">
                <Row align="middle" gutter={16}>
                  <Col flex="none">
                    <div
                      style={{
                        width: 50,
                        height: 50,
                        background: "#f5f5f5",
                        borderRadius: 12,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 24,
                      }}
                    >
                      <SyncOutlined />
                    </div>
                  </Col>
                  <Col flex="auto">
                    <Space direction="vertical" size={0}>
                      <Space>
                        <span style={{ fontWeight: 600 }}>{sub.customerName}</span>
                        <span style={{ fontFamily: "monospace", fontSize: 13, color: "#8c8c8c" }}>
                          {sub.subscriptionNumber}
                        </span>
                        <Tag color={status.color}>{status.label}</Tag>
                      </Space>
                      <Space style={{ color: "#8c8c8c", fontSize: 13 }}>
                        <span>📦 {sub.planName}</span>
                        <span>
                          💰 <MoneyDisplay amount={sub.price} /> / {CYCLE_LABELS[sub.billingCycle]}
                        </span>
                        {days !== null && days > 0 && days <= 7 && (
                          <span style={{ color: "#d48806" }}>
                            <WarningOutlined /> ينتهي خلال {days} أيام
                          </span>
                        )}
                      </Space>
                    </Space>
                  </Col>
                  <Col flex="none">
                    <Space>
                      {sub.status === "active" && (
                        <>
                          <Button
                            size="small"
                            icon={<ReloadOutlined />}
                            onClick={() => renewSubscription(sub.id)}
                            style={{ color: "#52c41a", borderColor: "#52c41a" }}
                          >
                            تجديد
                          </Button>
                          <Button
                            size="small"
                            icon={<PauseCircleOutlined />}
                            onClick={() => changeStatus(sub.id, "paused")}
                            style={{ color: "#d48806", borderColor: "#d48806" }}
                          >
                            إيقاف
                          </Button>
                        </>
                      )}
                      {sub.status === "paused" && (
                        <Button
                          size="small"
                          icon={<PlayCircleOutlined />}
                          onClick={() => changeStatus(sub.id, "active")}
                          style={{ color: "#52c41a", borderColor: "#52c41a" }}
                        >
                          استئناف
                        </Button>
                      )}
                      {sub.status !== "cancelled" && (
                        <Button
                          size="small"
                          danger
                          icon={<CloseCircleOutlined />}
                          onClick={() => changeStatus(sub.id, "cancelled")}
                        >
                          إلغاء
                        </Button>
                      )}
                    </Space>
                  </Col>
                </Row>
              </Card>
            );
          })}
        </Space>
      )}

      {/* Create Modal */}
      <Modal
        title="اشتراك جديد"
        open={showCreateModal}
        onOk={handleCreate}
        onCancel={() => {
          setShowCreateModal(false);
          form.resetFields();
        }}
        okText="إنشاء"
        cancelText="إلغاء"
        width={500}
      >
        <Form
          form={form}
          layout="vertical"
          initialValues={{ billingCycle: "monthly" }}
        >
          <Form.Item
            name="customerName"
            label="اسم العميل"
            rules={[{ required: true, message: "يرجى إدخال اسم العميل" }]}
          >
            <Input />
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="customerEmail" label="البريد الإلكتروني">
                <Input type="email" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="customerPhone" label="الهاتف">
                <Input />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="planId" label="الخطة">
            <Select
              placeholder="-- خطة مخصصة --"
              onChange={selectPlan}
              allowClear
              options={plans.map((p) => ({
                label: `${p.nameAr || p.name} - ${Number(p.price).toLocaleString()} IQD`,
                value: p.id,
              }))}
            />
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="price"
                label="السعر"
                rules={[{ required: true, message: "يرجى إدخال السعر" }]}
              >
                <Input type="number" suffix="IQD" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="billingCycle" label="دورة الفوترة">
                <Select
                  options={[
                    { label: "شهري", value: "monthly" },
                    { label: "ربع سنوي", value: "quarterly" },
                    { label: "سنوي", value: "yearly" },
                  ]}
                />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>
    </div>
  );
}
