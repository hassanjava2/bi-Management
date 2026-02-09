/**
 * مركز المراسلات الداخلية
 */
import { useState, useEffect } from "react";
import {
  Row,
  Col,
  Card,
  List,
  Button,
  Input,
  Select,
  Tag,
  Space,
  message,
  Empty,
  Modal,
  Form,
  Badge,
  Typography,
  Divider,
} from "antd";
import {
  MailOutlined,
  SendOutlined,
  StarOutlined,
  StarFilled,
  InboxOutlined,
  DeleteOutlined,
  FolderOutlined,
  PlusOutlined,
  CloseOutlined,
} from "@ant-design/icons";
import { PageHeader, DateDisplay, LoadingSkeleton } from "../components/shared";
import { API_BASE, getAuthHeaders } from "../utils/api";

const { Text, Paragraph } = Typography;

interface Message {
  id: string;
  messageId: string;
  isRead: boolean;
  isStarred: boolean;
  folder: string;
  createdAt: string;
  message?: {
    id: string;
    subject: string | null;
    content: string;
    priority: string;
    senderId: string | null;
    isAnnouncement: boolean;
    createdAt: string;
  };
}

const FOLDERS = [
  { id: "inbox", label: "الوارد", icon: <InboxOutlined /> },
  { id: "sent", label: "المرسل", icon: <SendOutlined /> },
  { id: "starred", label: "المميزة", icon: <StarOutlined /> },
  { id: "archive", label: "الأرشيف", icon: <FolderOutlined /> },
  { id: "trash", label: "المحذوفات", icon: <DeleteOutlined /> },
];

const PRIORITY_CONFIG: Record<string, { color: string; label: string }> = {
  low: { color: "default", label: "منخفضة" },
  normal: { color: "blue", label: "عادية" },
  high: { color: "orange", label: "عالية" },
  urgent: { color: "red", label: "عاجلة" },
};

