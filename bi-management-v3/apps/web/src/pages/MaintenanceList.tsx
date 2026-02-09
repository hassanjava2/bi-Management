/**
 * صفحة قائمة طلبات الصيانة
 */
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Row, Col, Card, Table, Button, Input, Select, Tag, Space, Statistic, Empty } from "antd";
import { PlusOutlined, SearchOutlined, ToolOutlined, ClockCircleOutlined, DollarOutlined, CheckCircleOutlined } from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";
import { PageHeader, MoneyDisplay, DateDisplay, LoadingSkeleton } from "../components/shared";
import { API_BASE, getAuthHeaders } from "../utils/api";

interface MaintenanceOrder {
  id: string;
  orderNumber: string;
  type: string;
  serialNumber: string;
  productName: string;
  customerName: string;
  customerPhone: string;
  issueDescription: string;
  issueCategory: string;
  status: string;
  isWarranty: number;
  estimatedCost: number;
  totalCost: number;
  paymentStatus: string;
  technicianName: string;
  expectedCompletion: string;
  createdAt: string;
}

interface Stats {
  statusCounts: { status: string; count: number }[];
  todayCount: number;
  totalRevenue: number;
  avgRepairHours: number;
}

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  received: { label: "تم الاستلام", color: "default" },
  diagnosing: { label: "قيد الفحص", color: "gold" },
  waiting_approval: { label: "بانتظار الموافقة", color: "orange" },
  waiting_parts: { label: "بانتظار قطع الغيار", color: "purple" },
  in_progress: { label: "قيد الإصلاح", color: "blue" },
  completed: { label: "مكتمل", color: "green" },
  delivered: { label: "تم التسليم", color: "cyan" },
  cancelled: { label: "ملغي", color: "red" },
};

