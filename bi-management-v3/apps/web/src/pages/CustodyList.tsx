/**
 * صفحة قائمة العهد الحالية
 */
import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Row,
  Col,
  Card,
  Table,
  Button,
  Input,
  Tag,
  Space,
  Statistic,
  Empty,
  Avatar,
  Progress,
  Segmented,
  Typography,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import {
  PlusOutlined,
  SearchOutlined,
  UserOutlined,
  SwapOutlined,
  InboxOutlined,
  RiseOutlined,
  TeamOutlined,
  AppstoreOutlined,
} from "@ant-design/icons";
import { PageHeader, LoadingSkeleton, DateDisplay } from "../components/shared";
import { API_BASE } from "../utils/api";

const { Text } = Typography;

interface CustodyItem {
  id: string;
  serialNumber: string;
  productId: string;
  productName: string;
  productModel?: string;
  custodyUserId: string;
  userName: string;
  custodySince: string;
  custodyReason?: string;
  warehouseName?: string;
  condition?: string;
  notes?: string;
}

interface CustodySummary {
  userId: string;
  userName: string;
  itemCount: number;
}

interface CustodyStats {
  totalCustody: number;
  employeesWithCustody: number;
  todayMovements: number;
  topProducts: {
    productId: string;
    productName: string;
    count: number;
  }[];
}

