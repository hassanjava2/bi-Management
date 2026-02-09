/**
 * صفحة إدارة المحافظ والاستثمارات
 */
import { useState, useEffect } from "react";
import {
  Row,
  Col,
  Card,
  Table,
  Button,
  Input,
  Select,
  Tag,
  Space,
  message,
  Statistic,
  Modal,
  Form,
  InputNumber,
  Descriptions,
  Empty,
} from "antd";
import {
  FundOutlined,
  PlusOutlined,
  ReloadOutlined,
  CloseOutlined,
  DollarOutlined,
  RiseOutlined,
  FallOutlined,
  BankOutlined,
  AimOutlined,
} from "@ant-design/icons";
import { PageHeader, MoneyDisplay, DateDisplay, LoadingSkeleton } from "../components/shared";
import { API_BASE, getAuthHeaders } from "../utils/api";

interface Portfolio {
  id: string;
  portfolioNumber: string;
  name: string;
  description: string | null;
  portfolioType: string;
  riskProfile: string;
  initialValue: string;
  currentValue: string;
  totalInvested: string;
  unrealizedGain: string;
  realizedGain: string;
  currency: string;
  status: string;
  inceptionDate: string;
  createdAt: string;
}

interface Investment {
  id: string;
  investmentNumber: string;
  name: string;
  investmentType: string;
  ticker: string | null;
  quantity: string;
  purchasePrice: string;
  currentPrice: string;
  currentValue: string;
  unrealizedGain: string;
  unrealizedGainPercent: string;
  status: string;
}

interface Stats {
  portfolios: { total: number; active: number };
  values: { totalValue: number; totalInvested: number; totalGain: number };
  investments: { total: number; active: number };
  goals: { total: number; active: number };
}

const TYPE_LABELS: Record<string, string> = {
  stocks: "أسهم",
  bonds: "سندات",
  real_estate: "عقارات",
  mixed: "مختلطة",
  venture_capital: "رأس مال مخاطر",
  private_equity: "ملكية خاصة",
};

const RISK_LABELS: Record<string, string> = {
  conservative: "محافظ",
  moderate: "متوسط",
  aggressive: "عالي المخاطر",
};

const RISK_COLORS: Record<string, string> = {
  conservative: "green",
  moderate: "orange",
  aggressive: "red",
};

const INVESTMENT_TYPE_LABELS: Record<string, string> = {
  stock: "سهم",
  bond: "سند",
  mutual_fund: "صندوق استثماري",
  etf: "صندوق متداول",
  real_estate: "عقار",
  commodity: "سلعة",
  forex: "عملات",
  crypto: "عملة رقمية",
  other: "أخرى",
};

