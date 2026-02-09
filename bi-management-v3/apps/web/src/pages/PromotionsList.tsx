/**
 * صفحة إدارة العروض والخصومات
 */
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Row, Col, Card, Table, Button, Tag, Space, Statistic, Empty, Segmented, Badge } from "antd";
import { PlusOutlined, GiftOutlined, PauseCircleOutlined, PlayCircleOutlined } from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";
import { PageHeader, MoneyDisplay, DateDisplay, LoadingSkeleton } from "../components/shared";
import { API_BASE, getAuthHeaders } from "../utils/api";

interface Promotion {
  id: string;
  code: string | null;
  name: string;
  type: string;
  discountValue: string | null;
  startDate: string;
  endDate: string;
  status: string;
  currentUsageCount: number;
  usageLimit: number | null;
  isAutomatic: boolean;
}

interface Stats {
  activePromotions: number;
  activeCodes: number;
  totalUsageCount: number;
  monthlyDiscountGiven: number;
}

const STATUS_CONFIG: Record<string, { label: string; color: "default" | "success" | "warning" | "error" | "processing" }> = {
  draft: { label: "مسودة", color: "default" },
  active: { label: "نشط", color: "success" },
  paused: { label: "متوقف", color: "warning" },
  expired: { label: "منتهي", color: "default" },
  cancelled: { label: "ملغي", color: "error" },
};

const TYPE_CONFIG: Record<string, { label: string; icon: string }> = {
  percentage: { label: "نسبة مئوية", icon: "%" },
  fixed_amount: { label: "مبلغ ثابت", icon: "💵" },
  buy_x_get_y: { label: "اشتري X واحصل Y", icon: "🎁" },
  bundle: { label: "باقة", icon: "📦" },
  free_shipping: { label: "شحن مجاني", icon: "🚚" },
};

