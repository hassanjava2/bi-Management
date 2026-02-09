/**
 * صفحة مركز التقييمات والمراجعات
 */
import { useState, useEffect } from "react";
import { Row, Col, Card, Button, Input, Select, Tag, Space, message, Statistic, Empty, List, Rate, Popconfirm } from "antd";
import { StarOutlined, SearchOutlined, CheckOutlined, CloseOutlined, MessageOutlined, DeleteOutlined, SafetyCertificateOutlined, LikeOutlined } from "@ant-design/icons";
import { PageHeader, DateDisplay, LoadingSkeleton } from "../components/shared";
import { API_BASE, getAuthHeaders } from "../utils/api";

interface Review {
  id: string;
  entityType: string;
  entityId: string;
  entityName: string | null;
  customerName: string;
  rating: number;
  title: string | null;
  content: string | null;
  status: string;
  isVerifiedPurchase: boolean;
  helpfulCount: number;
  replyContent: string | null;
  createdAt: string;
}

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  pending: { label: "بانتظار المراجعة", color: "orange" },
  approved: { label: "معتمد", color: "success" },
  rejected: { label: "مرفوض", color: "error" },
  flagged: { label: "مُبلغ عنه", color: "purple" },
};

const ENTITY_TYPES: Record<string, string> = {
  product: "منتج",
  service: "خدمة",
  employee: "موظف",
  branch: "فرع",
};

