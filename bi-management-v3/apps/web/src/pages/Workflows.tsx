import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Row, Col, Card, Table, Button, Select, Tag, Space, message, Statistic, Empty, Tabs } from "antd";
import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  ClockCircleOutlined,
  BellOutlined,
  ExclamationCircleOutlined,
  FileTextOutlined,
} from "@ant-design/icons";
import { PageHeader, StatusTag, DateDisplay, LoadingSkeleton } from "../components/shared";
import { API_BASE, getAuthHeaders } from "../utils/api";

type WorkflowInstance = {
  id: string;
  code: string | null;
  entityType: string;
  entityId: string;
  currentStep: number | null;
  status: string | null;
  priority: string | null;
  requestedAt: string | null;
  template: { id: string; name: string; nameAr: string | null } | null;
  requester: { id: string; name: string } | null;
};

type WorkflowStats = {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
};

type PendingApproval = {
  id: string;
  stepName: string | null;
  status: string | null;
  createdAt: string | null;
  instance: {
    id: string;
    code: string | null;
    entityType: string;
    priority: string | null;
  } | null;
  template: { name: string; nameAr: string | null } | null;
};

const statusConfig: Record<string, { color: string; text: string }> = {
  pending: { color: "warning", text: "قيد الانتظار" },
  approved: { color: "success", text: "تمت الموافقة" },
  rejected: { color: "error", text: "مرفوض" },
  cancelled: { color: "default", text: "ملغي" },
};

const priorityConfig: Record<string, { color: string; text: string }> = {
  low: { color: "default", text: "منخفض" },
  normal: { color: "blue", text: "عادي" },
  high: { color: "orange", text: "مرتفع" },
  urgent: { color: "red", text: "عاجل" },
};

const entityTypeNames: Record<string, string> = {
  invoice: "فاتورة",
  voucher: "سند",
  purchase: "طلب شراء",
  leave: "إجازة",
  expense: "مصروف",
  general: "عام",
};

