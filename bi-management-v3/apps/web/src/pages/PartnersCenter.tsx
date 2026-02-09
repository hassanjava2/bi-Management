/**
 * مركز إدارة الشركاء
 */
import { useState, useEffect } from "react";
import { Row, Col, Card, Button, Input, Select, Tag, Space, message, Statistic, Modal, Form, Empty, List, Rate, Avatar } from "antd";
import { TeamOutlined, PlusOutlined, SearchOutlined, MailOutlined, PhoneOutlined, BankOutlined, DollarOutlined, CheckCircleOutlined, PauseCircleOutlined } from "@ant-design/icons";
import { PageHeader, LoadingSkeleton, DateDisplay } from "../components/shared";
import { API_BASE, getAuthHeaders } from "../utils/api";

interface Partner {
  id: string;
  name: string;
  nameEn: string | null;
  type: string;
  email: string | null;
  phone: string | null;
  status: string;
  partnershipLevel: string;
  industry: string | null;
  totalRevenue: string;
  rating: number | null;
  createdAt: string;
}

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  prospect: { label: "محتمل", color: "default" },
  active: { label: "نشط", color: "success" },
  inactive: { label: "غير نشط", color: "warning" },
  suspended: { label: "معلق", color: "error" },
};

const LEVEL_CONFIG: Record<string, { label: string; color: string; icon: string }> = {
  standard: { label: "قياسي", color: "default", icon: "⚪" },
  silver: { label: "فضي", color: "#9ca3af", icon: "🥈" },
  gold: { label: "ذهبي", color: "#f59e0b", icon: "🥇" },
  platinum: { label: "بلاتيني", color: "#8b5cf6", icon: "💎" },
};

const TYPE_CONFIG: Record<string, { label: string; icon: string }> = {
  business: { label: "تجاري", icon: "🏢" },
  strategic: { label: "استراتيجي", icon: "🎯" },
  technology: { label: "تقني", icon: "💻" },
  distribution: { label: "توزيع", icon: "📦" },
  service: { label: "خدمات", icon: "🛠️" },
};

