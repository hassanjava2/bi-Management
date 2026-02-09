import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Row, Col, Card, Form, Input, Select, Button, InputNumber, message, Space, Table } from "antd";
import { SaveOutlined, PlusOutlined, DeleteOutlined } from "@ant-design/icons";
import { PageHeader, MoneyDisplay } from "../components/shared";
import { API_BASE, getAuthHeaders } from "../utils/api";

type InvoiceItem = {
  productId?: string;
  description: string;
  quantity: number;
  unitPrice: number;
  discount: number;
};

type Customer = {
  id: string;
  nameAr: string;
  code: string;
};

type Supplier = {
  id: string;
  nameAr: string;
  code: string;
};

type Product = {
  id: string;
  nameAr: string;
  code: string;
  sellingPrice: number;
  costPrice: number;
};

const TYPE_CONFIG: Record<string, { label: string; color: string; bg: string; partyLabel: string; partyType: "customer" | "supplier" }> = {
  sale: { label: "فاتورة بيع", color: "#15803d", bg: "#dcfce7", partyLabel: "العميل", partyType: "customer" },
  purchase: { label: "فاتورة شراء", color: "#1d4ed8", bg: "#dbeafe", partyLabel: "المورد", partyType: "supplier" },
  return: { label: "فاتورة مرتجع", color: "#b45309", bg: "#fef3c7", partyLabel: "العميل", partyType: "customer" },
  quotation: { label: "عرض سعر", color: "#7c3aed", bg: "#f3e8ff", partyLabel: "العميل", partyType: "customer" },
};

