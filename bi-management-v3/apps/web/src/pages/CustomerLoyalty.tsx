/**
 * صفحة نقاط ولاء العميل
 */
import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Row, Col, Card, Button, Input, Modal, Tag, Space, message, Statistic, Empty, Radio } from "antd";
import { ArrowLeftOutlined, GiftOutlined, StarOutlined, DollarOutlined, WalletOutlined, EditOutlined } from "@ant-design/icons";
import { PageHeader, LoadingSkeleton } from "../components/shared";
import { API_BASE, getAuthHeaders } from "../utils/api";

interface LoyaltyAccount {
  id: string;
  customerId: string;
  currentPoints: number;
  totalEarnedPoints: number;
  totalRedeemedPoints: number;
  totalSpend: string;
  lastEarnedAt: string | null;
  lastRedeemedAt: string | null;
  tier: {
    id: string;
    name: string;
    color: string;
    pointsMultiplier: string;
    discountPercentage: string | null;
    benefits: string[] | null;
  } | null;
  program: {
    id: string;
    name: string;
    pointValue: string;
    minRedeemPoints: number;
  } | null;
  transactions: Array<{
    id: string;
    transactionType: string;
    points: number;
    balanceAfter: number;
    sourceType: string | null;
    description: string | null;
    createdAt: string;
  }>;
}

interface Customer {
  id: string;
  fullName: string;
  phone: string;
  email: string;
}

const TRANSACTION_TYPE_CONFIG: Record<string, { label: string; color: string; icon: string }> = {
  earn: { label: "كسب", color: "green", icon: "+" },
  redeem: { label: "استرداد", color: "red", icon: "-" },
  expire: { label: "انتهاء", color: "default", icon: "⏰" },
  adjust: { label: "تعديل", color: "blue", icon: "~" },
  bonus: { label: "مكافأة", color: "purple", icon: "🎁" },
};

