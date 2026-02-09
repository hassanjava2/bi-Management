import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Row, Col, Card, Form, Input, Select, Button, message, Space, Radio, Checkbox } from "antd";
import { SaveOutlined, ArrowRightOutlined, SearchOutlined } from "@ant-design/icons";
import { PageHeader } from "../components/shared";
import { API_BASE, getAuthHeaders } from "../utils/api";

interface Customer {
  id: string;
  fullName: string;
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

const TYPE_OPTIONS = [
  { value: "external", label: "صيانة خارجية", desc: "جهاز عميل خارجي" },
  { value: "internal", label: "صيانة داخلية", desc: "جهاز من المخزون" },
  { value: "warranty", label: "ضمان", desc: "إصلاح تحت الضمان" },
];

export default function MaintenanceCreate() {
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [customerSearch, setCustomerSearch] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);

  useEffect(() => {
    if (customerSearch.length >= 2) {
      searchCustomers();
    }
  }, [customerSearch]);

  async function searchCustomers() {
    try {
      const res = await fetch(
        `${API_BASE}/api/customers?search=${encodeURIComponent(customerSearch)}&limit=10`,
        { headers: getAuthHeaders() }
      );
      const data = await res.json();
      setCustomers(data.customers || []);
    } catch (err) {
      console.error(err);
    }
  }

  function selectCustomer(customer: Customer) {
    setSelectedCustomer(customer);
    form.setFieldsValue({
      customerId: customer.id,
    });
    setCustomerSearch("");
    setCustomers([]);
  }

  function clearCustomer() {
    setSelectedCustomer(null);
    form.setFieldsValue({
      customerId: "",
    });
  }

  async function handleSubmit(values: any) {
    if (!values.issueDescription) {
      message.error("يرجى إدخال وصف المشكلة");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/maintenance`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          type: values.type,
          serialNumber: values.serialNumber || undefined,
          customerId: values.customerId || undefined,
          issueDescription: values.issueDescription,
          issueCategory: values.issueCategory || undefined,
          isWarranty: values.isWarranty,
          notes: values.notes || undefined,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        message.success(`تم إنشاء طلب الصيانة بنجاح - رقم الطلب: ${data.orderNumber}`);
        navigate(`/maintenance/${data.orderId}`);
      } else {
        message.error(data.error || "حدث خطأ");
      }
    } catch (err) {
      console.error(err);
      message.error("حدث خطأ أثناء إنشاء الطلب");
    } finally {
      setLoading(false);
    }
  }

  const breadcrumbs = [
    { title: "الصيانة", path: "/maintenance" },
    { title: "طلب صيانة جديد" },
  ];

  return (
    <div>
      <PageHeader
        title="طلب صيانة جديد"
        subtitle="تسجيل جهاز جديد للصيانة"
        breadcrumbs={breadcrumbs}
      />

      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        initialValues={{ type: "external", isWarranty: false }}
      >
        <Row gutter={[24, 24]}>
          {/* Request Type Card */}
          <Col xs={24}>
            <Card title="نوع الطلب">
              <Form.Item name="type">
                <Radio.Group buttonStyle="solid" style={{ width: "100%" }}>
                  <Space direction="horizontal" style={{ width: "100%", display: "flex" }}>
                    {TYPE_OPTIONS.map((option) => (
                      <Radio.Button
                        key={option.value}
                        value={option.value}
                        style={{ flex: 1, textAlign: "center", height: "auto", padding: "12px 16px" }}
                      >
                        <div style={{ fontWeight: 500 }}>{option.label}</div>
                        <div style={{ fontSize: "0.85rem", color: "#6b7280" }}>{option.desc}</div>
                      </Radio.Button>
                    ))}
                  </Space>
                </Radio.Group>
              </Form.Item>
            </Card>
          </Col>

          {/* Device Info Card */}
          <Col xs={24} lg={12}>
            <Card title="معلومات الجهاز">
              <Form.Item
                name="serialNumber"
                label="الرقم التسلسلي (اختياري)"
                extra="إذا كان الجهاز مسجل في النظام، أدخل رقمه التسلسلي"
              >
                <Input
                  placeholder="BI-2024-000001"
                  style={{ fontFamily: "monospace" }}
                  dir="ltr"
                />
              </Form.Item>

              <Form.Item name="isWarranty" valuePropName="checked">
                <Checkbox>الجهاز تحت الضمان</Checkbox>
              </Form.Item>
            </Card>
          </Col>

          {/* Customer Info Card */}
          <Col xs={24} lg={12}>
            <Card title="معلومات العميل">
              <Form.Item label="البحث عن عميل">
                <div style={{ position: "relative" }}>
                  <Input
                    prefix={<SearchOutlined />}
                    value={customerSearch}
                    onChange={(e) => setCustomerSearch(e.target.value)}
                    placeholder="اسم العميل أو رقم الهاتف..."
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
                          <span>{customer.fullName}</span>
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
                    <div style={{ fontWeight: 500 }}>{selectedCustomer.fullName}</div>
                    <div style={{ fontSize: "0.85rem", color: "#6b7280", fontFamily: "monospace" }}>
                      {selectedCustomer.phone}
                    </div>
                  </div>
                  <Button type="link" danger onClick={clearCustomer}>
                    إزالة
                  </Button>
                </div>
              )}

              {!selectedCustomer && (
                <div style={{ fontSize: "0.85rem", color: "#6b7280" }}>
                  أو يمكنك المتابعة بدون تحديد عميل (للصيانة الداخلية)
                </div>
              )}
            </Card>
          </Col>

          {/* Issue Details Card */}
          <Col xs={24}>
            <Card title="تفاصيل المشكلة">
              <Row gutter={16}>
                <Col xs={24} md={8}>
                  <Form.Item name="issueCategory" label="تصنيف المشكلة">
                    <Select placeholder="اختر التصنيف" allowClear>
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
                    <Input.TextArea
                      rows={4}
                      placeholder="اشرح المشكلة بالتفصيل..."
                    />
                  </Form.Item>
                </Col>
              </Row>

              <Form.Item name="notes" label="ملاحظات إضافية">
                <Input.TextArea
                  rows={2}
                  placeholder="أي ملاحظات أخرى..."
                />
              </Form.Item>
            </Card>
          </Col>
        </Row>

        {/* Actions */}
        <div style={{ marginTop: 24, display: "flex", gap: 16 }}>
          <Button
            block
            size="large"
            onClick={() => navigate(-1)}
            icon={<ArrowRightOutlined />}
          >
            إلغاء
          </Button>
          <Button
            block
            type="primary"
            size="large"
            htmlType="submit"
            loading={loading}
            icon={<SaveOutlined />}
          >
            إنشاء طلب الصيانة
          </Button>
        </div>
      </Form>
    </div>
  );
}
