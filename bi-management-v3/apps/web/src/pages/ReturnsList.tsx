/**
 * صفحة قائمة المرتجعات للموردين
 */
import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Row, Col, Card, Table, Button, Tag, Space, Statistic, Empty } from "antd";
import { PlusOutlined, EyeOutlined, FilterOutlined, ClearOutlined } from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";
import { PageHeader, StatusTag, DateDisplay, LoadingSkeleton } from "../components/shared";
import { API_BASE, getAuthHeaders } from "../utils/api";

interface ReturnRequest {
  id: string;
  returnNumber: string;
  supplierId?: string;
  supplierName?: string;
  returnType: string;
  status: string;
  colorCode: string;
  totalItems: number;
  createdAt: string;
  sentAt?: string;
  receivedAt?: string;
  resolvedAt?: string;
  daysPending?: number;
  notes?: string;
}

interface Stats {
  total: number;
  pending: number;
  sent: number;
  received: number;
  resolved: number;
  red: number;
  orange: number;
  yellow: number;
}

const STATUS_LABELS: Record<string, string> = {
  pending: "معلق",
  sent: "تم الإرسال",
  received: "تم الاستلام",
  resolved: "مُعالج",
  cancelled: "ملغي",
};

const STATUS_COLORS: Record<string, "warning" | "processing" | "purple" | "success" | "default"> = {
  pending: "warning",
  sent: "processing",
  received: "purple",
  resolved: "success",
  cancelled: "default",
};

const COLOR_BADGES: Record<string, string> = {
  green: "#52c41a",
  yellow: "#faad14",
  orange: "#fa8c16",
  red: "#f5222d",
};