export default function CustomerLoyalty() {
  const { customerId } = useParams();
  const navigate = useNavigate();
  const [account, setAccount] = useState<LoyaltyAccount | null>(null);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [adjustData, setAdjustData] = useState({ points: "", type: "add", reason: "" });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadData();
  }, [customerId]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [accountRes, customerRes] = await Promise.all([
        fetch(`${API_BASE}/api/loyalty/accounts/customer/${customerId}`),
        fetch(`${API_BASE}/api/customers/${customerId}`),
      ]);

      if (accountRes.ok) setAccount(await accountRes.json());
      if (customerRes.ok) setCustomer(await customerRes.json());
    } catch (error) {
      console.error(error);
      message.error("حدث خطأ في تحميل البيانات");
    } finally {
      setLoading(false);
    }
  };

  const adjustPoints = async () => {
    if (!adjustData.points || !account?.program?.id) return;
    
    setSubmitting(true);
    const points = parseInt(adjustData.points);
    const endpoint = adjustData.type === "add" ? "/api/loyalty/earn" : "/api/loyalty/redeem";
    
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerId,
          programId: account.program.id,
          amount: adjustData.type === "add" ? String(points * parseFloat(account.program.pointValue)) : undefined,
          points: adjustData.type === "redeem" ? points : undefined,
          sourceType: "manual",
          description: adjustData.reason || (adjustData.type === "add" ? "إضافة يدوية" : "خصم يدوي"),
        }),
      });

      if (res.ok) {
        message.success(adjustData.type === "add" ? "تم إضافة النقاط بنجاح" : "تم خصم النقاط بنجاح");
        setModalOpen(false);
        setAdjustData({ points: "", type: "add", reason: "" });
        loadData();
      } else {
        message.error("فشل في تعديل النقاط");
      }
    } catch (error) {
      console.error(error);
      message.error("حدث خطأ");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <LoadingSkeleton />
      </Card>
    );
  }

  if (!customer) {
    return (
      <Card>
        <Empty description="العميل غير موجود" />
      </Card>
    );
  }

  const pointValue = account?.program ? parseFloat(account.program.pointValue) : 100;

  return (
    <div style={{ maxWidth: 900, margin: "0 auto" }}>
      <PageHeader
        title={customer.fullName}
        subtitle={`${customer.phone} • ${customer.email}`}
        breadcrumbs={[
          { label: "العملاء", path: "/customers" },
          { label: customer.fullName },
          { label: "نقاط الولاء" },
        ]}
        extra={
          <Space>
            <Button icon={<ArrowLeftOutlined />} onClick={() => navigate(-1)}>
              العودة
            </Button>
            {account?.tier && (
              <Tag color={account.tier.color} style={{ padding: "4px 12px", fontSize: "0.9rem" }}>
                ⭐ {account.tier.name}
              </Tag>
            )}
          </Space>
        }
      />

      {!account ? (
        <Card>
          <Empty
            image={<StarOutlined style={{ fontSize: 64, color: "#d9d9d9" }} />}
            description={
              <div>
                <h3>لم يتم تسجيل العميل في برنامج الولاء</h3>
                <p style={{ color: "#6b7280" }}>سيتم تسجيله تلقائياً عند أول عملية شراء</p>
              </div>
            }
          />
        </Card>
      ) : (
        <>
          {/* Points Summary */}
          <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
            <Col xs={24} sm={6}>
              <Card
                style={{
                  background: "linear-gradient(135deg, #667eea, #764ba2)",
                  border: "none",
                }}
              >
                <Statistic
                  title={<span style={{ color: "rgba(255,255,255,0.9)" }}>نقاط متاحة</span>}
                  value={account.currentPoints}
                  valueStyle={{ color: "#fff", fontSize: "2rem" }}
                  prefix={<StarOutlined />}
                  suffix={
                    <div style={{ fontSize: "0.7rem", color: "rgba(255,255,255,0.8)" }}>
                      ≈ {(account.currentPoints * pointValue).toLocaleString()} IQD
                    </div>
                  }
                />
              </Card>
            </Col>
            <Col xs={24} sm={6}>
              <Card>
                <Statistic
                  title="إجمالي المكتسب"
                  value={account.totalEarnedPoints}
                  valueStyle={{ color: "#059669" }}
                  prefix={<GiftOutlined />}
                />
              </Card>
            </Col>
            <Col xs={24} sm={6}>
              <Card>
                <Statistic
                  title="إجمالي المسترد"
                  value={account.totalRedeemedPoints}
                  valueStyle={{ color: "#dc2626" }}
                  prefix={<WalletOutlined />}
                />
              </Card>
            </Col>
            <Col xs={24} sm={6}>
              <Card>
                <Statistic
                  title="إجمالي الإنفاق"
                  value={Number(account.totalSpend)}
                  valueStyle={{ color: "#2563eb" }}
                  prefix={<DollarOutlined />}
                  suffix="IQD"
                  formatter={(value) => Number(value).toLocaleString()}
                />
              </Card>
            </Col>
          </Row>

          {/* Tier Benefits */}
          {account.tier && (
            <Card
              style={{ marginBottom: 16, background: "#f0fdf4", borderColor: "#86efac" }}
            >
              <div style={{ fontWeight: 600, marginBottom: 8 }}>🌟 مزايا مستوى {account.tier.name}</div>
              <Space wrap size="large">
                <span>✨ مضاعف نقاط: {account.tier.pointsMultiplier}x</span>
                {account.tier.discountPercentage && <span>💰 خصم دائم: {account.tier.discountPercentage}%</span>}
                {account.tier.benefits?.map((b, i) => <span key={i}>✓ {b}</span>)}
              </Space>
            </Card>
          )}

          {/* Action Buttons */}
          <Space style={{ marginBottom: 24 }}>
            <Button type="primary" icon={<EditOutlined />} onClick={() => setModalOpen(true)}>
              تعديل النقاط
            </Button>
            <Button onClick={() => navigate("/loyalty")}>
              عرض المكافآت
            </Button>
          </Space>

          {/* Transactions History */}
          <Card title="📜 سجل النقاط">
            {account.transactions.length === 0 ? (
              <Empty description="لا توجد معاملات" image={Empty.PRESENTED_IMAGE_SIMPLE} />
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {account.transactions.map((tx) => {
                  const config = TRANSACTION_TYPE_CONFIG[tx.transactionType] || TRANSACTION_TYPE_CONFIG.adjust;
                  return (
                    <Card key={tx.id} size="small" style={{ background: "#f9fafb" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                        <Tag color={config.color} style={{ fontSize: "1rem", padding: "4px 8px" }}>
                          {config.icon}
                        </Tag>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 500 }}>{tx.description || config.label}</div>
                          <div style={{ fontSize: "0.8rem", color: "#6b7280" }}>
                            {new Date(tx.createdAt).toLocaleDateString("ar-IQ")} • {tx.sourceType || ""}
                          </div>
                        </div>
                        <div style={{ textAlign: "left" }}>
                          <div
                            style={{
                              fontWeight: 700,
                              fontSize: "1.1rem",
                              color: tx.points > 0 ? "#059669" : "#dc2626",
                            }}
                          >
                            {tx.points > 0 ? "+" : ""}{tx.points.toLocaleString()}
                          </div>
                          <div style={{ fontSize: "0.75rem", color: "#9ca3af" }}>
                            الرصيد: {tx.balanceAfter.toLocaleString()}
                          </div>
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}
          </Card>
        </>
      )}

      {/* Adjust Points Modal */}
      <Modal
        title="تعديل النقاط"
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        footer={null}
        width={400}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <Radio.Group
            value={adjustData.type}
            onChange={(e) => setAdjustData({ ...adjustData, type: e.target.value })}
            style={{ width: "100%" }}
          >
            <Radio.Button value="add" style={{ width: "50%", textAlign: "center" }}>
              + إضافة
            </Radio.Button>
            <Radio.Button value="redeem" style={{ width: "50%", textAlign: "center" }}>
              - خصم
            </Radio.Button>
          </Radio.Group>

          <Input
            type="number"
            value={adjustData.points}
            onChange={(e) => setAdjustData({ ...adjustData, points: e.target.value })}
            placeholder="عدد النقاط"
            size="large"
          />

          <Input
            value={adjustData.reason}
            onChange={(e) => setAdjustData({ ...adjustData, reason: e.target.value })}
            placeholder="السبب (اختياري)"
          />
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 24 }}>
          <Button onClick={() => setModalOpen(false)}>إلغاء</Button>
          <Button type="primary" onClick={adjustPoints} loading={submitting}>
            تأكيد
          </Button>
        </div>
      </Modal>
    </div>
  );
}
