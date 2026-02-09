/**
 * مركز الشكاوى والاقتراحات
 */
import { useState, useEffect } from "react";
import { Row, Col, Card, Button, Input, Select, Tag, Space, message, Statistic, Modal, Form, Empty, List, Segmented } from "antd";
import { ExclamationCircleOutlined, PlusOutlined, BulbOutlined, LikeOutlined, DislikeOutlined, WarningOutlined, ArrowUpOutlined } from "@ant-design/icons";
import { PageHeader, StatusTag, DateDisplay, LoadingSkeleton } from "../components/shared";
import { API_BASE, getAuthHeaders } from "../utils/api";

interface Complaint {
  id: string;
  complaintNumber: string;
  subject: string;
  category: string;
  priority: string;
  status: string;
  submitterType: string;
  createdAt: string;
}

interface Suggestion {
  id: string;
  suggestionNumber: string;
  title: string;
  category: string;
  status: string;
  upvotes: number;
  downvotes: number;
  createdAt: string;
}

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  new: { label: "جديدة", color: "blue" },
  acknowledged: { label: "تم الاستلام", color: "purple" },
  investigating: { label: "قيد التحقيق", color: "orange" },
  resolved: { label: "تم الحل", color: "success" },
  closed: { label: "مغلقة", color: "default" },
  escalated: { label: "مصعّدة", color: "error" },
};

const PRIORITY_CONFIG: Record<string, { label: string; color: string }> = {
  low: { label: "منخفضة", color: "default" },
  medium: { label: "متوسطة", color: "blue" },
  high: { label: "عالية", color: "orange" },
  urgent: { label: "عاجلة", color: "error" },
};

const CATEGORY_CONFIG: Record<string, { label: string; icon: string }> = {
  service: { label: "الخدمة", icon: "🛎️" },
  product: { label: "المنتج", icon: "📦" },
  employee: { label: "الموظف", icon: "👤" },
  billing: { label: "الفوترة", icon: "💳" },
  delivery: { label: "التوصيل", icon: "🚚" },
  other: { label: "أخرى", icon: "📋" },
};

const SUGGESTION_STATUS: Record<string, { label: string; color: string }> = {
  submitted: { label: "مقدم", color: "blue" },
  under_review: { label: "قيد المراجعة", color: "orange" },
  accepted: { label: "مقبول", color: "success" },
  implemented: { label: "تم التنفيذ", color: "purple" },
  rejected: { label: "مرفوض", color: "error" },
};

const SUBMITTER_TYPES: Record<string, { label: string; icon: string }> = {
  customer: { label: "عميل", icon: "👤" },
  employee: { label: "موظف", icon: "💼" },
  external: { label: "خارجي", icon: "🌐" },
};

