/**
 * صفحة قائمة العقود
 */
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
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
  Empty,
  Alert,
} from "antd";
import { Statistic } from "antd";
import type { ColumnsType } from "antd/es/table";
import {
  PlusOutlined,
  SearchOutlined,
  FileTextOutlined,
  WarningOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  DollarOutlined,
  CalendarOutlined,
  SyncOutlined,
} from "@ant-design/icons";
import { PageHeader, StatusTag, MoneyDisplay, DateDisplay, LoadingSkeleton } from "../components/shared";
import { API_BASE, getAuthHeaders } from "../utils/api";

interface Contract {
  id: string;
  contractNumber: string;
  customerName: string;
  contractTypeName: string | null;
  startDate: string;
  endDate: string;
  status: string;
  totalValue: string;
  billingType: string;
  autoRenew: boolean;
}

interface Stats {
  activeContracts: number;
  expiringContracts: number;
  expiredContracts: number;
  totalActiveValue: number;
  pendingServices: number;
}

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  draft: { label: "مسودة", color: "default" },
  pending_approval: { label: "بانتظار الموافقة", color: "warning" },
  active: { label: "نشط", color: "success" },
  suspended: { label: "معلق", color: "error" },
  expired: { label: "منتهي", color: "default" },
  terminated: { label: "ملغي", color: "error" },
  renewed: { label: "تم التجديد", color: "processing" },
};

const BILLING_LABELS: Record<string, string> = {
  monthly: "شهري",
  quarterly: "ربع سنوي",
  yearly: "سنوي",
  one_time: "دفعة واحدة",
};

