/**
 * صفحة التذاكر والدعم الفني
 */
import { useState, useEffect } from "react";
import { Row, Col, Card, Table, Button, Input, Select, Tag, Space, message, Form, Modal, Statistic, Empty } from "antd";
import {
  PlusOutlined,
  SearchOutlined,
  CustomerServiceOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
} from "@ant-design/icons";
import { PageHeader, DateDisplay, LoadingSkeleton } from "../components/shared";
import { API_BASE, getAuthHeaders } from "../utils/api";

interface Ticket {
  id: string;
  ticketNumber: string;
  title: string;
  description: string | null;
  category: string;
  priority: string;
  status: string;
  createdAt: string;
  dueDate: string | null;
}

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  open: { label: "مفتوحة", color: "blue" },
  in_progress: { label: "قيد المعالجة", color: "orange" },
  pending: { label: "معلقة", color: "default" },
  resolved: { label: "تم الحل", color: "green" },
  closed: { label: "مغلقة", color: "default" },
};

const PRIORITY_CONFIG: Record<string, { label: string; color: string; icon: string }> = {
  low: { label: "منخفضة", color: "default", icon: "⬇️" },
  medium: { label: "متوسطة", color: "warning", icon: "➡️" },
  high: { label: "عالية", color: "error", icon: "⬆️" },
  urgent: { label: "عاجلة", color: "purple", icon: "🔥" },
};

const CATEGORY_CONFIG: Record<string, { label: string; icon: string }> = {
  technical: { label: "تقنية", icon: "💻" },
  sales: { label: "مبيعات", icon: "💰" },
  finance: { label: "مالية", icon: "💳" },
  hr: { label: "موارد بشرية", icon: "👥" },
  other: { label: "أخرى", icon: "📋" },
};

