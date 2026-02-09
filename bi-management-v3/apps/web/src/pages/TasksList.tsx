/**
 * صفحة قائمة المهام
 */
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Row,
  Col,
  Card,
  Table,
  Button,
  Input,
  Select,
  Form,
  Modal,
  Tag,
  Space,
  message,
  Progress,
  Empty,
} from "antd";
import { Statistic } from "antd";
import type { ColumnsType } from "antd/es/table";
import {
  PlusOutlined,
  SearchOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  ExclamationCircleOutlined,
  WarningOutlined,
  PauseCircleOutlined,
} from "@ant-design/icons";
import { PageHeader, StatusTag, DateDisplay, LoadingSkeleton } from "../components/shared";
import { API_BASE, getAuthHeaders } from "../utils/api";

interface Task {
  id: string;
  taskNumber: string;
  title: string;
  taskType: string;
  priority: string;
  status: string;
  dueDate: string | null;
  progressPercentage: number;
  assignee: { id: string; fullName: string } | null;
}

interface Stats {
  byStatus: Record<string, number>;
  overdue: number;
  dueToday: number;
}

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  pending: { label: "معلقة", color: "default" },
  in_progress: { label: "قيد التنفيذ", color: "processing" },
  on_hold: { label: "متوقفة", color: "warning" },
  completed: { label: "مكتملة", color: "success" },
  cancelled: { label: "ملغاة", color: "error" },
};

const PRIORITY_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  low: { label: "منخفضة", color: "default", icon: "▽" },
  medium: { label: "متوسطة", color: "blue", icon: "◇" },
  high: { label: "عالية", color: "orange", icon: "△" },
  urgent: { label: "عاجلة", color: "red", icon: "⚡" },
};

