/**
 * صفحة إنشاء مرتجع جديد
 */
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Row, Col, Card, Form, Input, Select, Button, InputNumber, message, Space, Spin } from "antd";
import { SaveOutlined, ArrowRightOutlined, SearchOutlined, DeleteOutlined, CheckOutlined } from "@ant-design/icons";
import { PageHeader, LoadingSkeleton } from "../components/shared";
import { API_BASE, getAuthHeaders } from "../utils/api";

interface Supplier {
  id: string;
  name: string;
  phone?: string;
  email?: string;
}

interface SearchItem {
  type: "serial" | "product";
  id: string;
  serialNumber?: string;
  productId?: string;
  productName?: string;
  productModel?: string;
  name?: string;
  model?: string;
  sku?: string;
  status?: string;
}

interface ReturnItem {
  id: string;
  type: "serial" | "product";
  productId?: string;
  productName: string;
  productModel?: string;
  serialId?: string;
  serialNumber?: string;
  quantity: number;
  returnReason: string;
  reasonDetails?: string;
}

const RETURN_REASONS = [
  { value: "defective", label: "عيب مصنعي" },
  { value: "wrong_item", label: "منتج خاطئ" },
  { value: "damaged", label: "تلف أثناء الشحن" },
  { value: "warranty", label: "ضمان" },
  { value: "other", label: "أخرى" },
];

const RETURN_TYPES = [
  { value: "defective", label: "معيب" },
  { value: "warranty", label: "ضمان" },
  { value: "exchange", label: "استبدال" },
  { value: "other", label: "أخرى" },
];

