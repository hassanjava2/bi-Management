import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { fetchList, API_BASE, getAuthHeaders } from "../utils/api";
import {
  Row,
  Col,
  Card,
  Table,
  Button,
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
  CloseOutlined,
  CreditCardOutlined,
  ArrowDownOutlined,
  ArrowUpOutlined,
  ClockCircleOutlined,
  ExclamationCircleOutlined,
} from "@ant-design/icons";
import { PageHeader, MoneyDisplay, DateDisplay, ConfirmDelete, LoadingSkeleton } from "../components/shared";

type Check = {
  id: string;
  checkNumber: string;
  type: string;
  amount: number;
  checkDate: string | null;
  dueDate: string | null;
  status: string;
  payeeName: string | null;
  bankName: string | null;
  createdAt: string | null;
};

const STATUS_OPTIONS = [
  { value: "pending", label: "معلق", color: "warning" },
  { value: "deposited", label: "مودع", color: "processing" },
  { value: "cleared", label: "صُرف", color: "success" },
  { value: "bounced", label: "مرتجع", color: "error" },
  { value: "cancelled", label: "ملغي", color: "default" },
];

const STATUS_LABELS: Record<string, { label: string; color: string }> = Object.fromEntries(
  STATUS_OPTIONS.map((s) => [s.value, { label: s.label, color: s.color }])
);

const TYPE_OPTIONS = [
  { value: "incoming", label: "وارد", color: "green" },
  { value: "outgoing", label: "صادر", color: "red" },
];

const TYPE_LABELS: Record<string, { label: string; color: string }> = Object.fromEntries(
  TYPE_OPTIONS.map((t) => [t.value, { label: t.label, color: t.color }])
);

