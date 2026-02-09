/**
 * صفحة التسعير الذكي
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
  Modal,
  Typography,
  Progress,
  Button,
  Tooltip,
  Empty,
  Descriptions,
  Divider,
} from "antd";
import {
  DollarOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
  ThunderboltOutlined,
  InfoCircleOutlined,
  ReloadOutlined,
  CloudOutlined,
  StockOutlined,
  FireOutlined,
  PercentageOutlined,
} from "@ant-design/icons";
import { PageHeader, LoadingSkeleton, MoneyDisplay } from "../components/shared";
import { API_BASE, getAuthHeaders } from "../utils/api";

const { Text, Title } = Typography;

/* ---------- أنواع البيانات ---------- */

interface PricingSuggestion {
  id: string;
  productId: string;
  productName: string;
  currentPrice: number;
  costPrice: number;
  currentMargin: number;
  suggestedPrice: number;
  action: "raise" | "lower";
  urgency: "high" | "medium" | "low";
  reason?: string;
}

interface PricingFactor {
  name: string;
  label: string;
  value: number;
  impact: "positive" | "negative" | "neutral";
  description: string;
}

interface PricingDetail {
  product: {
    id: string;
    name: string;
    currentPrice: number;
    costPrice: number;
    currentMargin: number;
    suggestedPrice: number;
  };
  factors: PricingFactor[];
  competitorPrices?: { name: string; price: number }[];
  historicalPrices?: { date: string; price: number }[];
}

/* ---------- ثوابت ---------- */

const URGENCY_CONFIG: Record<string, { color: string; label: string }> = {
  high: { color: "red", label: "عاجل" },
  medium: { color: "orange", label: "متوسط" },
  low: { color: "green", label: "منخفض" },
};

const ACTION_CONFIG: Record<string, { color: string; label: string; icon: React.ReactNode }> = {
  raise: { color: "green", label: "رفع السعر", icon: <ArrowUpOutlined /> },
  lower: { color: "red", label: "خفض السعر", icon: <ArrowDownOutlined /> },
};

const FACTOR_ICONS: Record<string, React.ReactNode> = {
  season: <CloudOutlined />,
  stock: <StockOutlined />,
  demand: <FireOutlined />,
  margin: <PercentageOutlined />,
};

/* ---------- المكوّن ---------- */

