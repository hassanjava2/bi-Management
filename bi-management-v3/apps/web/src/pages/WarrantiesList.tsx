/**
 * صفحة قائمة الضمانات
 */
import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Row, Col, Card, Table, Button, Input, Select, Tag, Space, Statistic, Empty, Alert } from "antd";
import { PlusOutlined, SearchOutlined, SafetyCertificateOutlined, WarningOutlined, ClockCircleOutlined, StopOutlined, CheckCircleOutlined } from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";
import { PageHeader, DateDisplay, LoadingSkeleton } from "../components/shared";
import { API_BASE, getAuthHeaders } from "../utils/api";

interface Warranty {
  id: string;
  warrantyNumber: string;
  serialNumber: string | null;
  customerName: string | null;
  status: string;
  startDate: string;
  endDate: string;
  claimsCount: number;
  product: { id: string; nameAr: string } | null;
  customer: { id: string; fullName: string } | null;
}

interface Stats {
  byStatus: Record<string, number>;
  expiringSoon: number;
  pendingClaims: number;
}

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  active: { label: "ساري", color: "green" },
  expired: { label: "منتهي", color: "default" },
  voided: { label: "ملغي", color: "red" },
  claimed: { label: "مطالب", color: "orange" },
};

export default function WarrantiesList() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [warranties, setWarranties] = useState<Warranty[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [checkSerial, setCheckSerial] = useState("");
  const [checkResult, setCheckResult] = useState<any>(null);
  const [checkLoading, setCheckLoading] = useState(false);

  const [filters, setFilters] = useState({
    status: searchParams.get("status") || "",
    search: searchParams.get("search") || "",
  });

  useEffect(() => {
    loadData();
  }, [searchParams]);

  const loadData = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.status) params.set("status", filters.status);
      if (filters.search) params.set("search", filters.search);

      const [warrantiesRes, statsRes] = await Promise.all([
        fetch(`${API_BASE}/api/warranties?${params}`),
        fetch(`${API_BASE}/api/warranties/stats`),
      ]);

      if (warrantiesRes.ok) {
        const data = await warrantiesRes.json();
        setWarranties(data.warranties || []);
      }
      if (statsRes.ok) setStats(await statsRes.json());
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleFilter = (key: string, value: string) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    const params = new URLSearchParams();
    if (newFilters.status) params.set("status", newFilters.status);
    if (newFilters.search) params.set("search", newFilters.search);
    setSearchParams(params);
  };

  const checkWarranty = async () => {
    if (!checkSerial.trim()) return;
    setCheckLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/warranties/check/${encodeURIComponent(checkSerial)}`);
      if (res.ok) setCheckResult(await res.json());
    } catch (error) {
      console.error(error);
    } finally {
      setCheckLoading(false);
    }
  };

  const getDaysRemaining = (endDate: string) => {
    const days = Math.ceil((new Date(endDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    return days;
  };

  const columns: ColumnsType<Warranty> = [
    {
      title: "رقم الضمان",
      dataIndex: "warrantyNumber",
      key: "warrantyNumber",
      render: (text: string) => (
        <span style={{ fontFamily: "monospace", fontWeight: 500 }}>{text}</span>
      ),
    },
    {
      title: "المنتج",
      key: "product",
      render: (_: any, record: Warranty) => record.product?.nameAr || "-",
    },
    {
      title: "السيريال",
      dataIndex: "serialNumber",
      key: "serialNumber",
      render: (text: string) => (
        <span style={{ fontFamily: "monospace" }}>{text || "-"}</span>
      ),
    },
    {
      title: "العميل",
      key: "customer",
      render: (_: any, record: Warranty) => 
        record.customer?.fullName || record.customerName || "-",
    },
    {
      title: "الحالة",
      key: "status",
      render: (_: any, record: Warranty) => {
        const config = STATUS_CONFIG[record.status] || STATUS_CONFIG.active;
        const days = getDaysRemaining(record.endDate);
        const isExpiringSoon = record.status === "active" && days <= 30 && days > 0;
        
        return (
          <Space>
            <Tag color={config.color}>{config.label}</Tag>
            {isExpiringSoon && (
              <Tag color="warning">{days} يوم</Tag>
            )}
          </Space>
        );
      },
    },
    {
      title: "تاريخ الانتهاء",
      dataIndex: "endDate",
      key: "endDate",
      render: (date: string) => {
        const days = getDaysRemaining(date);
        return (
          <span style={{ color: days < 0 ? "#ff4d4f" : undefined }}>
            <DateDisplay date={date} format="DD/MM/YYYY" />
          </span>
        );
      },
    },
    {
      title: "المطالبات",
      dataIndex: "claimsCount",
      key: "claimsCount",
      align: "center",
      render: (count: number) => (
        <Tag color={count > 0 ? "blue" : "default"}>{count}</Tag>
      ),
    },
  ];

  if (loading && !warranties.length) {
    return <LoadingSkeleton />;
  }

  return (
    <div>
      <PageHeader
        title="الضمانات"
        subtitle="إدارة ومتابعة ضمانات المنتجات"
        breadcrumbs={[
          { label: "الرئيسية", path: "/" },
          { label: "الضمانات" },
        ]}
        extra={
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => navigate("/warranties/register")}
          >
            تسجيل ضمان
          </Button>
        }
      />

      {/* التحقق السريع */}
      <Card style={{ marginBottom: 24 }}>
        <h3 style={{ marginBottom: 16 }}>
          <SearchOutlined style={{ marginInlineEnd: 8 }} />
          التحقق من الضمان
        </h3>
        <Space.Compact style={{ width: "100%", maxWidth: 500 }}>
          <Input
            placeholder="أدخل السيريال نمبر..."
            value={checkSerial}
            onChange={(e) => { setCheckSerial(e.target.value); setCheckResult(null); }}
            onPressEnter={checkWarranty}
            style={{ flex: 1 }}
          />
          <Button type="primary" onClick={checkWarranty} loading={checkLoading}>
            تحقق
          </Button>
        </Space.Compact>

        {checkResult && (
          <div style={{ marginTop: 16 }}>
            {checkResult.found ? (
              <Alert
                type={checkResult.isValid ? "success" : "error"}
                showIcon
                icon={checkResult.isValid ? <CheckCircleOutlined /> : <StopOutlined />}
                message={checkResult.isValid ? "الضمان ساري" : "الضمان منتهي"}
                description={
                  <div>
                    <div>المنتج: {checkResult.warranty.productName}</div>
                    <div>رقم الضمان: {checkResult.warranty.warrantyNumber}</div>
                    <div>تاريخ الانتهاء: {new Date(checkResult.warranty.endDate).toLocaleDateString("ar-IQ")}</div>
                    {checkResult.isValid && <div>متبقي: {checkResult.warranty.daysRemaining} يوم</div>}
                  </div>
                }
              />
            ) : (
              <Alert
                type="error"
                showIcon
                message="لا يوجد ضمان مسجل لهذا الجهاز"
              />
            )}
          </div>
        )}
      </Card>

      {/* إحصائيات */}
      {stats && (
        <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
          <Col xs={24} sm={12} md={6}>
            <Card>
              <Statistic
                title="ضمانات سارية"
                value={stats.byStatus.active || 0}
                valueStyle={{ color: "#52c41a" }}
                prefix={<SafetyCertificateOutlined />}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Card>
              <Statistic
                title="تنتهي خلال 30 يوم"
                value={stats.expiringSoon}
                valueStyle={{ color: "#fa8c16" }}
                prefix={<WarningOutlined />}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Card>
              <Statistic
                title="مطالبات معلقة"
                value={stats.pendingClaims}
                valueStyle={{ color: "#1890ff" }}
                prefix={<ClockCircleOutlined />}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Card>
              <Statistic
                title="منتهية"
                value={stats.byStatus.expired || 0}
                valueStyle={{ color: "#8c8c8c" }}
                prefix={<StopOutlined />}
              />
            </Card>
          </Col>
        </Row>
      )}

      {/* الفلاتر */}
      <Card style={{ marginBottom: 16 }}>
        <Space wrap size="middle">
          <Input
            placeholder="بحث برقم الضمان أو السيريال..."
            prefix={<SearchOutlined />}
            value={filters.search}
            onChange={(e) => handleFilter("search", e.target.value)}
            style={{ width: 280 }}
            allowClear
          />
          <Select
            placeholder="كل الحالات"
            value={filters.status || undefined}
            onChange={(value) => handleFilter("status", value || "")}
            style={{ width: 160 }}
            allowClear
          >
            {Object.entries(STATUS_CONFIG).map(([key, val]) => (
              <Select.Option key={key} value={key}>{val.label}</Select.Option>
            ))}
          </Select>
        </Space>
      </Card>

      {/* جدول الضمانات */}
      <Card>
        <Table
          columns={columns}
          dataSource={warranties}
          rowKey="id"
          loading={loading}
          onRow={(record) => ({
            onClick: () => navigate(`/warranties/${record.id}`),
            style: { cursor: "pointer" },
          })}
          pagination={{
            pageSize: 20,
            showSizeChanger: false,
            showTotal: (total) => `إجمالي ${total} ضمان`,
          }}
          locale={{
            emptyText: (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description="لا توجد ضمانات"
              />
            ),
          }}
        />
      </Card>
    </div>
  );
}
