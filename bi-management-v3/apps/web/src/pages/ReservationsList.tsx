/**
 * صفحة قائمة الحجوزات
 */
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Row, Col, Card, Table, Button, Input, Select, Tag, Space, Statistic, Empty } from "antd";
import { PlusOutlined, SearchOutlined, ShoppingOutlined, WarningOutlined, CheckCircleOutlined } from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";
import { PageHeader, MoneyDisplay, DateDisplay, LoadingSkeleton } from "../components/shared";
import { API_BASE, getAuthHeaders } from "../utils/api";

interface Reservation {
  id: string;
  reservationNumber: string;
  customerName: string;
  customerPhone: string | null;
  status: string;
  totalAmount: string;
  depositAmount: string;
  depositPaid: boolean;
  expiresAt: string | null;
  createdAt: string;
}

const STATUS_CONFIG: Record<string, { label: string; color: "warning" | "processing" | "purple" | "success" | "error" | "default" }> = {
  pending: { label: "بانتظار التأكيد", color: "warning" },
  confirmed: { label: "مؤكد", color: "processing" },
  ready: { label: "جاهز للاستلام", color: "purple" },
  completed: { label: "مكتمل", color: "success" },
  cancelled: { label: "ملغي", color: "error" },
  expired: { label: "منتهي", color: "default" },
};

