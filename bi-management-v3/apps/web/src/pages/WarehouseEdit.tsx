/**
 * صفحة تعديل المخزن
 */
import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, Form, Input, Select, Switch, Button, message, Space, Alert, Row, Col } from "antd";
import { SaveOutlined, ArrowRightOutlined } from "@ant-design/icons";
import { PageHeader, LoadingSkeleton } from "../components/shared";
import { API_BASE, getAuthHeaders } from "../utils/api";

interface Branch {
  id: string;
  name: string;
  nameAr: string | null;
}

const WAREHOUSE_TYPES = [
  { value: "main", label: "رئيسي" },
  { value: "inspection", label: "فحص" },
  { value: "preparation", label: "تحضير" },
  { value: "returns", label: "مرتجعات" },
  { value: "damaged", label: "تالف" },
  { value: "display", label: "عرض" },
  { value: "maintenance", label: "صيانة" },
];

export default function WarehouseEdit() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [branches, setBranches] = useState<Branch[]>([]);

  useEffect(() => {
    document.title = "تعديل المخزن | BI Management v3";
  }, []);

  useEffect(() => {
    if (!id) {
      setError("معرف المخزن مطلوب");
      setLoading(false);
      return;
    }

    Promise.all([
      fetch(`${API_BASE}/api/warehouses/${id}`, { headers: getAuthHeaders() }).then((r) => {
        if (!r.ok) throw new Error("المخزن غير موجود");
        return r.json();
      }),
      fetch(`${API_BASE}/api/branches?limit=100`, { headers: getAuthHeaders() }).then((r) => r.json()),
    ])
      .then(([warehouse, branchesData]) => {
        setBranches(branchesData.data || []);

        form.setFieldsValue({
          code: warehouse.code || "",
          name: warehouse.name || "",
          nameAr: warehouse.nameAr || "",
          branchId: warehouse.branchId || undefined,
          type: warehouse.type || "main",
          isActive: warehouse.isActive === 1,
        });
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [id, form]);

  const handleSubmit = async (values: Record<string, unknown>) => {
    setSubmitting(true);
    try {
      const res = await fetch(`${API_BASE}/api/warehouses/${id}`, {
        method: "PUT",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          code: values.code || null,
          name: values.name,
          nameAr: values.nameAr || null,
          branchId: values.branchId || null,
          type: values.type || "main",
          isActive: values.isActive ? 1 : 0,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "فشل تحديث المخزن");
      }

      message.success("تم تحديث المخزن بنجاح");
      navigate(`/warehouses/${id}`);
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
          title="تعديل المخزن"
          breadcrumbs={[
            { title: "المخازن", href: "/warehouses" },
            { title: "تعديل" },
          ]}
        />
        <LoadingSkeleton type="form" rows={6} />
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <PageHeader
          title="تعديل المخزن"
          breadcrumbs={[
            { title: "المخازن", href: "/warehouses" },
            { title: "خطأ" },
          ]}
        />
        <Alert
          message="خطأ"
          description={error}
          type="error"
          showIcon
          action={
            <Button type="link" onClick={() => navigate("/warehouses")}>
              العودة للمخازن
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="تعديل المخزن"
        breadcrumbs={[
          { title: "المخازن", href: "/warehouses" },
          { title: "تعديل" },
        ]}
        extra={
          <Button icon={<ArrowRightOutlined />} onClick={() => navigate(`/warehouses/${id}`)}>
            العودة للتفاصيل
          </Button>
        }
      />

      <Card style={{ maxWidth: 700 }}>
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Row gutter={16}>
            <Col xs={24} sm={8}>
              <Form.Item name="code" label="كود المخزن">
                <Input placeholder="مثال: WH001" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={8}>
              <Form.Item
                name="name"
                label="الاسم (إنجليزي)"
                rules={[{ required: true, message: "الاسم مطلوب" }]}
              >
                <Input placeholder="اسم المخزن بالإنجليزية" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={8}>
              <Form.Item name="nameAr" label="الاسم (عربي)">
                <Input placeholder="اسم المخزن بالعربية" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col xs={24} sm={12}>
              <Form.Item name="branchId" label="الفرع">
                <Select placeholder="اختر الفرع" allowClear>
                  {branches.map((branch) => (
                    <Select.Option key={branch.id} value={branch.id}>
                      {branch.nameAr || branch.name}
                    </Select.Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item
                name="type"
                label="نوع المخزن"
                rules={[{ required: true, message: "نوع المخزن مطلوب" }]}
              >
                <Select placeholder="اختر نوع المخزن">
                  {WAREHOUSE_TYPES.map((type) => (
                    <Select.Option key={type.value} value={type.value}>
                      {type.label}
                    </Select.Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="isActive" label="الحالة" valuePropName="checked">
            <Switch checkedChildren="نشط" unCheckedChildren="غير نشط" />
          </Form.Item>

          <Space>
            <Button onClick={() => navigate(`/warehouses/${id}`)}>إلغاء</Button>
            <Button type="primary" htmlType="submit" icon={<SaveOutlined />} loading={submitting}>
              حفظ التعديلات
            </Button>
          </Space>
        </Form>
      </Card>
    </div>
  );
}
