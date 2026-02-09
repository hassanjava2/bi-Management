/**
 * صفحة تحليل ربحية المنتجات
 */
import { useState, useEffect } from "react";
import {
  Row,
  Col,
  Card,
  Table,
  Tag,
  Space,
  message,
  Statistic,
  Typography,
  Tabs,
  InputNumber,
  Button,
  Tooltip,
  Empty,
} from "antd";
import {
  DollarOutlined,
  RiseOutlined,
  FallOutlined,
  WarningOutlined,
  TrophyOutlined,
  ShoppingOutlined,
  PercentageOutlined,
  FireOutlined,
  ReloadOutlined,
} from "@ant-design/icons";
import { PageHeader, LoadingSkeleton, MoneyDisplay } from "../components/shared";
import { API_BASE, getAuthHeaders } from "../utils/api";

const { Text, Title } = Typography;

/* ---------- أنواع البيانات ---------- */

interface ProductProfit {
  id: string;
  name: string;
  brand: string | null;
  unitsSold: number;
  revenue: number;
  cost: number;
  profit: number;
  marginPercent: number;
  status: "excellent" | "good" | "fair" | "poor";
}

interface Rankings {
  topProfitable: ProductProfit[];
  leastProfitable: ProductProfit[];
}

interface DeadStockItem {
  id: string;
  name: string;
  brand: string | null;
  currentStock: number;
  daysInStock: number;
  costPrice: number;
  suggestedDiscount: number;
  totalValue: number;
}

interface Stats {
  totalRevenue: number;
  totalCost: number;
  totalProfit: number;
  avgMargin: number;
}

/* ---------- ثوابت ---------- */

const STATUS_CONFIG: Record<string, { color: string; label: string }> = {
  excellent: { color: "green", label: "ممتاز" },
  good: { color: "blue", label: "جيد" },
  fair: { color: "orange", label: "مقبول" },
  poor: { color: "red", label: "ضعيف" },
};

/* ---------- المكوّن ---------- */