export default function PartnersCenter() {
  const [partners, setPartners] = useState<Partner[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({ type: "", status: "", search: "" });
  const [showModal, setShowModal] = useState(false);
  const [form] = Form.useForm();

  useEffect(() => { loadData(); }, [filter]);

  const loadData = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filter.type) params.append("type", filter.type);
      if (filter.status) params.append("status", filter.status);
      if (filter.search) params.append("search", filter.search);

      const [partnersRes, statsRes] = await Promise.all([
        fetch(`${API_BASE}/api/partners?${params}`, { headers: getAuthHeaders() }),
        fetch(`${API_BASE}/api/partners/stats`, { headers: getAuthHeaders() }),
      ]);
      if (partnersRes.ok) setPartners((await partnersRes.json()).partners || []);
      if (statsRes.ok) setStats(await statsRes.json());
    } catch (error) {
      console.error(error);
      message.error("حدث خطأ في تحميل البيانات");
    }
    finally { setLoading(false); }
  };

  const handleCreate = async () => {
    try {
      const values = await form.validateFields();
      const res = await fetch(`${API_BASE}/api/partners`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify(values),
      });
      if (res.ok) {
        message.success("تم إضافة الشريك بنجاح");
        setShowModal(false);
        form.resetFields();
        loadData();
      } else {
        message.error("فشل في إضافة الشريك");
      }
    } catch (error) {
      console.error(error);
    }
  };

  const updateStatus = async (id: string, status: string) => {
    try {
      await fetch(`${API_BASE}/api/partners/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      message.success("تم تحديث الحالة");
      loadData();
    } catch (error) {
      console.error(error);
      message.error("فشل في تحديث الحالة");
    }
  };

  return (
    <div>
      <PageHeader
        title="إدارة الشركاء"
        subtitle="إدارة علاقات الشراكة والتعاون"
        icon={<TeamOutlined />}
        breadcrumbs={[
          { label: "الرئيسية", path: "/" },
          { label: "إدارة الشركاء" },
        ]}
        extra={
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setShowModal(true)}>
            شريك جديد
          </Button>
        }
      />

      {/* الإحصائيات */}
      {stats && (
        <Row gutter={[12, 12]} style={{ marginBottom: 24 }}>
          <Col span={12} md={5}>
            <Card>
              <Statistic
                title="إجمالي الشركاء"
                value={stats.total}
                prefix={<TeamOutlined />}
              />
            </Card>
          </Col>
          <Col span={12} md={5}>
            <Card style={{ background: "#d1fae5", border: "none" }}>
              <Statistic
                title={<span style={{ color: "#047857" }}>نشط</span>}
                value={stats.active}
                valueStyle={{ color: "#059669" }}
                prefix={<CheckCircleOutlined />}
              />
            </Card>
          </Col>
          <Col span={12} md={5}>
            <Card>
              <Statistic
                title={<span style={{ color: "#4b5563" }}>محتمل</span>}
                value={stats.prospect}
                valueStyle={{ color: "#6b7280" }}
              />
            </Card>
          </Col>
          <Col span={12} md={5}>
            <Card style={{ background: "#fef3c7", border: "none" }}>
              <Statistic
                title={<span style={{ color: "#92400e" }}>ذهبي</span>}
                value={stats.byLevel?.gold || 0}
                valueStyle={{ color: "#d97706" }}
                prefix="🥇"
              />
            </Card>
          </Col>
          <Col span={24} md={4}>
            <Card style={{ background: "#ede9fe", border: "none" }}>
              <Statistic
                title={<span style={{ color: "#6d28d9" }}>عمولات معلقة</span>}
                value={Number(stats.pendingCommissions || 0).toLocaleString()}
                valueStyle={{ color: "#7c3aed", fontSize: 18 }}
                prefix={<DollarOutlined />}
              />
            </Card>
          </Col>
        </Row>
      )}

      {/* الفلاتر */}
      <Card style={{ marginBottom: 16 }}>
        <Space wrap size="middle">
          <Input
            placeholder="بحث بالاسم أو البريد..."
            prefix={<SearchOutlined />}
            value={filter.search}
            onChange={(e) => setFilter({ ...filter, search: e.target.value })}
            style={{ width: 250 }}
            allowClear
          />
          <Select
            placeholder="كل الأنواع"
            value={filter.type || undefined}
            onChange={(val) => setFilter({ ...filter, type: val || "" })}
            style={{ width: 150 }}
            allowClear
          >
            {Object.entries(TYPE_CONFIG).map(([k, v]) => (
              <Select.Option key={k} value={k}>{v.icon} {v.label}</Select.Option>
            ))}
          </Select>
          <Select
            placeholder="كل الحالات"
            value={filter.status || undefined}
            onChange={(val) => setFilter({ ...filter, status: val || "" })}
            style={{ width: 140 }}
            allowClear
          >
            {Object.entries(STATUS_CONFIG).map(([k, v]) => (
              <Select.Option key={k} value={k}>{v.label}</Select.Option>
            ))}
          </Select>
        </Space>
      </Card>

      {/* القائمة */}
      {loading ? (
        <LoadingSkeleton type="list" />
      ) : partners.length === 0 ? (
        <Card>
          <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="لا يوجد شركاء" />
        </Card>
      ) : (
        <List
          dataSource={partners}
          renderItem={(partner) => {
            const status = STATUS_CONFIG[partner.status] || STATUS_CONFIG.prospect;
            const level = LEVEL_CONFIG[partner.partnershipLevel] || LEVEL_CONFIG.standard;
            const type = TYPE_CONFIG[partner.type] || TYPE_CONFIG.business;

            return (
              <Card style={{ marginBottom: 12 }} size="small">
                <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                  <Avatar
                    size={50}
                    style={{ background: "#f3f4f6", color: "#374151", fontSize: 24 }}
                  >
                    {type.icon}
                  </Avatar>
                  <div style={{ flex: 1 }}>
                    <Space style={{ marginBottom: 4 }} wrap>
                      <span style={{ fontWeight: 600, fontSize: "1rem" }}>{partner.name}</span>
                      <Tag color={status.color}>{status.label}</Tag>
                      <span style={{ fontSize: "0.85rem" }}>{level.icon} {level.label}</span>
                    </Space>
                    <div style={{ fontSize: "0.8rem", color: "#6b7280" }}>
                      <Space split={<span style={{ color: "#d1d5db" }}>|</span>}>
                        {partner.email && <span><MailOutlined /> {partner.email}</span>}
                        {partner.phone && <span><PhoneOutlined /> {partner.phone}</span>}
                        {partner.industry && <span><BankOutlined /> {partner.industry}</span>}
                      </Space>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 16, marginTop: 4, fontSize: "0.85rem" }}>
                      <span>
                        {partner.rating ? (
                          <Rate disabled value={partner.rating} style={{ fontSize: 14 }} />
                        ) : (
                          <span style={{ color: "#d1d5db" }}>لم يُقيّم</span>
                        )}
                      </span>
                      <span style={{ color: "#059669" }}>
                        <DollarOutlined /> {Number(partner.totalRevenue || 0).toLocaleString()}
                      </span>
                    </div>
                  </div>
                  <Space>
                    {partner.status === "prospect" && (
                      <Button
                        type="primary"
                        size="small"
                        icon={<CheckCircleOutlined />}
                        style={{ background: "#059669" }}
                        onClick={() => updateStatus(partner.id, "active")}
                      >
                        تفعيل
                      </Button>
                    )}
                    {partner.status === "active" && (
                      <Button
                        size="small"
                        icon={<PauseCircleOutlined />}
                        style={{ background: "#fef3c7", color: "#d97706", border: "none" }}
                        onClick={() => updateStatus(partner.id, "inactive")}
                      >
                        إيقاف
                      </Button>
                    )}
                  </Space>
                </div>
              </Card>
            );
          }}
        />
      )}

      {/* موديل إضافة شريك */}
      <Modal
        title={<Space><TeamOutlined /> شريك جديد</Space>}
        open={showModal}
        onCancel={() => { setShowModal(false); form.resetFields(); }}
        onOk={handleCreate}
        okText="إضافة"
        cancelText="إلغاء"
        width={600}
      >
        <Form form={form} layout="vertical" initialValues={{ type: "business", status: "prospect", partnershipLevel: "standard" }}>
          <Form.Item name="name" label="اسم الشريك" rules={[{ required: true, message: "اسم الشريك مطلوب" }]}>
            <Input placeholder="اسم الشريك" />
          </Form.Item>
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name="email" label="البريد الإلكتروني">
                <Input type="email" placeholder="example@email.com" prefix={<MailOutlined />} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="phone" label="الهاتف">
                <Input placeholder="رقم الهاتف" prefix={<PhoneOutlined />} />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name="type" label="نوع الشراكة">
                <Select>
                  {Object.entries(TYPE_CONFIG).map(([k, v]) => (
                    <Select.Option key={k} value={k}>{v.icon} {v.label}</Select.Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="partnershipLevel" label="مستوى الشراكة">
                <Select>
                  {Object.entries(LEVEL_CONFIG).map(([k, v]) => (
                    <Select.Option key={k} value={k}>{v.icon} {v.label}</Select.Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="industry" label="القطاع/الصناعة">
            <Input placeholder="مثال: التكنولوجيا، التجزئة، الصحة" prefix={<BankOutlined />} />
          </Form.Item>
          <Form.Item name="notes" label="ملاحظات">
            <Input.TextArea rows={3} placeholder="ملاحظات إضافية عن الشريك" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
