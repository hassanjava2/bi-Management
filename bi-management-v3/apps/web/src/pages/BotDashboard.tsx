/**
 * لوحة تحكم البوت الذكي
 * Bot Dashboard
 */
import { useState, useEffect, useCallback } from "react";
import { Row, Col, Card, Statistic, Button, Space, Tag, Tabs, Table, Progress, Empty, message, Popconfirm, InputNumber } from "antd";
import {
  PlayCircleOutlined, PauseCircleOutlined, StopOutlined,
  BugOutlined, ToolOutlined, DatabaseOutlined, ExperimentOutlined,
  RobotOutlined, ThunderboltOutlined, ReloadOutlined,
  CheckCircleOutlined, CloseCircleOutlined, ClockCircleOutlined,
  BarChartOutlined, FileTextOutlined, SettingOutlined,
} from "@ant-design/icons";
import { PageHeader, LoadingSkeleton } from "../components/shared";
import { API_BASE, getAuthHeaders } from "../utils/api";

export default function BotDashboard() {
  const [botStatus, setBotStatus] = useState<any>(null);
  const [stats, setStats] = useState<any>(null);
  const [errors, setErrors] = useState<any[]>([]);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [performance, setPerformance] = useState<any>(null);
  const [logs, setLogs] = useState<any[]>([]);
  const [workerStats, setWorkerStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState("");

  const fetchData = useCallback(async () => {
    try {
      const [statusRes, errorsRes, suggestionsRes, perfRes, logsRes, workerRes] = await Promise.all([
        fetch(`${API_BASE}/api/bot/status`, { headers: getAuthHeaders() }).then(r => r.ok ? r.json() : null).catch(() => null),
        fetch(`${API_BASE}/api/bot/errors?limit=20`, { headers: getAuthHeaders() }).then(r => r.ok ? r.json() : null).catch(() => null),
        fetch(`${API_BASE}/api/bot/suggestions`, { headers: getAuthHeaders() }).then(r => r.ok ? r.json() : null).catch(() => null),
        fetch(`${API_BASE}/api/bot/performance`, { headers: getAuthHeaders() }).then(r => r.ok ? r.json() : null).catch(() => null),
        fetch(`${API_BASE}/api/bot/logs?limit=50`, { headers: getAuthHeaders() }).then(r => r.ok ? r.json() : null).catch(() => null),
        fetch(`${API_BASE}/api/bot/worker/stats`, { headers: getAuthHeaders() }).then(r => r.ok ? r.json() : null).catch(() => null),
      ]);

      if (statusRes?.data) {
        setBotStatus(statusRes.data);
        setStats(statusRes.data.stats);
      }
      setErrors(errorsRes?.data || []);
      setSuggestions(suggestionsRes?.data || []);
      setPerformance(perfRes?.data || null);
      setLogs(logsRes?.data || []);
      setWorkerStats(workerRes?.data || null);
    } catch (error) {
      console.error("Error fetching bot data:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const botAction = async (endpoint: string, method = "POST", body?: any) => {
    setActionLoading(endpoint);
    try {
      const res = await fetch(`${API_BASE}/api/bot/${endpoint}`, {
        method,
        headers: getAuthHeaders(),
        body: body ? JSON.stringify(body) : undefined,
      });
      const data = await res.json();
      if (data.success) {
        message.success(data.message || "تمت العملية بنجاح");
      } else {
        message.error(data.error || "حدث خطأ");
      }
      fetchData();
    } catch (error) {
      message.error("فشل في الاتصال");
    } finally {
      setActionLoading("");
    }
  };

  const formatUptime = (seconds: number) => {
    if (!seconds) return "0s";
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) return `${h}h ${m}m ${s}s`;
    if (m > 0) return `${m}m ${s}s`;
    return `${s}s`;
  };

  if (loading) return <LoadingSkeleton />;

  const isRunning = botStatus?.isRunning;
  const isPaused = botStatus?.isPaused;

  return (
    <div>
      <PageHeader
        title="البوت الذكي"
        subtitle="نظام ذكي لإنشاء البيانات، اكتشاف الأخطاء، وتحسين النظام"
        breadcrumbs={[
          { title: "الرئيسية", href: "/" },
          { title: "البوت الذكي" },
        ]}
        extra={
          <Tag
            color={isRunning ? (isPaused ? "warning" : "success") : "error"}
            style={{ fontSize: 14, padding: "4px 12px" }}
          >
            <RobotOutlined /> {isRunning ? (isPaused ? "متوقف مؤقتاً" : "يعمل") : "متوقف"}
          </Tag>
        }
      />

      {/* ─── أزرار التحكم ─── */}
      <Card size="small" style={{ marginBottom: 16, borderRadius: 12 }}>
        <Space wrap>
          {!isRunning ? (
            <Button type="primary" icon={<PlayCircleOutlined />} onClick={() => botAction("start")} loading={actionLoading === "start"} style={{ background: "#52c41a", borderColor: "#52c41a" }}>
              تشغيل
            </Button>
          ) : (
            <>
              <Button danger icon={<StopOutlined />} onClick={() => botAction("stop")} loading={actionLoading === "stop"}>
                إيقاف
              </Button>
              {isPaused ? (
                <Button type="primary" icon={<PlayCircleOutlined />} onClick={() => botAction("resume")} loading={actionLoading === "resume"}>
                  استئناف
                </Button>
              ) : (
                <Button icon={<PauseCircleOutlined />} onClick={() => botAction("pause")} loading={actionLoading === "pause"} style={{ background: "#faad14", borderColor: "#faad14", color: "#fff" }}>
                  إيقاف مؤقت
                </Button>
              )}
            </>
          )}

          <div style={{ borderLeft: "1px solid #d9d9d9", height: 24 }} />

          <Button icon={<ExperimentOutlined />} onClick={() => botAction("test")} loading={actionLoading === "test"} style={{ background: "#722ed1", borderColor: "#722ed1", color: "#fff" }}>
            اختبار فوري
          </Button>
          <Button icon={<ToolOutlined />} onClick={() => botAction("heal")} loading={actionLoading === "heal"} style={{ background: "#fa8c16", borderColor: "#fa8c16", color: "#fff" }}>
            فحص وإصلاح
          </Button>
          <Button icon={<DatabaseOutlined />} onClick={() => botAction("generate")} loading={actionLoading === "generate"} style={{ background: "#13c2c2", borderColor: "#13c2c2", color: "#fff" }}>
            إنشاء بيانات
          </Button>
          <Button icon={<BugOutlined />} onClick={() => botAction("analyze")} loading={actionLoading === "analyze"} style={{ background: "#2f54eb", borderColor: "#2f54eb", color: "#fff" }}>
            تحليل UX
          </Button>

          <div style={{ borderLeft: "1px solid #d9d9d9", height: 24 }} />

          <Button icon={<ThunderboltOutlined />} onClick={() => botAction("simulate", "POST", { scenarios: 5 })} loading={actionLoading === "simulate"} style={{ background: "#eb2f96", borderColor: "#eb2f96", color: "#fff" }}>
            محاكاة مستخدم
          </Button>

          <Popconfirm title="سيتم فحص ~840 ميزة. قد يستغرق وقتاً. متابعة؟" onConfirm={() => botAction("test-features")}>
            <Button loading={actionLoading === "test-features"} style={{ background: "linear-gradient(135deg, #722ed1, #1890ff)", borderColor: "#722ed1", color: "#fff", fontWeight: 600 }}>
              فحص 840 ميزة
            </Button>
          </Popconfirm>

          <div style={{ borderLeft: "1px solid #d9d9d9", height: 24 }} />

          {workerStats?.isWorking ? (
            <Button danger icon={<StopOutlined />} onClick={() => botAction("worker/stop")} loading={actionLoading === "worker/stop"}>
              إيقاف العامل
            </Button>
          ) : (
            <Button onClick={() => botAction("worker/start", "POST", { interval: 3000 })} loading={actionLoading === "worker/start"} style={{ background: "linear-gradient(135deg, #52c41a, #13c2c2)", borderColor: "#52c41a", color: "#fff", fontWeight: 600 }}>
              تشغيل العامل الواقعي
            </Button>
          )}
        </Space>
      </Card>

      {/* ─── بانر العامل ─── */}
      {workerStats?.isWorking && (
        <Card size="small" style={{ marginBottom: 16, background: "linear-gradient(135deg, #52c41a, #13c2c2)", borderRadius: 12, border: "none" }}>
          <Row gutter={16} align="middle">
            <Col flex="auto">
              <Space>
                <span style={{ fontSize: 24 }}>🏭</span>
                <span style={{ color: "#fff", fontWeight: 600, fontSize: 16 }}>العامل الواقعي يعمل الآن!</span>
                <Tag color="rgba(255,255,255,0.3)" style={{ color: "#fff" }}>{workerStats.runtime}</Tag>
              </Space>
            </Col>
            <Col>
              <Space size={24}>
                <Statistic title={<span style={{ color: "rgba(255,255,255,0.7)" }}>عملاء</span>} value={workerStats.customersCreated} valueStyle={{ color: "#fff" }} />
                <Statistic title={<span style={{ color: "rgba(255,255,255,0.7)" }}>منتجات</span>} value={workerStats.productsCreated} valueStyle={{ color: "#fff" }} />
                <Statistic title={<span style={{ color: "rgba(255,255,255,0.7)" }}>فواتير</span>} value={workerStats.invoicesCreated} valueStyle={{ color: "#fff" }} />
                <Statistic title={<span style={{ color: "rgba(255,255,255,0.7)" }}>مبيعات</span>} value={workerStats.totalSales?.toLocaleString()} valueStyle={{ color: "#fff" }} suffix="د.ع" />
              </Space>
            </Col>
          </Row>
        </Card>
      )}

      {/* ─── الإحصائيات ─── */}
      <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
        {[
          { title: "وقت التشغيل", value: formatUptime(stats?.uptime || 0), icon: <ClockCircleOutlined />, color: "#1890ff" },
          { title: "الاختبارات", value: `${stats?.passedTests || 0}/${stats?.totalTests || 0}`, icon: <ExperimentOutlined />, color: "#722ed1" },
          { title: "أخطاء مكتشفة", value: stats?.errorsFound || 0, icon: <BugOutlined />, color: "#ff4d4f" },
          { title: "أخطاء مُصلحة", value: stats?.errorsFixed || 0, icon: <ToolOutlined />, color: "#52c41a" },
          { title: "فواتير منشأة", value: stats?.invoicesCreated || 0, icon: <FileTextOutlined />, color: "#1890ff" },
          { title: "الاقتراحات", value: stats?.suggestionsGenerated || 0, icon: <SettingOutlined />, color: "#faad14" },
          { title: "جلسات محاكاة", value: stats?.simulationSessions || 0, icon: <ThunderboltOutlined />, color: "#eb2f96" },
          { title: "سيناريوهات", value: `${stats?.simulationSuccessful || 0}/${stats?.simulationScenarios || 0}`, icon: <CheckCircleOutlined />, color: "#13c2c2" },
        ].map((item, i) => (
          <Col xs={12} sm={8} md={6} lg={3} key={i}>
            <Card size="small" style={{ borderRadius: 10, borderTop: `3px solid ${item.color}` }}>
              <Statistic
                title={<span style={{ fontSize: 12 }}>{item.title}</span>}
                value={item.value}
                prefix={item.icon}
                valueStyle={{ fontSize: 18, color: item.color }}
              />
            </Card>
          </Col>
        ))}
      </Row>

      {/* ─── التبويبات ─── */}
      <Card style={{ borderRadius: 12 }}>
        <Tabs
          items={[
            {
              key: "overview",
              label: <Space><BarChartOutlined /> نظرة عامة</Space>,
              children: (
                <Row gutter={16}>
                  <Col xs={24} md={12}>
                    <h4 style={{ marginBottom: 12 }}>النشاط الأخير</h4>
                    {logs.length === 0 ? (
                      <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="لا يوجد نشاط" />
                    ) : (
                      logs.slice(0, 10).map((log: any, i: number) => (
                        <div key={i} style={{ padding: "6px 10px", background: "#fafafa", borderRadius: 6, marginBottom: 6, fontSize: 13 }}>
                          <Tag color="blue" style={{ marginLeft: 8 }}>{log.action}</Tag>
                          <span style={{ color: "#999", fontSize: 11 }}>
                            {new Date(log.created_at).toLocaleTimeString("ar-IQ")}
                          </span>
                        </div>
                      ))
                    )}
                  </Col>
                  <Col xs={24} md={12}>
                    <h4 style={{ marginBottom: 12 }}>ملخص الأداء</h4>
                    {performance?.summary ? (
                      <Space direction="vertical" style={{ width: "100%" }}>
                        <div>
                          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                            <span>المعالج (CPU)</span>
                            <span>{performance.summary.avgCpuUsage}%</span>
                          </div>
                          <Progress percent={performance.summary.avgCpuUsage} showInfo={false} strokeColor={performance.summary.avgCpuUsage > 80 ? "#ff4d4f" : "#52c41a"} />
                        </div>
                        <div>
                          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                            <span>الذاكرة</span>
                            <span>{performance.summary.avgMemoryUsage}%</span>
                          </div>
                          <Progress percent={performance.summary.avgMemoryUsage} showInfo={false} strokeColor={performance.summary.avgMemoryUsage > 80 ? "#ff4d4f" : "#1890ff"} />
                        </div>
                        <Statistic title="متوسط وقت الاستعلام" value={performance.summary.avgDbQueryTime} suffix="ms" />
                      </Space>
                    ) : (
                      <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="لا توجد بيانات" />
                    )}
                  </Col>
                </Row>
              ),
            },
            {
              key: "errors",
              label: <Space><CloseCircleOutlined /> الأخطاء ({errors.length})</Space>,
              children: errors.length === 0 ? (
                <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={<><CheckCircleOutlined style={{ color: "#52c41a" }} /> لا توجد أخطاء</>} />
              ) : (
                errors.map((err: any, i: number) => (
                  <Card key={i} size="small" style={{ marginBottom: 8, borderRight: "3px solid #ff4d4f", borderRadius: 8 }}>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <Tag color="error">{err.source}</Tag>
                      <span style={{ fontSize: 11, color: "#999" }}>{new Date(err.timestamp).toLocaleString("ar-IQ")}</span>
                    </div>
                    <p style={{ margin: "4px 0 0", fontSize: 13 }}>{err.message}</p>
                  </Card>
                ))
              ),
            },
            {
              key: "suggestions",
              label: <Space><SettingOutlined /> الاقتراحات ({suggestions.length})</Space>,
              children: suggestions.length === 0 ? (
                <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="لا توجد اقتراحات" />
              ) : (
                suggestions.map((s: any, i: number) => (
                  <Card key={i} size="small" style={{ marginBottom: 8, borderRight: `3px solid ${s.priority === "high" ? "#ff4d4f" : s.priority === "medium" ? "#faad14" : "#52c41a"}`, borderRadius: 8 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <Space>
                        <Tag color={s.priority === "high" ? "red" : s.priority === "medium" ? "orange" : "green"}>{s.priority}</Tag>
                        <Tag>{s.type}</Tag>
                        <span style={{ fontSize: 12, color: "#999" }}>{s.component}</span>
                      </Space>
                      {s.status === "pending" && s.autoFix && (
                        <Button type="primary" size="small" onClick={() => botAction(`suggestions/${s.id}/apply`)}>
                          تطبيق
                        </Button>
                      )}
                    </div>
                    <p style={{ margin: "8px 0 0", fontSize: 13 }}>{s.suggestion}</p>
                  </Card>
                ))
              ),
            },
            {
              key: "performance",
              label: <Space><BarChartOutlined /> الأداء</Space>,
              children: (
                <>
                  <Row gutter={16} style={{ marginBottom: 16 }}>
                    <Col span={8}>
                      <Card size="small" style={{ borderRadius: 8, textAlign: "center" }}>
                        <Statistic title="المعالج" value={performance?.summary?.avgCpuUsage || 0} suffix="%" />
                      </Card>
                    </Col>
                    <Col span={8}>
                      <Card size="small" style={{ borderRadius: 8, textAlign: "center" }}>
                        <Statistic title="الذاكرة" value={performance?.summary?.avgMemoryUsage || 0} suffix="%" />
                      </Card>
                    </Col>
                    <Col span={8}>
                      <Card size="small" style={{ borderRadius: 8, textAlign: "center" }}>
                        <Statistic title="وقت الاستعلام" value={performance?.summary?.avgDbQueryTime || 0} suffix="ms" />
                      </Card>
                    </Col>
                  </Row>
                  <Table
                    dataSource={performance?.history || []}
                    columns={[
                      { title: "الوقت", dataIndex: "timestamp", key: "time", render: (v: string) => new Date(v).toLocaleTimeString("ar-IQ") },
                      { title: "CPU", key: "cpu", render: (_: any, r: any) => `${r.system?.cpuUsage || 0}%` },
                      { title: "الذاكرة", key: "mem", render: (_: any, r: any) => `${r.system?.memoryUsage || 0}%` },
                      { title: "DB", key: "db", render: (_: any, r: any) => `${r.database?.queryTime || 0}ms` },
                    ]}
                    pagination={false}
                    size="small"
                    rowKey={(_, i) => String(i)}
                  />
                </>
              ),
            },
            {
              key: "logs",
              label: <Space><FileTextOutlined /> السجلات</Space>,
              children: (
                <div style={{ maxHeight: 400, overflow: "auto" }}>
                  {logs.map((log: any, i: number) => (
                    <div key={i} style={{ padding: "4px 8px", background: i % 2 === 0 ? "#fafafa" : "#fff", fontFamily: "monospace", fontSize: 12 }}>
                      <span style={{ color: "#999" }}>[{new Date(log.created_at).toLocaleString("ar-IQ")}]</span>{" "}
                      <span style={{ color: "#1890ff", fontWeight: 500 }}>{log.action}</span>{" "}
                      {log.data && log.data !== "{}" && <span style={{ color: "#666" }}>{log.data}</span>}
                    </div>
                  ))}
                </div>
              ),
            },
          ]}
        />
      </Card>
    </div>
  );
}