export default function ProfitabilityDashboard() {
  const [products, setProducts] = useState<ProductProfit[]>([]);
  const [rankings, setRankings] = useState<Rankings | null>(null);
  const [deadStock, setDeadStock] = useState<DeadStockItem[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  /* ---- تحميل البيانات ---- */
  const loadData = async () => {
    setLoading(true);
    try {
      const [productsRes, rankingsRes, deadStockRes] = await Promise.all([
        fetch(`${API_BASE}/api/profitability/products`, { headers: getAuthHeaders() }),
        fetch(`${API_BASE}/api/profitability/rankings`, { headers: getAuthHeaders() }),
        fetch(`${API_BASE}/api/profitability/dead-stock`, { headers: getAuthHeaders() }),
      ]);

      if (productsRes.ok) {
        const data = await productsRes.json();
        const list: ProductProfit[] = data.products ?? data ?? [];
        setProducts(list);

        // حساب الإحصائيات من البيانات
        const totalRevenue = list.reduce((s, p) => s + Number(p.revenue), 0);
        const totalCost = list.reduce((s, p) => s + Number(p.cost), 0);
        const totalProfit = list.reduce((s, p) => s + Number(p.profit), 0);
        const avgMargin =
          list.length > 0
            ? list.reduce((s, p) => s + Number(p.marginPercent), 0) / list.length
            : 0;
        setStats({ totalRevenue, totalCost, totalProfit, avgMargin });
      }

      if (rankingsRes.ok) setRankings(await rankingsRes.json());
      if (deadStockRes.ok) {
        const dsData = await deadStockRes.json();
        setDeadStock(dsData.items ?? dsData ?? []);
      }
    } catch (error) {
      console.error(error);
      message.error("فشل في تحميل بيانات الربحية");
    } finally {
      setLoading(false);
    }
  };

  /* ---- أعمدة جدول المنتجات ---- */
  const productColumns = [
    {
      title: "المنتج",
      dataIndex: "name",
      key: "name",
      render: (name: string, record: ProductProfit) => (
        <div>
          <Text strong>{name}</Text>
          {record.brand && (
            <div style={{ fontSize: 12, color: "#6b7280" }}>{record.brand}</div>
          )}
        </div>
      ),
    },
    {
      title: "الوحدات المباعة",
      dataIndex: "unitsSold",
      key: "unitsSold",
      align: "center" as const,
      sorter: (a: ProductProfit, b: ProductProfit) => a.unitsSold - b.unitsSold,
      render: (v: number) => v.toLocaleString("ar-IQ"),
    },
    {
      title: "الإيرادات",
      dataIndex: "revenue",
      key: "revenue",
      align: "center" as const,
      sorter: (a: ProductProfit, b: ProductProfit) => a.revenue - b.revenue,
      render: (v: number) => <MoneyDisplay amount={v} />,
    },
    {
      title: "التكلفة",
      dataIndex: "cost",
      key: "cost",
      align: "center" as const,
      render: (v: number) => <MoneyDisplay amount={v} />,
    },
    {
      title: "الربح",
      dataIndex: "profit",
      key: "profit",
      align: "center" as const,
      sorter: (a: ProductProfit, b: ProductProfit) => a.profit - b.profit,
      render: (v: number) => <MoneyDisplay amount={v} colored />,
    },
    {
      title: "هامش الربح %",
      dataIndex: "marginPercent",
      key: "marginPercent",
      align: "center" as const,
      sorter: (a: ProductProfit, b: ProductProfit) => a.marginPercent - b.marginPercent,
      render: (v: number) => (
        <span style={{ color: v >= 30 ? "#059669" : v >= 15 ? "#d97706" : "#dc2626", fontWeight: 600 }}>
          {v.toFixed(1)}%
        </span>
      ),
    },
    {
      title: "الحالة",
      dataIndex: "status",
      key: "status",
      align: "center" as const,
      filters: Object.entries(STATUS_CONFIG).map(([k, v]) => ({ text: v.label, value: k })),
      onFilter: (value: any, record: ProductProfit) => record.status === value,
      render: (status: string) => {
        const cfg = STATUS_CONFIG[status] || { color: "default", label: status };
        return <Tag color={cfg.color}>{cfg.label}</Tag>;
      },
    },
  ];

  /* ---- أعمدة جدول المخزون الراكد ---- */
  const deadStockColumns = [
    {
      title: "المنتج",
      dataIndex: "name",
      key: "name",
      render: (name: string, record: DeadStockItem) => (
        <div>
          <Text strong>{name}</Text>
          {record.brand && (
            <div style={{ fontSize: 12, color: "#6b7280" }}>{record.brand}</div>
          )}
        </div>
      ),
    },
    {
      title: "المخزون الحالي",
      dataIndex: "currentStock",
      key: "currentStock",
      align: "center" as const,
      render: (v: number) => v.toLocaleString("ar-IQ"),
    },
    {
      title: "أيام في المخزن",
      dataIndex: "daysInStock",
      key: "daysInStock",
      align: "center" as const,
      sorter: (a: DeadStockItem, b: DeadStockItem) => a.daysInStock - b.daysInStock,
      render: (v: number) => (
        <Tag color={v > 180 ? "red" : v > 90 ? "orange" : "default"}>{v} يوم</Tag>
      ),
    },
    {
      title: "سعر التكلفة",
      dataIndex: "costPrice",
      key: "costPrice",
      align: "center" as const,
      render: (v: number) => <MoneyDisplay amount={v} />,
    },
    {
      title: "القيمة الإجمالية",
      dataIndex: "totalValue",
      key: "totalValue",
      align: "center" as const,
      render: (v: number) => <MoneyDisplay amount={v} />,
    },
    {
      title: "الخصم المقترح",
      dataIndex: "suggestedDiscount",
      key: "suggestedDiscount",
      align: "center" as const,
      render: (v: number) => (
        <Tag color="volcano" icon={<PercentageOutlined />}>
          {v}%
        </Tag>
      ),
    },
  ];

  /* ---- أعمدة الترتيب ---- */
  const rankingColumns = (type: "top" | "least") => [
    {
      title: "#",
      key: "index",
      width: 40,
      render: (_: any, __: any, idx: number) => idx + 1,
    },
    {
      title: "المنتج",
      dataIndex: "name",
      key: "name",
      render: (name: string) => <Text strong>{name}</Text>,
    },
    {
      title: "الربح",
      dataIndex: "profit",
      key: "profit",
      align: "center" as const,
      render: (v: number) => <MoneyDisplay amount={v} colored />,
    },
    {
      title: "الهامش %",
      dataIndex: "marginPercent",
      key: "marginPercent",
      align: "center" as const,
      render: (v: number) => (
        <span style={{ color: type === "top" ? "#059669" : "#dc2626", fontWeight: 600 }}>
          {v.toFixed(1)}%
        </span>
      ),
    },
  ];

  /* ---- التبويبات ---- */
  const tabItems = [
    {
      key: "products",
      label: "جميع المنتجات",
      children: (
        <Card>
          <Table
            columns={productColumns}
            dataSource={products}
            rowKey="id"
            loading={loading}
            pagination={{
              showSizeChanger: true,
              showTotal: (total, range) => `${range[0]}-${range[1]} من ${total}`,
              pageSize: 20,
            }}
            scroll={{ x: "max-content" }}
          />
        </Card>
      ),
    },
    {
      key: "deadstock",
      label: (
        <span>
          <WarningOutlined style={{ color: "#d97706" }} /> المخزون الراكد ({deadStock.length})
        </span>
      ),
      children: deadStock.length === 0 ? (
        <Card>
          <Empty
            image={<ShoppingOutlined style={{ fontSize: 64, color: "#d9d9d9" }} />}
            description="لا يوجد مخزون راكد حالياً"
          />
        </Card>
      ) : (
        <Card
          title="الأجهزة الراكدة - مقترحات الخصم"
          extra={
            <Text type="secondary" style={{ fontSize: 13 }}>
              منتجات في المخزن لفترة طويلة تحتاج تصريف
            </Text>
          }
        >
          <Table
            columns={deadStockColumns}
            dataSource={deadStock}
            rowKey="id"
            pagination={{ pageSize: 10 }}
            scroll={{ x: "max-content" }}
          />
        </Card>
      ),
    },
    {
      key: "rankings",
      label: (
        <span>
          <TrophyOutlined style={{ color: "#d97706" }} /> الترتيب
        </span>
      ),
      children: (
        <Row gutter={[16, 16]}>
          <Col xs={24} lg={12}>
            <Card
              title={
                <Space>
                  <RiseOutlined style={{ color: "#059669" }} />
                  <span>الأكثر ربحية</span>
                </Space>
              }
              styles={{ header: { borderBottom: "3px solid #059669" } }}
            >
              <Table
                columns={rankingColumns("top")}
                dataSource={rankings?.topProfitable ?? []}
                rowKey="id"
                pagination={false}
                size="small"
              />
            </Card>
          </Col>
          <Col xs={24} lg={12}>
            <Card
              title={
                <Space>
                  <FallOutlined style={{ color: "#dc2626" }} />
                  <span>الأقل ربحية</span>
                </Space>
              }
              styles={{ header: { borderBottom: "3px solid #dc2626" } }}
            >
              <Table
                columns={rankingColumns("least")}
                dataSource={rankings?.leastProfitable ?? []}
                rowKey="id"
                pagination={false}
                size="small"
              />
            </Card>
          </Col>
        </Row>
      ),
    },
  ];

  /* ---- العرض ---- */
  if (loading && !stats) {
    return (
      <div style={{ padding: 24 }}>
        <LoadingSkeleton type="table" rows={8} />
      </div>
    );
  }

  return (
    <div style={{ padding: 24 }}>
      <PageHeader
        title="تحليل الربحية"
        subtitle="تحليل شامل لربحية المنتجات والمخزون الراكد"
        breadcrumbs={[{ title: "تحليل الربحية" }]}
        extra={
          <Button icon={<ReloadOutlined />} onClick={loadData} loading={loading}>
            تحديث
          </Button>
        }
      />

      {/* بطاقات الإحصائيات */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} lg={6}>
          <Card style={{ background: "linear-gradient(135deg, #667eea, #764ba2)" }}>
            <Statistic
              title={<span style={{ color: "rgba(255,255,255,0.9)" }}>إجمالي الإيرادات</span>}
              value={stats?.totalRevenue ?? 0}
              valueStyle={{ color: "#fff", fontSize: "1.5rem", fontWeight: 700 }}
              prefix={<DollarOutlined />}
              suffix={<span style={{ fontSize: 12, color: "rgba(255,255,255,0.7)" }}>د.ع</span>}
              formatter={(v) => Number(v).toLocaleString("ar-IQ")}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card style={{ background: "linear-gradient(135deg, #f093fb, #f5576c)" }}>
            <Statistic
              title={<span style={{ color: "rgba(255,255,255,0.9)" }}>إجمالي التكلفة</span>}
              value={stats?.totalCost ?? 0}
              valueStyle={{ color: "#fff", fontSize: "1.5rem", fontWeight: 700 }}
              prefix={<ShoppingOutlined />}
              suffix={<span style={{ fontSize: 12, color: "rgba(255,255,255,0.7)" }}>د.ع</span>}
              formatter={(v) => Number(v).toLocaleString("ar-IQ")}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card style={{ background: "linear-gradient(135deg, #43e97b, #38f9d7)" }}>
            <Statistic
              title={<span style={{ color: "rgba(255,255,255,0.9)" }}>إجمالي الربح</span>}
              value={stats?.totalProfit ?? 0}
              valueStyle={{ color: "#fff", fontSize: "1.5rem", fontWeight: 700 }}
              prefix={<RiseOutlined />}
              suffix={<span style={{ fontSize: 12, color: "rgba(255,255,255,0.7)" }}>د.ع</span>}
              formatter={(v) => Number(v).toLocaleString("ar-IQ")}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card style={{ background: "linear-gradient(135deg, #4facfe, #00f2fe)" }}>
            <Statistic
              title={<span style={{ color: "rgba(255,255,255,0.9)" }}>متوسط هامش الربح</span>}
              value={stats?.avgMargin ?? 0}
              valueStyle={{ color: "#fff", fontSize: "1.5rem", fontWeight: 700 }}
              prefix={<PercentageOutlined />}
              precision={1}
              suffix="%"
            />
          </Card>
        </Col>
      </Row>

      {/* التبويبات */}
      <Tabs defaultActiveKey="products" items={tabItems} />
    </div>
  );
}