export default function Checks() {
  const [data, setData] = useState<Check[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState<string | undefined>(undefined);
  const [statusFilter, setStatusFilter] = useState<string | undefined>(undefined);
  const navigate = useNavigate();

  useEffect(() => {
    document.title = "الشيكات | BI Management v3";
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const result = await fetchList<Check>("/api/checks", page);
      setData(result.data);
      setTotal(result.total || result.data.length);
    } catch (e) {
      message.error("فشل في تحميل الشيكات");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [page]);

  const handleDelete = async (id: string, checkNumber: string) => {
    try {
      const res = await fetch(`${API_BASE}/api/checks/${id}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      });
      if (!res.ok) throw new Error("فشل الإلغاء");
      message.success("تم إلغاء الشيك");
      fetchData();
    } catch (err) {
      message.error(err instanceof Error ? err.message : "فشل الإلغاء");
    }
  };

  // Filter checks
  const filteredData = data.filter((check) => {
    const matchesType = !typeFilter || check.type === typeFilter;
    const matchesStatus = !statusFilter || check.status === statusFilter;
    return matchesType && matchesStatus;
  });

  // Stats
  const totalIncoming = data.filter((c) => c.type === "incoming").reduce((acc, c) => acc + c.amount, 0);
  const totalOutgoing = data.filter((c) => c.type === "outgoing").reduce((acc, c) => acc + c.amount, 0);
  const pendingCount = data.filter((c) => c.status === "pending").length;

  const columns: TableColumnsType<Check> = [
    {
      title: "رقم الشيك",
      dataIndex: "checkNumber",
      key: "checkNumber",
      render: (text, record) => (
        <Link to={`/checks/${record.id}`} style={{ fontWeight: 600, color: "#3730a3" }}>
          {text}
        </Link>
      ),
    },
    {
      title: "النوع",
      dataIndex: "type",
      key: "type",
      width: 100,
      render: (type) => {
        const info = TYPE_LABELS[type] || { label: type, color: "default" };
        return <Tag color={info.color}>{info.label}</Tag>;
      },
    },
    {
      title: "المبلغ",
      dataIndex: "amount",
      key: "amount",
      width: 140,
      render: (amount, record) => (
        <MoneyDisplay
          amount={amount}
          colored
          size="default"
        />
      ),
    },
    {
      title: "تاريخ الاستحقاق",
      dataIndex: "dueDate",
      key: "dueDate",
      width: 140,
      render: (date, record) => {
        const isOverdue = date && new Date(date) < new Date() && record.status === "pending";
        return (
          <div>
            <DateDisplay date={date} />
            {isOverdue && (
              <Tag color="error" style={{ marginTop: 4, fontSize: 11 }}>
                <ExclamationCircleOutlined /> متأخر
              </Tag>
            )}
          </div>
        );
      },
    },
    {
      title: "الحالة",
      dataIndex: "status",
      key: "status",
      width: 100,
      render: (status) => {
        const info = STATUS_LABELS[status] || STATUS_LABELS.pending;
        return <Tag color={info.color}>{info.label}</Tag>;
      },
    },
    {
      title: "المستفيد/الساحب",
      dataIndex: "payeeName",
      key: "payeeName",
      ellipsis: true,
      render: (name) => (
        <span style={{ color: name ? "#1e293b" : "#94a3b8" }}>
          {name || "—"}
        </span>
      ),
    },
    {
      title: "البنك",
      dataIndex: "bankName",
      key: "bankName",
      width: 120,
      render: (bank) => (
        <span style={{ color: "#64748b" }}>{bank || "—"}</span>
      ),
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
            onClick={() => navigate(`/checks/${record.id}/edit`)}
          >
            تعديل
          </Button>
          {record.status === "pending" && (
            <ConfirmDelete
              title="إلغاء الشيك"
              description={`هل أنت متأكد من إلغاء الشيك "${record.checkNumber}"؟`}
              onConfirm={() => handleDelete(record.id, record.checkNumber)}
            >
              <Button type="link" danger size="small" icon={<CloseOutlined />}>
                إلغاء
              </Button>
            </ConfirmDelete>
          )}
        </Space>
      ),
    },
  ];

  if (loading && data.length === 0) {
    return (
      <div>
        <PageHeader
          title="الشيكات"
          breadcrumbs={[{ title: "المالية" }, { title: "الشيكات" }]}
        />
        <LoadingSkeleton type="table" rows={8} />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="الشيكات"
        subtitle={`إدارة الشيكات الواردة والصادرة - ${total} شيك`}
        breadcrumbs={[{ title: "المالية" }, { title: "الشيكات" }]}
        extra={
          <Button
            type="primary"
            danger
            icon={<PlusOutlined />}
            onClick={() => navigate("/checks/new")}
          >
            إضافة شيك
          </Button>
        }
      />

      {/* Quick Stats */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={12} sm={6}>
          <Card>
            <Statistic
              title="إجمالي الشيكات"
              value={data.length}
              prefix={<CreditCardOutlined style={{ color: "#ef4444" }} />}
              valueStyle={{ color: "#ef4444" }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card>
            <Statistic
              title="شيكات واردة"
              value={totalIncoming}
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
              title="شيكات صادرة"
              value={totalOutgoing}
              suffix="د.ع"
              prefix={<ArrowUpOutlined style={{ color: "#f59e0b" }} />}
              valueStyle={{ color: "#f59e0b" }}
              formatter={(value) => new Intl.NumberFormat("ar-IQ").format(value as number)}
            />
          </Card>
        </Col>
        {pendingCount > 0 && (
          <Col xs={12} sm={6}>
            <Card>
              <Statistic
                title="معلق"
                value={pendingCount}
                prefix={<ClockCircleOutlined style={{ color: "#3b82f6" }} />}
                valueStyle={{ color: "#3b82f6" }}
              />
            </Card>
          </Col>
        )}
      </Row>

      {/* Filters & Table */}
      <Card
        title="قائمة الشيكات"
        extra={
          <Space wrap>
            <Select
              placeholder="جميع الأنواع"
              value={typeFilter}
              onChange={setTypeFilter}
              allowClear
              style={{ width: 130 }}
              options={TYPE_OPTIONS.map((t) => ({
                value: t.value,
                label: t.label,
              }))}
            />
            <Select
              placeholder="جميع الحالات"
              value={statusFilter}
              onChange={setStatusFilter}
              allowClear
              style={{ width: 130 }}
              options={STATUS_OPTIONS.map((s) => ({
                value: s.value,
                label: s.label,
              }))}
            />
          </Space>
        }
        styles={{ body: { padding: 0 } }}
      >
        <Table<Check>
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
          scroll={{ x: 1000 }}
        />
      </Card>
    </div>
  );
}
