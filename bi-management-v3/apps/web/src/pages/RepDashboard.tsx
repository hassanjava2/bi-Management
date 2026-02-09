/**
 * لوحة المندوب
 * Rep Dashboard - لوحة خاصة بمندوبي المبيعات
 */
import { useState, useEffect } from "react";
import { Row, Col, Card, Statistic, Table, Tag, Space, Empty, Button, message } from "antd";
import {
  DollarOutlined, ShoppingCartOutlined, ClockCircleOutlined,
  CheckCircleOutlined, WarningOutlined, AimOutlined, UserOutlined,
  PhoneOutlined, RiseOutlined,
} from "@ant-design/icons";
import { PageHeader, LoadingSkeleton } from "../components/shared";
import { API_BASE, getAuthHeaders } from "../utils/api";
import { Link } from "react-router-dom";

export default function RepDashboard() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [salesRes, statsRes, tasksRes] = await Promise.all([
        fetch(`${API_BASE}/api/dashboard/overview`, { headers: getAuthHeaders() }).then(r => r.ok ? r.json() : null).catch(() => null),
        fetch(`${API_BASE}/api/stats`, { headers: getAuthHeaders() }).then(r => r.ok ? r.json() : null).catch(() => null),
        fetch(`${API_BASE}/api/tasks?status=pending&limit=10`, { headers: getAuthHeaders() }).then(r => r.ok ? r.json() : null).catch(() => null),
      ]);

      setData({
        sales: salesRes || {},
        stats: statsRes || {},
        tasks: tasksRes?.tasks || tasksRes?.data || [],
      });
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <LoadingSkeleton />;

  const sales = data?.sales || {};
  const tasks = data?.tasks || [];

  return (
    <div>
      <PageHeader
        title="لوحة المندوب"
        subtitle="ملخص المبيعات والمهام الخاصة بك"
        breadcrumbs={[
          { title: "الرئيسية", href: "/" },
          { title: "لوحة المندوب" },
        ]}
        extra={
          <Space>
            <Link to="/invoices/new">
              <Button type="primary" icon={<ShoppingCartOutlined />}>فاتورة جديدة</Button>
            </Link>
          </Space>
        }
      />

      {/* ─── الإحصائيات ─── */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={12} sm={6}>
          <Card size="small" style={{ borderRadius: 12, borderRight: "4px solid #1890ff" }}>
            <Statistic
              title="مبيعاتي اليوم"
              value={sales.todaySales || 0}
              prefix={<DollarOutlined />}
              valueStyle={{ color: "#1890ff" }}
              suffix="د.ع"
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card size="small" style={{ borderRadius: 12, borderRight: "4px solid #52c41a" }}>
            <Statistic
              title="فواتيري اليوم"
              value={sales.todayInvoices || 0}
              prefix={<ShoppingCartOutlined />}
              valueStyle={{ color: "#52c41a" }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card size="small" style={{ borderRadius: 12, borderRight: "4px solid #faad14" }}>
            <Statistic
              title="مهام معلقة"
              value={tasks.length}
              prefix={<ClockCircleOutlined />}
              valueStyle={{ color: "#faad14" }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card size="small" style={{ borderRadius: 12, borderRight: "4px solid #722ed1" }}>
            <Statistic
              title="مبيعات الشهر"
              value={sales.monthSales || sales.totalSales || 0}
              prefix={<RiseOutlined />}
              valueStyle={{ color: "#722ed1" }}
              suffix="د.ع"
            />
          </Card>
        </Col>
      </Row>

      {/* ─── الهدف الشهري ─── */}
      <Card
        size="small"
        title={<Space><AimOutlined style={{ color: "#1890ff" }} /> الهدف الشهري</Space>}
        style={{ marginBottom: 24, borderRadius: 12 }}
      >
        <Row gutter={16} align="middle">
          <Col xs={24} sm={8}>
            <Statistic title="المحقق" value={sales.totalSales || 0} suffix="د.ع" valueStyle={{ color: "#52c41a" }} />
          </Col>
          <Col xs={24} sm={8}>
            <Statistic title="الهدف" value={sales.monthlyTarget || 50000000} suffix="د.ع" />
          </Col>
          <Col xs={24} sm={8}>
            <Statistic
              title="نسبة الإنجاز"
              value={Math.min(100, Math.round(((sales.totalSales || 0) / (sales.monthlyTarget || 50000000)) * 100))}
              suffix="%"
              valueStyle={{ color: ((sales.totalSales || 0) / (sales.monthlyTarget || 50000000)) >= 0.8 ? "#52c41a" : "#faad14" }}
            />
          </Col>
        </Row>
      </Card>

      <Row gutter={[16, 16]}>
        {/* ─── المهام المعلقة ─── */}
        <Col xs={24} lg={12}>
          <Card
            size="small"
            title={<Space><ClockCircleOutlined /> مهامي المعلقة</Space>}
            style={{ borderRadius: 12 }}
            extra={<Link to="/tasks">عرض الكل</Link>}
          >
            {tasks.length === 0 ? (
              <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="لا توجد مهام معلقة">
                <Tag color="green" icon={<CheckCircleOutlined />}>أحسنت! كل المهام مكتملة</Tag>
              </Empty>
            ) : (
              <Table
                dataSource={tasks.slice(0, 5)}
                columns={[
                  { title: "المهمة", dataIndex: "title", key: "title", ellipsis: true },
                  {
                    title: "الأولوية", dataIndex: "priority", key: "priority",
                    render: (p: string) => (
                      <Tag color={p === "high" ? "red" : p === "medium" ? "orange" : "blue"}>
                        {p === "high" ? "عالية" : p === "medium" ? "متوسطة" : "منخفضة"}
                      </Tag>
                    ),
                  },
                  {
                    title: "الحالة", dataIndex: "status", key: "status",
                    render: (s: string) => (
                      <Tag color={s === "completed" ? "green" : s === "in_progress" ? "blue" : "orange"}>
                        {s === "completed" ? "مكتمل" : s === "in_progress" ? "جاري" : "معلق"}
                      </Tag>
                    ),
                  },
                ]}
                pagination={false}
                size="small"
                rowKey="id"
              />
            )}
          </Card>
        </Col>

        {/* ─── روابط سريعة ─── */}
        <Col xs={24} lg={12}>
          <Card
            size="small"
            title="إجراءات سريعة"
            style={{ borderRadius: 12 }}
          >
            <Row gutter={[12, 12]}>
              {[
                { label: "فاتورة نقدية", path: "/invoices/new", icon: <DollarOutlined />, color: "#52c41a" },
                { label: "إضافة عميل", path: "/customers", icon: <UserOutlined />, color: "#1890ff" },
                { label: "المخزون", path: "/devices", icon: <ShoppingCartOutlined />, color: "#722ed1" },
                { label: "المرتجعات", path: "/returns", icon: <WarningOutlined />, color: "#fa8c16" },
                { label: "الصيانة", path: "/maintenance", icon: <ClockCircleOutlined />, color: "#13c2c2" },
                { label: "التقارير", path: "/reports", icon: <RiseOutlined />, color: "#eb2f96" },
              ].map(item => (
                <Col xs={8} key={item.path}>
                  <Link to={item.path}>
                    <Card size="small" hoverable style={{ textAlign: "center", borderRadius: 8 }}>
                      <div style={{ fontSize: 22, color: item.color, marginBottom: 4 }}>{item.icon}</div>
                      <div style={{ fontSize: 11, fontWeight: 500 }}>{item.label}</div>
                    </Card>
                  </Link>
                </Col>
              ))}
            </Row>
          </Card>
        </Col>
      </Row>
    </div>
  );
}