export default function SmartPricingPage() {
  const [suggestions, setSuggestions] = useState<PricingSuggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProduct, setSelectedProduct] = useState<PricingDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);

  useEffect(() => {
    loadSuggestions();
  }, []);

  const loadSuggestions = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/smart-pricing/suggestions`, {
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        const data = await res.json();
        setSuggestions(data.suggestions ?? data ?? []);
      } else {
        message.error("فشل في تحميل اقتراحات التسعير");
      }
    } catch (error) {
      console.error(error);
      message.error("حدث خطأ أثناء تحميل البيانات");
    } finally {
      setLoading(false);
    }
  };

  const loadProductDetail = async (productId: string) => {
    setDetailLoading(true);
    setDetailOpen(true);
    try {
      const res = await fetch(`${API_BASE}/api/smart-pricing/suggest/${productId}`, {
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        setSelectedProduct(await res.json());
      } else {
        message.error("فشل في تحميل تفاصيل المنتج");
      }
    } catch (error) {
      console.error(error);
      message.error("حدث خطأ");
    } finally {
      setDetailLoading(false);
    }
  };

  /* ---- ملخصات سريعة ---- */
  const raiseCount = suggestions.filter((s) => s.action === "raise").length;
  const lowerCount = suggestions.filter((s) => s.action === "lower").length;
  const highUrgencyCount = suggestions.filter((s) => s.urgency === "high").length;

  /* ---- أعمدة الجدول ---- */
  const columns = [
    {
      title: "المنتج",
      dataIndex: "productName",
      key: "productName",
      render: (name: string, record: PricingSuggestion) => (
        <Button type="link" onClick={() => loadProductDetail(record.productId)} style={{ padding: 0 }}>
          <Text strong>{name}</Text>
        </Button>
      ),
    },
    {
      title: "السعر الحالي",
      dataIndex: "currentPrice",
      key: "currentPrice",
      align: "center" as const,
      render: (v: number) => <MoneyDisplay amount={v} />,
    },
    {
      title: "سعر التكلفة",
      dataIndex: "costPrice",
      key: "costPrice",
      align: "center" as const,
      render: (v: number) => <MoneyDisplay amount={v} />,
    },
    {
      title: "الهامش الحالي",
      dataIndex: "currentMargin",
      key: "currentMargin",
      align: "center" as const,
      sorter: (a: PricingSuggestion, b: PricingSuggestion) => a.currentMargin - b.currentMargin,
      render: (v: number) => (
        <span style={{ color: v >= 20 ? "#059669" : v >= 10 ? "#d97706" : "#dc2626", fontWeight: 600 }}>
          {v.toFixed(1)}%
        </span>
      ),
    },
    {
      title: "السعر المقترح",
      dataIndex: "suggestedPrice",
      key: "suggestedPrice",
      align: "center" as const,
      render: (v: number, record: PricingSuggestion) => (
        <Space>
          <MoneyDisplay amount={v} />
          {record.action === "raise" ? (
            <ArrowUpOutlined style={{ color: "#059669" }} />
          ) : (
            <ArrowDownOutlined style={{ color: "#dc2626" }} />
          )}
        </Space>
      ),
    },
    {
      title: "الإجراء",
      dataIndex: "action",
      key: "action",
      align: "center" as const,
      filters: [
        { text: "رفع السعر", value: "raise" },
        { text: "خفض السعر", value: "lower" },
      ],
      onFilter: (value: any, record: PricingSuggestion) => record.action === value,
      render: (action: string) => {
        const cfg = ACTION_CONFIG[action] || { color: "default", label: action, icon: null };
        return (
          <Tag color={cfg.color} icon={cfg.icon}>
            {cfg.label}
          </Tag>
        );
      },
    },
    {
      title: "الأولوية",
      dataIndex: "urgency",
      key: "urgency",
      align: "center" as const,
      filters: Object.entries(URGENCY_CONFIG).map(([k, v]) => ({ text: v.label, value: k })),
      onFilter: (value: any, record: PricingSuggestion) => record.urgency === value,
      render: (urgency: string) => {
        const cfg = URGENCY_CONFIG[urgency] || { color: "default", label: urgency };
        return <Tag color={cfg.color}>{cfg.label}</Tag>;
      },
    },
    {
      title: "التفاصيل",
      key: "details",
      align: "center" as const,
      render: (_: any, record: PricingSuggestion) => (
        <Tooltip title="عرض العوامل المؤثرة">
          <Button
            type="link"
            icon={<InfoCircleOutlined />}
            onClick={() => loadProductDetail(record.productId)}
          >
            التفاصيل
          </Button>
        </Tooltip>
      ),
    },
  ];

  /* ---- العرض ---- */
  if (loading && suggestions.length === 0) {
    return (
      <div style={{ padding: 24 }}>
        <LoadingSkeleton type="table" rows={8} />
      </div>
    );
  }

  return (
    <div style={{ padding: 24 }}>
      <PageHeader
        title="التسعير الذكي"
        subtitle="اقتراحات تسعير ديناميكية مبنية على تحليل السوق والمخزون"
        breadcrumbs={[{ title: "التسعير الذكي" }]}
        extra={
          <Button icon={<ReloadOutlined />} onClick={loadSuggestions} loading={loading}>
            تحديث
          </Button>
        }
      />

      {/* الملخصات */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={8}>
          <Card styles={{ body: { padding: 16, textAlign: "center" } }}>
            <Statistic
              title="إجمالي الاقتراحات"
              value={suggestions.length}
              prefix={<ThunderboltOutlined />}
              valueStyle={{ color: "#1677ff" }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={8}>
          <Card styles={{ body: { padding: 16, textAlign: "center" } }}>
            <Statistic
              title="رفع السعر"
              value={raiseCount}
              prefix={<ArrowUpOutlined />}
              valueStyle={{ color: "#059669" }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={8}>
          <Card styles={{ body: { padding: 16, textAlign: "center" } }}>
            <Statistic
              title="خفض السعر"
              value={lowerCount}
              prefix={<ArrowDownOutlined />}
              valueStyle={{ color: "#dc2626" }}
            />
          </Card>
        </Col>
      </Row>

      {highUrgencyCount > 0 && (
        <Card
          style={{ marginBottom: 16, borderColor: "#ffa39e", background: "#fff2f0" }}
          styles={{ body: { padding: "12px 16px" } }}
        >
          <Space>
            <FireOutlined style={{ color: "#dc2626", fontSize: 18 }} />
            <Text strong style={{ color: "#dc2626" }}>
              يوجد {highUrgencyCount} اقتراح عاجل يحتاج مراجعة فورية
            </Text>
          </Space>
        </Card>
      )}

      {/* جدول الاقتراحات */}
      {suggestions.length === 0 ? (
        <Card>
          <Empty
            image={<ThunderboltOutlined style={{ fontSize: 64, color: "#d9d9d9" }} />}
            description="لا توجد اقتراحات تسعير حالياً"
          />
        </Card>
      ) : (
        <Card title={`اقتراحات التسعير (${suggestions.length})`}>
          <Table
            columns={columns}
            dataSource={suggestions}
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
      )}

      {/* مودال التفاصيل */}
      <Modal
        title={
          <Space>
            <ThunderboltOutlined style={{ color: "#1677ff" }} />
            <span>تفاصيل التسعير - {selectedProduct?.product?.name || ""}</span>
          </Space>
        }
        open={detailOpen}
        onCancel={() => {
          setDetailOpen(false);
          setSelectedProduct(null);
        }}
        footer={null}
        width={640}
      >
        {detailLoading ? (
          <LoadingSkeleton type="form" rows={6} />
        ) : selectedProduct ? (
          <div>
            {/* معلومات المنتج */}
            <Descriptions
              bordered
              size="small"
              column={2}
              style={{ marginBottom: 24 }}
            >
              <Descriptions.Item label="السعر الحالي">
                <MoneyDisplay amount={selectedProduct.product.currentPrice} />
              </Descriptions.Item>
              <Descriptions.Item label="سعر التكلفة">
                <MoneyDisplay amount={selectedProduct.product.costPrice} />
              </Descriptions.Item>
              <Descriptions.Item label="الهامش الحالي">
                <span style={{ fontWeight: 600 }}>
                  {selectedProduct.product.currentMargin.toFixed(1)}%
                </span>
              </Descriptions.Item>
              <Descriptions.Item label="السعر المقترح">
                <Text strong style={{ color: "#1677ff", fontSize: 16 }}>
                  <MoneyDisplay amount={selectedProduct.product.suggestedPrice} />
                </Text>
              </Descriptions.Item>
            </Descriptions>

            {/* العوامل المؤثرة */}
            <Title level={5} style={{ marginBottom: 16 }}>
              العوامل المؤثرة في التسعير
            </Title>

            <Space direction="vertical" style={{ width: "100%" }} size={12}>
              {selectedProduct.factors.map((factor, idx) => (
                <Card
                  key={idx}
                  size="small"
                  styles={{
                    body: {
                      background:
                        factor.impact === "positive"
                          ? "#f6ffed"
                          : factor.impact === "negative"
                          ? "#fff2f0"
                          : "#f0f5ff",
                      borderRadius: 8,
                    },
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <Space>
                      <span style={{ fontSize: 20 }}>
                        {FACTOR_ICONS[factor.name] || <InfoCircleOutlined />}
                      </span>
                      <div>
                        <Text strong>{factor.label}</Text>
                        <div style={{ fontSize: 12, color: "#6b7280" }}>{factor.description}</div>
                      </div>
                    </Space>
                    <div style={{ textAlign: "center" }}>
                      <Progress
                        type="circle"
                        percent={Math.abs(factor.value)}
                        size={50}
                        strokeColor={
                          factor.impact === "positive"
                            ? "#52c41a"
                            : factor.impact === "negative"
                            ? "#ff4d4f"
                            : "#1677ff"
                        }
                        format={(v) => `${v}`}
                      />
                      <div style={{ marginTop: 4 }}>
                        <Tag
                          color={
                            factor.impact === "positive"
                              ? "green"
                              : factor.impact === "negative"
                              ? "red"
                              : "blue"
                          }
                        >
                          {factor.impact === "positive"
                            ? "إيجابي"
                            : factor.impact === "negative"
                            ? "سلبي"
                            : "محايد"}
                        </Tag>
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </Space>

            {/* أسعار المنافسين */}
            {selectedProduct.competitorPrices && selectedProduct.competitorPrices.length > 0 && (
              <>
                <Divider />
                <Title level={5} style={{ marginBottom: 12 }}>
                  أسعار المنافسين
                </Title>
                <Space direction="vertical" style={{ width: "100%" }}>
                  {selectedProduct.competitorPrices.map((cp, idx) => (
                    <div
                      key={idx}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        padding: "8px 12px",
                        background: "#fafafa",
                        borderRadius: 6,
                      }}
                    >
                      <Text>{cp.name}</Text>
                      <MoneyDisplay amount={cp.price} />
                    </div>
                  ))}
                </Space>
              </>
            )}
          </div>
        ) : null}
      </Modal>
    </div>
  );
}
