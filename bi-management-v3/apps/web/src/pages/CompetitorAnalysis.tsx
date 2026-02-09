/**
 * صفحة تحليل المنافسين
 */
import { useState, useEffect } from "react";
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
  Rate,
  List,
  Typography,
} from "antd";
import {
  PlusOutlined,
  SearchOutlined,
  GlobalOutlined,
  EnvironmentOutlined,
  BankOutlined,
  PieChartOutlined,
  CloseOutlined,
  AimOutlined,
} from "@ant-design/icons";
import { PageHeader, LoadingSkeleton, DateDisplay } from "../components/shared";
import { API_BASE, getAuthHeaders } from "../utils/api";

const { Text, Title, Link: AntLink } = Typography;

interface Competitor {
  id: string;
  name: string;
  nameEn: string | null;
  website: string | null;
  category: string;
  companySize: string | null;
  marketShare: string | null;
  threatLevel: string;
  rating: number;
  strengths: string[] | null;
  weaknesses: string[] | null;
  city: string | null;
}

const CATEGORY_CONFIG: Record<string, { label: string; color: string }> = {
  direct: { label: "مباشر", color: "red" },
  indirect: { label: "غير مباشر", color: "orange" },
  potential: { label: "محتمل", color: "default" },
};

const THREAT_CONFIG: Record<string, { label: string; color: string }> = {
  low: { label: "منخفض", color: "success" },
  medium: { label: "متوسط", color: "warning" },
  high: { label: "عالي", color: "error" },
  critical: { label: "حرج", color: "purple" },
};

const SIZE_LABELS: Record<string, string> = {
  small: "صغيرة",
  medium: "متوسطة",
  large: "كبيرة",
  enterprise: "عملاقة",
};

