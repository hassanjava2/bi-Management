import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { API_BASE, getAuthHeaders } from "../utils/api";
import {
  Row,
  Col,
  Card,
  Statistic,
  Typography,
  Alert,
  Space,
  Button,
  Table,
  Tag,
  Spin,
  Progress,
} from "antd";
import {
  ShoppingOutlined,
  TeamOutlined,
  MobileOutlined,
  ToolOutlined,
  TruckOutlined,
  ShoppingCartOutlined,
  FileTextOutlined,
  PlusOutlined,
  RightOutlined,
  DollarOutlined,
  RiseOutlined,
  SettingOutlined,
  AppstoreOutlined,
  BarChartOutlined,
} from "@ant-design/icons";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { StatsCard } from "../components/shared";

const { Title, Text } = Typography;

interface Overview {
  counts: {
    products: number;
    customers: number;
    devices: number;
    activeMaintenance: number;
    pendingShipments: number;
    pendingPurchases: number;
  };
  sales: {
    today: { count: number; total: number };
    month: { count: number; total: number };
    year: { count: number; total: number };
  };
  devicesByStatus: { status: string; count: number }[];
}

interface SalesData {
  date: string;
  day: string;
  count: number;
  total: number;
}

interface RecentInvoice {
  id: string;
  invoiceNumber: string;
  type: string;
  customerName: string;
  total: number;
  status: string;
  createdAt: string;
}

interface AlertItem {
  type: "info" | "warning" | "error";
  title: string;
  message: string;
  link: string;
}

interface TopProduct {
  productId: string;
  productName: string;
  totalQty: number;
  totalSales: number;
}

const CHART_COLORS = ["#3730a3", "#6366f1", "#8b5cf6", "#a855f7", "#22c55e", "#0ea5e9", "#14b8a6"];

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  available: { label: "متاح", color: "#22c55e" },
  reserved: { label: "محجوز", color: "#f59e0b" },
  sold: { label: "مباع", color: "#3b82f6" },
  in_custody: { label: "عهدة", color: "#8b5cf6" },
  in_maintenance: { label: "صيانة", color: "#f97316" },
  damaged: { label: "تالف", color: "#ef4444" },
};

