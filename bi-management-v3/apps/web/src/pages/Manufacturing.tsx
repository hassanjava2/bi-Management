import { useEffect, useState } from "react";
import { Row, Col, Card, Button, Select, Tag, Space, message, Statistic, Empty, Progress } from "antd";
import {
  PlusOutlined,
  ToolOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  ExperimentOutlined,
  UnorderedListOutlined,
} from "@ant-design/icons";
import { PageHeader, StatusTag, DateDisplay, LoadingSkeleton } from "../components/shared";
import { API_BASE, getAuthHeaders } from "../utils/api";

type ProductionOrder = {
  id: string;
  code: string | null;
  status: string | null;
  priority: string | null;
  plannedQuantity: number | null;
  producedQuantity: number | null;
  plannedStartDate: string | null;
  plannedEndDate: string | null;
  product: { id: string; name: string; code: string | null } | null;
  bom: { id: string; name: string; code: string | null } | null;
};

type OrderStats = {
  total: number;
  planned: number;
  inProgress: number;
  completed: number;
  totalPlanned: number;
  totalProduced: number;
};

const statusConfig: Record<string, { color: string; text: string }> = {
  planned: { color: "default", text: "مخطط" },
  released: { color: "blue", text: "صادر" },
  in_progress: { color: "warning", text: "قيد التنفيذ" },
  completed: { color: "success", text: "مكتمل" },
  cancelled: { color: "error", text: "ملغي" },
};

export default function Manufacturing() {
  const [orders, setOrders] = useState<ProductionOrder[]>([]);
  const [stats, setStats] = useState<OrderStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  useEffect(() => {
    document.title = "التصنيع والإنتاج | BI Management v3";
  }, []);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (statusFilter) params.append("status", statusFilter);

    Promise.all([
      fetch(`${API_BASE}/api/manufacturing/orders?${params}`, { headers: getAuthHeaders() }).then((r) => r.json()),
      fetch(`${API_BASE}/api/manufacturing/orders/stats`, { headers: getAuthHeaders() }).then((r) => r.json()),
    ])
      .then(([ordersRes, statsRes]) => {
        setOrders(ordersRes.items || []);
        setStats(statsRes);
      })
      .catch((e) => {
        setError(e.message);
        message.error("فشل في تحميل البيانات");
      })
      .finally(() => setLoading(false));
  }, [statusFilter]);

  const calculateProgress = (planned: number | null, produced: number | null) => {
    if (!planned || !produced) return 0;
    return Math.round((produced / planned) * 100);
  };

  if (loading && !stats) {
    return <LoadingSkeleton />;
  }

  return (
    <div>
      <PageHeader
        title="التصنيع والإنتاج"
        subtitle="إدارة أوامر الإنتاج وقوائم المواد"
        breadcrumbs={[
          { label: "الرئيسية", path: "/" },
          { label: "التصنيع والإنتاج" },
        ]}
        extra={
          <Space>
            <Button icon={<UnorderedListOutlined />}>قوائم المواد BOM</Button>
            <Button type="primary" icon={<PlusOutlined />} style={{ background: "#f97316", borderColor: "#f97316" }}>
              أمر إنتاج جديد
            </Button>
          </Space>
        }
      />

      {stats && (
        <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
          <Col xs={12} sm={6}>
            <Card>
              <Statistic
                title="إجمالي الأوامر"
                value={stats.total}
                prefix={<ToolOutlined />}
                valueStyle={{ color: "#1890ff" }}
              />
            </Card>
          </Col>
          <Col xs={12} sm={6}>
            <Card>
              <Statistic
                title="قيد التنفيذ"
                value={stats.inProgress}
                prefix={<ClockCircleOutlined />}
                valueStyle={{ color: "#faad14" }}
              />
            </Card>
          </Col>
          <Col xs={12} sm={6}>
            <Card>
              <Statistic
                title="مكتمل"
                value={stats.completed}
                prefix={<CheckCircleOutlined />}
                valueStyle={{ color: "#52c41a" }}
              />
            </Card>
          </Col>
          <Col xs={12} sm={6}>
            <Card>
              <Statistic
                title="الإنتاج الفعلي"
                value={stats.totalProduced}
                prefix={<ExperimentOutlined />}
                valueStyle={{ color: "#722ed1" }}
                suffix={<span style={{ fontSize: 14, color: "#8c8c8c" }}>من {stats.totalPlanned?.toLocaleString()} مخطط</span>}
              />
            </Card>
          </Col>
        </Row>
      )}

      <Card>
        <Space style={{ marginBottom: 16 }}>
          <Select
            value={statusFilter}
            onChange={setStatusFilter}
            style={{ minWidth: 150 }}
            placeholder="جميع الحالات"
            allowClear
          >
            <Select.Option value="">جميع الحالات</Select.Option>
            <Select.Option value="planned">مخطط</Select.Option>
            <Select.Option value="released">صادر</Select.Option>
            <Select.Option value="in_progress">قيد التنفيذ</Select.Option>
            <Select.Option value="completed">مكتمل</Select.Option>
          </Select>
        </Space>

        {loading ? (
          <LoadingSkeleton />
        ) : orders.length === 0 ? (
          <Empty
            image={<ToolOutlined style={{ fontSize: 64, color: "#d9d9d9" }} />}
            description="لا توجد أوامر إنتاج"
          />
        ) : (
          <Row gutter={[16, 16]}>
            {orders.map((order) => {
              const progress = calculateProgress(order.plannedQuantity, order.producedQuantity);
              const config = statusConfig[order.status || ""] || { color: "default", text: order.status || "-" };

              return (
                <Col xs={24} md={12} lg={8} key={order.id}>
                  <Card hoverable>
                    <Row justify="space-between" align="top" style={{ marginBottom: 16 }}>
                      <Col>
                        <h3 style={{ margin: 0, fontSize: "1.1rem" }}>{order.product?.name || "منتج"}</h3>
                        <p style={{ margin: "4px 0 0", color: "#8c8c8c", fontSize: "0.85rem" }}>{order.code}</p>
                      </Col>
                      <Col>
                        <StatusTag status={order.status || ""} color={config.color} text={config.text} />
                      </Col>
                    </Row>

                    <div style={{ marginBottom: 16 }}>
                      <Row justify="space-between" style={{ marginBottom: 8 }}>
                        <Col style={{ color: "#8c8c8c" }}>الإنتاج</Col>
                        <Col style={{ fontWeight: 500 }}>
                          {order.producedQuantity || 0} / {order.plannedQuantity || 0}
                        </Col>
                      </Row>
                      <Progress
                        percent={progress}
                        strokeColor="#f97316"
                        showInfo={false}
                        size="small"
                      />
                    </div>

                    <Row gutter={16}>
                      <Col span={12}>
                        <div style={{ fontSize: "0.75rem", color: "#8c8c8c" }}>قائمة المواد</div>
                        <div style={{ fontWeight: 500 }}>{order.bom?.name || "-"}</div>
                      </Col>
                      <Col span={12}>
                        <div style={{ fontSize: "0.75rem", color: "#8c8c8c" }}>التواريخ</div>
                        <div style={{ fontWeight: 500 }}>
                          <DateDisplay date={order.plannedStartDate} /> - <DateDisplay date={order.plannedEndDate} />
                        </div>
                      </Col>
                    </Row>
                  </Card>
                </Col>
              );
            })}
          </Row>
        )}
      </Card>
    </div>
  );
}
