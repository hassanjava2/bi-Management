/**
 * صفحة مركز الملاحظات
 */
import { useState, useEffect } from "react";
import {
  Row,
  Col,
  Card,
  Button,
  Input,
  Select,
  Tag,
  Space,
  message,
  Empty,
  Modal,
  Form,
  List,
  Popconfirm,
} from "antd";
import {
  PlusOutlined,
  PushpinOutlined,
  PushpinFilled,
  DeleteOutlined,
  CloseOutlined,
  ThunderboltOutlined,
  FileTextOutlined,
} from "@ant-design/icons";
import { PageHeader, DateDisplay, LoadingSkeleton } from "../components/shared";
import { API_BASE, getAuthHeaders } from "../utils/api";

const { TextArea } = Input;

interface Note {
  id: string;
  title: string | null;
  content: string;
  entityType: string;
  entityId: string;
  entityName: string | null;
  noteType: string;
  isPinned: boolean;
  color: string | null;
  createdAt: string;
}

interface QuickNote {
  id: string;
  content: string;
  color: string | null;
}

const NOTE_TYPES: Record<string, { label: string; color: string }> = {
  general: { label: "عامة", color: "default" },
  important: { label: "مهمة", color: "red" },
  warning: { label: "تحذير", color: "orange" },
  followup: { label: "متابعة", color: "blue" },
  reminder: { label: "تذكير", color: "purple" },
  feedback: { label: "ملاحظة", color: "green" },
};

const ENTITY_TYPES: Record<string, string> = {
  customer: "عميل",
  invoice: "فاتورة",
  supplier: "مورد",
  product: "منتج",
  lead: "عميل محتمل",
  contract: "عقد",
  employee: "موظف",
};

const COLORS = [
  { value: "#ef4444", label: "أحمر" },
  { value: "#f97316", label: "برتقالي" },
  { value: "#eab308", label: "أصفر" },
  { value: "#22c55e", label: "أخضر" },
  { value: "#3b82f6", label: "أزرق" },
  { value: "#8b5cf6", label: "بنفسجي" },
  { value: "#ec4899", label: "وردي" },
];

