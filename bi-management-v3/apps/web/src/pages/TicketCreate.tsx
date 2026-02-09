/**
 * صفحة إنشاء تذكرة جديدة
 */
import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Row, Col, Card, Form, Input, Select, Button, message, Space, Radio } from "antd";
import { SaveOutlined, ArrowRightOutlined, SearchOutlined } from "@ant-design/icons";
import { PageHeader } from "../components/shared";
import { API_BASE, getAuthHeaders } from "../utils/api";

interface Customer {
  id: string;
  fullName: string;
  phone: string | null;
  email: string | null;
}

const CATEGORIES = [
  { value: "technical", label: "دعم فني", icon: "🔧" },
  { value: "sales", label: "مبيعات", icon: "💰" },
  { value: "warranty", label: "ضمان", icon: "🛡️" },
  { value: "complaint", label: "شكوى", icon: "📢" },
  { value: "inquiry", label: "استفسار", icon: "❓" },
  { value: "other", label: "أخرى", icon: "📌" },
];

const PRIORITIES = [
  { value: "low", label: "منخفضة", icon: "🟢", description: "يمكن الانتظار", color: "#52c41a" },
  { value: "medium", label: "متوسطة", icon: "🟡", description: "عادي", color: "#faad14" },
  { value: "high", label: "عالية", icon: "🟠", description: "مهم", color: "#fa8c16" },
  { value: "urgent", label: "عاجلة", icon: "🔴", description: "يحتاج حل فوري", color: "#f5222d" },
];