export default function TicketsPage() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("");
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [newTicket, setNewTicket] = useState({ title: "", description: "", category: "technical", priority: "medium" });
  const [creating, setCreating] = useState(false);

  useEffect(() => { loadData(); }, [statusFilter, priorityFilter, search]);

  const loadData = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter) params.append("status", statusFilter);
      if (priorityFilter) params.append("priority", priorityFilter);
      if (search) params.append("search", search);

      const [ticketsRes, statsRes] = await Promise.all([
        fetch(`${API_BASE}/api/tickets?${params}`, { headers: getAuthHeaders() }),
        fetch(`${API_BASE}/api/tickets/stats`, { headers: getAuthHeaders() }),
      ]);
      if (ticketsRes.ok) setTickets((await ticketsRes.json()).tickets || []);
      if (statsRes.ok) setStats(await statsRes.json());
    } catch (error) { console.error(error); }
    finally { setLoading(false); }
  };

  const handleCreate = async () => {
    if (!newTicket.title) {
      message.warning("العنوان مطلوب");
      return;
    }
    setCreating(true);
    try {
      const res = await fetch(`${API_BASE}/api/tickets`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify(newTicket),
      });
      if (res.ok) {
        message.success("تم إنشاء التذكرة بنجاح");
        setShowModal(false);
        setNewTicket({ title: "", description: "", category: "technical", priority: "medium" });
        loadData();
      } else {
        message.error("فشل إنشاء التذكرة");
      }
    } catch (error) {
      console.error(error);
      message.error("حدث خطأ أثناء الإنشاء");
    } finally {
      setCreating(false);
    }
  };

  const updateStatus = async (id: string, status: string) => {
    try {
      await fetch(`${API_BASE}/api/tickets/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      message.success("تم تحديث الحالة");
      loadData();
    } catch (error) {
      console.error(error);
      message.error("فشل تحديث الحالة");
    }
  };

  const columns = [
    {
      title: "رقم التذكرة",
      dataIndex: "ticketNumber",
      key: "ticketNumber",
      render: (text: string) => <span style={{ fontFamily: "monospace" }}>{text}</span>,
    },
    {
      title: "العنوان",
      dataIndex: "title",
      key: "title",
      render: (text: string, record: Ticket) => (
        <div>
          <div style={{ fontWeight: 500 }}>{text}</div>
          {record.description && (
            <div style={{ fontSize: 12, color: "#6b7280" }}>
              {record.description.substring(0, 60)}{record.description.length > 60 ? "..." : ""}
            </div>
          )}
        </div>
      ),
    },
    {
      title: "التصنيف",
      dataIndex: "category",
      key: "category",
      render: (category: string) => {
        const cat = CATEGORY_CONFIG[category] || CATEGORY_CONFIG.other;
        return <span>{cat.icon} {cat.label}</span>;
      },
    },
    {
      title: "الأولوية",
      dataIndex: "priority",
      key: "priority",
      render: (priority: string) => {
        const p = PRIORITY_CONFIG[priority] || PRIORITY_CONFIG.medium;
        return <Tag color={p.color}>{p.icon} {p.label}</Tag>;
      },
    },
    {
      title: "الحالة",
      dataIndex: "status",
      key: "status",
      render: (status: string, record: Ticket) => {
        const s = STATUS_CONFIG[status] || STATUS_CONFIG.open;
        return (
          <Select
            value={status}
            onChange={(value) => updateStatus(record.id, value)}
            style={{ width: 140 }}
            size="small"
          >
            {Object.entries(STATUS_CONFIG).map(([k, v]) => (
              <Select.Option key={k} value={k}>
                <Tag color={v.color} style={{ marginRight: 0 }}>{v.label}</Tag>
              </Select.Option>
            ))}
          </Select>
        );
      },
    },
    {
      title: "التاريخ",
      dataIndex: "createdAt",
      key: "createdAt",
      render: (date: string) => <DateDisplay date={date} />,
    },
    {
      title: "الاستحقاق",
      dataIndex: "dueDate",
      key: "dueDate",
      render: (date: string | null) => date ? <DateDisplay date={date} /> : "-",
    },
  ];

  return (
    <div style={{ padding: 24 }}>
      <PageHeader
        title="التذاكر والدعم"
        breadcrumbs={[{ title: "التذاكر والدعم" }]}
        extra={
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setShowModal(true)}>
            تذكرة جديدة
          </Button>
        }
      />

      {/* الإحصائيات */}
      {stats && (
        <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
          <Col xs={12} sm={8} md={4}>
            <Card>
              <Statistic title="الإجمالي" value={stats.total} prefix={<CustomerServiceOutlined />} />
            </Card>
          </Col>
          <Col xs={12} sm={8} md={4}>
            <Card>
              <Statistic
                title="مفتوحة"
                value={stats.open}
                valueStyle={{ color: "#2563eb" }}
              />
            </Card>
          </Col>
          <Col xs={12} sm={8} md={4}>
            <Card>
              <Statistic
                title="قيد المعالجة"
                value={stats.inProgress}
                valueStyle={{ color: "#d97706" }}
                prefix={<ClockCircleOutlined />}
              />
            </Card>
          </Col>
          <Col xs={12} sm={8} md={4}>
            <Card>
              <Statistic
                title="تم الحل"
                value={stats.resolved}
                valueStyle={{ color: "#059669" }}
                prefix={<CheckCircleOutlined />}
              />
            </Card>
          </Col>
          <Col xs={12} sm={8} md={4}>
            <Card>
              <Statistic
                title="عاجلة"
                value={stats.byPriority?.urgent || 0}
                valueStyle={{ color: "#dc2626" }}
                prefix={<ExclamationCircleOutlined />}
              />
            </Card>
          </Col>
        </Row>
      )}

      {/* الفلاتر */}
      <Card style={{ marginBottom: 16 }}>
        <Row gutter={16}>
          <Col flex="1">
            <Input
              prefix={<SearchOutlined />}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="بحث بالعنوان أو الرقم..."
              allowClear
            />
          </Col>
          <Col>
            <Select
              value={statusFilter}
              onChange={setStatusFilter}
              style={{ width: 150 }}
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
              value={priorityFilter}
              onChange={setPriorityFilter}
              style={{ width: 150 }}
              placeholder="كل الأولويات"
              allowClear
            >
              <Select.Option value="">كل الأولويات</Select.Option>
              {Object.entries(PRIORITY_CONFIG).map(([k, v]) => (
                <Select.Option key={k} value={k}>{v.icon} {v.label}</Select.Option>
              ))}
            </Select>
          </Col>
        </Row>
      </Card>

      {/* القائمة */}
      <Card>
        {loading ? (
          <LoadingSkeleton />
        ) : tickets.length === 0 ? (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description="لا توجد تذاكر"
          >
            <Button type="primary" onClick={() => setShowModal(true)}>
              إنشاء تذكرة جديدة
            </Button>
          </Empty>
        ) : (
          <Table
            columns={columns}
            dataSource={tickets}
            rowKey="id"
            pagination={{ pageSize: 10, showTotal: (total) => `إجمالي ${total} تذكرة` }}
          />
        )}
      </Card>

      {/* موديل إضافة */}
      <Modal
        title="تذكرة جديدة"
        open={showModal}
        onCancel={() => setShowModal(false)}
        onOk={handleCreate}
        okText="إنشاء"
        cancelText="إلغاء"
        confirmLoading={creating}
      >
        <Form layout="vertical">
          <Form.Item label="العنوان" required>
            <Input
              value={newTicket.title}
              onChange={(e) => setNewTicket({ ...newTicket, title: e.target.value })}
              placeholder="وصف مختصر للمشكلة"
            />
          </Form.Item>
          <Form.Item label="التفاصيل">
            <Input.TextArea
              value={newTicket.description}
              onChange={(e) => setNewTicket({ ...newTicket, description: e.target.value })}
              placeholder="اشرح المشكلة بالتفصيل..."
              rows={4}
            />
          </Form.Item>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label="التصنيف">
                <Select
                  value={newTicket.category}
                  onChange={(value) => setNewTicket({ ...newTicket, category: value })}
                >
                  {Object.entries(CATEGORY_CONFIG).map(([k, v]) => (
                    <Select.Option key={k} value={k}>{v.icon} {v.label}</Select.Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="الأولوية">
                <Select
                  value={newTicket.priority}
                  onChange={(value) => setNewTicket({ ...newTicket, priority: value })}
                >
                  {Object.entries(PRIORITY_CONFIG).map(([k, v]) => (
                    <Select.Option key={k} value={k}>{v.icon} {v.label}</Select.Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>
    </div>
  );
}
