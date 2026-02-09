import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Row, Col, Card, Form, Input, Select, Button, Switch, message, Space, Alert } from "antd";
import { SaveOutlined, ArrowRightOutlined } from "@ant-design/icons";
import { PageHeader, LoadingSkeleton } from "../components/shared";
import { API_BASE, getAuthHeaders, fetchList } from "../utils/api";

const TYPE_OPTIONS = [
  { value: "asset", label: "أصول" },
  { value: "liability", label: "خصوم" },
  { value: "equity", label: "حقوق ملكية" },
  { value: "revenue", label: "إيرادات" },
  { value: "expense", label: "مصروفات" },
];

const NATURE_OPTIONS = [
  { value: "debit", label: "مدين" },
  { value: "credit", label: "دائن" },
];

type Account = {
  id: string;
  code: string;
  name: string;
  nameAr: string | null;
  type: string;
  isSystem?: number;
};

export default function AccountEdit() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [accountName, setAccountName] = useState("");
  const [isSystem, setIsSystem] = useState(false);
  const [accounts, setAccounts] = useState<Account[]>([]);

  useEffect(() => {
    document.title = "تعديل حساب | BI Management v3";
  }, []);

  useEffect(() => {
    if (!id) {
      setError("معرف الحساب مطلوب");
      setLoading(false);
      return;
    }

    Promise.all([
      fetch(`${API_BASE}/api/accounts/${id}`, { headers: getAuthHeaders() }).then((r) => {
        if (!r.ok) throw new Error("الحساب غير موجود");
        return r.json();
      }),
      fetchList<Account>("/api/accounts", 1, 500),
    ])
      .then(([data, accountsResult]) => {
        setAccountName(data.nameAr || data.name);
        setIsSystem(data.isSystem === 1);
        setAccounts(accountsResult.data.filter((a: Account) => a.id !== id));
        form.setFieldsValue({
          code: data.code || "",
          name: data.name || "",
          nameAr: data.nameAr || "",
          parentId: data.parentId || undefined,
          type: data.type || "asset",
          nature: data.nature || "debit",
          description: data.description || "",
          isActive: data.isActive === 1,
        });
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [id, form]);

  const handleSubmit = async (values: Record<string, unknown>) => {
    setSubmitting(true);
    try {
      const payload = {
        code: (values.code as string)?.trim(),
        name: (values.name as string)?.trim(),
        nameAr: (values.nameAr as string)?.trim() || null,
        parentId: values.parentId || null,
        type: values.type,
        nature: values.nature || "debit",
        description: (values.description as string)?.trim() || null,
        isActive: values.isActive ? 1 : 0,
      };

      const res = await fetch(`${API_BASE}/api/accounts/${id}`, {
        method: "PUT",
        headers: getAuthHeaders(),
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "فشل تحديث الحساب");
      }

      message.success("تم تحديث الحساب بنجاح");
      navigate(`/accounts/${id}`);
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
          title="تعديل الحساب"
          breadcrumbs={[
            { title: "المحاسبة" },
            { title: "شجرة الحسابات", href: "/accounts" },
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
          title="تعديل الحساب"
          breadcrumbs={[
            { title: "المحاسبة" },
            { title: "شجرة الحسابات", href: "/accounts" },
            { title: "خطأ" },
          ]}
        />
        <Alert
          message="خطأ"
          description={error}
          type="error"
          showIcon
          action={
            <Button type="link" onClick={() => navigate("/accounts")}>
              العودة للحسابات
            </Button>
          }
        />
      </div>
    );
  }

  // Group accounts by type for parent selection
  const groupedAccounts = accounts.reduce((acc, account) => {
    const type = TYPE_OPTIONS.find((t) => t.value === account.type)?.label || account.type;
    if (!acc[type]) acc[type] = [];
    acc[type].push(account);
    return acc;
  }, {} as Record<string, Account[]>);

  const parentOptions = Object.entries(groupedAccounts).map(([type, accs]) => ({
    label: type,
    options: accs.map((a) => ({
      value: a.id,
      label: `${a.code} - ${a.nameAr || a.name}`,
    })),
  }));

  return (
    <div>
      <PageHeader
        title={`تعديل الحساب: ${accountName}`}
        breadcrumbs={[
          { title: "المحاسبة" },
          { title: "شجرة الحسابات", href: "/accounts" },
          { title: accountName, href: `/accounts/${id}` },
          { title: "تعديل" },
        ]}
        extra={
          <Button icon={<ArrowRightOutlined />} onClick={() => navigate(`/accounts/${id}`)}>
            العودة للتفاصيل
          </Button>
        }
      />

      {isSystem && (
        <Alert
          message="حساب نظامي"
          description="هذا حساب نظامي ولا يمكن تعديل بعض خصائصه"
          type="warning"
          showIcon
          style={{ marginBottom: 24 }}
        />
      )}

      <Form form={form} layout="vertical" onFinish={handleSubmit} style={{ maxWidth: 800 }}>
        <Card title="معلومات الحساب" style={{ marginBottom: 24 }}>
          <Row gutter={16}>
            <Col xs={24} md={8}>
              <Form.Item
                name="code"
                label="كود الحساب"
                rules={[{ required: true, message: "الكود مطلوب" }]}
              >
                <Input
                  placeholder="مثال: 1101"
                  style={{ fontFamily: "monospace" }}
                  disabled={isSystem}
                />
              </Form.Item>
            </Col>
            <Col xs={24} md={8}>
              <Form.Item
                name="name"
                label="الاسم (إنجليزي)"
                rules={[{ required: true, message: "الاسم مطلوب" }]}
              >
                <Input placeholder="Account Name" disabled={isSystem} />
              </Form.Item>
            </Col>
            <Col xs={24} md={8}>
              <Form.Item name="nameAr" label="الاسم (عربي)">
                <Input placeholder="اسم الحساب" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col xs={24} md={8}>
              <Form.Item
                name="type"
                label="نوع الحساب"
                rules={[{ required: true, message: "النوع مطلوب" }]}
              >
                <Select options={TYPE_OPTIONS} disabled={isSystem} />
              </Form.Item>
            </Col>
            <Col xs={24} md={8}>
              <Form.Item name="nature" label="طبيعة الحساب">
                <Select options={NATURE_OPTIONS} disabled={isSystem} />
              </Form.Item>
            </Col>
            <Col xs={24} md={8}>
              <Form.Item name="parentId" label="الحساب الأب">
                <Select
                  options={parentOptions}
                  allowClear
                  showSearch
                  placeholder="اختر الحساب الأب (اختياري)"
                  filterOption={(input, option) =>
                    (option?.label ?? "").toLowerCase().includes(input.toLowerCase())
                  }
                />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col xs={12} md={6}>
              <Form.Item name="isActive" label="نشط" valuePropName="checked">
                <Switch checkedChildren="نعم" unCheckedChildren="لا" disabled={isSystem} />
              </Form.Item>
            </Col>
          </Row>
        </Card>

        <Card title="الوصف" style={{ marginBottom: 24 }}>
          <Form.Item name="description" style={{ marginBottom: 0 }}>
            <Input.TextArea rows={3} placeholder="وصف الحساب (اختياري)" />
          </Form.Item>
        </Card>

        <Space>
          <Button onClick={() => navigate(`/accounts/${id}`)}>إلغاء</Button>
          <Button
            type="primary"
            htmlType="submit"
            loading={submitting}
            icon={<SaveOutlined />}
            disabled={isSystem}
          >
            حفظ التعديلات
          </Button>
        </Space>
      </Form>
    </div>
  );
}
