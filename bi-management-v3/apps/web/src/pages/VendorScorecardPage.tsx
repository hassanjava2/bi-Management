/**
 * صفحة تقييم الموردين
 */
import { useState, useEffect } from "react";
import {
  Row,
  Col,
  Card,
  Table,
  Tag,
  Space,
  message,
  Statistic,
  Progress,
  Typography,
  Drawer,
  Descriptions,
  Button,
  Empty,
  Input,
  Tooltip,
  Alert,
} from "antd";
import {
  TeamOutlined,
  TrophyOutlined,
  SafetyCertificateOutlined,
  WarningOutlined,
  StarOutlined,
  SearchOutlined,
  ReloadOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  EnvironmentOutlined,
  DollarOutlined,
  PhoneOutlined,
} from "@ant-design/icons";
import { PageHeader, LoadingSkeleton, MoneyDisplay } from "../components/shared";
import { API_BASE, getAuthHeaders } from "../utils/api";

const { Text, Title } = Typography;

/* ---------- أنواع البيانات ---------- */

interface VendorScore {
  id: string;
  name: string;
  city: string | null;
  phone: string | null;
  overallScore: number;
  grade: string;
  qualityScore: number;
  reliabilityScore: number;
  returnRate: number;
  totalPurchases: number;
  alerts: string[];
  lastDeliveryDate?: string;
  totalOrders?: number;
  onTimeDeliveryRate?: number;
}

interface VendorDetail extends VendorScore {
  recentOrders?: Array<{
    id: string;
    date: string;
    amount: number;
    status: string;
    itemsCount: number;
  }>;
  returnHistory?: Array<{
    id: string;
    date: string;
    reason: string;
    amount: number;
  }>;
  notes?: string;
}

interface VendorStats {
  totalSuppliers: number;
  avgScore: number;
  gradeDistribution: Record<string, number>;
}

/* ---------- ثوابت ---------- */

const GRADE_CONFIG: Record<string, { color: string; label: string }> = {
  "A+": { color: "green", label: "A+ ممتاز" },
  A: { color: "green", label: "A جيد جداً" },
  B: { color: "blue", label: "B جيد" },
  C: { color: "orange", label: "C مقبول" },
  D: { color: "red", label: "D ضعيف" },
};

const getScoreColor = (score: number): string => {
  if (score >= 80) return "#059669";
  if (score >= 60) return "#1677ff";
  if (score >= 40) return "#d97706";
  return "#dc2626";
};

/* ---------- المكوّن ---------- */

