/**
 * صفحة تفاصيل الحجز
 */
import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Row, Col, Card, Descriptions, Tag, Space, Button, Statistic, Table, Empty, message, Timeline, Alert, Popconfirm } from "antd";
import {
  ArrowLeftOutlined,
  PhoneOutlined,
  MailOutlined,
  CheckOutlined,
  CloseOutlined,
  ClockCircleOutlined,
  InboxOutlined,
  DollarOutlined,
  EditOutlined,
} from "@ant-design/icons";
import { PageHeader, DateDisplay, LoadingSkeleton, MoneyDisplay, StatusTag } from "../components/shared";
import { API_BASE, getAuthHeaders } from "../utils/api";

interface Reservation {
  id: string;
  reservationNumber: string;
  customerName: string;
  customerPhone: string | null;
  customerEmail: string | null;
  status: string;
  totalAmount: string;
  depositAmount: string;
  depositPaid: boolean;
  expiresAt: string | null;
  notes: string | null;
  cancellationReason: string | null;
  createdAt: string;
  items: Array<{ id: string; productName: string; quantity: number; unitPrice: string; totalPrice: string; status: string }>;
  activities: Array<{ id: string; activityType: string; description: string; createdAt: string }>;
}

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  pending: { label: "بانتظار التأكيد", color: "gold" },
  confirmed: { label: "مؤكد", color: "blue" },
  ready: { label: "جاهز للاستلام", color: "purple" },
  completed: { label: "مكتمل", color: "green" },
  cancelled: { label: "ملغي", color: "red" },
  expired: { label: "منتهي", color: "default" },
};

