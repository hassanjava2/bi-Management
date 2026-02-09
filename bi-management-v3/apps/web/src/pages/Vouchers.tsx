import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { fetchList, API_BASE, getAuthHeaders } from "../utils/api";
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
  EditOutlined,
  DeleteOutlined,
  SearchOutlined,
  FileTextOutlined,
  ArrowDownOutlined,
  ArrowUpOutlined,
  SwapOutlined,
} from "@ant-design/icons";
import { PageHeader, MoneyDisplay, DateDisplay, ConfirmDelete, LoadingSkeleton } from "../components/shared";

type Voucher = {
  id: string;
  voucherNumber: string;
  type: string;
  amount: number;
  currency: string | null;
  paymentMethod: string | null;
  description: string | null;
  relatedEntityType: string | null;
  createdAt: string | null;
};

const TYPE_OPTIONS = [
  { value: "receipt", label: "سند قبض", color: "green" },
  { value: "payment", label: "سند صرف", color: "red" },
];

const TYPE_LABELS: Record<string, { label: string; color: string }> = Object.fromEntries(
  TYPE_OPTIONS.map((t) => [t.value, { label: t.label, color: t.color }])
);

const PAYMENT_METHOD_OPTIONS = [
  { value: "cash", label: "نقدي" },
  { value: "bank", label: "بنكي" },
  { value: "check", label: "شيك" },
  { value: "credit", label: "آجل" },
];

const PAYMENT_METHOD_LABELS: Record<string, string> = Object.fromEntries(
  PAYMENT_METHOD_OPTIONS.map((p) => [p.value, p.label])
);