export default function ReturnsList() {
  const navigate = useNavigate();
  const [returns, setReturns] = useState<ReturnRequest[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({
    status: "",
    colorCode: "",
  });

  useEffect(() => {
    fetchReturns();
  }, [filter]);

  const fetchReturns = async () => {
    try {
      const params = new URLSearchParams();
      if (filter.status) params.append("status", filter.status);
      if (filter.colorCode) params.append("colorCode", filter.colorCode);

      const res = await fetch(`${API_BASE}/api/returns?${params}`, {
        headers: getAuthHeaders(),
      });

      if (res.ok) {
        const data = await res.json();
        setReturns(data.returns || []);
        setStats(data.stats || null);
      }
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  };

  const toggleStatusFilter = (status: string) => {
    setFilter((f) => ({
      ...f,
      status: f.status === status ? "" : status,
    }));
  };

  const toggleColorFilter = (colorCode: string) => {
    setFilter((f) => ({
      ...f,
      colorCode: f.colorCode === colorCode ? "" : colorCode,
    }));
  };

  const clearFilters = () => {
    setFilter({ status: "", colorCode: "" });
  };

  const columns: ColumnsType<ReturnRequest> = [
    {
      title: "رقم المرتجع",
      dataIndex: "returnNumber",
      key: "returnNumber",
      render: (text, record) => (
        <Space>
          <span
            style={{
              width: 12,
              height: 12,
              borderRadius: "50%",
              backgroundColor: COLOR_BADGES[record.colorCode] || "#d9d9d9",
              display: "inline-block",
            }}
            title={`تنبيه: ${record.colorCode}`}
          />
          <Link to={`/returns/${record.id}`} style={{ fontWeight: 500 }}>
            {text}
          </Link>
        </Space>
      ),
    },
    {
      title: "المورد",
      dataIndex: "supplierName",
      key: "supplierName",
      render: (text) => text || "-",
    },
    {
      title: "العناصر",
      dataIndex: "totalItems",
      key: "totalItems",
      align: "center",
    },
    {
      title: "الحالة",
      dataIndex: "status",
      key: "status",
      render: (status) => (
        <Tag color={STATUS_COLORS[status]}>
          {STATUS_LABELS[status]}
        </Tag>
      ),
    },
    {
      title: "الأيام",
      dataIndex: "daysPending",
      key: "daysPending",
      render: (days) => {
        if (days === null || days === undefined) return <span style={{ color: "#bfbfbf" }}>-</span>;
        let color = "#595959";
        if (days > 30) color = "#f5222d";
        else if (days > 14) color = "#fa8c16";
        else if (days > 7) color = "#faad14";
        return <span style={{ fontWeight: 500, color }}>{days} يوم</span>;
      },
    },
    {
      title: "التاريخ",
      dataIndex: "createdAt",
      key: "createdAt",
      render: (date) => <DateDisplay date={date} />,
    },
    {
      title: "إجراءات",
      key: "actions",
      align: "center",
      render: (_, record) => (
        <Button
          type="link"
          icon={<EyeOutlined />}
          onClick={() => navigate(`/returns/${record.id}`)}
        >
          التفاصيل
        </Button>
      ),
    },
  ];

  if (loading) {
    return <LoadingSkeleton />;
  }

  return (
    <div>
      <PageHeader
        title="مرتجعات الموردين"
        subtitle="تتبع ومتابعة المرتجعات للموردين"
        breadcrumbs={[
          { label: "الرئيسية", path: "/" },
          { label: "المرتجعات" },
        ]}
        extra={
          <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate("/returns/new")}>
            مرتجع جديد
          </Button>
        }
      />

      {/* Stats Cards */}
      {stats && (
        <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
          <Col xs={12} md={6} lg={3}>
            <Card size="small">
              <Statistic title="الإجمالي" value={stats.total} />
            </Card>
          </Col>
          <Col xs={12} md={6} lg={3}>
            <Card
              size="small"
              hoverable
              onClick={() => toggleStatusFilter("pending")}
              style={{
                backgroundColor: filter.status === "pending" ? "#fffbe6" : undefined,
                borderColor: filter.status === "pending" ? "#faad14" : undefined,
              }}
            >
              <Statistic title="معلق" value={stats.pending} valueStyle={{ color: "#d48806" }} />
            </Card>
          </Col>
          <Col xs={12} md={6} lg={3}>
            <Card
              size="small"
              hoverable
              onClick={() => toggleStatusFilter("sent")}
              style={{
                backgroundColor: filter.status === "sent" ? "#e6f7ff" : undefined,
                borderColor: filter.status === "sent" ? "#1890ff" : undefined,
              }}
            >
              <Statistic title="مُرسل" value={stats.sent} valueStyle={{ color: "#1890ff" }} />
            </Card>
          </Col>
          <Col xs={12} md={6} lg={3}>
            <Card
              size="small"
              hoverable
              onClick={() => toggleStatusFilter("received")}
              style={{
                backgroundColor: filter.status === "received" ? "#f9f0ff" : undefined,
                borderColor: filter.status === "received" ? "#722ed1" : undefined,
              }}
            >
              <Statistic title="مُستلم" value={stats.received} valueStyle={{ color: "#722ed1" }} />
            </Card>
          </Col>
          <Col xs={12} md={6} lg={3}>
            <Card
              size="small"
              hoverable
              onClick={() => toggleStatusFilter("resolved")}
              style={{
                backgroundColor: filter.status === "resolved" ? "#f6ffed" : undefined,
                borderColor: filter.status === "resolved" ? "#52c41a" : undefined,
              }}
            >
              <Statistic title="مُعالج" value={stats.resolved} valueStyle={{ color: "#52c41a" }} />
            </Card>
          </Col>
          <Col xs={12} md={6} lg={3}>
            <Card
              size="small"
              hoverable
              onClick={() => toggleColorFilter("orange")}
              style={{
                backgroundColor: filter.colorCode === "orange" ? "#fff7e6" : undefined,
                borderColor: filter.colorCode === "orange" ? "#fa8c16" : undefined,
              }}
            >
              <Statistic title="تصعيد" value={stats.orange} valueStyle={{ color: "#fa8c16" }} />
            </Card>
          </Col>
          <Col xs={12} md={6} lg={3}>
            <Card
              size="small"
              hoverable
              onClick={() => toggleColorFilter("red")}
              style={{
                backgroundColor: filter.colorCode === "red" ? "#fff1f0" : undefined,
                borderColor: filter.colorCode === "red" ? "#f5222d" : undefined,
              }}
            >
              <Statistic title="إنذار" value={stats.red} valueStyle={{ color: "#f5222d" }} />
            </Card>
          </Col>
        </Row>
      )}

      {/* Active Filters */}
      {(filter.status || filter.colorCode) && (
        <Space style={{ marginBottom: 16 }}>
          <FilterOutlined />
          <span>الفلاتر:</span>
          {filter.status && (
            <Tag closable onClose={() => setFilter((f) => ({ ...f, status: "" }))}>
              {STATUS_LABELS[filter.status]}
            </Tag>
          )}
          {filter.colorCode && (
            <Tag
              closable
              onClose={() => setFilter((f) => ({ ...f, colorCode: "" }))}
              icon={
                <span
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: "50%",
                    backgroundColor: COLOR_BADGES[filter.colorCode],
                    display: "inline-block",
                    marginLeft: 4,
                  }}
                />
              }
            >
              {filter.colorCode}
            </Tag>
          )}
          <Button type="link" size="small" icon={<ClearOutlined />} onClick={clearFilters}>
            مسح الكل
          </Button>
        </Space>
      )}

      {/* Table */}
      <Card>
        <Table
          columns={columns}
          dataSource={returns}
          rowKey="id"
          locale={{
            emptyText: <Empty description="لا توجد مرتجعات" />,
          }}
          pagination={{
            showSizeChanger: true,
            showTotal: (total) => `إجمالي ${total} مرتجع`,
          }}
        />
      </Card>
    </div>
  );
}
