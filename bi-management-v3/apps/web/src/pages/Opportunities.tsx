import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Row, Col, Card, Table, Button, Tag, Space, message, Statistic, Empty, Progress } from "antd";
import { AppstoreOutlined, UnorderedListOutlined, EyeOutlined, DollarOutlined, TrophyOutlined, PercentageOutlined } from "@ant-design/icons";
import { PageHeader, StatusTag, MoneyDisplay, LoadingSkeleton } from "../components/shared";
import { API_BASE, getAuthHeaders } from "../utils/api";
import type { ColumnsType } from "antd/es/table";

type Opportunity = {
  id: string;
  code: string | null;
  title: string;
  stage: string;
  probability: number;
  expectedValue: number | null;
  actualValue: number | null;
  expectedCloseDate: string | null;
  customer: { id: string; name: string } | null;
  assignedUser: { id: string; fullName: string } | null;
};

type OppStats = {
  total: number;
  byStage: {
    prospecting: number;
    proposal: number;
    negotiation: number;
    closedWon: number;
    closedLost: number;
  };
  totalValue: number;
  wonValue: number;
};

const STAGES = [
  { key: "prospecting", label: "استكشاف", color: "#6366f1" },
  { key: "qualification", label: "تأهيل", color: "#8b5cf6" },
  { key: "proposal", label: "عرض سعر", color: "#f59e0b" },
  { key: "negotiation", label: "تفاوض", color: "#f97316" },
  { key: "closed_won", label: "فوز", color: "#22c55e" },
  { key: "closed_lost", label: "خسارة", color: "#ef4444" },
];

const STAGE_CONFIG: Record<string, { color: string; label: string }> = {};
STAGES.forEach((s) => {
  STAGE_CONFIG[s.key] = { color: s.color, label: s.label };
});

