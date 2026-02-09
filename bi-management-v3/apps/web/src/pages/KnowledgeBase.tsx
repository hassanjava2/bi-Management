/**
 * قاعدة المعرفة
 */
import { useState, useEffect } from "react";
import { Row, Col, Card, Button, Select, Tag, Space, message, Statistic, Modal, Input, Form, Empty, List, Tooltip } from "antd";
import { PlusOutlined, BookOutlined, FileTextOutlined, QuestionCircleOutlined, ReadOutlined, FileProtectOutlined, OrderedListOutlined, EyeOutlined, LikeOutlined, DislikeOutlined, StarOutlined, SendOutlined, InboxOutlined, FolderOutlined } from "@ant-design/icons";
import { PageHeader, DateDisplay, LoadingSkeleton } from "../components/shared";
import { API_BASE, getAuthHeaders } from "../utils/api";

interface Article {
  id: string;
  articleNumber: string;
  title: string;
  summary: string | null;
  categoryId: string | null;
  articleType: string;
  status: string;
  viewCount: number;
  helpfulCount: number;
  isFeatured: boolean;
  createdAt: string;
}

interface Category {
  id: string;
  name: string;
  slug: string;
  icon: string | null;
}

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  draft: { label: "مسودة", color: "default" },
  review: { label: "قيد المراجعة", color: "warning" },
  published: { label: "منشور", color: "success" },
  archived: { label: "مؤرشف", color: "default" },
};

const TYPE_CONFIG: Record<string, { label: string; icon: React.ReactNode }> = {
  article: { label: "مقالة", icon: <FileTextOutlined /> },
  faq: { label: "سؤال شائع", icon: <QuestionCircleOutlined /> },
  guide: { label: "دليل", icon: <ReadOutlined /> },
  policy: { label: "سياسة", icon: <FileProtectOutlined /> },
  procedure: { label: "إجراء", icon: <OrderedListOutlined /> },
};