export default function MaintenanceList() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState<MaintenanceOrder[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({ status: "", search: "" });

  useEffect(() => {
    fetchData();
  }, [filter]);

  async function fetchData() {
    try {
      const params = new URLSearchParams();
      if (filter.status) params.append("status", filter.status);
      if (filter.search) params.append("search", filter.search);

      const [ordersRes, statsRes] = await Promise.all([
        fetch(`${API_BASE}/api/maintenance?${params}`, {
          headers: getAuthHeaders(),
        }),
        fetch(`${API_BASE}/api/maintenance/stats/overview`, {
          headers: getAuthHeaders(),
        }),
      ]);

      const ordersData = await ordersRes.json();
      const statsData = await statsRes.json();

      setOrders(ordersData.orders || []);
      setStats(statsData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  const columns: ColumnsType<MaintenanceOrder> = [
    {
      title: "رقم الطلب",
      dataIndex: "orderNumber",
      key: "orderNumber",
      render: (text: string, record: MaintenanceOrder) => (
        <Space>
          <span style={{ fontFamily: "monospace", fontWeight: 500, color: "#1890ff" }}>{text}</span>
          {record.isWarranty === 1 && <Tag color="green">ضمان</Tag>}
        </Space>
      ),
    },
    {
      title: "العميل",
      key: "customer",
      render: (_: any, record: MaintenanceOrder) => (
        <div>
          <div style={{ fontWeight: 500 }}>{record.customerName || "-"}</div>
          <div style={{ fontSize: 12, color: "#8c8c8c", fontFamily: "monospace" }}>
            {record.customerPhone}
          </div>
        </div>
      ),
    },
    {
      title: "الجهاز",
      key: "device",
      render: (_: any, record: MaintenanceOrder) => (
        <div>
          <div>{record.productName || "-"}</div>
          {record.serialNumber && (
            <div style={{ fontSize: 12, color: "#8c8c8c", fontFamily: "monospace" }}>
              {record.serialNumber}
            </div>
          )}
        </div>
      ),
    },
    {
      title: "المشكلة",
      key: "issue",
      ellipsis: true,
      render: (_: any, record: MaintenanceOrder) => (
        <div>
          <div style={{ maxWidth: 200 }} className="truncate">{record.issueDescription}</div>
          {record.issueCategory && (
            <Tag style={{ marginTop: 4 }}>{record.issueCategory}</Tag>
          )}
        </div>
      ),
    },
    {
      title: "الحالة",
      dataIndex: "status",
      key: "status",
      render: (status: string) => {
        const config = STATUS_CONFIG[status] || { label: status, color: "default" };
        return <Tag color={config.color}>{config.label}</Tag>;
      },
    },
    {
      title: "التكلفة",
      key: "cost",
      render: (_: any, record: MaintenanceOrder) => (
        <MoneyDisplay amount={record.totalCost || record.estimatedCost} />
      ),
    },
    {
      title: "الفني",
      dataIndex: "technicianName",
      key: "technicianName",
      render: (text: string) => text || "-",
    },
    {
      title: "التاريخ",
      dataIndex: "createdAt",
      key: "createdAt",
      render: (date: string) => <DateDisplay date={date} format="DD MMM, HH:mm" />,
    },
  ];

  if (loading && !orders.length) {
    return <LoadingSkeleton />;
  }

  const activeCount = stats?.statusCounts
    .filter((s) => !["delivered", "cancelled"].includes(s.status))
    .reduce((sum, s) => sum + s.count, 0) || 0;

  return (
    <div>
      <PageHeader
        title="الصيانة والإصلاح"
        subtitle="إدارة طلبات الصيانة"
        breadcrumbs={[
          { label: "الرئيسية", path: "/" },
          { label: "الصيانة" },
        ]}
        extra={
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => navigate("/maintenance/new")}
          >
            طلب صيانة جديد
          </Button>
        }
      />

      {/* إحصائيات */}
      {stats && (
        <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
          <Col xs={24} sm={12} md={6}>
            <Card>
              <Statistic
                title="طلبات اليوم"
                value={stats.todayCount}
                valueStyle={{ color: "#1890ff" }}
                prefix={<ToolOutlined />}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Card>
              <Statistic
                title="قيد المعالجة"
                value={activeCount}
                valueStyle={{ color: "#fa8c16" }}
                prefix={<ClockCircleOutlined />}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Card>
              <Statistic
                title="إجمالي الإيرادات"
                value={stats.totalRevenue}
                valueStyle={{ color: "#52c41a" }}
                prefix={<DollarOutlined />}
                suffix="د.ع"
                formatter={(value) => new Intl.NumberFormat("ar-IQ").format(Number(value))}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Card>
              <Statistic
                title="متوسط وقت الإصلاح"
                value={stats.avgRepairHours}
                valueStyle={{ color: "#722ed1" }}
                suffix="ساعة"
                prefix={<CheckCircleOutlined />}
              />
            </Card>
          </Col>
        </Row>
      )}

      {/* الفلاتر */}
      <Card style={{ marginBottom: 16 }}>
        <Space wrap size="middle">
          <Input
            placeholder="بحث برقم الطلب أو الوصف..."
            prefix={<SearchOutlined />}
            value={filter.search}
            onChange={(e) => setFilter({ ...filter, search: e.target.value })}
            style={{ width: 280 }}
            allowClear
          />
          <Select
            placeholder="جميع الحالات"
            value={filter.status || undefined}
            onChange={(value) => setFilter({ ...filter, status: value || "" })}
            style={{ width: 180 }}
            allowClear
          >
            {Object.entries(STATUS_CONFIG).map(([key, val]) => (
              <Select.Option key={key} value={key}>{val.label}</Select.Option>
            ))}
          </Select>
        </Space>
      </Card>

      {/* فلترة سريعة بالحالات */}
      {stats && (
        <Space wrap style={{ marginBottom: 16 }}>
          {stats.statusCounts.map((stat) => {
            const config = STATUS_CONFIG[stat.status] || { label: stat.status, color: "default" };
            const isActive = filter.status === stat.status;
            return (
              <Button
                key={stat.status}
                type={isActive ? "primary" : "default"}
                onClick={() => setFilter({
                  ...filter,
                  status: isActive ? "" : stat.status,
                })}
                style={{ borderRadius: 20 }}
              >
                <Space>
                  <Tag color={config.color} style={{ marginInlineEnd: 0 }}>{config.label}</Tag>
                  <span style={{ fontWeight: 600 }}>{stat.count}</span>
                </Space>
              </Button>
            );
          })}
        </Space>
      )}

      {/* جدول الطلبات */}
      <Card>
        <Table
          columns={columns}
          dataSource={orders}
          rowKey="id"
          loading={loading}
          onRow={(record) => ({
            onClick: () => navigate(`/maintenance/${record.id}`),
            style: { cursor: "pointer" },
          })}
          pagination={{
            pageSize: 20,
            showSizeChanger: false,
            showTotal: (total) => `إجمالي ${total} طلب`,
          }}
          locale={{
            emptyText: (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description="لا توجد طلبات صيانة"
              />
            ),
          }}
        />
      </Card>
    </div>
  );
}
