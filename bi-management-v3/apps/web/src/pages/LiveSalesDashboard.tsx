/**
 * لوحة المبيعات اللحظية
 * Real-time Sales Dashboard
 */
import { useState, useEffect, useCallback } from "react";
import { Row, Col, Card, Statistic, Table, Tag, Space, Progress, Empty } from "antd";
import {
  DollarOutlined, ShoppingCartOutlined, RiseOutlined,
  ClockCircleOutlined, TrophyOutlined, FireOutlined,
  ArrowUpOutlined, ArrowDownOutlined, ThunderboltOutlined,
} from "@ant-design/icons";
import { PageHeader } from "../components/shared";
import { API_BASE, getAuthHeaders } from "../utils/api";

export default function LiveSalesDashboard() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState("");

  const fetchData = useCallback(async () => {
    try {
      const [overviewRes, recentRes, topRes] = await Promise.all([
        fetch(`${API_BASE}/api/dashboard/overview`, { headers: getAuthHeaders() }).then(r => r.ok ? r.json() : null).catch(() => null),
        fetch(`${API_BASE}/api/dashboard/recent-invoices`, { headers: getAuthHeaders() }).then(r => r.ok ? r.json() : null).catch(() => null),
        fetch(`${API_BASE}/api/dashboard/top-products`, { headers: getAuthHeaders() }).then(r => r.ok ? r.json() : null).catch(() => null),
      ]);

      setData({
        overview: overviewRes || {},
        recent: recentRes?.data || [],
        topProducts: topRes?.data || [],
      });
      setLastUpdate(new Date().toLocaleTimeString("ar-IQ"));
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 15000); // كل 15 ثانية
    return () => clearInterval(interval);
  }, [fetchData]);

  const overview = data?.overview || {};
  const dailyTarget = overview.dailyTarget || 10000000;
  const todaySales = overview.todaySales || overview.totalSales || 0;
  const targetPercent = Math.min(100, Math.round((todaySales / dailyTarget) * 100));

  return (
    <div>
      <PageHeader
        title="المبيعات اللحظية"
        subtitle={`آخر تحديث: ${lastUpdate || "جاري التحميل..."}`}
        breadcrumbs={[{ title: "الرئيسية", href: "/" }, { title: "المبيعات اللحظية" }]}
        extra={
          <Tag color="processing" icon={<ThunderboltOutlined />} style={{ fontSize: 13, padding: "4px 12px" }}>
            تحديث تلقائي كل 15 ثانية
          </Tag>
        }
      />

      {/* الهدف اليومي */}
      <Card
        size="small"
        style={{ marginBottom: 20, borderRadius: 16, background: targetPercent >= 100 ? "linear-gradient(135deg, #52c41a, #73d13d)" : targetPercent >= 70 ? "linear-gradient(135deg, #1890ff, #40a9ff)" : "linear-gradient(135deg, #fa8c16, #ffc53d)", border: "none" }}
      >
        <Row gutter={16} align="middle">
          <Col flex="auto">
            <div style={{ color: "#fff" }}>
              <div style={{ fontSize: 14, opacity: 0.85, marginBottom: 4 }}>هدف المبيعات اليومي</div>
              <div style={{ fontSize: 32, fontWeight: 700 }}>{todaySales.toLocaleString()} <span style={{ fontSize: 14, opacity: 0.7 }}>د.ع</span></div>
              <div style={{ fontSize: 13, opacity: 0.8, marginTop: 4 }}>
                من أصل {dailyTarget.toLocaleString()} د.ع
              </div>
            </div>
          </Col>
          <Col>
            <Progress
              type="circle"
              percent={targetPercent}
              size={90}
              strokeColor="#fff"
              trailColor="rgba(255,255,255,0.2)"
              format={() => <span style={{ color: "#fff", fontSize: 20, fontWeight: 700 }}>{targetPercent}%</span>}
            />
          </Col>
        </Row>
      </Card>

      {/* الإحصائيات */}
      <Row gutter={[12, 12]} style={{ marginBottom: 20 }}>
        {[
          { title: "مبيعات اليوم", value: todaySales, icon: <DollarOutlined />, color: "#1890ff", suffix: "د.ع" },
          { title: "فواتير اليوم", value: overview.todayInvoices || overview.invoiceCount || 0, icon: <ShoppingCartOutlined />, color: "#52c41a" },
          { title: "عملاء جدد", value: overview.newCustomers || 0, icon: <RiseOutlined />, color: "#722ed1" },
          { title: "الوقت الحالي", value: new Date().toLocaleTimeString("ar-IQ", { hour: "2-digit", minute: "2-digit" }), icon: <ClockCircleOutlined />, color: "#fa8c16" },
        ].map((item, i) => (
          <Col xs={12} sm={6} key={i}>
            <Card size="small" style={{ borderRadius: 12, borderTop: `3px solid ${item.color}` }}>
              <Statistic title={item.title} value={item.value} prefix={item.icon} valueStyle={{ color: item.color, fontSize: 20 }} suffix={item.suffix} />
            </Card>
          </Col>
        ))}
      </Row>

      <Row gutter={[16, 16]}>
        {/* آخر الفواتير */}
        <Col xs={24} lg={14}>
          <Card
            title={<Space><FireOutlined style={{ color: "#ff4d4f" }} /> آخر الفواتير</Space>}
            size="small"
            style={{ borderRadius: 12 }}
          >
            {(data?.recent || []).length === 0 ? (
              <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="لا توجد فواتير" />
            ) : (
              <Table
                dataSource={(data?.recent || []).slice(0, 10)}
                columns={[
                  { title: "#", dataIndex: "invoiceNumber", key: "num", width: 100 },
                  { title: "العميل", dataIndex: "customerName", key: "customer", ellipsis: true },
                  { title: "المبلغ", dataIndex: "totalAmount", key: "amount", render: (v: number) => <span style={{ fontWeight: 600, color: "#1890ff" }}>{(v || 0).toLocaleString()}</span> },
                  { title: "الحالة", dataIndex: "status", key: "status", render: (s: string) => <Tag color={s === "completed" ? "green" : "blue"}>{s}</Tag> },
                  { title: "الوقت", dataIndex: "createdAt", key: "time", render: (d: string) => d ? new Date(d).toLocaleTimeString("ar-IQ", { hour: "2-digit", minute: "2-digit" }) : "-" },
                ]}
                pagination={false}
                size="small"
                rowKey="id"
              />
            )}
          </Card>
        </Col>

        {/* أفضل المنتجات */}
        <Col xs={24} lg={10}>
          <Card
            title={<Space><TrophyOutlined style={{ color: "#faad14" }} /> الأكثر مبيعاً اليوم</Space>}
            size="small"
            style={{ borderRadius: 12 }}
          >
            {(data?.topProducts || []).length === 0 ? (
              <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="لا توجد بيانات" />
            ) : (
              (data?.topProducts || []).slice(0, 8).map((p: any, i: number) => (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: i < 7 ? "1px solid #f0f0f0" : "none" }}>
                  <Space>
                    <span style={{ width: 24, height: 24, borderRadius: "50%", background: i < 3 ? ["#ffd700", "#c0c0c0", "#cd7f32"][i] : "#f0f0f0", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 600, color: i < 3 ? "#fff" : "#999" }}>
                      {i + 1}
                    </span>
                    <span style={{ fontWeight: 500 }}>{p.productName || p.name || "منتج"}</span>
                  </Space>
                  <Tag color="blue">{p.count || p.quantity || 0} قطعة</Tag>
                </div>
              ))
            )}
          </Card>
        </Col>
      </Row>
    </div>
  );
}