export default function InvoiceCreate() {
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);

  const [formType, setFormType] = useState("sale");
  const [discount, setDiscount] = useState(0);
  const [tax, setTax] = useState(0);
  const [items, setItems] = useState<InvoiceItem[]>([{ description: "", quantity: 1, unitPrice: 0, discount: 0 }]);

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [products, setProducts] = useState<Product[]>([]);

  useEffect(() => {
    document.title = "إنشاء فاتورة | BI Management v3";

    Promise.all([
      fetch(`${API_BASE}/api/customers?limit=200`, { headers: getAuthHeaders() }).then((r) => r.json()),
      fetch(`${API_BASE}/api/suppliers?limit=200`, { headers: getAuthHeaders() }).then((r) => r.json()),
      fetch(`${API_BASE}/api/products?limit=200`, { headers: getAuthHeaders() }).then((r) => r.json()),
    ])
      .then(([customersRes, suppliersRes, productsRes]) => {
        setCustomers(customersRes.data || []);
        setSuppliers(suppliersRes.data || []);
        setProducts(productsRes.data || []);
      })
      .catch((err) => {
        console.error("Failed to load customers, suppliers, or products:", err);
        message.error("فشل تحميل البيانات. يرجى تحديث الصفحة.");
      });
  }, []);

  const addItem = () => {
    setItems([...items, { description: "", quantity: 1, unitPrice: 0, discount: 0 }]);
  };

  const removeItem = (index: number) => {
    if (items.length <= 1) return;
    setItems(items.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, field: keyof InvoiceItem, value: string | number) => {
    const updated = [...items];
    if (field === "description") {
      updated[index].description = value as string;
    } else if (field === "quantity") {
      updated[index].quantity = Math.max(1, Number(value) || 1);
    } else if (field === "unitPrice") {
      updated[index].unitPrice = Math.max(0, Number(value) || 0);
    } else if (field === "discount") {
      updated[index].discount = Math.max(0, Number(value) || 0);
    } else if (field === "productId") {
      updated[index].productId = value as string;
      const product = products.find((p) => p.id === value);
      if (product) {
        updated[index].description = product.nameAr;
        updated[index].unitPrice = formType === "purchase" ? product.costPrice : product.sellingPrice;
      }
    }
    setItems(updated);
  };

  const calcSubtotal = () => items.reduce((sum, it) => sum + (it.quantity * it.unitPrice - it.discount), 0);
  const calcTotal = () => {
    const subtotal = calcSubtotal();
    return subtotal - discount + (subtotal * tax) / 100;
  };

  const handleSubmit = async (values: Record<string, unknown>) => {
    setSubmitting(true);
    try {
      const validItems = items.filter((it) => it.description.trim() || it.unitPrice > 0);
      if (validItems.length === 0) {
        message.error("أضف بند واحد على الأقل");
        setSubmitting(false);
        return;
      }

      const typeConfig = TYPE_CONFIG[formType];
      const partyId = typeConfig.partyType === "customer" ? values.customerId : values.supplierId;

      const res = await fetch(`${API_BASE}/api/invoices`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          type: formType,
          paymentType: values.paymentType,
          notes: (values.notes as string)?.trim() || undefined,
          customerId: typeConfig.partyType === "customer" && partyId ? partyId : undefined,
          supplierId: typeConfig.partyType === "supplier" && partyId ? partyId : undefined,
          discount,
          taxRate: tax,
          items: validItems.map((it) => ({
            productId: it.productId || undefined,
            description: it.description.trim(),
            quantity: it.quantity,
            unitPrice: it.unitPrice,
            discount: it.discount,
          })),
        }),
      });
      if (!res.ok) {
        const d = await res.json().catch((err) => {
          console.error("Failed to parse error response:", err);
          return {};
        });
        throw new Error(d.error || "فشل إنشاء الفاتورة");
      }
      const created = await res.json();
      message.success("تم إنشاء الفاتورة بنجاح");
      navigate(`/invoices/${created.id}`);
    } catch (err) {
      console.error("Error creating invoice:", err);
      message.error(err instanceof Error ? err.message : "فشل الحفظ");
    } finally {
      setSubmitting(false);
    }
  };

  const typeConfig = TYPE_CONFIG[formType];

  const columns = [
    {
      title: "#",
      dataIndex: "index",
      key: "index",
      width: 50,
      render: (_: unknown, __: unknown, index: number) => index + 1,
    },
    {
      title: "المنتج",
      dataIndex: "productId",
      key: "productId",
      width: 180,
      render: (_: unknown, __: unknown, index: number) => (
        <Select
          style={{ width: "100%" }}
          placeholder="-- اختر --"
          allowClear
          value={items[index]?.productId || undefined}
          onChange={(value) => updateItem(index, "productId", value || "")}
          options={products.map((p) => ({ label: p.nameAr, value: p.id }))}
        />
      ),
    },
    {
      title: "الوصف",
      dataIndex: "description",
      key: "description",
      render: (_: unknown, __: unknown, index: number) => (
        <Input
          placeholder="وصف البند"
          value={items[index]?.description}
          onChange={(e) => updateItem(index, "description", e.target.value)}
        />
      ),
    },
    {
      title: "الكمية",
      dataIndex: "quantity",
      key: "quantity",
      width: 100,
      render: (_: unknown, __: unknown, index: number) => (
        <InputNumber
          min={1}
          style={{ width: "100%" }}
          value={items[index]?.quantity}
          onChange={(value) => updateItem(index, "quantity", value || 1)}
        />
      ),
    },
    {
      title: "سعر الوحدة",
      dataIndex: "unitPrice",
      key: "unitPrice",
      width: 120,
      render: (_: unknown, __: unknown, index: number) => (
        <InputNumber
          min={0}
          step={0.01}
          style={{ width: "100%" }}
          value={items[index]?.unitPrice}
          onChange={(value) => updateItem(index, "unitPrice", value || 0)}
        />
      ),
    },
    {
      title: "الخصم",
      dataIndex: "discount",
      key: "discount",
      width: 100,
      render: (_: unknown, __: unknown, index: number) => (
        <InputNumber
          min={0}
          step={0.01}
          style={{ width: "100%" }}
          value={items[index]?.discount}
          onChange={(value) => updateItem(index, "discount", value || 0)}
        />
      ),
    },
    {
      title: "الإجمالي",
      dataIndex: "total",
      key: "total",
      width: 120,
      render: (_: unknown, __: unknown, index: number) => {
        const item = items[index];
        const total = item ? item.quantity * item.unitPrice - item.discount : 0;
        return <MoneyDisplay amount={total} />;
      },
    },
    {
      title: "",
      key: "actions",
      width: 50,
      render: (_: unknown, __: unknown, index: number) => (
        <Button
          type="text"
          danger
          icon={<DeleteOutlined />}
          disabled={items.length <= 1}
          onClick={() => removeItem(index)}
        />
      ),
    },
  ];

  const breadcrumbs = [
    { label: "الرئيسية", href: "/" },
    { label: "الفواتير", href: "/invoices" },
    { label: "إنشاء فاتورة" },
  ];

  return (
    <div>
      <PageHeader
        title="إنشاء فاتورة جديدة"
        breadcrumbs={breadcrumbs}
        extra={
          <span
            style={{
              padding: "0.5rem 1rem",
              background: typeConfig.bg,
              color: typeConfig.color,
              borderRadius: "8px",
              fontWeight: 600,
            }}
          >
            {typeConfig.label}
          </span>
        }
      />

      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        initialValues={{
          type: "sale",
          paymentType: "cash",
        }}
      >
        {/* Invoice Info */}
        <Card title="معلومات الفاتورة" style={{ marginBottom: 24 }}>
          <Row gutter={16}>
            <Col xs={24} sm={12} md={8}>
              <Form.Item
                name="type"
                label="نوع الفاتورة"
                rules={[{ required: true, message: "يرجى اختيار نوع الفاتورة" }]}
              >
                <Select
                  value={formType}
                  onChange={(value) => setFormType(value)}
                  options={[
                    { label: "بيع", value: "sale" },
                    { label: "شراء", value: "purchase" },
                    { label: "مرتجع", value: "return" },
                    { label: "عرض سعر", value: "quotation" },
                  ]}
                />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} md={8}>
              <Form.Item name="paymentType" label="طريقة الدفع">
                <Select
                  options={[
                    { label: "نقدي", value: "cash" },
                    { label: "آجل", value: "credit" },
                    { label: "تقسيط", value: "installment" },
                    { label: "تحويل بنكي", value: "bank" },
                  ]}
                />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} md={8}>
              {typeConfig.partyType === "customer" ? (
                <Form.Item name="customerId" label={typeConfig.partyLabel}>
                  <Select
                    placeholder="-- اختر العميل --"
                    allowClear
                    showSearch
                    optionFilterProp="label"
                    options={customers.map((c) => ({
                      label: `${c.nameAr} (${c.code})`,
                      value: c.id,
                    }))}
                  />
                </Form.Item>
              ) : (
                <Form.Item name="supplierId" label={typeConfig.partyLabel}>
                  <Select
                    placeholder="-- اختر المورد --"
                    allowClear
                    showSearch
                    optionFilterProp="label"
                    options={suppliers.map((s) => ({
                      label: `${s.nameAr} (${s.code})`,
                      value: s.id,
                    }))}
                  />
                </Form.Item>
              )}
            </Col>
          </Row>
        </Card>

        {/* Invoice Items */}
        <Card
          title="بنود الفاتورة"
          style={{ marginBottom: 24 }}
          extra={
            <Button type="dashed" icon={<PlusOutlined />} onClick={addItem}>
              إضافة بند
            </Button>
          }
        >
          <Table
            columns={columns}
            dataSource={items.map((item, index) => ({ ...item, key: index }))}
            pagination={false}
            scroll={{ x: 800 }}
          />
        </Card>

        {/* Totals & Notes */}
        <Row gutter={24} style={{ marginBottom: 24 }}>
          <Col xs={24} md={12}>
            <Card title="ملاحظات">
              <Form.Item name="notes" noStyle>
                <Input.TextArea rows={4} placeholder="أضف ملاحظات على الفاتورة..." />
              </Form.Item>
            </Card>
          </Col>
          <Col xs={24} md={12}>
            <Card title="ملخص الفاتورة" style={{ background: "#f8fafc" }}>
              <div style={{ display: "grid", gap: "0.75rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", padding: "0.5rem 0", borderBottom: "1px solid #e2e8f0" }}>
                  <span style={{ color: "#64748b" }}>المجموع الفرعي</span>
                  <MoneyDisplay amount={calcSubtotal()} />
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.5rem 0", borderBottom: "1px solid #e2e8f0" }}>
                  <span style={{ color: "#64748b" }}>الخصم</span>
                  <InputNumber
                    min={0}
                    value={discount}
                    onChange={(value) => setDiscount(value || 0)}
                    style={{ width: 120 }}
                  />
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.5rem 0", borderBottom: "1px solid #e2e8f0" }}>
                  <span style={{ color: "#64748b" }}>الضريبة %</span>
                  <InputNumber
                    min={0}
                    max={100}
                    value={tax}
                    onChange={(value) => setTax(value || 0)}
                    style={{ width: 120 }}
                  />
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", padding: "1rem 0 0", marginTop: "0.5rem" }}>
                  <span style={{ fontWeight: 700, fontSize: "1.1rem" }}>الإجمالي النهائي</span>
                  <span style={{ fontWeight: 700, fontSize: "1.25rem", color: typeConfig.color }}>
                    <MoneyDisplay amount={calcTotal()} />
                  </span>
                </div>
              </div>
            </Card>
          </Col>
        </Row>

        {/* Actions */}
        <div style={{ display: "flex", gap: "0.75rem", justifyContent: "flex-end" }}>
          <Space>
            <Button onClick={() => navigate("/invoices")}>إلغاء</Button>
            <Button
              type="primary"
              htmlType="submit"
              icon={<SaveOutlined />}
              loading={submitting}
              style={{ background: typeConfig.color }}
            >
              حفظ الفاتورة
            </Button>
          </Space>
        </div>
      </Form>
    </div>
  );
}
