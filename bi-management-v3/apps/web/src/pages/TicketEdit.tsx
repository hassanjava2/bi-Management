/**
 * صفحة تعديل التذكرة
 */
import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Card, Form, Input, Select, Button, message, Space, Alert, Tag, Row, Col } from "antd";
import { SaveOutlined, ArrowRightOutlined } from "@ant-design/icons";
import { PageHeader, LoadingSkeleton } from "../components/shared";
import { API_BASE, getAuthHeaders } from "../utils/api";

const CATEGORIES = [
  { value: "technical", label: "دعم فني" },
  { value: "sales", label: "مبيعات" },
  { value: "warranty", label: "ضمان" },
  { value: "complaint", label: "شكوى" },
  { value: "inquiry", label: "استفسار" },
  { value: "other", label: "أخرى" },
];

const PRIORITIES = [
  { value: "low", label: "منخفضة", color: "green" },
  { value: "medium", label: "متوسطة", color: "gold" },
  { value: "high", label: "عالية", color: "orange" },
  { value: "urgent", label: "عاجلة", color: "red" },
];

const STATUSES = [
  { value: "open", label: "مفتوحة", color: "blue" },
  { value: "in_progress", label: "قيد المعالجة", color: "processing" },
  { value: "waiting_customer", label: "بانتظار العميل", color: "warning" },
  { value: "resolved", label: "تم الحل", color: "success" },
  { value: "closed", label: "مغلقة", color: "default" },
];

export default function TicketEdit() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [ticketNumber, setTicketNumber] = useState("");
  const [currentStatus, setCurrentStatus] = useState("");

  useEffect(() => {
    document.title = "تعديل التذكرة | BI Management v3";
  }, []);

  useEffect(() => {
    if (!id) {
      setError("معرف التذكرة مطلوب");
      setLoading(false);
      return;
    }

    fetch(`${API_BASE}/api/tickets/${id}`, { headers: getAuthHeaders() })
      .then((r) => {
        if (!r.ok) throw new Error("التذكرة غير موجودة");
        return r.json();
      })
      .then((data) => {
        setTicketNumber(data.ticketNumber || "");
        setCurrentStatus(data.status || "open");

        form.setFieldsValue({
          subject: data.subject || "",
          category: data.category || "inquiry",
          priority: data.priority || "medium",
          status: data.status || "open",
          description: data.description || "",
        });
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [id, form]);

  const handleSubmit = async (values: Record<string, unknown>) => {
    setSubmitting(true);
    try {
      const res = await fetch(`${API_BASE}/api/tickets/${id}`, {
        method: "PATCH",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          subject: values.subject,
          category: values.category,
          priority: values.priority,
          status: values.status,
          description: values.description,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "فشل تحديث التذكرة");
      }

      message.success("تم تحديث التذكرة بنجاح");
      navigate(`/tickets/${id}`);
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
          title="تعديل التذكرة"
          breadcrumbs={[
            { title: "التذاكر", href: "/tickets" },
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
          title="تعديل التذكرة"
          breadcrumbs={[
            { title: "التذاكر", href: "/tickets" },
            { title: "خطأ" },
          ]}
        />
        <Alert
          message="خطأ"
          description={error}
          type="error"
          showIcon
          action={
            <Button type="link" onClick={() => navigate("/tickets")}>
              العودة للتذاكر
            </Button>
          }
        />
      </div>
    );
  }

  const statusConfig = STATUSES.find((s) => s.value === currentStatus) || STATUSES[0];

  return (
    <div>
      <PageHeader
        title={`تعديل التذكرة: ${ticketNumber}`}
        breadcrumbs={[
          { title: "التذاكر", href: "/tickets" },
          { title: ticketNumber, href: `/tickets/${id}` },
          { title: "تعديل" },
        ]}
        extra={
          <Space>
            <Tag color={statusConfig.color}>{statusConfig.label}</Tag>
            <Button icon={<ArrowRightOutlined />} onClick={() => navigate(`/tickets/${id}`)}>
              العودة للتفاصيل
            </Button>
          </Space>
        }
      />

      <Card style={{ maxWidth: 800 }}>
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item
            name="subject"
            label="عنوان التذكرة"
            rules={[{ required: true, message: "العنوان مطلوب" }]}
          >
            <Input placeholder="موضوع التذكرة" />
          </Form.Item>

          <Row gutter={16}>
            <Col xs={24} sm={8}>
              <Form.Item name="category" label="التصنيف">
                <Select>
                  {CATEGORIES.map((cat) => (
                    <Select.Option key={cat.value} value={cat.value}>
                      {cat.label}
                    </Select.Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col xs={24} sm={8}>
              <Form.Item name="priority" label="الأولوية">
                <Select>
                  {PRIORITIES.map((p) => (
                    <Select.Option key={p.value} value={p.value}>
                      <Tag color={p.color}>{p.label}</Tag>
                    </Select.Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col xs={24} sm={8}>
              <Form.Item name="status" label="الحالة">
                <Select>
                  {STATUSES.map((s) => (
                    <Select.Option key={s.value} value={s.value}>
                      <Tag color={s.color}>{s.label}</Tag>
                    </Select.Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="description" label="الوصف">
            <Input.TextArea rows={5} placeholder="تفاصيل المشكلة أو الطلب..." />
          </Form.Item>

          <Space>
            <Button onClick={() => navigate(`/tickets/${id}`)}>إلغاء</Button>
            <Button type="primary" htmlType="submit" icon={<SaveOutlined />} loading={submitting}>
              حفظ التعديلات
            </Button>
          </Space>
        </Form>
      </Card>
    </div>
  );
}
