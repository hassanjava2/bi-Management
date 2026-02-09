/**
 * صفحة تفاصيل الوكيل
 */
import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Row, Col, Card, Descriptions, Tag, Space, Button, Statistic, Table, Empty, message, Select, Timeline } from "antd";
import {
  ArrowLeftOutlined,
  UserOutlined,
  PhoneOutlined,
  MailOutlined,
  PauseCircleOutlined,
  PlayCircleOutlined,
  EnvironmentOutlined,
  EditOutlined,
} from "@ant-design/icons";
import { PageHeader, DateDisplay, LoadingSkeleton, MoneyDisplay } from "../components/shared";
import { API_BASE, getAuthHeaders } from "../utils/api";

interface Agent {
  id: string;
  agentNumber: string;
  name: string;
  agentType: string;
  contactPerson: string | null;
  phone: string | null;
  mobile: string | null;
  email: string | null;
  city: string | null;
  address: string | null;
  region: string | null;
  territories: string[] | null;
  status: string;
  tier: string;
  commissionRate: string | null;
  discountRate: string | null;
  creditLimit: string | null;
  monthlyTarget: string | null;
  contractStartDate: string | null;
  contractEndDate: string | null;
  notes: string | null;
  createdAt: string;
  sales: Array<{ period: string; totalSales: string; totalCommission: string }>;
  orders: Array<{ id: string; orderNumber: string; totalAmount: string; status: string; createdAt: string }>;
  activities: Array<{ id: string; activityType: string; description: string; createdAt: string }>;
}

const TIER_CONFIG: Record<string, { label: string; color: string; icon: string }> = {
  bronze: { label: "برونزي", color: "orange", icon: "🥉" },
  silver: { label: "فضي", color: "default", icon: "🥈" },
  gold: { label: "ذهبي", color: "gold", icon: "🥇" },
  platinum: { label: "بلاتيني", color: "purple", icon: "💎" },
};

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  active: { label: "نشط", color: "green" },
  suspended: { label: "معلق", color: "orange" },
  terminated: { label: "منتهي", color: "red" },
};

