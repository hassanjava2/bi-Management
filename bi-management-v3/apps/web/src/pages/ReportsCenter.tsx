/**
 * مركز التقارير
 */
import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Row,
  Col,
  Card,
  List,
  Button,
  Tag,
  Space,
  message,
  Statistic,
  Empty,
  Tabs,
  Popconfirm,
  Typography,
} from "antd";
import {
  FileTextOutlined,
  BookOutlined,
  ThunderboltOutlined,
  ClockCircleOutlined,
  PlusOutlined,
  PlayCircleOutlined,
  DeleteOutlined,
  GlobalOutlined,
  ScheduleOutlined,
  InboxOutlined,
  ShoppingCartOutlined,
  DollarOutlined,
  ToolOutlined,
} from "@ant-design/icons";
import { PageHeader, DateDisplay, LoadingSkeleton } from "../components/shared";
import { API_BASE, getAuthHeaders } from "../utils/api";

const { Text } = Typography;

interface ReportTemplate {
  id: string;
  name: string;
  category: string;
  description: string;
  icon: string;
}

interface SavedReport {
  id: string;
  name: string;
  description: string;
  templateId: string;
  templateName: string;
  isPublic: boolean;
  lastRunAt: string | null;
  hasSchedule: boolean;
  createdAt: string;
}

interface Stats {
  templates: number;
  saved: number;
  totalExecutions: number;
  todayExecutions: number;
}

const CATEGORIES: Record<string, { label: string; color: string }> = {
  inventory: { label: "المخزون", color: "blue" },
  purchases: { label: "المشتريات", color: "green" },
  sales: { label: "المبيعات", color: "purple" },
  maintenance: { label: "الصيانة", color: "orange" },
  hr: { label: "الموارد البشرية", color: "pink" },
  finance: { label: "المالية", color: "gold" },
  general: { label: "عام", color: "default" },
};

const QUICK_REPORTS = [
  { id: "inventory_summary", name: "ملخص المخزون", icon: "📦", color: "#3b82f6" },
  { id: "purchases_report", name: "المشتريات", icon: "🛒", color: "#22c55e" },
  { id: "sales_report", name: "المبيعات", icon: "💰", color: "#8b5cf6" },
  { id: "maintenance_report", name: "الصيانة", icon: "🔧", color: "#f97316" },
];

