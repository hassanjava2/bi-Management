/**
 * صفحة إدارة برنامج الولاء
 */
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
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
  Progress,
  Tabs,
  Modal,
  Form,
  InputNumber,
  ColorPicker,
} from "antd";
import {
  StarOutlined,
  UserOutlined,
  TrophyOutlined,
  GiftOutlined,
  SettingOutlined,
  PieChartOutlined,
  PlusOutlined,
} from "@ant-design/icons";
import { PageHeader, MoneyDisplay, DateDisplay, LoadingSkeleton } from "../components/shared";
import { API_BASE, getAuthHeaders } from "../utils/api";

interface Program {
  id: string;
  name: string;
  description: string | null;
  isActive: boolean;
  isDefault: boolean;
  amountPerPoint: string;
  pointValue: string;
  minRedeemPoints: number;
  maxRedeemPercentage: number;
}

interface Tier {
  id: string;
  name: string;
  minPoints: number;
  pointsMultiplier: string;
  color: string | null;
  discountPercentage: string | null;
}

interface Stats {
  totalMembers: number;
  totalCurrentPoints: number;
  totalEarnedPoints: number;
  totalRedeemedPoints: number;
  tierDistribution: Array<{ tierId: string | null; tierName: string | null; count: number }>;
}

interface Account {
  id: string;
  customerId: string;
  currentPoints: number;
  totalEarnedPoints: number;
  totalSpend: string;
  customer: { id: string; fullName: string; phone: string } | null;
  tier: { id: string; name: string; color: string } | null;
}

interface Reward {
  id: string;
  name: string;
  rewardType: string;
  pointsCost: number;
  discountValue: string | null;
  stockLimit: number | null;
  redeemedCount: number;
}

