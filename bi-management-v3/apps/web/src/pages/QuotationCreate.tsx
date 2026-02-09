/**
 * صفحة إنشاء/تعديل عرض سعر
 */
import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Row, Col, Card, Form, Input, Select, Button, InputNumber, DatePicker, message, Space } from "antd";
import { SaveOutlined, ArrowRightOutlined, PlusOutlined } from "@ant-design/icons";
import { PageHeader } from "../components/shared";
import { API_BASE, getAuthHeaders } from "../utils/api";
import dayjs from "dayjs";

interface Customer {
  id: string;
  fullName: string;
  phone: string | null;
  email: string | null;
  address: string | null;
}

interface Product {
  id: string;
  nameAr: string;
  nameEn: string | null;
  sku: string | null;
  price: string | null;
}

interface QuotationItem {
  id?: string;
  productId: string | null;
  productName: string;
  productSku: string;
  description: string;
  quantity: number;
  unitPrice: string;
  discountType: string;
  discountValue: string;
  lineTotal: number;
}

export default function QuotationCreate() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = Boolean(id);
  const [form] = Form.useForm();

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [items, setItems] = useState<QuotationItem[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadCustomers();
    loadProducts();
    if (isEdit) loadQuotation();
    
    // تاريخ صلاحية افتراضي (30 يوم)
    if (!isEdit) {
      form.setFieldsValue({
        validUntil: dayjs().add(30, "day"),
        discountType: "fixed",
        discountValue: 0,
        taxRate: 0,
      });
    }
  }, [id]);

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
      console.error(err);
    }
  };

  const loadProducts = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/products?limit=200`);
      if (res.ok) {
        const data = await res.json();
        setProducts(data.products || data || []);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const loadQuotation = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/quotations/${id}`, {
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        const data = await res.json();
        form.setFieldsValue({
          customerId: data.customerId || undefined,
          customerName: data.customerName || "",
          customerPhone: data.customerPhone || "",
          customerEmail: data.customerEmail || "",
          customerAddress: data.customerAddress || "",
          validUntil: data.validUntil ? dayjs(data.validUntil) : undefined,
          discountType: data.discountType || "fixed",
          discountValue: parseFloat(data.discountValue) || 0,
          taxRate: parseFloat(data.taxRate) || 0,
          terms: data.terms || "",
          notes: data.notes || "",
        });
        setItems(
          data.items?.map((item: any) => ({
            id: item.id,
            productId: item.productId,
            productName: item.productName,
            productSku: item.productSku || "",
            description: item.description || "",
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            discountType: item.discountType || "fixed",
            discountValue: item.discountValue || "0",
            lineTotal: parseFloat(item.lineTotal) || 0,
          })) || []
        );
      }
    } catch (err) {
      console.error(err);
    }
  };

  const selectCustomer = (customerId: string) => {
    const customer = customers.find(c => c.id === customerId);
    if (customer) {
      form.setFieldsValue({
        customerId: customer.id,
        customerName: customer.fullName,
        customerPhone: customer.phone || "",
        customerEmail: customer.email || "",
        customerAddress: customer.address || "",
      });
    }
  };

  const addProduct = (productId: string) => {
    const product = products.find(p => p.id === productId);
    if (product) {
      const newItem: QuotationItem = {
        productId: product.id,
        productName: product.nameAr || product.nameEn || "",
        productSku: product.sku || "",
        description: "",
        quantity: 1,
        unitPrice: product.price || "0",
        discountType: "fixed",
        discountValue: "0",
        lineTotal: parseFloat(product.price || "0"),
      };
      setItems([...items, newItem]);
    }
  };

  const addManualItem = () => {
    setItems([
      ...items,
      {
        productId: null,
        productName: "",
        productSku: "",
        description: "",
        quantity: 1,
        unitPrice: "0",
        discountType: "fixed",
        discountValue: "0",
        lineTotal: 0,
      },
    ]);
  };

  const updateItem = (index: number, field: string, value: any) => {
    const newItems = [...items];
    (newItems[index] as any)[field] = value;

    // حساب المجموع
    const qty = newItems[index].quantity;
    const price = parseFloat(newItems[index].unitPrice) || 0;
    const discType = newItems[index].discountType;
    const discVal = parseFloat(newItems[index].discountValue) || 0;
    const discount = discType === "percentage" ? (price * qty * discVal / 100) : discVal;
    newItems[index].lineTotal = (price * qty) - discount;

    setItems(newItems);
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  // حساب المجاميع
  const subtotal = items.reduce((sum, item) => sum + item.lineTotal, 0);
  const discountType = Form.useWatch("discountType", form) || "fixed";
  const discountValue = Form.useWatch("discountValue", form) || 0;
  const taxRate = Form.useWatch("taxRate", form) || 0;
  
  const discountAmount = discountType === "percentage"
    ? subtotal * discountValue / 100
    : discountValue;
  const afterDiscount = subtotal - discountAmount;
  const taxAmount = afterDiscount * taxRate / 100;
  const total = afterDiscount + taxAmount;

  const handleSubmit = async (values: any) => {
    if (items.length === 0) {
      message.error("يجب إضافة عنصر واحد على الأقل");
      return;
    }

    if (!values.customerName && !values.customerId) {
      message.error("يجب تحديد العميل");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        ...values,
        validUntil: values.validUntil?.format("YYYY-MM-DD"),
        items: items.map((item) => ({
          productId: item.productId,
          productName: item.productName,
          productSku: item.productSku,
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          discountType: item.discountType,
          discountValue: item.discountValue,
        })),
      };

      const res = await fetch(isEdit ? `${API_BASE}/api/quotations/${id}` : `${API_BASE}/api/quotations`, {
        method: isEdit ? "PATCH" : "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const data = await res.json();
        message.success(isEdit ? "تم تحديث عرض السعر" : "تم إنشاء عرض السعر");
        navigate(`/quotations/${isEdit ? id : data.id}`);
      } else {
        const err = await res.json();
        message.error(err.error || "فشل في حفظ عرض السعر");
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
        title={isEdit ? "تعديل عرض السعر" : "عرض سعر جديد"}
        subtitle={isEdit ? "تعديل بيانات عرض السعر" : "إنشاء عرض سعر جديد للعميل"}
        breadcrumbs={[
          { label: "الرئيسية", path: "/" },
          { label: "عروض الأسعار", path: "/quotations" },
          { label: isEdit ? "تعديل" : "عرض سعر جديد" },
        ]}
      />

      <Form form={form} layout="vertical" onFinish={handleSubmit}>
        {/* معلومات العميل */}
        <Card title="معلومات العميل" style={{ marginBottom: 24 }}>
          <Row gutter={16}>
            <Col xs={24}>
              <Form.Item label="اختر عميل" name="customerId">
                <Select
                  placeholder="ابحث عن عميل..."
                  allowClear
                  showSearch
                  optionFilterProp="children"
                  onChange={selectCustomer}
                  filterOption={(input, option) =>
                    (option?.children as unknown as string)?.toLowerCase().includes(input.toLowerCase())
                  }
                >
                  {customers.map(c => (
                    <Select.Option key={c.id} value={c.id}>{c.fullName} - {c.phone}</Select.Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item
                label="اسم العميل"
                name="customerName"
                rules={[{ required: true, message: "اسم العميل مطلوب" }]}
              >
                <Input placeholder="اسم العميل" />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item label="الهاتف" name="customerPhone">
                <Input placeholder="رقم الهاتف" />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item label="البريد الإلكتروني" name="customerEmail">
                <Input type="email" placeholder="البريد الإلكتروني" />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item label="صالح حتى" name="validUntil">
                <DatePicker style={{ width: "100%" }} placeholder="تاريخ انتهاء الصلاحية" />
              </Form.Item>
            </Col>
          </Row>
        </Card>

        {/* العناصر */}
        <Card
          title="العناصر"
          style={{ marginBottom: 24 }}
          extra={
            <Space>
              <Select
                placeholder="إضافة منتج..."
                style={{ width: 200 }}
                showSearch
                optionFilterProp="children"
                onChange={addProduct}
                value={undefined}
              >
                {products.map(p => (
                  <Select.Option key={p.id} value={p.id}>
                    {p.nameAr} {p.sku && `(${p.sku})`}
                  </Select.Option>
                ))}
              </Select>
              <Button type="dashed" onClick={addManualItem} icon={<PlusOutlined />}>
                إضافة يدوي
              </Button>
            </Space>
          }
        >
          {items.length === 0 ? (
            <div style={{ textAlign: "center", padding: "2rem", color: "#9ca3af" }}>
              لم يتم إضافة عناصر بعد
            </div>
          ) : (
            <>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ borderBottom: "1px solid #e5e7eb" }}>
                      <th style={{ padding: "0.75rem", textAlign: "right", fontWeight: 500 }}>المنتج</th>
                      <th style={{ padding: "0.75rem", textAlign: "center", fontWeight: 500, width: "100px" }}>الكمية</th>
                      <th style={{ padding: "0.75rem", textAlign: "center", fontWeight: 500, width: "130px" }}>السعر</th>
                      <th style={{ padding: "0.75rem", textAlign: "center", fontWeight: 500, width: "110px" }}>الخصم</th>
                      <th style={{ padding: "0.75rem", textAlign: "center", fontWeight: 500, width: "130px" }}>المجموع</th>
                      <th style={{ width: "60px" }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item, index) => (
                      <tr key={index} style={{ borderBottom: "1px solid #f3f4f6" }}>
                        <td style={{ padding: "0.5rem" }}>
                          <Input
                            value={item.productName}
                            onChange={(e) => updateItem(index, "productName", e.target.value)}
                            placeholder="اسم المنتج"
                          />
                        </td>
                        <td style={{ padding: "0.5rem" }}>
                          <InputNumber
                            min={1}
                            value={item.quantity}
                            onChange={(val) => updateItem(index, "quantity", val || 1)}
                            style={{ width: "100%" }}
                          />
                        </td>
                        <td style={{ padding: "0.5rem" }}>
                          <InputNumber
                            value={parseFloat(item.unitPrice)}
                            onChange={(val) => updateItem(index, "unitPrice", String(val || 0))}
                            style={{ width: "100%" }}
                            formatter={value => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")}
                          />
                        </td>
                        <td style={{ padding: "0.5rem" }}>
                          <InputNumber
                            value={parseFloat(item.discountValue)}
                            onChange={(val) => updateItem(index, "discountValue", String(val || 0))}
                            style={{ width: "100%" }}
                          />
                        </td>
                        <td style={{ padding: "0.5rem", textAlign: "center", fontWeight: 600 }}>
                          {item.lineTotal.toLocaleString()}
                        </td>
                        <td style={{ padding: "0.5rem" }}>
                          <Button type="text" danger onClick={() => removeItem(index)}>×</Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* المجاميع */}
              <div style={{ marginTop: "1.5rem", borderTop: "1px solid #e5e7eb", paddingTop: "1rem" }}>
                <Row justify="end">
                  <Col xs={24} md={10}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.5rem" }}>
                      <span>المجموع الفرعي:</span>
                      <span>{subtotal.toLocaleString()} IQD</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
                      <span>الخصم:</span>
                      <Space>
                        <Form.Item name="discountValue" noStyle>
                          <InputNumber style={{ width: 80 }} min={0} />
                        </Form.Item>
                        <Form.Item name="discountType" noStyle>
                          <Select style={{ width: 80 }}>
                            <Select.Option value="fixed">IQD</Select.Option>
                            <Select.Option value="percentage">%</Select.Option>
                          </Select>
                        </Form.Item>
                      </Space>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
                      <span>الضريبة %:</span>
                      <Form.Item name="taxRate" noStyle>
                        <InputNumber style={{ width: 80 }} min={0} max={100} />
                      </Form.Item>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 700, fontSize: "1.1rem", paddingTop: "0.5rem", borderTop: "1px solid #e5e7eb" }}>
                      <span>الإجمالي:</span>
                      <span style={{ color: "#059669" }}>{total.toLocaleString()} IQD</span>
                    </div>
                  </Col>
                </Row>
              </div>
            </>
          )}
        </Card>

        {/* ملاحظات */}
        <Card title="الشروط والملاحظات" style={{ marginBottom: 24 }}>
          <Row gutter={16}>
            <Col xs={24} md={12}>
              <Form.Item label="الشروط والأحكام" name="terms">
                <Input.TextArea rows={3} placeholder="شروط وأحكام العرض..." />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item label="ملاحظات" name="notes">
                <Input.TextArea rows={3} placeholder="ملاحظات إضافية..." />
              </Form.Item>
            </Col>
          </Row>
        </Card>

        {/* أزرار */}
        <Space style={{ display: "flex", justifyContent: "flex-end" }}>
          <Button size="large" onClick={() => navigate("/quotations")} icon={<ArrowRightOutlined />}>
            إلغاء
          </Button>
          <Button type="primary" size="large" htmlType="submit" loading={saving} icon={<SaveOutlined />}>
            {isEdit ? "حفظ التغييرات" : "إنشاء عرض السعر"}
          </Button>
        </Space>
      </Form>
    </div>
  );
}
