/**
 * صفحة إنشاء عرض جديد
 */
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Row, Col, Card, Form, Input, Select, Button, InputNumber, DatePicker, message, Space, Checkbox } from "antd";
import { SaveOutlined, ArrowRightOutlined } from "@ant-design/icons";
import { PageHeader } from "../components/shared";
import { API_BASE, getAuthHeaders } from "../utils/api";
import dayjs from "dayjs";

const PROMO_TYPES = [
  { value: "percentage", label: "خصم نسبة مئوية", icon: "%", desc: "خصم بنسبة من إجمالي الطلب" },
  { value: "fixed_amount", label: "خصم مبلغ ثابت", icon: "💵", desc: "خصم مبلغ محدد من الطلب" },
  { value: "buy_x_get_y", label: "اشتري واحصل", icon: "🎁", desc: "اشتري X واحصل على Y مجاناً" },
  { value: "free_shipping", label: "شحن مجاني", icon: "🚚", desc: "إلغاء رسوم الشحن" },
];

const BADGE_COLORS = ["#dc2626", "#d97706", "#059669", "#2563eb", "#7c3aed"];

export default function PromotionCreate() {
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const [saving, setSaving] = useState(false);
  const [promoType, setPromoType] = useState("percentage");
  const [badgeColor, setBadgeColor] = useState("#dc2626");

  const badgeText = Form.useWatch("badgeText", form);

  const handleSubmit = async (values: any, status: string) => {
    if (!values.name?.trim()) {
      message.error("اسم العرض مطلوب");
      return;
    }
    if (!values.endDate) {
      message.error("تاريخ الانتهاء مطلوب");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(`${API_BASE}/api/promotions`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          name: values.name,
          code: values.code?.toUpperCase() || null,
          description: values.description || null,
          type: promoType,
          discountValue: values.discountValue || null,
          maxDiscountAmount: values.maxDiscountAmount || null,
          minimumOrderAmount: values.minimumOrderAmount || null,
          usageLimit: values.usageLimit || null,
          usageLimitPerCustomer: values.usageLimitPerCustomer || null,
          buyQuantity: values.buyQuantity || null,
          getQuantity: values.getQuantity || null,
          startDate: values.startDate?.format("YYYY-MM-DD"),
          endDate: values.endDate?.format("YYYY-MM-DD"),
          isAutomatic: values.isAutomatic || false,
          stackable: values.stackable || false,
          appliesTo: "all",
          status: status,
          badgeText: values.badgeText || null,
          badgeColor: badgeColor,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        message.success("تم إنشاء العرض بنجاح");
        navigate(`/promotions/${data.id}`);
      } else {
        const err = await res.json();
        message.error(err.error || "فشل في إنشاء العرض");
      }
    } catch (err) {
      message.error("حدث خطأ في الاتصال");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="عرض ترويجي جديد"
        subtitle="إنشاء عرض ترويجي أو كود خصم"
        breadcrumbs={[
          { label: "الرئيسية", path: "/" },
          { label: "العروض الترويجية", path: "/promotions" },
          { label: "عرض جديد" },
        ]}
      />

      <Form
        form={form}
        layout="vertical"
        initialValues={{
          startDate: dayjs(),
          isAutomatic: false,
          stackable: false,
        }}
      >
        {/* نوع العرض */}
        <Card title="نوع العرض" style={{ marginBottom: 24 }}>
          <Row gutter={16}>
            {PROMO_TYPES.map((type) => (
              <Col xs={24} sm={12} key={type.value}>
                <div
                  onClick={() => setPromoType(type.value)}
                  style={{
                    padding: "1rem",
                    border: promoType === type.value ? "2px solid #3b82f6" : "1px solid #e5e7eb",
                    borderRadius: "12px",
                    background: promoType === type.value ? "#eff6ff" : "#fff",
                    cursor: "pointer",
                    marginBottom: "0.75rem",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                    <span style={{ fontSize: "1.5rem" }}>{type.icon}</span>
                    <div>
                      <div style={{ fontWeight: 600 }}>{type.label}</div>
                      <div style={{ fontSize: "0.8rem", color: "#6b7280" }}>{type.desc}</div>
                    </div>
                  </div>
                </div>
              </Col>
            ))}
          </Row>
        </Card>

        {/* التفاصيل الأساسية */}
        <Card title="التفاصيل الأساسية" style={{ marginBottom: 24 }}>
          <Row gutter={16}>
            <Col xs={24} md={12}>
              <Form.Item
                label="اسم العرض"
                name="name"
                rules={[{ required: true, message: "اسم العرض مطلوب" }]}
              >
                <Input placeholder="مثال: عرض نهاية السنة" />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item label="كود العرض (اختياري)" name="code">
                <Input
                  placeholder="مثال: NEWYEAR2026"
                  style={{ fontFamily: "monospace", textTransform: "uppercase" }}
                />
              </Form.Item>
            </Col>
            <Col xs={24}>
              <Form.Item label="الوصف" name="description">
                <Input.TextArea rows={2} placeholder="وصف العرض للعملاء..." />
              </Form.Item>
            </Col>
          </Row>
        </Card>

        {/* قيمة الخصم */}
        <Card title="قيمة الخصم" style={{ marginBottom: 24 }}>
          {(promoType === "percentage" || promoType === "fixed_amount") && (
            <Row gutter={16}>
              <Col xs={24} md={8}>
                <Form.Item
                  label={promoType === "percentage" ? "نسبة الخصم %" : "مبلغ الخصم"}
                  name="discountValue"
                >
                  <InputNumber
                    style={{ width: "100%" }}
                    placeholder={promoType === "percentage" ? "مثال: 20" : "مثال: 50000"}
                    min={0}
                    max={promoType === "percentage" ? 100 : undefined}
                  />
                </Form.Item>
              </Col>
              {promoType === "percentage" && (
                <Col xs={24} md={8}>
                  <Form.Item label="حد أقصى للخصم" name="maxDiscountAmount">
                    <InputNumber
                      style={{ width: "100%" }}
                      placeholder="اختياري"
                      min={0}
                      formatter={value => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")}
                    />
                  </Form.Item>
                </Col>
              )}
              <Col xs={24} md={8}>
                <Form.Item label="الحد الأدنى للطلب" name="minimumOrderAmount">
                  <InputNumber
                    style={{ width: "100%" }}
                    placeholder="اختياري"
                    min={0}
                    formatter={value => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")}
                  />
                </Form.Item>
              </Col>
            </Row>
          )}

          {promoType === "buy_x_get_y" && (
            <Row gutter={16}>
              <Col xs={24} md={12}>
                <Form.Item label="اشتري (كمية)" name="buyQuantity">
                  <InputNumber style={{ width: "100%" }} placeholder="مثال: 2" min={1} />
                </Form.Item>
              </Col>
              <Col xs={24} md={12}>
                <Form.Item label="واحصل على (كمية مجانية)" name="getQuantity">
                  <InputNumber style={{ width: "100%" }} placeholder="مثال: 1" min={1} />
                </Form.Item>
              </Col>
            </Row>
          )}

          {promoType === "free_shipping" && (
            <div style={{ textAlign: "center", padding: "1rem", color: "#6b7280" }}>
              سيتم إلغاء رسوم الشحن تلقائياً عند تطبيق هذا العرض
            </div>
          )}
        </Card>

        {/* الصلاحية والحدود */}
        <Card title="الصلاحية والحدود" style={{ marginBottom: 24 }}>
          <Row gutter={16}>
            <Col xs={24} md={12}>
              <Form.Item
                label="تاريخ البداية"
                name="startDate"
                rules={[{ required: true, message: "تاريخ البداية مطلوب" }]}
              >
                <DatePicker style={{ width: "100%" }} placeholder="اختر التاريخ" />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item
                label="تاريخ الانتهاء"
                name="endDate"
                rules={[{ required: true, message: "تاريخ الانتهاء مطلوب" }]}
              >
                <DatePicker style={{ width: "100%" }} placeholder="اختر التاريخ" />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item label="حد الاستخدام الكلي" name="usageLimit">
                <InputNumber style={{ width: "100%" }} placeholder="غير محدود" min={1} />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item label="حد الاستخدام لكل عميل" name="usageLimitPerCustomer">
                <InputNumber style={{ width: "100%" }} placeholder="غير محدود" min={1} />
              </Form.Item>
            </Col>
          </Row>
        </Card>

        {/* الخيارات */}
        <Card title="الخيارات" style={{ marginBottom: 24 }}>
          <Row gutter={16}>
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

        {/* الشارة */}
        <Card title="شارة العرض (للعرض على المنتجات)" style={{ marginBottom: 24 }}>
          <Row gutter={16}>
            <Col xs={24} md={12}>
              <Form.Item label="نص الشارة" name="badgeText">
                <Input placeholder="مثال: خصم 20%" />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item label="لون الشارة">
                <Space>
                  {BADGE_COLORS.map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setBadgeColor(color)}
                      style={{
                        width: "36px",
                        height: "36px",
                        borderRadius: "8px",
                        background: color,
                        border: badgeColor === color ? "3px solid #000" : "none",
                        cursor: "pointer",
                      }}
                    />
                  ))}
                </Space>
              </Form.Item>
            </Col>
          </Row>
          {badgeText && (
            <div style={{ marginTop: "0.5rem" }}>
              <span
                style={{
                  padding: "0.25rem 0.5rem",
                  borderRadius: "4px",
                  background: badgeColor,
                  color: "#fff",
                  fontSize: "0.8rem",
                  fontWeight: 600,
                }}
              >
                {badgeText}
              </span>
            </div>
          )}
        </Card>

        {/* أزرار */}
        <Space style={{ display: "flex", justifyContent: "flex-end" }}>
          <Button size="large" onClick={() => navigate("/promotions")} icon={<ArrowRightOutlined />}>
            إلغاء
          </Button>
          <Button
            size="large"
            onClick={() => form.validateFields().then(values => handleSubmit(values, "draft"))}
            loading={saving}
          >
            حفظ كمسودة
          </Button>
          <Button
            type="primary"
            size="large"
            onClick={() => form.validateFields().then(values => handleSubmit(values, "active"))}
            loading={saving}
            icon={<SaveOutlined />}
            style={{ background: "#059669" }}
          >
            إنشاء وتفعيل
          </Button>
        </Space>
      </Form>
    </div>
  );
}
