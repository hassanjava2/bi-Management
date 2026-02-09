/**
 * صفحة قائمة التذاكر
 */
import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Row, Col, Card, Table, Button, Input, Select, Tag, Space, Statistic, Empty } from "antd";
import { PlusOutlined, SearchOutlined, ClockCircleOutlined, ExclamationCircleOutlined, CheckCircleOutlined, UserOutlined } from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";
import { PageHeader, StatusTag, DateDisplay, LoadingSkeleton } from "../components/shared";
import { API_BASE, getAuthHeaders } from "../utils/api";

interface Ticket {
  id: string;
  ticketNumber: string;
  subject: string;
  customerName: string | null;
  customerEmail: string | null;
  category: string;
  priority: string;
  status: string;
  dueDate: string | null;
  createdAt: string;
  customer: { id: string; fullName: string } | null;
  assignee: { id: string; fullName: string } | null;
}

interface Stats {
  byStatus: Record<string, number>;
  byPriority: Record<string, number>;
  avgResponseHours: number | null;
  todayCount: number;
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  open: { label: "مفتوحة", color: "blue" },
  in_progress: { label: "قيد المعالجة", color: "orange" },
  waiting_customer: { label: "بانتظار العميل", color: "purple" },
  resolved: { label: "تم الحل", color: "green" },
  closed: { label: "مغلقة", color: "default" },
};

const PRIORITY_LABELS: Record<string, { label: string; color: string; icon: string }> = {
  urgent: { label: "عاجلة", color: "red", icon: "🔴" },
  high: { label: "عالية", color: "orange", icon: "🟠" },
  medium: { label: "متوسطة", color: "gold", icon: "🟡" },
  low: { label: "منخفضة", color: "green", icon: "🟢" },
};

const CATEGORY_LABELS: Record<string, string> = {
  technical: "دعم فني",
  sales: "مبيعات",
  warranty: "ضمان",
  complaint: "شكوى",
  inquiry: "استفسار",
  other: "أخرى",
};

