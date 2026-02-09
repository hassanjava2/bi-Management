/**
 * مركز الإشعارات
 */
import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  Row,
  Col,
  Card,
  List,
  Button,
  Tag,
  Space,
  message,
  Empty,
  Tabs,
  Badge,
  Checkbox,
  Typography,
  Popconfirm,
} from "antd";
import {
  BellOutlined,
  CheckOutlined,
  DeleteOutlined,
  ShoppingCartOutlined,
  DollarOutlined,
  InboxOutlined,
  TeamOutlined,
  ToolOutlined,
  SettingOutlined,
  InfoCircleOutlined,
  ClockCircleOutlined,
} from "@ant-design/icons";
import { PageHeader, DateDisplay, LoadingSkeleton } from "../components/shared";
import { API_BASE, getAuthHeaders } from "../utils/api";

const { Text } = Typography;

interface Notification {
  id: string;
  type: string;
  category?: string;
  priority: string;
  title: string;
  message?: string;
  entityType?: string;
  entityId?: string;
  actionUrl?: string;
  isRead: number;
  readAt?: string;
  metadata?: any;
  createdAt: string;
}

interface CategoryStat {
  category: string;
  total: number;
  unread: number;
}

const PRIORITY_CONFIG: Record<string, { color: string; label: string }> = {
  low: { color: "default", label: "منخفضة" },
  normal: { color: "blue", label: "عادية" },
  high: { color: "orange", label: "عالية" },
  urgent: { color: "red", label: "عاجلة" },
};

const CATEGORY_CONFIG: Record<string, { label: string; icon: React.ReactNode }> = {
  general: { label: "عام", icon: <InfoCircleOutlined /> },
  purchase: { label: "المشتريات", icon: <ShoppingCartOutlined /> },
  sales: { label: "المبيعات", icon: <DollarOutlined /> },
  inventory: { label: "المخزون", icon: <InboxOutlined /> },
  hr: { label: "الموارد البشرية", icon: <TeamOutlined /> },
  maintenance: { label: "الصيانة", icon: <ToolOutlined /> },
  system: { label: "النظام", icon: <SettingOutlined /> },
};

