/**
 * لوحة التحليلات
 */
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Row, Col, Card, Button, Space, Statistic } from "antd";
import {
  BarChartOutlined,
  RiseOutlined,
  FallOutlined,
  TeamOutlined,
  FileTextOutlined,
  UserOutlined,
} from "@ant-design/icons";
import { PageHeader, LoadingSkeleton } from "../components/shared";
import { API_BASE, getAuthHeaders } from "../utils/api";
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
  Legend,
  ComposedChart,
} from "recharts";

type AnalyticsData = {
  salesTrend: { date: string; sales: number; purchases: number; profit: number }[];
  categoryPerformance: { name: string; sales: number; quantity: number }[];
  customerAnalysis: { segment: string; count: number; revenue: number }[];
  cashFlow: { month: string; inflow: number; outflow: number; balance: number }[];
  topCustomers: { name: string; purchases: number; balance: number }[];
  invoiceStatus: { status: string; count: number; total: number }[];
  hrMetrics: { metric: string; value: number; change: number }[];
};

const COLORS = ["#6366f1", "#8b5cf6", "#ec4899", "#f97316", "#22c55e", "#0ea5e9", "#14b8a6", "#ef4444"];

// Mock data
const mockData: AnalyticsData = {
  salesTrend: [
    { date: "01/01", sales: 12500000, purchases: 8200000, profit: 4300000 },
    { date: "01/02", sales: 15800000, purchases: 9500000, profit: 6300000 },
    { date: "01/03", sales: 13200000, purchases: 7800000, profit: 5400000 },
    { date: "01/04", sales: 18500000, purchases: 11200000, profit: 7300000 },
    { date: "01/05", sales: 16900000, purchases: 10100000, profit: 6800000 },
    { date: "01/06", sales: 21200000, purchases: 12800000, profit: 8400000 },
    { date: "01/07", sales: 19800000, purchases: 11500000, profit: 8300000 },
  ],
  categoryPerformance: [
    { name: "إلكترونيات", sales: 45000000, quantity: 320 },
    { name: "أجهزة منزلية", sales: 28000000, quantity: 180 },
    { name: "هواتف", sales: 62000000, quantity: 450 },
    { name: "كمبيوترات", sales: 38000000, quantity: 95 },
    { name: "اكسسوارات", sales: 15000000, quantity: 890 },
  ],
  customerAnalysis: [
    { segment: "VIP", count: 25, revenue: 85000000 },
    { segment: "دائم", count: 120, revenue: 45000000 },
    { segment: "عادي", count: 350, revenue: 28000000 },
    { segment: "جديد", count: 89, revenue: 12000000 },
  ],
  cashFlow: [
    { month: "يناير", inflow: 25000000, outflow: 18000000, balance: 7000000 },
    { month: "فبراير", inflow: 32000000, outflow: 22000000, balance: 10000000 },
    { month: "مارس", inflow: 28000000, outflow: 20000000, balance: 8000000 },
    { month: "أبريل", inflow: 38000000, outflow: 25000000, balance: 13000000 },
    { month: "مايو", inflow: 35000000, outflow: 28000000, balance: 7000000 },
    { month: "يونيو", inflow: 42000000, outflow: 30000000, balance: 12000000 },
  ],
  topCustomers: [
    { name: "شركة الأمل التجارية", purchases: 25000000, balance: 3500000 },
    { name: "مؤسسة النور", purchases: 18500000, balance: 0 },
    { name: "شركة البركة", purchases: 15200000, balance: 2100000 },
    { name: "محلات السعادة", purchases: 12800000, balance: 1500000 },
    { name: "شركة الوفاء", purchases: 11500000, balance: 0 },
  ],
  invoiceStatus: [
    { status: "مدفوع", count: 245, total: 125000000 },
    { status: "جزئي", count: 58, total: 35000000 },
    { status: "معلق", count: 32, total: 18000000 },
  ],
  hrMetrics: [
    { metric: "إجمالي الموظفين", value: 45, change: 5 },
    { metric: "معدل الحضور", value: 94, change: 2 },
    { metric: "إجمالي الرواتب", value: 28500000, change: -3 },
    { metric: "الإجازات المعلقة", value: 8, change: 0 },
  ],
};

