/**
 * صفحة تفاصيل المهمة
 */
import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Row,
  Col,
  Card,
  Descriptions,
  Button,
  Tag,
  Space,
  Statistic,
  Progress,
  Timeline,
  Input,
  Checkbox,
  List,
  message,
  Empty,
} from "antd";
import {
  EditOutlined,
  PlayCircleOutlined,
  PauseCircleOutlined,
  CheckCircleOutlined,
  ReloadOutlined,
  SendOutlined,
  PlusOutlined,
} from "@ant-design/icons";
import { PageHeader, StatusTag, DateDisplay, LoadingSkeleton } from "../components/shared";
import { API_BASE, getAuthHeaders } from "../utils/api";

interface Task {
  id: string;
  taskNumber: string;
  title: string;
  description: string | null;
  taskType: string;
  priority: string;
  status: string;
  dueDate: string | null;
  startDate: string | null;
  completedAt: string | null;
  estimatedMinutes: number | null;
  actualMinutes: number | null;
  progressPercentage: number;
  relatedType: string | null;
  relatedTitle: string | null;
  notes: string | null;
  createdAt: string;
  assignee: { id: string; fullName: string } | null;
  checklist: Array<{ id: string; title: string; isCompleted: boolean }>;
  comments: Array<{ id: string; userName: string; content: string; createdAt: string }>;
  activities: Array<{ id: string; activityType: string; description: string; createdAt: string }>;
  totalTimeSpent: number;
}

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  pending: { label: "معلقة", color: "default" },
  in_progress: { label: "قيد التنفيذ", color: "processing" },
  on_hold: { label: "متوقفة", color: "warning" },
  completed: { label: "مكتملة", color: "success" },
  cancelled: { label: "ملغاة", color: "error" },
};

const PRIORITY_CONFIG: Record<string, { label: string; color: string }> = {
  low: { label: "منخفضة", color: "default" },
  medium: { label: "متوسطة", color: "blue" },
  high: { label: "عالية", color: "orange" },
  urgent: { label: "عاجلة", color: "red" },
};