export default function NotesCenter() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [quickNotes, setQuickNotes] = useState<QuickNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [quickText, setQuickText] = useState("");
  const [form] = Form.useForm();

  useEffect(() => {
    loadData();
  }, [search, typeFilter]);

  const loadData = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.append("search", search);
      if (typeFilter) params.append("noteType", typeFilter);

      const [notesRes, quickRes] = await Promise.all([
        fetch(`${API_BASE}/api/notes?${params}`, { headers: getAuthHeaders() }),
        fetch(`${API_BASE}/api/notes/quick/current-user`, { headers: getAuthHeaders() }),
      ]);
      if (notesRes.ok) setNotes((await notesRes.json()).notes || []);
      if (quickRes.ok) setQuickNotes((await quickRes.json()).quickNotes || []);
    } catch (error) {
      console.error(error);
      message.error("حدث خطأ في تحميل البيانات");
    } finally {
      setLoading(false);
    }
  };

  const togglePin = async (id: string) => {
    try {
      await fetch(`${API_BASE}/api/notes/${id}/toggle-pin`, { method: "POST", headers: getAuthHeaders() });
      message.success("تم تحديث التثبيت");
      loadData();
    } catch (error) {
      console.error(error);
      message.error("فشل في تحديث التثبيت");
    }
  };

  const deleteNote = async (id: string) => {
    try {
      await fetch(`${API_BASE}/api/notes/${id}`, { method: "DELETE", headers: getAuthHeaders() });
      message.success("تم حذف الملاحظة");
      loadData();
    } catch (error) {
      console.error(error);
      message.error("فشل في حذف الملاحظة");
    }
  };

  const addQuickNote = async () => {
    if (!quickText.trim()) return;
    try {
      await fetch(`${API_BASE}/api/notes/quick`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({ userId: "current-user", content: quickText }),
      });
      message.success("تم إضافة الملاحظة السريعة");
      setQuickText("");
      loadData();
    } catch (error) {
      console.error(error);
      message.error("فشل في إضافة الملاحظة");
    }
  };

  const deleteQuickNote = async (id: string) => {
    try {
      await fetch(`${API_BASE}/api/notes/quick/${id}`, { method: "DELETE", headers: getAuthHeaders() });
      message.success("تم حذف الملاحظة السريعة");
      loadData();
    } catch (error) {
      console.error(error);
      message.error("فشل في حذف الملاحظة");
    }
  };

  const handleAddNote = async () => {
    try {
      const values = await form.validateFields();
      await fetch(`${API_BASE}/api/notes`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify(values),
      });
      message.success("تم إضافة الملاحظة بنجاح");
      setShowAddModal(false);
      form.resetFields();
      loadData();
    } catch (error) {
      console.error(error);
    }
  };

  const pinnedNotes = notes.filter((n) => n.isPinned);
  const regularNotes = notes.filter((n) => !n.isPinned);

  const NoteCard = ({ note }: { note: Note }) => {
    const typeConfig = NOTE_TYPES[note.noteType] || NOTE_TYPES.general;
    return (
      <Card
        size="small"
        style={{
          marginBottom: 12,
          borderRight: `4px solid ${note.color || (typeConfig.color === "default" ? "#d9d9d9" : typeConfig.color === "red" ? "#ff4d4f" : typeConfig.color === "orange" ? "#fa8c16" : typeConfig.color === "blue" ? "#1890ff" : typeConfig.color === "purple" ? "#722ed1" : "#52c41a")}`,
        }}
        extra={
          <Space size="small">
            <Button
              type="text"
              size="small"
              icon={note.isPinned ? <PushpinFilled style={{ color: "#1890ff" }} /> : <PushpinOutlined />}
              onClick={() => togglePin(note.id)}
            />
            <Popconfirm
              title="حذف الملاحظة"
              description="هل أنت متأكد من حذف هذه الملاحظة؟"
              onConfirm={() => deleteNote(note.id)}
              okText="حذف"
              cancelText="إلغاء"
              okButtonProps={{ danger: true }}
            >
              <Button type="text" size="small" danger icon={<DeleteOutlined />} />
            </Popconfirm>
          </Space>
        }
      >
        <Space size="small" style={{ marginBottom: 8 }}>
          <Tag color={typeConfig.color}>{typeConfig.label}</Tag>
          {note.entityName && (
            <Tag>
              {ENTITY_TYPES[note.entityType] || note.entityType}: {note.entityName}
            </Tag>
          )}
        </Space>
        {note.title && <div style={{ fontWeight: 600, marginBottom: 4 }}>{note.title}</div>}
        <div style={{ whiteSpace: "pre-wrap", color: "#374151" }}>{note.content}</div>
        <div style={{ fontSize: 12, color: "#9ca3af", marginTop: 8 }}>
          <DateDisplay date={note.createdAt} format="datetime" />
        </div>
      </Card>
    );
  };

  return (
    <div>
      <PageHeader
        title="مركز الملاحظات"
        subtitle="إدارة الملاحظات على العملاء والطلبات والكيانات المختلفة"
        breadcrumbs={[{ title: "مركز الملاحظات" }]}
        extra={
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setShowAddModal(true)}>
            ملاحظة جديدة
          </Button>
        }
      />

      <Row gutter={24}>
        {/* القسم الرئيسي */}
        <Col xs={24} lg={16}>
          {/* الفلاتر */}
          <Space style={{ marginBottom: 16, width: "100%" }} wrap>
            <Input.Search
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="بحث في الملاحظات..."
              allowClear
              style={{ width: 300 }}
            />
            <Select
              value={typeFilter || undefined}
              onChange={(value) => setTypeFilter(value || "")}
              placeholder="كل الأنواع"
              allowClear
              style={{ width: 150 }}
            >
              {Object.entries(NOTE_TYPES).map(([k, v]) => (
                <Select.Option key={k} value={k}>
                  {v.label}
                </Select.Option>
              ))}
            </Select>
          </Space>

          {/* المثبتة */}
          {pinnedNotes.length > 0 && (
            <div style={{ marginBottom: 24 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: "#6b7280", marginBottom: 12 }}>
                <PushpinFilled style={{ color: "#1890ff" }} /> الملاحظات المثبتة
              </div>
              {pinnedNotes.map((note) => (
                <NoteCard key={note.id} note={note} />
              ))}
            </div>
          )}

          {/* الملاحظات */}
          {loading ? (
            <LoadingSkeleton type="list" rows={4} />
          ) : regularNotes.length === 0 && pinnedNotes.length === 0 ? (
            <Card>
              <Empty
                image={<FileTextOutlined style={{ fontSize: 64, color: "#d9d9d9" }} />}
                description="لا توجد ملاحظات"
              />
            </Card>
          ) : (
            regularNotes.map((note) => <NoteCard key={note.id} note={note} />)
          )}
        </Col>

        {/* الملاحظات السريعة */}
        <Col xs={24} lg={8}>
          <Card
            title={
              <span>
                <ThunderboltOutlined style={{ color: "#faad14" }} /> ملاحظات سريعة
              </span>
            }
          >
            <Space.Compact style={{ width: "100%", marginBottom: 16 }}>
              <Input
                value={quickText}
                onChange={(e) => setQuickText(e.target.value)}
                onPressEnter={addQuickNote}
                placeholder="أضف ملاحظة سريعة..."
              />
              <Button type="primary" icon={<PlusOutlined />} onClick={addQuickNote} />
            </Space.Compact>

            {quickNotes.length === 0 ? (
              <Empty description="لا توجد ملاحظات سريعة" image={Empty.PRESENTED_IMAGE_SIMPLE} />
            ) : (
              <List
                dataSource={quickNotes}
                renderItem={(qn) => (
                  <div
                    key={qn.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      padding: "8px 12px",
                      background: qn.color ? `${qn.color}15` : "#fafafa",
                      borderRadius: 6,
                      borderRight: `3px solid ${qn.color || "#d9d9d9"}`,
                      marginBottom: 8,
                    }}
                  >
                    <span style={{ flex: 1, fontSize: 13 }}>{qn.content}</span>
                    <Button
                      type="text"
                      size="small"
                      icon={<CloseOutlined />}
                      onClick={() => deleteQuickNote(qn.id)}
                      style={{ color: "#9ca3af" }}
                    />
                  </div>
                )}
              />
            )}
          </Card>
        </Col>
      </Row>

      {/* موديل إضافة ملاحظة */}
      <Modal
        title="ملاحظة جديدة"
        open={showAddModal}
        onOk={handleAddNote}
        onCancel={() => {
          setShowAddModal(false);
          form.resetFields();
        }}
        okText="حفظ"
        cancelText="إلغاء"
        width={500}
      >
        <Form form={form} layout="vertical" initialValues={{ entityType: "customer", noteType: "general" }}>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="entityType" label="نوع الكيان">
                <Select>
                  {Object.entries(ENTITY_TYPES).map(([k, v]) => (
                    <Select.Option key={k} value={k}>
                      {v}
                    </Select.Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="noteType" label="نوع الملاحظة">
                <Select>
                  {Object.entries(NOTE_TYPES).map(([k, v]) => (
                    <Select.Option key={k} value={k}>
                      {v.label}
                    </Select.Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="entityId" label="معرف الكيان">
            <Input placeholder="مثل: رقم العميل أو رقم الفاتورة" />
          </Form.Item>
          <Form.Item name="content" label="المحتوى" rules={[{ required: true, message: "المحتوى مطلوب" }]}>
            <TextArea rows={4} placeholder="محتوى الملاحظة..." />
          </Form.Item>
          <Form.Item name="color" label="اللون">
            <Space wrap>
              {COLORS.map((c) => (
                <Button
                  key={c.value}
                  type="default"
                  shape="circle"
                  size="small"
                  style={{
                    background: c.value,
                    border: form.getFieldValue("color") === c.value ? "3px solid #111" : "2px solid transparent",
                    width: 28,
                    height: 28,
                    minWidth: 28,
                  }}
                  onClick={() => form.setFieldValue("color", c.value)}
                />
              ))}
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