export default function AgentDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [agent, setAgent] = useState<Agent | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAgent();
  }, [id]);

  const loadAgent = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/agents/${id}`, { headers: getAuthHeaders() });
      if (res.ok) setAgent(await res.json());
    } catch (error) {
      console.error(error);
      message.error("فشل تحميل بيانات الوكيل");
    } finally {
      setLoading(false);
    }
  };

  const changeStatus = async (status: string) => {
    if (status === "terminated" && !confirm("هل أنت متأكد من إنهاء العقد؟")) return;
    try {
      await fetch(`${API_BASE}/api/agents/${id}/status`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({ status }),
      });
      message.success("تم تغيير الحالة بنجاح");
      loadAgent();
    } catch (error) {
      console.error(error);
      message.error("فشل تغيير الحالة");
    }
  };

  const changeTier = async (tier: string) => {
    try {
      await fetch(`${API_BASE}/api/agents/${id}/tier`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({ tier }),
      });
      message.success("تم تغيير المستوى بنجاح");
      loadAgent();
    } catch (error) {
      console.error(error);
      message.error("فشل تغيير المستوى");
    }
  };

  if (loading) {
    return <LoadingSkeleton type="form" rows={6} />;
  }

  if (!agent) {
    return (
      <Card>
        <Empty description="الوكيل غير موجود">
          <Button type="primary" onClick={() => navigate("/agents")}>
            العودة للوكلاء
          </Button>
        </Empty>
      </Card>
    );
  }

  const tier = TIER_CONFIG[agent.tier] || TIER_CONFIG.bronze;
  const status = STATUS_CONFIG[agent.status] || STATUS_CONFIG.active;
  const totalSales = agent.sales?.reduce((sum, s) => sum + parseFloat(s.totalSales || "0"), 0) || 0;
  const totalCommission = agent.sales?.reduce((sum, s) => sum + parseFloat(s.totalCommission || "0"), 0) || 0;

  const orderColumns = [
    {
      title: "رقم الطلب",
      dataIndex: "orderNumber",
      key: "orderNumber",
      render: (num: string) => <span style={{ fontFamily: "monospace" }}>{num}</span>,
    },
    {
      title: "المبلغ",
      dataIndex: "totalAmount",
      key: "totalAmount",
      render: (amount: string) => <MoneyDisplay amount={Number(amount)} />,
    },
  ];

  return (
    <div>
      <PageHeader
        title={agent.name}
        subtitle={agent.agentNumber}
        breadcrumbs={[
          { title: "الوكلاء", href: "/agents" },
          { title: "تفاصيل الوكيل" },
        ]}
        extra={
          <Space>
            <Button icon={<ArrowLeftOutlined />} onClick={() => navigate("/agents")}>
              العودة
            </Button>
            <Button icon={<EditOutlined />} onClick={() => navigate(`/agents/${id}/edit`)}>
              تعديل
            </Button>
            {agent.status === "active" && (
              <Button
                icon={<PauseCircleOutlined />}
                onClick={() => changeStatus("suspended")}
              >
                تعليق
              </Button>
            )}
            {agent.status === "suspended" && (
              <Button
                type="primary"
                icon={<PlayCircleOutlined />}
                onClick={() => changeStatus("active")}
              >
                تفعيل
              </Button>
            )}
            <Select
              value={agent.tier}
              onChange={changeTier}
              style={{ width: 140 }}
              options={Object.entries(TIER_CONFIG).map(([k, v]) => ({
                value: k,
                label: `${v.icon} ${v.label}`,
              }))}
            />
          </Space>
        }
      />

      {/* Header Card */}
      <Card style={{ marginBottom: 24 }}>
        <Row gutter={[24, 24]} align="middle">
          <Col flex="none">
            <div
              style={{
                width: 70,
                height: 70,
                borderRadius: 12,
                background: "#f3f4f6",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 32,
              }}
            >
              {tier.icon}
            </div>
          </Col>
          <Col flex="auto">
            <Space direction="vertical" size={4}>
              <Space>
                <Tag color={status.color}>{status.label}</Tag>
                <Tag color={tier.color}>{tier.label}</Tag>
              </Space>
              <Space split={<span style={{ color: "#d1d5db" }}>|</span>}>
                {agent.contactPerson && (
                  <span>
                    <UserOutlined /> {agent.contactPerson}
                  </span>
                )}
                {agent.phone && (
                  <span>
                    <PhoneOutlined /> {agent.phone}
                  </span>
                )}
                {agent.email && (
                  <span>
                    <MailOutlined /> {agent.email}
                  </span>
                )}
              </Space>
            </Space>
          </Col>
        </Row>
      </Card>

      {/* Stats */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={12} sm={6}>
          <Card>
            <Statistic
              title="إجمالي المبيعات"
              value={totalSales}
              suffix="د.ع"
              valueStyle={{ color: "#2563eb" }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card>
            <Statistic
              title="إجمالي العمولات"
              value={totalCommission}
              suffix="د.ع"
              valueStyle={{ color: "#059669" }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card>
            <Statistic
              title="نسبة العمولة"
              value={agent.commissionRate || "0"}
              suffix="%"
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card>
            <Statistic
              title="عدد الطلبات"
              value={agent.orders?.length || 0}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]}>
        {/* Agent Info */}
        <Col xs={24} md={12}>
          <Card title="معلومات الوكيل">
            <Descriptions column={1} size="small">
              {agent.city && (
                <Descriptions.Item label="المدينة">
                  <EnvironmentOutlined /> {agent.city}
                </Descriptions.Item>
              )}
              {agent.address && (
                <Descriptions.Item label="العنوان">{agent.address}</Descriptions.Item>
              )}
              {agent.region && (
                <Descriptions.Item label="المنطقة">{agent.region}</Descriptions.Item>
              )}
              {agent.territories && agent.territories.length > 0 && (
                <Descriptions.Item label="المناطق المغطاة">
                  {agent.territories.join(", ")}
                </Descriptions.Item>
              )}
              {agent.discountRate && (
                <Descriptions.Item label="نسبة الخصم">{agent.discountRate}%</Descriptions.Item>
              )}
              {agent.creditLimit && (
                <Descriptions.Item label="حد الائتمان">
                  <MoneyDisplay amount={Number(agent.creditLimit)} />
                </Descriptions.Item>
              )}
              {agent.monthlyTarget && (
                <Descriptions.Item label="الهدف الشهري">
                  <MoneyDisplay amount={Number(agent.monthlyTarget)} />
                </Descriptions.Item>
              )}
              {agent.contractStartDate && (
                <Descriptions.Item label="بداية العقد">
                  <DateDisplay date={agent.contractStartDate} />
                </Descriptions.Item>
              )}
              {agent.contractEndDate && (
                <Descriptions.Item label="نهاية العقد">
                  <DateDisplay date={agent.contractEndDate} />
                </Descriptions.Item>
              )}
            </Descriptions>
          </Card>
        </Col>

        {/* Recent Orders */}
        <Col xs={24} md={12}>
          <Card title="آخر الطلبات">
            {agent.orders?.length === 0 ? (
              <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="لا توجد طلبات" />
            ) : (
              <Table
                columns={orderColumns}
                dataSource={agent.orders?.slice(0, 5)}
                rowKey="id"
                pagination={false}
                size="small"
              />
            )}
          </Card>
        </Col>
      </Row>

      {/* Activity Log */}
      <Card title="📜 سجل النشاط" style={{ marginTop: 16 }}>
        {agent.activities?.length === 0 ? (
          <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="لا يوجد نشاط" />
        ) : (
          <Timeline
            items={agent.activities?.map((act) => ({
              children: (
                <div>
                  <div>{act.description}</div>
                  <div style={{ fontSize: 12, color: "#9ca3af" }}>
                    <DateDisplay date={act.createdAt} format="datetime" />
                  </div>
                </div>
              ),
            }))}
          />
        )}
      </Card>
    </div>
  );
}
