import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Row, Col, Card, Form, Input, DatePicker, Button, Select, InputNumber, Table, message, Space, Alert } from "antd";
import { SaveOutlined, ArrowRightOutlined, PlusOutlined, DeleteOutlined } from "@ant-design/icons";
import type { TableColumnsType } from "antd";
import dayjs from "dayjs";
import { PageHeader, MoneyDisplay } from "../components/shared";
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

export default function JournalEntryCreate() {
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [lines, setLines] = useState<JournalLine[]>([
    { key: "1", accountId: "", debit: 0, credit: 0, description: "" },
    { key: "2", accountId: "", debit: 0, credit: 0, description: "" },
  ]);

  useEffect(() => {
    document.title = "إنشاء قيد محاسبي | BI Management v3";
    fetchList<Account>("/api/accounts", 1, 500)
      .then((r) => setAccounts(r.data))
      .catch(() => {});
  }, []);

  const totalDebit = lines.reduce((sum, l) => sum + (l.debit || 0), 0);
  const totalCredit = lines.reduce((sum, l) => sum + (l.credit || 0), 0);
  const isBalanced = Math.abs(totalDebit - totalCredit) < 0.01;

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
              // Auto-clear the other side when entering amount
              ...(field === "debit" && value ? { credit: 0 } : {}),
              ...(field === "credit" && value ? { debit: 0 } : {}),
            }
          : l
      )
    );
  };

  const handleSubmit = async (values: Record<string, unknown>) => {
    if (!isBalanced) {
      message.error("القيد غير متوازن - مجموع المدين يجب أن يساوي مجموع الدائن");
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

      const res = await fetch(`${API_BASE}/api/journal-entries`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "فشل إنشاء القيد");
      }

      const newEntry = await res.json();
      message.success("تم إنشاء القيد بنجاح");
      navigate(`/journal-entries/${newEntry.id}`);
    } catch (err: unknown) {
      message.error(err instanceof Error ? err.message : "حدث خطأ");
    } finally {
      setSubmitting(false);
    }
  };

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
        />
      ),
    },
    {
      title: "",
      key: "actions",
      width: 60,
      render: (_, record) => (
        <Button
          type="text"
          danger
          icon={<DeleteOutlined />}
          onClick={() => removeLine(record.key)}
          disabled={lines.length <= 2}
        />
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="إنشاء قيد محاسبي"
        breadcrumbs={[
          { title: "المحاسبة" },
          { title: "القيود المحاسبية", href: "/journal-entries" },
          { title: "إنشاء قيد" },
        ]}
        extra={
          <Button icon={<ArrowRightOutlined />} onClick={() => navigate("/journal-entries")}>
            العودة للقيود
          </Button>
        }
      />

      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        initialValues={{ entryDate: dayjs() }}
      >
        <Card title="معلومات القيد" style={{ marginBottom: 24 }}>
          <Row gutter={16}>
            <Col xs={24} md={8}>
              <Form.Item
                name="entryDate"
                label="تاريخ القيد"
                rules={[{ required: true, message: "التاريخ مطلوب" }]}
              >
                <DatePicker style={{ width: "100%" }} format="YYYY-MM-DD" />
              </Form.Item>
            </Col>
            <Col xs={24} md={16}>
              <Form.Item name="description" label="البيان">
                <Input placeholder="وصف القيد المحاسبي" />
              </Form.Item>
            </Col>
          </Row>
        </Card>

        <Card
          title="بنود القيد"
          style={{ marginBottom: 24 }}
          extra={
            <Button type="dashed" icon={<PlusOutlined />} onClick={addLine}>
              إضافة سطر
            </Button>
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

        <Space>
          <Button onClick={() => navigate("/journal-entries")}>إلغاء</Button>
          <Button
            type="primary"
            htmlType="submit"
            loading={submitting}
            icon={<SaveOutlined />}
            disabled={!isBalanced || totalDebit === 0}
          >
            إنشاء القيد
          </Button>
        </Space>
      </Form>
    </div>
  );
}
