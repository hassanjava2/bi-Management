/**
 * صفحة قائمة عروض الأسعار
 */
import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
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
  Pagination,
  Popconfirm,
} from "antd";
import { Statistic } from "antd";
import type { ColumnsType } from "antd/es/table";
import {
  PlusOutlined,
  SearchOutlined,
  FileTextOutlined,
  EyeOutlined,
  FileDoneOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  PercentageOutlined,
  DollarOutlined,
} from "@ant-design/icons";
import { PageHeader, StatusTag, MoneyDisplay, DateDisplay, LoadingSkeleton } from "../components/shared";
import { API_BASE, getAuthHeaders } from "../utils/api";

interface Quotation {
  id: string;
  quotationNumber: string;
  customerName: string | null;
  status: string;
  totalAmount: string;
  validUntil: string | null;
  createdAt: string;
  convertedToInvoice: boolean;
  customer: { id: string; fullName: string } | null;
}

interface Stats {
  byStatus: Record<string, { count: number; value: number }>;
  monthly: { count: number; totalValue: number; accepted: number; converted: number };
  conversionRate: number;
}

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  draft: { label: "مسودة", color: "default" },
  sent: { label: "مُرسل", color: "processing" },
  viewed: { label: "تمت المشاهدة", color: "purple" },
  accepted: { label: "مقبول", color: "success" },
  rejected: { label: "مرفوض", color: "error" },
  expired: { label: "منتهي", color: "default" },
  converted: { label: "تم التحويل", color: "cyan" },
};