export default function Vouchers() {
  const [data, setData] = useState<Voucher[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState<string | undefined>(undefined);
  const navigate = useNavigate();

  useEffect(() => {
    document.title = "السندات | BI Management v3";
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const result = await fetchList<Voucher>("/api/vouchers", page);
      setData(result.data);
      setTotal(result.total || result.data.length);
    } catch (e) {
      message.error("فشل في تحميل السندات");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [page]);

  const handleDelete = async (id: string, voucherNumber: string) => {
    try {
      const res = await fetch(`${API_BASE}/api/vouchers/${id}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      });
      if (!res.ok) throw new Error("فشل الحذف");
      message.success("تم حذف السند");
      fetchData();
    } catch (err) {
      message.error(err instanceof Error ? err.message : "فشل الحذف");
    }
  };

  // Filter vouchers
  const filteredData = data.filter((v) => {
    const matchesSearch =
      !filter ||
      v.voucherNumber.toLowerCase().includes(filter.toLowerCase()) ||
      v.description?.includes(filter);
    const matchesType = !typeFilter || v.type === typeFilter;
    return matchesSearch && matchesType;
  });

  // Stats
  const totalReceipts = data.filter((v) => v.type === "receipt").reduce((acc, v) => acc + v.amount, 0);
  const totalPayments = data.filter((v) => v.type === "payment").reduce((acc, v) => acc + v.amount, 0);
  const netAmount = totalReceipts - totalPayments;

  const columns: TableColumnsType<Voucher> = [
    {
      title: "رقم السند",
      dataIndex: "voucherNumber",
      key: "voucherNumber",
      render: (text, record) => (
        <Link to={`/vouchers/${record.id}`} style={{ fontWeight: 600, color: "#3730a3" }}>
          {text}
        </Link>
      ),
    },
    {
      title: "النوع",
      dataIndex: "type",
      key: "type",
      width: 120,
      render: (type) => {
        const info = TYPE_LABELS[type] || { label: type, color: "default" };
        return <Tag color={info.color}>{info.label}</Tag>;
      },
    },
    {
      title: "المبلغ",
      dataIndex: "amount",
      key: "amount",
      width: 150,
      render: (amount, record) => (
        <MoneyDisplay
          amount={amount}
          currency={record.currency || "IQD"}
          colored
          size="default"
        />
      ),
    },
    {
      title: "طريقة الدفع",
      dataIndex: "paymentMethod",
      key: "paymentMethod",
      width: 100,
      render: (method) => (
        <span style={{ color: "#64748b" }}>
          {PAYMENT_METHOD_LABELS[method || "cash"] || method || "—"}
        </span>
      ),
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
      title: "التاريخ",
      dataIndex: "createdAt",
      key: "createdAt",
      width: 120,
      render: (date) => <DateDisplay date={date} />,
    },
    {
      title: "إجراء",
      key: "actions",
      width: 140,
      render: (_, record) => (
        <Space>
          <Button
            type="link"
            size="small"
            icon={<EditOutlined />}
            onClick={() => navigate(`/vouchers/${record.id}/edit`)}
          >
            تعديل
          </Button>
          <ConfirmDelete onConfirm={() => handleDelete(record.id, record.voucherNumber)}>
            <Button type="link" danger size="small" icon={<DeleteOutlined />}>
              حذف
            </Button>
          </ConfirmDelete>
        </Space>
      ),
    },
  ];

  if (loading && data.length === 0) {
    return (
      <div>
        <PageHeader
          title="السندات"
          breadcrumbs={[{ title: "المالية" }, { title: "السندات" }]}
        />
        <LoadingSkeleton type="table" rows={8} />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="السندات"
        subtitle={`إدارة سندات القبض والصرف - ${total} سند`}
        breadcrumbs={[{ title: "المالية" }, { title: "السندات" }]}
        extra={
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => navigate("/vouchers/new")}
            style={{ background: "#f97316" }}
          >
            إنشاء سند
          </Button>
        }
      />

      {/* Quick Stats */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={12} sm={6}>
          <Card>
            <Statistic
              title="إجمالي السندات"
              value={data.length}
              prefix={<FileTextOutlined style={{ color: "#f59e0b" }} />}
              valueStyle={{ color: "#f59e0b" }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card>
            <Statistic
              title="سندات قبض"
              value={totalReceipts}
              suffix="د.ع"
              prefix={<ArrowDownOutlined style={{ color: "#22c55e" }} />}
              valueStyle={{ color: "#22c55e" }}
              formatter={(value) => new Intl.NumberFormat("ar-IQ").format(value as number)}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card>
            <Statistic
              title="سندات صرف"
              value={totalPayments}
              suffix="د.ع"
              prefix={<ArrowUpOutlined style={{ color: "#ef4444" }} />}
              valueStyle={{ color: "#ef4444" }}
              formatter={(value) => new Intl.NumberFormat("ar-IQ").format(value as number)}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card>
            <Statistic
              title={`صافي ${netAmount >= 0 ? "(قبض)" : "(صرف)"}`}
              value={Math.abs(netAmount)}
              suffix="د.ع"
              prefix={<SwapOutlined style={{ color: netAmount >= 0 ? "#3b82f6" : "#db2777" }} />}
              valueStyle={{ color: netAmount >= 0 ? "#3b82f6" : "#db2777" }}
              formatter={(value) => new Intl.NumberFormat("ar-IQ").format(value as number)}
            />
          </Card>
        </Col>
      </Row>

      {/* Filters & Table */}
      <Card
        title="قائمة السندات"
        extra={
          <Space wrap>
            <Input
              placeholder="بحث برقم السند أو الوصف..."
              prefix={<SearchOutlined />}
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              style={{ width: 220 }}
              allowClear
            />
            <Select
              placeholder="جميع الأنواع"
              value={typeFilter}
              onChange={setTypeFilter}
              allowClear
              style={{ width: 140 }}
              options={TYPE_OPTIONS.map((t) => ({
                value: t.value,
                label: t.label,
              }))}
            />
          </Space>
        }
        styles={{ body: { padding: 0 } }}
      >
        <Table<Voucher>
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
