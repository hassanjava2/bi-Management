/**
 * صفحة البحث عن الأجهزة وعرض الحركات الأخيرة
 */
import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  Row,
  Col,
  Card,
  Input,
  Table,
  Tag,
  Space,
  Statistic,
  Empty,
  Typography,
  message,
} from "antd";
import type { TableColumnsType } from "antd";
import {
  SearchOutlined,
  MobileOutlined,
  ClockCircleOutlined,
  SyncOutlined,
} from "@ant-design/icons";
import { PageHeader, DateDisplay, LoadingSkeleton } from "../components/shared";
import { API_BASE, getAuthHeaders } from "../utils/api";

const { Text } = Typography;

interface Device {
  id: string;
  serialNumber: string;
  status: string;
  productName: string;
  productNameAr: string;
  warehouseName: string;
  purchaseDate: string;
  saleDate: string;
}

interface Movement {
  id: string;
  movementType: string;
  serialNumber: string;
  productName: string;
  fromStatus: string;
  toStatus: string;
  performedByName: string;
  performedAt: string;
  notes: string;
}

interface Stats {
  statusCounts: { status: string; count: number }[];
  todayMovements: { movementType: string; count: number }[];
  inCustody: number;
}

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  available: { label: "متاح", color: "green" },
  reserved: { label: "محجوز", color: "gold" },
  sold: { label: "مباع", color: "blue" },
  in_custody: { label: "في عهدة", color: "purple" },
  in_maintenance: { label: "صيانة", color: "orange" },
  damaged: { label: "تالف", color: "red" },
  returned: { label: "مرتجع", color: "default" },
};

const MOVEMENT_LABELS: Record<string, string> = {
  purchase_received: "استلام من المورد",
  warehouse_transfer: "نقل بين المخازن",
  custody_assign: "تسليم عهدة",
  custody_return: "استرداد عهدة",
  sale: "بيع",
  sale_return: "مرتجع بيع",
  maintenance_in: "دخول صيانة",
  maintenance_out: "خروج صيانة",
  upgrade: "ترقية",
  downgrade: "تنزيل",
  damage: "تلف",
  adjustment: "تعديل جرد",
};