export default function QuotationsList() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, total: 0, totalPages: 0 });

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
      params.set("page", searchParams.get("page") || "1");

      const [quotsRes, statsRes] = await Promise.all([
        fetch(`${API_BASE}/api/quotations?${params}`, {
          headers: getAuthHeaders(),
        }),
        fetch(`${API_BASE}/api/quotations/stats`, {
          headers: getAuthHeaders(),
        }),
      ]);

      if (quotsRes.ok) {
        const data = await quotsRes.json();
        setQuotations(data.quotations || []);
        setPagination(data.pagination || { page: 1, total: 0, totalPages: 0 });
      }

      if (statsRes.ok) {
        setStats(await statsRes.json());
      }
    } catch (error) {
      console.error("Error:", error);
      message.error("فشل في تحميل البيانات");
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

  const isExpired = (validUntil: string | null) => {
    if (!validUntil) return false;
    return new Date(validUntil) < new Date();
  };

  const handleConvertToInvoice = async (quotId: string) => {
    try {
      const res = await fetch(`${API_BASE}/api/quotations/${quotId}/convert`, {
        method: "POST",
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        const data = await res.json();
        message.success("تم تحويل العرض إلى فاتورة");
        navigate(`/invoices/${data.invoiceId}`);
      } else {
        message.error("فشل في تحويل العرض");
      }
    } catch (error) {
      console.error(error);
      message.error("حدث خطأ أثناء التحويل");
    }
  };

  const columns: ColumnsType<Quotation> = [
    {
      title: "رقم العرض",
      dataIndex: "quotationNumber",
      key: "quotationNumber",
      width: 130,
      render: (text) => (
        <span style={{ fontFamily: "monospace", fontWeight: 500 }}>{text}</span>
      ),
    },
    {
      title: "العميل",
      key: "customer",
      render: (_, record) => record.customer?.fullName || record.customerName || "-",
    },
    {
      title: "المبلغ",
      dataIndex: "totalAmount",
      key: "totalAmount",
      width: 150,
      render: (amount) => (
        <span style={{ fontWeight: 600 }}>
          <MoneyDisplay amount={Number(amount || 0)} />
        </span>
      ),
    },
    {
      title: "الحالة",
      dataIndex: "status",
      key: "status",
      width: 140,
      render: (status: string, record) => {
        const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.draft;
        const expired = isExpired(record.validUntil) && !["accepted", "converted", "rejected"].includes(status);

        return (
          <Space direction="vertical" size={4}>
            <StatusTag status={status} customLabel={cfg.label} />
            {expired && <Tag color="error">منتهي</Tag>}
          </Space>
        );
      },
    },
    {
      title: "صالح حتى",
      dataIndex: "validUntil",
      key: "validUntil",
      width: 120,
      render: (date: string | null, record) => {
        const expired = isExpired(date) && !["accepted", "converted", "rejected"].includes(record.status);
        return (
          <span style={{ color: expired ? "#dc2626" : "#6b7280" }}>
            <DateDisplay date={date} fallback="-" />
          </span>
        );
      },
    },
    {
      title: "التاريخ",
      dataIndex: "createdAt",
      key: "createdAt",
      width: 120,
      render: (date) => (
        <span style={{ color: "#6b7280" }}>
          <DateDisplay date={date} />
        </span>
      ),
    },
    {
      title: "الإجراءات",
      key: "actions",
      width: 150,
      render: (_, record) => (
        <Space onClick={(e) => e.stopPropagation()}>
          <Button
            type="link"
            size="small"
            icon={<EyeOutlined />}
            onClick={() => navigate(`/quotations/${record.id}`)}
          >
            عرض
          </Button>
          {!record.convertedToInvoice && record.status === "accepted" && (
            <Popconfirm
              title="تحويل إلى فاتورة"
              description="هل تريد تحويل هذا العرض إلى فاتورة؟"
              onConfirm={() => handleConvertToInvoice(record.id)}
              okText="تحويل"
              cancelText="إلغاء"
            >
              <Button type="primary" size="small" icon={<FileDoneOutlined />}>
                فاتورة
              </Button>
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  if (loading && !stats) {
    return (
      <div>
        <PageHeader
          title="عروض الأسعار"
          subtitle="إدارة ومتابعة عروض الأسعار للعملاء"
          breadcrumbs={[{ title: "عروض الأسعار" }]}
        />
        <LoadingSkeleton type="table" rows={6} />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="عروض الأسعار"
        subtitle="إدارة ومتابعة عروض الأسعار للعملاء"
        breadcrumbs={[{ title: "عروض الأسعار" }]}
        extra={
          <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate("/quotations/new")}>
            عرض سعر جديد
          </Button>
        }
      />

      {/* Stats Cards */}
      {stats && (
        <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
          <Col xs={24} sm={12} md={4} lg={4}>
            <Card>
              <Statistic
                title="هذا الشهر"
                value={stats.monthly.count}
                valueStyle={{ color: "#374151" }}
                prefix={<FileTextOutlined />}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={5} lg={5}>
            <Card>
              <Statistic
                title="قيمة العروض"
                value={stats.monthly.totalValue}
                valueStyle={{ color: "#059669", fontSize: 18 }}
                prefix={<DollarOutlined />}
                suffix="د.ع"
                formatter={(value) => Number(value).toLocaleString("ar-IQ")}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={5} lg={5}>
            <Card>
              <Statistic
                title="بانتظار الرد"
                value={stats.byStatus.sent?.count || 0}
                valueStyle={{ color: "#2563eb" }}
                prefix={<ClockCircleOutlined />}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={5} lg={5}>
            <Card>
              <Statistic
                title="مقبولة"
                value={stats.monthly.accepted}
                valueStyle={{ color: "#059669" }}
                prefix={<CheckCircleOutlined />}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={5} lg={5}>
            <Card>
              <Statistic
                title="معدل التحويل"
                value={stats.conversionRate}
                valueStyle={{ color: "#7c3aed" }}
                prefix={<PercentageOutlined />}
                suffix="%"
              />
            </Card>
          </Col>
        </Row>
      )}

      {/* Filters */}
      <Card style={{ marginBottom: 16 }}>
        <Row gutter={[16, 16]} align="middle">
          <Col flex="auto">
            <Input
              placeholder="بحث برقم العرض أو اسم العميل..."
              prefix={<SearchOutlined />}
              value={filters.search}
              onChange={(e) => handleFilter("search", e.target.value)}
              allowClear
            />
          </Col>
          <Col>
            <Select
              value={filters.status}
              onChange={(value) => handleFilter("status", value)}
              style={{ width: 150 }}
              placeholder="الحالة"
              allowClear
            >
              <Select.Option value="">كل الحالات</Select.Option>
              {Object.entries(STATUS_CONFIG).map(([value, config]) => (
                <Select.Option key={value} value={value}>
                  {config.label}
                </Select.Option>
              ))}
            </Select>
          </Col>
        </Row>
      </Card>

      {/* Quotations Table */}
      <Card styles={{ body: { padding: 0 } }}>
        <Table
          columns={columns}
          dataSource={quotations}
          rowKey="id"
          loading={loading}
          onRow={(record) => ({
            onClick: () => navigate(`/quotations/${record.id}`),
            style: { cursor: "pointer" },
          })}
          pagination={false}
          locale={{
            emptyText: (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description={
                  <div>
                    <div style={{ fontWeight: 600, marginBottom: 4 }}>لا توجد عروض أسعار</div>
                    <div style={{ color: "#666" }}>ابدأ بإنشاء أول عرض سعر</div>
                  </div>
                }
              >
                <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate("/quotations/new")}>
                  إنشاء عرض سعر
                </Button>
              </Empty>
            ),
          }}
        />

        {/* Custom Pagination */}
        {pagination.totalPages > 1 && (
          <div style={{ padding: 16, display: "flex", justifyContent: "center" }}>
            <Pagination
              current={pagination.page}
              total={pagination.total}
              pageSize={20}
              onChange={(page) => {
                const params = new URLSearchParams(searchParams);
                params.set("page", String(page));
                setSearchParams(params);
              }}
              showTotal={(total, range) => `${range[0]}-${range[1]} من ${total}`}
              showSizeChanger={false}
            />
          </div>
        )}
      </Card>
    </div>
  );
}
