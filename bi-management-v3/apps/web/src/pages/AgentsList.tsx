/**
 * صفحة قائمة الوكلاء والموزعين
 */
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Row,
  Col,
  Card,
  Button,
  Input,
  Select,
  Tag,
  Space,
  message,
  Statistic,
  Empty,
  Modal,
  Form,
  Avatar,
  List,
  InputNumber,
} from "antd";
import {
  PlusOutlined,
  SearchOutlined,
  UserOutlined,
  ShopOutlined,
  PhoneOutlined,
  EnvironmentOutlined,
  PercentageOutlined,
} from "@ant-design/icons";
import { PageHeader, LoadingSkeleton } from "../components/shared";
import { API_BASE, getAuthHeaders } from "../utils/api";

interface Agent {
  id: string;
  agentNumber: string;
  name: string;
  agentType: string;
  contactPerson: string | null;
  phone: string | null;
  city: string | null;
  region: string | null;
  status: string;
  tier: string;
  commissionRate: string | null;
  createdAt: string;
}

const AGENT_TYPES: Record<string, { label: string; icon: string }> = {
  distributor: { label: "موزع", icon: "🏪" },
  reseller: { label: "بائع تجزئة", icon: "🛒" },
  franchise: { label: "فرانشايز", icon: "🏬" },
  representative: { label: "ممثل", icon: "👤" },
};

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  active: { label: "نشط", color: "green" },
  suspended: { label: "معلق", color: "orange" },
  terminated: { label: "منتهي", color: "red" },
};

const TIER_CONFIG: Record<string, { label: string; color: string; icon: string }> = {
  bronze: { label: "برونزي", color: "#92400e", icon: "🥉" },
  silver: { label: "فضي", color: "#6b7280", icon: "🥈" },
  gold: { label: "ذهبي", color: "#d97706", icon: "🥇" },
  platinum: { label: "بلاتيني", color: "#7c3aed", icon: "💎" },
};