export default function DeviceSearch() {
  const [query, setQuery] = useState("");
  const [devices, setDevices] = useState<Device[]>([]);
  const [recentMovements, setRecentMovements] = useState<Movement[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [searching, setSearching] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    document.title = "سجل الأجهزة | BI Management v3";
    fetchInitialData();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (query.length >= 2) {
        searchDevices();
      } else {
        setDevices([]);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  async function fetchInitialData() {
    try {
      const [statsRes, recentRes] = await Promise.all([
        fetch(`${API_BASE}/api/device-movements/stats`, {
          headers: getAuthHeaders(),
        }),
        fetch(`${API_BASE}/api/device-movements/recent?limit=20`, {
          headers: getAuthHeaders(),
        }),
      ]);

      const statsData = await statsRes.json();
      const recentData = await recentRes.json();

      setStats(statsData);
      setRecentMovements(recentData.movements || []);
    } catch (err) {
      console.error(err);
      message.error("فشل في تحميل البيانات");
    } finally {
      setLoading(false);
    }
  }

  async function searchDevices() {
    setSearching(true);
    try {
      const res = await fetch(
        `${API_BASE}/api/device-movements/search?q=${encodeURIComponent(query)}`,
        { headers: getAuthHeaders() }
      );
      const data = await res.json();
      setDevices(data.devices || []);
    } catch (err) {
      console.error(err);
      message.error("فشل في البحث");
    } finally {
      setSearching(false);
    }
  }

  const movementColumns: TableColumnsType<Movement> = [
    {
      title: "التاريخ",
      dataIndex: "performedAt",
      key: "performedAt",
      width: 150,
      render: (date) => <DateDisplay date={date} format="datetime" />,
    },
    {
      title: "الرقم التسلسلي",
      dataIndex: "serialNumber",
      key: "serialNumber",
      width: 160,
      render: (sn) => (
        <Link
          to={`/devices/${sn}`}
          style={{ fontFamily: "monospace", color: "#3730a3" }}
        >
          {sn}
        </Link>
      ),
    },
    {
      title: "نوع الحركة",
      dataIndex: "movementType",
      key: "movementType",
      width: 140,
      render: (type) => <Tag>{MOVEMENT_LABELS[type] || type}</Tag>,
    },
    {
      title: "المنتج",
      dataIndex: "productName",
      key: "productName",
    },
    {
      title: "المنفذ",
      dataIndex: "performedByName",
      key: "performedByName",
      width: 120,
      render: (name) => <Text type="secondary">{name}</Text>,
    },
  ];

  if (loading) {
    return (
      <div>
        <PageHeader
          title="سجل الأجهزة"
          subtitle="بحث وتتبع حركة الأجهزة بالرقم التسلسلي"
          breadcrumbs={[{ title: "الأجهزة" }, { title: "السجل" }]}
        />
        <LoadingSkeleton type="table" rows={6} />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="سجل الأجهزة"
        subtitle="بحث وتتبع حركة الأجهزة بالرقم التسلسلي"
        breadcrumbs={[{ title: "الأجهزة" }, { title: "السجل" }]}
      />

      {/* مربع البحث */}
      <Card style={{ marginBottom: 24 }}>
        <div style={{ maxWidth: 500 }}>
          <Text strong style={{ display: "block", marginBottom: 8 }}>
            البحث بالرقم التسلسلي
          </Text>
          <Input
            size="large"
            placeholder="BI-2024-000001 أو جزء من الرقم..."
            prefix={searching ? <SyncOutlined spin /> : <SearchOutlined />}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            style={{ direction: "ltr", fontFamily: "monospace" }}
            allowClear
          />
        </div>

        {/* نتائج البحث */}
        {devices.length > 0 && (
          <div
            style={{
              marginTop: 16,
              border: "1px solid #e2e8f0",
              borderRadius: 8,
              maxHeight: 320,
              overflow: "auto",
            }}
          >
            {devices.map((device) => {
              const statusConfig = STATUS_CONFIG[device.status] || {
                label: device.status,
                color: "default",
              };
              return (
                <Link
                  key={device.id}
                  to={`/devices/${device.serialNumber}`}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 16,
                    padding: 12,
                    borderBottom: "1px solid #f1f5f9",
                    textDecoration: "none",
                    color: "inherit",
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <div
                      style={{
                        fontFamily: "monospace",
                        fontWeight: 500,
                        color: "#3730a3",
                      }}
                    >
                      {device.serialNumber}
                    </div>
                    <Text type="secondary" style={{ fontSize: 13 }}>
                      {device.productNameAr || device.productName}
                    </Text>
                  </div>
                  <Tag color={statusConfig.color}>{statusConfig.label}</Tag>
                  <Text type="secondary" style={{ fontSize: 13 }}>
                    {device.warehouseName || "-"}
                  </Text>
                </Link>
              );
            })}
          </div>
        )}

        {query.length >= 2 && devices.length === 0 && !searching && (
          <Empty description="لا توجد نتائج للبحث" style={{ marginTop: 24 }} />
        )}
      </Card>

      {/* الإحصائيات */}
      {stats && (
        <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
          {stats.statusCounts.map((stat) => {
            const config = STATUS_CONFIG[stat.status] || {
              label: stat.status,
              color: "default",
            };
            return (
              <Col xs={12} sm={8} md={6} lg={4} key={stat.status}>
                <Card>
                  <Statistic
                    title={config.label}
                    value={stat.count}
                    prefix={<MobileOutlined />}
                  />
                </Card>
              </Col>
            );
          })}
        </Row>
      )}

      {/* أحدث الحركات */}
      <Card
        title={
          <Space>
            <ClockCircleOutlined />
            أحدث الحركات
          </Space>
        }
        styles={{ body: { padding: 0 } }}
      >
        <Table<Movement>
          columns={movementColumns}
          dataSource={recentMovements}
          rowKey="id"
          pagination={false}
          locale={{ emptyText: <Empty description="لا توجد حركات مسجلة" /> }}
          scroll={{ x: 700 }}
        />
      </Card>
    </div>
  );
}