export default function Dashboard() {
  const [overview, setOverview] = useState<Overview | null>(null);
  const [salesData, setSalesData] = useState<SalesData[]>([]);
  const [recentInvoices, setRecentInvoices] = useState<RecentInvoice[]>([]);
  const [topProducts, setTopProducts] = useState<TopProduct[]>([]);
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    document.title = "لوحة التحكم | BI Management v3";
    fetchDashboardData();
  }, []);

  async function fetchDashboardData() {
    try {
      const headers = getAuthHeaders();

      const [overviewRes, salesRes, invoicesRes, productsRes, alertsRes] = await Promise.all([
        fetch(`${API_BASE}/api/dashboard/overview`, { headers }),
        fetch(`${API_BASE}/api/dashboard/sales-chart?days=7`, { headers }),
        fetch(`${API_BASE}/api/dashboard/recent-invoices?limit=5`, { headers }),
        fetch(`${API_BASE}/api/dashboard/top-products?limit=5`, { headers }),
        fetch(`${API_BASE}/api/dashboard/alerts`, { headers }),
      ]);

      const [overviewData, salesChartData, invoicesData, productsData, alertsData] = await Promise.all([
        overviewRes.json(),
        salesRes.json(),
        invoicesRes.json(),
        productsRes.json(),
        alertsRes.json(),
      ]);

      setOverview(overviewData);
      setSalesData(salesChartData.data || []);
      setRecentInvoices(invoicesData.invoices || []);
      setTopProducts(productsData.products || []);
      setAlerts(alertsData.alerts || []);
    } catch (e) {
      console.error(e);
      setError("فشل في تحميل البيانات");
    } finally {
      setLoading(false);
    }
  }

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "صباح الخير";
    return "مساء الخير";
  };

  const formatCurrency = (value: number) => {
    if (value >= 1000000) {
      return (value / 1000000).toFixed(1) + "M";
    }
    if (value >= 1000) {
      return (value / 1000).toFixed(0) + "K";
    }
    return value.toLocaleString();
  };

  const formatFullCurrency = (value: number) => {
    return new Intl.NumberFormat("ar-IQ").format(value) + " د.ع";
  };

  const formatDate = (date: string) => {
    return new Intl.DateTimeFormat("ar-IQ", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(date));
  };

  const invoiceColumns = [
    {
      title: "رقم الفاتورة",
      dataIndex: "invoiceNumber",
      key: "invoiceNumber",
      render: (text: string, record: RecentInvoice) => (
        <Link to={`/invoices/${record.id}`} style={{ fontWeight: 500 }}>
          {text}
        </Link>
      ),
    },
    {
      title: "العميل",
      dataIndex: "customerName",
      key: "customerName",
      render: (text: string) => text || <Text type="secondary">عميل نقدي</Text>,
    },
    {
      title: "المبلغ",
      dataIndex: "total",
      key: "total",
      render: (value: number) => (
        <Text strong style={{ color: "#059669" }}>
          {formatFullCurrency(value)}
        </Text>
      ),
    },
    {
      title: "التاريخ",
      dataIndex: "createdAt",
      key: "createdAt",
      render: (date: string) => <Text type="secondary">{formatDate(date)}</Text>,
    },
  ];

  const quickActions = [
    { to: "/invoices/new", label: "فاتورة جديدة", icon: <FileTextOutlined />, color: "#14b8a6" },
    { to: "/maintenance/new", label: "طلب صيانة", icon: <ToolOutlined />, color: "#f97316" },
    { to: "/purchases/new", label: "وجبة شراء", icon: <ShoppingCartOutlined />, color: "#8b5cf6" },
    { to: "/pos", label: "نقطة البيع", icon: <AppstoreOutlined />, color: "#22c55e" },
    { to: "/devices", label: "سجل الأجهزة", icon: <MobileOutlined />, color: "#3b82f6" },
    { to: "/delivery/shipments", label: "الشحنات", icon: <TruckOutlined />, color: "#ec4899" },
    { to: "/reports", label: "التقارير", icon: <BarChartOutlined />, color: "#6366f1" },
    { to: "/system-settings", label: "الإعدادات", icon: <SettingOutlined />, color: "#64748b" },
  ];

  const statsItems = overview
    ? [
        { label: "المنتجات", value: overview.counts.products, link: "/products", icon: <ShoppingOutlined />, color: "#3b82f6" },
        { label: "العملاء", value: overview.counts.customers, link: "/customers", icon: <TeamOutlined />, color: "#8b5cf6" },
        { label: "الأجهزة", value: overview.counts.devices, link: "/devices", icon: <MobileOutlined />, color: "#14b8a6" },
        { label: "صيانة نشطة", value: overview.counts.activeMaintenance, link: "/maintenance", icon: <ToolOutlined />, color: "#f97316" },
        { label: "شحنات معلقة", value: overview.counts.pendingShipments, link: "/delivery/shipments", icon: <TruckOutlined />, color: "#ec4899" },
        { label: "مشتريات معلقة", value: overview.counts.pendingPurchases, link: "/purchases", icon: <ShoppingCartOutlined />, color: "#22c55e" },
      ]
    : [];

  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "50vh" }}>
        <Spin size="large" tip="جاري تحميل البيانات..." />
      </div>
    );
  }

  return (
    <div>
      {/* Welcome Header */}
      <div style={{ marginBottom: 24, display: "flex", alignItems: "center", gap: 16 }}>
        <img
          src="/assets/logo.svg"
          alt="BI"
          style={{ width: 56, height: 56, borderRadius: 12, boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }}
        />
        <div>
          <Title level={3} style={{ margin: 0 }}>
            لوحة التحكم
          </Title>
          <Text type="secondary">{getGreeting()}، مرحبا بك في نظام BI Management</Text>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <Alert
          message="خطأ"
          description={error}
          type="error"
          showIcon
          closable
          style={{ marginBottom: 24 }}
        />
      )}

      {/* System Alerts */}
      {alerts.length > 0 && (
        <Space direction="vertical" style={{ width: "100%", marginBottom: 24 }}>
          {alerts.map((alert, i) => (
            <Link to={alert.link} key={i}>
              <Alert
                message={alert.title}
                description={alert.message}
                type={alert.type === "error" ? "error" : alert.type === "warning" ? "warning" : "info"}
                showIcon
                style={{ cursor: "pointer" }}
              />
            </Link>
          ))}
        </Space>
      )}

      {/* Sales Summary Cards */}
      {overview && (
        <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
          <Col xs={24} md={8}>
            <Card
              style={{
                background: "linear-gradient(135deg, #059669 0%, #10b981 100%)",
                border: "none",
              }}
              styles={{ body: { padding: "24px" } }}
            >
              <Statistic
                title={<span style={{ color: "rgba(255,255,255,0.85)" }}>مبيعات اليوم</span>}
                value={overview.sales.today.total}
                suffix="د.ع"
                valueStyle={{ color: "#fff", fontSize: 28, fontWeight: 600 }}
                formatter={(value) => new Intl.NumberFormat("ar-IQ").format(value as number)}
              />
              <div style={{ color: "rgba(255,255,255,0.8)", marginTop: 8 }}>
                {overview.sales.today.count} فاتورة
              </div>
            </Card>
          </Col>
          <Col xs={24} md={8}>
            <Card
              style={{
                background: "linear-gradient(135deg, #3730a3 0%, #6366f1 100%)",
                border: "none",
              }}
              styles={{ body: { padding: "24px" } }}
            >
              <Statistic
                title={<span style={{ color: "rgba(255,255,255,0.85)" }}>مبيعات الشهر</span>}
                value={overview.sales.month.total}
                suffix="د.ع"
                valueStyle={{ color: "#fff", fontSize: 28, fontWeight: 600 }}
                formatter={(value) => new Intl.NumberFormat("ar-IQ").format(value as number)}
              />
              <div style={{ color: "rgba(255,255,255,0.8)", marginTop: 8 }}>
                {overview.sales.month.count} فاتورة
              </div>
            </Card>
          </Col>
          <Col xs={24} md={8}>
            <Card
              style={{
                background: "linear-gradient(135deg, #7c3aed 0%, #a855f7 100%)",
                border: "none",
              }}
              styles={{ body: { padding: "24px" } }}
            >
              <Statistic
                title={<span style={{ color: "rgba(255,255,255,0.85)" }}>مبيعات السنة</span>}
                value={overview.sales.year.total}
                suffix="د.ع"
                valueStyle={{ color: "#fff", fontSize: 28, fontWeight: 600 }}
                formatter={(value) => new Intl.NumberFormat("ar-IQ").format(value as number)}
              />
              <div style={{ color: "rgba(255,255,255,0.8)", marginTop: 8 }}>
                {overview.sales.year.count} فاتورة
              </div>
            </Card>
          </Col>
        </Row>
      )}

      {/* Quick Stats */}
      {overview && (
        <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
          {statsItems.map((item) => (
            <Col xs={12} sm={8} md={4} key={item.label}>
              <Link to={item.link}>
                <Card
                  hoverable
                  style={{ borderRight: `4px solid ${item.color}` }}
                  styles={{ body: { padding: "16px" } }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div
                      style={{
                        width: 40,
                        height: 40,
                        borderRadius: 8,
                        background: `${item.color}15`,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 18,
                        color: item.color,
                      }}
                    >
                      {item.icon}
                    </div>
                    <div>
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        {item.label}
                      </Text>
                      <div style={{ fontSize: 22, fontWeight: 600, color: item.color }}>
                        {item.value}
                      </div>
                    </div>
                  </div>
                </Card>
              </Link>
            </Col>
          ))}
        </Row>
      )}

      {/* Charts Row */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        {/* Sales Chart */}
        <Col xs={24} lg={12}>
          <Card title="مبيعات آخر 7 أيام" styles={{ body: { padding: "16px" } }}>
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={salesData}>
                <defs>
                  <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3730a3" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#3730a3" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="day" tick={{ fontSize: 12 }} />
                <YAxis tickFormatter={formatCurrency} tick={{ fontSize: 12 }} />
                <Tooltip
                  formatter={(value: number) => [formatFullCurrency(value), "المبيعات"]}
                  contentStyle={{ direction: "rtl" }}
                />
                <Area
                  type="monotone"
                  dataKey="total"
                  stroke="#3730a3"
                  fillOpacity={1}
                  fill="url(#colorTotal)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </Card>
        </Col>

        {/* Devices by Status */}
        <Col xs={24} lg={12}>
          <Card title="حالة الأجهزة" styles={{ body: { padding: "16px" } }}>
            {overview && overview.devicesByStatus.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie
                    data={overview.devicesByStatus.map((d) => ({
                      ...d,
                      name: STATUS_CONFIG[d.status]?.label || d.status,
                    }))}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={3}
                    dataKey="count"
                    nameKey="name"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    labelLine={false}
                  >
                    {overview.devicesByStatus.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={STATUS_CONFIG[entry.status]?.color || CHART_COLORS[index % CHART_COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => [value + " جهاز", "العدد"]} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ textAlign: "center", padding: 40 }}>
                <Text type="secondary">لا توجد بيانات</Text>
              </div>
            )}
          </Card>
        </Col>
      </Row>

      {/* Bottom Row */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        {/* Top Products */}
        <Col xs={24} lg={12}>
          <Card title="أكثر المنتجات مبيعاً" styles={{ body: { padding: "16px" } }}>
            {topProducts.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={topProducts} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis type="number" tickFormatter={formatCurrency} tick={{ fontSize: 11 }} />
                  <YAxis type="category" dataKey="productName" width={120} tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(value: number) => [formatFullCurrency(value), "المبيعات"]} />
                  <Bar dataKey="totalSales" fill="#3730a3" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ textAlign: "center", padding: 40 }}>
                <Text type="secondary">لا توجد بيانات</Text>
              </div>
            )}
          </Card>
        </Col>

        {/* Recent Invoices */}
        <Col xs={24} lg={12}>
          <Card
            title="أحدث الفواتير"
            extra={
              <Link to="/invoices">
                <Button type="link" size="small">
                  عرض الكل <RightOutlined />
                </Button>
              </Link>
            }
            styles={{ body: { padding: 0 } }}
          >
            <Table
              columns={invoiceColumns}
              dataSource={recentInvoices}
              rowKey="id"
              pagination={false}
              size="small"
              locale={{ emptyText: "لا توجد فواتير" }}
            />
          </Card>
        </Col>
      </Row>

      {/* Quick Actions */}
      <Card title="إجراءات سريعة">
        <Row gutter={[12, 12]}>
          {quickActions.map(({ to, label, icon, color }) => (
            <Col key={to}>
              <Link to={to}>
                <Button
                  size="large"
                  icon={icon}
                  style={{
                    background: `${color}10`,
                    borderColor: `${color}30`,
                    color: color,
                  }}
                >
                  {label}
                </Button>
              </Link>
            </Col>
          ))}
        </Row>
      </Card>
    </div>
  );
}
