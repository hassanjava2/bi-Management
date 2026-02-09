/**
 * صفحة إنشاء حجز جديد
 */
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Row, Col, Card, Form, Input, Select, Button, InputNumber, DatePicker, message, Space, Table } from "antd";
import { SaveOutlined, ArrowRightOutlined, PlusOutlined, DeleteOutlined } from "@ant-design/icons";
import { PageHeader } from "../components/shared";
import { API_BASE, getAuthHeaders } from "../utils/api";
import dayjs from "dayjs";

interface Customer {
  id: string;
  fullName: string;
  phone: string;
}

interface Product {
  id: string;
  nameAr: string;
  price: string;
  sku: string;
}

interface ReservationItem {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: string;
}

export default function ReservationCreate() {
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const [saving, setSaving] = useState(false);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [items, setItems] = useState<ReservationItem[]>([]);

  useEffect(() => {
    fetch(`${API_BASE}/api/customers?limit=100`, { headers: getAuthHeaders() })
      .then((r) => r.json())
      .then((d) => setCustomers(d.customers || []));
    fetch(`${API_BASE}/api/products?limit=100`, { headers: getAuthHeaders() })
      .then((r) => r.json())
      .then((d) => setProducts(d.products || []));

    // تاريخ انتهاء افتراضي بعد 7 أيام
    const expires = dayjs().add(7, "day");
    form.setFieldsValue({ expiresAt: expires });
  }, []);

  const selectCustomer = (customerId: string) => {
    const c = customers.find((x) => x.id === customerId);
    if (c) {
      form.setFieldsValue({
        customerId: c.id,
        customerName: c.fullName,
        customerPhone: c.phone || "",
      });
    }
  };

  const addItem = () => {
    setItems([...items, { productId: "", productName: "", quantity: 1, unitPrice: "0" }]);
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, idx) => idx !== index));
  };

  const updateItem = (index: number, field: string, value: any) => {
    const newItems = [...items];
    (newItems[index] as any)[field] = value;
    if (field === "productId") {
      const p = products.find((x) => x.id === value);
      if (p) {
        newItems[index].productName = p.nameAr;
        newItems[index].unitPrice = p.price;
      }
    }
    setItems(newItems);
  };

  const totalAmount = items.reduce((sum, i) => sum + parseFloat(i.unitPrice || "0") * i.quantity, 0);
  const depositAmount = Math.round(totalAmount * 0.1);

  const handleSubmit = async (values: any) => {
    if (!values.customerName?.trim()) {
      message.error("اسم العميل مطلوب");
      return;
    }
    if (items.length === 0) {
      message.error("أضف منتج واحد على الأقل");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(`${API_BASE}/api/reservations`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          customerId: values.customerId || "",
          customerName: values.customerName,
          customerPhone: values.customerPhone || "",
          customerEmail: values.customerEmail || "",
          notes: values.notes || "",
          expiresAt: values.expiresAt ? values.expiresAt.format("YYYY-MM-DD") : "",
          items,
          depositAmount: String(depositAmount),
        }),
      });
      if (res.ok) {
        const data = await res.json();
        message.success("تم إنشاء الحجز بنجاح");
        navigate(`/reservations/${data.id}`);
      } else {
        message.error("فشل في إنشاء الحجز");
      }
    } catch (error) {
      console.error(error);
      message.error("حدث خطأ");
    } finally {
      setSaving(false);
    }
  };

  const breadcrumbs = [
    { title: "الحجوزات", path: "/reservations" },
    { title: "حجز جديد" },
  ];

  const itemColumns = [
    {
      title: "المنتج",
      dataIndex: "productId",
      key: "productId",
      render: (_: any, record: ReservationItem, index: number) => (
        <Select
          value={record.productId || undefined}
          onChange={(value) => updateItem(index, "productId", value)}
          placeholder="اختر منتج"
          style={{ width: "100%" }}
          showSearch
          optionFilterProp="children"
        >
          {products.map((p) => (
            <Select.Option key={p.id} value={p.id}>
              {p.nameAr}
            </Select.Option>
          ))}
        </Select>
      ),
    },
    {
      title: "الكمية",
      dataIndex: "quantity",
      key: "quantity",
      width: 120,
      render: (_: any, record: ReservationItem, index: number) => (
        <InputNumber
          min={1}
          value={record.quantity}
          onChange={(value) => updateItem(index, "quantity", value || 1)}
          style={{ width: "100%" }}
        />
      ),
    },
    {
      title: "السعر",
      dataIndex: "unitPrice",
      key: "unitPrice",
      width: 140,
      render: (_: any, record: ReservationItem, index: number) => (
        <InputNumber
          value={parseFloat(record.unitPrice) || 0}
          onChange={(value) => updateItem(index, "unitPrice", String(value || 0))}
          style={{ width: "100%" }}
          formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")}
          parser={(value) => value!.replace(/\$\s?|(,*)/g, "") as any}
        />
      ),
    },
    {
      title: "الإجمالي",
      key: "total",
      width: 120,
      render: (_: any, record: ReservationItem) => (
        <span style={{ fontWeight: 600 }}>
          {(parseFloat(record.unitPrice || "0") * record.quantity).toLocaleString()} IQD
        </span>
      ),
    },
    {
      title: "",
      key: "actions",
      width: 60,
      render: (_: any, __: any, index: number) => (
        <Button
          type="text"
          danger
          icon={<DeleteOutlined />}
          onClick={() => removeItem(index)}
        />
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="📦 حجز جديد"
        breadcrumbs={breadcrumbs}
      />

      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
      >
        <Row gutter={[24, 24]}>
          {/* Customer Info Card */}
          <Col xs={24}>
            <Card title="بيانات العميل">
              <Row gutter={16}>
                <Col xs={24} md={6}>
                  <Form.Item name="customerId" label="اختر عميل">
                    <Select
                      placeholder="-- أو أدخل يدوياً --"
                      allowClear
                      showSearch
                      optionFilterProp="children"
                      onChange={selectCustomer}
                    >
                      {customers.map((c) => (
                        <Select.Option key={c.id} value={c.id}>
                          {c.fullName}
                        </Select.Option>
                      ))}
                    </Select>
                  </Form.Item>
                </Col>
                <Col xs={24} md={6}>
                  <Form.Item
                    name="customerName"
                    label="اسم العميل"
                    rules={[{ required: true, message: "اسم العميل مطلوب" }]}
                  >
                    <Input />
                  </Form.Item>
                </Col>
                <Col xs={24} md={6}>
                  <Form.Item name="customerPhone" label="الهاتف">
                    <Input />
                  </Form.Item>
                </Col>
                <Col xs={24} md={6}>
                  <Form.Item name="expiresAt" label="تاريخ انتهاء الحجز">
                    <DatePicker style={{ width: "100%" }} />
                  </Form.Item>
                </Col>
              </Row>
            </Card>
          </Col>

          {/* Products Card */}
          <Col xs={24}>
            <Card
              title="المنتجات المحجوزة"
              extra={
                <Button type="primary" icon={<PlusOutlined />} onClick={addItem}>
                  إضافة منتج
                </Button>
              }
            >
              {items.length === 0 ? (
                <div
                  style={{
                    textAlign: "center",
                    padding: "48px 24px",
                    color: "#9ca3af",
                    background: "#f9fafb",
                    borderRadius: 8,
                  }}
                >
                  لا توجد منتجات - أضف منتج للحجز
                </div>
              ) : (
                <Table
                  dataSource={items.map((item, index) => ({ ...item, key: index }))}
                  columns={itemColumns}
                  pagination={false}
                  size="middle"
                />
              )}
            </Card>
          </Col>

          {/* Summary Card */}
          <Col xs={24} lg={12}>
            <Card style={{ background: "#f0fdf4", border: "1px solid #86efac" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.5rem" }}>
                <span>إجمالي المبلغ:</span>
                <span style={{ fontWeight: 700, fontSize: "1.1rem" }}>{totalAmount.toLocaleString()} IQD</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span>العربون (10%):</span>
                <span style={{ fontWeight: 600, color: "#059669" }}>{depositAmount.toLocaleString()} IQD</span>
              </div>
            </Card>
          </Col>

          {/* Notes Card */}
          <Col xs={24} lg={12}>
            <Card title="ملاحظات">
              <Form.Item name="notes" noStyle>
                <Input.TextArea rows={3} placeholder="ملاحظات إضافية..." />
              </Form.Item>
            </Card>
          </Col>
        </Row>

        {/* Actions */}
        <div style={{ marginTop: 24, display: "flex", gap: 16, justifyContent: "flex-end" }}>
          <Button onClick={() => navigate("/reservations")} icon={<ArrowRightOutlined />}>
            إلغاء
          </Button>
          <Button
            type="primary"
            htmlType="submit"
            loading={saving}
            icon={<SaveOutlined />}
          >
            إنشاء الحجز
          </Button>
        </div>
      </Form>
    </div>
  );
}