export default function KnowledgeBase() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({ status: "", categoryId: "", search: "" });
  const [showModal, setShowModal] = useState(false);
  const [form] = Form.useForm();

  useEffect(() => { loadData(); }, [filter]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [statsRes, catsRes] = await Promise.all([
        fetch(`${API_BASE}/api/knowledge/stats`, { headers: getAuthHeaders() }),
        fetch(`${API_BASE}/api/knowledge/categories`, { headers: getAuthHeaders() }),
      ]);
      if (statsRes.ok) setStats(await statsRes.json());
      if (catsRes.ok) setCategories(await catsRes.json());

      const params = new URLSearchParams();
      if (filter.status) params.append("status", filter.status);
      if (filter.categoryId) params.append("categoryId", filter.categoryId);
      if (filter.search) params.append("search", filter.search);
      
      const res = await fetch(`${API_BASE}/api/knowledge/articles?${params}`, { headers: getAuthHeaders() });
      if (res.ok) setArticles(await res.json());
    } catch (error) { console.error(error); }
    finally { setLoading(false); }
  };

  const handleCreate = async (values: any) => {
    try {
      const res = await fetch(`${API_BASE}/api/knowledge/articles`, {
        method: "POST",
        headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({
          title: values.title,
          summary: values.summary,
          content: values.content,
          articleType: values.articleType,
          categoryId: values.categoryId || null,
          authorId: "current_user",
        }),
      });
      if (res.ok) {
        message.success("تم إنشاء المقالة بنجاح");
        setShowModal(false);
        form.resetFields();
        loadData();
      } else {
        message.error("فشل في إنشاء المقالة");
      }
    } catch (error) {
      console.error(error);
      message.error("حدث خطأ أثناء إنشاء المقالة");
    }
  };

  const publishArticle = async (id: string) => {
    try {
      await fetch(`${API_BASE}/api/knowledge/articles/${id}/publish`, {
        method: "PATCH",
        headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ reviewerId: "current_user" }),
      });
      message.success("تم نشر المقالة");
      loadData();
    } catch (error) {
      console.error(error);
      message.error("فشل في نشر المقالة");
    }
  };

  const archiveArticle = async (id: string) => {
    try {
      await fetch(`${API_BASE}/api/knowledge/articles/${id}/archive`, { method: "PATCH", headers: getAuthHeaders() });
      message.success("تم أرشفة المقالة");
      loadData();
    } catch (error) {
      console.error(error);
      message.error("فشل في أرشفة المقالة");
    }
  };

  const rateArticle = async (id: string, isHelpful: boolean) => {
    try {
      await fetch(`${API_BASE}/api/knowledge/articles/${id}/rate`, {
        method: "POST",
        headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ isHelpful }),
      });
      message.success(isHelpful ? "شكراً لتقييمك الإيجابي" : "شكراً لملاحظاتك");
      loadData();
    } catch (error) {
      console.error(error);
      message.error("فشل في تسجيل التقييم");
    }
  };

  if (loading && !stats) {
    return <LoadingSkeleton />;
  }

  return (
    <div>
      <PageHeader
        title="قاعدة المعرفة"
        subtitle="المقالات والأدلة والأسئلة الشائعة"
        breadcrumbs={[
          { label: "الرئيسية", href: "/" },
          { label: "قاعدة المعرفة" },
        ]}
        icon={<BookOutlined />}
        extra={
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setShowModal(true)}>
            مقالة جديدة
          </Button>
        }
      />

      {/* الإحصائيات */}
      {stats && (
        <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
          <Col xs={12} sm={8} md={4}>
            <Card size="small">
              <Statistic
                title="إجمالي المقالات"
                value={stats.totalArticles}
                prefix={<FileTextOutlined />}
              />
            </Card>
          </Col>
          <Col xs={12} sm={8} md={4}>
            <Card size="small">
              <Statistic
                title="منشورة"
                value={stats.publishedArticles}
                valueStyle={{ color: "#059669" }}
              />
            </Card>
          </Col>
          <Col xs={12} sm={8} md={4}>
            <Card size="small">
              <Statistic
                title="مسودات"
                value={stats.draftArticles}
                valueStyle={{ color: "#6b7280" }}
              />
            </Card>
          </Col>
          <Col xs={12} sm={8} md={4}>
            <Card size="small">
              <Statistic
                title="قيد المراجعة"
                value={stats.reviewArticles}
                valueStyle={{ color: "#d97706" }}
              />
            </Card>
          </Col>
          <Col xs={12} sm={8} md={4}>
            <Card size="small">
              <Statistic
                title="الفئات"
                value={stats.totalCategories}
                prefix={<FolderOutlined />}
                valueStyle={{ color: "#2563eb" }}
              />
            </Card>
          </Col>
          <Col xs={12} sm={8} md={4}>
            <Card size="small">
              <Statistic
                title="أسئلة شائعة"
                value={stats.totalFaqs}
                prefix={<QuestionCircleOutlined />}
                valueStyle={{ color: "#7c3aed" }}
              />
            </Card>
          </Col>
        </Row>
      )}

      {/* الفلاتر */}
      <Space style={{ marginBottom: 16 }} wrap>
        <Input.Search
          placeholder="بحث..."
          value={filter.search}
          onChange={(e) => setFilter({ ...filter, search: e.target.value })}
          style={{ width: 250 }}
          allowClear
        />
        <Select
          value={filter.status}
          onChange={(value) => setFilter({ ...filter, status: value })}
          style={{ width: 150 }}
          placeholder="كل الحالات"
          allowClear
        >
          {Object.entries(STATUS_CONFIG).map(([k, v]) => (
            <Select.Option key={k} value={k}>{v.label}</Select.Option>
          ))}
        </Select>
        <Select
          value={filter.categoryId}
          onChange={(value) => setFilter({ ...filter, categoryId: value })}
          style={{ width: 150 }}
          placeholder="كل الفئات"
          allowClear
        >
          {categories.map(cat => (
            <Select.Option key={cat.id} value={cat.id}>{cat.icon || "📁"} {cat.name}</Select.Option>
          ))}
        </Select>
      </Space>

      {/* المحتوى */}
      {loading ? (
        <LoadingSkeleton />
      ) : articles.length === 0 ? (
        <Card>
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description="لا توجد مقالات"
          >
            <Button type="primary" icon={<PlusOutlined />} onClick={() => setShowModal(true)}>
              إنشاء مقالة جديدة
            </Button>
          </Empty>
        </Card>
      ) : (
        <List
          grid={{ gutter: 0, column: 1 }}
          dataSource={articles}
          renderItem={(article) => {
            const status = STATUS_CONFIG[article.status] || STATUS_CONFIG.draft;
            const type = TYPE_CONFIG[article.articleType] || TYPE_CONFIG.article;
            return (
              <List.Item style={{ marginBottom: 12 }}>
                <Card size="small">
                  <Row justify="space-between" align="top">
                    <Col flex={1}>
                      <Space style={{ marginBottom: 4 }} wrap>
                        <span style={{ fontSize: 18 }}>{type.icon}</span>
                        <Tag style={{ fontFamily: "monospace", fontSize: 11 }}>{article.articleNumber}</Tag>
                        <Tag color={status.color}>{status.label}</Tag>
                        {article.isFeatured && (
                          <Tag icon={<StarOutlined />} color="gold">مميز</Tag>
                        )}
                      </Space>
                      <h3 style={{ fontWeight: 600, margin: "4px 0" }}>{article.title}</h3>
                      {article.summary && (
                        <p style={{ fontSize: 13, color: "#6b7280", margin: 0 }}>{article.summary}</p>
                      )}
                      <Space style={{ marginTop: 8 }} size={16}>
                        <Tooltip title="المشاهدات">
                          <span style={{ fontSize: 12, color: "#9ca3af" }}>
                            <EyeOutlined /> {article.viewCount || 0}
                          </span>
                        </Tooltip>
                        <Tooltip title="التقييمات الإيجابية">
                          <span style={{ fontSize: 12, color: "#9ca3af" }}>
                            <LikeOutlined /> {article.helpfulCount || 0}
                          </span>
                        </Tooltip>
                        <span style={{ fontSize: 12, color: "#9ca3af" }}>
                          <DateDisplay date={article.createdAt} />
                        </span>
                      </Space>
                    </Col>
                    <Col>
                      <Space direction="vertical" size={4}>
                        {(article.status === "draft" || article.status === "review") && (
                          <Button
                            type="primary"
                            ghost
                            size="small"
                            icon={<SendOutlined />}
                            onClick={() => publishArticle(article.id)}
                          >
                            نشر
                          </Button>
                        )}
                        {article.status === "published" && (
                          <>
                            <Space>
                              <Tooltip title="مفيد">
                                <Button
                                  type="text"
                                  size="small"
                                  icon={<LikeOutlined />}
                                  onClick={() => rateArticle(article.id, true)}
                                  style={{ color: "#059669" }}
                                />
                              </Tooltip>
                              <Tooltip title="غير مفيد">
                                <Button
                                  type="text"
                                  size="small"
                                  icon={<DislikeOutlined />}
                                  onClick={() => rateArticle(article.id, false)}
                                  style={{ color: "#dc2626" }}
                                />
                              </Tooltip>
                            </Space>
                            <Button
                              size="small"
                              icon={<InboxOutlined />}
                              onClick={() => archiveArticle(article.id)}
                            >
                              أرشفة
                            </Button>
                          </>
                        )}
                      </Space>
                    </Col>
                  </Row>
                </Card>
              </List.Item>
            );
          }}
        />
      )}

      {/* موديل إضافة مقالة */}
      <Modal
        title={<Space><FileTextOutlined /> مقالة جديدة</Space>}
        open={showModal}
        onCancel={() => setShowModal(false)}
        footer={null}
        width={600}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleCreate}
          initialValues={{ articleType: "article" }}
        >
          <Form.Item
            name="title"
            label="العنوان"
            rules={[{ required: true, message: "يرجى إدخال العنوان" }]}
          >
            <Input />
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="articleType" label="النوع">
                <Select>
                  {Object.entries(TYPE_CONFIG).map(([k, v]) => (
                    <Select.Option key={k} value={k}>
                      <Space>{v.icon} {v.label}</Space>
                    </Select.Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="categoryId" label="الفئة">
                <Select placeholder="بدون فئة" allowClear>
                  {categories.map(cat => (
                    <Select.Option key={cat.id} value={cat.id}>{cat.name}</Select.Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="summary" label="الملخص">
            <Input.TextArea rows={2} />
          </Form.Item>

          <Form.Item
            name="content"
            label="المحتوى"
            rules={[{ required: true, message: "يرجى إدخال المحتوى" }]}
          >
            <Input.TextArea rows={8} />
          </Form.Item>

          <Form.Item style={{ marginBottom: 0, textAlign: "left" }}>
            <Space>
              <Button onClick={() => setShowModal(false)}>إلغاء</Button>
              <Button type="primary" htmlType="submit">إنشاء</Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
