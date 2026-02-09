import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Row, Col, Card, Form, Input, DatePicker, Button, Select, InputNumber, Table, message, Space, Alert, Tag } from "antd";
import { SaveOutlined, ArrowRightOutlined, PlusOutlined, DeleteOutlined, CheckCircleOutlined } from "@ant-design/icons";
import type { TableColumnsType } from "antd";
import dayjs from "dayjs";
import { PageHeader, MoneyDisplay, LoadingSkeleton } from "../components/shared";
import { API_BASE, getAuthHeaders, fetchList } from "../utils/api";

type Account = {
  id: string;
  code: string;
  name: string;
  nameAr: string | null;
  type: string;
};

type JournalLine = {
  key: string;
  accountId: string;
  debit: number;
  credit: number;
  description: string;
};

const TYPE_OPTIONS = [
  { value: "asset", label: "أصول" },
  { value: "liability", label: "خصوم" },
  { value: "equity", label: "حقوق ملكية" },
  { value: "revenue", label: "إيرادات" },
  { value: "expense", label: "مصروفات" },
];

export default function JournalEntryEdit() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState("");
  const [entryNumber, setEntryNumber] = useState("");
  const [status, setStatus] = useState("draft");
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [lines, setLines] = useState<JournalLine[]>([]);

  useEffect(() => {
    document.title = "تعديل قيد محاسبي | BI Management v3";
  }, []);

  useEffect(() => {
    if (!id) {
      setError("معرف القيد مطلوب");
      setLoading(false);
      return;
    }

    Promise.all([
      fetch(`${API_BASE}/api/journal-entries/${id}`, { headers: getAuthHeaders() }).then((r) => {
        if (!r.ok) throw new Error("القيد غير موجود");
        return r.json();
      }),
      fetchList<Account>("/api/accounts", 1, 500),
    ])
      .then(([data, accountsResult]) => {
        setEntryNumber(data.entryNumber);
        setStatus(data.status || "draft");
        setAccounts(accountsResult.data);
        form.setFieldsValue({
          entryDate: dayjs(data.entryDate),
          description: data.description || "",
        });
        setLines(
          (data.lines || []).map((l: { id: string; accountId: string; debit: number; credit: number; description: string }) => ({
            key: l.id,
            accountId: l.accountId,
            debit: l.debit || 0,
            credit: l.credit || 0,
            description: l.description || "",
          }))
        );
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [id, form]);

  const totalDebit = lines.reduce((sum, l) => sum + (l.debit || 0), 0);
  const totalCredit = lines.reduce((sum, l) => sum + (l.credit || 0), 0);
  const isBalanced = Math.abs(totalDebit - totalCredit) < 0.01;
  const isDraft = status === "draft";

  const addLine = () => {
    setLines([
      ...lines,
      { key: Date.now().toString(), accountId: "", debit: 0, credit: 0, description: "" },
    ]);
  };

  const removeLine = (key: string) => {
    if (lines.length > 2) {
      setLines(lines.filter((l) => l.key !== key));
    }
  };

  const updateLine = (key: string, field: keyof JournalLine, value: unknown) => {
    setLines(
      lines.map((l) =>
        l.key === key
          ? {
              ...l,
              [field]: value,
              ...(field === "debit" && value ? { credit: 0 } : {}),
              ...(field === "credit" && value ? { debit: 0 } : {}),
            }
          : l
      )
    );
  };

  const handleSubmit = async (values: Record<string, unknown>) => {
    if (!isBalanced) {
      message.error("القيد غير متوازن");
      return;
    }

    const validLines = lines.filter((l) => l.accountId && (l.debit > 0 || l.credit > 0));
    if (validLines.length < 2) {
      message.error("يجب إضافة حسابين على الأقل");
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        entryDate: (values.entryDate as dayjs.Dayjs).format("YYYY-MM-DD"),
        description: (values.description as string)?.trim() || null,
        lines: validLines.map((l) => ({
          accountId: l.accountId,
          debit: l.debit || 0,
          credit: l.credit || 0,
          description: l.description?.trim() || null,
        })),
      };

      const res = await fetch(`${API_BASE}/api/journal-entries/${id}`, {
        method: "PUT",
        headers: getAuthHeaders(),
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "فشل تحديث القيد");
      }

      message.success("تم تحديث القيد بنجاح");
      navigate(`/journal-entries/${id}`);
    } catch (err: unknown) {
      message.error(err instanceof Error ? err.message : "حدث خطأ");
    } finally {
      setSubmitting(false);
    }
  };

  const handlePost = async () => {
    if (!isBalanced) {
      message.error("القيد غير متوازن - لا يمكن الترحيل");
      return;
    }

    setPosting(true);
    try {
      const res = await fetch(`${API_BASE}/api/journal-entries/${id}/post`, {
        method: "POST",
        headers: getAuthHeaders(),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "فشل ترحيل القيد");
      }

      message.success("تم ترحيل القيد بنجاح");
      setStatus("posted");
    } catch (err: unknown) {
      message.error(err instanceof Error ? err.message : "حدث خطأ");
    } finally {
      setPosting(false);
    }
  };

  if (loading) {
    return (
      <div>
        <PageHeader
          title="تعديل القيد"
          breadcrumbs={[
            { title: "المحاسبة" },
            { title: "القيود المحاسبية", href: "/journal-entries" },
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
          title="تعديل القيد"
          breadcrumbs={[
            { title: "المحاسبة" },
            { title: "القيود المحاسبية", href: "/journal-entries" },
            { title: "خطأ" },
          ]}
        />
        <Alert
          message="خطأ"
          description={error}
          type="error"
          showIcon
          action={
            <Button type="link" onClick={() => navigate("/journal-entries")}>
              العودة للقيود
            </Button>
          }
        />
      </div>
    );
  }

  // Group accounts by type
  const groupedAccounts = accounts.reduce((acc, account) => {
    const type = TYPE_OPTIONS.find((t) => t.value === account.type)?.label || account.type;
    if (!acc[type]) acc[type] = [];
    acc[type].push(account);
    return acc;
  }, {} as Record<string, Account[]>);

  const accountOptions = Object.entries(groupedAccounts).map(([type, accs]) => ({
    label: type,
    options: accs.map((a) => ({
      value: a.id,
      label: `${a.code} - ${a.nameAr || a.name}`,
    })),
  }));

  const columns: TableColumnsType<JournalLine> = [
    {
      title: "الحساب",
      dataIndex: "accountId",
      key: "accountId",
      width: 300,
      render: (_, record) => (
        <Select
          value={record.accountId || undefined}
          onChange={(val) => updateLine(record.key, "accountId", val)}
          options={accountOptions}
          showSearch
          placeholder="اختر الحساب"
          filterOption={(input, option) =>
            (option?.label ?? "").toLowerCase().includes(input.toLowerCase())
          }
          style={{ width: "100%" }}
          disabled={!isDraft}
        />
      ),
    },
    {
      title: "البيان",
      dataIndex: "description",
      key: "description",
      render: (_, record) => (
        <Input
          value={record.description}
          onChange={(e) => updateLine(record.key, "description", e.target.value)}
          placeholder="بيان السطر"
          disabled={!isDraft}
        />
      ),
    },
    {
      title: "مدين",
      dataIndex: "debit",
      key: "debit",
      width: 150,
      render: (_, record) => (
        <InputNumber
          value={record.debit || undefined}
          onChange={(val) => updateLine(record.key, "debit", val || 0)}
          min={0}
          style={{ width: "100%" }}
          formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")}
          disabled={!isDraft}
        />
      ),
    },
    {
      title: "دائن",
      dataIndex: "credit",
      key: "credit",
      width: 150,
      render: (_, record) => (
        <InputNumber
          value={record.credit || undefined}
          onChange={(val) => updateLine(record.key, "credit", val || 0)}
          min={0}
          style={{ width: "100%" }}
          formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")}
          disabled={!isDraft}
        />
      ),
    },
    {
      title: "",
      key: "actions",
      width: 60,
      render: (_, record) =>
        isDraft ? (
          <Button
            type="text"
            danger
            icon={<DeleteOutlined />}
            onClick={() => removeLine(record.key)}
            disabled={lines.length <= 2}
          />
        ) : null,
    },
  ];

  return (
    <div>
      <PageHeader
        title={`تعديل القيد: ${entryNumber}`}
        breadcrumbs={[
          { title: "المحاسبة" },
          { title: "القيود المحاسبية", href: "/journal-entries" },
          { title: entryNumber, href: `/journal-entries/${id}` },
          { title: "تعديل" },
        ]}
        extra={
          <Space>
            <Tag color={status === "posted" ? "green" : "orange"}>
              {status === "posted" ? "مرحل" : "مسودة"}
            </Tag>
            <Button icon={<ArrowRightOutlined />} onClick={() => navigate(`/journal-entries/${id}`)}>
              العودة للتفاصيل
            </Button>
          </Space>
        }
      />

      {!isDraft && (
        <Alert
          message="قيد مرحل"
          description="هذا القيد مرحل ولا يمكن تعديله. يمكنك إنشاء قيد عكسي لإلغاء أثره."
          type="info"
          showIcon
          style={{ marginBottom: 24 }}
        />
      )}

      <Form form={form} layout="vertical" onFinish={handleSubmit}>
        <Card title="معلومات القيد" style={{ marginBottom: 24 }}>
          <Row gutter={16}>
            <Col xs={24} md={8}>
              <Form.Item
                name="entryDate"
                label="تاريخ القيد"
                rules={[{ required: true, message: "التاريخ مطلوب" }]}
              >
                <DatePicker style={{ width: "100%" }} format="YYYY-MM-DD" disabled={!isDraft} />
              </Form.Item>
            </Col>
            <Col xs={24} md={16}>
              <Form.Item name="description" label="البيان">
                <Input placeholder="وصف القيد المحاسبي" disabled={!isDraft} />
              </Form.Item>
            </Col>
          </Row>
        </Card>

        <Card
          title="بنود القيد"
          style={{ marginBottom: 24 }}
          extra={
            isDraft && (
              <Button type="dashed" icon={<PlusOutlined />} onClick={addLine}>
                إضافة سطر
              </Button>
            )
          }
        >
          <Table
            columns={columns}
            dataSource={lines}
            rowKey="key"
            pagination={false}
            size="small"
            footer={() => (
              <Row justify="end" gutter={48}>
                <Col>
                  <Space>
                    <span style={{ fontWeight: 600 }}>مجموع المدين:</span>
                    <MoneyDisplay amount={totalDebit} colored />
                  </Space>
                </Col>
                <Col>
                  <Space>
                    <span style={{ fontWeight: 600 }}>مجموع الدائن:</span>
                    <MoneyDisplay amount={totalCredit} colored />
                  </Space>
                </Col>
              </Row>
            )}
          />

          {!isBalanced && totalDebit > 0 && totalCredit > 0 && (
            <Alert
              message="القيد غير متوازن"
              description={`الفرق: ${Math.abs(totalDebit - totalCredit).toLocaleString("ar-IQ")} د.ع`}
              type="error"
              showIcon
              style={{ marginTop: 16 }}
            />
          )}
        </Card>

        {isDraft && (
          <Space>
            <Button onClick={() => navigate(`/journal-entries/${id}`)}>إلغاء</Button>
            <Button
              type="primary"
              htmlType="submit"
              loading={submitting}
              icon={<SaveOutlined />}
              disabled={!isBalanced || totalDebit === 0}
            >
              حفظ التعديلات
            </Button>
            <Button
              type="primary"
              style={{ background: "#22c55e" }}
              loading={posting}
              icon={<CheckCircleOutlined />}
              disabled={!isBalanced || totalDebit === 0}
              onClick={handlePost}
            >
              ترحيل القيد
            </Button>
          </Space>
        )}
      </Form>
    </div>
  );
}
