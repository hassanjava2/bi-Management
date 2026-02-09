import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Row, Col, Card, Form, Input, Select, Button, InputNumber, Checkbox, message, Space, Alert, Tag } from "antd";
import { SaveOutlined, ArrowRightOutlined, SearchOutlined } from "@ant-design/icons";
import { PageHeader, LoadingSkeleton, MoneyDisplay } from "../components/shared";
import { API_BASE, getAuthHeaders } from "../utils/api";

interface Customer {
  id: string;
  name: string;
  phone: string;
}

const ISSUE_CATEGORIES = [
  "شاشة",
  "بطارية",
  "شحن",
  "صوت",
  "كاميرا",
  "برمجيات",
  "ذاكرة",
  "معالج",
  "لوحة أم",
  "أخرى",
];

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  received: { label: "تم الاستلام", color: "default" },
  diagnosing: { label: "قيد الفحص", color: "processing" },
  waiting_approval: { label: "بانتظار الموافقة", color: "warning" },
  waiting_parts: { label: "بانتظار قطع الغيار", color: "purple" },
  in_progress: { label: "قيد الإصلاح", color: "blue" },
  completed: { label: "مكتمل", color: "success" },
  delivered: { label: "تم التسليم", color: "cyan" },
  cancelled: { label: "ملغي", color: "error" },
};