export default function ContractsList() {
  const navigate = useNavigate();
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [expiringContracts, setExpiringContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");

  useEffect(() => {
    loadData();
  }, [statusFilter, search]);

  const loadData = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== "all") params.append("status", statusFilter);
      if (search) params.append("search", search);

      const [contractsRes, statsRes, expiringRes] = await Promise.all([
        fetch(`${API_BASE}/api/contracts?${params}`, { headers: getAuthHeaders() }),
        fetch(`${API_BASE}/api/contracts/stats`, { headers: getAuthHeaders() }),
        fetch(`${API_BASE}/api/contracts/expiring?days=30`, { headers: getAuthHeaders() }),
      ]);

      if (contractsRes.ok) setContracts((await contractsRes.json()).contracts || []);
      if (statsRes.ok) setStats(await statsRes.json());
      if (expiringRes.ok) setExpiringContracts(await expiringRes.json());
    } catch (error) {
      console.error(error);
      message.error("فشل في تحميل البيانات");
    } finally {
      setLoading(false);
    }
  };

  const getDaysRemaining = (endDate: string) => {
    const end = new Date(endDate);
    const now = new Date();
    const days = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return days;
  };

  const columns: ColumnsType<Contract> = [
    {
      title: "رقم العقد",
      dataIndex: "contractNumber",
      key: "contractNumber",
      width: 130,
      render: (text) => (
        <span style={{ fontFamily: "monospace", fontWeight: 600 }}>{text}</span>
      ),
    },
    {
      title: "العميل",
      dataIndex: "customerName",
      key: "customerName",
      render: (text) => <span style={{ fontWeight: 500 }}>{text}</span>,
    },
    {
      title: "النوع",
      dataIndex: "contractTypeName",
      key: "contractTypeName",
      width: 120,
      render: (text) => text || "-",
    },
    {
      title: "الفترة",
      key: "period",
      width: 160,
      render: (_, record) => (
        <div style={{ fontSize: 13 }}>
          <div><DateDisplay date={record.startDate} /></div>
          <div style={{ color: "#6b7280" }}>
            إلى <DateDisplay date={record.endDate} />
          </div>
        </div>
      ),
    },
    {
      title: "القيمة",
      key: "value",
      width: 150,
      render: (_, record) => (
        <div>
          <div style={{ fontWeight: 600 }}>
            <MoneyDisplay amount={Number(record.totalValue)} />
          </div>
          <div style={{ fontSize: 12, color: "#6b7280" }}>
            {BILLING_LABELS[record.billingType] || record.billingType}
          </div>
        </div>
      ),
    },
    {
      title: "الحالة",
      dataIndex: "status",
      key: "status",
      width: 140,
      render: (status: string, record) => {
        const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.draft;
        const daysRemaining = getDaysRemaining(record.endDate);
        const isExpiringSoon = status === "active" && daysRemaining <= 30 && daysRemaining > 0;

        return (
          <div>
            <StatusTag status={status} customLabel={cfg.label} />
            {isExpiringSoon && (
              <div style={{ marginTop: 4 }}>
                <Tag color="warning" icon={<ClockCircleOutlined />}>
                  {daysRemaining} يوم
                </Tag>
              </div>
            )}
            {record.autoRenew && (
              <div style={{ marginTop: 4 }}>
                <Tag color="green" icon={<SyncOutlined />}>
                  تجديد تلقائي
                </Tag>
              </div>
            )}
          </div>
        );
      },
    },
    {
      title: "الإجراءات",
      key: "actions",
      width: 80,
      render: (_, record) => (
        <Button
          type="link"
          size="small"
          onClick={(e) => {
            e.stopPropagation();
            navigate(`/contracts/${record.id}`);
          }}
        >
          عرض
        </Button>
      ),
    },
  ];

  if (loading && !stats) {
    return (
      <div>
        <PageHeader
          title="العقود"
          subtitle="إدارة عقود الخدمات والصيانة"
          breadcrumbs={[{ title: "العقود" }]}
        />
        <LoadingSkeleton type="table" rows={6} />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="العقود"
        subtitle="إدارة عقود الخدمات والصيانة"
        breadcrumbs={[{ title: "العقود" }]}
        extra={
          <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate("/contracts/new")}>
            عقد جديد
          </Button>
        }
      />

      {/* Stats Cards */}
      {stats && (
        <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
          <Col xs={24} sm={12} md={4} lg={4}>
            <Card>
              <Statistic
                title="عقود نشطة"
                value={stats.activeContracts}
                valueStyle={{ color: "#059669" }}
                prefix={<CheckCircleOutlined />}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={5} lg={5}>
            <Card>
              <Statistic
                title="تنتهي قريباً"
                value={stats.expiringContracts}
                valueStyle={{ color: "#d97706" }}
                prefix={<WarningOutlined />}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={4} lg={4}>
            <Card>
              <Statistic
                title="منتهية"
                value={stats.expiredContracts}
                valueStyle={{ color: "#9ca3af" }}
                prefix={<CalendarOutlined />}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={6} lg={6}>
            <Card>
              <Statistic
                title="قيمة العقود النشطة"
                value={stats.totalActiveValue || 0}
                valueStyle={{ color: "#2563eb", fontSize: 18 }}
                prefix={<DollarOutlined />}
                suffix="د.ع"
                formatter={(value) => Number(value).toLocaleString("ar-IQ")}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={5} lg={5}>
            <Card>
              <Statistic
                title="خدمات مجدولة"
                value={stats.pendingServices}
                valueStyle={{ color: "#7c3aed" }}
                prefix={<FileTextOutlined />}
              />
            </Card>
          </Col>
        </Row>
      )}

      {/* Expiring Contracts Alert */}
      {expiringContracts.length > 0 && (
        <Alert
          type="warning"
          showIcon
          icon={<WarningOutlined />}
          message="عقود تنتهي خلال 30 يوم"
          description={
            <Space wrap style={{ marginTop: 8 }}>
              {expiringContracts.slice(0, 5).map((c) => (
                <Button
                  key={c.id}
                  size="small"
                  onClick={() => navigate(`/contracts/${c.id}`)}
                >
                  {c.customerName}
                  <Tag color="orange" style={{ marginRight: 8 }}>
                    {getDaysRemaining(c.endDate)} يوم
                  </Tag>
                </Button>
              ))}
              {expiringContracts.length > 5 && (
                <Tag color="default">+{expiringContracts.length - 5} عقود أخرى</Tag>
              )}
            </Space>
          }
          style={{ marginBottom: 24 }}
        />
      )}

      {/* Filters */}
      <Card style={{ marginBottom: 16 }}>
        <Row gutter={[16, 16]} align="middle">
          <Col flex="auto">
            <Input
              placeholder="بحث برقم العقد أو اسم العميل..."
              prefix={<SearchOutlined />}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              allowClear
            />
          </Col>
          <Col>
            <Select
              value={statusFilter}
              onChange={setStatusFilter}
              style={{ width: 150 }}
              placeholder="الحالة"
            >
              <Select.Option value="all">كل الحالات</Select.Option>
              <Select.Option value="active">نشط</Select.Option>
              <Select.Option value="draft">مسودة</Select.Option>
              <Select.Option value="expired">منتهي</Select.Option>
              <Select.Option value="suspended">معلق</Select.Option>
            </Select>
          </Col>
        </Row>
      </Card>

      {/* Contracts Table */}
      <Card styles={{ body: { padding: 0 } }}>
        <Table
          columns={columns}
          dataSource={contracts}
          rowKey="id"
          loading={loading}
          onRow={(record) => ({
            onClick: () => navigate(`/contracts/${record.id}`),
            style: { cursor: "pointer" },
          })}
          pagination={{
            showSizeChanger: true,
            showTotal: (total, range) => `${range[0]}-${range[1]} من ${total}`,
            pageSize: 20,
          }}
          locale={{
            emptyText: (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description="لا توجد عقود"
              >
                <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate("/contracts/new")}>
                  إضافة عقد جديد
                </Button>
              </Empty>
            ),
          }}
        />
      </Card>
    </div>
  );
}
