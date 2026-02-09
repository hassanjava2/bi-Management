import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { fetchList } from "../utils/api";
import {
  Row,
  Col,
  Card,
  Table,
  Button,
  Input,
  Select,
  Tag,
  Space,
  Statistic,
  Collapse,
} from "antd";
import type { TableColumnsType } from "antd";
import {
  PlusOutlined,
  SearchOutlined,
  BankOutlined,
  DollarOutlined,
  WalletOutlined,
} from "@ant-design/icons";
import { PageHeader, MoneyDisplay, LoadingSkeleton } from "../components/shared";

type Account = {
  id: string;
  code: string;
  name: string;
  nameAr: string | null;
  parentId: string | null;
  type: string;
  nature: string | null;
  balance: number | null;
  isSystem: number | null;
  isActive: number | null;
};

const TYPE_OPTIONS = [
  { value: "asset", label: "أصول", color: "blue" },
  { value: "liability", label: "خصوم", color: "gold" },
  { value: "equity", label: "حقوق ملكية", color: "purple" },
  { value: "revenue", label: "إيرادات", color: "green" },
  { value: "expense", label: "مصروفات", color: "red" },
];

const TYPE_LABELS: Record<string, { label: string; color: string }> = Object.fromEntries(
  TYPE_OPTIONS.map((t) => [t.value, { label: t.label, color: t.color }])
);

const NATURE_LABELS: Record<string, { label: string; color: string }> = {
  debit: { label: "مدين", color: "blue" },
  credit: { label: "دائن", color: "green" },
};