export default function ReviewsCenter() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("pending");
  const [ratingFilter, setRatingFilter] = useState("");
  const [search, setSearch] = useState("");

  useEffect(() => { loadData(); }, [statusFilter, ratingFilter, search]);

  const loadData = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter) params.append("status", statusFilter);
      if (ratingFilter) params.append("rating", ratingFilter);
      if (search) params.append("search", search);

      const [res, statsRes] = await Promise.all([
        fetch(`${API_BASE}/api/reviews?${params}`, { headers: getAuthHeaders() }),
        fetch(`${API_BASE}/api/reviews/stats/overview`, { headers: getAuthHeaders() }),
      ]);
      if (res.ok) setReviews((await res.json()).reviews || []);
      if (statsRes.ok) setStats(await statsRes.json());
    } catch (error) {
      console.error(error);
      message.error("حدث خطأ في تحميل البيانات");
    }
    finally { setLoading(false); }
  };

  const moderate = async (id: string, status: string) => {
    try {
      await fetch(`${API_BASE}/api/reviews/${id}/moderate`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({ status }),
      });
      message.success(status === "approved" ? "تم اعتماد التقييم" : "تم رفض التقييم");
      loadData();
    } catch (error) {
      console.error(error);
      message.error("فشل في تحديث الحالة");
    }
  };

  const reply = async (id: string) => {
    const content = prompt("اكتب ردك:");
    if (!content) return;
    try {
      await fetch(`${API_BASE}/api/reviews/${id}/reply`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({ content }),
      });
      message.success("تم إرسال الرد");
      loadData();
    } catch (error) {
      console.error(error);
      message.error("فشل في إرسال الرد");
    }
  };

  const deleteReview = async (id: string) => {
    try {
      await fetch(`${API_BASE}/api/reviews/${id}`, { method: "DELETE", headers: getAuthHeaders() });
      message.success("تم حذف التقييم");
      loadData();
    } catch (error) {
      console.error(error);
      message.error("فشل في حذف التقييم");
    }
  };

  return (
    <div>
      <PageHeader
        title="التقييمات والمراجعات"
        subtitle="إدارة ومراجعة تقييمات العملاء على المنتجات والخدمات"
        icon={<StarOutlined />}
        breadcrumbs={[
          { label: "الرئيسية", path: "/" },
          { label: "التقييمات والمراجعات" },
        ]}
      />

      {/* الإحصائيات */}
      {stats && (
        <Row gutter={[12, 12]} style={{ marginBottom: 24 }}>
          <Col span={12} md={4}>
            <Card style={{ background: "#fef3c7", border: "none" }}>
              <Statistic
                title={<span style={{ color: "#92400e" }}>بانتظار المراجعة</span>}
                value={stats.byStatus?.pending || 0}
                valueStyle={{ color: "#d97706" }}
              />
            </Card>
          </Col>
          <Col span={12} md={4}>
            <Card style={{ background: "#d1fae5", border: "none" }}>
              <Statistic
                title={<span style={{ color: "#047857" }}>معتمدة</span>}
                value={stats.byStatus?.approved || 0}
                valueStyle={{ color: "#059669" }}
              />
            </Card>
          </Col>
          <Col span={12} md={4}>
            <Card style={{ background: "#dbeafe", border: "none" }}>
              <Statistic
                title={<span style={{ color: "#1e40af" }}>متوسط التقييم</span>}
                value={parseFloat(stats.averageRating || 0).toFixed(1)}
                valueStyle={{ color: "#2563eb" }}
                prefix={<StarOutlined />}
              />
            </Card>
          </Col>
          {[5, 4, 3].map(r => (
            <Col span={8} md={4} key={r}>
              <Card>
                <Statistic
                  title={<Rate disabled defaultValue={r} style={{ fontSize: 12 }} />}
                  value={stats.byRating?.[r] || 0}
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
            placeholder="بحث بالمحتوى أو اسم العميل..."
            prefix={<SearchOutlined />}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ width: 280 }}
            allowClear
          />
          <Select
            placeholder="كل الحالات"
            value={statusFilter || undefined}
            onChange={(val) => setStatusFilter(val || "")}
            style={{ width: 160 }}
            allowClear
          >
            <Select.Option value="pending">بانتظار المراجعة</Select.Option>
            <Select.Option value="approved">معتمدة</Select.Option>
            <Select.Option value="rejected">مرفوضة</Select.Option>
            <Select.Option value="flagged">مُبلغ عنها</Select.Option>
          </Select>
          <Select
            placeholder="كل التقييمات"
            value={ratingFilter || undefined}
            onChange={(val) => setRatingFilter(val || "")}
            style={{ width: 140 }}
            allowClear
          >
            {[5, 4, 3, 2, 1].map(r => (
              <Select.Option key={r} value={String(r)}>
                <Rate disabled defaultValue={r} style={{ fontSize: 12 }} />
              </Select.Option>
            ))}
          </Select>
        </Space>
      </Card>

      {/* القائمة */}
      {loading ? (
        <LoadingSkeleton type="list" />
      ) : reviews.length === 0 ? (
        <Card>
          <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="لا توجد تقييمات" />
        </Card>
      ) : (
        <List
          dataSource={reviews}
          renderItem={(review) => {
            const status = STATUS_CONFIG[review.status] || STATUS_CONFIG.pending;
            return (
              <Card style={{ marginBottom: 12 }} size="small">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                  <div>
                    <Space style={{ marginBottom: 8 }} wrap>
                      <Rate disabled value={review.rating} style={{ fontSize: 16 }} />
                      <span style={{ fontWeight: 600 }}>{review.customerName}</span>
                      {review.isVerifiedPurchase && (
                        <Tag icon={<SafetyCertificateOutlined />} color="success">مشترٍ حقيقي</Tag>
                      )}
                      <Tag color={status.color}>{status.label}</Tag>
                    </Space>
                    <div style={{ fontSize: "0.85rem", color: "#6b7280" }}>
                      <span>{ENTITY_TYPES[review.entityType] || review.entityType}: </span>
                      <span style={{ fontWeight: 500 }}>{review.entityName || review.entityId}</span>
                      <span style={{ marginRight: 16 }}>• <DateDisplay date={review.createdAt} format="date" /></span>
                    </div>
                  </div>
                  <Space>
                    {review.status === "pending" && (
                      <>
                        <Button
                          type="primary"
                          size="small"
                          icon={<CheckOutlined />}
                          style={{ background: "#059669" }}
                          onClick={() => moderate(review.id, "approved")}
                        >
                          اعتماد
                        </Button>
                        <Button
                          danger
                          size="small"
                          icon={<CloseOutlined />}
                          onClick={() => moderate(review.id, "rejected")}
                        >
                          رفض
                        </Button>
                      </>
                    )}
                    {!review.replyContent && (
                      <Button
                        type="default"
                        size="small"
                        icon={<MessageOutlined />}
                        onClick={() => reply(review.id)}
                      >
                        رد
                      </Button>
                    )}
                    <Popconfirm
                      title="هل أنت متأكد من حذف هذا التقييم؟"
                      onConfirm={() => deleteReview(review.id)}
                      okText="نعم"
                      cancelText="لا"
                    >
                      <Button size="small" icon={<DeleteOutlined />} />
                    </Popconfirm>
                  </Space>
                </div>

                {review.title && <div style={{ fontWeight: 600, marginBottom: 4 }}>{review.title}</div>}
                {review.content && <div style={{ color: "#374151", marginBottom: 8 }}>{review.content}</div>}

                {review.helpfulCount > 0 && (
                  <div style={{ fontSize: "0.8rem", color: "#6b7280" }}>
                    <LikeOutlined /> {review.helpfulCount} أشخاص وجدوا هذا مفيداً
                  </div>
                )}

                {review.replyContent && (
                  <div style={{ marginTop: 12, padding: 12, background: "#f9fafb", borderRadius: 8, borderRight: "3px solid #3b82f6" }}>
                    <div style={{ fontSize: "0.75rem", color: "#6b7280", marginBottom: 4 }}>رد الإدارة:</div>
                    <div style={{ fontSize: "0.9rem" }}>{review.replyContent}</div>
                  </div>
                )}
              </Card>
            );
          }}
        />
      )}
    </div>
  );
}
