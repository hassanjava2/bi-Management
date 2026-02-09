/**
 * صفحة تعديل الحجز
 */
import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Card, Form, Input, InputNumber, DatePicker, Button, message, Space, Alert, Tag, Row, Col } from "antd";
import { SaveOutlined, ArrowRightOutlined } from "@ant-design/icons";
import { PageHeader, LoadingSkeleton, MoneyDisplay } from "../components/shared";
import { API_BASE, getAuthHeaders } from "../utils/api";
import dayjs from "dayjs";

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  pending: { label: "بانتظار التأكيد", color: "gold" },
  confirmed: { label: "مؤكد", color: "blue" },
  ready: { label: "جاهز للاستلام", color: "purple" },
  completed: { label: "مكتمل", color: "success" },
  cancelled: { label: "ملغي", color: "error" },
  expired: { label: "منتهي", color: "default" },
};

export default function ReservationEdit() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [reservationNumber, setReservationNumber] = useState("");
  const [status, setStatus] = useState("");
  const [totalAmount, setTotalAmount] = useState("0");
  const [isEditable, setIsEditable] = useState(true);

  useEffect(() => {
    document.title = "تعديل الحجز | BI Management v3";
  }, []);

  useEffect(() => {
    if (!id) {
      setError("معرف الحجز مطلوب");
      setLoading(false);
      return;
    }

    fetch(`${API_BASE}/api/reservations/${id}`, { headers: getAuthHeaders() })
      .then((r) => {
        if (!r.ok) throw new Error("الحجز غير موجود");
        return r.json();
      })
      .then((data) => {
        setReservationNumber(data.reservationNumber || "");
        setStatus(data.status || "pending");
        setTotalAmount(data.totalAmount || "0");
        setIsEditable(!["completed", "cancelled", "expired"].includes(data.status || ""));

        form.setFieldsValue({
          customerName: data.customerName || "",
          customerPhone: data.customerPhone || "",
          customerEmail: data.customerEmail || "",
          depositAmount: parseFloat(data.depositAmount || "0"),
          expiresAt: data.expiresAt ? dayjs(data.expiresAt) : undefined,
          notes: data.notes || "",
        });
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [id, form]);

  const handleSubmit = async (values: Record<string, unknown>) => {
    setSubmitting(true);
    try {
      const res = await fetch(`${API_BASE}/api/reservations/${id}`, {
        method: "PUT",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          customerName: values.customerName,
          customerPhone: values.customerPhone || null,
          customerEmail: values.customerEmail || null,
          depositAmount: values.depositAmount ? String(values.depositAmount) : null,
          expiresAt: values.expiresAt ? (values.expiresAt as dayjs.Dayjs).toISOString() : null,
          notes: values.notes || null,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "فشل تحديث الحجز");
      }

      message.success("تم تحديث الحجز بنجاح");
      navigate(`/reservations/${id}`);
    } catch (err: unknown) {
      message.error(err instanceof Error ? err.message : "حدث خطأ");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div>
        <PageHeader
          title="تعديل الحجز"
          breadcrumbs={[
            { title: "الحجوزات", href: "/reservations" },
            { title: "تعديل" },
          ]}
        />
        <LoadingSkeleton type="form" rows={6} />
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <PageHeader
          title="تعديل الحجز"
          breadcrumbs={[
            { title: "الحجوزات", href: "/reservations" },
            { title: "خطأ" },
          ]}
        />
        <Alert
          message="خطأ"
          description={error}
          type="error"
          showIcon
          action={
            <Button type="link" onClick={() => navigate("/reservations")}>
              العودة للحجوزات
            </Button>
          }
        />
      </div>
    );
  }

  const statusConfig = STATUS_CONFIG[status] || STATUS_CONFIG.pending;

  return (
    <div>
      <PageHeader
        title={`تعديل الحجز: ${reservationNumber}`}
        breadcrumbs={[
          { title: "الحجوزات", href: "/reservations" },
          { title: reservationNumber, href: `/reservations/${id}` },
          { title: "تعديل" },
        ]}
        extra={
          <Space>
            <Tag color={statusConfig.color}>{statusConfig.label}</Tag>
            <Button icon={<ArrowRightOutlined />} onClick={() => navigate(`/reservations/${id}`)}>
              العودة للتفاصيل
            </Button>
          </Space>
        }
      />

      {!isEditable && (
        <Alert
          message="لا يمكن التعديل"
          description="لا يمكن تعديل حجز مكتمل أو ملغي أو منتهي"
          type="warning"
          showIcon
          style={{ marginBottom: 24 }}
        />
      )}

      <Row gutter={24}>
        <Col xs={24} lg={16}>
          <Card style={{ marginBottom: 24 }}>
            <Form form={form} layout="vertical" onFinish={handleSubmit}>
              <Form.Item
                name="customerName"
                label="اسم العميل"
                rules={[{ required: true, message: "اسم العميل مطلوب" }]}
              >
                <Input placeholder="اسم العميل" disabled={!isEditable} />
              </Form.Item>

              <Row gutter={16}>
                <Col xs={24} sm={12}>
                  <Form.Item name="customerPhone" label="رقم الهاتف">
                    <Input placeholder="رقم الهاتف" disabled={!isEditable} />
                  </Form.Item>
                </Col>
                <Col xs={24} sm={12}>
                  <Form.Item name="customerEmail" label="البريد الإلكتروني">
                    <Input type="email" placeholder="البريد الإلكتروني" disabled={!isEditable} />
                  </Form.Item>
                </Col>
              </Row>

              <Row gutter={16}>
                <Col xs={24} sm={12}>
                  <Form.Item name="depositAmount" label="مبلغ العربون">
                    <InputNumber
                      style={{ width: "100%" }}
                      min={0}
                      placeholder="مبلغ العربون"
                      formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")}
                      disabled={!isEditable}
                    />
                  </Form.Item>
                </Col>
                <Col xs={24} sm={12}>
                  <Form.Item name="expiresAt" label="تاريخ انتهاء الحجز">
                    <DatePicker
                      style={{ width: "100%" }}
                      showTime
                      placeholder="تاريخ الانتهاء"
                      disabled={!isEditable}
                    />
                  </Form.Item>
                </Col>
              </Row>

              <Form.Item name="notes" label="ملاحظات">
                <Input.TextArea rows={3} placeholder="ملاحظات على الحجز..." disabled={!isEditable} />
              </Form.Item>

              {isEditable && (
                <Space>
                  <Button onClick={() => navigate(`/reservations/${id}`)}>إلغاء</Button>
                  <Button type="primary" htmlType="submit" icon={<SaveOutlined />} loading={submitting}>
                    حفظ التعديلات
                  </Button>
                </Space>
              )}
            </Form>
          </Card>
        </Col>

        <Col xs={24} lg={8}>
          <Card title="معلومات الحجز">
            <div style={{ marginBottom: 16 }}>
              <div style={{ color: "#6b7280", fontSize: "0.85rem" }}>إجمالي الحجز</div>
              <div style={{ fontSize: "1.5rem", fontWeight: 600 }}>
                <MoneyDisplay amount={totalAmount} />
              </div>
            </div>
            <div>
              <div style={{ color: "#6b7280", fontSize: "0.85rem" }}>الحالة</div>
              <Tag color={statusConfig.color} style={{ marginTop: 4 }}>
                {statusConfig.label}
              </Tag>
            </div>
          </Card>
        </Col>
      </Row>
    </div>
  );
}