export default function CustodyList() {
  const navigate = useNavigate();
  const [items, setItems] = useState<CustodyItem[]>([]);
  const [summary, setSummary] = useState<CustodySummary[]>([]);
  const [stats, setStats] = useState<CustodyStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<string>("list");
  const [searchSerial, setSearchSerial] = useState("");

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const token = localStorage.getItem("token");
      const headers = { Authorization: `Bearer ${token}` };

      const [itemsRes, summaryRes, statsRes] = await Promise.all([
        fetch(`${API_BASE}/api/custody`, { headers }),
        fetch(`${API_BASE}/api/custody/by-employee`, { headers }),
        fetch(`${API_BASE}/api/custody/stats`, { headers }),
      ]);

      if (itemsRes.ok) {
        const data = await itemsRes.json();
        setItems(data.items || []);
      }

      if (summaryRes.ok) {
        const data = await summaryRes.json();
        setSummary(data.summary || []);
      }

      if (statsRes.ok) {
        const data = await statsRes.json();
        setStats(data);
      }
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  };

  const getDaysInCustody = (since: string) => {
    const days = Math.floor(
      (Date.now() - new Date(since).getTime()) / (1000 * 60 * 60 * 24)
    );
    return days;
  };

  const getDaysColor = (days: number): "success" | "warning" | "error" => {
    if (days > 90) return "error";
    if (days > 30) return "warning";
    return "success";
  };

  const filteredItems = items.filter(
    (item) =>
      item.serialNumber.toLowerCase().includes(searchSerial.toLowerCase()) ||
      item.productName?.toLowerCase().includes(searchSerial.toLowerCase()) ||
      item.userName?.toLowerCase().includes(searchSerial.toLowerCase())
  );

  const columns: ColumnsType<CustodyItem> = [
    {
      title: "السيريال",
      dataIndex: "serialNumber",
      key: "serialNumber",
      render: (serial: string) => (
        <Link to={`/devices/${serial}`}>
          <Tag color="blue" style={{ fontFamily: "monospace" }}>
            {serial}
          </Tag>
        </Link>
      ),
    },
    {
      title: "المنتج",
      dataIndex: "productName",
      key: "productName",
      render: (name: string, record) => (
        <div>
          <div style={{ fontWeight: 500 }}>{name}</div>
          {record.productModel && (
            <Text type="secondary" style={{ fontSize: 12 }}>
              {record.productModel}
            </Text>
          )}
        </div>
      ),
    },
    {
      title: "المستلم",
      dataIndex: "userName",
      key: "userName",
      render: (name: string, record) => (
        <Link to={`/custody/employee/${record.custodyUserId}`}>
          <Space>
            <Avatar size="small" icon={<UserOutlined />}>
              {name?.charAt(0)}
            </Avatar>
            {name}
          </Space>
        </Link>
      ),
    },
    {
      title: "تاريخ التسليم",
      dataIndex: "custodySince",
      key: "custodySince",
      render: (date: string) => <DateDisplay date={date} />,
    },
    {
      title: "المدة",
      dataIndex: "custodySince",
      key: "duration",
      render: (since: string) => {
        const days = getDaysInCustody(since);
        const color = getDaysColor(days);
        return (
          <Tag color={color === "success" ? "green" : color === "warning" ? "gold" : "red"}>
            {days} يوم
          </Tag>
        );
      },
    },
    {
      title: "السبب",
      dataIndex: "custodyReason",
      key: "custodyReason",
      render: (reason: string) => reason || "-",
    },
    {
      title: "إجراءات",
      key: "actions",
      align: "center",
      render: (_, record) => (
        <Link to={`/custody/return?serial=${record.serialNumber}`}>
          <Button type="link" danger size="small">
            استرداد
          </Button>
        </Link>
      ),
    },
  ];

  if (loading) {
    return (
      <div style={{ padding: 24 }}>
        <LoadingSkeleton type="table" rows={6} />
      </div>
    );
  }

  return (
    <div style={{ padding: 24 }}>
      <PageHeader
        title="إدارة العهد"
        subtitle="تتبع الأجهزة والمعدات المسلمة للموظفين"
        breadcrumbs={[{ title: "إدارة العهد" }]}
        extra={
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => navigate("/custody/assign")}
          >
            تسليم عهدة جديدة
          </Button>
        }
      />

      {/* Stats */}
      {stats && (
        <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
          <Col xs={24} sm={12} md={6}>
            <Card style={{ background: "linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)" }}>
              <Statistic
                title={<span style={{ color: "rgba(255,255,255,0.8)" }}>إجمالي العهد</span>}
                value={stats.totalCustody}
                valueStyle={{ color: "#fff", fontWeight: 700 }}
                prefix={<InboxOutlined style={{ marginLeft: 8 }} />}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Card style={{ background: "linear-gradient(135deg, #10b981 0%, #059669 100%)" }}>
              <Statistic
                title={<span style={{ color: "rgba(255,255,255,0.8)" }}>موظف لديه عهدة</span>}
                value={stats.employeesWithCustody}
                valueStyle={{ color: "#fff", fontWeight: 700 }}
                prefix={<TeamOutlined style={{ marginLeft: 8 }} />}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Card style={{ background: "linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)" }}>
              <Statistic
                title={<span style={{ color: "rgba(255,255,255,0.8)" }}>حركات اليوم</span>}
                value={stats.todayMovements}
                valueStyle={{ color: "#fff", fontWeight: 700 }}
                prefix={<SwapOutlined style={{ marginLeft: 8 }} />}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Card style={{ background: "linear-gradient(135deg, #f97316 0%, #ea580c 100%)" }}>
              <Statistic
                title={<span style={{ color: "rgba(255,255,255,0.8)" }}>أكثر منتج</span>}
                value={stats.topProducts[0]?.productName || "-"}
                valueStyle={{ color: "#fff", fontWeight: 700, fontSize: 18 }}
                prefix={<RiseOutlined style={{ marginLeft: 8 }} />}
              />
            </Card>
          </Col>
        </Row>
      )}

      {/* Tabs & Search */}
      <Card>
        <div style={{ marginBottom: 16, display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 16 }}>
          <Segmented
            value={view}
            onChange={(val) => setView(val as string)}
            options={[
              { label: "عرض قائمة", value: "list", icon: <AppstoreOutlined /> },
              { label: "حسب الموظف", value: "by-employee", icon: <TeamOutlined /> },
            ]}
          />

          {view === "list" && (
            <Input
              placeholder="بحث (سيريال، منتج، موظف)..."
              prefix={<SearchOutlined />}
              value={searchSerial}
              onChange={(e) => setSearchSerial(e.target.value)}
              style={{ width: 300 }}
              allowClear
            />
          )}
        </div>

        {/* List View */}
        {view === "list" && (
          <Table
            columns={columns}
            dataSource={filteredItems}
            rowKey="id"
            loading={loading}
            locale={{
              emptyText: <Empty description="لا توجد عهد حالية" />,
            }}
            pagination={{
              showSizeChanger: true,
              showTotal: (total, range) => `${range[0]}-${range[1]} من ${total}`,
              pageSize: 20,
            }}
          />
        )}

        {/* By Employee View */}
        {view === "by-employee" && (
          <Row gutter={[16, 16]}>
            {summary.length === 0 ? (
              <Col span={24}>
                <Empty description="لا توجد عهد حالية" />
              </Col>
            ) : (
              summary.map((emp) => (
                <Col xs={24} sm={12} md={8} key={emp.userId}>
                  <Card
                    hoverable
                    onClick={() => navigate(`/custody/employee/${emp.userId}`)}
                    styles={{ body: { padding: 16 } }}
                  >
                    <Space align="center" style={{ width: "100%" }}>
                      <Avatar
                        size={48}
                        style={{ background: "#e6f7ff", color: "#1890ff" }}
                      >
                        {emp.userName?.charAt(0) || "?"}
                      </Avatar>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 500 }}>{emp.userName}</div>
                        <Text type="secondary">{emp.itemCount} عهدة</Text>
                      </div>
                    </Space>
                  </Card>
                </Col>
              ))
            )}
          </Row>
        )}
      </Card>

      {/* Top Products in Custody */}
      {stats && stats.topProducts.length > 0 && (
        <Card title="أكثر المنتجات في العهد" style={{ marginTop: 24 }}>
          <Space direction="vertical" style={{ width: "100%" }} size="middle">
            {stats.topProducts.map((product, index) => (
              <div key={product.productId}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                  <Space>
                    <Text type="secondary">{index + 1}</Text>
                    <Text strong>{product.productName}</Text>
                  </Space>
                  <Text>{product.count}</Text>
                </div>
                <Progress
                  percent={(product.count / stats.topProducts[0].count) * 100}
                  showInfo={false}
                  strokeColor="#1890ff"
                  size="small"
                />
              </div>
            ))}
          </Space>
        </Card>
      )}
    </div>
  );
}