export default function Accounts() {
  const [data, setData] = useState<Account[]>([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState<string | undefined>(undefined);
  const navigate = useNavigate();

  useEffect(() => {
    document.title = "شجرة الحسابات | BI Management v3";
  }, []);

  useEffect(() => {
    setLoading(true);
    fetchList<Account>("/api/accounts", page, 100)
      .then((r) => setData(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [page]);

  // Filter accounts
  const filteredData = data.filter((acc) => {
    const matchesSearch =
      !filter ||
      acc.code.toLowerCase().includes(filter.toLowerCase()) ||
      acc.name.toLowerCase().includes(filter.toLowerCase()) ||
      acc.nameAr?.includes(filter);
    const matchesType = !typeFilter || acc.type === typeFilter;
    return matchesSearch && matchesType;
  });

  // Group accounts by type
  const groupedData = filteredData.reduce((acc, account) => {
    if (!acc[account.type]) acc[account.type] = [];
    acc[account.type].push(account);
    return acc;
  }, {} as Record<string, Account[]>);

  // Stats
  const assetTotal = data
    .filter((a) => a.type === "asset")
    .reduce((acc, a) => acc + (a.balance || 0), 0);
  const liabilityTotal = data
    .filter((a) => a.type === "liability")
    .reduce((acc, a) => acc + (a.balance || 0), 0);
  const revenueTotal = data
    .filter((a) => a.type === "revenue")
    .reduce((acc, a) => acc + (a.balance || 0), 0);

  const columns: TableColumnsType<Account> = [
    {
      title: "الكود",
      dataIndex: "code",
      key: "code",
      width: 100,
      render: (code) => (
        <span style={{ fontFamily: "monospace", color: "#64748b" }}>{code}</span>
      ),
    },
    {
      title: "الاسم",
      dataIndex: "name",
      key: "name",
      render: (_, record) => (
        <div>
          <Link
            to={`/accounts/${record.id}`}
            style={{ fontWeight: 500, color: "#3730a3" }}
          >
            {record.nameAr || record.name}
          </Link>
          {record.nameAr && (
            <div style={{ fontSize: 12, color: "#94a3b8" }}>{record.name}</div>
          )}
        </div>
      ),
    },
    {
      title: "الطبيعة",
      dataIndex: "nature",
      key: "nature",
      width: 100,
      render: (nature) => {
        const info = NATURE_LABELS[nature || "debit"] || NATURE_LABELS.debit;
        return <Tag color={info.color}>{info.label}</Tag>;
      },
    },
    {
      title: "الرصيد",
      dataIndex: "balance",
      key: "balance",
      width: 140,
      render: (balance) => (
        <span style={{ fontWeight: 600 }}>
          <MoneyDisplay amount={balance || 0} />
        </span>
      ),
    },
    {
      title: "نظامي",
      dataIndex: "isSystem",
      key: "isSystem",
      width: 80,
      render: (isSystem) =>
        isSystem ? <Tag color="default">نظامي</Tag> : "—",
    },
  ];

  if (loading && data.length === 0) {
    return (
      <div>
        <PageHeader
          title="شجرة الحسابات"
          breadcrumbs={[{ title: "المحاسبة" }, { title: "شجرة الحسابات" }]}
        />
        <LoadingSkeleton type="table" rows={10} />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="شجرة الحسابات"
        subtitle={`إدارة الحسابات المحاسبية - ${data.length} حساب`}
        breadcrumbs={[{ title: "المحاسبة" }, { title: "شجرة الحسابات" }]}
        extra={
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => navigate("/accounts/new")}
          >
            إضافة حساب
          </Button>
        }
      />

      {/* Quick Stats */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={12} sm={8} md={6}>
          <Card>
            <Statistic
              title="إجمالي الحسابات"
              value={data.length}
              prefix={<BankOutlined style={{ color: "#3b82f6" }} />}
              valueStyle={{ color: "#3b82f6" }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={8} md={6}>
          <Card>
            <Statistic
              title="الأصول"
              value={assetTotal}
              suffix="د.ع"
              prefix={<WalletOutlined style={{ color: "#22c55e" }} />}
              valueStyle={{ color: "#22c55e" }}
              formatter={(value) =>
                new Intl.NumberFormat("ar-IQ").format(value as number)
              }
            />
          </Card>
        </Col>
        <Col xs={12} sm={8} md={6}>
          <Card>
            <Statistic
              title="الخصوم"
              value={liabilityTotal}
              suffix="د.ع"
              prefix={<DollarOutlined style={{ color: "#f59e0b" }} />}
              valueStyle={{ color: "#f59e0b" }}
              formatter={(value) =>
                new Intl.NumberFormat("ar-IQ").format(value as number)
              }
            />
          </Card>
        </Col>
        <Col xs={12} sm={8} md={6}>
          <Card>
            <Statistic
              title="الإيرادات"
              value={revenueTotal}
              suffix="د.ع"
              prefix={<DollarOutlined style={{ color: "#8b5cf6" }} />}
              valueStyle={{ color: "#8b5cf6" }}
              formatter={(value) =>
                new Intl.NumberFormat("ar-IQ").format(value as number)
              }
            />
          </Card>
        </Col>
      </Row>

      {/* Filters */}
      <Space wrap style={{ marginBottom: 24 }}>
        <Input
          placeholder="بحث بالكود أو الاسم..."
          prefix={<SearchOutlined />}
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          style={{ width: 250 }}
          allowClear
        />
        <Select
          placeholder="جميع الأنواع"
          value={typeFilter}
          onChange={setTypeFilter}
          allowClear
          style={{ width: 150 }}
          options={TYPE_OPTIONS.map((t) => ({
            value: t.value,
            label: t.label,
          }))}
        />
      </Space>

      {/* Accounts by Type */}
      <Collapse
        defaultActiveKey={Object.keys(groupedData)}
        items={Object.entries(groupedData).map(([type, accounts]) => {
          const typeInfo = TYPE_LABELS[type] || { label: type, color: "default" };
          const typeTotal = accounts.reduce((acc, a) => acc + (a.balance || 0), 0);

          return {
            key: type,
            label: (
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  width: "100%",
                  paddingLeft: 16,
                }}
              >
                <Space>
                  <Tag color={typeInfo.color}>{typeInfo.label}</Tag>
                  <span style={{ color: "#64748b" }}>({accounts.length} حساب)</span>
                </Space>
                <span style={{ fontWeight: 600 }}>
                  <MoneyDisplay amount={typeTotal} />
                </span>
              </div>
            ),
            children: (
              <Table<Account>
                columns={columns}
                dataSource={accounts}
                rowKey="id"
                pagination={false}
                size="small"
              />
            ),
          };
        })}
      />

      {/* Pagination */}
      {data.length >= 100 && (
        <div
          style={{
            marginTop: 24,
            display: "flex",
            gap: 8,
            justifyContent: "center",
          }}
        >
          <Button disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
            السابق
          </Button>
          <span style={{ padding: "4px 12px", color: "#64748b" }}>
            صفحة {page}
          </span>
          <Button
            disabled={data.length < 100}
            onClick={() => setPage((p) => p + 1)}
          >
            التالي
          </Button>
        </div>
      )}
    </div>
  );
}
