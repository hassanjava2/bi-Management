/**
 * صفحة تفاصيل العرض الترويجي
 */
import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Row, Col, Card, Descriptions, Tag, Space, Button, Statistic, Table, Empty, message, Popconfirm } from "antd";
import {
  ArrowLeftOutlined,
  CopyOutlined,
  PauseCircleOutlined,
  PlayCircleOutlined,
  DeleteOutlined,
  ThunderboltOutlined,
  ClockCircleOutlined,
  EditOutlined,
} from "@ant-design/icons";
import { PageHeader, DateDisplay, LoadingSkeleton, MoneyDisplay } from "../components/shared";
import { API_BASE, getAuthHeaders } from "../utils/api";

interface Promotion {
  id: string;
  code: string | null;
  name: string;
  description: string | null;
  type: string;
  discountValue: string | null;
  maxDiscountAmount: string | null;
  minimumOrderAmount: string | null;
  minimumQuantity: number | null;
  buyQuantity: number | null;
  getQuantity: number | null;
  appliesTo: string;
  startDate: string;
  endDate: string;
  status: string;
  isAutomatic: boolean;
  stackable: boolean;
  currentUsageCount: number;
  usageLimit: number | null;
  usageLimitPerCustomer: number | null;
  priority: number;
  badgeText: string | null;
  badgeColor: string | null;
  createdAt: string;
  usageHistory: Array<{
    id: string;
    discountAmount: string;
    orderAmount: string;
    invoiceNumber: string;
    createdAt: string;
    customer?: { fullName: string } | null;
  }>;
}

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  draft: { label: "مسودة", color: "default" },
  active: { label: "نشط", color: "green" },
  paused: { label: "متوقف", color: "orange" },
  expired: { label: "منتهي", color: "default" },
  cancelled: { label: "ملغي", color: "red" },
};

const TYPE_LABELS: Record<string, string> = {
  percentage: "خصم نسبة مئوية",
  fixed_amount: "خصم مبلغ ثابت",
  buy_x_get_y: "اشتري واحصل",
  bundle: "باقة",
  free_shipping: "شحن مجاني",
};

