/**
 * إدارة الموازنات المتقدمة
 */
import { useState, useEffect } from "react";
import { Row, Col, Card, Button, Input, Select, Tag, Space, message, Form, Modal, Statistic, Empty, Progress, InputNumber, DatePicker } from "antd";
import {
  PlusOutlined,
  DollarOutlined,
  CheckCircleOutlined,
  PauseCircleOutlined,
  ClockCircleOutlined,
  AlertOutlined,
  SendOutlined,
  LockOutlined,
} from "@ant-design/icons";
import { PageHeader, DateDisplay, LoadingSkeleton } from "../components/shared";
import { API_BASE, getAuthHeaders } from "../utils/api";
import dayjs from "dayjs";

interface Budget {
  id: string;
  budgetNumber: string;
  name: string;
  budgetType: string;
  fiscalYear: number;
  totalBudget: string;
  spentAmount: string;
  status: string;
  startDate: string;
  endDate: string;
}

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  draft: { label: "مسودة", color: "default" },
  pending_approval: { label: "بانتظار الموافقة", color: "warning" },
  approved: { label: "معتمدة", color: "processing" },
  active: { label: "نشطة", color: "success" },
  frozen: { label: "مجمدة", color: "error" },
  closed: { label: "مغلقة", color: "default" },
};

const TYPE_CONFIG: Record<string, { label: string; icon: string }> = {
  annual: { label: "سنوية", icon: "📅" },
  quarterly: { label: "ربع سنوية", icon: "📆" },
  monthly: { label: "شهرية", icon: "🗓️" },
  project: { label: "مشروع", icon: "📊" },
  department: { label: "قسم", icon: "🏢" },
};