export default function Workflows() {
  const [instances, setInstances] = useState<WorkflowInstance[]>([]);
  const [pending, setPending] = useState<PendingApproval[]>([]);
  const [stats, setStats] = useState<WorkflowStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [activeTab, setActiveTab] = useState<string>("pending");

  useEffect(() => {
    document.title = "سير العمل والموافقات | BI Management v3";
  }, []);

  const loadData = () => {
    setLoading(true);
    const userId = localStorage.getItem("userId") || "";

    const params = new URLSearchParams();
    if (statusFilter) params.append("status", statusFilter);

    Promise.all([
      fetch(`${API_BASE}/api/workflows/instances?${params}`, { headers: getAuthHeaders() }).then((r) => r.json()),
      fetch(`${API_BASE}/api/workflows/instances/stats`, { headers: getAuthHeaders() }).then((r) => r.json()),
      fetch(`${API_BASE}/api/workflows/pending?userId=${userId}`, { headers: getAuthHeaders() }).then((r) => r.json()),
    ])
      .then(([instancesRes, statsRes, pendingRes]) => {
        setInstances(instancesRes.items || []);
        setStats(statsRes);
        setPending(pendingRes.items || []);
      })
      .catch((e) => {
        setError(e.message);
        message.error("فشل في تحميل البيانات");
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
  }, [statusFilter]);

  const handleApprove = async (instanceId: string) => {
    const userId = localStorage.getItem("userId") || "";
    const comments = prompt("ملاحظات الموافقة (اختياري):");

    try {
      const res = await fetch(`${API_BASE}/api/workflows/instances/${instanceId}/approve`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({ userId, comments }),
      });

      if (!res.ok) throw new Error("Failed to approve");
      message.success("تمت الموافقة بنجاح");
      loadData();
    } catch (err) {
      message.error(err instanceof Error ? err.message : "حدث خطأ");
    }
  };

  const handleReject = async (instanceId: string) => {
    const userId = localStorage.getItem("userId") || "";
    const comments = prompt("سبب الرفض:");
    if (!comments) return;

    try {
      const res = await fetch(`${API_BASE}/api/workflows/instances/${instanceId}/reject`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({ userId, comments }),
      });

      if (!res.ok) throw new Error("Failed to reject");
      message.success("تم الرفض بنجاح");
      loadData();
    } catch (err) {
      message.error(err instanceof Error ? err.message : "حدث خطأ");
    }
  };

  const columns = [
    {
      title: "الرقم",
      dataIndex: "code",
      key: "code",
      render: (code: string | null) => <code>{code || "-"}</code>,
    },
    {
      title: "النوع",
      dataIndex: "entityType",
      key: "entityType",
      render: (type: string) => entityTypeNames[type] || type,
    },
    {
      title: "القالب",
      dataIndex: "template",
      key: "template",
      render: (template: WorkflowInstance["template"]) => template?.nameAr || template?.name || "-",
    },
    {
      title: "مقدم الطلب",
      dataIndex: "requester",
      key: "requester",
      render: (requester: WorkflowInstance["requester"]) => requester?.name || "-",
    },
    {
      title: "الأولوية",
      dataIndex: "priority",
      key: "priority",
      render: (priority: string | null) => {
        const config = priorityConfig[priority || ""] || { color: "default", text: priority || "-" };
        return <Tag color={config.color}>{config.text}</Tag>;
      },
    },
    {
      title: "الحالة",
      dataIndex: "status",
      key: "status",
      render: (status: string | null) => {
        const config = statusConfig[status || ""] || { color: "default", text: status || "-" };
        return <StatusTag status={status || ""} color={config.color} text={config.text} />;
      },
    },
    {
      title: "التاريخ",
      dataIndex: "requestedAt",
      key: "requestedAt",
      render: (date: string | null) => <DateDisplay date={date} showTime />,
    },
  ];

  const tabItems = [
    {
      key: "pending",
      label: `بانتظار موافقتي (${pending.length})`,
      children: (
        <div>
          {pending.length === 0 ? (
            <Empty
              image={<CheckCircleOutlined style={{ fontSize: 64, color: "#52c41a" }} />}
              description="لا توجد طلبات بانتظار موافقتك"
            />
          ) : (
            <Row gutter={[16, 16]}>
              {pending.map((item) => (
                <Col xs={24} key={item.id}>
                  <Card
                    style={{
                      borderRight: `4px solid ${
                        item.instance?.priority === "urgent"
                          ? "#ff4d4f"
                          : item.instance?.priority === "high"
                          ? "#fa8c16"
                          : "#1890ff"
                      }`,
                    }}
                  >
                    <Row justify="space-between" align="top">
                      <Col>
                        <h3 style={{ margin: 0, fontSize: "1.1rem" }}>
                          {item.template?.nameAr || item.template?.name || "طلب موافقة"}
                        </h3>
                        <p style={{ margin: "4px 0 0", color: "#8c8c8c" }}>
                          {item.instance?.code} - {entityTypeNames[item.instance?.entityType || ""] || item.instance?.entityType}
                        </p>
                      </Col>
                      <Col>
                        <Tag color={priorityConfig[item.instance?.priority || ""]?.color || "default"}>
                          {priorityConfig[item.instance?.priority || ""]?.text || item.instance?.priority || "-"}
                        </Tag>
                      </Col>
                    </Row>

                    <Row gutter={32} style={{ margin: "16px 0" }}>
                      <Col>
                        <span style={{ color: "#8c8c8c" }}>الخطوة: </span>
                        {item.stepName || "-"}
                      </Col>
                      <Col>
                        <span style={{ color: "#8c8c8c" }}>التاريخ: </span>
                        <DateDisplay date={item.createdAt} showTime />
                      </Col>
                    </Row>

                    <Space>
                      <Button
                        type="primary"
                        icon={<CheckCircleOutlined />}
                        onClick={() => handleApprove(item.instance?.id || "")}
                        style={{ background: "#52c41a", borderColor: "#52c41a" }}
                      >
                        موافقة
                      </Button>
                      <Button
                        danger
                        icon={<CloseCircleOutlined />}
                        onClick={() => handleReject(item.instance?.id || "")}
                      >
                        رفض
                      </Button>
                    </Space>
                  </Card>
                </Col>
              ))}
            </Row>
          )}
        </div>
      ),
    },
    {
      key: "all",
      label: "جميع الطلبات",
      children: (
        <div>
          <Space style={{ marginBottom: 16 }}>
            <Select
              value={statusFilter}
              onChange={setStatusFilter}
              style={{ minWidth: 150 }}
              placeholder="جميع الحالات"
              allowClear
            >
              <Select.Option value="">جميع الحالات</Select.Option>
              <Select.Option value="pending">قيد الانتظار</Select.Option>
              <Select.Option value="approved">تمت الموافقة</Select.Option>
              <Select.Option value="rejected">مرفوض</Select.Option>
            </Select>
          </Space>

          <Table
            dataSource={instances}
            columns={columns}
            rowKey="id"
            loading={loading}
            locale={{ emptyText: <Empty description="لا توجد طلبات" /> }}
            pagination={{ pageSize: 10, showSizeChanger: true, showTotal: (total) => `إجمالي ${total} طلب` }}
          />
        </div>
      ),
    },
  ];

  if (loading && !stats) {
    return <LoadingSkeleton />;
  }

  return (
    <div>
      <PageHeader
        title="سير العمل والموافقات"
        subtitle="إدارة طلبات الموافقة وسير العمل"
        breadcrumbs={[
          { label: "الرئيسية", path: "/" },
          { label: "سير العمل والموافقات" },
        ]}
        extra={
          <Link to="/notifications">
            <Button icon={<BellOutlined />}>الإشعارات</Button>
          </Link>
        }
      />

      {stats && (
        <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
          <Col xs={12} sm={6}>
            <Card>
              <Statistic
                title="إجمالي الطلبات"
                value={stats.total}
                prefix={<FileTextOutlined />}
                valueStyle={{ color: "#1890ff" }}
              />
            </Card>
          </Col>
          <Col xs={12} sm={6}>
            <Card>
              <Statistic
                title="قيد الانتظار"
                value={stats.pending}
                prefix={<ClockCircleOutlined />}
                valueStyle={{ color: "#faad14" }}
              />
            </Card>
          </Col>
          <Col xs={12} sm={6}>
            <Card>
              <Statistic
                title="تمت الموافقة"
                value={stats.approved}
                prefix={<CheckCircleOutlined />}
                valueStyle={{ color: "#52c41a" }}
              />
            </Card>
          </Col>
          <Col xs={12} sm={6}>
            <Card>
              <Statistic
                title="مرفوض"
                value={stats.rejected}
                prefix={<CloseCircleOutlined />}
                valueStyle={{ color: "#ff4d4f" }}
              />
            </Card>
          </Col>
        </Row>
      )}

      <Card>
        <Tabs activeKey={activeTab} onChange={setActiveTab} items={tabItems} />
      </Card>
    </div>
  );
}