export default function PromotionDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [promo, setPromo] = useState<Promotion | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPromotion();
  }, [id]);

  const loadPromotion = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/promotions/${id}`, { headers: getAuthHeaders() });
      if (res.ok) setPromo(await res.json());
    } catch (error) {
      console.error(error);
      message.error("فشل تحميل بيانات العرض");
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (status: string) => {
    try {
      await fetch(`${API_BASE}/api/promotions/${id}`, {
        method: "PATCH",
        headers: getAuthHeaders(),
        body: JSON.stringify({ status }),
      });
      message.success("تم تحديث الحالة");
      loadPromotion();
    } catch (error) {
      console.error(error);
      message.error("فشل تحديث الحالة");
    }
  };

  const deletePromotion = async () => {
    try {
      await fetch(`${API_BASE}/api/promotions/${id}`, { method: "DELETE", headers: getAuthHeaders() });
      message.success("تم حذف العرض");
      navigate("/promotions");
    } catch (error) {
      console.error(error);
      message.error("فشل حذف العرض");
    }
  };

  const copyCode = () => {
    if (promo?.code) {
      navigator.clipboard.writeText(promo.code);
      message.success("تم نسخ الكود");
    }
  };

  if (loading) {
    return <LoadingSkeleton type="form" rows={6} />;
  }

  if (!promo) {
    return (
      <Card>
        <Empty description="العرض غير موجود">
          <Button type="primary" onClick={() => navigate("/promotions")}>
            العودة للعروض
          </Button>
        </Empty>
      </Card>
    );
  }

  const statusCfg = STATUS_CONFIG[promo.status] || STATUS_CONFIG.draft;
  const isExpired = new Date(promo.endDate) < new Date();
  const isUpcoming = new Date(promo.startDate) > new Date();
  const totalDiscount = promo.usageHistory.reduce((sum, u) => sum + parseFloat(u.discountAmount || "0"), 0);

  const usageColumns = [
    {
      title: "العميل",
      dataIndex: ["customer", "fullName"],
      key: "customer",
      render: (name: string) => name || "زائر",
    },
    {
      title: "الفاتورة",
      dataIndex: "invoiceNumber",
      key: "invoiceNumber",
      render: (num: string) => num || "-",
    },
    {
      title: "قيمة الطلب",
      dataIndex: "orderAmount",
      key: "orderAmount",
      render: (amount: string) => <MoneyDisplay amount={Number(amount || 0)} />,
    },
    {
      title: "الخصم",
      dataIndex: "discountAmount",
      key: "discountAmount",
      render: (amount: string) => (
        <span style={{ color: "#dc2626", fontWeight: 600 }}>
          -<MoneyDisplay amount={Number(amount)} />
        </span>
      ),
    },
    {
      title: "التاريخ",
      dataIndex: "createdAt",
      key: "createdAt",
      render: (date: string) => <DateDisplay date={date} />,
    },
  ];

  return (
    <div>
      <PageHeader
        title={promo.name}
        subtitle={promo.description || undefined}
        breadcrumbs={[
          { title: "العروض الترويجية", href: "/promotions" },
          { title: "تفاصيل العرض" },
        ]}
        extra={
          <Space>
            <Button icon={<ArrowLeftOutlined />} onClick={() => navigate("/promotions")}>
              العودة
            </Button>
            <Button icon={<EditOutlined />} onClick={() => navigate(`/promotions/${id}/edit`)}>
              تعديل
            </Button>
            {promo.status === "active" ? (
              <Button icon={<PauseCircleOutlined />} onClick={() => updateStatus("paused")}>
                إيقاف
              </Button>
            ) : (promo.status === "paused" || promo.status === "draft") ? (
              <Button type="primary" icon={<PlayCircleOutlined />} onClick={() => updateStatus("active")}>
                تفعيل
              </Button>
            ) : null}
            <Popconfirm
              title="تأكيد الحذف"
              description="هل أنت متأكد من حذف هذا العرض؟"
              onConfirm={deletePromotion}
              okText="نعم، حذف"
              cancelText="إلغاء"
              okButtonProps={{ danger: true }}
            >
              <Button danger icon={<DeleteOutlined />}>
                حذف
              </Button>
            </Popconfirm>
          </Space>
        }
      />

      {/* Header Card */}
      <Card style={{ marginBottom: 24 }}>
        <Row gutter={[24, 16]} align="middle">
          <Col flex="auto">
            <Space direction="vertical" size={8}>
              <Space wrap>
                <Tag color={statusCfg.color} style={{ fontSize: 14, padding: "4px 12px" }}>
                  {statusCfg.label}
                </Tag>
                {promo.isAutomatic && (
                  <Tag icon={<ThunderboltOutlined />} color="blue">
                    تلقائي
                  </Tag>
                )}
                {isExpired && promo.status === "active" && (
                  <Tag color="red">منتهي</Tag>
                )}
                {isUpcoming && (
                  <Tag icon={<ClockCircleOutlined />} color="orange">
                    لم يبدأ
                  </Tag>
                )}
              </Space>
              {promo.code && (
                <Space>
                  <Tag
                    style={{
                      fontFamily: "monospace",
                      fontSize: 16,
                      padding: "6px 12px",
                      background: "#f3f4f6",
                    }}
                  >
                    {promo.code}
                  </Tag>
                  <Button size="small" icon={<CopyOutlined />} onClick={copyCode}>
                    نسخ
                  </Button>
                </Space>
              )}
            </Space>
          </Col>
        </Row>
      </Card>

      {/* Stats */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={12} sm={6}>
          <Card>
            <Statistic
              title={promo.usageLimit ? `استخدام من ${promo.usageLimit}` : "استخدام"}
              value={promo.currentUsageCount}
              valueStyle={{ color: "#2563eb" }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card>
            <Statistic
              title="إجمالي الخصومات"
              value={totalDiscount}
              suffix="د.ع"
              valueStyle={{ color: "#dc2626" }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card>
            <Statistic
              title="تاريخ البداية"
              value={new Date(promo.startDate).toLocaleDateString("ar-IQ")}
              valueStyle={{ fontSize: 16 }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card>
            <Statistic
              title="تاريخ الانتهاء"
              value={new Date(promo.endDate).toLocaleDateString("ar-IQ")}
              valueStyle={{ fontSize: 16 }}
            />
          </Card>
        </Col>
      </Row>

      {/* Details */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} md={12}>
          <Card title="تفاصيل الخصم">
            <Descriptions column={1} size="small">
              <Descriptions.Item label="نوع العرض">
                {TYPE_LABELS[promo.type] || promo.type}
              </Descriptions.Item>
              {promo.discountValue && (
                <Descriptions.Item label="قيمة الخصم">
                  {promo.type === "percentage" ? `${promo.discountValue}%` : <MoneyDisplay amount={Number(promo.discountValue)} />}
                </Descriptions.Item>
              )}
              {promo.maxDiscountAmount && (
                <Descriptions.Item label="حد أقصى للخصم">
                  <MoneyDisplay amount={Number(promo.maxDiscountAmount)} />
                </Descriptions.Item>
              )}
              {promo.minimumOrderAmount && (
                <Descriptions.Item label="الحد الأدنى للطلب">
                  <MoneyDisplay amount={Number(promo.minimumOrderAmount)} />
                </Descriptions.Item>
              )}
              {promo.type === "buy_x_get_y" && (
                <Descriptions.Item label="اشتري واحصل">
                  اشتري {promo.buyQuantity} واحصل {promo.getQuantity} مجاناً
                </Descriptions.Item>
              )}
            </Descriptions>
          </Card>
        </Col>
        <Col xs={24} md={12}>
          <Card title="الإعدادات">
            <Descriptions column={1} size="small">
              <Descriptions.Item label="التطبيق على">
                {promo.appliesTo === "all"
                  ? "كل المنتجات"
                  : promo.appliesTo === "specific_products"
                  ? "منتجات محددة"
                  : promo.appliesTo === "specific_categories"
                  ? "فئات محددة"
                  : promo.appliesTo}
              </Descriptions.Item>
              <Descriptions.Item label="تطبيق تلقائي">
                {promo.isAutomatic ? (
                  <Tag color="green">نعم</Tag>
                ) : (
                  <Tag color="default">لا</Tag>
                )}
              </Descriptions.Item>
              <Descriptions.Item label="قابل للدمج">
                {promo.stackable ? (
                  <Tag color="green">نعم</Tag>
                ) : (
                  <Tag color="default">لا</Tag>
                )}
              </Descriptions.Item>
              <Descriptions.Item label="الأولوية">{promo.priority}</Descriptions.Item>
              {promo.usageLimitPerCustomer && (
                <Descriptions.Item label="حد لكل عميل">
                  {promo.usageLimitPerCustomer} مرة
                </Descriptions.Item>
              )}
            </Descriptions>
          </Card>
        </Col>
      </Row>

      {/* Usage History */}
      <Card title={`سجل الاستخدام (${promo.usageHistory.length})`}>
        {promo.usageHistory.length === 0 ? (
          <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="لم يتم استخدام هذا العرض بعد" />
        ) : (
          <Table
            columns={usageColumns}
            dataSource={promo.usageHistory}
            rowKey="id"
            pagination={{ pageSize: 10 }}
            size="small"
          />
        )}
      </Card>
    </div>
  );
}
