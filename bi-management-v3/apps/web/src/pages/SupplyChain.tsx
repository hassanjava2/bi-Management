import { useEffect, useState } from "react";
import { Row, Col, Card, Table, Button, Select, Space, message, Statistic, Empty } from "antd";
import {
  PlusOutlined,
  ShoppingCartOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  DollarOutlined,
} from "@ant-design/icons";
import { PageHeader, StatusTag, MoneyDisplay, DateDisplay, LoadingSkeleton } from "../components/shared";
import { API_BASE, getAuthHeaders } from "../utils/api";

type PurchaseOrder = {
  id: string;
  code: string | null;
  status: string | null;
  orderDate: string | null;
  expectedDate: string | null;
  total: number | null;
  supplier: { id: string; name: string } | null;
};

type OrderStats = {
  total: number;
  draft: number;
  sent: number;
  received: number;
  totalValue: number;
};

const statusConfig: Record<string, { color: string; text: string }> = {
  draft: { color: "default", text: "مسودة" },
  sent: { color: "blue", text: "مرسل" },
  confirmed: { color: "warning", text: "مؤكد" },
  received: { color: "success", text: "مستلم" },
};

export default function SupplyChain() {
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [stats, setStats] = useState<OrderStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  useEffect(() => {
    document.title = "سلسلة التوريد | BI Management v3";
  }, []);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (statusFilter) params.append("status", statusFilter);

    Promise.all([
      fetch(`${API_BASE}/api/supply-chain/orders?${params}`, { headers: getAuthHeaders() }).then((r) => r.json()),
      fetch(`${API_BASE}/api/supply-chain/orders/stats`, { headers: getAuthHeaders() }).then((r) => r.json()),
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

  const columns = [
    {
      title: "رقم الأمر",
      dataIndex: "code",
      key: "code",
      render: (code: string | null) => <code style={{ fontWeight: 500 }}>{code || "-"}</code>,
    },
    {
      title: "المورد",
      dataIndex: "supplier",
      key: "supplier",
      render: (supplier: PurchaseOrder["supplier"]) => supplier?.name || "-",
    },
    {
      title: "الإجمالي",
      dataIndex: "total",
      key: "total",
      render: (total: number | null) => <MoneyDisplay amount={total} currency="IQD" />,
    },
    {
      title: "الحالة",
      dataIndex: "status",
      key: "status",
      render: (status: string | null) => {
        const config = statusConfig[status || ""] || { color: "default", text: status || "-" };
        return <StatusTag status={status || ""} color={config.color} text={config.text} />;
      },
    },
  ];

  if (loading && !stats) {
    return <LoadingSkeleton />;
  }

  return (
    <div>
      <PageHeader
        title="سلسلة التوريد"
        subtitle="إدارة المشتريات وأوامر الشراء"
        breadcrumbs={[
          { label: "الرئيسية", path: "/" },
          { label: "سلسلة التوريد" },
        ]}
        extra={
          <Button type="primary" icon={<PlusOutlined />}>
            أمر شراء جديد
          </Button>
        }
      />

      {stats && (
        <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
          <Col xs={12} sm={6}>
            <Card>
              <Statistic
                title="إجمالي الأوامر"
                value={stats.total}
                prefix={<ShoppingCartOutlined />}
                valueStyle={{ color: "#1890ff" }}
              />
            </Card>
          </Col>
          <Col xs={12} sm={6}>
            <Card>
              <Statistic
                title="قيد الانتظار"
                value={stats.sent}
                prefix={<ClockCircleOutlined />}
                valueStyle={{ color: "#faad14" }}
              />
            </Card>
          </Col>
          <Col xs={12} sm={6}>
            <Card>
              <Statistic
                title="مستلم"
                value={stats.received}
                prefix={<CheckCircleOutlined />}
                valueStyle={{ color: "#52c41a" }}
              />
            </Card>
          </Col>
          <Col xs={12} sm={6}>
            <Card>
              <Statistic
                title="إجمالي القيمة"
                value={stats.totalValue}
                prefix={<DollarOutlined />}
                valueStyle={{ color: "#722ed1" }}
                formatter={(value) => <MoneyDisplay amount={value as number} currency="IQD" />}
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
            <Select.Option value="draft">مسودة</Select.Option>
            <Select.Option value="sent">مرسل</Select.Option>
            <Select.Option value="received">مستلم</Select.Option>
          </Select>
        </Space>

        <Table
          dataSource={orders}
          columns={columns}
          rowKey="id"
          loading={loading}
          locale={{ emptyText: <Empty description="لا توجد أوامر شراء" /> }}
          pagination={{ pageSize: 10, showSizeChanger: true, showTotal: (total) => `إجمالي ${total} أمر` }}
        />
      </Card>
    </div>
  );
}
