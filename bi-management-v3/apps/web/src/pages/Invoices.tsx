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
} from "antd";
import type { TableColumnsType } from "antd";
import {
  PlusOutlined,
  SearchOutlined,
  FileTextOutlined,
  ShoppingCartOutlined,
  DollarOutlined,
} from "@ant-design/icons";
import { PageHeader, MoneyDisplay, DateDisplay, LoadingSkeleton } from "../components/shared";

type Invoice = {
  id: string;
  invoiceNumber: string;
  type: string;
  paymentType: string | null;
  total: number | null;
  status: string | null;
  paymentStatus: string | null;
  paidAmount: number | null;
  remainingAmount: number | null;
  createdAt: string | null;
};

const TYPE_OPTIONS = [
  { value: "sales", label: "مبيعات", color: "green" },
  { value: "purchases", label: "مشتريات", color: "gold" },
  { value: "sales_return", label: "مرتجع مبيعات", color: "red" },
  { value: "purchases_return", label: "مرتجع مشتريات", color: "purple" },
];

const TYPE_LABELS: Record<string, { label: string; color: string }> = Object.fromEntries(
  TYPE_OPTIONS.map((t) => [t.value, { label: t.label, color: t.color }])
);

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  draft: { label: "مسودة", color: "default" },
  confirmed: { label: "مؤكدة", color: "blue" },
  completed: { label: "مكتملة", color: "green" },
  cancelled: { label: "ملغاة", color: "red" },
};

const PAYMENT_STATUS_LABELS: Record<string, { label: string; color: string }> = {
  unpaid: { label: "غير مدفوعة", color: "red" },
  partial: { label: "جزئي", color: "orange" },
  paid: { label: "مدفوعة", color: "green" },
};

export default function Invoices() {
  const [data, setData] = useState<Invoice[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState<string | undefined>(undefined);
  const navigate = useNavigate();

  useEffect(() => {
    document.title = "الفواتير | BI Management v3";
  }, []);

  useEffect(() => {
    setLoading(true);
    fetchList<Invoice>("/api/invoices", page)
      .then((r) => {
        setData(r.data);
        setTotal(r.total || r.data.length);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [page]);

  // Filter invoices
  const filteredData = data.filter((inv) => {
    const matchesSearch =
      !filter || inv.invoiceNumber.toLowerCase().includes(filter.toLowerCase());
    const matchesType = !typeFilter || inv.type === typeFilter;
    return matchesSearch && matchesType;
  });

  // Stats
  const totalSales = data
    .filter((i) => i.type === "sales")
    .reduce((acc, i) => acc + (i.total || 0), 0);
  const totalPurchases = data
    .filter((i) => i.type === "purchases")
    .reduce((acc, i) => acc + (i.total || 0), 0);

  const columns: TableColumnsType<Invoice> = [
    {
      title: "رقم الفاتورة",
      dataIndex: "invoiceNumber",
      key: "invoiceNumber",
      render: (text, record) => (
        <Link
          to={`/invoices/${record.id}`}
          style={{ fontWeight: 600, color: "#3730a3" }}
        >
          {text}
        </Link>
      ),
    },
    {
      title: "النوع",
      dataIndex: "type",
      key: "type",
      width: 130,
      render: (type) => {
        const info = TYPE_LABELS[type] || { label: type, color: "default" };
        return <Tag color={info.color}>{info.label}</Tag>;
      },
    },
    {
      title: "الإجمالي",
      dataIndex: "total",
      key: "total",
      width: 140,
      render: (total) =>
        total != null ? <MoneyDisplay amount={total} size="default" /> : "—",
    },
    {
      title: "الحالة",
      dataIndex: "status",
      key: "status",
      width: 100,
      render: (status) => {
        const info = STATUS_LABELS[status || "draft"] || STATUS_LABELS.draft;
        return <Tag color={info.color}>{info.label}</Tag>;
      },
    },
    {
      title: "حالة الدفع",
      dataIndex: "paymentStatus",
      key: "paymentStatus",
      width: 110,
      render: (paymentStatus) => {
        const info =
          PAYMENT_STATUS_LABELS[paymentStatus || "unpaid"] ||
          PAYMENT_STATUS_LABELS.unpaid;
        return <Tag color={info.color}>{info.label}</Tag>;
      },
    },
    {
      title: "المتبقي",
      dataIndex: "remainingAmount",
      key: "remainingAmount",
      width: 120,
      render: (remaining) => (
        <span style={{ color: (remaining || 0) > 0 ? "#dc2626" : "#64748b" }}>
          {remaining != null ? (
            <MoneyDisplay amount={remaining} />
          ) : (
            "—"
          )}
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
  ];

  if (loading && data.length === 0) {
    return (
      <div>
        <PageHeader
          title="الفواتير"
          breadcrumbs={[{ title: "المبيعات" }, { title: "الفواتير" }]}
        />
        <LoadingSkeleton type="table" rows={8} />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="الفواتير"
        subtitle={`إدارة فواتير المبيعات والمشتريات - ${total} فاتورة`}
        breadcrumbs={[{ title: "المبيعات" }, { title: "الفواتير" }]}
        extra={
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => navigate("/invoices/new")}
          >
            إنشاء فاتورة
          </Button>
        }
      />

      {/* Quick Stats */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={12} sm={8} md={6}>
          <Card>
            <Statistic
              title="إجمالي الفواتير"
              value={data.length}
              prefix={<FileTextOutlined style={{ color: "#22c55e" }} />}
              valueStyle={{ color: "#22c55e" }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={8} md={6}>
          <Card>
            <Statistic
              title="إجمالي المبيعات"
              value={totalSales}
              suffix="د.ع"
              prefix={<DollarOutlined style={{ color: "#3b82f6" }} />}
              valueStyle={{ color: "#3b82f6" }}
              formatter={(value) =>
                new Intl.NumberFormat("ar-IQ").format(value as number)
              }
            />
          </Card>
        </Col>
        <Col xs={12} sm={8} md={6}>
          <Card>
            <Statistic
              title="إجمالي المشتريات"
              value={totalPurchases}
              suffix="د.ع"
              prefix={<ShoppingCartOutlined style={{ color: "#f59e0b" }} />}
              valueStyle={{ color: "#f59e0b" }}
              formatter={(value) =>
                new Intl.NumberFormat("ar-IQ").format(value as number)
              }
            />
          </Card>
        </Col>
      </Row>

      {/* Filters & Table */}
      <Card
        title="قائمة الفواتير"
        extra={
          <Space wrap>
            <Input
              placeholder="بحث برقم الفاتورة..."
              prefix={<SearchOutlined />}
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              style={{ width: 200 }}
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
        }
        styles={{ body: { padding: 0 } }}
      >
        <Table<Invoice>
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
