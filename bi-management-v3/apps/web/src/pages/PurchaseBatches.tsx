/**
 * صفحة وجبات الشراء
 * ────────────────────
 * عرض كل الوجبات + فلترة حسب الحالة
 */

import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  Row,
  Col,
  Card,
  Table,
  Button,
  Tag,
  Space,
  Statistic,
  Empty,
} from "antd";
import {
  PlusOutlined,
  EyeOutlined,
  DollarOutlined,
  CheckCircleOutlined,
  ShoppingOutlined,
  CloseCircleOutlined,
  HomeOutlined,
} from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";
import { PageHeader, StatusTag, MoneyDisplay, DateDisplay, LoadingSkeleton } from "../components/shared";
import { API_BASE, getAuthHeaders } from "../utils/api";

interface Supplier {
  id: string;
  name: string;
}

interface Batch {
  id: string;
  batchNumber: string;
  status: string;
  totalItems: number;
  receivedItems: number;
  totalCost?: number;
  notes?: string;
  createdAt: string;
  supplier?: Supplier;
}

interface Stats {
  awaitingPrices: number;
  readyForReceiving: number;
  receiving: number;
  received: number;
  readyToSell: number;
}

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  awaiting_prices: { label: "بانتظار الأسعار", color: "orange" },
  ready_for_receiving: { label: "جاهزة للاستلام", color: "blue" },
  receiving: { label: "قيد الاستلام", color: "purple" },
  received: { label: "تم الاستلام", color: "green" },
  ready_to_sell: { label: "جاهزة للبيع", color: "cyan" },
  cancelled: { label: "ملغية", color: "red" },
};

