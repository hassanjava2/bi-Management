import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { Row, Col, Card, Descriptions, Tag, Space, Button, Statistic, Table, Empty, message } from "antd";
import {
  BankOutlined,
  PrinterOutlined,
  ArrowLeftOutlined,
  LockOutlined,
  FolderOutlined,
  FileTextOutlined,
  EditOutlined,
} from "@ant-design/icons";
import { PageHeader, DateDisplay, LoadingSkeleton, MoneyDisplay } from "../components/shared";
import { API_BASE, getAuthHeaders } from "../utils/api";

type Account = {
  id: string;
  code: string;
  name: string;
  nameAr: string | null;
  parentId: string | null;
  type: string;
  nature: string | null;
  balance: number | string | null;
  isSystem: number | null;
  isActive: number | null;
  description: string | null;
  createdAt: string;
  parent?: { id: string; code: string; name: string; nameAr: string | null };
  _count?: { children: number; journalEntries: number };
};

type ChildAccount = {
  id: string;
  code: string;
  name: string;
  nameAr: string | null;
  balance: number | string | null;
  nature: string | null;
};

type JournalEntry = {
  id: string;
  date: string;
  description: string;
  amount: number | string;
  type: string;
  journal?: { id: string; number: string; description: string };
};

const TYPE_INFO: Record<string, { label: string; icon: string; color: string }> = {
  asset: { label: "أصول", icon: "💰", color: "blue" },
  liability: { label: "خصوم", icon: "📋", color: "orange" },
  equity: { label: "حقوق ملكية", icon: "🏛️", color: "purple" },
  revenue: { label: "إيرادات", icon: "📈", color: "green" },
  expense: { label: "مصروفات", icon: "📉", color: "red" },
};

const NATURE_INFO: Record<string, { label: string; color: string }> = {
  debit: { label: "مدين", color: "blue" },
  credit: { label: "دائن", color: "green" },
};