export default function PromotionsList() {
  const navigate = useNavigate();
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<string>("promotions");
  const [codes, setCodes] = useState<any[]>([]);
  const [bundles, setBundles] = useState<any[]>([]);

  useEffect(() => {
    loadData();
  }, [activeTab]);

  const loadData = async () => {
    setLoading(true);
    try {
      if (activeTab === "promotions") {
        const [promosRes, statsRes] = await Promise.all([
          fetch(`${API_BASE}/api/promotions`, { headers: getAuthHeaders() }),
          fetch(`${API_BASE}/api/promotions/stats`, { headers: getAuthHeaders() }),
        ]);
        if (promosRes.ok) setPromotions((await promosRes.json()).promotions || []);
        if (statsRes.ok) setStats(await statsRes.json());
      } else if (activeTab === "codes") {
        const res = await fetch(`${API_BASE}/api/promotions/codes/list`, { headers: getAuthHeaders() });
        if (res.ok) setCodes(await res.json());
      } else if (activeTab === "bundles") {
        const res = await fetch(`${API_BASE}/api/promotions/bundles/list`, { headers: getAuthHeaders() });
        if (res.ok) setBundles(await res.json());
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (id: string, status: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await fetch(`${API_BASE}/api/promotions/${id}`, {
        method: "PATCH",
        headers: getAuthHeaders(),
        body: JSON.stringify({ status }),
      });
      loadData();
    } catch (error) {
      console.error(error);
    }
  };

  const isExpired = (endDate: string) => new Date(endDate) < new Date();
  const isUpcoming = (startDate: string) => new Date(startDate) > new Date();

  const promotionColumns: ColumnsType<Promotion> = [
    {
      title: "العرض",
      key: "name",
      render: (_, record) => {
        const typeCfg = TYPE_CONFIG[record.type] || TYPE_CONFIG.percentage;
        const expired = isExpired(record.endDate);
        const upcoming = isUpcoming(record.startDate);
        return (
          <Space direction="vertical" size={0}>
            <Space>
              <span style={{ fontSize: 20 }}>{typeCfg.icon}</span>
              <span style={{ fontWeight: 600 }}>{record.name}</span>
              {record.code && (
                <Tag style={{ fontFamily: "monospace" }}>{record.code}</Tag>
              )}
              <Tag color={STATUS_CONFIG[record.status]?.color}>
                {STATUS_CONFIG[record.status]?.label}
              </Tag>
              {record.isAutomatic && <Tag color="blue">تلقائي</Tag>}
              {expired && record.status === "active" && <Tag color="error">منتهي</Tag>}
              {upcoming && <Tag color="warning">قادم</Tag>}
            </Space>
            <span style={{ color: "#8c8c8c", fontSize: 13 }}>
              {typeCfg.label}
              {record.discountValue && ` • ${record.discountValue}${record.type === "percentage" ? "%" : " IQD"}`}
              {" • "}
              <DateDisplay date={record.startDate} /> - <DateDisplay date={record.endDate} />
            </span>
          </Space>
        );
      },
    },
    {
      title: "الاستخدام",
      key: "usage",
      align: "center",
      width: 120,
      render: (_, record) => (
        <div style={{ textAlign: "center" }}>
          <div style={{ fontWeight: 600 }}>{record.currentUsageCount}</div>
          <div style={{ fontSize: 12, color: "#8c8c8c" }}>
            {record.usageLimit ? `/ ${record.usageLimit}` : "استخدام"}
          </div>
        </div>
      ),
    },
    {
      title: "إجراءات",
      key: "actions",
      align: "center",
      width: 100,
      render: (_, record) => (
        <Space onClick={(e) => e.stopPropagation()}>
          {record.status === "active" ? (
            <Button
              size="small"
              icon={<PauseCircleOutlined />}
              onClick={(e) => updateStatus(record.id, "paused", e)}
              style={{ color: "#d48806", borderColor: "#d48806" }}
            >
              إيقاف
            </Button>
          ) : (record.status === "paused" || record.status === "draft") ? (
            <Button
              size="small"
              icon={<PlayCircleOutlined />}
              onClick={(e) => updateStatus(record.id, "active", e)}
              style={{ color: "#52c41a", borderColor: "#52c41a" }}
            >
              تفعيل
            </Button>
          ) : null}
        </Space>
      ),
    },
  ];

  const codesColumns: ColumnsType<any> = [
    {
      title: "الكود",
      dataIndex: "code",
      key: "code",
      render: (text) => <span style={{ fontFamily: "monospace", fontWeight: 600 }}>{text}</span>,
    },
    {
      title: "الخصم",
      key: "discount",
      align: "center",
      render: (_, record) => (
        record.discountType === "percentage"
          ? `${record.discountValue}%`
          : <MoneyDisplay amount={record.discountValue} />
      ),
    },
    {
      title: "الاستخدام",
      key: "usage",
      align: "center",
      render: (_, record) => (
        <span>
          {record.currentUsageCount} {record.usageLimit && `/ ${record.usageLimit}`}
        </span>
      ),
    },
    {
      title: "الصلاحية",
      dataIndex: "endDate",
      key: "endDate",
      align: "center",
      render: (date) => date ? <DateDisplay date={date} /> : "غير محدد",
    },
    {
      title: "الحالة",
      dataIndex: "isActive",
      key: "isActive",
      align: "center",
      render: (isActive) => (
        <Tag color={isActive ? "success" : "default"}>
          {isActive ? "فعال" : "معطل"}
        </Tag>
      ),
    },
  ];

  if (loading && !stats) {
    return <LoadingSkeleton />;
  }

  return (
    <div>
      <PageHeader
        title="العروض والخصومات"
        subtitle="إدارة العروض الترويجية وأكواد الخصم"
        breadcrumbs={[
          { label: "الرئيسية", path: "/" },
          { label: "العروض" },
        ]}
        extra={
          <Space>
            <Button onClick={() => navigate("/promotions/new-code")}>
              + كود خصم
            </Button>
            <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate("/promotions/new")}>
              عرض جديد
            </Button>
          </Space>
        }
      />

      {/* Stats Cards */}
      {stats && (
        <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
          <Col xs={12} md={6}>
            <Card size="small">
              <Statistic
                title="عروض نشطة"
                value={stats.activePromotions}
                valueStyle={{ color: "#52c41a" }}
              />
            </Card>
          </Col>
          <Col xs={12} md={6}>
            <Card size="small">
              <Statistic
                title="أكواد فعالة"
                value={stats.activeCodes}
                valueStyle={{ color: "#1890ff" }}
              />
            </Card>
          </Col>
          <Col xs={12} md={6}>
            <Card size="small">
              <Statistic
                title="مرات الاستخدام"
                value={stats.totalUsageCount}
                valueStyle={{ color: "#722ed1" }}
              />
            </Card>
          </Col>
          <Col xs={12} md={6}>
            <Card size="small">
              <Statistic
                title="خصومات الشهر"
                value={Number(stats.monthlyDiscountGiven || 0)}
                suffix="IQD"
                valueStyle={{ color: "#f5222d" }}
              />
            </Card>
          </Col>
        </Row>
      )}

      {/* Tabs */}
      <Segmented
        value={activeTab}
        onChange={(value) => setActiveTab(value as string)}
        options={[
          { label: "العروض", value: "promotions" },
          { label: "أكواد الخصم", value: "codes" },
          { label: "الباقات", value: "bundles" },
        ]}
        style={{ marginBottom: 16 }}
      />

      {/* Content */}
      {loading ? (
        <LoadingSkeleton />
      ) : activeTab === "promotions" ? (
        promotions.length === 0 ? (
          <Card>
            <Empty
              image={<GiftOutlined style={{ fontSize: 64, color: "#d9d9d9" }} />}
              description="لا توجد عروض"
            />
          </Card>
        ) : (
          <Card bodyStyle={{ padding: 0 }}>
            <Table
              columns={promotionColumns}
              dataSource={promotions}
              rowKey="id"
              onRow={(record) => ({
                onClick: () => navigate(`/promotions/${record.id}`),
                style: { cursor: "pointer" },
              })}
              pagination={false}
            />
          </Card>
        )
      ) : activeTab === "codes" ? (
        codes.length === 0 ? (
          <Card>
            <Empty
              image={<GiftOutlined style={{ fontSize: 64, color: "#d9d9d9" }} />}
              description="لا توجد أكواد"
            />
          </Card>
        ) : (
          <Card>
            <Table
              columns={codesColumns}
              dataSource={codes}
              rowKey="id"
              pagination={{ showSizeChanger: true }}
            />
          </Card>
        )
      ) : (
        /* Bundles */
        bundles.length === 0 ? (
          <Card>
            <Empty
              image={<GiftOutlined style={{ fontSize: 64, color: "#d9d9d9" }} />}
              description="لا توجد باقات"
            />
          </Card>
        ) : (
          <Row gutter={[16, 16]}>
            {bundles.map((bundle) => (
              <Col xs={24} sm={12} lg={8} key={bundle.id}>
                <Card hoverable>
                  <h3 style={{ fontWeight: 600, marginBottom: 8 }}>{bundle.name}</h3>
                  <div style={{ color: "#8c8c8c", marginBottom: 12 }}>
                    {bundle.items?.length || 0} منتجات
                  </div>
                  <Space style={{ marginBottom: 8 }}>
                    <span style={{ textDecoration: "line-through", color: "#bfbfbf" }}>
                      {Number(bundle.originalPrice).toLocaleString()}
                    </span>
                    <span style={{ fontWeight: 700, color: "#52c41a", fontSize: 18 }}>
                      {Number(bundle.bundlePrice).toLocaleString()} IQD
                    </span>
                  </Space>
                  <div
                    style={{
                      padding: 8,
                      background: "#f6ffed",
                      borderRadius: 6,
                      textAlign: "center",
                      color: "#52c41a",
                      fontWeight: 500,
                    }}
                  >
                    وفر {bundle.savingsPercentage}%
                  </div>
                </Card>
              </Col>
            ))}
          </Row>
        )
      )}
    </div>
  );
}
