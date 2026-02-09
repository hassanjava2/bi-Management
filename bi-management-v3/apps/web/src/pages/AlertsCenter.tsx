/**
 * مركز التنبيهات الذكية
 */
import { useState, useEffect } from "react";
import { Row, Col, Card, Button, Tag, Space, Empty, Statistic } from "antd";
import {
  BellOutlined,
  ReloadOutlined,
  ExclamationCircleOutlined,
  WarningOutlined,
  InfoCircleOutlined,
  CheckCircleOutlined,
} from "@ant-design/icons";
import { PageHeader, LoadingSkeleton } from "../components/shared";
import { API_BASE, getAuthHeaders } from "../utils/api";

interface Alert {
  id: string;
  type: string;
  category: string;
  severity: "info" | "warning" | "critical";
  title: string;
  message: string;
  count?: number;
  actionUrl?: string;
  actionLabel?: string;
  metadata?: any;
}

interface AlertSummary {
  total: number;
  critical: number;
  warning: number;
  info: number;
}

interface Category {
  id: string;
  label: string;
  icon: string;
  color: string;
}

export default function AlertsCenter() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [summary, setSummary] = useState<AlertSummary>({ total: 0, critical: 0, warning: 0, info: 0 });
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedSeverity, setSelectedSeverity] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [alertsRes, categoriesRes] = await Promise.all([
        fetch(`${API_BASE}/api/alerts`),
        fetch(`${API_BASE}/api/alerts/categories`),
      ]);

      if (alertsRes.ok) {
        const data = await alertsRes.json();
        setAlerts(data.alerts || []);
        setSummary(data.summary || { total: 0, critical: 0, warning: 0, info: 0 });
      }

      if (categoriesRes.ok) {
        const cats = await categoriesRes.json();
        setCategories(cats);
      }
    } catch (error) {
      console.error("Error loading alerts:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredAlerts = alerts.filter((alert) => {
    if (selectedCategory && alert.category !== selectedCategory) return false;
    if (selectedSeverity && alert.severity !== selectedSeverity) return false;
    return true;
  });

  const getSeverityConfig = (severity: string) => {
    switch (severity) {
      case "critical":
        return { color: "#dc2626", bgColor: "#fef2f2", borderColor: "#fecaca", icon: <ExclamationCircleOutlined />, tagColor: "error" };
      case "warning":
        return { color: "#d97706", bgColor: "#fffbeb", borderColor: "#fde68a", icon: <WarningOutlined />, tagColor: "warning" };
      default:
        return { color: "#0284c7", bgColor: "#f0f9ff", borderColor: "#bae6fd", icon: <InfoCircleOutlined />, tagColor: "processing" };
    }
  };

  const getCategoryInfo = (categoryId: string) => {
    return categories.find((c) => c.id === categoryId) || { label: categoryId, icon: "📌", color: "gray" };
  };

  if (loading) {
    return <LoadingSkeleton />;
  }

  return (
    <div>
      <PageHeader
        title="مركز التنبيهات الذكية"
        subtitle="مراقبة وتتبع جميع التنبيهات في النظام"
        icon={<BellOutlined />}
        breadcrumbs={[
          { label: "الرئيسية", path: "/" },
          { label: "التنبيهات" },
        ]}
      />

      {/* ملخص سريع */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={12} sm={6}>
          <Card bordered={false} style={{ background: "#f9fafb", textAlign: "center" }}>
            <Statistic
              title="إجمالي التنبيهات"
              value={summary.total}
              valueStyle={{ color: "#374151", fontWeight: 700 }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card
            bordered={false}
            hoverable
            onClick={() => setSelectedSeverity(selectedSeverity === "critical" ? null : "critical")}
            style={{
              background: selectedSeverity === "critical" ? "#fecaca" : "#fef2f2",
              textAlign: "center",
              cursor: "pointer",
            }}
          >
            <Statistic
              title={<span><ExclamationCircleOutlined /> حرجة</span>}
              value={summary.critical}
              valueStyle={{ color: "#dc2626", fontWeight: 700 }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card
            bordered={false}
            hoverable
            onClick={() => setSelectedSeverity(selectedSeverity === "warning" ? null : "warning")}
            style={{
              background: selectedSeverity === "warning" ? "#fde68a" : "#fffbeb",
              textAlign: "center",
              cursor: "pointer",
            }}
          >
            <Statistic
              title={<span><WarningOutlined /> تحذير</span>}
              value={summary.warning}
              valueStyle={{ color: "#d97706", fontWeight: 700 }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card
            bordered={false}
            hoverable
            onClick={() => setSelectedSeverity(selectedSeverity === "info" ? null : "info")}
            style={{
              background: selectedSeverity === "info" ? "#bae6fd" : "#f0f9ff",
              textAlign: "center",
              cursor: "pointer",
            }}
          >
            <Statistic
              title={<span><InfoCircleOutlined /> معلومات</span>}
              value={summary.info}
              valueStyle={{ color: "#0284c7", fontWeight: 700 }}
            />
          </Card>
        </Col>
      </Row>

      {/* فلاتر الفئات */}
      <Space wrap style={{ marginBottom: 24 }}>
        <Button
          type={selectedCategory === null ? "primary" : "default"}
          onClick={() => setSelectedCategory(null)}
        >
          الكل ({alerts.length})
        </Button>
        {categories.map((cat) => {
          const catCount = alerts.filter((a) => a.category === cat.id).length;
          return (
            <Button
              key={cat.id}
              type={selectedCategory === cat.id ? "primary" : "default"}
              onClick={() => setSelectedCategory(selectedCategory === cat.id ? null : cat.id)}
            >
              {cat.icon} {cat.label} ({catCount})
            </Button>
          );
        })}
      </Space>

      {/* قائمة التنبيهات */}
      {filteredAlerts.length === 0 ? (
        <Card>
          <Empty
            image={<CheckCircleOutlined style={{ fontSize: 64, color: "#10b981" }} />}
            description={
              <div>
                <div style={{ fontSize: 18, fontWeight: 600, color: "#10b981", marginBottom: 8 }}>
                  لا توجد تنبيهات
                </div>
                <div style={{ color: "#666" }}>كل شيء يعمل بشكل جيد!</div>
              </div>
            }
          />
        </Card>
      ) : (
        <Space direction="vertical" style={{ width: "100%" }} size={16}>
          {filteredAlerts.map((alert) => {
            const config = getSeverityConfig(alert.severity);
            const catInfo = getCategoryInfo(alert.category);

            return (
              <Card
                key={alert.id}
                style={{
                  background: config.bgColor,
                  borderColor: config.borderColor,
                }}
              >
                <Row justify="space-between" align="top">
                  <Col flex="1">
                    <Space align="center" style={{ marginBottom: 8 }}>
                      <span style={{ fontSize: 20, color: config.color }}>{config.icon}</span>
                      <span style={{ fontSize: 16, fontWeight: 600, color: config.color }}>
                        {alert.title}
                      </span>
                      <Tag>{catInfo.icon} {catInfo.label}</Tag>
                    </Space>

                    <p style={{ color: "#4b5563", margin: 0, fontSize: 14 }}>
                      {alert.message}
                    </p>

                    {alert.count && alert.count > 5 && (
                      <div style={{ marginTop: 12, fontSize: 13, color: "#6b7280" }}>
                        عدد العناصر المتأثرة: {alert.count}
                      </div>
                    )}

                    {alert.metadata?.products && (
                      <Card
                        size="small"
                        style={{ marginTop: 12, background: "#fff" }}
                      >
                        <strong>بعض المنتجات:</strong>
                        <ul style={{ margin: "8px 0 0 16px", padding: 0 }}>
                          {alert.metadata.products.slice(0, 3).map((p: any, idx: number) => (
                            <li key={idx}>{p.productName || "غير محدد"}</li>
                          ))}
                          {alert.metadata.products.length > 3 && (
                            <li style={{ color: "#9ca3af" }}>
                              و {alert.metadata.products.length - 3} منتجات أخرى...
                            </li>
                          )}
                        </ul>
                      </Card>
                    )}
                  </Col>

                  {alert.actionUrl && (
                    <Col>
                      <Button
                        type="primary"
                        href={alert.actionUrl}
                        style={{ background: config.color, borderColor: config.color }}
                      >
                        {alert.actionLabel || "عرض"}
                      </Button>
                    </Col>
                  )}
                </Row>
              </Card>
            );
          })}
        </Space>
      )}

      {/* زر التحديث */}
      <div style={{ marginTop: 32, textAlign: "center" }}>
        <Button type="primary" icon={<ReloadOutlined />} onClick={loadData} size="large">
          تحديث التنبيهات
        </Button>
      </div>
    </div>
  );
}
