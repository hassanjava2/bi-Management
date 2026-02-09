/**
 * صفحة تعديل العرض الترويجي
 */
import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Row, Col, Card, Form, Input, Select, Button, InputNumber, DatePicker, message, Space, Checkbox, Alert, Tag } from "antd";
import { SaveOutlined, ArrowRightOutlined } from "@ant-design/icons";
import { PageHeader, LoadingSkeleton } from "../components/shared";
import { API_BASE, getAuthHeaders } from "../utils/api";
import dayjs from "dayjs";

const PROMO_TYPES = [
  { value: "percentage", label: "خصم نسبة مئوية" },
  { value: "fixed_amount", label: "خصم مبلغ ثابت" },
  { value: "buy_x_get_y", label: "اشتري واحصل" },
  { value: "free_shipping", label: "شحن مجاني" },
];

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  draft: { label: "مسودة", color: "default" },
  active: { label: "نشط", color: "success" },
  scheduled: { label: "مجدول", color: "processing" },
  expired: { label: "منتهي", color: "error" },
  paused: { label: "متوقف", color: "warning" },
};

const BADGE_COLORS = ["#dc2626", "#d97706", "#059669", "#2563eb", "#7c3aed"];

export default function PromotionEdit() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [promotionName, setPromotionName] = useState("");
  const [status, setStatus] = useState("");
  const [promoType, setPromoType] = useState("percentage");
  const [badgeColor, setBadgeColor] = useState("#dc2626");

  const badgeText = Form.useWatch("badgeText", form);

  useEffect(() => {
    document.title = "تعديل العرض | BI Management v3";
  }, []);

  useEffect(() => {
    if (!id) {
      setError("معرف العرض مطلوب");
      setLoading(false);
      return;
    }

    fetch(`${API_BASE}/api/promotions/${id}`, { headers: getAuthHeaders() })
      .then((r) => {
        if (!r.ok) throw new Error("العرض غير موجود");
        return r.json();
      })
      .then((data) => {
        setPromotionName(data.name || "");
        setStatus(data.status || "draft");
        setPromoType(data.type || "percentage");
        setBadgeColor(data.badgeColor || "#dc2626");

        form.setFieldsValue({
          name: data.name || "",
          code: data.code || "",
          description: data.description || "",
          discountValue: data.discountValue || 0,
          maxDiscountAmount: data.maxDiscountAmount || undefined,
          minimumOrderAmount: data.minimumOrderAmount || undefined,
          usageLimit: data.usageLimit || undefined,
          usageLimitPerCustomer: data.usageLimitPerCustomer || undefined,
          buyQuantity: data.buyQuantity || undefined,
          getQuantity: data.getQuantity || undefined,
          startDate: data.startDate ? dayjs(data.startDate) : undefined,
          endDate: data.endDate ? dayjs(data.endDate) : undefined,
          isAutomatic: data.isAutomatic === 1,
          stackable: data.stackable === 1,
          badgeText: data.badgeText || "",
          status: data.status || "draft",
        });
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [id, form]);

  const handleSubmit = async (values: Record<string, unknown>) => {
    setSaving(true);
    try {
      const res = await fetch(`${API_BASE}/api/promotions/${id}`, {
        method: "PATCH",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          name: values.name,
          code: (values.code as string)?.toUpperCase() || null,
          description: values.description || null,
          type: promoType,
          discountValue: values.discountValue || null,
          maxDiscountAmount: values.maxDiscountAmount || null,
          minimumOrderAmount: values.minimumOrderAmount || null,
          usageLimit: values.usageLimit || null,
          usageLimitPerCustomer: values.usageLimitPerCustomer || null,
          buyQuantity: values.buyQuantity || null,
          getQuantity: values.getQuantity || null,
          startDate: values.startDate ? (values.startDate as dayjs.Dayjs).format("YYYY-MM-DD") : null,
          endDate: values.endDate ? (values.endDate as dayjs.Dayjs).format("YYYY-MM-DD") : null,
          isAutomatic: values.isAutomatic || false,
          stackable: values.stackable || false,
          badgeText: values.badgeText || null,
          badgeColor: badgeColor,
          status: values.status,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "فشل تحديث العرض");
      }

      message.success("تم تحديث العرض بنجاح");
      navigate(`/promotions/${id}`);
    } catch (err: unknown) {
      message.error(err instanceof Error ? err.message : "حدث خطأ");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div>
        <PageHeader
          title="تعديل العرض"
          breadcrumbs={[
            { title: "العروض", href: "/promotions" },
            { title: "تعديل" },
          ]}
        />
        <LoadingSkeleton type="form" rows={10} />
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <PageHeader
          title="تعديل العرض"
          breadcrumbs={[
            { title: "العروض", href: "/promotions" },
            { title: "خطأ" },
          ]}
        />
        <Alert
          message="خطأ"
          description={error}
          type="error"
          showIcon
          action={
            <Button type="link" onClick={() => navigate("/promotions")}>
              العودة للعروض
            </Button>
          }
        />
      </div>
    );
  }

  const statusConfig = STATUS_CONFIG[status] || STATUS_CONFIG.draft;

  return (
    <div>
      <PageHeader
        title={`تعديل العرض: ${promotionName}`}
        breadcrumbs={[
          { title: "العروض", href: "/promotions" },
          { title: promotionName, href: `/promotions/${id}` },
          { title: "تعديل" },
        ]}
        extra={
          <Space>
            <Tag color={statusConfig.color}>{statusConfig.label}</Tag>
            <Button icon={<ArrowRightOutlined />} onClick={() => navigate(`/promotions/${id}`)}>
              العودة للتفاصيل
            </Button>
          </Space>
        }
      />

      <Form form={form} layout="vertical" onFinish={handleSubmit}>
        {/* البيانات الأساسية */}
        <Card title="البيانات الأساسية" style={{ marginBottom: 24 }}>
          <Row gutter={16}>
            <Col xs={24} md={12}>
              <Form.Item
                name="name"
                label="اسم العرض"
                rules={[{ required: true, message: "اسم العرض مطلوب" }]}
              >
                <Input placeholder="مثال: خصم الصيف" />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item name="code" label="كود الخصم">
                <Input placeholder="مثال: SUMMER25" style={{ textTransform: "uppercase" }} />
              </Form.Item>
            </Col>
            <Col xs={24}>
              <Form.Item name="description" label="الوصف">
                <Input.TextArea rows={2} placeholder="وصف العرض..." />
              </Form.Item>
            </Col>
          </Row>
        </Card>

        {/* نوع الخصم */}
        <Card title="نوع الخصم" style={{ marginBottom: 24 }}>
          <Row gutter={16}>
            <Col xs={24} md={8}>
              <Form.Item label="نوع العرض">
                <Select value={promoType} onChange={setPromoType}>
                  {PROMO_TYPES.map((t) => (
                    <Select.Option key={t.value} value={t.value}>
                      {t.label}
                    </Select.Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            {promoType === "percentage" && (
              <>
                <Col xs={24} md={8}>
                  <Form.Item name="discountValue" label="نسبة الخصم (%)">
                    <InputNumber style={{ width: "100%" }} min={0} max={100} placeholder="مثال: 25" />
                  </Form.Item>
                </Col>
                <Col xs={24} md={8}>
                  <Form.Item name="maxDiscountAmount" label="الحد الأقصى للخصم">
                    <InputNumber style={{ width: "100%" }} min={0} placeholder="اختياري" />
                  </Form.Item>
                </Col>
              </>
            )}
            {promoType === "fixed_amount" && (
              <Col xs={24} md={8}>
                <Form.Item name="discountValue" label="مبلغ الخصم">
                  <InputNumber style={{ width: "100%" }} min={0} placeholder="مثال: 50" />
                </Form.Item>
              </Col>
            )}
            {promoType === "buy_x_get_y" && (
              <>
                <Col xs={24} md={8}>
                  <Form.Item name="buyQuantity" label="اشتري (كمية)">
                    <InputNumber style={{ width: "100%" }} min={1} placeholder="مثال: 2" />
                  </Form.Item>
                </Col>
                <Col xs={24} md={8}>
                  <Form.Item name="getQuantity" label="واحصل على (كمية)">
                    <InputNumber style={{ width: "100%" }} min={1} placeholder="مثال: 1" />
                  </Form.Item>
                </Col>
              </>
            )}
          </Row>
        </Card>

        {/* الشروط والحدود */}
        <Card title="الشروط والحدود" style={{ marginBottom: 24 }}>
          <Row gutter={16}>
            <Col xs={24} md={8}>
              <Form.Item name="minimumOrderAmount" label="الحد الأدنى للطلب">
                <InputNumber style={{ width: "100%" }} min={0} placeholder="اختياري" />
              </Form.Item>
            </Col>
            <Col xs={24} md={8}>
              <Form.Item name="usageLimit" label="عدد مرات الاستخدام الكلي">
                <InputNumber style={{ width: "100%" }} min={0} placeholder="غير محدود" />
              </Form.Item>
            </Col>
            <Col xs={24} md={8}>
              <Form.Item name="usageLimitPerCustomer" label="لكل عميل">
                <InputNumber style={{ width: "100%" }} min={0} placeholder="غير محدود" />
              </Form.Item>
            </Col>
          </Row>
        </Card>

        {/* الفترة والحالة */}
        <Card title="الفترة والحالة" style={{ marginBottom: 24 }}>
          <Row gutter={16}>
            <Col xs={24} md={8}>
              <Form.Item name="startDate" label="تاريخ البداية">
                <DatePicker style={{ width: "100%" }} placeholder="اختر التاريخ" />
              </Form.Item>
            </Col>
            <Col xs={24} md={8}>
              <Form.Item
                name="endDate"
                label="تاريخ الانتهاء"
                rules={[{ required: true, message: "تاريخ الانتهاء مطلوب" }]}
              >
                <DatePicker style={{ width: "100%" }} placeholder="اختر التاريخ" />
              </Form.Item>
            </Col>
            <Col xs={24} md={8}>
              <Form.Item name="status" label="الحالة">
                <Select>
                  <Select.Option value="draft">مسودة</Select.Option>
                  <Select.Option value="active">نشط</Select.Option>
                  <Select.Option value="paused">متوقف</Select.Option>
                </Select>
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item name="isAutomatic" valuePropName="checked">
                <Checkbox>تطبيق تلقائي (بدون كود)</Checkbox>
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item name="stackable" valuePropName="checked">
                <Checkbox>قابل للدمج مع عروض أخرى</Checkbox>
              </Form.Item>
            </Col>
          </Row>
        </Card>

        {/* شارة العرض */}
        <Card title="شارة العرض (اختياري)" style={{ marginBottom: 24 }}>
          <Row gutter={16} align="middle">
            <Col xs={24} md={8}>
              <Form.Item name="badgeText" label="نص الشارة">
                <Input placeholder="مثال: خصم 25%" maxLength={20} />
              </Form.Item>
            </Col>
            <Col xs={24} md={8}>
              <Form.Item label="لون الشارة">
                <Space>
                  {BADGE_COLORS.map((color) => (
                    <div
                      key={color}
                      onClick={() => setBadgeColor(color)}
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: "50%",
                        backgroundColor: color,
                        cursor: "pointer",
                        border: badgeColor === color ? "3px solid #1890ff" : "2px solid #e5e7eb",
                      }}
                    />
                  ))}
                </Space>
              </Form.Item>
            </Col>
            <Col xs={24} md={8}>
              {badgeText && (
                <div style={{ paddingTop: 8 }}>
                  <span
                    style={{
                      backgroundColor: badgeColor,
                      color: "#fff",
                      padding: "4px 12px",
                      borderRadius: 4,
                      fontSize: "0.875rem",
                      fontWeight: 600,
                    }}
                  >
                    {badgeText}
                  </span>
                </div>
              )}
            </Col>
          </Row>
        </Card>

        {/* أزرار */}
        <Space style={{ display: "flex", justifyContent: "flex-end" }}>
          <Button size="large" onClick={() => navigate(`/promotions/${id}`)} icon={<ArrowRightOutlined />}>
            إلغاء
          </Button>
          <Button type="primary" size="large" htmlType="submit" loading={saving} icon={<SaveOutlined />}>
            حفظ التعديلات
          </Button>
        </Space>
      </Form>
    </div>
  );
}
