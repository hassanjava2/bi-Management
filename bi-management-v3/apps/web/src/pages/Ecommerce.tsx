import { useEffect, useState } from "react";
import { Row, Col, Card, Table, Button, Select, Tag, Space, message, Statistic, Empty, Tabs } from "antd";
import {
  ShoppingOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  DollarOutlined,
  CalendarOutlined,
  TagOutlined,
  SettingOutlined,
} from "@ant-design/icons";
import { PageHeader, StatusTag, MoneyDisplay, DateDisplay, LoadingSkeleton } from "../components/shared";
import { API_BASE, getAuthHeaders } from "../utils/api";

type Order = {
  id: string;
  orderNumber: string | null;
  status: string | null;
  paymentStatus: string | null;
  total: number | null;
  createdAt: string | null;
  customer: { id: string; name: string; email: string | null } | null;
};

type OrderStats = {
  total: number;
  pending: number;
  processing: number;
  delivered: number;
  totalRevenue: number;
  todayOrders: number;
};

const statusConfig: Record<string, { color: string; text: string }> = {
  pending: { color: "warning", text: "قيد الانتظار" },
  confirmed: { color: "blue", text: "مؤكد" },
  processing: { color: "purple", text: "قيد التحضير" },
  shipped: { color: "cyan", text: "تم الشحن" },
  delivered: { color: "success", text: "تم التسليم" },
  cancelled: { color: "error", text: "ملغي" },
};

const paymentConfig: Record<string, { color: string; text: string }> = {
  paid: { color: "success", text: "مدفوع" },
  pending: { color: "warning", text: "غير مدفوع" },
};

