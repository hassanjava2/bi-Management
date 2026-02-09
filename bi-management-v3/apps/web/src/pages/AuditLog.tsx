/**
 * صفحة سجل التدقيق
 */
import { useState, useEffect } from "react";
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
  Empty,
  Modal,
  DatePicker,
  Descriptions,
  Timeline,
  Typography,
  Tabs,
} from "antd";
import {
  DownloadOutlined,
  ClockCircleOutlined,
  BarChartOutlined,
  WarningOutlined,
  ExclamationCircleOutlined,
  EyeOutlined,
  SearchOutlined,
  ReloadOutlined,
  UserOutlined,
  SettingOutlined,
  ShoppingOutlined,
  LoginOutlined,
  FileTextOutlined,
} from "@ant-design/icons";
import { PageHeader, LoadingSkeleton } from "../components/shared";
import { API_BASE, getAuthHeaders } from "../utils/api";
import dayjs from "dayjs";

const { Text, Title } = Typography;
const { RangePicker } = DatePicker;

interface AuditEntry {
  id: string;
  eventType: string;
  eventCategory: string;
  severity: string;
  userId: string | null;
  userName: string | null;
  userRole: string | null;
  ipAddress: string | null;
  entityType: string | null;
  entityId: string | null;
  entityName: string | null;
  action: string | null;
  module: string | null;
  createdAt: string;
  oldValue?: any;
  newValue?: any;
  changes?: any;
  metadata?: any;
  userAgent?: string;
}

interface Stats {
  todayCount: number;
  weekCount: number;
  byCategory: { category: string; count: number }[];
  bySeverity: { severity: string; count: number }[];
  topUsers: { userId: string; userName: string; count: number }[];
  criticalEvents: any[];
}

interface Category {
  id: string;
  label: string;
  icon: string;
}

const SEVERITY_CONFIG: Record<string, { label: string; color: string }> = {
  info: { label: "معلومات", color: "blue" },
  warning: { label: "تحذير", color: "gold" },
  critical: { label: "حرج", color: "red" },
};

const EVENT_LABELS: Record<string, string> = {
  LOGIN_SUCCESS: "تسجيل دخول ناجح",
  LOGIN_FAILED: "فشل تسجيل الدخول",
  LOGOUT: "تسجيل خروج",
  USER_CREATED: "إنشاء مستخدم",
  USER_UPDATED: "تحديث مستخدم",
  USER_DELETED: "حذف مستخدم",
  PRODUCT_CREATED: "إنشاء منتج",
  PRODUCT_UPDATED: "تحديث منتج",
  SERIAL_CREATED: "إنشاء سيريال",
  PURCHASE_CREATED: "إنشاء طلب شراء",
  INVOICE_CREATED: "إنشاء فاتورة",
  SETTINGS_CHANGED: "تغيير إعدادات",
};

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  auth: <LoginOutlined />,
  user: <UserOutlined />,
  product: <ShoppingOutlined />,
  invoice: <FileTextOutlined />,
  settings: <SettingOutlined />,
};