export default function MessagesCenter() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [activeFolder, setActiveFolder] = useState("inbox");
  const [showCompose, setShowCompose] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  const [form] = Form.useForm();

  // معرف المستخدم الحالي - يجب أن يأتي من نظام المصادقة
  const currentUserId = "current_user";

  useEffect(() => {
    loadMessages();
  }, [activeFolder]);

  const loadMessages = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ userId: currentUserId, folder: activeFolder });
      const res = await fetch(`${API_BASE}/api/messages/inbox?${params}`);
      if (res.ok) {
        const data = await res.json();
        setMessages(data.messages || []);
        setUnreadCount(data.unreadCount || 0);
      }
    } catch (error) {
      console.error(error);
      message.error("فشل في تحميل الرسائل");
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (messageId: string) => {
    try {
      await fetch(`${API_BASE}/api/messages/${messageId}/read`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: currentUserId }),
      });
      loadMessages();
    } catch (error) {
      console.error(error);
    }
  };

  const toggleStar = async (messageId: string, currentStarred: boolean, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await fetch(`${API_BASE}/api/messages/${messageId}/star`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: currentUserId, starred: !currentStarred }),
      });
      loadMessages();
    } catch (error) {
      console.error(error);
    }
  };

  const moveToFolder = async (messageId: string, folder: string) => {
    try {
      await fetch(`${API_BASE}/api/messages/${messageId}/move`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: currentUserId, folder }),
      });
      message.success(folder === "archive" ? "تم الأرشفة" : "تم النقل");
      loadMessages();
    } catch (error) {
      console.error(error);
      message.error("فشل في نقل الرسالة");
    }
  };

  const sendMessage = async () => {
    try {
      const values = await form.validateFields();
      const res = await fetch(`${API_BASE}/api/messages`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          ...values,
          senderId: currentUserId,
          recipients: [],
        }),
      });
      if (res.ok) {
        message.success("تم إرسال الرسالة بنجاح");
        setShowCompose(false);
        form.resetFields();
        loadMessages();
      } else {
        message.error("فشل في إرسال الرسالة");
      }
    } catch (error) {
      console.error(error);
    }
  };

  const currentFolder = FOLDERS.find((f) => f.id === activeFolder);

  return (
    <div>
      <PageHeader
        title="مركز المراسلات"
        subtitle="إدارة الرسائل والمراسلات الداخلية"
        breadcrumbs={[
          { label: "الرئيسية", path: "/" },
          { label: "مركز المراسلات" },
        ]}
      />

      <Row gutter={16} style={{ minHeight: "calc(100vh - 200px)" }}>
        {/* الشريط الجانبي */}
        <Col xs={24} sm={6} md={5}>
          <Card>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              block
              onClick={() => setShowCompose(true)}
              style={{ marginBottom: 16 }}
            >
              رسالة جديدة
            </Button>

            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              {FOLDERS.map((folder) => (
                <Button
                  key={folder.id}
                  type={activeFolder === folder.id ? "primary" : "text"}
                  ghost={activeFolder === folder.id}
                  onClick={() => setActiveFolder(folder.id)}
                  style={{
                    textAlign: "right",
                    justifyContent: "flex-start",
                    display: "flex",
                    alignItems: "center",
                  }}
                  block
                >
                  <Space style={{ flex: 1, justifyContent: "space-between", width: "100%" }}>
                    <Space>
                      {folder.icon}
                      <span>{folder.label}</span>
                    </Space>
                    {folder.id === "inbox" && unreadCount > 0 && (
                      <Badge count={unreadCount} size="small" />
                    )}
                  </Space>
                </Button>
              ))}
            </div>
          </Card>
        </Col>

        {/* قائمة الرسائل */}
        <Col xs={24} sm={selectedMessage ? 10 : 18} md={selectedMessage ? 10 : 19}>
          <Card
            title={
              <Space>
                {currentFolder?.icon}
                {currentFolder?.label}
              </Space>
            }
            bodyStyle={{ padding: 0, maxHeight: "calc(100vh - 280px)", overflow: "auto" }}
          >
            {loading ? (
              <div style={{ padding: 16 }}>
                <LoadingSkeleton count={5} />
              </div>
            ) : messages.length === 0 ? (
              <Empty
                image={<MailOutlined style={{ fontSize: 64, color: "#d9d9d9" }} />}
                description="لا توجد رسائل"
                style={{ padding: "48px 0" }}
              />
            ) : (
              <List
                dataSource={messages}
                renderItem={(msg) => {
                  const priority = PRIORITY_CONFIG[msg.message?.priority || "normal"];
                  return (
                    <List.Item
                      onClick={() => {
                        setSelectedMessage(msg);
                        if (!msg.isRead) markAsRead(msg.messageId);
                      }}
                      style={{
                        padding: "12px 16px",
                        cursor: "pointer",
                        background:
                          selectedMessage?.id === msg.id
                            ? "#e6f7ff"
                            : msg.isRead
                            ? "#fff"
                            : "#fffbe6",
                        borderBottom: "1px solid #f0f0f0",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 12, width: "100%" }}>
                        <Button
                          type="text"
                          size="small"
                          icon={msg.isStarred ? <StarFilled style={{ color: "#faad14" }} /> : <StarOutlined />}
                          onClick={(e) => toggleStar(msg.messageId, msg.isStarred, e)}
                        />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                            {!msg.isRead && (
                              <Badge status="processing" />
                            )}
                            <Text
                              strong={!msg.isRead}
                              ellipsis
                              style={{ maxWidth: "80%" }}
                            >
                              {msg.message?.subject || "(بدون عنوان)"}
                            </Text>
                            {msg.message?.priority && msg.message.priority !== "normal" && (
                              <Tag color={priority.color} style={{ fontSize: 11 }}>
                                {priority.label}
                              </Tag>
                            )}
                          </div>
                          <Text type="secondary" ellipsis style={{ fontSize: 13 }}>
                            {msg.message?.content.substring(0, 80)}...
                          </Text>
                        </div>
                        <Text type="secondary" style={{ fontSize: 12, whiteSpace: "nowrap" }}>
                          <DateDisplay date={msg.createdAt} />
                        </Text>
                      </div>
                    </List.Item>
                  );
                }}
              />
            )}
          </Card>
        </Col>

        {/* عرض الرسالة */}
        {selectedMessage && (
          <Col xs={24} sm={8} md={9}>
            <Card
              title={selectedMessage.message?.subject || "(بدون عنوان)"}
              extra={
                <Button
                  type="text"
                  icon={<CloseOutlined />}
                  onClick={() => setSelectedMessage(null)}
                />
              }
              bodyStyle={{ maxHeight: "calc(100vh - 340px)", overflow: "auto" }}
            >
              <Text type="secondary" style={{ fontSize: 13, display: "block", marginBottom: 16 }}>
                <DateDisplay date={selectedMessage.createdAt} showTime />
              </Text>

              <Paragraph style={{ lineHeight: 1.8, whiteSpace: "pre-wrap" }}>
                {selectedMessage.message?.content}
              </Paragraph>

              <Divider />

              <Space>
                <Button
                  icon={<FolderOutlined />}
                  onClick={() => moveToFolder(selectedMessage.messageId, "archive")}
                >
                  أرشفة
                </Button>
                <Button
                  danger
                  icon={<DeleteOutlined />}
                  onClick={() => {
                    moveToFolder(selectedMessage.messageId, "trash");
                    setSelectedMessage(null);
                  }}
                >
                  حذف
                </Button>
              </Space>
            </Card>
          </Col>
        )}
      </Row>

      {/* موديل إنشاء رسالة */}
      <Modal
        title="رسالة جديدة"
        open={showCompose}
        onOk={sendMessage}
        onCancel={() => {
          setShowCompose(false);
          form.resetFields();
        }}
        okText="إرسال"
        cancelText="إلغاء"
        width={550}
      >
        <Form form={form} layout="vertical" initialValues={{ priority: "normal" }}>
          <Form.Item name="subject" label="الموضوع">
            <Input placeholder="أدخل موضوع الرسالة" />
          </Form.Item>

          <Form.Item name="priority" label="الأولوية">
            <Select>
              {Object.entries(PRIORITY_CONFIG).map(([k, v]) => (
                <Select.Option key={k} value={k}>
                  <Tag color={v.color}>{v.label}</Tag>
                </Select.Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="content"
            label="المحتوى"
            rules={[{ required: true, message: "محتوى الرسالة مطلوب" }]}
          >
            <Input.TextArea rows={8} placeholder="اكتب رسالتك هنا..." />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