export default function LoyaltyProgram() {
  const navigate = useNavigate();
  const [program, setProgram] = useState<Program | null>(null);
  const [tiers, setTiers] = useState<Tier[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<string>("overview");
  const [showCreateTier, setShowCreateTier] = useState(false);
  const [showCreateReward, setShowCreateReward] = useState(false);
  const [tierForm] = Form.useForm();
  const [rewardForm] = Form.useForm();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const programRes = await fetch(`${API_BASE}/api/loyalty/programs/active`, { headers: getAuthHeaders() });
      if (programRes.ok) {
        const prog = await programRes.json();
        setProgram(prog);
        
        if (prog?.id) {
          const [tiersRes, statsRes, accountsRes, rewardsRes] = await Promise.all([
            fetch(`${API_BASE}/api/loyalty/tiers/${prog.id}`, { headers: getAuthHeaders() }),
            fetch(`${API_BASE}/api/loyalty/stats/${prog.id}`, { headers: getAuthHeaders() }),
            fetch(`${API_BASE}/api/loyalty/accounts?programId=${prog.id}`, { headers: getAuthHeaders() }),
            fetch(`${API_BASE}/api/loyalty/rewards/${prog.id}`, { headers: getAuthHeaders() }),
          ]);

          if (tiersRes.ok) setTiers(await tiersRes.json());
          if (statsRes.ok) setStats(await statsRes.json());
          if (accountsRes.ok) setAccounts(await accountsRes.json());
          if (rewardsRes.ok) setRewards(await rewardsRes.json());
        }
      }
    } catch (error) {
      console.error(error);
      message.error("حدث خطأ أثناء تحميل البيانات");
    } finally {
      setLoading(false);
    }
  };

  const createTier = async (values: any) => {
    try {
      const res = await fetch(`${API_BASE}/api/loyalty/tiers`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({ ...values, programId: program?.id }),
      });
      if (res.ok) {
        message.success("تم إنشاء المستوى بنجاح");
        setShowCreateTier(false);
        tierForm.resetFields();
        loadData();
      } else {
        message.error("فشل في إنشاء المستوى");
      }
    } catch (error) {
      console.error(error);
      message.error("حدث خطأ أثناء إنشاء المستوى");
    }
  };

  const createReward = async (values: any) => {
    try {
      const res = await fetch(`${API_BASE}/api/loyalty/rewards`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({ ...values, programId: program?.id }),
      });
      if (res.ok) {
        message.success("تم إنشاء المكافأة بنجاح");
        setShowCreateReward(false);
        rewardForm.resetFields();
        loadData();
      } else {
        message.error("فشل في إنشاء المكافأة");
      }
    } catch (error) {
      console.error(error);
      message.error("حدث خطأ أثناء إنشاء المكافأة");
    }
  };

  const membersColumns = [
    {
      title: "العميل",
      key: "customer",
      render: (_: any, record: Account) => (
        <div>
          <div style={{ fontWeight: 500 }}>{record.customer?.fullName || "-"}</div>
          <div style={{ fontSize: "0.8rem", color: "#6b7280" }}>{record.customer?.phone}</div>
        </div>
      ),
    },
    {
      title: "المستوى",
      key: "tier",
      align: "center" as const,
      render: (_: any, record: Account) =>
        record.tier ? (
          <Tag color={record.tier.color || "default"}>{record.tier.name}</Tag>
        ) : (
          "-"
        ),
    },
    {
      title: "النقاط الحالية",
      dataIndex: "currentPoints",
      key: "currentPoints",
      align: "center" as const,
      render: (points: number) => (
        <span style={{ fontWeight: 600, color: "#7c3aed" }}>{points.toLocaleString()}</span>
      ),
    },
    {
      title: "إجمالي النقاط",
      dataIndex: "totalEarnedPoints",
      key: "totalEarnedPoints",
      align: "center" as const,
      render: (points: number) => points.toLocaleString(),
    },
    {
      title: "إجمالي الإنفاق",
      dataIndex: "totalSpend",
      key: "totalSpend",
      align: "center" as const,
      render: (value: string) => <MoneyDisplay amount={Number(value)} />,
    },
  ];

  if (loading) {
    return <LoadingSkeleton />;
  }

  const tabItems = [
    {
      key: "overview",
      label: "نظرة عامة",
      children: (
        <Row gutter={[16, 16]}>
          <Col xs={24} lg={12}>
            <Card title={<><SettingOutlined /> إعدادات البرنامج</>}>
              <table style={{ width: "100%" }}>
                <tbody>
                  <tr>
                    <td style={{ padding: "0.5rem 0", color: "#6b7280" }}>كل</td>
                    <td style={{ fontWeight: 500 }}>
                      <MoneyDisplay amount={Number(program?.amountPerPoint)} /> = 1 نقطة
                    </td>
                  </tr>
                  <tr>
                    <td style={{ padding: "0.5rem 0", color: "#6b7280" }}>قيمة النقطة</td>
                    <td style={{ fontWeight: 500 }}>
                      <MoneyDisplay amount={Number(program?.pointValue)} />
                    </td>
                  </tr>
                  <tr>
                    <td style={{ padding: "0.5rem 0", color: "#6b7280" }}>أدنى استرداد</td>
                    <td style={{ fontWeight: 500 }}>{program?.minRedeemPoints} نقطة</td>
                  </tr>
                  <tr>
                    <td style={{ padding: "0.5rem 0", color: "#6b7280" }}>أقصى خصم</td>
                    <td style={{ fontWeight: 500 }}>{program?.maxRedeemPercentage}% من الفاتورة</td>
                  </tr>
                </tbody>
              </table>
            </Card>
          </Col>
          <Col xs={24} lg={12}>
            <Card title={<><PieChartOutlined /> توزيع الأعضاء</>}>
              {stats?.tierDistribution.length === 0 ? (
                <div style={{ textAlign: "center", color: "#9ca3af" }}>لا توجد بيانات</div>
              ) : (
                <Space direction="vertical" style={{ width: "100%" }}>
                  {stats?.tierDistribution.map((td, idx) => (
                    <div key={idx}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                        <span>{td.tierName || "بدون مستوى"}</span>
                        <span>{td.count}</span>
                      </div>
                      <Progress
                        percent={stats.totalMembers > 0 ? (td.count / stats.totalMembers) * 100 : 0}
                        showInfo={false}
                        strokeColor={tiers.find((t) => t.id === td.tierId)?.color || "#9ca3af"}
                      />
                    </div>
                  ))}
                </Space>
              )}
            </Card>
          </Col>
        </Row>
      ),
    },
    {
      key: "members",
      label: `الأعضاء (${stats?.totalMembers || 0})`,
      children: (
        <Card>
          <Table
            columns={membersColumns}
            dataSource={accounts}
            rowKey="id"
            onRow={(record) => ({
              onClick: () => navigate(`/loyalty/customer/${record.customerId}`),
              style: { cursor: "pointer" },
            })}
            pagination={{ pageSize: 10 }}
          />
        </Card>
      ),
    },
    {
      key: "tiers",
      label: `المستويات (${tiers.length})`,
      children: (
        <>
          <div style={{ marginBottom: 16, textAlign: "left" }}>
            <Button type="primary" icon={<PlusOutlined />} onClick={() => setShowCreateTier(true)}>
              مستوى جديد
            </Button>
          </div>
          <Row gutter={[16, 16]}>
            {tiers.map((tier) => (
              <Col xs={24} sm={12} lg={6} key={tier.id}>
                <Card
                  style={{ borderTop: `4px solid ${tier.color || "#9ca3af"}` }}
                  title={tier.name}
                >
                  <Space direction="vertical">
                    <div>🎯 {tier.minPoints.toLocaleString()} نقطة</div>
                    <div>✨ مضاعف: {tier.pointsMultiplier}x</div>
                    {tier.discountPercentage && <div>💰 خصم: {tier.discountPercentage}%</div>}
                  </Space>
                </Card>
              </Col>
            ))}
          </Row>
        </>
      ),
    },
    {
      key: "rewards",
      label: `المكافآت (${rewards.length})`,
      children: (
        <>
          <div style={{ marginBottom: 16, textAlign: "left" }}>
            <Button type="primary" icon={<PlusOutlined />} onClick={() => setShowCreateReward(true)}>
              مكافأة جديدة
            </Button>
          </div>
          <Row gutter={[16, 16]}>
            {rewards.map((reward) => (
              <Col xs={24} sm={12} lg={8} key={reward.id}>
                <Card title={reward.name}>
                  <Space direction="vertical" style={{ width: "100%" }}>
                    <Space>
                      <Tag color="blue">{reward.pointsCost} نقطة</Tag>
                      <Tag>
                        {reward.rewardType === "discount"
                          ? "خصم"
                          : reward.rewardType === "product"
                          ? "منتج"
                          : "قسيمة"}
                      </Tag>
                    </Space>
                    {reward.discountValue && (
                      <div style={{ color: "#059669" }}>قيمة الخصم: {reward.discountValue}</div>
                    )}
                    {reward.stockLimit && (
                      <div style={{ color: "#6b7280", fontSize: "0.85rem" }}>
                        المتاح: {reward.stockLimit - reward.redeemedCount} / {reward.stockLimit}
                      </div>
                    )}
                  </Space>
                </Card>
              </Col>
            ))}
          </Row>
        </>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="برنامج الولاء"
        subtitle={program?.name || "لم يتم إعداد برنامج"}
        breadcrumbs={[
          { label: "الرئيسية", path: "/" },
          { label: "برنامج الولاء" },
        ]}
        icon={<StarOutlined />}
        extra={
          !program && (
            <Button type="primary" icon={<PlusOutlined />}>
              إنشاء برنامج
            </Button>
          )
        }
      />

      {program && stats && (
        <>
          {/* الإحصائيات */}
          <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
            <Col xs={24} sm={12} lg={6}>
              <Card style={{ background: "linear-gradient(135deg, #667eea, #764ba2)" }}>
                <Statistic
                  title={<span style={{ color: "rgba(255,255,255,0.9)" }}>أعضاء البرنامج</span>}
                  value={stats.totalMembers}
                  valueStyle={{ color: "#fff", fontSize: "2rem", fontWeight: 700 }}
                  prefix={<UserOutlined />}
                />
              </Card>
            </Col>
            <Col xs={24} sm={12} lg={6}>
              <Card style={{ background: "linear-gradient(135deg, #f093fb, #f5576c)" }}>
                <Statistic
                  title={<span style={{ color: "rgba(255,255,255,0.9)" }}>نقاط متاحة</span>}
                  value={stats.totalCurrentPoints}
                  valueStyle={{ color: "#fff", fontSize: "2rem", fontWeight: 700 }}
                  prefix={<StarOutlined />}
                />
              </Card>
            </Col>
            <Col xs={24} sm={12} lg={6}>
              <Card style={{ background: "linear-gradient(135deg, #4facfe, #00f2fe)" }}>
                <Statistic
                  title={<span style={{ color: "rgba(255,255,255,0.9)" }}>إجمالي النقاط المكتسبة</span>}
                  value={stats.totalEarnedPoints}
                  valueStyle={{ color: "#fff", fontSize: "2rem", fontWeight: 700 }}
                  prefix={<TrophyOutlined />}
                />
              </Card>
            </Col>
            <Col xs={24} sm={12} lg={6}>
              <Card style={{ background: "linear-gradient(135deg, #43e97b, #38f9d7)" }}>
                <Statistic
                  title={<span style={{ color: "rgba(255,255,255,0.9)" }}>نقاط تم استردادها</span>}
                  value={stats.totalRedeemedPoints}
                  valueStyle={{ color: "#fff", fontSize: "2rem", fontWeight: 700 }}
                  prefix={<GiftOutlined />}
                />
              </Card>
            </Col>
          </Row>

          {/* التبويبات */}
          <Tabs activeKey={activeTab} onChange={setActiveTab} items={tabItems} />
        </>
      )}

      {/* مودال إنشاء مستوى */}
      <Modal
        title="مستوى جديد"
        open={showCreateTier}
        onCancel={() => setShowCreateTier(false)}
        footer={null}
      >
        <Form form={tierForm} layout="vertical" onFinish={createTier}>
          <Form.Item
            name="name"
            label="اسم المستوى"
            rules={[{ required: true, message: "الاسم مطلوب" }]}
          >
            <Input placeholder="مثال: ذهبي" />
          </Form.Item>
          <Form.Item
            name="minPoints"
            label="الحد الأدنى من النقاط"
            rules={[{ required: true, message: "الحد الأدنى مطلوب" }]}
          >
            <InputNumber style={{ width: "100%" }} min={0} />
          </Form.Item>
          <Form.Item name="pointsMultiplier" label="مضاعف النقاط" initialValue="1">
            <InputNumber style={{ width: "100%" }} min={1} step={0.1} />
          </Form.Item>
          <Form.Item name="color" label="اللون" initialValue="#3b82f6">
            <ColorPicker />
          </Form.Item>
          <Form.Item>
            <Space>
              <Button onClick={() => setShowCreateTier(false)}>إلغاء</Button>
              <Button type="primary" htmlType="submit">
                حفظ
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* مودال إنشاء مكافأة */}
      <Modal
        title="مكافأة جديدة"
        open={showCreateReward}
        onCancel={() => setShowCreateReward(false)}
        footer={null}
      >
        <Form form={rewardForm} layout="vertical" onFinish={createReward}>
          <Form.Item
            name="name"
            label="اسم المكافأة"
            rules={[{ required: true, message: "الاسم مطلوب" }]}
          >
            <Input placeholder="اسم المكافأة" />
          </Form.Item>
          <Form.Item name="rewardType" label="نوع المكافأة" initialValue="discount">
            <Select>
              <Select.Option value="discount">خصم</Select.Option>
              <Select.Option value="voucher">قسيمة شراء</Select.Option>
              <Select.Option value="product">منتج مجاني</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item
            name="pointsCost"
            label="تكلفة النقاط"
            rules={[{ required: true, message: "تكلفة النقاط مطلوبة" }]}
          >
            <InputNumber style={{ width: "100%" }} min={1} />
          </Form.Item>
          <Form.Item
            noStyle
            shouldUpdate={(prevValues, currentValues) =>
              prevValues.rewardType !== currentValues.rewardType
            }
          >
            {({ getFieldValue }) =>
              (getFieldValue("rewardType") === "discount" ||
                getFieldValue("rewardType") === "voucher") && (
                <Form.Item name="discountValue" label="قيمة الخصم/القسيمة">
                  <Input placeholder="قيمة الخصم/القسيمة" />
                </Form.Item>
              )
            }
          </Form.Item>
          <Form.Item>
            <Space>
              <Button onClick={() => setShowCreateReward(false)}>إلغاء</Button>
              <Button type="primary" htmlType="submit">
                حفظ
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
