/**
 * صفحة تفاصيل التذكرة
 */
import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Row,
  Col,
  Card,
  Descriptions,
  Button,
  Tag,
  Space,
  Timeline,
  Input,
  Checkbox,
  Select,
  Rate,
  message,
  Avatar,
  Collapse,
} from "antd";
import {
  ArrowRightOutlined,
  SendOutlined,
  UserOutlined,
  HistoryOutlined,
  StarOutlined,
  InfoCircleOutlined,
  MessageOutlined,
  EditOutlined,
} from "@ant-design/icons";
import { PageHeader, StatusTag, DateDisplay, LoadingSkeleton } from "../components/shared";
import { API_BASE, getAuthHeaders } from "../utils/api";

const { TextArea } = Input;
const { Panel } = Collapse;

interface Ticket {
  id: string;
  ticketNumber: string;
  subject: string;
  description: string;
  customerName: string | null;
  customerEmail: string | null;
  customerPhone: string | null;
  category: string;
  priority: string;
  status: string;
  dueDate: string | null;
  firstResponseAt: string | null;
  resolvedAt: string | null;
  rating: number | null;
  ratingComment: string | null;
  createdAt: string;
  customer: { id: string; fullName: string; phone: string; email: string } | null;
  assignee: { id: string; fullName: string } | null;
  replies: Reply[];
  statusHistory: StatusChange[];
}

interface Reply {
  id: string;
  senderType: string;
  senderName: string | null;
  message: string;
  isInternal: boolean;
  createdAt: string;
}

interface StatusChange {
  id: string;
  fromStatus: string | null;
  toStatus: string;
  reason: string | null;
  createdAt: string;
  changedByUser: { fullName: string } | null;
}

const STATUS_OPTIONS = [
  { value: "open", label: "مفتوحة", color: "blue" },
  { value: "in_progress", label: "قيد المعالجة", color: "orange" },
  { value: "waiting_customer", label: "بانتظار العميل", color: "purple" },
  { value: "resolved", label: "تم الحل", color: "green" },
  { value: "closed", label: "مغلقة", color: "default" },
];

const PRIORITY_OPTIONS = [
  { value: "urgent", label: "عاجلة", color: "red" },
  { value: "high", label: "عالية", color: "orange" },
  { value: "medium", label: "متوسطة", color: "gold" },
  { value: "low", label: "منخفضة", color: "green" },
];

