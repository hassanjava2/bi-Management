/**
 * صفحة إضافة وجبة شراء جديدة
 * ─────────────────────────────
 * الموظف يضيف المنتجات والكميات (بدون أسعار)
 * المدير يضيف الأسعار لاحقاً
 */

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Row, Col, Card, Button, Input, InputNumber, Select, Space, message, Form, Statistic, Alert } from "antd";
import { PlusOutlined, DeleteOutlined, SaveOutlined, ArrowRightOutlined, InfoCircleOutlined } from "@ant-design/icons";
import { PageHeader } from "../components/shared";
import { API_BASE, getAuthHeaders } from "../utils/api";

const { TextArea } = Input;

interface Supplier {
  id: string;
  name: string;
}

interface Warehouse {
  id: string;
  name: string;
}

interface Product {
  id: string;
  name: string;
  code?: string;
  brand?: string;
  model?: string;
}

interface BatchItem {
  id: string;
  productId?: string;
  productName: string;
  brand?: string;
  model?: string;
  specs?: string;
  quantity: number;
  notes?: string;
}

export default function NewPurchaseBatch() {
  const navigate = useNavigate();
  
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  
  const [supplierId, setSupplierId] = useState<string>("");
  const [warehouseId, setWarehouseId] = useState<string>("");
  const [notes, setNotes] = useState("");
  
  const [items, setItems] = useState<BatchItem[]>([
    { id: "1", productId: "", productName: "", quantity: 1 },
  ]);
  
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [suppliersRes, warehousesRes, productsRes] = await Promise.all([
        fetch(`${API_BASE}/api/suppliers`, { headers: getAuthHeaders() }),
        fetch(`${API_BASE}/api/warehouses`, { headers: getAuthHeaders() }),
        fetch(`${API_BASE}/api/products`, { headers: getAuthHeaders() }),
      ]);
      
      if (suppliersRes.ok) {
        const data = await suppliersRes.json();
        setSuppliers(data.suppliers || []);
      }
      if (warehousesRes.ok) {
        const data = await warehousesRes.json();
        setWarehouses(data.warehouses || []);
      }
      if (productsRes.ok) {
        const data = await productsRes.json();
        setProducts(data.products || []);
      }
    } catch (err) {
      console.error("Error fetching data:", err);
    }
  };

  const addItem = () => {
    setItems([
      ...items,
      { id: Date.now().toString(), productId: "", productName: "", quantity: 1 },
    ]);
  };

  const removeItem = (id: string) => {
    if (items.length > 1) {
      setItems(items.filter((item) => item.id !== id));
    }
  };

  const updateItem = (id: string, field: keyof BatchItem, value: any) => {
    setItems(
      items.map((item) => {
        if (item.id === id) {
          // إذا تم اختيار منتج، املأ البيانات تلقائياً
          if (field === "productId" && value) {
            const product = products.find((p) => p.id === value);
            if (product) {
              return {
                ...item,
                productId: value,
                productName: product.name,
                brand: product.brand,
                model: product.model,
              };
            }
          }
          return { ...item, [field]: value };
        }
        return item;
      })
    );
  };

  const handleSubmit = async () => {
    if (!supplierId) {
      message.error("يرجى اختيار المورد");
      return;
    }
    
    const validItems = items.filter((item) => item.productName && item.quantity > 0);
    if (validItems.length === 0) {
      message.error("يرجى إضافة منتج واحد على الأقل");
      return;
    }
    
    setLoading(true);
    
    try {
      const res = await fetch(`${API_BASE}/api/purchases/batches`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          supplierId,
          warehouseId: warehouseId || undefined,
          notes: notes || undefined,
          items: validItems.map((item) => ({
            productId: item.productId || undefined,
            productName: item.productName,
            brand: item.brand,
            model: item.model,
            specs: item.specs,
            quantity: item.quantity,
            notes: item.notes,
          })),
        }),
      });
      
      const data = await res.json();
      
      if (res.ok) {
        message.success(`تم إنشاء الوجبة بنجاح! رقم الوجبة: ${data.batch.batchNumber}`);
        navigate("/purchases");
      } else {
        message.error(data.error || "حدث خطأ");
      }
    } catch (err) {
      message.error("حدث خطأ في الاتصال");
    } finally {
      setLoading(false);
    }
  };

  const totalQuantity = items.reduce((sum, item) => sum + (item.quantity || 0), 0);

  return (
    <div style={{ maxWidth: 1000, margin: "0 auto" }}>
      <PageHeader
        title="إضافة وجبة شراء جديدة"
        subtitle="أضف المنتجات والكميات - المدير سيضيف الأسعار لاحقاً"
        breadcrumbs={[
          { label: "المشتريات", href: "/purchases" },
          { label: "وجبة جديدة" },
        ]}
      />

      {/* Info Box */}
      <Alert
        type="info"
        icon={<InfoCircleOutlined />}
        message="ملاحظة"
        description="أنت تضيف المنتجات والكميات فقط. بعد الحفظ، سيصل إشعار للمدير لإضافة أسعار الشراء. ثم ستصلك إشعار لبدء الاستلام والفحص."
        showIcon
        style={{ marginBottom: 24 }}
      />

      {/* Supplier & Warehouse */}
      <Card title="معلومات الوجبة" style={{ marginBottom: 24 }}>
        <Row gutter={[16, 16]}>
          <Col xs={24} md={12}>
            <Form.Item
              label="المورد"
              required
              style={{ marginBottom: 0 }}
            >
              <Select
                value={supplierId || undefined}
                onChange={(value) => setSupplierId(value)}
                placeholder="اختر المورد"
                style={{ width: "100%" }}
                showSearch
                optionFilterProp="children"
              >
                {suppliers.map((s) => (
                  <Select.Option key={s.id} value={s.id}>
                    {s.name}
                  </Select.Option>
                ))}
              </Select>
            </Form.Item>
          </Col>
          
          <Col xs={24} md={12}>
            <Form.Item
              label="المخزن المستهدف"
              style={{ marginBottom: 0 }}
            >
              <Select
                value={warehouseId || undefined}
                onChange={(value) => setWarehouseId(value)}
                placeholder="الافتراضي"
                style={{ width: "100%" }}
                allowClear
              >
                {warehouses.map((w) => (
                  <Select.Option key={w.id} value={w.id}>
                    {w.name}
                  </Select.Option>
                ))}
              </Select>
            </Form.Item>
          </Col>
        </Row>
        
        <Form.Item
          label="ملاحظات"
          style={{ marginTop: 16, marginBottom: 0 }}
        >
          <TextArea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            placeholder="ملاحظات إضافية..."
          />
        </Form.Item>
      </Card>

      {/* Items */}
      <Card
        title="المنتجات"
        extra={
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={addItem}
          >
            إضافة منتج
          </Button>
        }
        style={{ marginBottom: 24 }}
      >
        <Space direction="vertical" style={{ width: "100%" }} size="middle">
          {items.map((item, index) => (
            <Card
              key={item.id}
              size="small"
              title={`المنتج #${index + 1}`}
              extra={
                items.length > 1 && (
                  <Button
                    type="text"
                    danger
                    icon={<DeleteOutlined />}
                    onClick={() => removeItem(item.id)}
                  >
                    إزالة
                  </Button>
                )
              }
            >
              <Row gutter={[16, 16]}>
                {/* Product Selection */}
                <Col xs={24} md={16}>
                  <Form.Item
                    label="اختر منتج موجود أو أدخل يدوياً"
                    style={{ marginBottom: 0 }}
                  >
                    <Select
                      value={item.productId || undefined}
                      onChange={(value) => updateItem(item.id, "productId", value)}
                      placeholder="-- منتج جديد --"
                      style={{ width: "100%" }}
                      allowClear
                      showSearch
                      optionFilterProp="children"
                    >
                      {products.map((p) => (
                        <Select.Option key={p.id} value={p.id}>
                          {p.code ? `[${p.code}] ` : ""}{p.name}
                        </Select.Option>
                      ))}
                    </Select>
                  </Form.Item>
                </Col>
                
                {/* Quantity */}
                <Col xs={24} md={8}>
                  <Form.Item
                    label="الكمية"
                    style={{ marginBottom: 0 }}
                  >
                    <InputNumber
                      min={1}
                      value={item.quantity}
                      onChange={(value) => updateItem(item.id, "quantity", value || 1)}
                      style={{ width: "100%" }}
                    />
                  </Form.Item>
                </Col>
              </Row>
              
              {/* Manual Entry (if no product selected) */}
              {!item.productId && (
                <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
                  <Col xs={24} md={8}>
                    <Form.Item
                      label="اسم المنتج"
                      required
                      style={{ marginBottom: 0 }}
                    >
                      <Input
                        value={item.productName}
                        onChange={(e) => updateItem(item.id, "productName", e.target.value)}
                        placeholder="مثال: Dell Latitude 7410"
                      />
                    </Form.Item>
                  </Col>
                  <Col xs={24} md={8}>
                    <Form.Item
                      label="الماركة"
                      style={{ marginBottom: 0 }}
                    >
                      <Input
                        value={item.brand || ""}
                        onChange={(e) => updateItem(item.id, "brand", e.target.value)}
                        placeholder="Dell"
                      />
                    </Form.Item>
                  </Col>
                  <Col xs={24} md={8}>
                    <Form.Item
                      label="الموديل"
                      style={{ marginBottom: 0 }}
                    >
                      <Input
                        value={item.model || ""}
                        onChange={(e) => updateItem(item.id, "model", e.target.value)}
                        placeholder="Latitude 7410"
                      />
                    </Form.Item>
                  </Col>
                </Row>
              )}
              
              {/* Specs */}
              <Row style={{ marginTop: 16 }}>
                <Col span={24}>
                  <Form.Item
                    label="المواصفات المتوقعة"
                    style={{ marginBottom: 0 }}
                  >
                    <Input
                      value={item.specs || ""}
                      onChange={(e) => updateItem(item.id, "specs", e.target.value)}
                      placeholder="i7-11th | 32GB | 512GB SSD | Touch 2K"
                    />
                  </Form.Item>
                </Col>
              </Row>
            </Card>
          ))}
        </Space>
      </Card>

      {/* Summary */}
      <Card>
        <Row justify="space-between" align="middle">
          <Col>
            <Space size="large">
              <span style={{ color: "#666" }}>إجمالي الكمية:</span>
              <Statistic
                value={totalQuantity}
                suffix="جهاز"
                valueStyle={{ fontSize: 24 }}
              />
            </Space>
          </Col>
          <Col>
            <Space>
              <Button
                icon={<ArrowRightOutlined />}
                onClick={() => navigate("/purchases")}
              >
                إلغاء
              </Button>
              <Button
                type="primary"
                icon={<SaveOutlined />}
                loading={loading}
                onClick={handleSubmit}
              >
                حفظ الوجبة
              </Button>
            </Space>
          </Col>
        </Row>
      </Card>
    </div>
  );
}
