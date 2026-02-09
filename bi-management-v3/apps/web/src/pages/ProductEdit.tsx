import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Row, Col, Card, Form, Input, Select, Button, InputNumber, Switch, message, Space, Alert } from "antd";
import { SaveOutlined, ArrowRightOutlined, BarcodeOutlined } from "@ant-design/icons";
import { PageHeader, LoadingSkeleton } from "../components/shared";
import { API_BASE, getAuthHeaders } from "../utils/api";

const UNIT_OPTIONS = [
  { value: "piece", label: "قطعة" },
  { value: "kg", label: "كجم" },
  { value: "gram", label: "جرام" },
  { value: "liter", label: "لتر" },
  { value: "meter", label: "متر" },
  { value: "box", label: "صندوق" },
  { value: "pack", label: "عبوة" },
  { value: "set", label: "طقم" },
];

export default function ProductEdit() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [productName, setProductName] = useState("");

  useEffect(() => {
    document.title = "تعديل منتج | BI Management v3";
  }, []);

  useEffect(() => {
    if (!id) {
      setError("معرف المنتج مطلوب");
      setLoading(false);
      return;
    }

    fetch(`${API_BASE}/api/products/${id}`, { headers: getAuthHeaders() })
      .then((res) => {
        if (!res.ok) throw new Error("المنتج غير موجود");
        return res.json();
      })
      .then((data) => {
        setProductName(data.nameAr || data.name);
        form.setFieldsValue({
          name: data.name || "",
          nameAr: data.nameAr || "",
          code: data.code || "",
          unit: data.unit || "piece",
          sellingPrice: data.sellingPrice || 0,
          purchasePrice: data.purchasePrice || data.costPrice || 0,
          quantity: data.quantity || 0,
          minQuantity: data.minQuantity || 0,
          trackBySerial: data.trackBySerial === 1,
          isActive: data.isActive === 1,
          description: data.description || "",
        });
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [id, form]);

  const handleSubmit = async (values: Record<string, unknown>) => {
    setSubmitting(true);
    try {
      const payload = {
        name: (values.name as string)?.trim(),
        nameAr: (values.nameAr as string)?.trim() || null,
        code: (values.code as string)?.trim() || null,
        unit: values.unit,
        sellingPrice: values.sellingPrice || 0,
        purchasePrice: values.purchasePrice || 0,
        quantity: values.quantity || 0,
        minQuantity: values.minQuantity || 0,
        trackBySerial: values.trackBySerial ? 1 : 0,
        isActive: values.isActive ? 1 : 0,
        description: (values.description as string)?.trim() || null,
      };

      const res = await fetch(`${API_BASE}/api/products/${id}`, {
        method: "PUT",
        headers: getAuthHeaders(),
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "فشل تحديث المنتج");
      }

      message.success("تم تحديث بيانات المنتج بنجاح");
      navigate(`/products/${id}`);
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
          title="تعديل المنتج"
          breadcrumbs={[
            { title: "المنتجات", href: "/products" },
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
          title="تعديل المنتج"
          breadcrumbs={[
            { title: "المنتجات", href: "/products" },
            { title: "خطأ" },
          ]}
        />
        <Alert
          message="خطأ"
          description={error}
          type="error"
          showIcon
          action={
            <Button type="link" onClick={() => navigate("/products")}>
              العودة للمنتجات
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title={`تعديل المنتج: ${productName}`}
        breadcrumbs={[
          { title: "المنتجات", href: "/products" },
          { title: productName, href: `/products/${id}` },
          { title: "تعديل" },
        ]}
        extra={
          <Button icon={<ArrowRightOutlined />} onClick={() => navigate(`/products/${id}`)}>
            العودة للتفاصيل
          </Button>
        }
      />

      <Form form={form} layout="vertical" onFinish={handleSubmit} style={{ maxWidth: 900 }}>
        <Card title="المعلومات الأساسية" style={{ marginBottom: 24 }}>
          <Row gutter={16}>
            <Col xs={24} md={8}>
              <Form.Item name="code" label="الكود">
                <Input prefix={<BarcodeOutlined />} placeholder="كود المنتج" />
              </Form.Item>
            </Col>
            <Col xs={24} md={8}>
              <Form.Item
                name="name"
                label="الاسم (إنجليزي)"
                rules={[{ required: true, message: "الاسم مطلوب" }]}
              >
                <Input placeholder="Product Name" />
              </Form.Item>
            </Col>
            <Col xs={24} md={8}>
              <Form.Item name="nameAr" label="الاسم (عربي)">
                <Input placeholder="اسم المنتج" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col xs={24} md={8}>
              <Form.Item name="unit" label="الوحدة">
                <Select options={UNIT_OPTIONS} />
              </Form.Item>
            </Col>
            <Col xs={12} md={4}>
              <Form.Item name="trackBySerial" label="تتبع سيريال" valuePropName="checked">
                <Switch checkedChildren="نعم" unCheckedChildren="لا" />
              </Form.Item>
            </Col>
            <Col xs={12} md={4}>
              <Form.Item name="isActive" label="نشط" valuePropName="checked">
                <Switch checkedChildren="نعم" unCheckedChildren="لا" />
              </Form.Item>
            </Col>
          </Row>
        </Card>

        <Card title="الأسعار" style={{ marginBottom: 24 }}>
          <Row gutter={16}>
            <Col xs={24} md={12}>
              <Form.Item name="purchasePrice" label="سعر الشراء">
                <InputNumber
                  style={{ width: "100%" }}
                  min={0}
                  placeholder="0"
                  formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")}
                />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item name="sellingPrice" label="سعر البيع">
                <InputNumber
                  style={{ width: "100%" }}
                  min={0}
                  placeholder="0"
                  formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")}
                />
              </Form.Item>
            </Col>
          </Row>
        </Card>

        <Card title="المخزون" style={{ marginBottom: 24 }}>
          <Row gutter={16}>
            <Col xs={24} md={12}>
              <Form.Item name="quantity" label="الكمية الحالية">
                <InputNumber style={{ width: "100%" }} min={0} placeholder="0" />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item name="minQuantity" label="الحد الأدنى للتنبيه">
                <InputNumber style={{ width: "100%" }} min={0} placeholder="0" />
              </Form.Item>
            </Col>
          </Row>
        </Card>

        <Card title="الوصف" style={{ marginBottom: 24 }}>
          <Form.Item name="description" style={{ marginBottom: 0 }}>
            <Input.TextArea rows={4} placeholder="وصف المنتج..." />
          </Form.Item>
        </Card>

        <Space>
          <Button onClick={() => navigate(`/products/${id}`)}>إلغاء</Button>
          <Button type="primary" htmlType="submit" loading={submitting} icon={<SaveOutlined />}>
            حفظ التعديلات
          </Button>
        </Space>
      </Form>
    </div>
  );
}