export default function Analytics() {
  const [data, setData] = useState<AnalyticsData>(mockData);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<"week" | "month" | "quarter" | "year">("month");

  useEffect(() => {
    document.title = "التحليلات | BI Management v3";
    
    // Simulate loading
    setTimeout(() => {
      setLoading(false);
    }, 500);
  }, []);

  const formatCurrency = (value: number) => {
    if (value >= 1000000) {
      return (value / 1000000).toFixed(1) + "M";
    }
    if (value >= 1000) {
      return (value / 1000).toFixed(0) + "K";
    }
    return value.toString();
  };

  const formatFullCurrency = (value: number) => {
    return value.toLocaleString() + " IQD";
  };

  const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number; name: string; color: string }>; label?: string }) => {
    if (active && payload && payload.length) {
      return (
        <div style={{ background: "#fff", padding: "12px", borderRadius: "8px", boxShadow: "0 4px 15px rgba(0,0,0,0.15)", border: "1px solid #e2e8f0" }}>
          <p style={{ margin: 0, fontWeight: 600, marginBottom: "8px" }}>{label}</p>
          {payload.map((entry, index) => (
            <p key={index} style={{ margin: "4px 0", color: entry.color, fontSize: "14px" }}>
              {entry.name}: {formatFullCurrency(entry.value)}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  if (loading) {
    return <LoadingSkeleton />;
  }

  const periodLabels: Record<string, string> = {
    week: "أسبوع",
    month: "شهر",
    quarter: "ربع",
    year: "سنة",
  };

  return (
    <div>
      <PageHeader
        title="لوحة التحليلات"
        subtitle="تحليل شامل للأداء المالي والتشغيلي"
        icon={<BarChartOutlined />}
        breadcrumbs={[
          { label: "الرئيسية", path: "/" },
          { label: "التحليلات" },
        ]}
        extra={
          <Space>
            {(["week", "month", "quarter", "year"] as const).map((p) => (
              <Button
                key={p}
                type={period === p ? "primary" : "default"}
                onClick={() => setPeriod(p)}
              >
                {periodLabels[p]}
              </Button>
            ))}
          </Space>
        }
      />

      {/* KPI Cards */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        {[
          { label: "إجمالي المبيعات", value: 188000000, change: 12.5, color: "#22c55e" },
          { label: "إجمالي المشتريات", value: 89000000, change: -5.2, color: "#ef4444" },
          { label: "صافي الربح", value: 48500000, change: 18.3, color: "#6366f1" },
          { label: "عدد الفواتير", value: 335, change: 8.7, color: "#f97316" },
        ].map((kpi, idx) => (
          <Col xs={12} sm={12} md={6} key={idx}>
            <Card bordered={false}>
              <Statistic
                title={kpi.label}
                value={typeof kpi.value === "number" && kpi.value > 1000 ? kpi.value : kpi.value}
                formatter={(val) => typeof kpi.value === "number" && kpi.value > 1000 ? formatFullCurrency(kpi.value) : val}
                valueStyle={{ fontWeight: 700, color: "#1e293b" }}
              />
              <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, marginTop: 4 }}>
                <span style={{ color: kpi.change >= 0 ? "#22c55e" : "#ef4444" }}>
                  {kpi.change >= 0 ? <RiseOutlined /> : <FallOutlined />} {Math.abs(kpi.change)}%
                </span>
                <span style={{ color: "#94a3b8" }}>مقارنة بالفترة السابقة</span>
              </div>
            </Card>
          </Col>
        ))}
      </Row>

      {/* Sales Trend & Customer Segments */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} lg={16}>
          <Card title="اتجاه المبيعات والأرباح" bordered={false}>
            <ResponsiveContainer width="100%" height={300}>
              <ComposedChart data={data.salesTrend}>
                <defs>
                  <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                <YAxis tickFormatter={formatCurrency} tick={{ fontSize: 12 }} />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Bar dataKey="sales" name="المبيعات" fill="#22c55e" radius={[4, 4, 0, 0]} barSize={20} />
                <Bar dataKey="purchases" name="المشتريات" fill="#ef4444" radius={[4, 4, 0, 0]} barSize={20} />
                <Area type="monotone" dataKey="profit" name="الربح" stroke="#6366f1" fillOpacity={1} fill="url(#colorProfit)" strokeWidth={2} />
              </ComposedChart>
            </ResponsiveContainer>
          </Card>
        </Col>

        <Col xs={24} lg={8}>
          <Card title="توزيع العملاء" bordered={false}>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={data.customerAnalysis}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={90}
                  paddingAngle={3}
                  dataKey="revenue"
                  nameKey="segment"
                >
                  {data.customerAnalysis.map((_entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number) => [formatFullCurrency(value), "الإيرادات"]} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </Card>
        </Col>
      </Row>

      {/* Category Performance & Cash Flow */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} lg={12}>
          <Card title="أداء التصنيفات" bordered={false}>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={data.categoryPerformance} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis type="number" tickFormatter={formatCurrency} tick={{ fontSize: 11 }} />
                <YAxis type="category" dataKey="name" width={80} tick={{ fontSize: 11 }} />
                <Tooltip formatter={(value: number) => [formatFullCurrency(value), "المبيعات"]} />
                <Bar dataKey="sales" name="المبيعات" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </Col>

        <Col xs={24} lg={12}>
          <Card title="التدفق النقدي" bordered={false}>
            <ResponsiveContainer width="100%" height={250}>
              <AreaChart data={data.cashFlow}>
                <defs>
                  <linearGradient id="colorInflow" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#22c55e" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorOutflow" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tickFormatter={formatCurrency} tick={{ fontSize: 11 }} />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Area type="monotone" dataKey="inflow" name="الوارد" stroke="#22c55e" fillOpacity={1} fill="url(#colorInflow)" />
                <Area type="monotone" dataKey="outflow" name="الصادر" stroke="#ef4444" fillOpacity={1} fill="url(#colorOutflow)" />
              </AreaChart>
            </ResponsiveContainer>
          </Card>
        </Col>
      </Row>

      {/* Top Customers & Invoice Status */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} lg={12}>
          <Card
            title="أفضل العملاء"
            bordered={false}
            extra={<Link to="/customers" style={{ color: "#6366f1" }}>عرض الكل</Link>}
          >
            <Space direction="vertical" style={{ width: "100%" }} size={12}>
              {data.topCustomers.map((customer, idx) => (
                <div
                  key={idx}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: 12,
                    background: "#f8fafc",
                    borderRadius: 8,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: 8,
                        background: `linear-gradient(135deg, ${COLORS[idx]} 0%, ${COLORS[idx]}99 100%)`,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "#fff",
                        fontWeight: 600,
                        fontSize: 14,
                      }}
                    >
                      {idx + 1}
                    </div>
                    <div>
                      <div style={{ fontWeight: 500, fontSize: 14 }}>{customer.name}</div>
                      <div style={{ fontSize: 12, color: "#64748b" }}>
                        المشتريات: {formatFullCurrency(customer.purchases)}
                      </div>
                    </div>
                  </div>
                  <div style={{ textAlign: "left" }}>
                    <div style={{ fontWeight: 600, color: customer.balance > 0 ? "#ef4444" : "#22c55e", fontSize: 14 }}>
                      {customer.balance > 0 ? formatFullCurrency(customer.balance) : "مسدد"}
                    </div>
                  </div>
                </div>
              ))}
            </Space>
          </Card>
        </Col>

        <Col xs={24} lg={12}>
          <Card title="حالة الفواتير" bordered={false}>
            <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
              {data.invoiceStatus.map((status, idx) => (
                <Col span={8} key={idx}>
                  <div
                    style={{
                      padding: 16,
                      background: idx === 0 ? "#dcfce7" : idx === 1 ? "#fef3c7" : "#fee2e2",
                      borderRadius: 10,
                      textAlign: "center",
                    }}
                  >
                    <div style={{ fontSize: 24, fontWeight: 700, color: idx === 0 ? "#15803d" : idx === 1 ? "#b45309" : "#b91c1c" }}>
                      {status.count}
                    </div>
                    <div style={{ fontSize: 12, color: idx === 0 ? "#166534" : idx === 1 ? "#92400e" : "#991b1b" }}>
                      {status.status}
                    </div>
                  </div>
                </Col>
              ))}
            </Row>
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie
                  data={data.invoiceStatus}
                  cx="50%"
                  cy="50%"
                  outerRadius={70}
                  dataKey="total"
                  nameKey="status"
                  label={({ status, percent }) => `${status} ${(percent * 100).toFixed(0)}%`}
                  labelLine={false}
                >
                  {data.invoiceStatus.map((_entry, index) => (
                    <Cell key={`cell-${index}`} fill={["#22c55e", "#f59e0b", "#ef4444"][index]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number) => [formatFullCurrency(value), "المبلغ"]} />
              </PieChart>
            </ResponsiveContainer>
          </Card>
        </Col>
      </Row>

      {/* HR Metrics */}
      <Card
        title="مؤشرات الموارد البشرية"
        bordered={false}
        extra={<Link to="/hr/employees" style={{ color: "#6366f1" }}>إدارة الموظفين</Link>}
      >
        <Row gutter={[16, 16]}>
          {data.hrMetrics.map((metric, idx) => (
            <Col xs={12} sm={12} md={6} key={idx}>
              <div
                style={{
                  padding: 20,
                  background: "#f8fafc",
                  borderRadius: 10,
                  borderRight: `4px solid ${COLORS[idx]}`,
                }}
              >
                <div style={{ color: "#64748b", fontSize: 12, marginBottom: 4 }}>{metric.metric}</div>
                <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                  <span style={{ fontSize: 24, fontWeight: 700, color: "#1e293b" }}>
                    {metric.value > 10000 ? formatCurrency(metric.value) : metric.value}
                    {metric.metric.includes("معدل") && "%"}
                  </span>
                  {metric.change !== 0 && (
                    <span style={{ fontSize: 12, color: metric.change > 0 ? "#22c55e" : "#ef4444" }}>
                      {metric.change > 0 ? <RiseOutlined /> : <FallOutlined />} {Math.abs(metric.change)}%
                    </span>
                  )}
                </div>
              </div>
            </Col>
          ))}
        </Row>
      </Card>
    </div>
  );
}