export default function MaintenanceEdit() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [orderNumber, setOrderNumber] = useState("");
  const [status, setStatus] = useState("");
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [customerSearch, setCustomerSearch] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [isEditable, setIsEditable] = useState(true);

  useEffect(() => {
    document.title = "تعديل طلب صيانة | BI Management v3";
  }, []);

  useEffect(() => {
    if (!id) {
      setError("معرف الطلب مطلوب");
      setLoading(false);
      return;
    }

    fetch(`${API_BASE}/api/maintenance/${id}`, { headers: getAuthHeaders() })
      .then((r) => {
        if (!r.ok) throw new Error("الطلب غير موجود");
        return r.json();
      })
      .then((data) => {
        setOrderNumber(data.orderNumber || "");
        setStatus(data.status || "received");
        setIsEditable(!["completed", "delivered", "cancelled"].includes(data.status || ""));
        
        if (data.customerId && data.customerName) {
          setSelectedCustomer({
            id: data.customerId,
            name: data.customerName,
            phone: data.customerPhone || "",
          });
        }

        form.setFieldsValue({
          issueDescription: data.issueDescription || "",
          issueCategory: data.issueCategory || undefined,
          diagnosis: data.diagnosis || "",
          isWarranty: data.isWarranty === 1,
          estimatedCost: data.estimatedCost || 0,
          laborCost: data.laborCost || 0,
          partsCost: data.partsCost || 0,
          notes: data.notes || "",
          customerId: data.customerId || undefined,
        });
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [id, form]);

  useEffect(() => {
    if (customerSearch.length >= 2) {
      fetch(`${API_BASE}/api/customers?search=${encodeURIComponent(customerSearch)}&limit=10`, {
        headers: getAuthHeaders(),
      })
        .then((r) => r.json())
        .then((data) => setCustomers(data.data || data.customers || []))
        .catch(() => {});
    } else {
      setCustomers([]);
    }
  }, [customerSearch]);

  const selectCustomer = (customer: Customer) => {
    setSelectedCustomer(customer);
    form.setFieldsValue({ customerId: customer.id });
    setCustomerSearch("");
    setCustomers([]);
  };

  const clearCustomer = () => {
    setSelectedCustomer(null);
    form.setFieldsValue({ customerId: undefined });
  };

  const handleSubmit = async (values: Record<string, unknown>) => {
    setSubmitting(true);
    try {
      const res = await fetch(`${API_BASE}/api/maintenance/${id}`, {
        method: "PUT",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          issueDescription: values.issueDescription,
          issueCategory: values.issueCategory,
          diagnosis: values.diagnosis,
          isWarranty: values.isWarranty,
          estimatedCost: values.estimatedCost || 0,
          laborCost: values.laborCost || 0,
          partsCost: values.partsCost || 0,
          notes: values.notes,
          customerId: values.customerId || null,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "فشل تحديث الطلب");
      }

      message.success("تم تحديث طلب الصيانة بنجاح");
      navigate(`/maintenance/${id}`);
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
          title="تعديل طلب الصيانة"
          breadcrumbs={[
            { title: "الصيانة", href: "/maintenance" },
            { title: "تعديل" },
          ]}
        />
        <LoadingSkeleton type="form" rows={8} />
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <PageHeader
          title="تعديل طلب الصيانة"
          breadcrumbs={[
            { title: "الصيانة", href: "/maintenance" },
            { title: "خطأ" },
          ]}
        />
        <Alert
          message="خطأ"
          description={error}
          type="error"
          showIcon
          action={
            <Button type="link" onClick={() => navigate("/maintenance")}>
              العودة للصيانة
            </Button>
          }
        />
      </div>
    );
  }

  const statusInfo = STATUS_LABELS[status] || STATUS_LABELS.received;

  return (
    <div>
      <PageHeader
        title={`تعديل طلب الصيانة: ${orderNumber}`}
        breadcrumbs={[
          { title: "الصيانة", href: "/maintenance" },
          { title: orderNumber, href: `/maintenance/${id}` },
          { title: "تعديل" },
        ]}
        extra={
          <Space>
            <Tag color={statusInfo.color}>{statusInfo.label}</Tag>
            <Button icon={<ArrowRightOutlined />} onClick={() => navigate(`/maintenance/${id}`)}>
              العودة للتفاصيل
            </Button>
          </Space>
        }
      />

      {!isEditable && (
        <Alert
          message="لا يمكن التعديل"
          description="هذا الطلب مكتمل أو ملغي ولا يمكن تعديله"
          type="warning"
          showIcon
          style={{ marginBottom: 24 }}
        />
      )}

      <Form form={form} layout="vertical" onFinish={handleSubmit} style={{ maxWidth: 900 }}>
        {/* Customer Info */}
        <Card title="معلومات العميل" style={{ marginBottom: 24 }}>
          <Form.Item label="البحث عن عميل">
            <div style={{ position: "relative" }}>
              <Input
                prefix={<SearchOutlined />}
                value={customerSearch}
                onChange={(e) => setCustomerSearch(e.target.value)}
                placeholder="اسم العميل أو رقم الهاتف..."
                disabled={!isEditable}
              />
              {customers.length > 0 && (
                <div
                  style={{
                    position: "absolute",
                    zIndex: 10,
                    width: "100%",
                    marginTop: 4,
                    background: "#fff",
                    border: "1px solid #d9d9d9",
                    borderRadius: 8,
                    boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                    maxHeight: 200,
                    overflow: "auto",
                  }}
                >
                  {customers.map((customer) => (
                    <div
                      key={customer.id}
                      onClick={() => selectCustomer(customer)}
                      style={{
                        padding: "8px 12px",
                        cursor: "pointer",
                        display: "flex",
                        justifyContent: "space-between",
                        borderBottom: "1px solid #f0f0f0",
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = "#f5f5f5")}
                      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                    >
                      <span>{customer.name}</span>
                      <span style={{ color: "#6b7280", fontFamily: "monospace" }}>{customer.phone}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Form.Item>

          <Form.Item name="customerId" hidden>
            <Input />
          </Form.Item>

          {selectedCustomer && (
            <div
              style={{
                background: "#e6f7ff",
                border: "1px solid #91d5ff",
                borderRadius: 8,
                padding: 12,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <div>
                <div style={{ fontWeight: 500 }}>{selectedCustomer.name}</div>
                <div style={{ fontSize: "0.85rem", color: "#6b7280", fontFamily: "monospace" }}>
                  {selectedCustomer.phone}
                </div>
              </div>
              {isEditable && (
                <Button type="link" danger onClick={clearCustomer}>
                  إزالة
                </Button>
              )}
            </div>
          )}
        </Card>

        {/* Issue Details */}
        <Card title="تفاصيل المشكلة" style={{ marginBottom: 24 }}>
          <Row gutter={16}>
            <Col xs={24} md={8}>
              <Form.Item name="issueCategory" label="تصنيف المشكلة">
                <Select placeholder="اختر التصنيف" allowClear disabled={!isEditable}>
                  {ISSUE_CATEGORIES.map((cat) => (
                    <Select.Option key={cat} value={cat}>
                      {cat}
                    </Select.Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col xs={24} md={16}>
              <Form.Item
                name="issueDescription"
                label="وصف المشكلة"
                rules={[{ required: true, message: "يرجى إدخال وصف المشكلة" }]}
              >
                <Input.TextArea rows={3} placeholder="اشرح المشكلة بالتفصيل..." disabled={!isEditable} />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="isWarranty" valuePropName="checked">
            <Checkbox disabled={!isEditable}>الجهاز تحت الضمان</Checkbox>
          </Form.Item>
        </Card>

        {/* Diagnosis & Cost */}
        <Card title="التشخيص والتكلفة" style={{ marginBottom: 24 }}>
          <Form.Item name="diagnosis" label="التشخيص">
            <Input.TextArea rows={3} placeholder="نتيجة الفحص والتشخيص..." disabled={!isEditable} />
          </Form.Item>

          <Row gutter={16}>
            <Col xs={24} sm={8}>
              <Form.Item name="estimatedCost" label="التكلفة المتوقعة">
                <InputNumber
                  style={{ width: "100%" }}
                  min={0}
                  placeholder="0"
                  formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")}
                  disabled={!isEditable}
                />
              </Form.Item>
            </Col>
            <Col xs={24} sm={8}>
              <Form.Item name="laborCost" label="تكلفة العمالة">
                <InputNumber
                  style={{ width: "100%" }}
                  min={0}
                  placeholder="0"
                  formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")}
                  disabled={!isEditable}
                />
              </Form.Item>
            </Col>
            <Col xs={24} sm={8}>
              <Form.Item name="partsCost" label="تكلفة القطع">
                <InputNumber
                  style={{ width: "100%" }}
                  min={0}
                  placeholder="0"
                  formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")}
                  disabled={!isEditable}
                />
              </Form.Item>
            </Col>
          </Row>
        </Card>

        {/* Notes */}
        <Card title="ملاحظات" style={{ marginBottom: 24 }}>
          <Form.Item name="notes" style={{ marginBottom: 0 }}>
            <Input.TextArea rows={3} placeholder="أي ملاحظات إضافية..." disabled={!isEditable} />
          </Form.Item>
        </Card>

        {/* Actions */}
        {isEditable && (
          <Space>
            <Button onClick={() => navigate(`/maintenance/${id}`)}>إلغاء</Button>
            <Button type="primary" htmlType="submit" icon={<SaveOutlined />} loading={submitting}>
              حفظ التعديلات
            </Button>
          </Space>
        )}
      </Form>
    </div>
  );
}