export default function InvestmentsManagement() {
  const [portfolios, setPortfolios] = useState<Portfolio[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState<"portfolio" | "investment">("portfolio");
  const [selectedPortfolio, setSelectedPortfolio] = useState<Portfolio | null>(null);
  const [portfolioInvestments, setPortfolioInvestments] = useState<Investment[]>([]);
  const [portfolioForm] = Form.useForm();
  const [investmentForm] = Form.useForm();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [statsRes, portfoliosRes] = await Promise.all([
        fetch(`${API_BASE}/api/investments/stats`, { headers: getAuthHeaders() }),
        fetch(`${API_BASE}/api/investments/portfolios`, { headers: getAuthHeaders() }),
      ]);

      if (statsRes.ok) setStats(await statsRes.json());
      if (portfoliosRes.ok) setPortfolios(await portfoliosRes.json());
    } catch (error) {
      console.error("Error:", error);
      message.error("حدث خطأ أثناء تحميل البيانات");
    }
    setLoading(false);
  };

  const fetchPortfolioDetails = async (portfolio: Portfolio) => {
    setSelectedPortfolio(portfolio);
    try {
      const res = await fetch(`${API_BASE}/api/investments/portfolios/${portfolio.id}`, { headers: getAuthHeaders() });
      if (res.ok) {
        const data = await res.json();
        setPortfolioInvestments(data.investments || []);
      }
    } catch (error) {
      console.error("Error:", error);
      message.error("حدث خطأ أثناء تحميل تفاصيل المحفظة");
    }
  };

  const createPortfolio = async (values: any) => {
    try {
      const res = await fetch(`${API_BASE}/api/investments/portfolios`, {
        method: "POST",
        headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      if (res.ok) {
        message.success("تم إنشاء المحفظة بنجاح");
        setShowModal(false);
        portfolioForm.resetFields();
        fetchData();
      } else {
        message.error("فشل في إنشاء المحفظة");
      }
    } catch (error) {
      console.error("Error:", error);
      message.error("حدث خطأ أثناء إنشاء المحفظة");
    }
  };

  const createInvestment = async (values: any) => {
    try {
      const res = await fetch(`${API_BASE}/api/investments/investments`, {
        method: "POST",
        headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({
          ...values,
          portfolioId: selectedPortfolio?.id || values.portfolioId,
        }),
      });
      if (res.ok) {
        message.success("تم إضافة الاستثمار بنجاح");
        setShowModal(false);
        investmentForm.resetFields();
        if (selectedPortfolio) fetchPortfolioDetails(selectedPortfolio);
        fetchData();
      } else {
        message.error("فشل في إضافة الاستثمار");
      }
    } catch (error) {
      console.error("Error:", error);
      message.error("حدث خطأ أثناء إضافة الاستثمار");
    }
  };

  const updatePrice = async (investmentId: string) => {
    const newPrice = prompt("السعر الحالي:");
    if (!newPrice) return;

    try {
      const res = await fetch(`${API_BASE}/api/investments/investments/${investmentId}/price`, {
        method: "PATCH",
        headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ currentPrice: newPrice }),
      });
      if (res.ok) {
        message.success("تم تحديث السعر بنجاح");
        if (selectedPortfolio) {
          fetchPortfolioDetails(selectedPortfolio);
        }
      } else {
        message.error("فشل في تحديث السعر");
      }
    } catch (error) {
      console.error("Error:", error);
      message.error("حدث خطأ أثناء تحديث السعر");
    }
  };

  const valuatePortfolio = async (portfolioId: string) => {
    try {
      const res = await fetch(`${API_BASE}/api/investments/portfolios/${portfolioId}/valuate`, {
        method: "POST",
        headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      if (res.ok) {
        message.success("تم تحديث قيمة المحفظة بنجاح");
        fetchData();
      } else {
        message.error("فشل في تحديث قيمة المحفظة");
      }
    } catch (error) {
      console.error("Error:", error);
      message.error("حدث خطأ أثناء تحديث قيمة المحفظة");
    }
  };

  const getGainColor = (value: string | number | null) => {
    if (!value) return "#6b7280";
    const num = parseFloat(value.toString());
    return num >= 0 ? "#10b981" : "#ef4444";
  };

  const formatPercent = (value: string | number | null) => {
    if (!value) return "-";
    const num = parseFloat(value.toString());
    return (num >= 0 ? "+" : "") + num.toFixed(2) + "%";
  };

  const investmentColumns = [
    {
      title: "الاستثمار",
      key: "name",
      render: (_: any, record: Investment) => (
        <Space direction="vertical" size={0}>
          <Space>
            <span style={{ fontWeight: 600 }}>{record.name}</span>
            {record.ticker && <span style={{ color: "#6b7280" }}>({record.ticker})</span>}
            <Tag>{INVESTMENT_TYPE_LABELS[record.investmentType] || record.investmentType}</Tag>
          </Space>
          <span style={{ fontSize: "0.75rem", color: "#6b7280" }}>
            الكمية: {parseFloat(record.quantity).toLocaleString()} | السعر: <MoneyDisplay amount={Number(record.currentPrice)} />
          </span>
        </Space>
      ),
    },
    {
      title: "القيمة الحالية",
      key: "currentValue",
      align: "center" as const,
      render: (_: any, record: Investment) => (
        <Space direction="vertical" size={0} align="end">
          <span style={{ fontWeight: 600 }}><MoneyDisplay amount={Number(record.currentValue)} /></span>
          <span style={{ color: getGainColor(record.unrealizedGain), fontSize: "0.875rem" }}>
            <MoneyDisplay amount={Number(record.unrealizedGain)} /> ({formatPercent(record.unrealizedGainPercent)})
          </span>
        </Space>
      ),
    },
    {
      title: "إجراءات",
      key: "actions",
      align: "center" as const,
      render: (_: any, record: Investment) => (
        <Button size="small" type="primary" onClick={() => updatePrice(record.id)}>
          تحديث السعر
        </Button>
      ),
    },
  ];

  if (loading) {
    return <LoadingSkeleton />;
  }

  return (
    <div>
      <PageHeader
        title="إدارة المحافظ والاستثمارات"
        subtitle="إدارة المحافظ الاستثمارية ومتابعة الأداء"
        breadcrumbs={[
          { label: "الرئيسية", path: "/" },
          { label: "الاستثمارات" },
        ]}
        icon={<FundOutlined />}
        extra={
          <Space>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => {
                setModalType("portfolio");
                setShowModal(true);
              }}
            >
              محفظة جديدة
            </Button>
            {selectedPortfolio && (
              <Button
                type="primary"
                style={{ background: "#10b981" }}
                icon={<PlusOutlined />}
                onClick={() => {
                  setModalType("investment");
                  setShowModal(true);
                }}
              >
                استثمار جديد
              </Button>
            )}
          </Space>
        }
      />

      {/* الإحصائيات */}
      {stats && (
        <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
          <Col xs={12} sm={8} lg={4}>
            <Card>
              <Statistic
                title="إجمالي المحافظ"
                value={stats.portfolios.active}
                prefix={<BankOutlined />}
                valueStyle={{ color: "#3b82f6" }}
              />
            </Card>
          </Col>
          <Col xs={12} sm={8} lg={4}>
            <Card>
              <Statistic
                title="إجمالي القيمة"
                value={stats.values.totalValue}
                prefix={<DollarOutlined />}
                valueStyle={{ color: "#8b5cf6" }}
                formatter={(value) => <MoneyDisplay amount={Number(value)} />}
              />
            </Card>
          </Col>
          <Col xs={12} sm={8} lg={4}>
            <Card>
              <Statistic
                title="إجمالي الاستثمار"
                value={stats.values.totalInvested}
                prefix={<FundOutlined />}
                formatter={(value) => <MoneyDisplay amount={Number(value)} />}
              />
            </Card>
          </Col>
          <Col xs={12} sm={8} lg={4}>
            <Card>
              <Statistic
                title="إجمالي الربح/الخسارة"
                value={stats.values.totalGain}
                prefix={stats.values.totalGain >= 0 ? <RiseOutlined /> : <FallOutlined />}
                valueStyle={{ color: getGainColor(stats.values.totalGain) }}
                formatter={(value) => <MoneyDisplay amount={Number(value)} />}
              />
            </Card>
          </Col>
          <Col xs={12} sm={8} lg={4}>
            <Card>
              <Statistic
                title="الاستثمارات النشطة"
                value={stats.investments.active}
                prefix={<RiseOutlined />}
                valueStyle={{ color: "#10b981" }}
              />
            </Card>
          </Col>
          <Col xs={12} sm={8} lg={4}>
            <Card>
              <Statistic
                title="الأهداف"
                value={stats.goals.active}
                prefix={<AimOutlined />}
                valueStyle={{ color: "#f59e0b" }}
              />
            </Card>
          </Col>
        </Row>
      )}

      <Row gutter={[24, 24]}>
        {/* قائمة المحافظ */}
        <Col xs={24} lg={selectedPortfolio ? 10 : 24}>
          <Card title="المحافظ الاستثمارية">
            {portfolios.length === 0 ? (
              <Empty description="لا توجد محافظ" />
            ) : (
              <Space direction="vertical" style={{ width: "100%" }}>
                {portfolios.map((portfolio) => {
                  const gain = parseFloat(portfolio.unrealizedGain || "0");
                  const gainPercent =
                    parseFloat(portfolio.currentValue || "0") > 0
                      ? (gain / parseFloat(portfolio.totalInvested || "1")) * 100
                      : 0;

                  return (
                    <Card
                      key={portfolio.id}
                      size="small"
                      hoverable
                      onClick={() => fetchPortfolioDetails(portfolio)}
                      style={{
                        background: selectedPortfolio?.id === portfolio.id ? "#eff6ff" : undefined,
                        border: selectedPortfolio?.id === portfolio.id ? "2px solid #3b82f6" : undefined,
                      }}
                    >
                      <Row justify="space-between" align="middle">
                        <Col>
                          <Space>
                            <span style={{ fontWeight: 600 }}>{portfolio.name}</span>
                            <Tag color={RISK_COLORS[portfolio.riskProfile]}>
                              {RISK_LABELS[portfolio.riskProfile]}
                            </Tag>
                          </Space>
                          <div style={{ fontSize: "0.875rem", color: "#6b7280" }}>
                            {portfolio.portfolioNumber} | {TYPE_LABELS[portfolio.portfolioType] || portfolio.portfolioType}
                          </div>
                        </Col>
                        <Col style={{ textAlign: "left" }}>
                          <div style={{ fontWeight: 600 }}>
                            <MoneyDisplay amount={Number(portfolio.currentValue)} currency={portfolio.currency} />
                          </div>
                          <div style={{ fontSize: "0.875rem", color: getGainColor(gain) }}>
                            <MoneyDisplay amount={gain} currency={portfolio.currency} /> ({formatPercent(gainPercent)})
                          </div>
                        </Col>
                      </Row>
                    </Card>
                  );
                })}
              </Space>
            )}
          </Card>
        </Col>

        {/* تفاصيل المحفظة */}
        {selectedPortfolio && (
          <Col xs={24} lg={14}>
            <Card
              title={`استثمارات: ${selectedPortfolio.name}`}
              extra={
                <Space>
                  <Button
                    size="small"
                    icon={<ReloadOutlined />}
                    onClick={() => valuatePortfolio(selectedPortfolio.id)}
                  >
                    تحديث القيمة
                  </Button>
                  <Button size="small" icon={<CloseOutlined />} onClick={() => setSelectedPortfolio(null)}>
                    إغلاق
                  </Button>
                </Space>
              }
            >
              {portfolioInvestments.length === 0 ? (
                <Empty description="لا توجد استثمارات في هذه المحفظة" />
              ) : (
                <Table
                  columns={investmentColumns}
                  dataSource={portfolioInvestments}
                  rowKey="id"
                  pagination={false}
                  size="small"
                />
              )}
            </Card>
          </Col>
        )}
      </Row>

      {/* Modal */}
      <Modal
        title={modalType === "portfolio" ? "محفظة استثمارية جديدة" : "استثمار جديد"}
        open={showModal}
        onCancel={() => setShowModal(false)}
        footer={null}
        width={600}
      >
        {modalType === "portfolio" ? (
          <Form form={portfolioForm} layout="vertical" onFinish={createPortfolio}>
            <Form.Item
              name="name"
              label="اسم المحفظة"
              rules={[{ required: true, message: "اسم المحفظة مطلوب" }]}
            >
              <Input />
            </Form.Item>
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item name="portfolioType" label="نوع المحفظة" initialValue="mixed">
                  <Select>
                    <Select.Option value="stocks">أسهم</Select.Option>
                    <Select.Option value="bonds">سندات</Select.Option>
                    <Select.Option value="real_estate">عقارات</Select.Option>
                    <Select.Option value="mixed">مختلطة</Select.Option>
                  </Select>
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="riskProfile" label="مستوى المخاطر" initialValue="moderate">
                  <Select>
                    <Select.Option value="conservative">محافظ</Select.Option>
                    <Select.Option value="moderate">متوسط</Select.Option>
                    <Select.Option value="aggressive">عالي المخاطر</Select.Option>
                  </Select>
                </Form.Item>
              </Col>
            </Row>
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  name="initialValue"
                  label="القيمة الأولية"
                  rules={[{ required: true, message: "القيمة الأولية مطلوبة" }]}
                >
                  <InputNumber style={{ width: "100%" }} min={0} />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="targetValue" label="القيمة المستهدفة">
                  <InputNumber style={{ width: "100%" }} min={0} />
                </Form.Item>
              </Col>
            </Row>
            <Form.Item name="description" label="الوصف">
              <Input.TextArea rows={2} />
            </Form.Item>
            <Form.Item>
              <Space>
                <Button onClick={() => setShowModal(false)}>إلغاء</Button>
                <Button type="primary" htmlType="submit">
                  حفظ
                </Button>
              </Space>
            </Form.Item>
          </Form>
        ) : (
          <Form form={investmentForm} layout="vertical" onFinish={createInvestment}>
            <Form.Item
              name="name"
              label="اسم الاستثمار"
              rules={[{ required: true, message: "اسم الاستثمار مطلوب" }]}
            >
              <Input />
            </Form.Item>
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item name="investmentType" label="نوع الاستثمار" initialValue="stock">
                  <Select>
                    <Select.Option value="stock">سهم</Select.Option>
                    <Select.Option value="bond">سند</Select.Option>
                    <Select.Option value="mutual_fund">صندوق استثماري</Select.Option>
                    <Select.Option value="etf">صندوق متداول</Select.Option>
                    <Select.Option value="real_estate">عقار</Select.Option>
                    <Select.Option value="commodity">سلعة</Select.Option>
                  </Select>
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="ticker" label="الرمز">
                  <Input />
                </Form.Item>
              </Col>
            </Row>
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  name="quantity"
                  label="الكمية"
                  rules={[{ required: true, message: "الكمية مطلوبة" }]}
                >
                  <InputNumber style={{ width: "100%" }} min={0} />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  name="purchasePrice"
                  label="سعر الشراء"
                  rules={[{ required: true, message: "سعر الشراء مطلوب" }]}
                >
                  <InputNumber style={{ width: "100%" }} min={0} />
                </Form.Item>
              </Col>
            </Row>
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item name="purchaseDate" label="تاريخ الشراء">
                  <Input type="date" />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="commission" label="العمولة">
                  <InputNumber style={{ width: "100%" }} min={0} />
                </Form.Item>
              </Col>
            </Row>
            <Form.Item name="brokerName" label="الوسيط">
              <Input />
            </Form.Item>
            <Form.Item>
              <Space>
                <Button onClick={() => setShowModal(false)}>إلغاء</Button>
                <Button type="primary" htmlType="submit">
                  حفظ
                </Button>
              </Space>
            </Form.Item>
          </Form>
        )}
      </Modal>
    </div>
  );
}