export default function ReservationsList() {
  const navigate = useNavigate();
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("pending,confirmed,ready");
  const [search, setSearch] = useState("");

  useEffect(() => {
    loadData();
  }, [statusFilter, search]);

  const loadData = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter) params.append("status", statusFilter);
      if (search) params.append("search", search);

      const [res, statsRes] = await Promise.all([
        fetch(`${API_BASE}/api/reservations?${params}`, { headers: getAuthHeaders() }),
        fetch(`${API_BASE}/api/reservations/stats`, { headers: getAuthHeaders() }),
      ]);
      if (res.ok) setReservations((await res.json()).reservations || []);
      if (statsRes.ok) setStats(await statsRes.json());
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const isExpiringSoon = (expiresAt: string | null) => {
    if (!expiresAt) return false;
    const diff = new Date(expiresAt).getTime() - Date.now();
    return diff > 0 && diff < 2 * 24 * 60 * 60 * 1000;
  };

  const isExpired = (expiresAt: string | null, status: string) => {
    if (!expiresAt || status === "completed" || status === "cancelled") return false;
    return new Date(expiresAt) < new Date();
  };

  const columns: ColumnsType<Reservation> = [
    {
      title: "رقم الحجز",
      dataIndex: "reservationNumber",
      key: "reservationNumber",
      render: (text) => <span style={{ fontFamily: "monospace", fontWeight: 600 }}>{text}</span>,
    },
    {
      title: "العميل",
      key: "customer",
      render: (_, record) => (
        <Space direction="vertical" size={0}>
          <span style={{ fontWeight: 500 }}>{record.customerName}</span>
          {record.customerPhone && (
            <span style={{ fontSize: 13, color: "#8c8c8c" }}>{record.customerPhone}</span>
          )}
        </Space>
      ),
    },
    {
      title: "المبلغ",
      dataIndex: "totalAmount",
      key: "totalAmount",
      align: "center",
      render: (amount) => <MoneyDisplay amount={amount} style={{ fontWeight: 600 }} />,
    },
    {
      title: "العربون",
      key: "deposit",
      align: "center",
      render: (_, record) => (
        <Space>
          <MoneyDisplay
            amount={record.depositAmount}
            style={{ color: record.depositPaid ? "#52c41a" : "#d48806" }}
          />
          {record.depositPaid && <CheckCircleOutlined style={{ color: "#52c41a" }} />}
        </Space>
      ),
    },
    {
      title: "ينتهي في",
      dataIndex: "expiresAt",
      key: "expiresAt",
      align: "center",
      render: (date, record) => {
        if (!date) return "-";
        const expired = isExpired(date, record.status);
        const expiring = isExpiringSoon(date);
        return (
          <Space>
            <DateDisplay
              date={date}
              style={{ color: expired ? "#f5222d" : expiring ? "#d48806" : undefined }}
            />
            {expired && <Tag color="error">منتهي</Tag>}
            {expiring && !expired && <WarningOutlined style={{ color: "#d48806" }} />}
          </Space>
        );
      },
    },
    {
      title: "الحالة",
      dataIndex: "status",
      key: "status",
      align: "center",
      render: (status) => {
        const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.pending;
        return <Tag color={cfg.color}>{cfg.label}</Tag>;
      },
    },
  ];

  if (loading && !stats) {
    return <LoadingSkeleton />;
  }

  return (
    <div>
      <PageHeader
        title="الحجوزات"
        subtitle="إدارة حجوزات المنتجات للعملاء"
        breadcrumbs={[
          { label: "الرئيسية", path: "/" },
          { label: "الحجوزات" },
        ]}
        extra={
          <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate("/reservations/new")}>
            حجز جديد
          </Button>
        }
      />

      {/* Stats Cards */}
      {stats && (
        <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
          <Col xs={12} md={4} lg={4}>
            <Card size="small" style={{ background: "#fffbe6" }}>
              <Statistic
                title="بانتظار التأكيد"
                value={stats.byStatus?.pending || 0}
                valueStyle={{ color: "#d48806" }}
              />
            </Card>
          </Col>
          <Col xs={12} md={4} lg={4}>
            <Card size="small" style={{ background: "#e6f7ff" }}>
              <Statistic
                title="مؤكدة"
                value={stats.byStatus?.confirmed || 0}
                valueStyle={{ color: "#1890ff" }}
              />
            </Card>
          </Col>
          <Col xs={12} md={4} lg={4}>
            <Card size="small" style={{ background: "#f9f0ff" }}>
              <Statistic
                title="جاهزة"
                value={stats.byStatus?.ready || 0}
                valueStyle={{ color: "#722ed1" }}
              />
            </Card>
          </Col>
          <Col xs={12} md={4} lg={4}>
            <Card size="small" style={{ background: "#f6ffed" }}>
              <Statistic
                title="مكتملة"
                value={stats.byStatus?.completed || 0}
                valueStyle={{ color: "#52c41a" }}
              />
            </Card>
          </Col>
          <Col xs={12} md={4} lg={4}>
            <Card
              size="small"
              style={{ background: stats.expiringSoon > 0 ? "#fff1f0" : "#fafafa" }}
            >
              <Statistic
                title="تنتهي قريباً"
                value={stats.expiringSoon || 0}
                valueStyle={{ color: "#f5222d" }}
                prefix={stats.expiringSoon > 0 ? <WarningOutlined /> : undefined}
              />
            </Card>
          </Col>
        </Row>
      )}

      {/* Filters */}
      <Space style={{ marginBottom: 16, width: "100%" }} size="middle">
        <Input
          placeholder="بحث برقم الحجز أو اسم العميل..."
          prefix={<SearchOutlined />}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ width: 300 }}
          allowClear
        />
        <Select
          value={statusFilter}
          onChange={setStatusFilter}
          style={{ width: 180 }}
          options={[
            { label: "كل الحالات", value: "" },
            { label: "النشطة", value: "pending,confirmed,ready" },
            { label: "بانتظار التأكيد", value: "pending" },
            { label: "مؤكدة", value: "confirmed" },
            { label: "جاهزة", value: "ready" },
            { label: "مكتملة", value: "completed" },
            { label: "ملغاة", value: "cancelled" },
          ]}
        />
      </Space>

      {/* Table */}
      <Card>
        {loading ? (
          <LoadingSkeleton />
        ) : reservations.length === 0 ? (
          <Empty
            image={<ShoppingOutlined style={{ fontSize: 64, color: "#d9d9d9" }} />}
            description="لا توجد حجوزات"
          />
        ) : (
          <Table
            columns={columns}
            dataSource={reservations}
            rowKey="id"
            onRow={(record) => ({
              onClick: () => navigate(`/reservations/${record.id}`),
              style: { cursor: "pointer" },
            })}
            pagination={{
              showSizeChanger: true,
              showTotal: (total) => `إجمالي ${total} حجز`,
            }}
          />
        )}
      </Card>
    </div>
  );
}
