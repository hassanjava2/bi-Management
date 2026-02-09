import { useEffect, useState } from "react";
import { Row, Col, Card, Button, Tabs, Tag, Empty, Spin, Alert, Statistic } from "antd";
import {
  ApiOutlined,
  LinkOutlined,
  CloudOutlined,
  PlusOutlined,
  PlayCircleOutlined,
  KeyOutlined,
} from "@ant-design/icons";
import { PageHeader } from "../components/shared";
import { API_BASE, getAuthHeaders } from "../utils/api";

type ApiKey = {
  id: string;
  name: string;
  keyPrefix: string | null;
  permissions: string[] | null;
  rateLimit: number | null;
  isActive: number | null;
  lastUsedAt: string | null;
  createdAt: string | null;
};
type Webhook = {
  id: string;
  name: string;
  url: string;
  events: string[] | null;
  isActive: number | null;
  successCount: number | null;
  failureCount: number | null;
  lastTriggeredAt: string | null;
};
type Integration = {
  id: string;
  name: string;
  type: string;
  provider: string | null;
  isActive: number | null;
  isConfigured: number | null;
  lastSyncAt: string | null;
};
type Stats = {
  totalKeys: number;
  activeKeys: number;
  totalWebhooks: number;
  activeWebhooks: number;
  totalIntegrations: number;
  activeIntegrations: number;
};