export default function ReportsCenter() {
  const navigate = useNavigate();
  const [availableReports, setAvailableReports] = useState<ReportTemplate[]>([]);
  const [savedReports, setSavedReports] = useState<SavedReport[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<string>("available");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [reportsRes, savedRes, statsRes] = await Promise.all([
        fetch(`${API_BASE}/api/reports/available`, { headers: getAuthHeaders() }),
        fetch(`${API_BASE}/api/reports/saved`, { headers: getAuthHeaders() }),
        fetch(`${API_BASE}/api/reports/stats`, { headers: getAuthHeaders() }),
      ]);

      if (reportsRes.ok) {
        setAvailableReports(await reportsRes.json());
      }
      if (savedRes.ok) {
        setSavedReports(await savedRes.json());
      }
      if (statsRes.ok) {
        setStats(await statsRes.json());
      }
    } catch (error) {
      console.error("Load error:", error);
      message.error("فشل في تحميل التقارير");
    } finally {
      setLoading(false);
    }
  };

  const runReport = (reportId: string) => {
    navigate(`/reports/run/${reportId}`);
  };

  const deleteSavedReport = async (id: string) => {
    try {
      const res = await fetch(`${API_BASE}/api/reports/saved/${id}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        setSavedReports((prev) => prev.filter((r) => r.id !== id));
        message.success("تم حذف التقرير");
      }
    } catch (error) {
      console.error("Delete error:", error);
      message.error("فشل في حذف التقرير");
    }
  };

  const filteredReports = selectedCategory
    ? availableReports.filter((r) => r.category === selectedCategory)
    : availableReports;

  const categories = [...new Set(availableReports.map((r) => r.category))];

  const tabItems = [
    {
      key: "available",
      label: "التقارير المتاحة",
      children: (
        <div>
          {/* Category Filter */}
          <Space wrap style={{ marginBottom: 24 }}>
            <Button
              type={!selectedCategory ? "primary" : "default"}
              onClick={() => setSelectedCategory(null)}
            >
              الكل
            </Button>
            {categories.map((cat) => {
              const catInfo = CATEGORIES[cat] || CATEGORIES.general;
              return (
                <Button
                  key={cat}
                  type={selectedCategory === cat ? "primary" : "default"}
                  onClick={() => setSelectedCategory(cat)}
                >
                  <Tag color={catInfo.color} style={{ marginLeft: 4 }}>
                    {catInfo.label}
                  </Tag>
                </Button>
              );
            })}
          </Space>

          {/* Reports Grid */}
          <Row gutter={[16, 16]}>
            {filteredReports.map((report) => {
              const catInfo = CATEGORIES[report.category] || CATEGORIES.general;
              return (
                <Col xs={24} sm={12} lg={8} key={report.id}>
                  <Card
                    hoverable
                    onClick={() => runReport(report.id)}
                    style={{ height: "100%" }}
                  >
                    <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                      <span style={{ fontSize: 32 }}>{report.icon}</span>
                      <div style={{ flex: 1 }}>
                        <Text strong style={{ fontSize: 16, display: "block" }}>
                          {report.name}
                        </Text>
                        <Text type="secondary" style={{ fontSize: 13 }}>
                          {report.description}
                        </Text>
                        <Tag color={catInfo.color} style={{ marginTop: 8 }}>
                          {catInfo.label}
                        </Tag>
                      </div>
                    </div>
                  </Card>
                </Col>
              );
            })}
          </Row>
        </div>
      ),
    },
    {
      key: "saved",
      label: `التقارير المحفوظة (${savedReports.length})`,
      children: (
        <div>
          {savedReports.length === 0 ? (
            <Empty
              image={<BookOutlined style={{ fontSize: 64, color: "#d9d9d9" }} />}
              description={
                <div>
                  <p>لا توجد تقارير محفوظة</p>
                  <Text type="secondary">قم بتشغيل تقرير وحفظه للوصول السريع</Text>
                </div>
              }
            />
          ) : (
            <List
              dataSource={savedReports}
              renderItem={(report) => (
                <Card style={{ marginBottom: 12 }} hoverable>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                      <div
                        style={{
                          width: 48,
                          height: 48,
                          borderRadius: 8,
                          background: "#dbeafe",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <FileTextOutlined style={{ fontSize: 24, color: "#2563eb" }} />
                      </div>
                      <div>
                        <Text strong style={{ fontSize: 16, display: "block" }}>
                          {report.name}
                        </Text>
                        <Space size="middle" style={{ marginTop: 4 }}>
                          {report.templateName && (
                            <Text type="secondary" style={{ fontSize: 13 }}>
                              نوع: {report.templateName}
                            </Text>
                          )}
                          {report.hasSchedule && (
                            <Tag color="success" icon={<ScheduleOutlined />}>
                              مجدول
                            </Tag>
                          )}
                          {report.isPublic && (
                            <Tag color="blue" icon={<GlobalOutlined />}>
                              عام
                            </Tag>
                          )}
                        </Space>
                        {report.lastRunAt && (
                          <Text type="secondary" style={{ fontSize: 12, display: "block", marginTop: 4 }}>
                            آخر تشغيل: <DateDisplay date={report.lastRunAt} />
                          </Text>
                        )}
                      </div>
                    </div>

                    <Space>
                      <Button
                        type="primary"
                        ghost
                        icon={<PlayCircleOutlined />}
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/reports/run/${report.templateId}?saved=${report.id}`);
                        }}
                      >
                        تشغيل
                      </Button>
                      <Popconfirm
                        title="هل أنت متأكد من حذف هذا التقرير؟"
                        onConfirm={() => deleteSavedReport(report.id)}
                        okText="نعم"
                        cancelText="لا"
                      >
                        <Button danger icon={<DeleteOutlined />} onClick={(e) => e.stopPropagation()}>
                          حذف
                        </Button>
                      </Popconfirm>
                    </Space>
                  </div>
                </Card>
              )}
            />
          )}
        </div>
      ),
    },
  ];

  if (loading) {
    return (
      <div>
        <PageHeader
          title="مركز التقارير"
          subtitle="إنشاء وإدارة التقارير ولوحات المعلومات"
          breadcrumbs={[
            { label: "الرئيسية", path: "/" },
            { label: "مركز التقارير" },
          ]}
        />
        <LoadingSkeleton count={5} />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="مركز التقارير"
        subtitle="إنشاء وإدارة التقارير ولوحات المعلومات"
        breadcrumbs={[
          { label: "الرئيسية", path: "/" },
          { label: "مركز التقارير" },
        ]}
        extra={
          <Link to="/reports/builder">
            <Button type="primary" icon={<PlusOutlined />}>
              منشئ التقارير
            </Button>
          </Link>
        }
      />

      {/* Stats */}
      {stats && (
        <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
          <Col xs={12} sm={6}>
            <Card>
              <Statistic
                title="التقارير المتاحة"
                value={availableReports.length}
                prefix={<FileTextOutlined />}
              />
            </Card>
          </Col>
          <Col xs={12} sm={6}>
            <Card>
              <Statistic
                title="التقارير المحفوظة"
                value={stats.saved}
                prefix={<BookOutlined />}
                valueStyle={{ color: "#22c55e" }}
              />
            </Card>
          </Col>
          <Col xs={12} sm={6}>
            <Card>
              <Statistic
                title="إجمالي التنفيذات"
                value={stats.totalExecutions}
                prefix={<ThunderboltOutlined />}
                valueStyle={{ color: "#8b5cf6" }}
              />
            </Card>
          </Col>
          <Col xs={12} sm={6}>
            <Card>
              <Statistic
                title="تنفيذات اليوم"
                value={stats.todayExecutions}
                prefix={<ClockCircleOutlined />}
                valueStyle={{ color: "#f97316" }}
              />
            </Card>
          </Col>
        </Row>
      )}

      {/* Tabs */}
      <Card style={{ marginBottom: 24 }}>
        <Tabs activeKey={activeTab} onChange={setActiveTab} items={tabItems} />
      </Card>

      {/* Quick Reports */}
      <Card title="تقارير سريعة">
        <Row gutter={[16, 16]}>
          {QUICK_REPORTS.map((report) => (
            <Col xs={12} sm={6} key={report.id}>
              <Link to={`/reports/run/${report.id}`}>
                <Card
                  hoverable
                  style={{
                    textAlign: "center",
                    borderColor: report.color,
                  }}
                  bodyStyle={{ padding: "24px 16px" }}
                >
                  <span style={{ fontSize: 32, display: "block", marginBottom: 8 }}>
                    {report.icon}
                  </span>
                  <Text strong>{report.name}</Text>
                </Card>
              </Link>
            </Col>
          ))}
        </Row>
      </Card>
    </div>
  );
}