export default function AccountDetail() {
  const { id } = useParams<{ id: string }>();
  const [account, setAccount] = useState<Account | null>(null);
  const [children, setChildren] = useState<ChildAccount[]>([]);
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    document.title = "تفاصيل الحساب | BI Management v3";

    const fetchData = async () => {
      try {
        // Fetch account details
        const accRes = await fetch(`${API_BASE}/api/accounts/${id}`, { headers: getAuthHeaders() });
        if (!accRes.ok) throw new Error("فشل تحميل بيانات الحساب");
        const accData = await accRes.json();
        setAccount(accData);

        // Fetch child accounts
        const childRes = await fetch(`${API_BASE}/api/accounts?parentId=${id}&limit=50`, { headers: getAuthHeaders() });
        if (childRes.ok) {
          const childData = await childRes.json();
          setChildren(childData.data || []);
        }

        // Fetch journal entries for this account
        const entryRes = await fetch(`${API_BASE}/api/journal-entries?accountId=${id}&limit=20`, { headers: getAuthHeaders() });
        if (entryRes.ok) {
          const entryData = await entryRes.json();
          setEntries(entryData.data || []);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "حدث خطأ");
        message.error(err instanceof Error ? err.message : "حدث خطأ");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id]);

  if (loading) {
    return <LoadingSkeleton type="form" rows={6} />;
  }

  if (error || !account) {
    return (
      <Card>
        <Empty
          description={error || "الحساب غير موجود"}
          image={Empty.PRESENTED_IMAGE_SIMPLE}
        >
          <Link to="/accounts">
            <Button type="primary">العودة لشجرة الحسابات</Button>
          </Link>
        </Empty>
      </Card>
    );
  }

  const typeInfo = TYPE_INFO[account.type] || { label: account.type, icon: "📊", color: "default" };
  const natureInfo = NATURE_INFO[account.nature || "debit"] || { label: account.nature || "—", color: "default" };
  const balance = Number(account.balance || 0);
  const childrenBalance = children.reduce((sum, c) => sum + Number(c.balance || 0), 0);

  const debitEntries = entries.filter((e) => e.type === "debit");
  const creditEntries = entries.filter((e) => e.type === "credit");
  const totalDebit = debitEntries.reduce((sum, e) => sum + Number(e.amount), 0);
  const totalCredit = creditEntries.reduce((sum, e) => sum + Number(e.amount), 0);

  const childColumns = [
    {
      title: "الكود",
      dataIndex: "code",
      key: "code",
      render: (code: string) => <span style={{ fontFamily: "monospace" }}>{code}</span>,
    },
    {
      title: "الحساب",
      dataIndex: "nameAr",
      key: "nameAr",
      render: (_: string, record: ChildAccount) => (
        <Link to={`/accounts/${record.id}`} style={{ fontWeight: 500 }}>
          {record.nameAr || record.name}
        </Link>
      ),
    },
    {
      title: "الطبيعة",
      dataIndex: "nature",
      key: "nature",
      render: (nature: string) => {
        const info = NATURE_INFO[nature || "debit"] || { label: "-", color: "default" };
        return <Tag color={info.color}>{info.label}</Tag>;
      },
    },
    {
      title: "الرصيد",
      dataIndex: "balance",
      key: "balance",
      render: (bal: number | string | null) => <MoneyDisplay amount={Number(bal || 0)} size="default" />,
    },
  ];

  const entryColumns = [
    {
      title: "التاريخ",
      dataIndex: "date",
      key: "date",
      render: (date: string) => <DateDisplay date={date} />,
    },
    {
      title: "البيان",
      dataIndex: "description",
      key: "description",
      render: (_: string, record: JournalEntry) =>
        record.journal ? (
          <Link to={`/journals/${record.journal.id}`}>
            {record.description || record.journal.description}
          </Link>
        ) : (
          record.description
        ),
    },
    {
      title: "النوع",
      dataIndex: "type",
      key: "type",
      render: (type: string) => (
        <Tag color={type === "debit" ? "blue" : "green"}>
          {type === "debit" ? "مدين" : "دائن"}
        </Tag>
      ),
    },
    {
      title: "المبلغ",
      dataIndex: "amount",
      key: "amount",
      render: (amount: number | string, record: JournalEntry) => (
        <MoneyDisplay amount={Number(amount)} colored={record.type === "debit"} />
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title={account.nameAr || account.name}
        subtitle={account.nameAr ? account.name : undefined}
        breadcrumbs={[
          { title: "شجرة الحسابات", href: "/accounts" },
          { title: "تفاصيل الحساب" },
        ]}
        extra={
          <Space>
            <Link to="/accounts">
              <Button icon={<ArrowLeftOutlined />}>العودة</Button>
            </Link>
            <Link to={`/accounts/${id}/edit`}>
              <Button icon={<EditOutlined />}>تعديل</Button>
            </Link>
            <Button icon={<PrinterOutlined />} onClick={() => window.print()}>
              طباعة
            </Button>
          </Space>
        }
      />

      {/* Header Card */}
      <Card style={{ marginBottom: 24 }}>
        <Row gutter={[24, 24]} align="middle">
          <Col flex="none">
            <div
              style={{
                width: 72,
                height: 72,
                borderRadius: 16,
                background: `var(--ant-${typeInfo.color}-1)`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 36,
              }}
            >
              {typeInfo.icon}
            </div>
          </Col>
          <Col flex="auto">
            <Space direction="vertical" size={4}>
              <Space>
                <Tag color={typeInfo.color}>{typeInfo.label}</Tag>
                <span style={{ fontFamily: "monospace", color: "#64748b" }}>{account.code}</span>
                {account.isSystem === 1 && (
                  <Tag icon={<LockOutlined />} color="default">
                    نظامي
                  </Tag>
                )}
              </Space>
            </Space>
          </Col>
          <Col flex="none" style={{ textAlign: "left" }}>
            <Statistic
              title="الرصيد الحالي"
              value={balance}
              precision={0}
              suffix="د.ع"
              valueStyle={{ color: balance >= 0 ? "#1d4ed8" : "#ef4444" }}
            />
          </Col>
        </Row>
      </Card>

      {/* Stats */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={12} sm={6}>
          <Card>
            <Statistic
              title="إجمالي المدين"
              value={totalDebit}
              suffix="د.ع"
              valueStyle={{ color: "#1d4ed8" }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card>
            <Statistic
              title="إجمالي الدائن"
              value={totalCredit}
              suffix="د.ع"
              valueStyle={{ color: "#15803d" }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card>
            <Statistic
              title="حسابات فرعية"
              value={children.length}
              prefix={<FolderOutlined />}
              valueStyle={{ color: "#8b5cf6" }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card>
            <Statistic
              title="قيود محاسبية"
              value={entries.length}
              prefix={<FileTextOutlined />}
              valueStyle={{ color: "#f59e0b" }}
            />
          </Card>
        </Col>
      </Row>

      {/* Details */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} md={12}>
          <Card title="معلومات الحساب">
            <Descriptions column={1} size="small">
              <Descriptions.Item label="الكود">
                <span style={{ fontFamily: "monospace" }}>{account.code}</span>
              </Descriptions.Item>
              <Descriptions.Item label="النوع">
                <Tag color={typeInfo.color}>{typeInfo.label}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="الطبيعة">
                <Tag color={natureInfo.color}>{natureInfo.label}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="الحالة">
                <Tag color={account.isActive === 1 ? "green" : "red"}>
                  {account.isActive === 1 ? "نشط" : "غير نشط"}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="تاريخ الإنشاء">
                <DateDisplay date={account.createdAt} />
              </Descriptions.Item>
            </Descriptions>
          </Card>
        </Col>
        <Col xs={24} md={12}>
          <Card title="الحساب الأب">
            {account.parent ? (
              <Link to={`/accounts/${account.parent.id}`}>
                <Card
                  size="small"
                  hoverable
                  style={{ background: "#f8fafc" }}
                >
                  <Row justify="space-between" align="middle">
                    <Col>
                      <div style={{ fontWeight: 600 }}>
                        {account.parent.nameAr || account.parent.name}
                      </div>
                      <div style={{ fontSize: 12, color: "#64748b", fontFamily: "monospace" }}>
                        {account.parent.code}
                      </div>
                    </Col>
                    <Col>
                      <ArrowLeftOutlined style={{ color: "#6366f1" }} />
                    </Col>
                  </Row>
                </Card>
              </Link>
            ) : (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description="حساب رئيسي (لا يوجد حساب أب)"
              />
            )}

            {account.description && (
              <Card
                size="small"
                style={{ marginTop: 16, background: "#fffbeb", border: "1px solid #fef08a" }}
              >
                <div style={{ fontSize: 12, color: "#92400e", marginBottom: 4 }}>الوصف:</div>
                <div style={{ color: "#78350f" }}>{account.description}</div>
              </Card>
            )}
          </Card>
        </Col>
      </Row>

      {/* Child Accounts */}
      {children.length > 0 && (
        <Card
          title={`الحسابات الفرعية (${children.length})`}
          extra={<span style={{ color: "#64748b" }}>المجموع: <MoneyDisplay amount={childrenBalance} /></span>}
          style={{ marginBottom: 24 }}
        >
          <Table
            columns={childColumns}
            dataSource={children}
            rowKey="id"
            pagination={false}
            size="small"
          />
        </Card>
      )}

      {/* Journal Entries */}
      <Card title="آخر القيود المحاسبية">
        {entries.length === 0 ? (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description="لا توجد قيود محاسبية لهذا الحساب"
          />
        ) : (
          <Table
            columns={entryColumns}
            dataSource={entries}
            rowKey="id"
            pagination={false}
            size="small"
          />
        )}
      </Card>
    </div>
  );
}