export default function VendorScorecardPage() {
  const [vendors, setVendors] = useState<VendorScore[]>([]);
  const [stats, setStats] = useState<VendorStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedVendor, setSelectedVendor] = useState<VendorDetail | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/vendor-scorecard`, {
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        const data = await res.json();
        const list: VendorScore[] = data.vendors ?? data ?? [];
        setVendors(list);

        // حساب الإحصائيات
        const totalSuppliers = list.length;
        const avgScore =
          totalSuppliers > 0
            ? list.reduce((s, v) => s + Number(v.overallScore), 0) / totalSuppliers
            : 0;
        const gradeDistribution: Record<string, number> = {};
        list.forEach((v) => {
          gradeDistribution[v.grade] = (gradeDistribution[v.grade] || 0) + 1;
        });
        setStats({ totalSuppliers, avgScore, gradeDistribution });
      } else {
        message.error("فشل في تحميل بيانات الموردين");
      }
    } catch (error) {
      console.error(error);
      message.error("حدث خطأ أثناء تحميل البيانات");
    } finally {
      setLoading(false);
    }
  };

  const loadVendorDetail = async (id: string) => {
    setDetailLoading(true);
    setDrawerOpen(true);
    try {
      const res = await fetch(`${API_BASE}/api/vendor-scorecard/${id}`, {
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        setSelectedVendor(await res.json());
      } else {
        message.error("فشل في تحميل تفاصيل المورد");
      }
    } catch (error) {
      console.error(error);
      message.error("حدث خطأ");
    } finally {
      setDetailLoading(false);
    }
  };

  /* ---- تصفية البحث ---- */
  const filteredVendors = search
    ? vendors.filter(
        (v) =>
          v.name.toLowerCase().includes(search.toLowerCase()) ||
          v.city?.toLowerCase().includes(search.toLowerCase())
      )
    : vendors;

  /* ---- أعمدة الجدول ---- */
  const columns = [
    {
      title: "المورد",
      key: "name",
      render: (_: any, record: VendorScore) => (
        <Button
          type="link"
          onClick={() => loadVendorDetail(record.id)}
          style={{ padding: 0, height: "auto" }}
        >
          <div style={{ textAlign: "right" }}>
            <Text strong>{record.name}</Text>
            {record.city && (
              <div style={{ fontSize: 12, color: "#6b7280" }}>
                <EnvironmentOutlined /> {record.city}
              </div>
            )}
          </div>
        </Button>
      ),
    },
    {
      title: "التقييم العام",
      dataIndex: "overallScore",
      key: "overallScore",
      align: "center" as const,
      sorter: (a: VendorScore, b: VendorScore) => a.overallScore - b.overallScore,
      render: (score: number) => (
        <Tooltip title={`${score}/100`}>
          <Progress
            percent={score}
            size="small"
            strokeColor={getScoreColor(score)}
            format={(v) => `${v}`}
            style={{ width: 120, margin: "0 auto" }}
          />
        </Tooltip>
      ),
    },
    {
      title: "التصنيف",
      dataIndex: "grade",
      key: "grade",
      align: "center" as const,
      filters: Object.entries(GRADE_CONFIG).map(([k, v]) => ({ text: v.label, value: k })),
      onFilter: (value: any, record: VendorScore) => record.grade === value,
      render: (grade: string) => {
        const cfg = GRADE_CONFIG[grade] || { color: "default", label: grade };
        return (
          <Tag color={cfg.color} style={{ fontWeight: 700, fontSize: 14 }}>
            {cfg.label}
          </Tag>
        );
      },
    },
    {
      title: "جودة المنتجات",
      dataIndex: "qualityScore",
      key: "qualityScore",
      align: "center" as const,
      sorter: (a: VendorScore, b: VendorScore) => a.qualityScore - b.qualityScore,
      render: (v: number) => (
        <span style={{ color: getScoreColor(v), fontWeight: 600 }}>{v}</span>
      ),
    },
    {
      title: "الموثوقية",
      dataIndex: "reliabilityScore",
      key: "reliabilityScore",
      align: "center" as const,
      sorter: (a: VendorScore, b: VendorScore) => a.reliabilityScore - b.reliabilityScore,
      render: (v: number) => (
        <span style={{ color: getScoreColor(v), fontWeight: 600 }}>{v}</span>
      ),
    },
    {
      title: "نسبة الإرجاع",
      dataIndex: "returnRate",
      key: "returnRate",
      align: "center" as const,
      sorter: (a: VendorScore, b: VendorScore) => a.returnRate - b.returnRate,
      render: (v: number) => (
        <Tag color={v > 10 ? "red" : v > 5 ? "orange" : "green"}>{v.toFixed(1)}%</Tag>
      ),
    },
    {
      title: "إجمالي المشتريات",
      dataIndex: "totalPurchases",
      key: "totalPurchases",
      align: "center" as const,
      sorter: (a: VendorScore, b: VendorScore) => a.totalPurchases - b.totalPurchases,
      render: (v: number) => <MoneyDisplay amount={v} />,
    },
    {
      title: "التنبيهات",
      dataIndex: "alerts",
      key: "alerts",
      align: "center" as const,
      render: (alerts: string[]) =>
        alerts && alerts.length > 0 ? (
          <Tooltip title={alerts.join(" | ")}>
            <Tag color="red" icon={<WarningOutlined />}>
              {alerts.length}
            </Tag>
          </Tooltip>
        ) : (
          <CheckCircleOutlined style={{ color: "#059669" }} />
        ),
    },
  ];

  /* ---- العرض ---- */
  if (loading && vendors.length === 0) {
    return (
      <div style={{ padding: 24 }}>
        <LoadingSkeleton type="table" rows={8} />
      </div>
    );
  }

  return (
    <div style={{ padding: 24 }}>
      <PageHeader
        title="تقييم الموردين"
        subtitle="بطاقة أداء شاملة لتقييم ومتابعة الموردين"
        breadcrumbs={[{ title: "تقييم الموردين" }]}
        extra={
          <Button icon={<ReloadOutlined />} onClick={loadData} loading={loading}>
            تحديث
          </Button>
        }
      />

      {/* الإحصائيات */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={8}>
          <Card style={{ background: "linear-gradient(135deg, #667eea, #764ba2)" }}>
            <Statistic
              title={<span style={{ color: "rgba(255,255,255,0.9)" }}>إجمالي الموردين</span>}
              value={stats?.totalSuppliers ?? 0}
              valueStyle={{ color: "#fff", fontSize: "2rem", fontWeight: 700 }}
              prefix={<TeamOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card style={{ background: "linear-gradient(135deg, #43e97b, #38f9d7)" }}>
            <Statistic
              title={<span style={{ color: "rgba(255,255,255,0.9)" }}>متوسط التقييم</span>}
              value={stats?.avgScore ?? 0}
              valueStyle={{ color: "#fff", fontSize: "2rem", fontWeight: 700 }}
              prefix={<StarOutlined />}
              precision={1}
              suffix="/100"
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card styles={{ body: { padding: 20 } }}>
            <Text type="secondary" style={{ fontSize: 14, display: "block", marginBottom: 12 }}>
              توزيع التصنيفات
            </Text>
            <Space wrap>
              {stats?.gradeDistribution &&
                Object.entries(stats.gradeDistribution)
                  .sort(([a], [b]) => a.localeCompare(b))
                  .map(([grade, count]) => {
                    const cfg = GRADE_CONFIG[grade] || { color: "default", label: grade };
                    return (
                      <Tag key={grade} color={cfg.color} style={{ fontSize: 13, padding: "2px 10px" }}>
                        {grade}: {count}
                      </Tag>
                    );
                  })}
            </Space>
          </Card>
        </Col>
      </Row>

      {/* البحث */}
      <Card style={{ marginBottom: 16 }}>
        <Input
          placeholder="بحث بالاسم أو المدينة..."
          prefix={<SearchOutlined style={{ color: "#bfbfbf" }} />}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          allowClear
          style={{ maxWidth: 400 }}
        />
      </Card>

      {/* الجدول */}
      {filteredVendors.length === 0 && !loading ? (
        <Card>
          <Empty
            image={<TeamOutlined style={{ fontSize: 64, color: "#d9d9d9" }} />}
            description="لا يوجد موردين"
          />
        </Card>
      ) : (
        <Card title={`الموردين (${filteredVendors.length})`}>
          <Table
            columns={columns}
            dataSource={filteredVendors}
            rowKey="id"
            loading={loading}
            pagination={{
              showSizeChanger: true,
              showTotal: (total, range) => `${range[0]}-${range[1]} من ${total}`,
              pageSize: 20,
            }}
            scroll={{ x: "max-content" }}
          />
        </Card>
      )}

      {/* درج التفاصيل */}
      <Drawer
        title={
          <Space>
            <SafetyCertificateOutlined style={{ color: "#1677ff" }} />
            <span>تفاصيل المورد - {selectedVendor?.name}</span>
          </Space>
        }
        open={drawerOpen}
        onClose={() => {
          setDrawerOpen(false);
          setSelectedVendor(null);
        }}
        width={560}
        placement="left"
      >
        {detailLoading ? (
          <LoadingSkeleton type="form" rows={8} />
        ) : selectedVendor ? (
          <div>
            {/* التقييم العام */}
            <div style={{ textAlign: "center", marginBottom: 24 }}>
              <Progress
                type="dashboard"
                percent={selectedVendor.overallScore}
                strokeColor={getScoreColor(selectedVendor.overallScore)}
                size={120}
                format={(v) => (
                  <div>
                    <div style={{ fontSize: 24, fontWeight: 700 }}>{v}</div>
                    <Tag
                      color={GRADE_CONFIG[selectedVendor.grade]?.color || "default"}
                      style={{ fontWeight: 700 }}
                    >
                      {GRADE_CONFIG[selectedVendor.grade]?.label || selectedVendor.grade}
                    </Tag>
                  </div>
                )}
              />
            </div>

            {/* معلومات أساسية */}
            <Descriptions bordered size="small" column={1} style={{ marginBottom: 24 }}>
              <Descriptions.Item label="المورد">
                <Text strong>{selectedVendor.name}</Text>
              </Descriptions.Item>
              {selectedVendor.city && (
                <Descriptions.Item label="المدينة">
                  <EnvironmentOutlined /> {selectedVendor.city}
                </Descriptions.Item>
              )}
              {selectedVendor.phone && (
                <Descriptions.Item label="الهاتف">
                  <PhoneOutlined /> {selectedVendor.phone}
                </Descriptions.Item>
              )}
              <Descriptions.Item label="إجمالي المشتريات">
                <MoneyDisplay amount={selectedVendor.totalPurchases} />
              </Descriptions.Item>
              {selectedVendor.totalOrders != null && (
                <Descriptions.Item label="عدد الطلبات">
                  {selectedVendor.totalOrders}
                </Descriptions.Item>
              )}
            </Descriptions>

            {/* تفاصيل التقييم */}
            <Title level={5} style={{ marginBottom: 16 }}>
              تفاصيل التقييم
            </Title>
            <Space direction="vertical" style={{ width: "100%" }} size={12}>
              <Card size="small" styles={{ body: { padding: "12px 16px" } }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                  <Text>جودة المنتجات</Text>
                  <Text strong>{selectedVendor.qualityScore}/100</Text>
                </div>
                <Progress
                  percent={selectedVendor.qualityScore}
                  strokeColor={getScoreColor(selectedVendor.qualityScore)}
                  showInfo={false}
                />
              </Card>
              <Card size="small" styles={{ body: { padding: "12px 16px" } }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                  <Text>الموثوقية</Text>
                  <Text strong>{selectedVendor.reliabilityScore}/100</Text>
                </div>
                <Progress
                  percent={selectedVendor.reliabilityScore}
                  strokeColor={getScoreColor(selectedVendor.reliabilityScore)}
                  showInfo={false}
                />
              </Card>
              {selectedVendor.onTimeDeliveryRate != null && (
                <Card size="small" styles={{ body: { padding: "12px 16px" } }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                    <Text>معدل التسليم بالوقت</Text>
                    <Text strong>{selectedVendor.onTimeDeliveryRate}%</Text>
                  </div>
                  <Progress
                    percent={selectedVendor.onTimeDeliveryRate}
                    strokeColor={getScoreColor(selectedVendor.onTimeDeliveryRate)}
                    showInfo={false}
                  />
                </Card>
              )}
              <Card size="small" styles={{ body: { padding: "12px 16px" } }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                  <Text>نسبة الإرجاع</Text>
                  <Text strong style={{ color: selectedVendor.returnRate > 10 ? "#dc2626" : undefined }}>
                    {selectedVendor.returnRate.toFixed(1)}%
                  </Text>
                </div>
                <Progress
                  percent={Math.min(selectedVendor.returnRate * 5, 100)}
                  strokeColor={selectedVendor.returnRate > 10 ? "#dc2626" : selectedVendor.returnRate > 5 ? "#d97706" : "#059669"}
                  showInfo={false}
                />
              </Card>
            </Space>

            {/* التنبيهات */}
            {selectedVendor.alerts && selectedVendor.alerts.length > 0 && (
              <div style={{ marginTop: 24 }}>
                <Title level={5} style={{ marginBottom: 12 }}>
                  التنبيهات
                </Title>
                <Space direction="vertical" style={{ width: "100%" }}>
                  {selectedVendor.alerts.map((alert, idx) => (
                    <Alert
                      key={idx}
                      message={alert}
                      type="warning"
                      showIcon
                      icon={<WarningOutlined />}
                    />
                  ))}
                </Space>
              </div>
            )}

            {/* الطلبات الأخيرة */}
            {selectedVendor.recentOrders && selectedVendor.recentOrders.length > 0 && (
              <div style={{ marginTop: 24 }}>
                <Title level={5} style={{ marginBottom: 12 }}>
                  آخر الطلبات
                </Title>
                <Table
                  size="small"
                  dataSource={selectedVendor.recentOrders}
                  rowKey="id"
                  pagination={false}
                  columns={[
                    {
                      title: "التاريخ",
                      dataIndex: "date",
                      key: "date",
                      render: (d: string) => new Date(d).toLocaleDateString("ar-IQ"),
                    },
                    {
                      title: "المبلغ",
                      dataIndex: "amount",
                      key: "amount",
                      render: (v: number) => <MoneyDisplay amount={v} />,
                    },
                    {
                      title: "المواد",
                      dataIndex: "itemsCount",
                      key: "itemsCount",
                      align: "center" as const,
                    },
                    {
                      title: "الحالة",
                      dataIndex: "status",
                      key: "status",
                      render: (s: string) => (
                        <Tag color={s === "delivered" ? "green" : s === "pending" ? "orange" : "blue"}>
                          {s === "delivered" ? "تم التسليم" : s === "pending" ? "معلق" : s}
                        </Tag>
                      ),
                    },
                  ]}
                />
              </div>
            )}
          </div>
        ) : null}
      </Drawer>
    </div>
  );
}