export default function Ecommerce() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [stats, setStats] = useState<OrderStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [activeTab, setActiveTab] = useState<string>("orders");

  useEffect(() => {
    document.title = "التجارة الإلكترونية | BI Management v3";
  }, []);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (statusFilter) params.append("status", statusFilter);

    Promise.all([
      fetch(`${API_BASE}/api/ecommerce/orders?${params}`, { headers: getAuthHeaders() }).then((r) => r.json()),
      fetch(`${API_BASE}/api/ecommerce/orders/stats`, { headers: getAuthHeaders() }).then((r) => r.json()),
    ])
      .then(([ordersRes, statsRes]) => {
        setOrders(ordersRes.items || []);
        setStats(statsRes);
      })
      .catch((e) => {
        setError(e.message);
        message.error("فشل في تحميل البيانات");
      })
      .finally(() => setLoading(false));
  }, [statusFilter]);

  const columns = [
    {
      title: "رقم الطلب",
      dataIndex: "orderNumber",
      key: "orderNumber",
      render: (orderNumber: string | null) => <code style={{ fontWeight: 500 }}>{orderNumber || "-"}</code>,
    },
    {
      title: "العميل",
      dataIndex: "customer",
      key: "customer",
      render: (customer: Order["customer"]) => (
        <div>
          <div>{customer?.name || "-"}</div>
          {customer?.email && <div style={{ fontSize: "0.8rem", color: "#8c8c8c" }}>{customer.email}</div>}
        </div>
      ),
    },
    {
      title: "الإجمالي",
      dataIndex: "total",
      key: "total",
      render: (total: number | null) => <MoneyDisplay amount={total} currency="IQD" style={{ fontWeight: 600 }} />,
    },
    {
      title: "الدفع",
      dataIndex: "paymentStatus",
      key: "paymentStatus",
      render: (status: string | null) => {
        const config = paymentConfig[status || ""] || { color: "default", text: status || "-" };
        return <Tag color={config.color}>{config.text}</Tag>;
      },
    },
    {
      title: "الحالة",
      dataIndex: "status",
      key: "status",
      render: (status: string | null) => {
        const config = statusConfig[status || ""] || { color: "default", text: status || "-" };
        return <StatusTag status={status || ""} color={config.color} text={config.text} />;
      },
    },
    {
      title: "التاريخ",
      dataIndex: "createdAt",
      key: "createdAt",
      render: (date: string | null) => <DateDisplay date={date} showTime />,
    },
  ];

  const tabItems = [
    {
      key: "orders",
      label: "الطلبات",
      children: (
        <div>
          <Space style={{ marginBottom: 16 }}>
            <Select
              value={statusFilter}
              onChange={setStatusFilter}
              style={{ minWidth: 150 }}
              placeholder="جميع الحالات"
              allowClear
            >
              <Select.Option value="">جميع الحالات</Select.Option>
              <Select.Option value="pending">قيد الانتظار</Select.Option>
              <Select.Option value="confirmed">مؤكد</Select.Option>
              <Select.Option value="processing">قيد التحضير</Select.Option>
              <Select.Option value="shipped">تم الشحن</Select.Option>
              <Select.Option value="delivered">تم التسليم</Select.Option>
            </Select>
          </Space>

          <Table
            dataSource={orders}
            columns={columns}
            rowKey="id"
            loading={loading}
            locale={{ emptyText: <Empty description="لا توجد طلبات" /> }}
            pagination={{ pageSize: 10, showSizeChanger: true, showTotal: (total) => `إجمالي ${total} طلب` }}
          />
        </div>
      ),
    },
    {
      key: "discounts",
      label: "أكواد الخصم",
      children: (
        <Empty
          image={<TagOutlined style={{ fontSize: 64, color: "#d9d9d9" }} />}
          description="أكواد الخصم"
        >
          <Button type="primary">إضافة كود خصم</Button>
        </Empty>
      ),
    },
  ];

  if (loading && !stats) {
    return <LoadingSkeleton />;
  }

  return (
    <div>
      <PageHeader
        title="التجارة الإلكترونية"
        subtitle="إدارة الطلبات والمتجر الإلكتروني"
        breadcrumbs={[
          { label: "الرئيسية", path: "/" },
          { label: "التجارة الإلكترونية" },
        ]}
        extra={
          <Space>
            <Button icon={<TagOutlined />} onClick={() => setActiveTab("discounts")}>
              أكواد الخصم
            </Button>
            <Button type="primary" icon={<SettingOutlined />} style={{ background: "#ec4899", borderColor: "#ec4899" }}>
              إعدادات المتجر
            </Button>
          </Space>
        }
      />

      {stats && (
        <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
          <Col xs={12} sm={8} md={4}>
            <Card>
              <Statistic
                title="إجمالي الطلبات"
                value={stats.total}
                prefix={<ShoppingOutlined />}
                valueStyle={{ color: "#1890ff" }}
              />
            </Card>
          </Col>
          <Col xs={12} sm={8} md={4}>
            <Card>
              <Statistic
                title="قيد الانتظار"
                value={stats.pending}
                prefix={<ClockCircleOutlined />}
                valueStyle={{ color: "#faad14" }}
              />
            </Card>
          </Col>
          <Col xs={12} sm={8} md={4}>
            <Card>
              <Statistic
                title="تم التسليم"
                value={stats.delivered}
                prefix={<CheckCircleOutlined />}
                valueStyle={{ color: "#52c41a" }}
              />
            </Card>
          </Col>
          <Col xs={12} sm={8} md={6}>
            <Card>
              <Statistic
                title="إجمالي الإيرادات"
                value={stats.totalRevenue}
                prefix={<DollarOutlined />}
                valueStyle={{ color: "#eb2f96" }}
                formatter={(value) => <MoneyDisplay amount={value as number} currency="IQD" />}
              />
            </Card>
          </Col>
          <Col xs={12} sm={8} md={6}>
            <Card>
              <Statistic
                title="طلبات اليوم"
                value={stats.todayOrders}
                prefix={<CalendarOutlined />}
                valueStyle={{ color: "#722ed1" }}
              />
            </Card>
          </Col>
        </Row>
      )}

      <Card>
        <Tabs activeKey={activeTab} onChange={setActiveTab} items={tabItems} />
      </Card>
    </div>
  );
}
