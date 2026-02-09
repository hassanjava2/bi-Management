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
  message,
  Statistic,
} from "antd";
import type { TableColumnsType } from "antd";
import {
  PlusOutlined,
  SearchOutlined,
  BookOutlined,
  CheckCircleOutlined,
  SwapOutlined,
  ExclamationCircleOutlined,
} from "@ant-design/icons";
import { PageHeader, MoneyDisplay, DateDisplay, LoadingSkeleton } from "../components/shared";

type JournalEntry = {
  id: string;
  entryNumber: string;
  entryDate: string;
  description: string | null;
  totalDebit: number | null;
  totalCredit: number | null;
  status: string | null;
  createdAt: string | null;
};

const STATUS_OPTIONS = [
  { value: "draft", label: "مسودة", color: "default" },
  { value: "posted", label: "مرحّل", color: "success" },
  { value: "reversed", label: "معكوس", color: "error" },
];

const STATUS_LABELS: Record<string, { label: string; color: string }> = Object.fromEntries(
  STATUS_OPTIONS.map((s) => [s.value, { label: s.label, color: s.color }])
);

export default function JournalEntries() {
  const [data, setData] = useState<JournalEntry[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState<string | undefined>(undefined);
  const navigate = useNavigate();

  useEffect(() => {
    document.title = "القيود اليومية | BI Management v3";
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const result = await fetchList<JournalEntry>("/api/journal-entries", page);
      setData(result.data);
      setTotal(result.total || result.data.length);
    } catch (e) {
      message.error("فشل في تحميل القيود اليومية");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [page]);

  // Filter entries
  const filteredData = data.filter((entry) => {
    const matchesSearch =
      !filter ||
      entry.entryNumber.toLowerCase().includes(filter.toLowerCase()) ||
      entry.description?.includes(filter);
    const matchesStatus = !statusFilter || entry.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Stats
  const totalDebit = data.reduce((acc, e) => acc + (e.totalDebit || 0), 0);
  const totalCredit = data.reduce((acc, e) => acc + (e.totalCredit || 0), 0);
  const postedCount = data.filter((e) => e.status === "posted").length;

  const columns: TableColumnsType<JournalEntry> = [
    {
      title: "رقم القيد",
      dataIndex: "entryNumber",
      key: "entryNumber",
      render: (text, record) => (
        <Link to={`/journal-entries/${record.id}`} style={{ fontWeight: 600, color: "#6366f1" }}>
          {text}
        </Link>
      ),
    },
    {
      title: "التاريخ",
      dataIndex: "entryDate",
      key: "entryDate",
      width: 120,
      render: (date) => <DateDisplay date={date} />,
    },
    {
      title: "الوصف",
      dataIndex: "description",
      key: "description",
      ellipsis: true,
      render: (desc) => (
        <span style={{ color: desc ? "#1e293b" : "#94a3b8" }}>
          {desc || "—"}
        </span>
      ),
    },
    {
      title: "مدين",
      dataIndex: "totalDebit",
      key: "totalDebit",
      width: 130,
      render: (amount) => (
        <span style={{ fontWeight: 600, color: "#1d4ed8" }}>
          {(amount || 0).toLocaleString()}
        </span>
      ),
    },
    {
      title: "دائن",
      dataIndex: "totalCredit",
      key: "totalCredit",
      width: 130,
      render: (amount) => (
        <span style={{ fontWeight: 600, color: "#b45309" }}>
          {(amount || 0).toLocaleString()}
        </span>
      ),
    },
    {
      title: "الحالة",
      dataIndex: "status",
      key: "status",
      width: 140,
      render: (status, record) => {
        const info = STATUS_LABELS[status || "draft"] || STATUS_LABELS.draft;
        const isBalanced = record.totalDebit === record.totalCredit;
        return (
          <Space direction="vertical" size={4}>
            <Tag color={info.color}>{info.label}</Tag>
            {!isBalanced && (
              <Tag color="error" style={{ fontSize: 11 }}>
                <ExclamationCircleOutlined /> غير متوازن
              </Tag>
            )}
          </Space>
        );
      },
    },
  ];

  if (loading && data.length === 0) {
    return (
      <div>
        <PageHeader
          title="القيود اليومية"
          breadcrumbs={[{ title: "المحاسبة" }, { title: "القيود اليومية" }]}
        />
        <LoadingSkeleton type="table" rows={8} />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="القيود اليومية"
        subtitle={`إدارة القيود المحاسبية - ${total} قيد`}
        breadcrumbs={[{ title: "المحاسبة" }, { title: "القيود اليومية" }]}
        extra={
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => navigate("/journal-entries/new")}
            style={{ background: "#6366f1" }}
          >
            إنشاء قيد
          </Button>
        }
      />

      {/* Quick Stats */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={12} sm={6}>
          <Card>
            <Statistic
              title="إجمالي القيود"
              value={data.length}
              prefix={<BookOutlined style={{ color: "#7c3aed" }} />}
              valueStyle={{ color: "#7c3aed" }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card>
            <Statistic
              title="مرحّل"
              value={postedCount}
              prefix={<CheckCircleOutlined style={{ color: "#22c55e" }} />}
              valueStyle={{ color: "#22c55e" }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card>
            <Statistic
              title="إجمالي المدين"
              value={totalDebit}
              suffix="د.ع"
              prefix={<SwapOutlined style={{ color: "#1d4ed8" }} />}
              valueStyle={{ color: "#1d4ed8" }}
              formatter={(value) => new Intl.NumberFormat("ar-IQ").format(value as number)}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card>
            <Statistic
              title="إجمالي الدائن"
              value={totalCredit}
              suffix="د.ع"
              prefix={<SwapOutlined style={{ color: "#b45309" }} />}
              valueStyle={{ color: "#b45309" }}
              formatter={(value) => new Intl.NumberFormat("ar-IQ").format(value as number)}
            />
          </Card>
        </Col>
      </Row>

      {/* Filters & Table */}
      <Card
        title="قائمة القيود"
        extra={
          <Space wrap>
            <Input
              placeholder="بحث برقم القيد أو الوصف..."
              prefix={<SearchOutlined />}
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              style={{ width: 220 }}
              allowClear
            />
            <Select
              placeholder="جميع الحالات"
              value={statusFilter}
              onChange={setStatusFilter}
              allowClear
              style={{ width: 140 }}
              options={STATUS_OPTIONS.map((s) => ({
                value: s.value,
                label: s.label,
              }))}
            />
          </Space>
        }
        styles={{ body: { padding: 0 } }}
      >
        <Table<JournalEntry>
          columns={columns}
          dataSource={filteredData}
          rowKey="id"
          loading={loading}
          pagination={{
            current: page,
            pageSize: 20,
            total: total,
            onChange: (p) => setPage(p),
            showSizeChanger: false,
            showTotal: (total, range) => `${range[0]}-${range[1]} من ${total}`,
          }}
          scroll={{ x: 900 }}
        />
      </Card>
    </div>
  );
}