export default function AdvancedBudgeting() {
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({ status: "", year: "" });
  const [showModal, setShowModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newBudget, setNewBudget] = useState({
    name: "",
    description: "",
    budgetType: "annual",
    fiscalYear: new Date().getFullYear(),
    startDate: "",
    endDate: "",
    totalBudget: "",
    createdBy: "current_user",
  });

  useEffect(() => { loadData(); }, [filter]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [statsRes] = await Promise.all([fetch(`${API_BASE}/api/advancedbudget/stats`, { headers: getAuthHeaders() })]);
      if (statsRes.ok) setStats(await statsRes.json());

      const params = new URLSearchParams();
      if (filter.status) params.append("status", filter.status);
      if (filter.year) params.append("year", filter.year);
      
      const res = await fetch(`${API_BASE}/api/advancedbudget/plans?${params}`, { headers: getAuthHeaders() });
      if (res.ok) setBudgets(await res.json());
    } catch (error) { console.error(error); }
    finally { setLoading(false); }
  };

  const handleCreate = async () => {
    if (!newBudget.name || !newBudget.totalBudget || !newBudget.startDate || !newBudget.endDate) {
      message.warning("الاسم والمبلغ والتواريخ مطلوبة");
      return;
    }
    setCreating(true);
    try {
      const res = await fetch(`${API_BASE}/api/advancedbudget/plans`, {
        method: "POST",
        headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify(newBudget),
      });
      if (res.ok) {
        message.success("تم إنشاء الموازنة بنجاح");
        setShowModal(false);
        setNewBudget({ name: "", description: "", budgetType: "annual", fiscalYear: new Date().getFullYear(), startDate: "", endDate: "", totalBudget: "", createdBy: "current_user" });
        loadData();
      } else {
        message.error("فشل إنشاء الموازنة");
      }
    } catch (error) {
      console.error(error);
      message.error("حدث خطأ أثناء الإنشاء");
    } finally {
      setCreating(false);
    }
  };

  const updateStatus = async (id: string, action: string) => {
    try {
      await fetch(`${API_BASE}/api/advancedbudget/plans/${id}/${action}`, {
        method: "PATCH",
        headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ approvedBy: "current_user" }),
      });
      message.success("تم تحديث الحالة بنجاح");
      loadData();
    } catch (error) {
      console.error(error);
      message.error("فشل تحديث الحالة");
    }
  };

  const getUtilization = (budget: Budget) => {
    const total = Number(budget.totalBudget) || 1;
    const spent = Number(budget.spentAmount) || 0;
    return Math.round((spent / total) * 100);
  };

  const getUtilizationStatus = (percentage: number): "success" | "normal" | "exception" | "active" => {
    if (percentage >= 90) return "exception";
    if (percentage >= 75) return "active";
    return "success";
  };

  return (
    <div style={{ padding: 24 }}>
      <PageHeader
        title="إدارة الموازنات"
        breadcrumbs={[{ title: "إدارة الموازنات" }]}
        extra={
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setShowModal(true)}>
            موازنة جديدة
          </Button>
        }
      />

      {/* الإحصائيات */}
      {stats && (
        <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
          <Col xs={12} sm={8} md={4}>
            <Card>
              <Statistic title="إجمالي الموازنات" value={stats.totalBudgets} prefix={<DollarOutlined />} />
            </Card>
          </Col>
          <Col xs={12} sm={8} md={4}>
            <Card>
              <Statistic
                title="نشطة"
                value={stats.activeBudgets}
                valueStyle={{ color: "#059669" }}
                prefix={<CheckCircleOutlined />}
              />
            </Card>
          </Col>
          <Col xs={12} sm={8} md={4}>
            <Card>
              <Statistic
                title="نسبة الاستخدام"
                value={stats.utilizationRate}
                suffix="%"
                valueStyle={{ color: "#2563eb" }}
              />
            </Card>
          </Col>
          <Col xs={12} sm={8} md={4}>
            <Card>
              <Statistic
                title="طلبات معلقة"
                value={stats.pendingRequests}
                valueStyle={{ color: "#d97706" }}
                prefix={<ClockCircleOutlined />}
              />
            </Card>
          </Col>
          <Col xs={12} sm={8} md={4}>
            <Card>
              <Statistic
                title="تنبيهات"
                value={stats.activeAlerts}
                valueStyle={{ color: "#dc2626" }}
                prefix={<AlertOutlined />}
              />
            </Card>
          </Col>
        </Row>
      )}

      {/* الفلاتر */}
      <Card style={{ marginBottom: 16 }}>
        <Row gutter={16}>
          <Col>
            <Select
              value={filter.status}
              onChange={(value) => setFilter({ ...filter, status: value })}
              style={{ width: 180 }}
              placeholder="كل الحالات"
              allowClear
            >
              <Select.Option value="">كل الحالات</Select.Option>
              {Object.entries(STATUS_CONFIG).map(([k, v]) => (
                <Select.Option key={k} value={k}>{v.label}</Select.Option>
              ))}
            </Select>
          </Col>
          <Col>
            <Select
              value={filter.year}
              onChange={(value) => setFilter({ ...filter, year: value })}
              style={{ width: 150 }}
              placeholder="كل السنوات"
              allowClear
            >
              <Select.Option value="">كل السنوات</Select.Option>
              {[2024, 2025, 2026].map(y => (
                <Select.Option key={y} value={String(y)}>{y}</Select.Option>
              ))}
            </Select>
          </Col>
        </Row>
      </Card>

      {/* المحتوى */}
      {loading ? (
        <LoadingSkeleton />
      ) : budgets.length === 0 ? (
        <Card>
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description="لا توجد موازنات"
          >
            <Button type="primary" onClick={() => setShowModal(true)}>
              إنشاء موازنة جديدة
            </Button>
          </Empty>
        </Card>
      ) : (
        <Space direction="vertical" style={{ width: "100%" }} size={16}>
          {budgets.map(budget => {
            const status = STATUS_CONFIG[budget.status] || STATUS_CONFIG.draft;
            const type = TYPE_CONFIG[budget.budgetType] || TYPE_CONFIG.annual;
            const utilization = getUtilization(budget);
            
            return (
              <Card key={budget.id}>
                <Row gutter={[16, 16]} align="middle">
                  <Col flex="1">
                    <Space direction="vertical" style={{ width: "100%" }}>
                      <Space wrap>
                        <span style={{ fontSize: 20 }}>{type.icon}</span>
                        <span style={{ fontFamily: "monospace", color: "#9ca3af" }}>{budget.budgetNumber}</span>
                        <Tag color={status.color}>{status.label}</Tag>
                        <span style={{ color: "#6b7280" }}>{type.label} - {budget.fiscalYear}</span>
                      </Space>
                      
                      <h3 style={{ margin: "8px 0", fontWeight: 600 }}>{budget.name}</h3>
                      
                      <div style={{ maxWidth: 400 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                          <span>المصروف: {Number(budget.spentAmount || 0).toLocaleString()} د.ع</span>
                          <span>المخصص: {Number(budget.totalBudget).toLocaleString()} د.ع</span>
                        </div>
                        <Progress
                          percent={utilization}
                          status={getUtilizationStatus(utilization)}
                          size="small"
                        />
                      </div>
                      
                      <Space style={{ color: "#6b7280", fontSize: 14 }}>
                        <span>🗓️</span>
                        <DateDisplay date={budget.startDate} />
                        <span>-</span>
                        <DateDisplay date={budget.endDate} />
                      </Space>
                    </Space>
                  </Col>
                  
                  <Col>
                    <Space>
                      {budget.status === "draft" && (
                        <Button
                          size="small"
                          icon={<SendOutlined />}
                          onClick={() => updateStatus(budget.id, "submit")}
                          style={{ backgroundColor: "#fef3c7", borderColor: "#fef3c7", color: "#d97706" }}
                        >
                          تقديم للاعتماد
                        </Button>
                      )}
                      {budget.status === "pending_approval" && (
                        <Button
                          size="small"
                          type="primary"
                          icon={<CheckCircleOutlined />}
                          onClick={() => updateStatus(budget.id, "approve")}
                          style={{ backgroundColor: "#059669" }}
                        >
                          اعتماد
                        </Button>
                      )}
                      {budget.status === "active" && (
                        <Button
                          size="small"
                          danger
                          icon={<LockOutlined />}
                          onClick={() => updateStatus(budget.id, "freeze")}
                        >
                          تجميد
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

      {/* موديل إضافة موازنة */}
      <Modal
        title="موازنة جديدة"
        open={showModal}
        onCancel={() => setShowModal(false)}
        onOk={handleCreate}
        okText="إنشاء"
        cancelText="إلغاء"
        confirmLoading={creating}
        width={600}
      >
        <Form layout="vertical">
          <Form.Item label="اسم الموازنة" required>
            <Input
              value={newBudget.name}
              onChange={(e) => setNewBudget({ ...newBudget, name: e.target.value })}
              placeholder="اسم الموازنة"
            />
          </Form.Item>
          
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label="النوع">
                <Select
                  value={newBudget.budgetType}
                  onChange={(value) => setNewBudget({ ...newBudget, budgetType: value })}
                >
                  {Object.entries(TYPE_CONFIG).map(([k, v]) => (
                    <Select.Option key={k} value={k}>{v.icon} {v.label}</Select.Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="السنة المالية">
                <InputNumber
                  value={newBudget.fiscalYear}
                  onChange={(value) => setNewBudget({ ...newBudget, fiscalYear: value || new Date().getFullYear() })}
                  style={{ width: "100%" }}
                />
              </Form.Item>
            </Col>
          </Row>
          
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label="تاريخ البدء" required>
                <DatePicker
                  value={newBudget.startDate ? dayjs(newBudget.startDate) : null}
                  onChange={(date) => setNewBudget({ ...newBudget, startDate: date?.format("YYYY-MM-DD") || "" })}
                  style={{ width: "100%" }}
                  placeholder="تاريخ البدء"
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="تاريخ الانتهاء" required>
                <DatePicker
                  value={newBudget.endDate ? dayjs(newBudget.endDate) : null}
                  onChange={(date) => setNewBudget({ ...newBudget, endDate: date?.format("YYYY-MM-DD") || "" })}
                  style={{ width: "100%" }}
                  placeholder="تاريخ الانتهاء"
                />
              </Form.Item>
            </Col>
          </Row>
          
          <Form.Item label="إجمالي الموازنة (د.ع)" required>
            <InputNumber
              value={newBudget.totalBudget ? Number(newBudget.totalBudget) : undefined}
              onChange={(value) => setNewBudget({ ...newBudget, totalBudget: String(value || "") })}
              style={{ width: "100%" }}
              placeholder="0"
              formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")}
              parser={(value) => value!.replace(/\$\s?|(,*)/g, "")}
            />
          </Form.Item>
          
          <Form.Item label="الوصف">
            <Input.TextArea
              value={newBudget.description}
              onChange={(e) => setNewBudget({ ...newBudget, description: e.target.value })}
              placeholder="وصف الموازنة..."
              rows={3}
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