export default function TicketDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [loading, setLoading] = useState(true);
  const [newReply, setNewReply] = useState("");
  const [isInternal, setIsInternal] = useState(false);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    loadTicket();
  }, [id]);

  useEffect(() => {
    scrollToBottom();
  }, [ticket?.replies]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const loadTicket = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/tickets/${id}`, { headers: getAuthHeaders() });
      if (res.ok) {
        const data = await res.json();
        setTicket(data);
      } else {
        navigate("/tickets");
      }
    } catch (error) {
      console.error("Error:", error);
      message.error("فشل في تحميل بيانات التذكرة");
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    if (!ticket) return;

    try {
      const res = await fetch(`${API_BASE}/api/tickets/${ticket.id}`, {
        method: "PATCH",
        headers: getAuthHeaders(),
        body: JSON.stringify({ status: newStatus }),
      });

      if (res.ok) {
        message.success("تم تحديث الحالة بنجاح");
        loadTicket();
      }
    } catch (error) {
      console.error("Error:", error);
      message.error("فشل في تحديث الحالة");
    }
  };

  const handlePriorityChange = async (newPriority: string) => {
    if (!ticket) return;

    try {
      const res = await fetch(`${API_BASE}/api/tickets/${ticket.id}`, {
        method: "PATCH",
        headers: getAuthHeaders(),
        body: JSON.stringify({ priority: newPriority }),
      });

      if (res.ok) {
        message.success("تم تحديث الأولوية بنجاح");
        loadTicket();
      }
    } catch (error) {
      console.error("Error:", error);
      message.error("فشل في تحديث الأولوية");
    }
  };

  const handleSendReply = async () => {
    if (!ticket || !newReply.trim()) return;

    setSending(true);
    try {
      const res = await fetch(`${API_BASE}/api/tickets/${ticket.id}/replies`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          senderType: "agent",
          senderName: "الدعم الفني",
          message: newReply.trim(),
          isInternal,
        }),
      });

      if (res.ok) {
        setNewReply("");
        setIsInternal(false);
        message.success("تم إرسال الرد بنجاح");
        loadTicket();
      }
    } catch (error) {
      console.error("Error:", error);
      message.error("فشل في إرسال الرد");
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return <LoadingSkeleton type="detail" />;
  }

  if (!ticket) {
    return (
      <div style={{ padding: "2rem", textAlign: "center" }}>
        التذكرة غير موجودة
      </div>
    );
  }

  const currentStatus = STATUS_OPTIONS.find((s) => s.value === ticket.status);
  const currentPriority = PRIORITY_OPTIONS.find((p) => p.value === ticket.priority);

  const breadcrumbs = [
    { title: "التذاكر", path: "/tickets" },
    { title: ticket.ticketNumber },
  ];

  return (
    <div>
      <PageHeader
        title={ticket.subject}
        breadcrumbs={breadcrumbs}
        extra={
          <Space>
            <Button icon={<EditOutlined />} onClick={() => navigate(`/tickets/${id}/edit`)}>
              تعديل
            </Button>
            <Tag color={currentPriority?.color}>{currentPriority?.label}</Tag>
            <StatusTag status={ticket.status} type="ticket" />
          </Space>
        }
      />

      <Row gutter={[24, 24]}>
        {/* المحادثة */}
        <Col xs={24} lg={16}>
          <Card
            title={
              <Space>
                <MessageOutlined />
                <span>المحادثة</span>
                <Tag>{ticket.ticketNumber}</Tag>
              </Space>
            }
            styles={{ body: { padding: 0 } }}
          >
            {/* Messages Container */}
            <div style={{ maxHeight: "500px", overflow: "auto", padding: "16px" }}>
              {/* الوصف الأصلي */}
              <div style={{ marginBottom: "24px" }}>
                <Space style={{ marginBottom: "8px" }}>
                  <Avatar style={{ backgroundColor: "#1890ff" }}>
                    {(ticket.customer?.fullName || ticket.customerName || "ز")[0]}
                  </Avatar>
                  <span style={{ fontWeight: 500 }}>
                    {ticket.customer?.fullName || ticket.customerName || "زائر"}
                  </span>
                  <span style={{ color: "#8c8c8c" }}>•</span>
                  <DateDisplay date={ticket.createdAt} showTime />
                </Space>
                <div
                  style={{
                    background: "#f5f5f5",
                    padding: "12px 16px",
                    borderRadius: "8px",
                    whiteSpace: "pre-wrap",
                  }}
                >
                  {ticket.description}
                </div>
              </div>

              {/* الردود */}
              {ticket.replies.map((reply) => {
                const isAgent = reply.senderType === "agent";

                if (reply.isInternal) {
                  return (
                    <div key={reply.id} style={{ marginBottom: "16px" }}>
                      <div
                        style={{
                          background: "#fffbe6",
                          padding: "12px 16px",
                          borderRadius: "8px",
                          borderRight: "3px solid #faad14",
                        }}
                      >
                        <div style={{ fontSize: "12px", color: "#ad6800", marginBottom: "4px" }}>
                          📝 ملاحظة داخلية - {reply.senderName}
                        </div>
                        {reply.message}
                      </div>
                    </div>
                  );
                }

                return (
                  <div
                    key={reply.id}
                    style={{
                      marginBottom: "16px",
                      display: "flex",
                      flexDirection: isAgent ? "row-reverse" : "row",
                    }}
                  >
                    <div style={{ maxWidth: "80%" }}>
                      <Space
                        style={{
                          marginBottom: "4px",
                          flexDirection: isAgent ? "row-reverse" : "row",
                        }}
                      >
                        <span style={{ fontWeight: 500, fontSize: "12px" }}>
                          {reply.senderName || (isAgent ? "الدعم" : "العميل")}
                        </span>
                        <span style={{ color: "#8c8c8c" }}>•</span>
                        <DateDisplay date={reply.createdAt} showTime style={{ fontSize: "12px" }} />
                      </Space>
                      <div
                        style={{
                          background: isAgent ? "#1890ff" : "#f0f0f0",
                          color: isAgent ? "#fff" : "#000",
                          padding: "10px 14px",
                          borderRadius: "12px",
                          borderTopLeftRadius: isAgent ? "12px" : "4px",
                          borderTopRightRadius: isAgent ? "4px" : "12px",
                          whiteSpace: "pre-wrap",
                        }}
                      >
                        {reply.message}
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Reply Input */}
            {!["closed"].includes(ticket.status) && (
              <div style={{ padding: "16px", borderTop: "1px solid #f0f0f0" }}>
                <Checkbox
                  checked={isInternal}
                  onChange={(e) => setIsInternal(e.target.checked)}
                  style={{ marginBottom: "8px" }}
                >
                  ملاحظة داخلية (غير مرئية للعميل)
                </Checkbox>
                <Space.Compact style={{ width: "100%" }}>
                  <TextArea
                    value={newReply}
                    onChange={(e) => setNewReply(e.target.value)}
                    placeholder="اكتب ردك هنا..."
                    rows={3}
                    style={{ flex: 1 }}
                  />
                  <Button
                    type="primary"
                    icon={<SendOutlined />}
                    onClick={handleSendReply}
                    loading={sending}
                    disabled={!newReply.trim()}
                    style={{ height: "auto" }}
                  >
                    إرسال
                  </Button>
                </Space.Compact>
              </div>
            )}
          </Card>
        </Col>

        {/* Sidebar */}
        <Col xs={24} lg={8}>
          <Space direction="vertical" style={{ width: "100%" }} size="middle">
            {/* معلومات العميل */}
            <Card
              title={
                <Space>
                  <UserOutlined />
                  <span>معلومات العميل</span>
                </Space>
              }
              size="small"
            >
              <Descriptions column={1} size="small">
                <Descriptions.Item label="الاسم">
                  {ticket.customer?.fullName || ticket.customerName || "غير محدد"}
                </Descriptions.Item>
                {(ticket.customer?.email || ticket.customerEmail) && (
                  <Descriptions.Item label="البريد">
                    {ticket.customer?.email || ticket.customerEmail}
                  </Descriptions.Item>
                )}
                {(ticket.customer?.phone || ticket.customerPhone) && (
                  <Descriptions.Item label="الهاتف">
                    {ticket.customer?.phone || ticket.customerPhone}
                  </Descriptions.Item>
                )}
              </Descriptions>
            </Card>

            {/* تحديث الحالة */}
            <Card
              title={
                <Space>
                  <InfoCircleOutlined />
                  <span>الحالة والأولوية</span>
                </Space>
              }
              size="small"
            >
              <Space direction="vertical" style={{ width: "100%" }}>
                <div>
                  <div style={{ marginBottom: "4px", fontWeight: 500 }}>الحالة</div>
                  <Select
                    value={ticket.status}
                    onChange={handleStatusChange}
                    style={{ width: "100%" }}
                    options={STATUS_OPTIONS.map((s) => ({
                      value: s.value,
                      label: <Tag color={s.color}>{s.label}</Tag>,
                    }))}
                  />
                </div>
                <div>
                  <div style={{ marginBottom: "4px", fontWeight: 500 }}>الأولوية</div>
                  <Select
                    value={ticket.priority}
                    onChange={handlePriorityChange}
                    style={{ width: "100%" }}
                    options={PRIORITY_OPTIONS.map((p) => ({
                      value: p.value,
                      label: <Tag color={p.color}>{p.label}</Tag>,
                    }))}
                  />
                </div>
              </Space>
            </Card>

            {/* التفاصيل */}
            <Card
              title={
                <Space>
                  <InfoCircleOutlined />
                  <span>التفاصيل</span>
                </Space>
              }
              size="small"
            >
              <Descriptions column={1} size="small">
                <Descriptions.Item label="تاريخ الإنشاء">
                  <DateDisplay date={ticket.createdAt} showTime />
                </Descriptions.Item>
                {ticket.dueDate && (
                  <Descriptions.Item label="موعد الاستحقاق">
                    <DateDisplay date={ticket.dueDate} showTime />
                  </Descriptions.Item>
                )}
                {ticket.firstResponseAt && (
                  <Descriptions.Item label="أول استجابة">
                    <DateDisplay date={ticket.firstResponseAt} showTime />
                  </Descriptions.Item>
                )}
                {ticket.resolvedAt && (
                  <Descriptions.Item label="تاريخ الحل">
                    <DateDisplay date={ticket.resolvedAt} showTime />
                  </Descriptions.Item>
                )}
                {ticket.assignee && (
                  <Descriptions.Item label="المسؤول">
                    {ticket.assignee.fullName}
                  </Descriptions.Item>
                )}
              </Descriptions>
            </Card>

            {/* سجل الحالات */}
            <Card size="small">
              <Collapse ghost>
                <Panel
                  header={
                    <Space>
                      <HistoryOutlined />
                      <span>سجل التغييرات</span>
                    </Space>
                  }
                  key="history"
                >
                  <Timeline
                    items={ticket.statusHistory.map((h) => ({
                      children: (
                        <div>
                          <div>
                            {h.fromStatus
                              ? `${STATUS_OPTIONS.find((s) => s.value === h.fromStatus)?.label || h.fromStatus} → ${STATUS_OPTIONS.find((s) => s.value === h.toStatus)?.label || h.toStatus}`
                              : `إنشاء (${STATUS_OPTIONS.find((s) => s.value === h.toStatus)?.label || h.toStatus})`}
                          </div>
                          <div style={{ fontSize: "12px", color: "#8c8c8c" }}>
                            {h.changedByUser?.fullName || "النظام"} •{" "}
                            <DateDisplay date={h.createdAt} showTime />
                          </div>
                        </div>
                      ),
                    }))}
                  />
                </Panel>
              </Collapse>
            </Card>

            {/* التقييم */}
            {ticket.status === "closed" && (
              <Card
                title={
                  <Space>
                    <StarOutlined />
                    <span>التقييم</span>
                  </Space>
                }
                size="small"
              >
                {ticket.rating ? (
                  <div>
                    <Rate disabled value={ticket.rating} />
                    {ticket.ratingComment && (
                      <p style={{ marginTop: "8px", color: "#8c8c8c" }}>
                        "{ticket.ratingComment}"
                      </p>
                    )}
                  </div>
                ) : (
                  <p style={{ color: "#8c8c8c" }}>لم يتم التقييم بعد</p>
                )}
              </Card>
            )}
          </Space>
        </Col>
      </Row>
    </div>
  );
}
