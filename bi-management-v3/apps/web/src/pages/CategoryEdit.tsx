/**
 * صفحة تعديل التصنيف
 */
import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, Form, Input, InputNumber, Select, Switch, Button, message, Space, Alert } from "antd";
import { SaveOutlined, ArrowRightOutlined } from "@ant-design/icons";
import { PageHeader, LoadingSkeleton } from "../components/shared";
import { API_BASE, getAuthHeaders } from "../utils/api";

interface Category {
  id: string;
  code: string | null;
  name: string;
  nameAr: string | null;
  parentId: string | null;
  sortOrder: number | null;
  description: string | null;
  isActive: number | null;
}

export default function CategoryEdit() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [categories, setCategories] = useState<Category[]>([]);

  useEffect(() => {
    document.title = "تعديل التصنيف | BI Management v3";
  }, []);

  useEffect(() => {
    if (!id) {
      setError("معرف التصنيف مطلوب");
      setLoading(false);
      return;
    }

    Promise.all([
      fetch(`${API_BASE}/api/categories/${id}`, { headers: getAuthHeaders() }).then((r) => {
        if (!r.ok) throw new Error("التصنيف غير موجود");
        return r.json();
      }),
      fetch(`${API_BASE}/api/categories?limit=100`, { headers: getAuthHeaders() }).then((r) => r.json()),
    ])
      .then(([category, categoriesData]) => {
        // Filter out current category from parent options
        setCategories((categoriesData.data || []).filter((c: Category) => c.id !== id));

        form.setFieldsValue({
          code: category.code || "",
          name: category.name || "",
          nameAr: category.nameAr || "",
          parentId: category.parentId || undefined,
          sortOrder: category.sortOrder || 0,
          description: category.description || "",
          isActive: category.isActive === 1,
        });
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [id, form]);

  const handleSubmit = async (values: Record<string, unknown>) => {
    setSubmitting(true);
    try {
      const res = await fetch(`${API_BASE}/api/categories/${id}`, {
        method: "PUT",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          code: values.code || null,
          name: values.name,
          nameAr: values.nameAr || null,
          parentId: values.parentId || null,
          sortOrder: values.sortOrder || 0,
          description: values.description || null,
          isActive: values.isActive ? 1 : 0,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "فشل تحديث التصنيف");
      }

      message.success("تم تحديث التصنيف بنجاح");
      navigate(`/categories/${id}`);
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
          title="تعديل التصنيف"
          breadcrumbs={[
            { title: "التصنيفات", href: "/categories" },
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
          title="تعديل التصنيف"
          breadcrumbs={[
            { title: "التصنيفات", href: "/categories" },
            { title: "خطأ" },
          ]}
        />
        <Alert
          message="خطأ"
          description={error}
          type="error"
          showIcon
          action={
            <Button type="link" onClick={() => navigate("/categories")}>
              العودة للتصنيفات
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="تعديل التصنيف"
        breadcrumbs={[
          { title: "التصنيفات", href: "/categories" },
          { title: "تعديل" },
        ]}
        extra={
          <Button icon={<ArrowRightOutlined />} onClick={() => navigate(`/categories/${id}`)}>
            العودة للتفاصيل
          </Button>
        }
      />

      <Card style={{ maxWidth: 700 }}>
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item name="code" label="الكود">
            <Input placeholder="مثال: CAT001" />
          </Form.Item>

          <Form.Item
            name="name"
            label="الاسم (إنجليزي)"
            rules={[{ required: true, message: "الاسم مطلوب" }]}
          >
            <Input placeholder="اسم التصنيف بالإنجليزية" />
          </Form.Item>

          <Form.Item name="nameAr" label="الاسم (عربي)">
            <Input placeholder="اسم التصنيف بالعربية" />
          </Form.Item>

          <Form.Item name="parentId" label="التصنيف الأب">
            <Select placeholder="اختر التصنيف الأب (اختياري)" allowClear>
              {categories.map((cat) => (
                <Select.Option key={cat.id} value={cat.id}>
                  {cat.nameAr || cat.name}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item name="sortOrder" label="ترتيب العرض">
            <InputNumber style={{ width: "100%" }} min={0} placeholder="0" />
          </Form.Item>

          <Form.Item name="description" label="الوصف">
            <Input.TextArea rows={3} placeholder="وصف التصنيف..." />
          </Form.Item>

          <Form.Item name="isActive" label="الحالة" valuePropName="checked">
            <Switch checkedChildren="نشط" unCheckedChildren="غير نشط" />
          </Form.Item>

          <Space>
            <Button onClick={() => navigate(`/categories/${id}`)}>إلغاء</Button>
            <Button type="primary" htmlType="submit" icon={<SaveOutlined />} loading={submitting}>
              حفظ التعديلات
            </Button>
          </Space>
        </Form>
      </Card>
    </div>
  );
}