export default function PurchaseBatches() {
  const [batches, setBatches] = useState<Batch[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("");

  useEffect(() => {
    fetchBatches();
    fetchStats();
  }, [statusFilter]);

  const fetchBatches = async () => {
    try {
      const url = statusFilter
        ? `${API_BASE}/api/purchases/batches?status=${statusFilter}`
        : `${API_BASE}/api/purchases/batches`;

      const res = await fetch(url, {
        headers: getAuthHeaders(),
      });

      if (res.ok) {
        const data = await res.json();
        setBatches(data.batches || []);
      }
    } catch (err) {
      console.error("Error fetching batches:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/purchases/stats`, {
        headers: getAuthHeaders(),
      });

      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (err) {
      console.error("Error fetching stats:", err);
    }
  };

  const columns: ColumnsType<Batch> = [
    {
      title: "رقم الوجبة",
      dataIndex: "batchNumber",
      key: "batchNumber",
      render: (text) => <span style={{ fontWeight: 500 }}>{text}</span>,
    },
    {
      title: "المورد",
      dataIndex: ["supplier", "name"],
      key: "supplier",
      render: (text) => text || "-",
    },
    {
      title: "الحالة",
      dataIndex: "status",
      key: "status",
      render: (status: string) => {
        const config = STATUS_CONFIG[status];
        return config ? (
          <Tag color={config.color}>{config.label}</Tag>
        ) : (
          <Tag>{status}</Tag>
        );
      },
    },
    {
      title: "الكمية",
      key: "quantity",
      render: (_, record) => (
        <span>
          {record.receivedItems} / {record.totalItems}
        </span>
      ),
    },
    {
      title: "التكلفة",
      dataIndex: "totalCost",
      key: "totalCost",
      render: (cost) => <MoneyDisplay amount={cost} />,
    },
    {
      title: "التاريخ",
      dataIndex: "createdAt",
      key: "createdAt",
      render: (date) => <DateDisplay date={date} showTime />,
    },
    {
      title: "الإجراءات",
      key: "actions",
      render: (_, record) => (
        <Space size="small">
          <Link to={`/purchases/${record.id}`}>
            <Button type="link" icon={<EyeOutlined />} size="small">
              عرض
            </Button>
          </Link>
          {record.status === "awaiting_prices" && (
            <Link to={`/purchases/${record.id}/prices`}>
              <Button type="link" size="small" style={{ color: "#fa8c16" }}>
                إضافة الأسعار
              </Button>
            </Link>
          )}
          {(record.status === "ready_for_receiving" ||
            record.status === "receiving") && (
            <Link to={`/purchases/${record.id}/receive`}>
              <Button type="link" size="small" style={{ color: "#52c41a" }}>
                استلام وفحص
              </Button>
            </Link>
          )}
          {record.status === "received" && (
            <Link to={`/purchases/${record.id}/selling-prices`}>
              <Button type="link" size="small" style={{ color: "#13c2c2" }}>
                أسعار البيع
              </Button>
            </Link>
          )}
        </Space>
      ),
    },
  ];

  const handleStatClick = (status: string) => {
    setStatusFilter(statusFilter === status ? "" : status);
    setLoading(true);
  };

  const clearFilter = () => {
    setStatusFilter("");
    setLoading(true);
  };

  if (loading && batches.length === 0) {
    return <LoadingSkeleton />;
  }

  return (
    <div>
      <PageHeader
        title="وجبات الشراء"
        subtitle="إدارة وجبات الشراء من الموردين"
        breadcrumbs={[
          { icon: <HomeOutlined />, title: "الرئيسية", path: "/" },
          { title: "المشتريات", path: "/purchases" },
          { title: "وجبات الشراء" },
        ]}
        extra={
          <Link to="/purchases/new">
            <Button type="primary" icon={<PlusOutlined />}>
              إضافة وجبة جديدة
            </Button>
          </Link>
        }
      />

      {/* Stats Cards */}
      {stats && (
        <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
          <Col xs={12} md={4}>
            <Card
              hoverable
              onClick={() => handleStatClick("awaiting_prices")}
              style={{
                borderColor:
                  statusFilter === "awaiting_prices" ? "#fa8c16" : undefined,
                borderWidth: statusFilter === "awaiting_prices" ? 2 : 1,
              }}
            >
              <Statistic
                title="بانتظار الأسعار"
                value={stats.awaitingPrices}
                valueStyle={{ color: "#fa8c16" }}
                prefix={<DollarOutlined />}
              />
            </Card>
          </Col>
          <Col xs={12} md={4}>
            <Card
              hoverable
              onClick={() => handleStatClick("ready_for_receiving")}
              style={{
                borderColor:
                  statusFilter === "ready_for_receiving" ? "#1890ff" : undefined,
                borderWidth: statusFilter === "ready_for_receiving" ? 2 : 1,
              }}
            >
              <Statistic
                title="جاهزة للاستلام"
                value={stats.readyForReceiving}
                valueStyle={{ color: "#1890ff" }}
                prefix={<ShoppingOutlined />}
              />
            </Card>
          </Col>
          <Col xs={12} md={4}>
            <Card
              hoverable
              onClick={() => handleStatClick("receiving")}
              style={{
                borderColor:
                  statusFilter === "receiving" ? "#722ed1" : undefined,
                borderWidth: statusFilter === "receiving" ? 2 : 1,
              }}
            >
              <Statistic
                title="قيد الاستلام"
                value={stats.receiving}
                valueStyle={{ color: "#722ed1" }}
                prefix={<ShoppingOutlined />}
              />
            </Card>
          </Col>
          <Col xs={12} md={4}>
            <Card
              hoverable
              onClick={() => handleStatClick("received")}
              style={{
                borderColor:
                  statusFilter === "received" ? "#52c41a" : undefined,
                borderWidth: statusFilter === "received" ? 2 : 1,
              }}
            >
              <Statistic
                title="تم الاستلام"
                value={stats.received}
                valueStyle={{ color: "#52c41a" }}
                prefix={<CheckCircleOutlined />}
              />
            </Card>
          </Col>
          <Col xs={12} md={4}>
            <Card
              hoverable
              onClick={() => handleStatClick("ready_to_sell")}
              style={{
                borderColor:
                  statusFilter === "ready_to_sell" ? "#13c2c2" : undefined,
                borderWidth: statusFilter === "ready_to_sell" ? 2 : 1,
              }}
            >
              <Statistic
                title="جاهزة للبيع"
                value={stats.readyToSell}
                valueStyle={{ color: "#13c2c2" }}
                prefix={<CheckCircleOutlined />}
              />
            </Card>
          </Col>
        </Row>
      )}

      {/* Active Filter */}
      {statusFilter && (
        <Space style={{ marginBottom: 16 }}>
          <span style={{ color: "#8c8c8c" }}>فلترة حسب:</span>
          <Tag color={STATUS_CONFIG[statusFilter]?.color}>
            {STATUS_CONFIG[statusFilter]?.label}
          </Tag>
          <Button type="link" onClick={clearFilter} icon={<CloseCircleOutlined />}>
            إزالة الفلتر
          </Button>
        </Space>
      )}

      {/* Batches Table */}
      <Card>
        <Table
          columns={columns}
          dataSource={batches}
          rowKey="id"
          loading={loading}
          locale={{
            emptyText: <Empty description="لا توجد وجبات" />,
          }}
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showTotal: (total) => `إجمالي ${total} وجبة`,
          }}
        />
      </Card>
    </div>
  );
}