export default function NotificationsCenter() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [categoryStats, setCategoryStats] = useState<CategoryStat[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [showUnreadOnly, setShowUnreadOnly] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    fetchNotifications();
  }, [selectedCategory, showUnreadOnly]);

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedCategory) params.append("category", selectedCategory);
      if (showUnreadOnly) params.append("unreadOnly", "true");

      const res = await fetch(`${API_BASE}/api/notifications?${params}`, {
        headers: getAuthHeaders(),
      });

      if (res.ok) {
        const data = await res.json();
        setNotifications(data.items || []);
        setCategoryStats(data.categoryStats || []);
        setUnreadCount(data.unreadCount || 0);
      }
    } catch (error) {
      console.error("Error:", error);
      message.error("فشل في تحميل الإشعارات");
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (id: string) => {
    try {
      await fetch(`${API_BASE}/api/notifications/${id}/read`, {
        method: "PUT",
        headers: getAuthHeaders(),
      });

      setNotifications(
        notifications.map((n) =>
          n.id === id ? { ...n, isRead: 1, readAt: new Date().toISOString() } : n
        )
      );
      setUnreadCount((c) => Math.max(0, c - 1));
      message.success("تم التعليم كمقروء");
    } catch (error) {
      console.error("Error:", error);
      message.error("فشل في تحديث الإشعار");
    }
  };

  const markAllAsRead = async () => {
    try {
      const params = selectedCategory ? `?category=${selectedCategory}` : "";
      await fetch(`${API_BASE}/api/notifications/read-all${params}`, {
        method: "PUT",
        headers: getAuthHeaders(),
      });

      message.success("تم تعليم الكل كمقروء");
      fetchNotifications();
    } catch (error) {
      console.error("Error:", error);
      message.error("فشل في تحديث الإشعارات");
    }
  };

  const deleteNotification = async (id: string) => {
    try {
      await fetch(`${API_BASE}/api/notifications/${id}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      });

      setNotifications(notifications.filter((n) => n.id !== id));
      message.success("تم حذف الإشعار");
    } catch (error) {
      console.error("Error:", error);
      message.error("فشل في حذف الإشعار");
    }
  };

  const clearAll = async () => {
    try {
      await fetch(`${API_BASE}/api/notifications?readOnly=true`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      });

      message.success("تم حذف الإشعارات المقروءة");
      fetchNotifications();
    } catch (error) {
      console.error("Error:", error);
      message.error("فشل في حذف الإشعارات");
    }
  };

  const formatDate = (date: string) => {
    const d = new Date(date);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return "الآن";
    if (minutes < 60) return `منذ ${minutes} دقيقة`;
    if (hours < 24) return `منذ ${hours} ساعة`;
    if (days < 7) return `منذ ${days} يوم`;
    return d.toLocaleDateString("ar-IQ");
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case "urgent":
        return <BellOutlined style={{ color: "#dc2626" }} />;
      case "high":
        return <BellOutlined style={{ color: "#f59e0b" }} />;
      default:
        return <BellOutlined style={{ color: "#3b82f6" }} />;
    }
  };

  // Build tabs items
  const tabItems = [
    {
      key: "all",
      label: (
        <Space>
          الكل
          {unreadCount > 0 && <Badge count={unreadCount} size="small" />}
        </Space>
      ),
    },
    ...categoryStats.map((stat) => {
      const cat = CATEGORY_CONFIG[stat.category] || CATEGORY_CONFIG.general;
      return {
        key: stat.category,
        label: (
          <Space>
            {cat.icon}
            {cat.label}
            {stat.unread > 0 && <Badge count={stat.unread} size="small" />}
          </Space>
        ),
      };
    }),
  ];

  return (
    <div>
      <PageHeader
        title="مركز الإشعارات"
        subtitle={unreadCount > 0 ? `${unreadCount} إشعار غير مقروء` : "لا يوجد إشعارات جديدة"}
        breadcrumbs={[
          { label: "الرئيسية", path: "/" },
          { label: "مركز الإشعارات" },
        ]}
        extra={
          <Space>
            {unreadCount > 0 && (
              <Button type="primary" icon={<CheckOutlined />} onClick={markAllAsRead}>
                تعليم الكل كمقروء
              </Button>
            )}
            <Popconfirm
              title="هل تريد حذف جميع الإشعارات المقروءة؟"
              onConfirm={clearAll}
              okText="نعم"
              cancelText="لا"
            >
              <Button icon={<DeleteOutlined />}>مسح المقروءة</Button>
            </Popconfirm>
          </Space>
        }
      />

      {/* Category Tabs */}
      <Card style={{ marginBottom: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 16 }}>
          <Tabs
            activeKey={selectedCategory || "all"}
            onChange={(key) => setSelectedCategory(key === "all" ? null : key)}
            items={tabItems}
          />
          <Checkbox
            checked={showUnreadOnly}
            onChange={(e) => setShowUnreadOnly(e.target.checked)}
          >
            غير المقروءة فقط
          </Checkbox>
        </div>
      </Card>

      {/* Notifications List */}
      <Card>
        {loading ? (
          <LoadingSkeleton count={5} />
        ) : notifications.length === 0 ? (
          <Empty
            image={<BellOutlined style={{ fontSize: 64, color: "#d9d9d9" }} />}
            description="لا توجد إشعارات"
          />
        ) : (
          <List
            dataSource={notifications}
            renderItem={(notif) => {
              const priority = PRIORITY_CONFIG[notif.priority] || PRIORITY_CONFIG.normal;
              const category = CATEGORY_CONFIG[notif.category || "general"] || CATEGORY_CONFIG.general;

              return (
                <List.Item
                  style={{
                    background: notif.isRead === 0 ? "#f0f9ff" : "transparent",
                    padding: "16px",
                    borderRadius: 8,
                    marginBottom: 8,
                    border: "1px solid #f0f0f0",
                  }}
                  actions={[
                    notif.actionUrl && (
                      <Link to={notif.actionUrl}>
                        <Button type="link" size="small">
                          عرض التفاصيل
                        </Button>
                      </Link>
                    ),
                    notif.isRead === 0 && (
                      <Button type="link" size="small" onClick={() => markAsRead(notif.id)}>
                        تعليم كمقروء
                      </Button>
                    ),
                    <Button
                      type="link"
                      size="small"
                      danger
                      onClick={() => deleteNotification(notif.id)}
                    >
                      حذف
                    </Button>,
                  ].filter(Boolean)}
                >
                  <List.Item.Meta
                    avatar={
                      <div
                        style={{
                          width: 40,
                          height: 40,
                          borderRadius: "50%",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          background:
                            notif.priority === "urgent"
                              ? "#fee2e2"
                              : notif.priority === "high"
                              ? "#ffedd5"
                              : "#dbeafe",
                        }}
                      >
                        {getPriorityIcon(notif.priority)}
                      </div>
                    }
                    title={
                      <Space>
                        {notif.isRead === 0 && <Badge status="processing" />}
                        <Text strong={notif.isRead === 0}>{notif.title}</Text>
                        <Tag color={priority.color}>{priority.label}</Tag>
                      </Space>
                    }
                    description={
                      <div>
                        {notif.message && (
                          <Text type="secondary" style={{ display: "block", marginBottom: 8 }}>
                            {notif.message}
                          </Text>
                        )}
                        <Space size="middle">
                          <Text type="secondary" style={{ fontSize: 12 }}>
                            <ClockCircleOutlined style={{ marginLeft: 4 }} />
                            {formatDate(notif.createdAt)}
                          </Text>
                          <Text type="secondary" style={{ fontSize: 12 }}>
                            {category.icon}
                            <span style={{ marginRight: 4 }}>{category.label}</span>
                          </Text>
                        </Space>
                      </div>
                    }
                  />
                </List.Item>
              );
            }}
          />
        )}
      </Card>

      {/* Settings Link */}
      <div style={{ textAlign: "center", marginTop: 24 }}>
        <Link to="/notifications/settings">
          <Button type="link" icon={<SettingOutlined />}>
            إعدادات الإشعارات
          </Button>
        </Link>
      </div>
    </div>
  );
}
