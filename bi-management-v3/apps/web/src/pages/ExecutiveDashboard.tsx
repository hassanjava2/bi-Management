/**
 * لوحة المعلومات التنفيذية
 * Executive Dashboard
 */
import { useState, useEffect } from "react";
import { Row, Col, Card, Statistic, Progress, Tag, Space, Select, Table, Empty } from "antd";
import {
  DollarOutlined, ShoppingCartOutlined, TeamOutlined, RiseOutlined,
  FallOutlined, WarningOutlined, TrophyOutlined, DashboardOutlined,
  BankOutlined, ShopOutlined, BarChartOutlined, AlertOutlined,
} from "@ant-design/icons";
import { PageHeader, LoadingSkeleton } from "../components/shared";
import { API_BASE, getAuthHeaders } from "../utils/api";
import { Link } from "react-router-dom";

interface DashboardStats {
  overview: any;
  salesChart: any[];
  recentInvoices: any[];
  topProducts: any[];
  topCustomers: any[];
  alerts: any[];
  inventorySummary: any;
}

export default function ExecutiveDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState("month");

  useEffect(() => { loadData(); }, [period]);

  const loadData = async () => {
    setLoading(true);
    try {
      const endpoints = [
        "overview", "sales-chart", "recent-invoices",
        "top-products", "top-customers", "alerts", "inventory-summary",
      ];

      const responses = await Promise.all(
        endpoints.map(ep =>
          fetch(`${API_BASE}/api/dashboard/${ep}?period=${period}`, { headers: getAuthHeaders() })
            .then(r => r.ok ? r.json() : null)
            .catch(() => null)
        )
      );

      setStats({
        overview: responses[0] || {},
        salesChart: responses[1]?.data || [],
        recentInvoices: responses[2]?.data || [],
        topProducts: responses[3]?.data || [],
        topCustomers: responses[4]?.data || [],
        alerts: responses[5]?.data || [],
        inventorySummary: responses[6] || {},
      });
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <LoadingSkeleton />;

  const overview = stats?.overview || {};

  return (
    <div>
      <PageHeader
        title="لوحة المعلومات التنفيذية"
        subtitle="نظرة شاملة على أداء الشركة"
        breadcrumbs={[
          { title: "الرئيسية", href: "/" },
          { title: "لوحة التنفيذية" },
        ]}
        extra={
          <Select value={period} onChange={setPeriod} style={{ width: 140 }}>
            <Select.Option value="week">هذا الأسبوع</Select.Option>
            <Select.Option value="month">هذا الشهر</Select.Option>
            <Select.Option value="quarter">هذا الربع</Select.Option>
            <Select.Option value="year">هذه السنة</Select.Option>
          </Select>
        }
      />

      {/* ─── الإحصائيات الرئيسية ─── */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={12} sm={8} md={6}>
          <Card size="small" bordered={false} style={{ background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)", borderRadius: 12 }}>
            <Statistic
              title={<span style={{ color: "rgba(255,255,255,0.85)" }}>إجمالي المبيعات</span>}
              value={overview.totalSales || 0}
              prefix={<DollarOutlined />}
              valueStyle={{ color: "#fff", fontSize: 22 }}
              suffix={<span style={{ fontSize: 12, color: "rgba(255,255,255,0.7)" }}>د.ع</span>}
            />
          </Card>
        </Col>
        <Col xs={12} sm={8} md={6}>
          <Card size="small" bordered={false} style={{ background: "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)", borderRadius: 12 }}>
            <Statistic
              title={<span style={{ color: "rgba(255,255,255,0.85)" }}>عدد الفواتير</span>}
              value={overview.invoiceCount || 0}
              prefix={<ShoppingCartOutlined />}
              valueStyle={{ color: "#fff", fontSize: 22 }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={8} md={6}>
          <Card size="small" bordered={false} style={{ background: "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)", borderRadius: 12 }}>
            <Statistic
              title={<span style={{ color: "rgba(255,255,255,0.85)" }}>العملاء</span>}
              value={overview.customerCount || 0}
              prefix={<TeamOutlined />}
              valueStyle={{ color: "#fff", fontSize: 22 }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={8} md={6}>
          <Card size="small" bordered={false} style={{ background: "linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)", borderRadius: 12 }}>
            <Statistic
              title={<span style={{ color: "rgba(255,255,255,0.85)" }}>المخزون</span>}
              value={overview.inventoryCount || 0}
              prefix={<ShopOutlined />}
              valueStyle={{ color: "#fff", fontSize: 22 }}
              suffix={<span style={{ fontSize: 12, color: "rgba(255,255,255,0.7)" }}>جهاز</span>}
            />
          </Card>
        </Col>
      </Row>

      {/* ─── التنبيهات ─── */}
      {(stats?.alerts || []).length > 0 && (
        <Card
          size="small"
          title={<Space><AlertOutlined style={{ color: "#ff4d4f" }} /> تنبيهات مهمة</Space>}
          style={{ marginBottom: 24, borderColor: "#ff4d4f", borderRadius: 12 }}
        >
          <Space direction="vertical" style={{ width: "100%" }}>
            {stats!.alerts.slice(0, 5).map((alert: any, i: number) => (
              <Tag key={i} color={alert.severity === "critical" ? "red" : alert.severity === "warning" ? "orange" : "blue"}>
                {alert.message || alert.title || `تنبيه ${i + 1}`}
              </Tag>
            ))}
          </Space>
        </Card>
      )}

      {/* ─── أفضل المنتجات والعملاء ─── */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} lg={12}>
          <Card
            title={<Space><TrophyOutlined style={{ color: "#faad14" }} /> أفضل المنتجات مبيعاً</Space>}
            size="small"
            style={{ borderRadius: 12 }}
          >
            {(stats?.topProducts || []).length === 0 ? (
              <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="لا توجد بيانات" />
            ) : (
              <Table
                dataSource={stats!.topProducts.slice(0, 5)}
                columns={[
                  { title: "المنتج", dataIndex: "productName", key: "name" },
                  { title: "الكمية", dataIndex: "count", key: "count", align: "center" as const },
                  { title: "الإيرادات", dataIndex: "revenue", key: "revenue", render: (v: number) => `${(v || 0).toLocaleString()} د.ع` },
                ]}
                pagination={false}
                size="small"
                rowKey="productId"
              />
            )}
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card
            title={<Space><TeamOutlined style={{ color: "#1890ff" }} /> أفضل العملاء</Space>}
            size="small"
            style={{ borderRadius: 12 }}
          >
            {(stats?.topCustomers || []).length === 0 ? (
              <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="لا توجد بيانات" />
            ) : (
              <Table
                dataSource={stats!.topCustomers.slice(0, 5)}
                columns={[
                  { title: "العميل", dataIndex: "customerName", key: "name" },
                  { title: "الفواتير", dataIndex: "invoiceCount", key: "count", align: "center" as const },
                  { title: "المبلغ", dataIndex: "totalAmount", key: "amount", render: (v: number) => `${(v || 0).toLocaleString()} د.ع` },
                ]}
                pagination={false}
                size="small"
                rowKey="customerId"
              />
            )}
          </Card>
        </Col>
      </Row>

      {/* ─── الفواتير الأخيرة ─── */}
      <Card
        title={<Space><BarChartOutlined /> أحدث الفواتير</Space>}
        size="small"
        style={{ borderRadius: 12 }}
        extra={<Link to="/invoices">عرض الكل</Link>}
      >
        {(stats?.recentInvoices || []).length === 0 ? (
          <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="لا توجد فواتير حديثة" />
        ) : (
          <Table
            dataSource={stats!.recentInvoices.slice(0, 10)}
            columns={[
              { title: "رقم الفاتورة", dataIndex: "invoiceNumber", key: "number" },
              { title: "العميل", dataIndex: "customerName", key: "customer" },
              { title: "المبلغ", dataIndex: "totalAmount", key: "amount", render: (v: number) => `${(v || 0).toLocaleString()} د.ع` },
              { title: "الحالة", dataIndex: "status", key: "status", render: (s: string) => (
                <Tag color={s === "completed" ? "green" : s === "pending" ? "orange" : "blue"}>{s}</Tag>
              )},
              { title: "التاريخ", dataIndex: "createdAt", key: "date", render: (d: string) => d ? new Date(d).toLocaleDateString("ar-IQ") : "-" },
            ]}
            pagination={false}
            size="small"
            rowKey="id"
          />
        )}
      </Card>

      {/* ─── روابط سريعة ─── */}
      <Row gutter={[12, 12]} style={{ marginTop: 24 }}>
        {[
          { label: "فاتورة جديدة", path: "/invoices/new", icon: <ShoppingCartOutlined />, color: "#1890ff" },
          { label: "التقارير", path: "/reports", icon: <BarChartOutlined />, color: "#52c41a" },
          { label: "المخزون", path: "/devices", icon: <ShopOutlined />, color: "#722ed1" },
          { label: "العملاء", path: "/customers", icon: <TeamOutlined />, color: "#fa8c16" },
          { label: "الموظفين", path: "/hr/employees", icon: <TeamOutlined />, color: "#eb2f96" },
          { label: "المحاسبة", path: "/accounts", icon: <BankOutlined />, color: "#13c2c2" },
        ].map(item => (
          <Col xs={8} sm={4} key={item.path}>
            <Link to={item.path}>
              <Card
                size="small"
                hoverable
                style={{ textAlign: "center", borderRadius: 12 }}
              >
                <div style={{ fontSize: 24, color: item.color, marginBottom: 4 }}>{item.icon}</div>
                <div style={{ fontSize: 12, fontWeight: 500 }}>{item.label}</div>
              </Card>
            </Link>
          </Col>
        ))}
      </Row>
    </div>
  );
}