export default function TicketsList() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, total: 0, totalPages: 0 });

  const [filters, setFilters] = useState({
    status: searchParams.get("status") || "",
    priority: searchParams.get("priority") || "",
    search: searchParams.get("search") || "",
  });

  useEffect(() => {
    loadData();
  }, [searchParams]);

  const loadData = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.status) params.set("status", filters.status);
      if (filters.priority) params.set("priority", filters.priority);
      if (filters.search) params.set("search", filters.search);
      params.set("page", searchParams.get("page") || "1");

      const [ticketsRes, statsRes] = await Promise.all([
        fetch(`${API_BASE}/api/tickets?${params}`, { headers: getAuthHeaders() }),
        fetch(`${API_BASE}/api/tickets/stats`, { headers: getAuthHeaders() }),
      ]);

      if (ticketsRes.ok) {
        const data = await ticketsRes.json();
        setTickets(data.tickets || []);
        setPagination(data.pagination || { page: 1, total: 0, totalPages: 0 });
      }

      if (statsRes.ok) {
        const data = await statsRes.json();
        setStats(data);
      }
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleFilter = (key: string, value: string) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);

    const params = new URLSearchParams();
    if (newFilters.status) params.set("status", newFilters.status);
    if (newFilters.priority) params.set("priority", newFilters.priority);
    if (newFilters.search) params.set("search", newFilters.search);
    setSearchParams(params);
  };

  const handlePageChange = (page: number) => {
    const params = new URLSearchParams(searchParams);
    params.set("page", String(page));
    setSearchParams(params);
  };

  const getStatusInfo = (status: string) => STATUS_LABELS[status] || STATUS_LABELS.open;
  const getPriorityInfo = (priority: string) => PRIORITY_LABELS[priority] || PRIORITY_LABELS.medium;

  const columns: ColumnsType<Ticket> = [
    {
      title: "رقم التذكرة",
      dataIndex: "ticketNumber",
      key: "ticketNumber",
      render: (text: string, record: Ticket) => {
        const isOverdue = record.dueDate && new Date(record.dueDate) < new Date() && 
          !["resolved", "closed"].includes(record.status);
        return (
          <Space>
            <span style={{ fontFamily: "monospace" }}>{text}</span>
            {isOverdue && <Tag color="red">متأخرة</Tag>}
          </Space>
        );
      },
    },
    {
      title: "الموضوع",
      dataIndex: "subject",
      key: "subject",
      ellipsis: true,
    },
    {
      title: "العميل",
      key: "customer",
      render: (_: any, record: Ticket) => (
        <span>{record.customer?.fullName || record.customerName || "زائر"}</span>
      ),
    },
    {
      title: "التصنيف",
      dataIndex: "category",
      key: "category",
      render: (category: string) => CATEGORY_LABELS[category] || category,
    },
    {
      title: "الأولوية",
      dataIndex: "priority",
      key: "priority",
      render: (priority: string) => {
        const info = getPriorityInfo(priority);
        return (
          <Tag color={info.color}>
            {info.icon} {info.label}
          </Tag>
        );
      },
    },
    {
      title: "الحالة",
      dataIndex: "status",
      key: "status",
      render: (status: string) => {
        const info = getStatusInfo(status);
        return <Tag color={info.color}>{info.label}</Tag>;
      },
    },
    {
      title: "المكلف",
      key: "assignee",
      render: (_: any, record: Ticket) => record.assignee?.fullName || "-",
    },
    {
      title: "التاريخ",
      dataIndex: "createdAt",
      key: "createdAt",
      render: (date: string) => (
        <DateDisplay date={date} format="DD MMM, HH:mm" />
      ),
    },
  ];

  if (loading && !tickets.length) {
    return <LoadingSkeleton />;
  }

  return (
    <div>
      <PageHeader
        title="التذاكر والدعم الفني"
        subtitle="إدارة طلبات الدعم والاستفسارات"
        breadcrumbs={[
          { label: "الرئيسية", path: "/" },
          { label: "التذاكر" },
        ]}
        extra={
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => navigate("/tickets/new")}
          >
            تذكرة جديدة
          </Button>
        }
      />

      {/* إحصائيات */}
      {stats && (
        <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
          <Col xs={24} sm={12} md={8} lg={4} xl={4}>
            <Card>
              <Statistic
                title="تذاكر نشطة"
                value={(stats.byStatus.open || 0) + (stats.byStatus.in_progress || 0)}
                valueStyle={{ color: "#1890ff" }}
                prefix={<ClockCircleOutlined />}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={8} lg={4} xl={4}>
            <Card>
              <Statistic
                title="عاجلة"
                value={stats.byPriority.urgent || 0}
                valueStyle={{ color: "#ff4d4f" }}
                prefix={<ExclamationCircleOutlined />}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={8} lg={4} xl={4}>
            <Card>
              <Statistic
                title="بانتظار العميل"
                value={stats.byStatus.waiting_customer || 0}
                valueStyle={{ color: "#722ed1" }}
                prefix={<UserOutlined />}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={8} lg={4} xl={4}>
            <Card>
              <Statistic
                title="تم حلها"
                value={stats.byStatus.resolved || 0}
                valueStyle={{ color: "#52c41a" }}
                prefix={<CheckCircleOutlined />}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={8} lg={4} xl={4}>
            <Card>
              <Statistic
                title="متوسط الاستجابة"
                value={stats.avgResponseHours || 0}
                suffix="ساعة"
                valueStyle={{ color: "#595959" }}
              />
            </Card>
          </Col>
        </Row>
      )}

      {/* الفلاتر */}
      <Card style={{ marginBottom: 16 }}>
        <Space wrap size="middle">
          <Input
            placeholder="بحث برقم التذكرة أو الموضوع..."
            prefix={<SearchOutlined />}
            value={filters.search}
            onChange={(e) => handleFilter("search", e.target.value)}
            style={{ width: 280 }}
            allowClear
          />
          <Select
            placeholder="كل الحالات"
            value={filters.status || undefined}
            onChange={(value) => handleFilter("status", value || "")}
            style={{ width: 160 }}
            allowClear
          >
            {Object.entries(STATUS_LABELS).map(([key, val]) => (
              <Select.Option key={key} value={key}>{val.label}</Select.Option>
            ))}
          </Select>
          <Select
            placeholder="كل الأولويات"
            value={filters.priority || undefined}
            onChange={(value) => handleFilter("priority", value || "")}
            style={{ width: 160 }}
            allowClear
          >
            {Object.entries(PRIORITY_LABELS).map(([key, val]) => (
              <Select.Option key={key} value={key}>{val.icon} {val.label}</Select.Option>
            ))}
          </Select>
        </Space>
      </Card>

      {/* جدول التذاكر */}
      <Card>
        <Table
          columns={columns}
          dataSource={tickets}
          rowKey="id"
          loading={loading}
          onRow={(record) => ({
            onClick: () => navigate(`/tickets/${record.id}`),
            style: { cursor: "pointer" },
          })}
          pagination={{
            current: pagination.page,
            total: pagination.total,
            pageSize: 20,
            onChange: handlePageChange,
            showSizeChanger: false,
            showTotal: (total) => `إجمالي ${total} تذكرة`,
          }}
          locale={{
            emptyText: (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description="لا توجد تذاكر"
              />
            ),
          }}
        />
      </Card>
    </div>
  );
}
