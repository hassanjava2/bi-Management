import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Row, Col, Card, Button, Select, Progress, Empty, message } from "antd";
import { Statistic } from "antd";
import {
  PlusOutlined,
  ProjectOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  DollarOutlined,
} from "@ant-design/icons";
import { PageHeader, StatusTag, MoneyDisplay, DateDisplay, LoadingSkeleton } from "../components/shared";
import { API_BASE, getAuthHeaders } from "../utils/api";

type Project = {
  id: string;
  code: string | null;
  name: string;
  status: string | null;
  priority: string | null;
  startDate: string | null;
  endDate: string | null;
  progress: number | null;
  estimatedBudget: number | null;
  completedTasks: number | null;
  totalTasks: number | null;
  customer: { id: string; name: string } | null;
  manager: { id: string; name: string } | null;
};

type ProjectStats = {
  total: number;
  active: number;
  completed: number;
  totalBudget: number;
  totalCost: number;
};

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  planning: { label: "تخطيط", color: "default" },
  active: { label: "نشط", color: "green" },
  on_hold: { label: "معلق", color: "orange" },
  completed: { label: "مكتمل", color: "blue" },
  cancelled: { label: "ملغي", color: "red" },
};

export default function Projects() {
  const navigate = useNavigate();
  const [projects, setProjects] = useState<Project[]>([]);
  const [stats, setStats] = useState<ProjectStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");

  useEffect(() => {
    document.title = "إدارة المشاريع | BI Management v3";
  }, []);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (statusFilter) params.append("status", statusFilter);

    Promise.all([
      fetch(`${API_BASE}/api/projects?${params}`, { headers: getAuthHeaders() }).then((r) => r.json()),
      fetch(`${API_BASE}/api/projects/stats`, { headers: getAuthHeaders() }).then((r) => r.json()),
    ])
      .then(([projectsRes, statsRes]) => {
        setProjects(projectsRes.items || []);
        setStats(statsRes);
      })
      .catch((e) => {
        setError(e.message);
        message.error("فشل في تحميل البيانات");
      })
      .finally(() => setLoading(false));
  }, [statusFilter]);

  const getStatusConfig = (status: string | null) => {
    return STATUS_MAP[status || ""] || { label: status || "-", color: "default" };
  };

  if (loading && !stats) {
    return (
      <div>
        <PageHeader
          title="إدارة المشاريع"
          subtitle="متابعة المشاريع والمهام"
          breadcrumbs={[{ title: "المشاريع" }]}
        />
        <LoadingSkeleton type="card" rows={6} />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="إدارة المشاريع"
        subtitle="متابعة المشاريع والمهام"
        breadcrumbs={[{ title: "المشاريع" }]}
        extra={
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => navigate("/projects/new")}
          >
            مشروع جديد
          </Button>
        }
      />

      {/* Stats Cards */}
      {stats && (
        <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
          <Col xs={24} sm={12} md={6}>
            <Card>
              <Statistic
                title="إجمالي المشاريع"
                value={stats.total}
                prefix={<ProjectOutlined style={{ color: "#1890ff" }} />}
                valueStyle={{ color: "#1890ff" }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Card>
              <Statistic
                title="نشطة"
                value={stats.active}
                prefix={<ClockCircleOutlined style={{ color: "#52c41a" }} />}
                valueStyle={{ color: "#52c41a" }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Card>
              <Statistic
                title="مكتملة"
                value={stats.completed}
                prefix={<CheckCircleOutlined style={{ color: "#722ed1" }} />}
                valueStyle={{ color: "#722ed1" }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Card>
              <Statistic
                title="إجمالي الميزانية"
                value={stats.totalBudget}
                prefix={<DollarOutlined style={{ color: "#faad14" }} />}
                valueStyle={{ color: "#faad14", fontSize: 20 }}
                suffix="د.ع"
                formatter={(value) => Number(value).toLocaleString("ar-IQ")}
              />
            </Card>
          </Col>
        </Row>
      )}

      {/* Filters */}
      <Card style={{ marginBottom: 16 }}>
        <Row gutter={16} align="middle">
          <Col>
            <span style={{ marginLeft: 8 }}>الحالة:</span>
            <Select
              value={statusFilter}
              onChange={setStatusFilter}
              style={{ width: 150 }}
              allowClear
              placeholder="جميع الحالات"
            >
              <Select.Option value="">جميع الحالات</Select.Option>
              <Select.Option value="planning">تخطيط</Select.Option>
              <Select.Option value="active">نشط</Select.Option>
              <Select.Option value="on_hold">معلق</Select.Option>
              <Select.Option value="completed">مكتمل</Select.Option>
            </Select>
          </Col>
        </Row>
      </Card>

      {/* Projects Grid */}
      {loading ? (
        <LoadingSkeleton type="card" rows={4} />
      ) : projects.length === 0 ? (
        <Card>
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description="لا توجد مشاريع"
          >
            <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate("/projects/new")}>
              إنشاء مشروع جديد
            </Button>
          </Empty>
        </Card>
      ) : (
        <Row gutter={[16, 16]}>
          {projects.map((project) => {
            const statusConfig = getStatusConfig(project.status);
            return (
              <Col xs={24} sm={12} lg={8} xl={6} key={project.id}>
                <Card
                  hoverable
                  onClick={() => navigate(`/projects/${project.id}`)}
                  styles={{ body: { padding: 20 } }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                    <div>
                      <div style={{ fontSize: 16, fontWeight: 600, color: "#1e293b", marginBottom: 4 }}>
                        {project.name}
                      </div>
                      <div style={{ fontSize: 12, color: "#64748b", fontFamily: "monospace" }}>
                        {project.code}
                      </div>
                    </div>
                    <StatusTag status={project.status || "draft"} customLabel={statusConfig.label} />
                  </div>

                  <div style={{ marginBottom: 16 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                      <span style={{ color: "#64748b", fontSize: 13 }}>التقدم</span>
                      <span style={{ fontWeight: 500 }}>{project.progress || 0}%</span>
                    </div>
                    <Progress
                      percent={project.progress || 0}
                      showInfo={false}
                      strokeColor="#8b5cf6"
                      trailColor="#f1f5f9"
                    />
                  </div>

                  <Row gutter={[12, 12]} style={{ marginBottom: 12 }}>
                    <Col span={12}>
                      <div style={{ fontSize: 12, color: "#94a3b8" }}>العميل</div>
                      <div style={{ fontWeight: 500, fontSize: 13 }}>{project.customer?.name || "-"}</div>
                    </Col>
                    <Col span={12}>
                      <div style={{ fontSize: 12, color: "#94a3b8" }}>المدير</div>
                      <div style={{ fontWeight: 500, fontSize: 13 }}>{project.manager?.name || "-"}</div>
                    </Col>
                    <Col span={12}>
                      <div style={{ fontSize: 12, color: "#94a3b8" }}>المهام</div>
                      <div style={{ fontWeight: 500, fontSize: 13 }}>
                        {project.completedTasks || 0} / {project.totalTasks || 0}
                      </div>
                    </Col>
                    <Col span={12}>
                      <div style={{ fontSize: 12, color: "#94a3b8" }}>الميزانية</div>
                      <div style={{ fontWeight: 500, fontSize: 13 }}>
                        <MoneyDisplay amount={project.estimatedBudget || 0} size="small" />
                      </div>
                    </Col>
                  </Row>

                  <div style={{ borderTop: "1px solid #f1f5f9", paddingTop: 12, fontSize: 12, color: "#64748b" }}>
                    <DateDisplay date={project.startDate} /> - <DateDisplay date={project.endDate} />
                  </div>
                </Card>
              </Col>
            );
          })}
        </Row>
      )}
    </div>
  );
}