export default function Opportunities() {
  const [data, setData] = useState<Opportunity[]>([]);
  const [stats, setStats] = useState<OppStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [stageFilter, setStageFilter] = useState("");
  const [viewMode, setViewMode] = useState<"list" | "kanban">("list");

  useEffect(() => {
    document.title = "الفرص البيعية | BI Management v3";
  }, []);

  const loadData = () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (stageFilter) params.append("stage", stageFilter);

    Promise.all([
      fetch(`${API_BASE}/api/opportunities?${params}`, { headers: getAuthHeaders() }).then((r) => r.json()),
      fetch(`${API_BASE}/api/opportunities/stats`, { headers: getAuthHeaders() }).then((r) => r.json()),
    ])
      .then(([oppsRes, statsRes]) => {
        setData(oppsRes.items || []);
        setStats(statsRes);
      })
      .catch((e) => message.error(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
  }, [stageFilter]);

  const getOppsByStage = (stage: string) => data.filter((opp) => opp.stage === stage);

  const formatCurrency = (n: number | null) => {
    if (!n) return "-";
    return n.toLocaleString() + " IQD";
  };

  const columns: ColumnsType<Opportunity> = [
    {
      title: "الفرصة",
      dataIndex: "title",
      key: "title",
      render: (_, record) => (
        <div>
          <div style={{ fontWeight: 500 }}>{record.title}</div>
          <div style={{ fontSize: "0.8rem", color: "#64748b" }}>{record.code}</div>
        </div>
      ),
    },
    {
      title: "العميل",
      dataIndex: "customer",
      key: "customer",
      render: (customer) => customer?.name || "-",
    },
    {
      title: "القيمة المتوقعة",
      dataIndex: "expectedValue",
      key: "expectedValue",
      render: (value) => <MoneyDisplay amount={value} />,
    },
    {
      title: "الاحتمالية",
      dataIndex: "probability",
      key: "probability",
      render: (probability) => (
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Progress percent={probability} size="small" style={{ width: 80 }} showInfo={false} />
          <span style={{ fontSize: "0.8rem", color: "#64748b" }}>{probability}%</span>
        </div>
      ),
    },
    {
      title: "المرحلة",
      dataIndex: "stage",
      key: "stage",
      render: (stage) => {
        const stageInfo = STAGES.find((s) => s.key === stage) || { label: stage, color: "#64748b" };
        return <Tag color={stageInfo.color}>{stageInfo.label}</Tag>;
      },
    },
    {
      title: "إجراءات",
      key: "actions",
      render: (_, record) => (
        <Link to={`/crm/opportunities/${record.id}`}>
          <Button type="text" icon={<EyeOutlined />}>
            التفاصيل
          </Button>
        </Link>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="الفرص البيعية"
        subtitle="متابعة وإدارة الفرص البيعية"
        breadcrumbs={[
          { label: "CRM", path: "/crm" },
          { label: "الفرص البيعية" },
        ]}
        extra={
          <Space>
            <Button
              icon={viewMode === "list" ? <AppstoreOutlined /> : <UnorderedListOutlined />}
              onClick={() => setViewMode(viewMode === "list" ? "kanban" : "list")}
            >
              {viewMode === "list" ? "عرض Kanban" : "عرض قائمة"}
            </Button>
            <Link to="/crm/leads">
              <Button>العملاء المحتملين</Button>
            </Link>
          </Space>
        }
      />

      {/* Stats Cards */}
      {stats && (
        <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
          <Col xs={12} sm={6}>
            <Card>
              <Statistic
                title="إجمالي الفرص"
                value={stats.total}
                valueStyle={{ color: "#1d4ed8" }}
                prefix={<DollarOutlined />}
              />
            </Card>
          </Col>
          <Col xs={12} sm={6}>
            <Card>
              <Statistic
                title="القيمة المتوقعة"
                value={stats.totalValue}
                valueStyle={{ color: "#7c3aed" }}
                formatter={(value) => formatCurrency(Number(value))}
              />
            </Card>
          </Col>
          <Col xs={12} sm={6}>
            <Card>
              <Statistic
                title="الصفقات الرابحة"
                value={stats.wonValue}
                valueStyle={{ color: "#15803d" }}
                prefix={<TrophyOutlined />}
                formatter={(value) => formatCurrency(Number(value))}
              />
            </Card>
          </Col>
          <Col xs={12} sm={6}>
            <Card>
              <Statistic
                title="معدل التحويل"
                value={stats.total > 0 ? ((stats.byStage.closedWon / stats.total) * 100).toFixed(0) : 0}
                valueStyle={{ color: "#b45309" }}
                prefix={<PercentageOutlined />}
                suffix="%"
              />
            </Card>
          </Col>
        </Row>
      )}

      {loading ? (
        <Card>
          <LoadingSkeleton />
        </Card>
      ) : viewMode === "kanban" ? (
        /* Kanban View */
        <div style={{ display: "flex", gap: 16, overflowX: "auto", paddingBottom: 16 }}>
          {STAGES.map((stage) => (
            <Card
              key={stage.key}
              title={
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{ width: 10, height: 10, borderRadius: "50%", background: stage.color }} />
                  <span>{stage.label}</span>
                  <Tag>{getOppsByStage(stage.key).length}</Tag>
                </div>
              }
              style={{ minWidth: 280, flex: "0 0 280px" }}
              bodyStyle={{ minHeight: 400, background: "#f8fafc", padding: 8 }}
            >
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {getOppsByStage(stage.key).map((opp) => (
                  <Link key={opp.id} to={`/crm/opportunities/${opp.id}`} style={{ textDecoration: "none" }}>
                    <Card size="small" hoverable>
                      <div style={{ fontWeight: 500, marginBottom: 4 }}>{opp.title}</div>
                      <div style={{ fontSize: "0.8rem", color: "#64748b", marginBottom: 8 }}>
                        {opp.customer?.name || "بدون عميل"}
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span style={{ fontWeight: 600, color: stage.color }}>{formatCurrency(opp.expectedValue)}</span>
                        <span style={{ fontSize: "0.75rem", color: "#94a3b8" }}>{opp.probability}%</span>
                      </div>
                    </Card>
                  </Link>
                ))}
                {getOppsByStage(stage.key).length === 0 && (
                  <Empty description="لا توجد فرص" image={Empty.PRESENTED_IMAGE_SIMPLE} />
                )}
              </div>
            </Card>
          ))}
        </div>
      ) : (
        /* List View */
        <Card>
          {data.length === 0 ? (
            <Empty description="لا توجد فرص" image={Empty.PRESENTED_IMAGE_SIMPLE} />
          ) : (
            <Table
              columns={columns}
              dataSource={data}
              rowKey="id"
              pagination={{ pageSize: 10, showSizeChanger: true, showTotal: (total) => `${total} فرصة` }}
            />
          )}
        </Card>
      )}
    </div>
  );
}