export default function TicketCreate() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [form] = Form.useForm();

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [searchCustomer, setSearchCustomer] = useState("");
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);

  const [category, setCategory] = useState("inquiry");
  const [priority, setPriority] = useState("medium");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadCustomers();

    // Set initial values from URL params
    const relatedType = searchParams.get("relatedType");
    const relatedId = searchParams.get("relatedId");
    if (relatedType && relatedId) {
      form.setFieldsValue({ relatedType, relatedId });
    }
  }, []);

  const loadCustomers = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/customers?limit=100`, {
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        const data = await res.json();
        setCustomers(data.customers || data || []);
      }
    } catch (err) {
      console.error("Error loading customers:", err);
    }
  };

  const filteredCustomers = customers.filter(
    (c) =>
      c.fullName.toLowerCase().includes(searchCustomer.toLowerCase()) ||
      c.phone?.includes(searchCustomer) ||
      c.email?.toLowerCase().includes(searchCustomer.toLowerCase())
  );

  const selectCustomer = (customer: Customer) => {
    setSelectedCustomer(customer);
    form.setFieldsValue({
      customerId: customer.id,
      customerName: customer.fullName,
      customerEmail: customer.email || "",
      customerPhone: customer.phone || "",
    });
    setSearchCustomer(customer.fullName);
    setShowCustomerDropdown(false);
  };

  const handleSubmit = async (values: any) => {
    if (!values.subject?.trim()) {
      message.error("الموضوع مطلوب");
      return;
    }
    if (!values.description?.trim()) {
      message.error("الوصف مطلوب");
      return;
    }
    if (!values.customerId && !values.customerName?.trim()) {
      message.error("يجب تحديد العميل أو إدخال اسم");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(`${API_BASE}/api/tickets`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          ...values,
          category,
          priority,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        message.success("تم إنشاء التذكرة بنجاح");
        navigate(`/tickets/${data.id}`);
      } else {
        const err = await res.json();
        message.error(err.error || "فشل في إنشاء التذكرة");
      }
    } catch (err) {
      message.error("حدث خطأ في الاتصال");
    } finally {
      setSaving(false);
    }
  };

  const breadcrumbs = [
    { title: "التذاكر", path: "/tickets" },
    { title: "تذكرة جديدة" },
  ];

  return (
    <div>
      <PageHeader
        title="🎫 تذكرة دعم جديدة"
        breadcrumbs={breadcrumbs}
      />

      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        initialValues={{
          category: "inquiry",
          priority: "medium",
        }}
      >
        <Row gutter={[24, 24]}>
          {/* Customer Info Card */}
          <Col xs={24}>
            <Card title="👤 معلومات العميل">
              <Row gutter={16}>
                <Col xs={24} md={24} style={{ marginBottom: 16 }}>
                  <Form.Item label="البحث عن عميل" style={{ marginBottom: 0 }}>
                    <div style={{ position: "relative" }}>
                      <Input
                        prefix={<SearchOutlined />}
                        value={searchCustomer}
                        onChange={(e) => {
                          setSearchCustomer(e.target.value);
                          setShowCustomerDropdown(true);
                          if (!e.target.value) {
                            form.setFieldsValue({ customerId: "" });
                            setSelectedCustomer(null);
                          }
                        }}
                        onFocus={() => setShowCustomerDropdown(true)}
                        placeholder="ابحث بالاسم أو الهاتف..."
                      />
                      {showCustomerDropdown && filteredCustomers.length > 0 && (
                        <div
                          style={{
                            position: "absolute",
                            top: "100%",
                            left: 0,
                            right: 0,
                            background: "#fff",
                            border: "1px solid #d9d9d9",
                            borderRadius: 8,
                            maxHeight: 200,
                            overflow: "auto",
                            zIndex: 10,
                            boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                          }}
                        >
                          {filteredCustomers.slice(0, 10).map((c) => (
                            <div
                              key={c.id}
                              onClick={() => selectCustomer(c)}
                              style={{
                                padding: "10px 16px",
                                cursor: "pointer",
                                borderBottom: "1px solid #f0f0f0",
                              }}
                              onMouseEnter={(e) => (e.currentTarget.style.background = "#f5f5f5")}
                              onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                            >
                              <div style={{ fontWeight: 500 }}>{c.fullName}</div>
                              <div style={{ fontSize: "0.85rem", color: "#6b7280" }}>
                                {c.phone} {c.email && `• ${c.email}`}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </Form.Item>
                </Col>

                <Col xs={24} md={8}>
                  <Form.Item
                    name="customerName"
                    label="الاسم"
                    rules={[{ required: true, message: "الاسم مطلوب" }]}
                  >
                    <Input />
                  </Form.Item>
                  <Form.Item name="customerId" hidden>
                    <Input />
                  </Form.Item>
                </Col>
                <Col xs={24} md={8}>
                  <Form.Item name="customerEmail" label="البريد الإلكتروني">
                    <Input type="email" />
                  </Form.Item>
                </Col>
                <Col xs={24} md={8}>
                  <Form.Item name="customerPhone" label="الهاتف">
                    <Input />
                  </Form.Item>
                </Col>
              </Row>
            </Card>
          </Col>

          {/* Ticket Details Card */}
          <Col xs={24}>
            <Card title="📝 تفاصيل التذكرة">
              <Form.Item
                name="subject"
                label="الموضوع"
                rules={[{ required: true, message: "الموضوع مطلوب" }]}
              >
                <Input placeholder="موضوع مختصر للمشكلة..." />
              </Form.Item>

              <Form.Item
                name="description"
                label="الوصف التفصيلي"
                rules={[{ required: true, message: "الوصف مطلوب" }]}
              >
                <Input.TextArea
                  rows={5}
                  placeholder="اشرح المشكلة بالتفصيل..."
                />
              </Form.Item>

              <Row gutter={24}>
                <Col xs={24} md={12}>
                  <Form.Item label="الفئة">
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
                      {CATEGORIES.map((cat) => (
                        <Button
                          key={cat.value}
                          type={category === cat.value ? "primary" : "default"}
                          onClick={() => setCategory(cat.value)}
                          style={{
                            height: "auto",
                            padding: "8px 12px",
                          }}
                        >
                          {cat.icon} {cat.label}
                        </Button>
                      ))}
                    </div>
                  </Form.Item>
                </Col>

                <Col xs={24} md={12}>
                  <Form.Item label="الأولوية">
                    <Space direction="vertical" style={{ width: "100%" }}>
                      {PRIORITIES.map((p) => (
                        <Button
                          key={p.value}
                          type={priority === p.value ? "primary" : "default"}
                          onClick={() => setPriority(p.value)}
                          style={{
                            width: "100%",
                            textAlign: "right",
                            height: "auto",
                            padding: "8px 16px",
                            display: "flex",
                            alignItems: "center",
                            gap: 8,
                            ...(priority === p.value ? { background: p.color, borderColor: p.color } : {}),
                          }}
                        >
                          <span>{p.icon}</span>
                          <span style={{ fontWeight: 500 }}>{p.label}</span>
                          <span style={{ color: priority === p.value ? "rgba(255,255,255,0.8)" : "#9ca3af", fontSize: "0.8rem" }}>
                            - {p.description}
                          </span>
                        </Button>
                      ))}
                    </Space>
                  </Form.Item>
                </Col>
              </Row>

              {/* Hidden fields for related item */}
              <Form.Item name="relatedType" hidden>
                <Input />
              </Form.Item>
              <Form.Item name="relatedId" hidden>
                <Input />
              </Form.Item>
            </Card>
          </Col>
        </Row>

        {/* Actions */}
        <div style={{ marginTop: 24, display: "flex", gap: 16, justifyContent: "flex-end" }}>
          <Button onClick={() => navigate("/tickets")} icon={<ArrowRightOutlined />}>
            إلغاء
          </Button>
          <Button
            type="primary"
            htmlType="submit"
            loading={saving}
            icon={<SaveOutlined />}
          >
            إنشاء التذكرة
          </Button>
        </div>
      </Form>
    </div>
  );
}