export default function AgentsList() {
  const navigate = useNavigate();
  const [agents, setAgents] = useState<Agent[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("active");
  const [typeFilter, setTypeFilter] = useState("");
  const [search, setSearch] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [form] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadData();
  }, [statusFilter, typeFilter, search]);

  const loadData = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter) params.append("status", statusFilter);
      if (typeFilter) params.append("type", typeFilter);
      if (search) params.append("search", search);

      const [res, statsRes] = await Promise.all([
        fetch(`${API_BASE}/api/agents?${params}`, { headers: getAuthHeaders() }),
        fetch(`${API_BASE}/api/agents/stats`, { headers: getAuthHeaders() }),
      ]);
      if (res.ok) setAgents((await res.json()).agents || []);
      if (statsRes.ok) setStats(await statsRes.json());
    } catch (error) {
      console.error(error);
      message.error("فشل في تحميل البيانات");
    } finally {
      setLoading(false);
    }
  };

  const handleAddAgent = async () => {
    try {
      const values = await form.validateFields();
      setSubmitting(true);
      
      const res = await fetch(`${API_BASE}/api/agents`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify(values),
      });
      
      if (res.ok) {
        message.success("تم إضافة الوكيل بنجاح");
        setShowAddModal(false);
        form.resetFields();
        loadData();
      } else {
        const data = await res.json();
        message.error(data.error || "فشل في إضافة الوكيل");
      }
    } catch (error) {
      if (error instanceof Error) {
        message.error(error.message);
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (loading && !agents.length) {
    return (
      <div style={{ padding: 24 }}>
        <LoadingSkeleton type="list" rows={5} />
      </div>
    );
  }

  return (
    <div style={{ padding: 24 }}>
      <PageHeader
        title="الوكلاء والموزعين"
        subtitle="إدارة شبكة الوكلاء والموزعين والعمولات"
        breadcrumbs={[{ title: "الوكلاء" }]}
        extra={
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setShowAddModal(true)}>
            وكيل جديد
          </Button>
        }
      />

      {/* الإحصائيات */}
      {stats && (
        <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
          <Col xs={24} sm={12} md={8} lg={4}>
            <Card style={{ background: "linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%)" }}>
              <Statistic
                title={<span style={{ color: "#047857" }}>نشط</span>}
                value={stats.byStatus?.active || 0}
                valueStyle={{ color: "#059669", fontWeight: 700 }}
              />
            </Card>
          </Col>
          {Object.entries(TIER_CONFIG).map(([key, config]) => (
            <Col xs={12} sm={12} md={8} lg={5} key={key}>
              <Card>
                <Statistic
                  title={
                    <span>
                      {config.icon} {config.label}
                    </span>
                  }
                  value={stats.byTier?.[key] || 0}
                  valueStyle={{ fontWeight: 700 }}
                />
              </Card>
            </Col>
          ))}
        </Row>
      )}

      {/* الفلاتر */}
      <Card style={{ marginBottom: 16 }}>
        <Space wrap size="middle">
          <Input
            placeholder="بحث بالاسم أو الرقم..."
            prefix={<SearchOutlined />}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ width: 250 }}
            allowClear
          />
          <Select
            value={statusFilter}
            onChange={setStatusFilter}
            style={{ width: 150 }}
            placeholder="الحالة"
            allowClear
          >
            <Select.Option value="">كل الحالات</Select.Option>
            <Select.Option value="active">نشط</Select.Option>
            <Select.Option value="suspended">معلق</Select.Option>
            <Select.Option value="terminated">منتهي</Select.Option>
          </Select>
          <Select
            value={typeFilter}
            onChange={setTypeFilter}
            style={{ width: 150 }}
            placeholder="النوع"
            allowClear
          >
            <Select.Option value="">كل الأنواع</Select.Option>
            {Object.entries(AGENT_TYPES).map(([key, config]) => (
              <Select.Option key={key} value={key}>
                {config.icon} {config.label}
              </Select.Option>
            ))}
          </Select>
        </Space>
      </Card>

      {/* القائمة */}
      {agents.length === 0 ? (
        <Card>
          <Empty
            image={<ShopOutlined style={{ fontSize: 64, color: "#d1d5db" }} />}
            description="لا يوجد وكلاء"
          >
            <Button type="primary" icon={<PlusOutlined />} onClick={() => setShowAddModal(true)}>
              إضافة وكيل جديد
            </Button>
          </Empty>
        </Card>
      ) : (
        <List
          loading={loading}
          dataSource={agents}
          renderItem={(agent) => {
            const type = AGENT_TYPES[agent.agentType] || AGENT_TYPES.distributor;
            const status = STATUS_CONFIG[agent.status] || STATUS_CONFIG.active;
            const tier = TIER_CONFIG[agent.tier] || TIER_CONFIG.bronze;

            return (
              <Card
                hoverable
                style={{ marginBottom: 12, cursor: "pointer" }}
                onClick={() => navigate(`/agents/${agent.id}`)}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                  <Avatar
                    size={50}
                    style={{ background: "#f3f4f6", fontSize: 24 }}
                  >
                    {type.icon}
                  </Avatar>
                  <div style={{ flex: 1 }}>
                    <Space align="center" style={{ marginBottom: 4 }}>
                      <span style={{ fontWeight: 600, fontSize: 16 }}>{agent.name}</span>
                      <Tag style={{ fontFamily: "monospace" }}>{agent.agentNumber}</Tag>
                      <Tag color={status.color}>{status.label}</Tag>
                      <span>{tier.icon}</span>
                    </Space>
                    <div>
                      <Space size="large" style={{ color: "#6b7280", fontSize: 14 }}>
                        <span>{type.label}</span>
                        {agent.city && (
                          <span>
                            <EnvironmentOutlined /> {agent.city}
                          </span>
                        )}
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
                      </Space>
                    </div>
                  </div>
                  {agent.commissionRate && (
                    <div style={{ textAlign: "left" }}>
                      <div style={{ fontWeight: 600, color: "#059669", fontSize: 18 }}>
                        {agent.commissionRate}%
                      </div>
                      <div style={{ fontSize: 12, color: "#9ca3af" }}>عمولة</div>
                    </div>
                  )}
                </div>
              </Card>
            );
          }}
        />
      )}

      {/* موديل إضافة وكيل */}
      <Modal
        title="وكيل جديد"
        open={showAddModal}
        onOk={handleAddAgent}
        onCancel={() => {
          setShowAddModal(false);
          form.resetFields();
        }}
        okText="حفظ"
        cancelText="إلغاء"
        confirmLoading={submitting}
        width={600}
      >
        <Form
          form={form}
          layout="vertical"
          initialValues={{ agentType: "distributor", tier: "bronze" }}
        >
          <Form.Item
            name="name"
            label="اسم الوكيل"
            rules={[{ required: true, message: "اسم الوكيل مطلوب" }]}
          >
            <Input placeholder="أدخل اسم الوكيل" />
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="agentType" label="النوع">
                <Select>
                  {Object.entries(AGENT_TYPES).map(([key, config]) => (
                    <Select.Option key={key} value={key}>
                      {config.icon} {config.label}
                    </Select.Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="tier" label="الفئة">
                <Select>
                  {Object.entries(TIER_CONFIG).map(([key, config]) => (
                    <Select.Option key={key} value={key}>
                      {config.icon} {config.label}
                    </Select.Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="contactPerson" label="جهة الاتصال">
                <Input prefix={<UserOutlined />} placeholder="اسم جهة الاتصال" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="phone" label="الهاتف">
                <Input prefix={<PhoneOutlined />} placeholder="رقم الهاتف" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="city" label="المدينة">
                <Input prefix={<EnvironmentOutlined />} placeholder="المدينة" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="region" label="المنطقة">
                <Input placeholder="المنطقة" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="commissionRate" label="نسبة العمولة %">
            <InputNumber
              prefix={<PercentageOutlined />}
              placeholder="مثال: 5"
              style={{ width: "100%" }}
              min={0}
              max={100}
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