export default function ReturnCreate() {
  const navigate = useNavigate();
  const [form] = Form.useForm();

  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [supplierId, setSupplierId] = useState("");
  const [returnType, setReturnType] = useState("defective");
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<ReturnItem[]>([]);

  // Search state
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchItem[]>([]);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    fetchSuppliers();
  }, []);

  const fetchSuppliers = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/returns/suppliers`, {
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        const data = await res.json();
        setSuppliers(data.suppliers || []);
      }
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  };

  const searchItems = async (q: string) => {
    if (!q || q.length < 2) {
      setSearchResults([]);
      return;
    }

    setSearching(true);
    try {
      const res = await fetch(
        `${API_BASE}/api/returns/search-items?q=${encodeURIComponent(q)}&supplierId=${supplierId}`,
        { headers: getAuthHeaders() }
      );
      if (res.ok) {
        const data = await res.json();
        setSearchResults(data.items || []);
      }
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setSearching(false);
    }
  };

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    const timeoutId = setTimeout(() => {
      searchItems(value);
    }, 300);
    return () => clearTimeout(timeoutId);
  };

  const addItem = (item: SearchItem) => {
    const exists = items.some(
      (i) =>
        (item.type === "serial" && i.serialId === item.id) ||
        (item.type === "product" && i.productId === item.id && !i.serialId)
    );

    if (exists) {
      message.warning("هذا العنصر موجود بالفعل");
      return;
    }

    const newItem: ReturnItem = {
      id: `temp_${Date.now()}`,
      type: item.type,
      productId: item.type === "serial" ? item.productId : item.id,
      productName: item.type === "serial" ? item.productName || "" : item.name || "",
      productModel: item.type === "serial" ? item.productModel : item.model,
      serialId: item.type === "serial" ? item.id : undefined,
      serialNumber: item.type === "serial" ? item.serialNumber : undefined,
      quantity: 1,
      returnReason: "defective",
    };

    setItems([...items, newItem]);
    setSearchQuery("");
    setSearchResults([]);
  };

  const removeItem = (id: string) => {
    setItems(items.filter((i) => i.id !== id));
  };

  const updateItem = (id: string, field: string, value: any) => {
    setItems(items.map((i) => (i.id === id ? { ...i, [field]: value } : i)));
  };

  const handleSubmit = async () => {
    if (!supplierId) {
      message.error("الرجاء اختيار المورد");
      return;
    }

    if (items.length === 0) {
      message.error("الرجاء إضافة عنصر واحد على الأقل");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`${API_BASE}/api/returns`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          supplierId,
          returnType,
          notes,
          items: items.map((i) => ({
            productId: i.productId,
            productName: i.productName,
            productModel: i.productModel,
            serialId: i.serialId,
            serialNumber: i.serialNumber,
            quantity: i.quantity,
            returnReason: i.returnReason,
            reasonDetails: i.reasonDetails,
          })),
        }),
      });

      const data = await res.json();

      if (res.ok) {
        message.success("تم إنشاء المرتجع بنجاح");
        navigate(`/returns/${data.returnId}`);
      } else {
        message.error(data.error || "فشل في إنشاء المرتجع");
      }
    } catch (error) {
      message.error("حدث خطأ في الاتصال");
    } finally {
      setSubmitting(false);
    }
  };

  const breadcrumbs = [
    { title: "المرتجعات", path: "/returns" },
    { title: "مرتجع جديد" },
  ];

  if (loading) {
    return <LoadingSkeleton />;
  }

  return (
    <div>
      <PageHeader
        title="مرتجع جديد للمورد"
        subtitle="إنشاء طلب مرتجع جديد"
        breadcrumbs={breadcrumbs}
      />

      <Form form={form} layout="vertical">
        <Row gutter={[24, 24]}>
          {/* Supplier & Type Card */}
          <Col xs={24}>
            <Card title="معلومات المرتجع">
              <Row gutter={16}>
                <Col xs={24} md={12}>
                  <Form.Item
                    label="المورد"
                    required
                    rules={[{ required: true, message: "الرجاء اختيار المورد" }]}
                  >
                    <Select
                      value={supplierId || undefined}
                      onChange={(value) => setSupplierId(value)}
                      placeholder="اختر المورد..."
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
                  <Form.Item label="نوع المرتجع">
                    <Select
                      value={returnType}
                      onChange={(value) => setReturnType(value)}
                    >
                      {RETURN_TYPES.map((t) => (
                        <Select.Option key={t.value} value={t.value}>
                          {t.label}
                        </Select.Option>
                      ))}
                    </Select>
                  </Form.Item>
                </Col>
              </Row>
            </Card>
          </Col>

          {/* Items Card */}
          <Col xs={24}>
            <Card title="العناصر المرتجعة">
              {/* Search */}
              <div style={{ marginBottom: 16, position: "relative" }}>
                <Input
                  prefix={<SearchOutlined />}
                  suffix={searching ? <Spin size="small" /> : null}
                  value={searchQuery}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  placeholder="بحث بالسيريال أو اسم المنتج..."
                  size="large"
                />

                {/* Search Results */}
                {searchResults.length > 0 && (
                  <div
                    style={{
                      position: "absolute",
                      zIndex: 10,
                      width: "100%",
                      background: "#fff",
                      border: "1px solid #d9d9d9",
                      borderRadius: 8,
                      boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
                      marginTop: 4,
                      maxHeight: 256,
                      overflow: "auto",
                    }}
                  >
                    {searchResults.map((item) => (
                      <div
                        key={`${item.type}-${item.id}`}
                        onClick={() => addItem(item)}
                        style={{
                          padding: "12px 16px",
                          cursor: "pointer",
                          borderBottom: "1px solid #f0f0f0",
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = "#f5f5f5")}
                        onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                      >
                        {item.type === "serial" ? (
                          <div>
                            <span style={{ fontFamily: "monospace", color: "#1890ff" }}>
                              {item.serialNumber}
                            </span>
                            <p style={{ margin: 0, fontSize: "0.85rem", color: "#6b7280" }}>
                              {item.productName} {item.productModel && `- ${item.productModel}`}
                            </p>
                          </div>
                        ) : (
                          <div>
                            <span style={{ fontWeight: 500 }}>{item.name}</span>
                            {item.model && (
                              <span style={{ color: "#6b7280", fontSize: "0.85rem", marginRight: 8 }}>
                                {item.model}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Items List */}
              {items.length === 0 ? (
                <div
                  style={{
                    textAlign: "center",
                    padding: "48px 24px",
                    color: "#9ca3af",
                    border: "2px dashed #d9d9d9",
                    borderRadius: 8,
                  }}
                >
                  ابحث وأضف العناصر المراد إرجاعها
                </div>
              ) : (
                <Space direction="vertical" style={{ width: "100%" }} size="middle">
                  {items.map((item) => (
                    <Card
                      key={item.id}
                      size="small"
                      style={{ background: "#fafafa" }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                        <div>
                          <p style={{ margin: 0, fontWeight: 500 }}>{item.productName}</p>
                          {item.serialNumber && (
                            <p style={{ margin: 0, fontSize: "0.85rem", fontFamily: "monospace", color: "#1890ff" }}>
                              {item.serialNumber}
                            </p>
                          )}
                          {item.productModel && (
                            <p style={{ margin: 0, fontSize: "0.85rem", color: "#6b7280" }}>{item.productModel}</p>
                          )}
                        </div>
                        <Button
                          type="text"
                          danger
                          icon={<DeleteOutlined />}
                          onClick={() => removeItem(item.id)}
                        />
                      </div>

                      <Row gutter={16}>
                        {!item.serialNumber && (
                          <Col xs={24} md={8}>
                            <Form.Item label="الكمية" style={{ marginBottom: 0 }}>
                              <InputNumber
                                min={1}
                                value={item.quantity}
                                onChange={(value) => updateItem(item.id, "quantity", value || 1)}
                                style={{ width: "100%" }}
                              />
                            </Form.Item>
                          </Col>
                        )}
                        <Col xs={24} md={item.serialNumber ? 12 : 8}>
                          <Form.Item label="سبب الإرجاع" style={{ marginBottom: 0 }}>
                            <Select
                              value={item.returnReason}
                              onChange={(value) => updateItem(item.id, "returnReason", value)}
                              style={{ width: "100%" }}
                            >
                              {RETURN_REASONS.map((r) => (
                                <Select.Option key={r.value} value={r.value}>
                                  {r.label}
                                </Select.Option>
                              ))}
                            </Select>
                          </Form.Item>
                        </Col>
                        <Col xs={24} md={item.serialNumber ? 12 : 8}>
                          <Form.Item label="تفاصيل" style={{ marginBottom: 0 }}>
                            <Input
                              value={item.reasonDetails || ""}
                              onChange={(e) => updateItem(item.id, "reasonDetails", e.target.value)}
                              placeholder="تفاصيل إضافية..."
                            />
                          </Form.Item>
                        </Col>
                      </Row>
                    </Card>
                  ))}
                </Space>
              )}

              <div style={{ marginTop: 16, paddingTop: 16, borderTop: "1px solid #f0f0f0" }}>
                <p style={{ margin: 0, fontSize: "0.9rem", color: "#6b7280" }}>
                  إجمالي العناصر: <span style={{ fontWeight: 700 }}>{items.length}</span>
                </p>
              </div>
            </Card>
          </Col>

          {/* Notes Card */}
          <Col xs={24}>
            <Card title="ملاحظات">
              <Input.TextArea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                placeholder="أي ملاحظات إضافية..."
              />
            </Card>
          </Col>
        </Row>

        {/* Actions */}
        <div style={{ marginTop: 24, display: "flex", gap: 16 }}>
          <Button
            block
            type="primary"
            size="large"
            onClick={handleSubmit}
            loading={submitting}
            disabled={items.length === 0}
            icon={<CheckOutlined />}
          >
            إنشاء المرتجع
          </Button>
          <Button
            size="large"
            onClick={() => navigate(-1)}
            icon={<ArrowRightOutlined />}
          >
            إلغاء
          </Button>
        </div>
      </Form>
    </div>
  );
}
