import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Row,
  Col,
  Card,
  Form,
  Input,
  Select,
  Button,
  InputNumber,
  message,
  Space,
  Table,
  Tag,
} from "antd";
import { SaveOutlined, ArrowRightOutlined, PlusOutlined, DeleteOutlined } from "@ant-design/icons";
import { PageHeader, LoadingSkeleton } from "../components/shared";
import { API_BASE, getAuthHeaders } from "../utils/api";

type InvoiceItem = {
  id?: string;
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

const TYPE_CONFIG: Record<
  string,
  { label: string; color: string; bg: string; partyLabel: string; partyType: "customer" | "supplier" }
> = {
  sale: { label: "فاتورة بيع", color: "#15803d", bg: "#dcfce7", partyLabel: "العميل", partyType: "customer" },
  purchase: { label: "فاتورة شراء", color: "#1d4ed8", bg: "#dbeafe", partyLabel: "المورد", partyType: "supplier" },
  return: { label: "فاتورة مرتجع", color: "#b45309", bg: "#fef3c7", partyLabel: "العميل", partyType: "customer" },
  quotation: { label: "عرض سعر", color: "#7c3aed", bg: "#f3e8ff", partyLabel: "العميل", partyType: "customer" },
};

export default function InvoiceEdit() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [formType, setFormType] = useState("sale");
  const [items, setItems] = useState<InvoiceItem[]>([{ description: "", quantity: 1, unitPrice: 0, discount: 0 }]);

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [products, setProducts] = useState<Product[]>([]);

  useEffect(() => {
    document.title = "تعديل فاتورة | BI Management v3";
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [invoiceRes, customersRes, suppliersRes, productsRes] = await Promise.all([
          fetch(`${API_BASE}/api/invoices/${id}`, { headers: getAuthHeaders() }),
          fetch(`${API_BASE}/api/customers?limit=200`, { headers: getAuthHeaders() }),
          fetch(`${API_BASE}/api/suppliers?limit=200`, { headers: getAuthHeaders() }),
          fetch(`${API_BASE}/api/products?limit=200`, { headers: getAuthHeaders() }),
        ]);

        if (!invoiceRes.ok) throw new Error("فشل تحميل الفاتورة");

        const [data, customersData, suppliersData, productsData] = await Promise.all([
          invoiceRes.json(),
          customersRes.json(),
          suppliersRes.json(),
          productsRes.json(),
        ]);

        setInvoiceNumber(data.invoiceNumber || "");
        setFormType(data.type || "sale");

        form.setFieldsValue({
          type: data.type || "sale",
          paymentType: data.paymentType || "cash",
          notes: data.notes || "",
          customerId: data.customerId || undefined,
          supplierId: data.supplierId || undefined,
          discount: data.discount || 0,
          taxRate: data.taxRate || 0,
        });

        if (data.items && data.items.length > 0) {
          setItems(
            data.items.map((it: InvoiceItem) => ({
              id: it.id,
              productId: it.productId || "",
              description: it.description || "",
              quantity: it.quantity || 1,
              unitPrice: it.unitPrice || 0,
              discount: it.discount || 0,
            }))
          );
        }

        setCustomers(customersData.data || []);
        setSuppliers(suppliersData.data || []);
        setProducts(productsData.data || []);
      } catch (err) {
        message.error(err instanceof Error ? err.message : "فشل التحميل");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id, form]);

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
    const discount = form.getFieldValue("discount") || 0;
    const tax = form.getFieldValue("taxRate") || 0;
    return subtotal - discount + (subtotal * tax) / 100;
  };

  const handleSubmit = async (values: Record<string, unknown>) => {
    setSubmitting(true);
    try {
      const validItems = items.filter((it) => it.description.trim() || it.unitPrice > 0);
      if (validItems.length === 0) throw new Error("أضف بند واحد على الأقل");

      const typeConfig = TYPE_CONFIG[formType];
      const partyId = typeConfig.partyType === "customer" ? values.customerId : values.supplierId;

      const res = await fetch(`${API_BASE}/api/invoices/${id}`, {
        method: "PUT",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          type: formType,
          paymentType: values.paymentType,
          notes: (values.notes as string)?.trim() || undefined,
          customerId: typeConfig.partyType === "customer" && partyId ? partyId : undefined,
          supplierId: typeConfig.partyType === "supplier" && partyId ? partyId : undefined,
          discount: values.discount,
          taxRate: values.taxRate,
          items: validItems.map((it) => ({
            id: it.id || undefined,
            productId: it.productId || undefined,
            description: it.description.trim(),
            quantity: it.quantity,
            unitPrice: it.unitPrice,
            discount: it.discount,
          })),
        }),
      });

      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || "فشل تحديث الفاتورة");
      }

      message.success("تم تحديث الفاتورة بنجاح");
      navigate(`/invoices/${id}`);
    } catch (err) {
      message.error(err instanceof Error ? err.message : "فشل الحفظ");
    } finally {
      setSubmitting(false);
    }
  };

  const typeConfig = TYPE_CONFIG[formType];

  const itemColumns = [
    {
      title: "#",
      dataIndex: "index",
      width: 50,
      render: (_: unknown, __: unknown, index: number) => index + 1,
    },
    {
      title: "المنتج",
      dataIndex: "productId",
      width: 180,
      render: (_: unknown, record: InvoiceItem, index: number) => (
        <Select
          value={record.productId || undefined}
          onChange={(value) => updateItem(index, "productId", value)}
          placeholder="اختر المنتج"
          allowClear
          style={{ width: "100%" }}
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
      title: "الوصف",
      dataIndex: "description",
      render: (_: unknown, record: InvoiceItem, index: number) => (
        <Input
          value={record.description}
          onChange={(e) => updateItem(index, "description", e.target.value)}
          placeholder="وصف البند"
        />
      ),
    },
    {
      title: "الكمية",
      dataIndex: "quantity",
      width: 100,
      render: (_: unknown, record: InvoiceItem, index: number) => (
        <InputNumber
          value={record.quantity}
          onChange={(value) => updateItem(index, "quantity", value || 1)}
          min={1}
          style={{ width: "100%" }}
        />
      ),
    },
    {
      title: "سعر الوحدة",
      dataIndex: "unitPrice",
      width: 120,
      render: (_: unknown, record: InvoiceItem, index: number) => (
        <InputNumber
          value={record.unitPrice}
          onChange={(value) => updateItem(index, "unitPrice", value || 0)}
          min={0}
          step={0.01}
          style={{ width: "100%" }}
        />
      ),
    },
    {
      title: "الخصم",
      dataIndex: "discount",
      width: 100,
      render: (_: unknown, record: InvoiceItem, index: number) => (
        <InputNumber
          value={record.discount}
          onChange={(value) => updateItem(index, "discount", value || 0)}
          min={0}
          step={0.01}
          style={{ width: "100%" }}
        />
      ),
    },
    {
      title: "الإجمالي",
      dataIndex: "total",
      width: 120,
      render: (_: unknown, record: InvoiceItem) => (
        <span style={{ fontWeight: 600 }}>
          {(record.quantity * record.unitPrice - record.discount).toLocaleString()}
        </span>
      ),
    },
    {
      title: "",
      dataIndex: "actions",
      width: 50,
      render: (_: unknown, __: unknown, index: number) => (
        <Button
          type="text"
          danger
          icon={<DeleteOutlined />}
          onClick={() => removeItem(index)}
          disabled={items.length <= 1}
        />
      ),
    },
  ];

  if (loading) {
    return <LoadingSkeleton />;
  }

  return (
    <div>
      <PageHeader
        title="تعديل الفاتورة"
        subtitle={invoiceNumber ? `رقم الفاتورة: ${invoiceNumber}` : undefined}
        breadcrumbs={[
          { label: "الرئيسية", path: "/" },
          { label: "الفواتير", path: "/invoices" },
          { label: "تعديل الفاتورة" },
        ]}
        extra={
          <Space>
            <Tag style={{ background: typeConfig.bg, color: typeConfig.color, border: "none", fontWeight: 600 }}>
              {typeConfig.label}
            </Tag>
            <Button icon={<ArrowRightOutlined />} onClick={() => navigate(`/invoices/${id}`)}>
              العودة للفاتورة
            </Button>
          </Space>
        }
      />

      <Form form={form} layout="vertical" onFinish={handleSubmit}>
        <Card title="معلومات الفاتورة" style={{ marginBottom: 24 }}>
          <Row gutter={16}>
            <Col xs={24} md={8}>
              <Form.Item name="type" label="نوع الفاتورة" rules={[{ required: true }]}>
                <Select onChange={(value) => setFormType(value)}>
                  <Select.Option value="sale">بيع</Select.Option>
                  <Select.Option value="purchase">شراء</Select.Option>
                  <Select.Option value="return">مرتجع</Select.Option>
                  <Select.Option value="quotation">عرض سعر</Select.Option>
                </Select>
              </Form.Item>
            </Col>
            <Col xs={24} md={8}>
              <Form.Item name="paymentType" label="طريقة الدفع">
                <Select>
                  <Select.Option value="cash">نقدي</Select.Option>
                  <Select.Option value="credit">آجل</Select.Option>
                  <Select.Option value="installment">تقسيط</Select.Option>
                  <Select.Option value="bank">تحويل بنكي</Select.Option>
                </Select>
              </Form.Item>
            </Col>
            <Col xs={24} md={8}>
              {typeConfig.partyType === "customer" ? (
                <Form.Item name="customerId" label={typeConfig.partyLabel}>
                  <Select placeholder="اختر العميل" allowClear>
                    {customers.map((c) => (
                      <Select.Option key={c.id} value={c.id}>
                        {c.nameAr} ({c.code})
                      </Select.Option>
                    ))}
                  </Select>
                </Form.Item>
              ) : (
                <Form.Item name="supplierId" label={typeConfig.partyLabel}>
                  <Select placeholder="اختر المورد" allowClear>
                    {suppliers.map((s) => (
                      <Select.Option key={s.id} value={s.id}>
                        {s.nameAr} ({s.code})
                      </Select.Option>
                    ))}
                  </Select>
                </Form.Item>
              )}
            </Col>
          </Row>
        </Card>

        <Card
          title="بنود الفاتورة"
          extra={
            <Button type="dashed" icon={<PlusOutlined />} onClick={addItem}>
              إضافة بند
            </Button>
          }
          style={{ marginBottom: 24 }}
        >
          <Table
            dataSource={items.map((item, index) => ({ ...item, key: index }))}
            columns={itemColumns}
            pagination={false}
            scroll={{ x: 800 }}
            size="middle"
          />
        </Card>

        <Row gutter={24} style={{ marginBottom: 24 }}>
          <Col xs={24} md={12}>
            <Card title="ملاحظات">
              <Form.Item name="notes" style={{ marginBottom: 0 }}>
                <Input.TextArea rows={4} placeholder="أضف ملاحظات على الفاتورة..." />
              </Form.Item>
            </Card>
          </Col>
          <Col xs={24} md={12}>
            <Card title="ملخص الفاتورة" style={{ background: "#f8fafc" }}>
              <div style={{ display: "grid", gap: 12 }}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    padding: "8px 0",
                    borderBottom: "1px solid #e2e8f0",
                  }}
                >
                  <span style={{ color: "#64748b" }}>المجموع الفرعي</span>
                  <span style={{ fontWeight: 600 }}>{calcSubtotal().toLocaleString()} IQD</span>
                </div>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "8px 0",
                    borderBottom: "1px solid #e2e8f0",
                  }}
                >
                  <span style={{ color: "#64748b" }}>الخصم</span>
                  <Form.Item name="discount" style={{ marginBottom: 0 }}>
                    <InputNumber min={0} style={{ width: 100 }} />
                  </Form.Item>
                </div>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "8px 0",
                    borderBottom: "1px solid #e2e8f0",
                  }}
                >
                  <span style={{ color: "#64748b" }}>الضريبة %</span>
                  <Form.Item name="taxRate" style={{ marginBottom: 0 }}>
                    <InputNumber min={0} max={100} style={{ width: 100 }} />
                  </Form.Item>
                </div>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    padding: "16px 0 0",
                    marginTop: 8,
                  }}
                >
                  <span style={{ fontWeight: 700, fontSize: "1.1rem" }}>الإجمالي النهائي</span>
                  <span style={{ fontWeight: 700, fontSize: "1.25rem", color: typeConfig.color }}>
                    {calcTotal().toLocaleString()} IQD
                  </span>
                </div>
              </div>
            </Card>
          </Col>
        </Row>

        <Space>
          <Button onClick={() => navigate(`/invoices/${id}`)}>إلغاء</Button>
          <Button
            type="primary"
            htmlType="submit"
            loading={submitting}
            icon={<SaveOutlined />}
            style={{
              background: `linear-gradient(135deg, ${typeConfig.color} 0%, ${typeConfig.color}dd 100%)`,
              borderColor: typeConfig.color,
            }}
          >
            حفظ التعديلات
          </Button>
        </Space>
      </Form>
    </div>
  );
}
