/**
 * صفحة المساعد الذكي - AI Chat
 */
import { useState, useEffect, useRef } from "react";
import { Card, Input, Button, Space, Avatar, Tag, Spin, Empty, Typography } from "antd";
import {
  SendOutlined, RobotOutlined, UserOutlined, BulbOutlined,
  ReloadOutlined, MessageOutlined,
} from "@ant-design/icons";
import { PageHeader } from "../components/shared";
import { API_BASE, getAuthHeaders } from "../utils/api";

const { Text, Paragraph } = Typography;

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  suggestions?: string[];
  timestamp: string;
}

export default function AiChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [loading, setLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Welcome message
    setMessages([
      {
        id: "welcome",
        role: "assistant",
        content: "مرحباً! أنا المساعد الذكي لنظام BI Management.\n\nيمكنني مساعدتك في:\n• المبيعات والفواتير\n• المخزون والأجهزة\n• الموظفين والأداء\n• التقارير والإحصائيات\n\nاكتب سؤالك وسأحاول مساعدتك!",
        suggestions: ["تقرير المبيعات", "حالة المخزون", "المهام اليوم", "أداء الموظفين"],
        timestamp: new Date().toISOString(),
      },
    ]);
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async (text?: string) => {
    const msg = text || inputValue.trim();
    if (!msg) return;

    // Add user message
    const userMessage: ChatMessage = {
      id: `user_${Date.now()}`,
      role: "user",
      content: msg,
      timestamp: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMessage]);
    setInputValue("");
    setLoading(true);

    try {
      const res = await fetch(`${API_BASE}/api/ai/chat`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          message: msg,
          conversation_id: conversationId,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.data?.conversation_id) {
          setConversationId(data.data.conversation_id);
        }

        const assistantMessage: ChatMessage = {
          id: data.data?.id || `ai_${Date.now()}`,
          role: "assistant",
          content: data.data?.response || "عذراً، لم أتمكن من معالجة طلبك.",
          suggestions: data.data?.suggestions,
          timestamp: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, assistantMessage]);
      } else {
        setMessages((prev) => [
          ...prev,
          {
            id: `err_${Date.now()}`,
            role: "assistant",
            content: "عذراً، حدث خطأ في معالجة طلبك. حاول مرة أخرى.",
            timestamp: new Date().toISOString(),
          },
        ]);
      }
    } catch (error) {
      console.error(error);
      setMessages((prev) => [
        ...prev,
        {
          id: `err_${Date.now()}`,
          role: "assistant",
          content: "عذراً، لا يمكن الاتصال بالخادم حالياً.",
          timestamp: new Date().toISOString(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const newConversation = () => {
    setConversationId(null);
    setMessages([
      {
        id: "welcome",
        role: "assistant",
        content: "محادثة جديدة! كيف أقدر أساعدك؟",
        suggestions: ["تقرير المبيعات", "حالة المخزون", "المهام اليوم"],
        timestamp: new Date().toISOString(),
      },
    ]);
  };

  return (
    <div>
      <PageHeader
        title="المساعد الذكي"
        subtitle="تحدث مع المساعد الذكي للحصول على المساعدة"
        breadcrumbs={[
          { title: "الرئيسية", href: "/" },
          { title: "المساعد الذكي" },
        ]}
        extra={
          <Button icon={<ReloadOutlined />} onClick={newConversation}>
            محادثة جديدة
          </Button>
        }
      />

      <Card
        style={{
          borderRadius: 16,
          height: "calc(100vh - 260px)",
          display: "flex",
          flexDirection: "column",
        }}
        bodyStyle={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          padding: 0,
          overflow: "hidden",
        }}
      >
        {/* Messages area */}
        <div style={{ flex: 1, overflow: "auto", padding: "16px 20px" }}>
          {messages.map((msg) => (
            <div
              key={msg.id}
              style={{
                display: "flex",
                justifyContent: msg.role === "user" ? "flex-end" : "flex-start",
                marginBottom: 16,
              }}
            >
              <div style={{ maxWidth: "75%", display: "flex", gap: 8, flexDirection: msg.role === "user" ? "row-reverse" : "row" }}>
                <Avatar
                  size={32}
                  icon={msg.role === "user" ? <UserOutlined /> : <RobotOutlined />}
                  style={{
                    background: msg.role === "user" ? "#1890ff" : "#52c41a",
                    flexShrink: 0,
                  }}
                />
                <div>
                  <div
                    style={{
                      background: msg.role === "user" ? "#1890ff" : "#f5f5f5",
                      color: msg.role === "user" ? "#fff" : "#000",
                      padding: "10px 14px",
                      borderRadius: 12,
                      borderTopLeftRadius: msg.role === "user" ? 12 : 2,
                      borderTopRightRadius: msg.role === "user" ? 2 : 12,
                      whiteSpace: "pre-wrap",
                      lineHeight: 1.6,
                    }}
                  >
                    {msg.content}
                  </div>

                  {/* Suggestions */}
                  {msg.suggestions && msg.suggestions.length > 0 && (
                    <div style={{ marginTop: 8, display: "flex", flexWrap: "wrap", gap: 6 }}>
                      {msg.suggestions.map((s, i) => (
                        <Tag
                          key={i}
                          color="blue"
                          style={{ cursor: "pointer", borderRadius: 12 }}
                          onClick={() => sendMessage(s)}
                        >
                          <BulbOutlined /> {s}
                        </Tag>
                      ))}
                    </div>
                  )}

                  <Text type="secondary" style={{ fontSize: 11, marginTop: 2, display: "block" }}>
                    {new Date(msg.timestamp).toLocaleTimeString("ar-IQ", { hour: "2-digit", minute: "2-digit" })}
                  </Text>
                </div>
              </div>
            </div>
          ))}

          {loading && (
            <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 16 }}>
              <Avatar size={32} icon={<RobotOutlined />} style={{ background: "#52c41a" }} />
              <div style={{ background: "#f5f5f5", padding: "10px 14px", borderRadius: 12 }}>
                <Spin size="small" /> <Text type="secondary">جاري التفكير...</Text>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input area */}
        <div style={{ padding: "12px 20px", borderTop: "1px solid #f0f0f0", background: "#fafafa" }}>
          <Space.Compact style={{ width: "100%" }}>
            <Input
              size="large"
              placeholder="اكتب رسالتك هنا..."
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onPressEnter={() => sendMessage()}
              disabled={loading}
              style={{ borderRadius: "8px 0 0 8px" }}
            />
            <Button
              size="large"
              type="primary"
              icon={<SendOutlined />}
              onClick={() => sendMessage()}
              loading={loading}
              style={{ borderRadius: "0 8px 8px 0" }}
            >
              إرسال
            </Button>
          </Space.Compact>
        </div>
      </Card>
    </div>
  );
}