export default function TasksList() {
  const navigate = useNavigate();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("pending,in_progress");
  const [priorityFilter, setPriorityFilter] = useState("");
  const [search, setSearch] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);

  useEffect(() => {
    loadData();
  }, [statusFilter, priorityFilter, search]);

  const loadData = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter) params.append("status", statusFilter);
      if (priorityFilter) params.append("priority", priorityFilter);
      if (search) params.append("search", search);

      const [tasksRes, statsRes] = await Promise.all([
        fetch(`${API_BASE}/api/tasks?${params}`),
        fetch(`${API_BASE}/api/tasks/stats`),
      ]);

      if (tasksRes.ok) setTasks((await tasksRes.json()).tasks || []);
      if (statsRes.ok) setStats(await statsRes.json());
    } catch (error) {
      console.error(error);
      message.error("فشل في تحميل البيانات");
    } finally {
      setLoading(false);
    }
  };

  const changeStatus = async (taskId: string, status: string) => {
    try {
      await fetch(`${API_BASE}/api/tasks/${taskId}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      message.success("تم تحديث الحالة");
      loadData();
    } catch (error) {
      console.error(error);
      message.error("فشل في تحديث الحالة");
    }
  };

  const isOverdue = (dueDate: string | null) => {
    if (!dueDate) return false;
    return new Date(dueDate) < new Date();
  };

  const getDaysUntilDue = (dueDate: string | null) => {
    if (!dueDate) return null;
    const days = Math.ceil((new Date(dueDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
    return days;
  };

  const columns: ColumnsType<Task> = [
    {
      title: "المهمة",
      key: "task",
      render: (_, record) => {
        const priorityCfg = PRIORITY_CONFIG[record.priority] || PRIORITY_CONFIG.medium;
        const overdue = isOverdue(record.dueDate) && record.status !== "completed";
        return (
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Tag color={priorityCfg.color}>{priorityCfg.icon}</Tag>
              <span
                style={{
                  fontWeight: 600,
                  textDecoration: record.status === "completed" ? "line-through" : "none",
                  color: record.status === "completed" ? "#9ca3af" : "#111",
                }}
              >
                {record.title}
              </span>
              <span style={{ fontFamily: "monospace", fontSize: 12, color: "#9ca3af" }}>
                {record.taskNumber}
              </span>
              {overdue && <Tag color="red">متأخرة</Tag>}
            </div>
            {record.assignee && (
              <div style={{ fontSize: 12, color: "#6b7280", marginTop: 4 }}>
                👤 {record.assignee.fullName}
              </div>
            )}
          </div>
        );
      },
    },
    {
      title: "تاريخ الاستحقاق",
      dataIndex: "dueDate",
      key: "dueDate",
      width: 140,
      render: (dueDate: string | null, record) => {
        if (!dueDate) return "-";
        const overdue = isOverdue(dueDate) && record.status !== "completed";
        const daysUntil = getDaysUntilDue(dueDate);
        return (
          <div style={{ color: overdue ? "#dc2626" : daysUntil !== null && daysUntil <= 1 ? "#d97706" : "#6b7280" }}>
            <DateDisplay date={dueDate} />
            {!overdue && daysUntil === 0 && <div style={{ fontSize: 11 }}>(اليوم)</div>}
            {!overdue && daysUntil === 1 && <div style={{ fontSize: 11 }}>(غداً)</div>}
          </div>
        );
      },
    },
    {
      title: "التقدم",
      dataIndex: "progressPercentage",
      key: "progress",
      width: 100,
      render: (progress: number, record) => {
        if (record.status === "completed") return <Tag color="green">مكتمل</Tag>;
        if (progress === 0) return "-";
        return (
          <div style={{ width: 80 }}>
            <Progress percent={progress} size="small" strokeColor="#3b82f6" />
          </div>
        );
      },
    },
    {
      title: "الحالة",
      dataIndex: "status",
      key: "status",
      width: 120,
      render: (status: string) => {
        const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.pending;
        return <StatusTag status={status} customLabel={cfg.label} />;
      },
    },
    {
      title: "الإجراءات",
      key: "actions",
      width: 120,
      render: (_, record) => (
        <Space>
          <Button
            type="link"
            size="small"
            onClick={(e) => {
              e.stopPropagation();
              changeStatus(record.id, record.status === "completed" ? "pending" : "completed");
            }}
          >
            {record.status === "completed" ? "إلغاء" : "إتمام"}
          </Button>
        </Space>
      ),
    },
  ];

  if (loading && !stats) {
    return (
      <div>
        <PageHeader
          title="المهام"
          subtitle="إدارة وتتبع المهام"
          breadcrumbs={[{ title: "المهام" }]}
        />
        <LoadingSkeleton type="table" rows={6} />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="المهام"
        subtitle="إدارة وتتبع المهام"
        breadcrumbs={[{ title: "المهام" }]}
        extra={
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setShowCreateModal(true)}>
            مهمة جديدة
          </Button>
        }
      />

      {/* Stats Cards */}
      {stats && (
        <Row gutter={[12, 12]} style={{ marginBottom: 24 }}>
          <Col xs={12} sm={8} md={4}>
            <Card size="small">
              <Statistic
                title="معلقة"
                value={stats.byStatus.pending || 0}
                valueStyle={{ color: "#6b7280" }}
                prefix={<PauseCircleOutlined />}
              />
            </Card>
          </Col>
          <Col xs={12} sm={8} md={4}>
            <Card size="small">
              <Statistic
                title="قيد التنفيذ"
                value={stats.byStatus.in_progress || 0}
                valueStyle={{ color: "#2563eb" }}
                prefix={<ClockCircleOutlined />}
              />
            </Card>
          </Col>
          <Col xs={12} sm={8} md={4}>
            <Card size="small">
              <Statistic
                title="مكتملة"
                value={stats.byStatus.completed || 0}
                valueStyle={{ color: "#059669" }}
                prefix={<CheckCircleOutlined />}
              />
            </Card>
          </Col>
          <Col xs={12} sm={8} md={4}>
            <Card size="small">
              <Statistic
                title="متوقفة"
                value={stats.byStatus.on_hold || 0}
                valueStyle={{ color: "#d97706" }}
                prefix={<WarningOutlined />}
              />
            </Card>
          </Col>
          <Col xs={12} sm={8} md={4}>
            <Card
              size="small"
              style={{
                background: stats.overdue > 0 ? "#fef2f2" : undefined,
                borderColor: stats.overdue > 0 ? "#fecaca" : undefined,
              }}
            >
              <Statistic
                title="متأخرة"
                value={stats.overdue}
                valueStyle={{ color: "#dc2626" }}
                prefix={<ExclamationCircleOutlined />}
              />
            </Card>
          </Col>
          <Col xs={12} sm={8} md={4}>
            <Card
              size="small"
              style={{
                background: stats.dueToday > 0 ? "#fefce8" : undefined,
                borderColor: stats.dueToday > 0 ? "#fef08a" : undefined,
              }}
            >
              <Statistic
                title="تستحق اليوم"
                value={stats.dueToday}
                valueStyle={{ color: "#ca8a04" }}
                prefix={<ClockCircleOutlined />}
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
              placeholder="بحث بالعنوان أو الرقم..."
              prefix={<SearchOutlined />}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              allowClear
            />
          </Col>
          <Col>
            <Select
              value={statusFilter}
              onChange={setStatusFilter}
              style={{ width: 150 }}
              placeholder="الحالة"
            >
              <Select.Option value="">كل الحالات</Select.Option>
              <Select.Option value="pending,in_progress">النشطة</Select.Option>
              <Select.Option value="pending">معلقة</Select.Option>
              <Select.Option value="in_progress">قيد التنفيذ</Select.Option>
              <Select.Option value="completed">مكتملة</Select.Option>
              <Select.Option value="on_hold">متوقفة</Select.Option>
            </Select>
          </Col>
          <Col>
            <Select
              value={priorityFilter}
              onChange={setPriorityFilter}
              style={{ width: 150 }}
              placeholder="الأولوية"
              allowClear
            >
              <Select.Option value="">كل الأولويات</Select.Option>
              <Select.Option value="urgent">عاجلة</Select.Option>
              <Select.Option value="high">عالية</Select.Option>
              <Select.Option value="medium">متوسطة</Select.Option>
              <Select.Option value="low">منخفضة</Select.Option>
            </Select>
          </Col>
        </Row>
      </Card>

      {/* Tasks Table */}
      <Card styles={{ body: { padding: 0 } }}>
        <Table
          columns={columns}
          dataSource={tasks}
          rowKey="id"
          loading={loading}
          onRow={(record) => ({
            onClick: () => navigate(`/tasks/${record.id}`),
            style: { cursor: "pointer" },
          })}
          pagination={{
            showSizeChanger: true,
            showTotal: (total, range) => `${range[0]}-${range[1]} من ${total}`,
            pageSize: 20,
          }}
          locale={{
            emptyText: (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description="لا توجد مهام"
              >
                <Button type="primary" icon={<PlusOutlined />} onClick={() => setShowCreateModal(true)}>
                  إضافة مهمة جديدة
                </Button>
              </Empty>
            ),
          }}
        />
      </Card>

      {/* Create Task Modal */}
      <CreateTaskModal
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={() => {
          setShowCreateModal(false);
          loadData();
        }}
      />
    </div>
  );
}

interface CreateTaskModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

function CreateTaskModal({ open, onClose, onSuccess }: CreateTaskModalProps) {
  const [form] = Form.useForm();
  const [saving, setSaving] = useState(false);

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setSaving(true);
      const res = await fetch(`${API_BASE}/api/tasks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      if (res.ok) {
        message.success("تم إنشاء المهمة بنجاح");
        form.resetFields();
        onSuccess();
      } else {
        message.error("فشل في إنشاء المهمة");
      }
    } catch (error) {
      console.error(error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      title="مهمة جديدة"
      open={open}
      onCancel={onClose}
      onOk={handleSubmit}
      confirmLoading={saving}
      okText="إنشاء"
      cancelText="إلغاء"
      destroyOnClose
    >
      <Form
        form={form}
        layout="vertical"
        initialValues={{ priority: "medium", taskType: "general" }}
      >
        <Form.Item
          name="title"
          label="عنوان المهمة"
          rules={[{ required: true, message: "عنوان المهمة مطلوب" }]}
        >
          <Input placeholder="أدخل عنوان المهمة" />
        </Form.Item>

        <Form.Item name="description" label="الوصف">
          <Input.TextArea rows={3} placeholder="الوصف (اختياري)" />
        </Form.Item>

        <Row gutter={16}>
          <Col span={12}>
            <Form.Item name="priority" label="الأولوية">
              <Select>
                <Select.Option value="low">منخفضة</Select.Option>
                <Select.Option value="medium">متوسطة</Select.Option>
                <Select.Option value="high">عالية</Select.Option>
                <Select.Option value="urgent">عاجلة</Select.Option>
              </Select>
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="dueDate" label="تاريخ الاستحقاق">
              <Input type="date" />
            </Form.Item>
          </Col>
        </Row>
      </Form>
    </Modal>
  );
}