export default function ComplaintsCenter() {
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<string>("complaints");
  const [filter, setFilter] = useState({ status: "", priority: "", category: "" });
  const [showModal, setShowModal] = useState(false);
  const [form] = Form.useForm();

  useEffect(() => { loadData(); }, [activeTab, filter]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [statsRes] = await Promise.all([fetch(`${API_BASE}/api/complaints/stats`)]);
      if (statsRes.ok) setStats(await statsRes.json());

      if (activeTab === "complaints") {
        const params = new URLSearchParams();
        if (filter.status) params.append("status", filter.status);
        if (filter.priority) params.append("priority", filter.priority);
        if (filter.category) params.append("category", filter.category);
        const res = await fetch(`${API_BASE}/api/complaints?${params}`, { headers: getAuthHeaders() });
        if (res.ok) setComplaints(await res.json());
      } else {
        const res = await fetch(`${API_BASE}/api/complaints/suggestions/all`, { headers: getAuthHeaders() });
        if (res.ok) setSuggestions(await res.json());
      }
    } catch (error) {
      console.error(error);
      message.error("حدث خطأ في تحميل البيانات");
    }
    finally { setLoading(false); }
  };

  const handleCreate = async () => {
    try {
      const values = await form.validateFields();
      const res = await fetch(`${API_BASE}/api/complaints`, {
        method: "POST",
        headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      if (res.ok) {
        message.success("تم إنشاء الشكوى بنجاح");
        setShowModal(false);
        form.resetFields();
        loadData();
      } else {
        message.error("فشل في إنشاء الشكوى");
      }
    } catch (error) {
      console.error(error);
    }
  };

  const updateStatus = async (id: string, status: string) => {
    let resolution = null;
    if (status === "resolved") {
      resolution = prompt("أدخل الحل:");
      if (!resolution) return;
    }
    try {
      await fetch(`${API_BASE}/api/complaints/${id}/status`, {
        method: "PATCH",
        headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ status, resolution, userId: "current_user" }),
      });
      message.success("تم تحديث الحالة");
      loadData();
    } catch (error) {
      console.error(error);
      message.error("فشل في تحديث الحالة");
    }
  };

  const escalate = async (id: string) => {
    const reason = prompt("سبب التصعيد:");
    if (!reason) return;
    try {
      await fetch(`${API_BASE}/api/complaints/${id}/escalate`, {
        method: "POST",
        headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ reason, userId: "current_user" }),
      });
      message.success("تم تصعيد الشكوى");
      loadData();
    } catch (error) {
      console.error(error);
      message.error("فشل في التصعيد");
    }
  };

  const vote = async (id: string, type: string) => {
    try {
      await fetch(`${API_BASE}/api/complaints/suggestions/${id}/vote`, {
        method: "POST",
        headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ type }),
      });
      loadData();
    } catch (error) {
      console.error(error);
    }
  };

  const updateSuggestionStatus = async (id: string, status: string) => {
    try {
      await fetch(`${API_BASE}/api/complaints/suggestions/${id}`, {
        method: "PATCH",
        headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ status, reviewedBy: "current_user" }),
      });
      message.success("تم تحديث الحالة");
      loadData();
    } catch (error) {
      console.error(error);
      message.error("فشل في تحديث الحالة");
    }
  };

  return (
    <div>
      <PageHeader
        title="الشكاوى والاقتراحات"
        subtitle="إدارة شكاوى واقتراحات العملاء والموظفين"
        icon={<ExclamationCircleOutlined />}
        breadcrumbs={[
          { label: "الرئيسية", path: "/" },
          { label: "الشكاوى والاقتراحات" },
        ]}
        extra={
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setShowModal(true)}>
            شكوى جديدة
          </Button>
        }
      />

      {/* الإحصائيات */}
      {stats && (
        <Row gutter={[12, 12]} style={{ marginBottom: 24 }}>
          <Col span={12} md={4}>
            <Card>
              <Statistic title="إجمالي الشكاوى" value={stats.totalComplaints} />
            </Card>
          </Col>
          <Col span={12} md={4}>
            <Card style={{ background: "#dbeafe", border: "none" }}>
              <Statistic
                title={<span style={{ color: "#1e40af" }}>جديدة</span>}
                value={stats.newComplaints}
                valueStyle={{ color: "#2563eb" }}
              />
            </Card>
          </Col>
          <Col span={12} md={4}>
            <Card style={{ background: "#fef3c7", border: "none" }}>
              <Statistic
                title={<span style={{ color: "#92400e" }}>قيد التحقيق</span>}
                value={stats.investigating}
                valueStyle={{ color: "#d97706" }}
              />
            </Card>
          </Col>
          <Col span={12} md={4}>
            <Card style={{ background: "#d1fae5", border: "none" }}>
              <Statistic
                title={<span style={{ color: "#047857" }}>تم حلها</span>}
                value={stats.resolved}
                valueStyle={{ color: "#059669" }}
              />
            </Card>
          </Col>
          <Col span={12} md={4}>
            <Card style={{ background: "#fee2e2", border: "none" }}>
              <Statistic
                title={<span style={{ color: "#b91c1c" }}>مصعّدة</span>}
                value={stats.escalated}
                valueStyle={{ color: "#dc2626" }}
                prefix={<WarningOutlined />}
              />
            </Card>
          </Col>
          <Col span={12} md={4}>
            <Card style={{ background: "#ede9fe", border: "none" }}>
              <Statistic
                title={<span style={{ color: "#6d28d9" }}>متوسط الرضا</span>}
                value={stats.avgSatisfaction}
                valueStyle={{ color: "#7c3aed" }}
                prefix="⭐"
              />
            </Card>
          </Col>
        </Row>
      )}

      {/* التبويبات */}
      <Card style={{ marginBottom: 16 }}>
        <Space direction="vertical" style={{ width: "100%" }} size="middle">
          <Segmented
            options={[
              { label: <Space><ExclamationCircleOutlined /> الشكاوى</Space>, value: "complaints" },
              { label: <Space><BulbOutlined /> الاقتراحات</Space>, value: "suggestions" },
            ]}
            value={activeTab}
            onChange={(val) => setActiveTab(val as string)}
          />

          {/* الفلاتر للشكاوى */}
          {activeTab === "complaints" && (
            <Space wrap>
              <Select
                placeholder="كل الحالات"
                value={filter.status || undefined}
                onChange={(val) => setFilter({ ...filter, status: val || "" })}
                style={{ width: 140 }}
                allowClear
              >
                {Object.entries(STATUS_CONFIG).map(([k, v]) => (
                  <Select.Option key={k} value={k}>{v.label}</Select.Option>
                ))}
              </Select>
              <Select
                placeholder="كل الأولويات"
                value={filter.priority || undefined}
                onChange={(val) => setFilter({ ...filter, priority: val || "" })}
                style={{ width: 140 }}
                allowClear
              >
                {Object.entries(PRIORITY_CONFIG).map(([k, v]) => (
                  <Select.Option key={k} value={k}>{v.label}</Select.Option>
                ))}
              </Select>
              <Select
                placeholder="كل الفئات"
                value={filter.category || undefined}
                onChange={(val) => setFilter({ ...filter, category: val || "" })}
                style={{ width: 150 }}
                allowClear
              >
                {Object.entries(CATEGORY_CONFIG).map(([k, v]) => (
                  <Select.Option key={k} value={k}>{v.icon} {v.label}</Select.Option>
                ))}
              </Select>
            </Space>
          )}
        </Space>
      </Card>

      {/* المحتوى */}
      {loading ? (
        <LoadingSkeleton type="list" />
      ) : activeTab === "complaints" ? (
        complaints.length === 0 ? (
          <Card>
            <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="لا توجد شكاوى" />
          </Card>
        ) : (
          <List
            dataSource={complaints}
            renderItem={(complaint) => {
              const status = STATUS_CONFIG[complaint.status] || STATUS_CONFIG.new;
              const priority = PRIORITY_CONFIG[complaint.priority] || PRIORITY_CONFIG.medium;
              const category = CATEGORY_CONFIG[complaint.category] || CATEGORY_CONFIG.other;
              const submitter = SUBMITTER_TYPES[complaint.submitterType] || SUBMITTER_TYPES.customer;

              return (
                <Card
                  style={{ marginBottom: 12, borderRight: `4px solid ${status.color === "error" ? "#dc2626" : status.color === "success" ? "#059669" : status.color === "orange" ? "#d97706" : status.color === "blue" ? "#2563eb" : status.color === "purple" ? "#7c3aed" : "#6b7280"}` }}
                  size="small"
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div style={{ flex: 1 }}>
                      <Space style={{ marginBottom: 8 }} wrap>
                        <span style={{ fontSize: "0.75rem", color: "#9ca3af", fontFamily: "monospace" }}>{complaint.complaintNumber}</span>
                        <Tag color={status.color}>{status.label}</Tag>
                        <Tag color={priority.color}>{priority.label}</Tag>
                        <span>{category.icon} {category.label}</span>
                      </Space>
                      <h4 style={{ fontWeight: 600, margin: "0 0 8px" }}>{complaint.subject}</h4>
                      <Space style={{ fontSize: "0.85rem", color: "#6b7280" }}>
                        <span>{submitter.icon} {submitter.label}</span>
                        <DateDisplay date={complaint.createdAt} format="date" />
                      </Space>
                    </div>
                    {complaint.status !== "resolved" && complaint.status !== "closed" && (
                      <Space>
                        <Select
                          value={complaint.status}
                          onChange={(val) => updateStatus(complaint.id, val)}
                          size="small"
                          style={{ width: 120 }}
                        >
                          {Object.entries(STATUS_CONFIG).filter(([k]) => k !== "escalated").map(([k, v]) => (
                            <Select.Option key={k} value={k}>{v.label}</Select.Option>
                          ))}
                        </Select>
                        <Button
                          size="small"
                          danger
                          icon={<ArrowUpOutlined />}
                          onClick={() => escalate(complaint.id)}
                        >
                          تصعيد
                        </Button>
                      </Space>
                    )}
                  </div>
                </Card>
              );
            }}
          />
        )
      ) : (
        suggestions.length === 0 ? (
          <Card>
            <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="لا توجد اقتراحات" />
          </Card>
        ) : (
          <List
            dataSource={suggestions}
            renderItem={(suggestion) => {
              const status = SUGGESTION_STATUS[suggestion.status] || SUGGESTION_STATUS.submitted;
              return (
                <Card style={{ marginBottom: 12 }} size="small">
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div style={{ flex: 1 }}>
                      <Space style={{ marginBottom: 8 }}>
                        <span style={{ fontSize: "0.75rem", color: "#9ca3af", fontFamily: "monospace" }}>{suggestion.suggestionNumber}</span>
                        <Tag color={status.color}>{status.label}</Tag>
                      </Space>
                      <h4 style={{ fontWeight: 600, margin: "0 0 8px" }}>{suggestion.title}</h4>
                      <Space>
                        <Button
                          type="text"
                          size="small"
                          icon={<LikeOutlined />}
                          style={{ color: "#059669" }}
                          onClick={() => vote(suggestion.id, "upvote")}
                        >
                          {suggestion.upvotes || 0}
                        </Button>
                        <Button
                          type="text"
                          size="small"
                          icon={<DislikeOutlined />}
                          style={{ color: "#dc2626" }}
                          onClick={() => vote(suggestion.id, "downvote")}
                        >
                          {suggestion.downvotes || 0}
                        </Button>
                      </Space>
                    </div>
                    <Select
                      value={suggestion.status}
                      onChange={(val) => updateSuggestionStatus(suggestion.id, val)}
                      size="small"
                      style={{ width: 130 }}
                    >
                      {Object.entries(SUGGESTION_STATUS).map(([k, v]) => (
                        <Select.Option key={k} value={k}>{v.label}</Select.Option>
                      ))}
                    </Select>
                  </div>
                </Card>
              );
            }}
          />
        )
      )}

      {/* موديل إضافة شكوى */}
      <Modal
        title={<Space><ExclamationCircleOutlined /> شكوى جديدة</Space>}
        open={showModal}
        onCancel={() => { setShowModal(false); form.resetFields(); }}
        onOk={handleCreate}
        okText="إنشاء"
        cancelText="إلغاء"
        width={550}
      >
        <Form form={form} layout="vertical" initialValues={{ submitterType: "customer", category: "service", priority: "medium" }}>
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name="submitterType" label="نوع المشتكي">
                <Select>
                  <Select.Option value="customer">عميل</Select.Option>
                  <Select.Option value="employee">موظف</Select.Option>
                  <Select.Option value="external">خارجي</Select.Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="category" label="الفئة">
                <Select>
                  {Object.entries(CATEGORY_CONFIG).map(([k, v]) => (
                    <Select.Option key={k} value={k}>{v.icon} {v.label}</Select.Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>
          <Form.Item noStyle shouldUpdate={(prev, cur) => prev.submitterType !== cur.submitterType}>
            {({ getFieldValue }) =>
              getFieldValue("submitterType") === "external" && (
                <Row gutter={12}>
                  <Col span={12}>
                    <Form.Item name="externalName" label="الاسم">
                      <Input placeholder="اسم المشتكي" />
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item name="externalPhone" label="الهاتف">
                      <Input placeholder="رقم الهاتف" />
                    </Form.Item>
                  </Col>
                </Row>
              )
            }
          </Form.Item>
          <Form.Item name="subject" label="الموضوع" rules={[{ required: true, message: "الموضوع مطلوب" }]}>
            <Input placeholder="موضوع الشكوى" />
          </Form.Item>
          <Form.Item name="description" label="الوصف" rules={[{ required: true, message: "الوصف مطلوب" }]}>
            <Input.TextArea rows={4} placeholder="وصف تفصيلي للشكوى" />
          </Form.Item>
          <Form.Item name="priority" label="الأولوية">
            <Select>
              {Object.entries(PRIORITY_CONFIG).map(([k, v]) => (
                <Select.Option key={k} value={k}>{v.label}</Select.Option>
              ))}
            </Select>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