export default function Integrations() {
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [webhooks, setWebhooks] = useState<Webhook[]>([]);
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState<string>("api");

  useEffect(() => {
    document.title = "التكاملات | BI Management v3";
  }, []);

  const loadData = () => {
    setLoading(true);
    Promise.all([
      fetch(`${API_BASE}/api/integrations/api-keys`, { headers: getAuthHeaders() }).then((r) => r.json()),
      fetch(`${API_BASE}/api/integrations/webhooks`, { headers: getAuthHeaders() }).then((r) => r.json()),
      fetch(`${API_BASE}/api/integrations/external`, { headers: getAuthHeaders() }).then((r) => r.json()),
      fetch(`${API_BASE}/api/integrations/stats`, { headers: getAuthHeaders() }).then((r) => r.json()),
    ])
      .then(([keysRes, webhooksRes, integrationsRes, statsRes]) => {
        setApiKeys(keysRes.items || []);
        setWebhooks(webhooksRes.items || []);
        setIntegrations(integrationsRes.items || []);
        setStats(statsRes);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateApiKey = async () => {
    const name = prompt("اسم مفتاح API:");
    if (!name) return;
    try {
      const res = await fetch(`${API_BASE}/api/integrations/api-keys`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({ name, permissions: ["read", "write"] }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      alert(`تم إنشاء المفتاح بنجاح!\n\nالمفتاح: ${data.key}\n\nاحفظ هذا المفتاح - لن يظهر مرة أخرى!`);
      loadData();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Error");
    }
  };

  const handleCreateWebhook = async () => {
    const name = prompt("اسم الويب هوك:");
    const url = prompt("URL:");
    if (!name || !url) return;
    try {
      const res = await fetch(`${API_BASE}/api/integrations/webhooks`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({ name, url, events: ["order.created", "order.updated"] }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      alert(`تم إنشاء الويب هوك!\n\nSecret: ${data.secret}`);
      loadData();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Error");
    }
  };

  const handleTestWebhook = async (id: string) => {
    try {
      const res = await fetch(`${API_BASE}/api/integrations/webhooks/${id}/test`, {
        method: "POST",
        headers: getAuthHeaders(),
      });
      if (!res.ok) throw new Error("Test failed");
      alert("تم إرسال طلب الاختبار بنجاح!");
      loadData();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Error");
    }
  };

  const formatDate = (d: string | null) =>
    d
      ? new Date(d).toLocaleDateString("ar-IQ", {
          year: "numeric",
          month: "short",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        })
      : "-";

  const tabItems = [
    {
      key: "api",
      label: (
        <span>
          <KeyOutlined /> مفاتيح API
        </span>
      ),
      children: (
        <div>
          <div style={{ marginBottom: 16 }}>
            <Button type="primary" icon={<PlusOutlined />} onClick={handleCreateApiKey}>
              مفتاح جديد
            </Button>
          </div>
          {apiKeys.length === 0 ? (
            <Empty description="لا توجد مفاتيح API" />
          ) : (
            <Row gutter={[16, 16]}>
              {apiKeys.map((key) => (
                <Col xs={24} key={key.id}>
                  <Card size="small">
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div>
                        <div style={{ fontWeight: 500, marginBottom: 4 }}>{key.name}</div>
                        <div style={{ fontSize: 13, color: "#64748b", fontFamily: "monospace" }}>
                          {key.keyPrefix}...
                        </div>
                      </div>
                      <div style={{ textAlign: "left" }}>
                        <Tag color={key.isActive ? "success" : "error"}>
                          {key.isActive ? "نشط" : "غير نشط"}
                        </Tag>
                        <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 4 }}>
                          آخر استخدام: {formatDate(key.lastUsedAt)}
                        </div>
                      </div>
                    </div>
                  </Card>
                </Col>
              ))}
            </Row>
          )}
        </div>
      ),
    },
    {
      key: "webhooks",
      label: (
        <span>
          <LinkOutlined /> الويب هوكس
        </span>
      ),
      children: (
        <div>
          <div style={{ marginBottom: 16 }}>
            <Button type="primary" icon={<PlusOutlined />} onClick={handleCreateWebhook} style={{ background: "#8b5cf6" }}>
              ويب هوك جديد
            </Button>
          </div>
          {webhooks.length === 0 ? (
            <Empty description="لا توجد ويب هوكس" />
          ) : (
            <Row gutter={[16, 16]}>
              {webhooks.map((wh) => (
                <Col xs={24} key={wh.id}>
                  <Card size="small">
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                      <div>
                        <div style={{ fontWeight: 500, marginBottom: 4 }}>{wh.name}</div>
                        <div style={{ fontSize: 13, color: "#64748b", fontFamily: "monospace" }}>{wh.url}</div>
                      </div>
                      <Tag color={wh.isActive ? "success" : "error"}>
                        {wh.isActive ? "نشط" : "غير نشط"}
                      </Tag>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div style={{ fontSize: 13, color: "#64748b" }}>
                        <span style={{ color: "#15803d" }}>{wh.successCount} نجاح</span> /{" "}
                        <span style={{ color: "#b91c1c" }}>{wh.failureCount} فشل</span>
                      </div>
                      <Button size="small" icon={<PlayCircleOutlined />} onClick={() => handleTestWebhook(wh.id)}>
                        اختبار
                      </Button>
                    </div>
                  </Card>
                </Col>
              ))}
            </Row>
          )}
        </div>
      ),
    },
    {
      key: "integrations",
      label: (
        <span>
          <CloudOutlined /> التكاملات
        </span>
      ),
      children: (
        <div>
          {integrations.length === 0 ? (
            <Empty description="لا توجد تكاملات" />
          ) : (
            <Row gutter={[16, 16]}>
              {integrations.map((int) => (
                <Col xs={24} sm={12} lg={8} key={int.id}>
                  <Card>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
                      <div>
                        <div style={{ fontWeight: 600, marginBottom: 4 }}>{int.name}</div>
                        <div style={{ fontSize: 13, color: "#64748b" }}>{int.provider || int.type}</div>
                      </div>
                      <Tag color={int.isActive ? "success" : "default"}>
                        {int.isActive ? "متصل" : "غير متصل"}
                      </Tag>
                    </div>
                    <div style={{ fontSize: 13, color: "#94a3b8" }}>آخر مزامنة: {formatDate(int.lastSyncAt)}</div>
                  </Card>
                </Col>
              ))}
            </Row>
          )}
        </div>
      ),
    },
  ];

  return (
    <div style={{ padding: 24 }}>
      <PageHeader
        title="التكاملات"
        subtitle="إدارة API Keys والويب هوكس والتكاملات الخارجية"
        breadcrumbs={[
          { label: "الرئيسية", path: "/" },
          { label: "الإعدادات", path: "/settings" },
          { label: "التكاملات" },
        ]}
      />

      {stats && (
        <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
          <Col xs={24} sm={8}>
            <Card style={{ background: "linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%)" }}>
              <Statistic
                title={<span style={{ color: "#1e40af" }}>مفاتيح API</span>}
                value={stats.activeKeys}
                suffix={`/ ${stats.totalKeys}`}
                prefix={<ApiOutlined style={{ color: "#1d4ed8" }} />}
                valueStyle={{ color: "#1d4ed8" }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={8}>
            <Card style={{ background: "linear-gradient(135deg, #f3e8ff 0%, #e9d5ff 100%)" }}>
              <Statistic
                title={<span style={{ color: "#6b21a8" }}>الويب هوكس</span>}
                value={stats.activeWebhooks}
                suffix={`/ ${stats.totalWebhooks}`}
                prefix={<LinkOutlined style={{ color: "#7c3aed" }} />}
                valueStyle={{ color: "#7c3aed" }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={8}>
            <Card style={{ background: "linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%)" }}>
              <Statistic
                title={<span style={{ color: "#166534" }}>التكاملات</span>}
                value={stats.activeIntegrations}
                suffix={`/ ${stats.totalIntegrations}`}
                prefix={<CloudOutlined style={{ color: "#15803d" }} />}
                valueStyle={{ color: "#15803d" }}
              />
            </Card>
          </Col>
        </Row>
      )}

      {error && <Alert message={error} type="error" showIcon style={{ marginBottom: 16 }} />}

      <Card>
        {loading ? (
          <div style={{ textAlign: "center", padding: 48 }}>
            <Spin size="large" />
            <div style={{ marginTop: 16, color: "#64748b" }}>جاري التحميل...</div>
          </div>
        ) : (
          <Tabs activeKey={activeTab} onChange={setActiveTab} items={tabItems} />
        )}
      </Card>
    </div>
  );
}