export default function AuditLog() {
  const [logs, setLogs] = useState<AuditEntry[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [viewMode, setViewMode] = useState<"table" | "timeline">("table");

  // Filters
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [selectedSeverity, setSelectedSeverity] = useState<string>("");
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs, dayjs.Dayjs] | null>(null);
  const [search, setSearch] = useState<string>("");

  // Detail modal
  const [selectedLog, setSelectedLog] = useState<AuditEntry | null>(null);

  useEffect(() => {
    loadCategories();
    loadStats();
  }, []);

  useEffect(() => {
    loadLogs();
  }, [page, selectedCategory, selectedSeverity, dateRange, search]);

  const loadCategories = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/audit/categories`, {
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        setCategories(await res.json());
      }
    } catch (error) {
      console.error("Load categories error:", error);
    }
  };

  const loadStats = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/audit/stats/summary`, {
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        setStats(await res.json());
      }
    } catch (error) {
      console.error("Load stats error:", error);
    }
  };

  const loadLogs = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("limit", "50");
      if (selectedCategory) params.set("category", selectedCategory);
      if (selectedSeverity) params.set("severity", selectedSeverity);
      if (dateRange) {
        params.set("dateFrom", dateRange[0].format("YYYY-MM-DD"));
        params.set("dateTo", dateRange[1].format("YYYY-MM-DD"));
      }
      if (search) params.set("search", search);

      const res = await fetch(`${API_BASE}/api/audit?${params.toString()}`, {
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        const data = await res.json();
        setLogs(data.data);
        setTotalPages(data.pagination.totalPages);
        setTotal(data.pagination.total);
      }
    } catch (error) {
      console.error("Load logs error:", error);
      message.error("فشل في تحميل السجلات");
    } finally {
      setLoading(false);
    }
  };

  const loadLogDetail = async (id: string) => {
    try {
      const res = await fetch(`${API_BASE}/api/audit/${id}`, {
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        setSelectedLog(await res.json());
      }
    } catch (error) {
      console.error("Load detail error:", error);
      message.error("فشل في تحميل التفاصيل");
    }
  };

  const exportLogs = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/audit/export`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          dateFrom: dateRange?.[0]?.format("YYYY-MM-DD"),
          dateTo: dateRange?.[1]?.format("YYYY-MM-DD"),
          category: selectedCategory,
          format: "csv",
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const blob = new Blob([atob(data.data)], {
          type: "text/csv;charset=utf-8;",
        });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = data.filename;
        link.click();
        URL.revokeObjectURL(url);
        message.success("تم تصدير السجلات بنجاح");
      }
    } catch (error) {
      console.error("Export error:", error);
      message.error("فشل في تصدير السجلات");
    }
  };

  const getCategoryIcon = (categoryId: string) => {
    return CATEGORY_ICONS[categoryId] || <FileTextOutlined />;
  };

  const getCategoryLabel = (categoryId: string) => {
    return categories.find((c) => c.id === categoryId)?.label || categoryId;
  };

  const resetFilters = () => {
    setSelectedCategory("");
    setSelectedSeverity("");
    setDateRange(null);
    setSearch("");
    setPage(1);
  };

  const columns = [
    {
      title: "التاريخ",
      dataIndex: "createdAt",
      key: "createdAt",
      width: 160,
      render: (date: string) => (
        <Text type="secondary" style={{ fontSize: 13 }}>
          {new Date(date).toLocaleString("ar-IQ")}
        </Text>
      ),
    },
    {
      title: "الفئة",
      dataIndex: "eventCategory",
      key: "eventCategory",
      width: 130,
      render: (category: string) => (
        <Space>
          {getCategoryIcon(category)}
          <span>{getCategoryLabel(category)}</span>
        </Space>
      ),
    },
    {
      title: "الحدث",
      dataIndex: "eventType",
      key: "eventType",
      render: (type: string) => EVENT_LABELS[type] || type,
    },
    {
      title: "المستخدم",
      dataIndex: "userName",
      key: "userName",
      render: (name: string) => name || "-",
    },
    {
      title: "الكيان",
      key: "entity",
      render: (_: any, record: AuditEntry) =>
        record.entityName || record.entityId || "-",
    },
    {
      title: "الخطورة",
      dataIndex: "severity",
      key: "severity",
      width: 100,
      render: (severity: string) => {
        const config = SEVERITY_CONFIG[severity] || SEVERITY_CONFIG.info;
        return <Tag color={config.color}>{config.label}</Tag>;
      },
    },
    {
      title: "IP",
      dataIndex: "ipAddress",
      key: "ipAddress",
      width: 120,
      render: (ip: string) => (
        <Text code style={{ fontSize: 12 }}>
          {ip || "-"}
        </Text>
      ),
    },
    {
      title: "",
      key: "actions",
      width: 50,
      render: (_: any, record: AuditEntry) => (
        <Button
          type="text"
          icon={<EyeOutlined />}
          onClick={() => loadLogDetail(record.id)}
        />
      ),
    },
  ];

  const warningCount =
    stats?.bySeverity.find((s) => s.severity === "warning")?.count || 0;
  const criticalCount =
    stats?.bySeverity.find((s) => s.severity === "critical")?.count || 0;

  return (
    <div>
      <PageHeader
        title="سجل التدقيق"
        subtitle="تتبع جميع العمليات والأنشطة في النظام"
        breadcrumbs={[
          { label: "الرئيسية", path: "/" },
          { label: "الإعدادات", path: "/settings" },
          { label: "سجل التدقيق" },
        ]}
        extra={
          <Button
            type="primary"
            icon={<DownloadOutlined />}
            onClick={exportLogs}
            style={{ backgroundColor: "#52c41a", borderColor: "#52c41a" }}
          >
            تصدير
          </Button>
        }
      />

      {/* Stats */}
      {stats && (
        <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
          <Col xs={24} sm={12} md={6}>
            <Card>
              <Statistic
                title="أحداث اليوم"
                value={stats.todayCount}
                prefix={<ClockCircleOutlined style={{ color: "#1890ff" }} />}
                valueStyle={{ color: "#1890ff" }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Card>
              <Statistic
                title="أحداث الأسبوع"
                value={stats.weekCount}
                prefix={<BarChartOutlined style={{ color: "#52c41a" }} />}
                valueStyle={{ color: "#52c41a" }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Card>
              <Statistic
                title="تحذيرات"
                value={warningCount}
                prefix={<WarningOutlined style={{ color: "#faad14" }} />}
                valueStyle={{ color: "#faad14" }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Card>
              <Statistic
                title="أحداث حرجة"
                value={criticalCount}
                prefix={
                  <ExclamationCircleOutlined style={{ color: "#f5222d" }} />
                }
                valueStyle={{ color: "#f5222d" }}
              />
            </Card>
          </Col>
        </Row>
      )}

      {/* Filters */}
      <Card style={{ marginBottom: 24 }}>
        <Row gutter={[16, 16]} align="bottom">
          <Col xs={24} sm={12} md={6}>
            <div>
              <Text type="secondary" style={{ display: "block", marginBottom: 8 }}>
                بحث
              </Text>
              <Input
                placeholder="بحث بالمستخدم أو الكيان..."
                prefix={<SearchOutlined />}
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                allowClear
              />
            </div>
          </Col>
          <Col xs={24} sm={12} md={4}>
            <div>
              <Text type="secondary" style={{ display: "block", marginBottom: 8 }}>
                الفئة
              </Text>
              <Select
                placeholder="الكل"
                value={selectedCategory || undefined}
                onChange={(value) => {
                  setSelectedCategory(value || "");
                  setPage(1);
                }}
                allowClear
                style={{ width: "100%" }}
              >
                {categories.map((cat) => (
                  <Select.Option key={cat.id} value={cat.id}>
                    {cat.icon} {cat.label}
                  </Select.Option>
                ))}
              </Select>
            </div>
          </Col>
          <Col xs={24} sm={12} md={4}>
            <div>
              <Text type="secondary" style={{ display: "block", marginBottom: 8 }}>
                الخطورة
              </Text>
              <Select
                placeholder="الكل"
                value={selectedSeverity || undefined}
                onChange={(value) => {
                  setSelectedSeverity(value || "");
                  setPage(1);
                }}
                allowClear
                style={{ width: "100%" }}
              >
                <Select.Option value="info">معلومات</Select.Option>
                <Select.Option value="warning">تحذير</Select.Option>
                <Select.Option value="critical">حرج</Select.Option>
              </Select>
            </div>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <div>
              <Text type="secondary" style={{ display: "block", marginBottom: 8 }}>
                الفترة
              </Text>
              <RangePicker
                value={dateRange}
                onChange={(dates) => {
                  setDateRange(dates as [dayjs.Dayjs, dayjs.Dayjs] | null);
                  setPage(1);
                }}
                style={{ width: "100%" }}
                placeholder={["من تاريخ", "إلى تاريخ"]}
              />
            </div>
          </Col>
          <Col xs={24} sm={12} md={4}>
            <Space>
              <Button icon={<ReloadOutlined />} onClick={resetFilters}>
                إعادة تعيين
              </Button>
            </Space>
          </Col>
        </Row>
      </Card>

      {/* View Mode Tabs */}
      <Card>
        <Tabs
          activeKey={viewMode}
          onChange={(key) => setViewMode(key as "table" | "timeline")}
          items={[
            {
              key: "table",
              label: "جدول",
              children: (
                <Table
                  dataSource={logs}
                  columns={columns}
                  rowKey="id"
                  loading={loading}
                  locale={{
                    emptyText: (
                      <Empty
                        description="لا توجد سجلات"
                        image={Empty.PRESENTED_IMAGE_SIMPLE}
                      />
                    ),
                  }}
                  pagination={{
                    current: page,
                    total: total,
                    pageSize: 50,
                    showTotal: (t) => `الصفحة ${page} من ${totalPages}`,
                    onChange: (p) => setPage(p),
                    showSizeChanger: false,
                  }}
                />
              ),
            },
            {
              key: "timeline",
              label: "خط زمني",
              children: loading ? (
                <LoadingSkeleton />
              ) : logs.length === 0 ? (
                <Empty
                  description="لا توجد سجلات"
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                />
              ) : (
                <Timeline
                  mode="right"
                  items={logs.map((log) => {
                    const severity = SEVERITY_CONFIG[log.severity] || SEVERITY_CONFIG.info;
                    return {
                      color: severity.color === "gold" ? "orange" : severity.color,
                      children: (
                        <Card
                          size="small"
                          style={{ maxWidth: 500, cursor: "pointer" }}
                          onClick={() => loadLogDetail(log.id)}
                        >
                          <Space direction="vertical" size={4}>
                            <Space>
                              {getCategoryIcon(log.eventCategory)}
                              <Text strong>
                                {EVENT_LABELS[log.eventType] || log.eventType}
                              </Text>
                              <Tag color={severity.color}>{severity.label}</Tag>
                            </Space>
                            <Text type="secondary" style={{ fontSize: 12 }}>
                              {log.userName || "نظام"} •{" "}
                              {new Date(log.createdAt).toLocaleString("ar-IQ")}
                            </Text>
                            {(log.entityName || log.entityId) && (
                              <Text type="secondary" style={{ fontSize: 12 }}>
                                الكيان: {log.entityName || log.entityId}
                              </Text>
                            )}
                          </Space>
                        </Card>
                      ),
                    };
                  })}
                />
              ),
            },
          ]}
        />
      </Card>

      {/* Detail Modal */}
      <Modal
        title="تفاصيل السجل"
        open={!!selectedLog}
        onCancel={() => setSelectedLog(null)}
        footer={null}
        width={700}
      >
        {selectedLog && (
          <div>
            <Descriptions bordered column={2} size="small">
              <Descriptions.Item label="التاريخ">
                {new Date(selectedLog.createdAt).toLocaleString("ar-IQ")}
              </Descriptions.Item>
              <Descriptions.Item label="نوع الحدث">
                {EVENT_LABELS[selectedLog.eventType] || selectedLog.eventType}
              </Descriptions.Item>
              <Descriptions.Item label="المستخدم">
                {selectedLog.userName || "-"}
              </Descriptions.Item>
              <Descriptions.Item label="الدور">
                {selectedLog.userRole || "-"}
              </Descriptions.Item>
              <Descriptions.Item label="عنوان IP">
                <Text code>{selectedLog.ipAddress || "-"}</Text>
              </Descriptions.Item>
              <Descriptions.Item label="الكيان">
                {selectedLog.entityName || selectedLog.entityId || "-"}
              </Descriptions.Item>
            </Descriptions>

            {selectedLog.oldValue && (
              <div style={{ marginTop: 16 }}>
                <Text type="secondary">القيمة القديمة</Text>
                <pre
                  style={{
                    background: "#f5f5f5",
                    padding: 12,
                    borderRadius: 8,
                    overflow: "auto",
                    fontSize: 12,
                    marginTop: 8,
                  }}
                >
                  {JSON.stringify(selectedLog.oldValue, null, 2)}
                </pre>
              </div>
            )}

            {selectedLog.newValue && (
              <div style={{ marginTop: 16 }}>
                <Text type="secondary">القيمة الجديدة</Text>
                <pre
                  style={{
                    background: "#f5f5f5",
                    padding: 12,
                    borderRadius: 8,
                    overflow: "auto",
                    fontSize: 12,
                    marginTop: 8,
                  }}
                >
                  {JSON.stringify(selectedLog.newValue, null, 2)}
                </pre>
              </div>
            )}

            {selectedLog.changes && (
              <div style={{ marginTop: 16 }}>
                <Text type="secondary">التغييرات</Text>
                <pre
                  style={{
                    background: "#fffbe6",
                    padding: 12,
                    borderRadius: 8,
                    overflow: "auto",
                    fontSize: 12,
                    marginTop: 8,
                  }}
                >
                  {JSON.stringify(selectedLog.changes, null, 2)}
                </pre>
              </div>
            )}

            {selectedLog.metadata && (
              <div style={{ marginTop: 16 }}>
                <Text type="secondary">بيانات إضافية</Text>
                <pre
                  style={{
                    background: "#f5f5f5",
                    padding: 12,
                    borderRadius: 8,
                    overflow: "auto",
                    fontSize: 12,
                    marginTop: 8,
                  }}
                >
                  {JSON.stringify(selectedLog.metadata, null, 2)}
                </pre>
              </div>
            )}

            {selectedLog.userAgent && (
              <div style={{ marginTop: 16 }}>
                <Text type="secondary">المتصفح</Text>
                <Text
                  style={{
                    display: "block",
                    fontSize: 12,
                    color: "#8c8c8c",
                    marginTop: 4,
                    wordBreak: "break-all",
                  }}
                >
                  {selectedLog.userAgent}
                </Text>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
