/**
 * الآلة الحاسبة / المحادثة العلنية
 * Calculator & Public Chat Page
 */
import { useState, useEffect, useRef } from "react";
import { Row, Col, Card, Input, Button, Space, List, Avatar, Tag, message, Tabs, Table, Form, DatePicker, Select, Empty } from "antd";
import {
  SendOutlined, MessageOutlined, CompassOutlined,
  UserOutlined, PlusOutlined, DeleteOutlined, CalendarOutlined,
} from "@ant-design/icons";
import { PageHeader, LoadingSkeleton } from "../components/shared";
import { API_BASE, getAuthHeaders } from "../utils/api";

interface ChatMessage {
  id: string;
  userId: string;
  userName: string;
  message: string;
  createdAt: string;
}

interface RouteStop {
  id: string;
  repId: string;
  repName: string;
  scheduleDate: string;
  customerId: string | null;
  customerName: string | null;
  stopOrder: number;
  notes: string | null;
}

export default function CalculatorPage() {
  const [activeTab, setActiveTab] = useState("chat");
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [routes, setRoutes] = useState<RouteStop[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => { loadData(); }, []);
  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [chatMessages]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [chatRes, routesRes] = await Promise.all([
        fetch(`${API_BASE}/api/calculator/chat?limit=50`, { headers: getAuthHeaders() }),
        fetch(`${API_BASE}/api/calculator/routes`, { headers: getAuthHeaders() }),
      ]);

      if (chatRes.ok) {
        const data = await chatRes.json();
        setChatMessages(data.data || []);
      }
      if (routesRes.ok) {
        const data = await routesRes.json();
        setRoutes(data.data || []);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const sendChat = async () => {
    if (!chatInput.trim()) return;
    setSending(true);
    try {
      const res = await fetch(`${API_BASE}/api/calculator/chat`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({ message: chatInput.trim() }),
      });
      if (res.ok) {
        const data = await res.json();
        setChatMessages(prev => [...prev, data.data]);
        setChatInput("");
      } else {
        message.error("فشل في إرسال الرسالة");
      }
    } catch (error) {
      message.error("حدث خطأ");
    } finally {
      setSending(false);
    }
  };

  if (loading) return <LoadingSkeleton />;

  const routeColumns = [
    { title: "التاريخ", dataIndex: "scheduleDate", key: "date" },
    { title: "المندوب", dataIndex: "repName", key: "rep" },
    { title: "الترتيب", dataIndex: "stopOrder", key: "order", align: "center" as const },
    { title: "العميل", dataIndex: "customerName", key: "customer", render: (v: string) => v || "-" },
    { title: "ملاحظات", dataIndex: "notes", key: "notes", render: (v: string) => v || "-" },
  ];

  return (
    <div>
      <PageHeader
        title="الحاسبة والمحادثة"
        subtitle="محادثة علنية ومسارات المندوبين"
        breadcrumbs={[
          { title: "الرئيسية", href: "/" },
          { title: "الحاسبة" },
        ]}
      />

      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        items={[
          {
            key: "chat",
            label: <Space><MessageOutlined /> المحادثة العلنية</Space>,
            children: (
              <Card
                style={{ borderRadius: 12, height: "calc(100vh - 320px)", display: "flex", flexDirection: "column" }}
                bodyStyle={{ flex: 1, display: "flex", flexDirection: "column", padding: 0, overflow: "hidden" }}
              >
                {/* Chat messages */}
                <div style={{ flex: 1, overflow: "auto", padding: "16px 20px" }}>
                  {chatMessages.length === 0 ? (
                    <Empty description="لا توجد رسائل بعد" image={Empty.PRESENTED_IMAGE_SIMPLE} />
                  ) : (
                    chatMessages.map((msg) => (
                      <div key={msg.id} style={{ marginBottom: 12, display: "flex", gap: 8 }}>
                        <Avatar size={28} icon={<UserOutlined />} style={{ background: "#1890ff", flexShrink: 0 }} />
                        <div>
                          <div>
                            <Tag color="blue" style={{ marginBottom: 4 }}>{msg.userName}</Tag>
                            <span style={{ fontSize: 11, color: "#999" }}>
                              {new Date(msg.createdAt).toLocaleTimeString("ar-IQ", { hour: "2-digit", minute: "2-digit" })}
                            </span>
                          </div>
                          <div style={{ background: "#f5f5f5", padding: "8px 12px", borderRadius: "0 12px 12px 12px", display: "inline-block" }}>
                            {msg.message}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Input */}
                <div style={{ padding: "12px 20px", borderTop: "1px solid #f0f0f0", background: "#fafafa" }}>
                  <Space.Compact style={{ width: "100%" }}>
                    <Input
                      placeholder="اكتب رسالتك..."
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      onPressEnter={sendChat}
                      disabled={sending}
                    />
                    <Button type="primary" icon={<SendOutlined />} onClick={sendChat} loading={sending}>
                      إرسال
                    </Button>
                  </Space.Compact>
                </div>
              </Card>
            ),
          },
          {
            key: "routes",
            label: <Space><CompassOutlined /> مسارات المندوبين</Space>,
            children: (
              <Card title="جدول المسارات" style={{ borderRadius: 12 }}>
                {routes.length === 0 ? (
                  <Empty description="لا توجد مسارات مجدولة" image={Empty.PRESENTED_IMAGE_SIMPLE} />
                ) : (
                  <Table dataSource={routes} columns={routeColumns} rowKey="id" size="small" />
                )}
              </Card>
            ),
          },
        ]}
      />
    </div>
  );
}