export default function TaskDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [task, setTask] = useState<Task | null>(null);
  const [loading, setLoading] = useState(true);
  const [newComment, setNewComment] = useState("");
  const [newCheckItem, setNewCheckItem] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadTask();
  }, [id]);

  const loadTask = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/tasks/${id}`, { headers: getAuthHeaders() });
      if (res.ok) setTask(await res.json());
    } catch (error) {
      console.error(error);
      message.error("فشل في تحميل بيانات المهمة");
    } finally {
      setLoading(false);
    }
  };

  const changeStatus = async (status: string) => {
    try {
      await fetch(`${API_BASE}/api/tasks/${id}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify({ status }),
      });
      message.success("تم تحديث الحالة");
      loadTask();
    } catch (error) {
      console.error(error);
      message.error("فشل في تحديث الحالة");
    }
  };

  const toggleCheckItem = async (checkId: string, isCompleted: boolean) => {
    try {
      await fetch(`${API_BASE}/api/tasks/checklist/${checkId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify({ isCompleted: !isCompleted }),
      });
      loadTask();
    } catch (error) {
      console.error(error);
      message.error("فشل في تحديث العنصر");
    }
  };

  const addCheckItem = async () => {
    if (!newCheckItem.trim()) return;
    setSubmitting(true);
    try {
      await fetch(`${API_BASE}/api/tasks/${id}/checklist`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify({ title: newCheckItem }),
      });
      setNewCheckItem("");
      message.success("تمت الإضافة");
      loadTask();
    } catch (error) {
      console.error(error);
      message.error("فشل في الإضافة");
    } finally {
      setSubmitting(false);
    }
  };

  const addComment = async () => {
    if (!newComment.trim()) return;
    setSubmitting(true);
    try {
      await fetch(`${API_BASE}/api/tasks/${id}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify({ content: newComment, userName: "المستخدم" }),
      });
      setNewComment("");
      message.success("تم إرسال التعليق");
      loadTask();
    } catch (error) {
      console.error(error);
      message.error("فشل في إرسال التعليق");
    } finally {
      setSubmitting(false);
    }
  };

  const formatMinutes = (mins: number) => {
    if (mins < 60) return `${mins} دقيقة`;
    const hours = Math.floor(mins / 60);
    const remaining = mins % 60;
    return `${hours} ساعة${remaining > 0 ? ` و ${remaining} دقيقة` : ""}`;
  };

  if (loading) return <LoadingSkeleton />;
  if (!task) return <Empty description="المهمة غير موجودة" />;

  const statusCfg = STATUS_CONFIG[task.status] || STATUS_CONFIG.pending;
  const priorityCfg = PRIORITY_CONFIG[task.priority] || PRIORITY_CONFIG.medium;
  const completedChecks = task.checklist.filter((c) => c.isCompleted).length;
  const checkProgress = task.checklist.length > 0 ? (completedChecks / task.checklist.length) * 100 : 0;

  const getActionButtons = () => {
    const buttons: React.ReactNode[] = [];

    if (task.status === "pending") {
      buttons.push(
        <Button key="start" type="primary" icon={<PlayCircleOutlined />} onClick={() => changeStatus("in_progress")}>
          بدء
        </Button>
      );
    }
    if (task.status === "in_progress") {
      buttons.push(
        <Button key="hold" icon={<PauseCircleOutlined />} onClick={() => changeStatus("on_hold")}>
          توقف
        </Button>,
        <Button key="complete" type="primary" icon={<CheckCircleOutlined />} onClick={() => changeStatus("completed")}>
          إكمال
        </Button>
      );
    }
    if (task.status === "on_hold") {
      buttons.push(
        <Button key="resume" type="primary" icon={<PlayCircleOutlined />} onClick={() => changeStatus("in_progress")}>
          استئناف
        </Button>
      );
    }
    if (task.status === "completed") {
      buttons.push(
        <Button key="reopen" icon={<ReloadOutlined />} onClick={() => changeStatus("pending")}>
          إعادة فتح
        </Button>
      );
    }
    buttons.push(
      <Button key="edit" icon={<EditOutlined />} onClick={() => navigate(`/tasks/${id}/edit`)}>
        تعديل
      </Button>
    );

    return buttons;
  };

  return (
    <div>
      <PageHeader
        title={task.title}
        breadcrumbs={[
          { label: "المهام", path: "/tasks" },
          { label: task.taskNumber },
        ]}
        extra={<Space>{getActionButtons()}</Space>}
      />

      {/* معلومات المهمة الأساسية */}
      <Card style={{ marginBottom: 16 }}>
        <Row gutter={[16, 16]} align="middle">
          <Col span={24}>
            <Space size="middle">
              <span style={{ fontFamily: "monospace", color: "#666" }}>{task.taskNumber}</span>
              <Tag color={statusCfg.color}>{statusCfg.label}</Tag>
              <Tag color={priorityCfg.color}>{priorityCfg.label}</Tag>
            </Space>
          </Col>
          {task.description && (
            <Col span={24}>
              <p style={{ margin: 0, color: "#666", whiteSpace: "pre-wrap" }}>{task.description}</p>
            </Col>
          )}
        </Row>
      </Card>

      {/* الإحصائيات */}
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={6}>
          <Card>
            <Statistic title="المسؤول" value={task.assignee?.fullName || "غير معين"} />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="تاريخ الاستحقاق"
              value={task.dueDate ? new Date(task.dueDate).toLocaleDateString("ar-IQ") : "-"}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="الوقت المقدر"
              value={task.estimatedMinutes ? formatMinutes(task.estimatedMinutes) : "-"}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="الوقت الفعلي"
              value={task.totalTimeSpent > 0 ? formatMinutes(task.totalTimeSpent) : "-"}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={16}>
        {/* قائمة المراجعة */}
        <Col span={12}>
          <Card
            title="قائمة المراجعة"
            extra={
              task.checklist.length > 0 && (
                <span style={{ color: "#666" }}>
                  {completedChecks}/{task.checklist.length}
                </span>
              )
            }
          >
            {task.checklist.length > 0 && (
              <Progress percent={Math.round(checkProgress)} style={{ marginBottom: 16 }} />
            )}

            <List
              dataSource={task.checklist}
              locale={{ emptyText: "لا توجد عناصر" }}
              renderItem={(item) => (
                <List.Item style={{ padding: "8px 0" }}>
                  <Checkbox
                    checked={item.isCompleted}
                    onChange={() => toggleCheckItem(item.id, item.isCompleted)}
                    style={{ textDecoration: item.isCompleted ? "line-through" : "none" }}
                  >
                    {item.title}
                  </Checkbox>
                </List.Item>
              )}
            />

            <Space.Compact style={{ width: "100%", marginTop: 16 }}>
              <Input
                placeholder="إضافة عنصر..."
                value={newCheckItem}
                onChange={(e) => setNewCheckItem(e.target.value)}
                onPressEnter={addCheckItem}
              />
              <Button type="primary" icon={<PlusOutlined />} onClick={addCheckItem} loading={submitting} />
            </Space.Compact>
          </Card>
        </Col>

        {/* التعليقات */}
        <Col span={12}>
          <Card title="التعليقات">
            <div style={{ maxHeight: 300, overflowY: "auto", marginBottom: 16 }}>
              {task.comments.length === 0 ? (
                <Empty description="لا توجد تعليقات" image={Empty.PRESENTED_IMAGE_SIMPLE} />
              ) : (
                <List
                  dataSource={task.comments}
                  renderItem={(comment) => (
                    <List.Item style={{ padding: "12px 0" }}>
                      <List.Item.Meta
                        title={
                          <Space>
                            <span>{comment.userName}</span>
                            <span style={{ color: "#999", fontSize: 12 }}>
                              <DateDisplay date={comment.createdAt} />
                            </span>
                          </Space>
                        }
                        description={comment.content}
                      />
                    </List.Item>
                  )}
                />
              )}
            </div>

            <Space.Compact style={{ width: "100%" }}>
              <Input
                placeholder="أضف تعليق..."
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                onPressEnter={addComment}
              />
              <Button type="primary" icon={<SendOutlined />} onClick={addComment} loading={submitting}>
                إرسال
              </Button>
            </Space.Compact>
          </Card>
        </Col>
      </Row>

      {/* سجل النشاط */}
      <Card title="سجل النشاط" style={{ marginTop: 16 }}>
        <Timeline
          items={task.activities.slice(0, 10).map((act) => ({
            children: (
              <div>
                <span style={{ color: "#999", marginLeft: 8 }}>
                  <DateDisplay date={act.createdAt} />
                </span>
                <span>{act.description || act.activityType}</span>
              </div>
            ),
          }))}
        />
      </Card>
    </div>
  );
}
