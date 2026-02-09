/**
 * صفحة تعديل المهمة
 */
import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Card, Form, Input, Select, InputNumber, DatePicker, Button, message, Space, Alert, Tag, Row, Col } from "antd";
import { SaveOutlined, ArrowRightOutlined } from "@ant-design/icons";
import { PageHeader, LoadingSkeleton } from "../components/shared";
import { API_BASE, getAuthHeaders } from "../utils/api";
import dayjs from "dayjs";

interface User {
  id: string;
  fullName: string;
}

const TASK_TYPES = [
  { value: "follow_up", label: "متابعة" },
  { value: "call", label: "اتصال" },
  { value: "meeting", label: "اجتماع" },
  { value: "research", label: "بحث" },
  { value: "documentation", label: "توثيق" },
  { value: "development", label: "تطوير" },
  { value: "support", label: "دعم فني" },
  { value: "other", label: "أخرى" },
];

const PRIORITIES = [
  { value: "low", label: "منخفضة", color: "default" },
  { value: "medium", label: "متوسطة", color: "blue" },
  { value: "high", label: "عالية", color: "orange" },
  { value: "urgent", label: "عاجلة", color: "red" },
];

const STATUSES = [
  { value: "pending", label: "معلقة", color: "default" },
  { value: "in_progress", label: "قيد التنفيذ", color: "processing" },
  { value: "on_hold", label: "متوقفة", color: "warning" },
  { value: "completed", label: "مكتملة", color: "success" },
  { value: "cancelled", label: "ملغاة", color: "error" },
];

export default function TaskEdit() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [taskNumber, setTaskNumber] = useState("");
  const [currentStatus, setCurrentStatus] = useState("");
  const [users, setUsers] = useState<User[]>([]);

  useEffect(() => {
    document.title = "تعديل المهمة | BI Management v3";
  }, []);

  useEffect(() => {
    if (!id) {
      setError("معرف المهمة مطلوب");
      setLoading(false);
      return;
    }

    Promise.all([
      fetch(`${API_BASE}/api/tasks/${id}`, { headers: getAuthHeaders() }).then((r) => {
        if (!r.ok) throw new Error("المهمة غير موجودة");
        return r.json();
      }),
      fetch(`${API_BASE}/api/users?limit=100`, { headers: getAuthHeaders() }).then((r) => r.json()),
    ])
      .then(([task, usersData]) => {
        setUsers(usersData.users || usersData.data || []);
        setTaskNumber(task.taskNumber || "");
        setCurrentStatus(task.status || "pending");

        form.setFieldsValue({
          title: task.title || "",
          description: task.description || "",
          taskType: task.taskType || "other",
          priority: task.priority || "medium",
          status: task.status || "pending",
          assigneeId: task.assignee?.id || undefined,
          dueDate: task.dueDate ? dayjs(task.dueDate) : undefined,
          estimatedMinutes: task.estimatedMinutes || undefined,
          notes: task.notes || "",
        });
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [id, form]);

  const handleSubmit = async (values: Record<string, unknown>) => {
    setSubmitting(true);
    try {
      const res = await fetch(`${API_BASE}/api/tasks/${id}`, {
        method: "PATCH",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          title: values.title,
          description: values.description || null,
          taskType: values.taskType,
          priority: values.priority,
          status: values.status,
          assigneeId: values.assigneeId || null,
          dueDate: values.dueDate ? (values.dueDate as dayjs.Dayjs).format("YYYY-MM-DD") : null,
          estimatedMinutes: values.estimatedMinutes || null,
          notes: values.notes || null,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "فشل تحديث المهمة");
      }

      message.success("تم تحديث المهمة بنجاح");
      navigate(`/tasks/${id}`);
    } catch (err: unknown) {
      message.error(err instanceof Error ? err.message : "حدث خطأ");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div>
        <PageHeader
          title="تعديل المهمة"
          breadcrumbs={[
            { title: "المهام", href: "/tasks" },
            { title: "تعديل" },
          ]}
        />
        <LoadingSkeleton type="form" rows={8} />
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <PageHeader
          title="تعديل المهمة"
          breadcrumbs={[
            { title: "المهام", href: "/tasks" },
            { title: "خطأ" },
          ]}
        />
        <Alert
          message="خطأ"
          description={error}
          type="error"
          showIcon
          action={
            <Button type="link" onClick={() => navigate("/tasks")}>
              العودة للمهام
            </Button>
          }
        />
      </div>
    );
  }

  const statusConfig = STATUSES.find((s) => s.value === currentStatus) || STATUSES[0];

  return (
    <div>
      <PageHeader
        title={`تعديل المهمة: ${taskNumber}`}
        breadcrumbs={[
          { title: "المهام", href: "/tasks" },
          { title: taskNumber, href: `/tasks/${id}` },
          { title: "تعديل" },
        ]}
        extra={
          <Space>
            <Tag color={statusConfig.color}>{statusConfig.label}</Tag>
            <Button icon={<ArrowRightOutlined />} onClick={() => navigate(`/tasks/${id}`)}>
              العودة للتفاصيل
            </Button>
          </Space>
        }
      />

      <Card style={{ maxWidth: 800 }}>
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item
            name="title"
            label="عنوان المهمة"
            rules={[{ required: true, message: "عنوان المهمة مطلوب" }]}
          >
            <Input placeholder="عنوان المهمة" />
          </Form.Item>

          <Form.Item name="description" label="الوصف">
            <Input.TextArea rows={3} placeholder="وصف المهمة بالتفصيل..." />
          </Form.Item>

          <Row gutter={16}>
            <Col xs={24} sm={8}>
              <Form.Item name="taskType" label="نوع المهمة">
                <Select>
                  {TASK_TYPES.map((t) => (
                    <Select.Option key={t.value} value={t.value}>
                      {t.label}
                    </Select.Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col xs={24} sm={8}>
              <Form.Item name="priority" label="الأولوية">
                <Select>
                  {PRIORITIES.map((p) => (
                    <Select.Option key={p.value} value={p.value}>
                      <Tag color={p.color}>{p.label}</Tag>
                    </Select.Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col xs={24} sm={8}>
              <Form.Item name="status" label="الحالة">
                <Select>
                  {STATUSES.map((s) => (
                    <Select.Option key={s.value} value={s.value}>
                      <Tag color={s.color}>{s.label}</Tag>
                    </Select.Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col xs={24} sm={12}>
              <Form.Item name="assigneeId" label="المُكلَّف">
                <Select placeholder="اختر الموظف" allowClear showSearch optionFilterProp="children">
                  {users.map((u) => (
                    <Select.Option key={u.id} value={u.id}>
                      {u.fullName}
                    </Select.Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item name="dueDate" label="تاريخ الاستحقاق">
                <DatePicker style={{ width: "100%" }} placeholder="اختر التاريخ" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="estimatedMinutes" label="الوقت المقدر (بالدقائق)">
            <InputNumber style={{ width: "100%" }} min={0} placeholder="مثال: 60" />
          </Form.Item>

          <Form.Item name="notes" label="ملاحظات">
            <Input.TextArea rows={2} placeholder="ملاحظات إضافية..." />
          </Form.Item>

          <Space>
            <Button onClick={() => navigate(`/tasks/${id}`)}>إلغاء</Button>
            <Button type="primary" htmlType="submit" icon={<SaveOutlined />} loading={submitting}>
              حفظ التعديلات
            </Button>
          </Space>
        </Form>
      </Card>
    </div>
  );
}