export default function ReservationDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [reservation, setReservation] = useState<Reservation | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadReservation();
  }, [id]);

  const loadReservation = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/reservations/${id}`, { headers: getAuthHeaders() });
      if (res.ok) setReservation(await res.json());
    } catch (error) {
      console.error(error);
      message.error("فشل تحميل بيانات الحجز");
    } finally {
      setLoading(false);
    }
  };

  const changeStatus = async (status: string, reason?: string) => {
    try {
      await fetch(`${API_BASE}/api/reservations/${id}/status`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({ status, reason }),
      });
      message.success("تم تغيير حالة الحجز");
      loadReservation();
    } catch (error) {
      console.error(error);
      message.error("فشل تغيير الحالة");
    }
  };

  const payDeposit = async () => {
    if (!reservation) return;
    try {
      await fetch(`${API_BASE}/api/reservations/${id}/deposit`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({ amount: reservation.depositAmount }),
      });
      message.success("تم تسجيل دفع العربون");
      loadReservation();
    } catch (error) {
      console.error(error);
      message.error("فشل تسجيل الدفع");
    }
  };

  const extendReservation = async () => {
    const days = prompt("عدد أيام التمديد:");
    if (!days) return;
    const newDate = new Date(reservation?.expiresAt || Date.now());
    newDate.setDate(newDate.getDate() + parseInt(days));
    try {
      await fetch(`${API_BASE}/api/reservations/${id}/extend`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({ newExpiryDate: newDate.toISOString() }),
      });
      message.success("تم تمديد الحجز");
      loadReservation();
    } catch (error) {
      console.error(error);
      message.error("فشل تمديد الحجز");
    }
  };

  if (loading) {
    return <LoadingSkeleton type="form" rows={6} />;
  }

  if (!reservation) {
    return (
      <Card>
        <Empty description="الحجز غير موجود">
          <Button type="primary" onClick={() => navigate("/reservations")}>
            العودة للحجوزات
          </Button>
        </Empty>
      </Card>
    );
  }

  const cfg = STATUS_CONFIG[reservation.status] || STATUS_CONFIG.pending;
  const isExpired = reservation.expiresAt && new Date(reservation.expiresAt) < new Date() && reservation.status !== "completed" && reservation.status !== "cancelled";

  const itemColumns = [
    {
      title: "المنتج",
      dataIndex: "productName",
      key: "productName",
      render: (name: string) => <span style={{ fontWeight: 500 }}>{name}</span>,
    },
    {
      title: "الكمية",
      dataIndex: "quantity",
      key: "quantity",
      align: "center" as const,
    },
    {
      title: "السعر",
      dataIndex: "unitPrice",
      key: "unitPrice",
      align: "center" as const,
      render: (price: string) => <MoneyDisplay amount={Number(price)} />,
    },
    {
      title: "المجموع",
      dataIndex: "totalPrice",
      key: "totalPrice",
      align: "center" as const,
      render: (price: string) => <MoneyDisplay amount={Number(price)} size="default" />,
    },
  ];

  return (
    <div>
      <PageHeader
        title={reservation.reservationNumber}
        subtitle={reservation.customerName}
        breadcrumbs={[
          { title: "الحجوزات", href: "/reservations" },
          { title: "تفاصيل الحجز" },
        ]}
        extra={
          <Space wrap>
            <Button icon={<ArrowLeftOutlined />} onClick={() => navigate("/reservations")}>
              العودة
            </Button>
            {!["completed", "cancelled", "expired"].includes(reservation.status) && (
              <Button icon={<EditOutlined />} onClick={() => navigate(`/reservations/${id}/edit`)}>
                تعديل
              </Button>
            )}
            {reservation.status === "pending" && (
              <Button type="primary" icon={<CheckOutlined />} onClick={() => changeStatus("confirmed")}>
                تأكيد
              </Button>
            )}
            {reservation.status === "confirmed" && (
              <Button icon={<InboxOutlined />} onClick={() => changeStatus("ready")} style={{ background: "#ede9fe", color: "#7c3aed", borderColor: "#c4b5fd" }}>
                جاهز
              </Button>
            )}
            {(reservation.status === "confirmed" || reservation.status === "ready") && (
              <Button type="primary" icon={<CheckOutlined />} onClick={() => changeStatus("completed")} style={{ background: "#059669" }}>
                تسليم
              </Button>
            )}
            {reservation.status !== "completed" && reservation.status !== "cancelled" && (
              <>
                <Button icon={<ClockCircleOutlined />} onClick={extendReservation}>
                  تمديد
                </Button>
                <Popconfirm
                  title="تأكيد إلغاء الحجز"
                  description="هل أنت متأكد من إلغاء هذا الحجز؟"
                  onConfirm={() => changeStatus("cancelled", prompt("سبب الإلغاء:") || "")}
                  okText="نعم، إلغاء"
                  cancelText="لا"
                  okButtonProps={{ danger: true }}
                >
                  <Button danger icon={<CloseOutlined />}>
                    إلغاء
                  </Button>
                </Popconfirm>
              </>
            )}
          </Space>
        }
      />

      {/* Header Card */}
      <Card style={{ marginBottom: 24 }}>
        <Row gutter={[24, 16]} align="middle">
          <Col flex="auto">
            <Space direction="vertical" size={8}>
              <Space>
                <Tag color={cfg.color} style={{ fontSize: 14, padding: "4px 12px" }}>
                  {cfg.label}
                </Tag>
                {isExpired && (
                  <Tag color="red" style={{ fontSize: 14, padding: "4px 12px" }}>
                    منتهي الصلاحية
                  </Tag>
                )}
              </Space>
              <Space split={<span style={{ color: "#d1d5db" }}>|</span>}>
                {reservation.customerPhone && (
                  <span>
                    <PhoneOutlined /> {reservation.customerPhone}
                  </span>
                )}
                {reservation.customerEmail && (
                  <span>
                    <MailOutlined /> {reservation.customerEmail}
                  </span>
                )}
              </Space>
            </Space>
          </Col>
        </Row>
      </Card>

      {/* Stats */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={12} sm={6}>
          <Card>
            <Statistic
              title="إجمالي المبلغ"
              value={Number(reservation.totalAmount)}
              suffix="د.ع"
              valueStyle={{ color: "#2563eb" }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card style={{ background: reservation.depositPaid ? "#d1fae5" : "#fef3c7" }}>
            <Statistic
              title={`العربون ${reservation.depositPaid ? "✓ مدفوع" : "(غير مدفوع)"}`}
              value={Number(reservation.depositAmount)}
              suffix="د.ع"
              valueStyle={{ color: reservation.depositPaid ? "#059669" : "#d97706" }}
            />
            {!reservation.depositPaid && reservation.status !== "cancelled" && reservation.status !== "completed" && (
              <Button
                size="small"
                type="primary"
                icon={<DollarOutlined />}
                onClick={payDeposit}
                style={{ marginTop: 8, background: "#059669" }}
              >
                تسجيل الدفع
              </Button>
            )}
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card>
            <Statistic
              title="تاريخ الحجز"
              value={new Date(reservation.createdAt).toLocaleDateString("ar-IQ")}
              valueStyle={{ fontSize: 16 }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card style={{ background: isExpired ? "#fee2e2" : undefined }}>
            <Statistic
              title="ينتهي في"
              value={reservation.expiresAt ? new Date(reservation.expiresAt).toLocaleDateString("ar-IQ") : "-"}
              valueStyle={{ fontSize: 16, color: isExpired ? "#dc2626" : undefined }}
            />
          </Card>
        </Col>
      </Row>

      {/* Products */}
      <Card title={`📦 المنتجات المحجوزة (${reservation.items.length})`} style={{ marginBottom: 24 }}>
        <Table
          columns={itemColumns}
          dataSource={reservation.items}
          rowKey="id"
          pagination={false}
          size="small"
        />
      </Card>

      {/* Notes */}
      {(reservation.notes || reservation.cancellationReason) && (
        <Card style={{ marginBottom: 24 }}>
          {reservation.notes && (
            <Alert
              message="ملاحظات"
              description={reservation.notes}
              type="info"
              showIcon
              style={{ marginBottom: reservation.cancellationReason ? 16 : 0 }}
            />
          )}
          {reservation.cancellationReason && (
            <Alert
              message="سبب الإلغاء"
              description={reservation.cancellationReason}
              type="error"
              showIcon
            />
          )}
        </Card>
      )}

      {/* Activity Log */}
      <Card title="📜 سجل النشاط">
        <Timeline
          items={reservation.activities.map((act) => ({
            children: (
              <div>
                <div>{act.description}</div>
                <div style={{ fontSize: 12, color: "#9ca3af" }}>
                  <DateDisplay date={act.createdAt} format="datetime" />
                </div>
              </div>
            ),
          }))}
        />
      </Card>
    </div>
  );
}
