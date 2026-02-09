/**
 * صفحة تعديل المرتجع
 */
import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, Form, Input, Select, Button, message, Space, Alert, Tag } from "antd";
import { SaveOutlined, ArrowRightOutlined } from "@ant-design/icons";
import { PageHeader, LoadingSkeleton } from "../components/shared";
import { API_BASE, getAuthHeaders } from "../utils/api";

const RETURN_TYPES = [
  { value: "defective", label: "معيب" },
  { value: "warranty", label: "ضمان" },
  { value: "exchange", label: "استبدال" },
  { value: "other", label: "أخرى" },
];

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  pending: { label: "معلق", color: "gold" },
  sent: { label: "تم الإرسال", color: "blue" },
  received: { label: "تم الاستلام", color: "purple" },
  resolved: { label: "مُعالج", color: "green" },
  cancelled: { label: "ملغي", color: "default" },
};

export default function ReturnEdit() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [returnNumber, setReturnNumber] = useState("");
  const [status, setStatus] = useState("");
  const [supplierName, setSupplierName] = useState("");
  const [isEditable, setIsEditable] = useState(true);

  useEffect(() => {
    document.title = "تعديل المرتجع | BI Management v3";
  }, []);

  useEffect(() => {
    if (!id) {
      setError("معرف المرتجع مطلوب");
      setLoading(false);
      return;
    }

    fetch(`${API_BASE}/api/returns/${id}`, { headers: getAuthHeaders() })
      .then((r) => {
        if (!r.ok) throw new Error("المرتجع غير موجود");
        return r.json();
      })
      .then((data) => {
        setReturnNumber(data.returnNumber || "");
        setStatus(data.status || "pending");
        setSupplierName(data.supplierName || "");
        setIsEditable(data.status === "pending");

        form.setFieldsValue({
          returnType: data.returnType || "defective",
          notes: data.notes || "",
          internalNotes: data.internalNotes || "",
        });
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [id, form]);

  const handleSubmit = async (values: Record<string, unknown>) => {
    setSubmitting(true);
    try {
      const res = await fetch(`${API_BASE}/api/returns/${id}`, {
        method: "PUT",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          returnType: values.returnType,
          notes: values.notes || null,
          internalNotes: values.internalNotes || null,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "فشل تحديث المرتجع");
      }

      message.success("تم تحديث المرتجع بنجاح");
      navigate(`/returns/${id}`);
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
          title="تعديل المرتجع"
          breadcrumbs={[
            { title: "المرتجعات", href: "/returns" },
            { title: "تعديل" },
          ]}
        />
        <LoadingSkeleton type="form" rows={5} />
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <PageHeader
          title="تعديل المرتجع"
          breadcrumbs={[
            { title: "المرتجعات", href: "/returns" },
            { title: "خطأ" },
          ]}
        />
        <Alert
          message="خطأ"
          description={error}
          type="error"
          showIcon
          action={
            <Button type="link" onClick={() => navigate("/returns")}>
              العودة للمرتجعات
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
        title={`تعديل المرتجع: ${returnNumber}`}
        subtitle={supplierName}
        breadcrumbs={[
          { title: "المرتجعات", href: "/returns" },
          { title: returnNumber, href: `/returns/${id}` },
          { title: "تعديل" },
        ]}
        extra={
          <Space>
            <Tag color={statusConfig.color}>{statusConfig.label}</Tag>
            <Button icon={<ArrowRightOutlined />} onClick={() => navigate(`/returns/${id}`)}>
              العودة للتفاصيل
            </Button>
          </Space>
        }
      />

      {!isEditable && (
        <Alert
          message="لا يمكن التعديل"
          description="لا يمكن تعديل مرتجع تم إرساله بالفعل. يمكنك فقط تعديل المرتجعات المعلقة."
          type="warning"
          showIcon
          style={{ marginBottom: 24 }}
        />
      )}

      <Card style={{ maxWidth: 700 }}>
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item
            name="returnType"
            label="نوع المرتجع"
            rules={[{ required: true, message: "نوع المرتجع مطلوب" }]}
          >
            <Select placeholder="اختر نوع المرتجع" disabled={!isEditable}>
              {RETURN_TYPES.map((type) => (
                <Select.Option key={type.value} value={type.value}>
                  {type.label}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item name="notes" label="ملاحظات (للمورد)">
            <Input.TextArea
              rows={3}
              placeholder="ملاحظات ستظهر في المرتجع..."
              disabled={!isEditable}
            />
          </Form.Item>

          <Form.Item name="internalNotes" label="ملاحظات داخلية">
            <Input.TextArea
              rows={3}
              placeholder="ملاحظات داخلية للفريق..."
              disabled={!isEditable}
            />
          </Form.Item>

          {isEditable && (
            <Space>
              <Button onClick={() => navigate(`/returns/${id}`)}>إلغاء</Button>
              <Button type="primary" htmlType="submit" icon={<SaveOutlined />} loading={submitting}>
                حفظ التعديلات
              </Button>
            </Space>
          )}
        </Form>
      </Card>
    </div>
  );
}