export default function CompetitorAnalysis() {
  const [competitors, setCompetitors] = useState<Competitor[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState("");
  const [threatFilter, setThreatFilter] = useState("");
  const [search, setSearch] = useState("");
  const [selectedCompetitor, setSelectedCompetitor] = useState<any>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [form] = Form.useForm();

  useEffect(() => {
    loadData();
  }, [categoryFilter, threatFilter, search]);

  const loadData = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (categoryFilter) params.append("category", categoryFilter);
      if (threatFilter) params.append("threatLevel", threatFilter);
      if (search) params.append("search", search);

      const [res, statsRes] = await Promise.all([
        fetch(`${API_BASE}/api/competitors?${params}`, { headers: getAuthHeaders() }),
        fetch(`${API_BASE}/api/competitors/stats`, { headers: getAuthHeaders() }),
      ]);

      if (res.ok) setCompetitors((await res.json()).competitors || []);
      if (statsRes.ok) setStats(await statsRes.json());
    } catch (error) {
      console.error(error);
      message.error("فشل في تحميل البيانات");
    } finally {
      setLoading(false);
    }
  };

  const loadCompetitorDetail = async (id: string) => {
    try {
      const res = await fetch(`${API_BASE}/api/competitors/${id}`, {
        headers: getAuthHeaders(),
      });
      if (res.ok) setSelectedCompetitor(await res.json());
    } catch (error) {
      console.error(error);
    }
  };

  const handleAdd = async (values: any) => {
    try {
      const res = await fetch(`${API_BASE}/api/competitors`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify(values),
      });

      if (res.ok) {
        message.success("تم إضافة المنافس بنجاح");
        setShowAddModal(false);
        form.resetFields();
        loadData();
      } else {
        message.error("فشل في إضافة المنافس");
      }
    } catch (error) {
      message.error("حدث خطأ");
    }
  };

  return (
    <div style={{ padding: 24 }}>
      <PageHeader
        title="تحليل المنافسين"
        subtitle="مراقبة وتحليل المنافسين في السوق"
        breadcrumbs={[{ title: "تحليل المنافسين" }]}
        extra={
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => setShowAddModal(true)}
          >
            إضافة منافس
          </Button>
        }
      />

      {/* الإحصائيات */}
      {stats && (
        <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
          <Col xs={12} sm={8} md={4}>
            <Card styles={{ body: { padding: 16, textAlign: "center" } }}>
              <Statistic
                title="إجمالي المنافسين"
                value={stats.total}
                valueStyle={{ color: "#1677ff" }}
              />
            </Card>
          </Col>
          <Col xs={12} sm={8} md={5}>
            <Card styles={{ body: { padding: 16, textAlign: "center" } }}>
              <Statistic
                title="مباشر"
                value={stats.byCategory?.direct || 0}
                valueStyle={{ color: "#dc2626" }}
              />
            </Card>
          </Col>
          <Col xs={12} sm={8} md={5}>
            <Card styles={{ body: { padding: 16, textAlign: "center" } }}>
              <Statistic
                title="غير مباشر"
                value={stats.byCategory?.indirect || 0}
                valueStyle={{ color: "#d97706" }}
              />
            </Card>
          </Col>
          <Col xs={12} sm={8} md={5}>
            <Card styles={{ body: { padding: 16, textAlign: "center" } }}>
              <Statistic
                title="تهديد عالي"
                value={stats.byThreatLevel?.high || 0}
                valueStyle={{ color: "#7c3aed" }}
              />
            </Card>
          </Col>
          <Col xs={12} sm={8} md={5}>
            <Card styles={{ body: { padding: 16, textAlign: "center" } }}>
              <Statistic
                title="تهديد منخفض"
                value={stats.byThreatLevel?.low || 0}
                valueStyle={{ color: "#059669" }}
              />
            </Card>
          </Col>
        </Row>
      )}

      {/* الفلاتر */}
      <Card style={{ marginBottom: 16 }}>
        <Row gutter={16}>
          <Col flex="1">
            <Input
              placeholder="بحث بالاسم..."
              prefix={<SearchOutlined style={{ color: "#bfbfbf" }} />}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              allowClear
            />
          </Col>
          <Col>
            <Select
              value={categoryFilter}
              onChange={setCategoryFilter}
              style={{ width: 140 }}
              placeholder="الفئة"
              allowClear
              options={[
                { value: "", label: "كل الفئات" },
                ...Object.entries(CATEGORY_CONFIG).map(([k, v]) => ({
                  value: k,
                  label: v.label,
                })),
              ]}
            />
          </Col>
          <Col>
            <Select
              value={threatFilter}
              onChange={setThreatFilter}
              style={{ width: 150 }}
              placeholder="مستوى التهديد"
              allowClear
              options={[
                { value: "", label: "مستوى التهديد" },
                ...Object.entries(THREAT_CONFIG).map(([k, v]) => ({
                  value: k,
                  label: v.label,
                })),
              ]}
            />
          </Col>
        </Row>
      </Card>

      <Row gutter={24}>
        {/* القائمة */}
        <Col xs={24} lg={selectedCompetitor ? 12 : 24}>
          {loading ? (
            <LoadingSkeleton type="list" rows={5} />
          ) : competitors.length === 0 ? (
            <Card>
              <Empty
                image={<AimOutlined style={{ fontSize: 64, color: "#d9d9d9" }} />}
                description="لا يوجد منافسين"
              >
                <Button
                  type="primary"
                  icon={<PlusOutlined />}
                  onClick={() => setShowAddModal(true)}
                >
                  إضافة منافس
                </Button>
              </Empty>
            </Card>
          ) : (
            <Space direction="vertical" size={12} style={{ width: "100%" }}>
              {competitors.map((comp) => {
                const category = CATEGORY_CONFIG[comp.category] || CATEGORY_CONFIG.direct;
                const threat = THREAT_CONFIG[comp.threatLevel] || THREAT_CONFIG.medium;

                return (
                  <Card
                    key={comp.id}
                    hoverable
                    onClick={() => loadCompetitorDetail(comp.id)}
                    style={{
                      borderColor:
                        selectedCompetitor?.id === comp.id ? "#1677ff" : undefined,
                      borderWidth: selectedCompetitor?.id === comp.id ? 2 : 1,
                    }}
                    styles={{ body: { padding: 16 } }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "flex-start",
                      }}
                    >
                      <div>
                        <Space align="center" style={{ marginBottom: 4 }}>
                          <Text strong style={{ fontSize: 15 }}>
                            {comp.name}
                          </Text>
                          <Tag color={category.color}>{category.label}</Tag>
                          <Tag color={threat.color}>{threat.label}</Tag>
                        </Space>
                        <div>
                          <Space size={16}>
                            {comp.city && (
                              <Text type="secondary" style={{ fontSize: 13 }}>
                                <EnvironmentOutlined /> {comp.city}
                              </Text>
                            )}
                            {comp.companySize && (
                              <Text type="secondary" style={{ fontSize: 13 }}>
                                <BankOutlined /> {SIZE_LABELS[comp.companySize]}
                              </Text>
                            )}
                            {comp.marketShare && (
                              <Text type="secondary" style={{ fontSize: 13 }}>
                                <PieChartOutlined /> {comp.marketShare}%
                              </Text>
                            )}
                          </Space>
                        </div>
                      </div>
                      <Rate disabled value={comp.rating} style={{ fontSize: 14 }} />
                    </div>
                  </Card>
                );
              })}
            </Space>
          )}
        </Col>

        {/* التفاصيل */}
        {selectedCompetitor && (
          <Col xs={24} lg={12}>
            <Card
              title={
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <div>
                    <Title level={5} style={{ margin: 0 }}>
                      {selectedCompetitor.name}
                    </Title>
                    {selectedCompetitor.website && (
                      <AntLink
                        href={selectedCompetitor.website}
                        target="_blank"
                        style={{ fontSize: 13 }}
                      >
                        <GlobalOutlined /> {selectedCompetitor.website}
                      </AntLink>
                    )}
                  </div>
                  <Button
                    type="text"
                    icon={<CloseOutlined />}
                    onClick={() => setSelectedCompetitor(null)}
                  />
                </div>
              }
            >
              {selectedCompetitor.description && (
                <Text type="secondary" style={{ display: "block", marginBottom: 16 }}>
                  {selectedCompetitor.description}
                </Text>
              )}

              {/* SWOT */}
              <Row gutter={12} style={{ marginBottom: 16 }}>
                {selectedCompetitor.strengths?.length > 0 && (
                  <Col span={12}>
                    <Card
                      size="small"
                      styles={{
                        body: { background: "#f6ffed", borderRadius: 8 },
                      }}
                    >
                      <Text strong style={{ color: "#52c41a", display: "block", marginBottom: 8 }}>
                        نقاط القوة
                      </Text>
                      <ul style={{ margin: 0, paddingRight: 16, fontSize: 13 }}>
                        {selectedCompetitor.strengths.map((s: string, i: number) => (
                          <li key={i}>{s}</li>
                        ))}
                      </ul>
                    </Card>
                  </Col>
                )}
                {selectedCompetitor.weaknesses?.length > 0 && (
                  <Col span={12}>
                    <Card
                      size="small"
                      styles={{
                        body: { background: "#fff2f0", borderRadius: 8 },
                      }}
                    >
                      <Text strong style={{ color: "#ff4d4f", display: "block", marginBottom: 8 }}>
                        نقاط الضعف
                      </Text>
                      <ul style={{ margin: 0, paddingRight: 16, fontSize: 13 }}>
                        {selectedCompetitor.weaknesses.map((w: string, i: number) => (
                          <li key={i}>{w}</li>
                        ))}
                      </ul>
                    </Card>
                  </Col>
                )}
              </Row>

              {/* المنتجات */}
              {selectedCompetitor.products?.length > 0 && (
                <div style={{ marginBottom: 16 }}>
                  <Title level={5} style={{ marginBottom: 12 }}>
                    المنتجات ({selectedCompetitor.products.length})
                  </Title>
                  <List
                    size="small"
                    dataSource={selectedCompetitor.products.slice(0, 5)}
                    renderItem={(p: any) => (
                      <List.Item
                        extra={
                          p.price && (
                            <Text strong style={{ color: "#1677ff" }}>
                              {Number(p.price).toLocaleString()} IQD
                            </Text>
                          )
                        }
                      >
                        {p.name}
                      </List.Item>
                    )}
                  />
                </div>
              )}

              {/* آخر الأنشطة */}
              {selectedCompetitor.activities?.length > 0 && (
                <div>
                  <Title level={5} style={{ marginBottom: 12 }}>
                    آخر الأنشطة
                  </Title>
                  <List
                    size="small"
                    dataSource={selectedCompetitor.activities.slice(0, 5)}
                    renderItem={(a: any) => (
                      <List.Item>
                        <List.Item.Meta
                          title={a.title}
                          description={<DateDisplay date={a.createdAt} />}
                        />
                      </List.Item>
                    )}
                  />
                </div>
              )}
            </Card>
          </Col>
        )}
      </Row>

      {/* موديل إضافة */}
      <Modal
        title="إضافة منافس"
        open={showAddModal}
        onCancel={() => setShowAddModal(false)}
        footer={null}
        width={500}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleAdd}
          initialValues={{ category: "direct", threatLevel: "medium" }}
        >
          <Form.Item
            name="name"
            label="اسم المنافس"
            rules={[{ required: true, message: "اسم المنافس مطلوب" }]}
          >
            <Input placeholder="اسم المنافس" />
          </Form.Item>

          <Form.Item name="website" label="الموقع الإلكتروني">
            <Input placeholder="https://example.com" type="url" />
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="category" label="الفئة">
                <Select
                  options={Object.entries(CATEGORY_CONFIG).map(([k, v]) => ({
                    value: k,
                    label: v.label,
                  }))}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="threatLevel" label="مستوى التهديد">
                <Select
                  options={Object.entries(THREAT_CONFIG).map(([k, v]) => ({
                    value: k,
                    label: v.label,
                  }))}
                />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="city" label="المدينة">
            <Input placeholder="المدينة" />
          </Form.Item>

          <Form.Item name="notes" label="ملاحظات">
            <Input.TextArea rows={2} placeholder="ملاحظات إضافية" />
          </Form.Item>

          <div style={{ display: "flex", gap: 12, justifyContent: "flex-end" }}>
            <Button onClick={() => setShowAddModal(false)}>إلغاء</Button>
            <Button type="primary" htmlType="submit">
              حفظ
            </Button>
          </div>
        </Form>
      </Modal>
    </div>
  );
}
