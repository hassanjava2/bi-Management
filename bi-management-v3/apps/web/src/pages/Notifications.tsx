import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Row,
  Col,
  Card,
  Button,
  Space,
  message,
  Empty,
  Tag,
  Badge,
  Typography,
  Popconfirm,
  Segmented,
  List,
  Avatar,
} from "antd";
import {
  BellOutlined,
  CheckOutlined,
  DeleteOutlined,
  EyeOutlined,
  FileTextOutlined,
  CheckCircleOutlined,
  SettingOutlined,
  ClockCircleOutlined,
  WarningOutlined,
  NodeIndexOutlined,
} from "@ant-design/icons";
import { PageHeader, LoadingSkeleton } from "../components/shared";
import { API_BASE, getAuthHeaders } from "../utils/api";

const { Text, Title } = Typography;

type Notification = {
  id: string;
  type: string;
  title: string;
  titleAr: string | null;
  message: string | null;
  messageAr: string | null;
  priority: string | null;
  entityType: string | null;
  entityId: string | null;
  isRead: number | null;
  readAt: string | null;
  createdAt: string | null;
};

const TYPE_CONFIG: Record<string, { icon: React.ReactNode; color: string }> = {
  approval_request: {
    icon: <FileTextOutlined />,
    color: "#fa8c16",
  },
  approval_completed: {
    icon: <CheckCircleOutlined />,
    color: "#52c41a",
  },
  system: {
    icon: <SettingOutlined />,
    color: "#1890ff",
  },
  reminder: {
    icon: <ClockCircleOutlined />,
    color: "#722ed1",
  },
  alert: {
    icon: <WarningOutlined />,
    color: "#f5222d",
  },
};

export default function Notifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "unread">("all");

  useEffect(() => {
    document.title = "الإشعارات | BI Management v3";
  }, []);

  const loadData = () => {
    setLoading(true);
    const userId = localStorage.getItem("userId") || "";

    const params = new URLSearchParams();
    params.append("userId", userId);
    if (filter === "unread") params.append("unreadOnly", "true");

    fetch(`${API_BASE}/api/notifications?${params}`, {
      headers: getAuthHeaders(),
    })
      .then((r) => r.json())
      .then((data) => {
        setNotifications(data.items || []);
        setUnreadCount(data.unreadCount || 0);
      })
      .catch((e) => message.error(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
  }, [filter]);

  const handleMarkRead = async (id: string) => {
    try {
      await fetch(`${API_BASE}/api/notifications/${id}/read`, {
        method: "PUT",
        headers: getAuthHeaders(),
      });
      message.success("تم تعيين الإشعار كمقروء");
      loadData();
    } catch (err) {
      console.error(err);
      message.error("فشل في تحديث الإشعار");
    }
  };

  const handleMarkAllRead = async () => {
    const userId = localStorage.getItem("userId") || "";
    try {
      await fetch(`${API_BASE}/api/notifications/read-all`, {
        method: "PUT",
        headers: getAuthHeaders(),
        body: JSON.stringify({ userId }),
      });
      message.success("تم تعيين جميع الإشعارات كمقروءة");
      loadData();
    } catch (err) {
      console.error(err);
      message.error("فشل في تحديث الإشعارات");
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await fetch(`${API_BASE}/api/notifications/${id}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      });
      message.success("تم حذف الإشعار");
      loadData();
    } catch (err) {
      console.error(err);
      message.error("فشل في حذف الإشعار");
    }
  };

  const formatDate = (d: string | null) => {
    if (!d) return "";
    const date = new Date(d);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return "الآن";
    if (minutes < 60) return `منذ ${minutes} دقيقة`;
    if (hours < 24) return `منذ ${hours} ساعة`;
    if (days < 7) return `منذ ${days} يوم`;

    return date.toLocaleDateString("ar-IQ", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const getEntityLink = (
    entityType: string | null,
    entityId: string | null
  ) => {
    if (!entityType || !entityId) return null;

    const links: Record<string, string> = {
      invoice: `/invoices/${entityId}`,
      voucher: `/vouchers/${entityId}`,
      leave: `/hr/leaves`,
      workflow: `/workflows`,
    };

    return links[entityType] || null;
  };

  const getTypeConfig = (type: string) => {
    return TYPE_CONFIG[type] || { icon: <BellOutlined />, color: "#8c8c8c" };
  };

  if (loading) {
    return <LoadingSkeleton />;
  }

  return (
    <div>
      <PageHeader
        title="الإشعارات"
        subtitle={
          unreadCount > 0
            ? `لديك ${unreadCount} إشعار غير مقروء`
            : "لا توجد إشعارات جديدة"
        }
        breadcrumbs={[
          { label: "الرئيسية", path: "/" },
          { label: "الإشعارات" },
        ]}
        extra={
          <Space>
            <Link to="/workflows">
              <Button icon={<NodeIndexOutlined />}>سير العمل</Button>
            </Link>
            {unreadCount > 0 && (
              <Button type="primary" onClick={handleMarkAllRead}>
                تعيين الكل كمقروء
              </Button>
            )}
          </Space>
        }
      />

      {/* Filter Tabs */}
      <div style={{ marginBottom: 24 }}>
        <Segmented
          value={filter}
          onChange={(value) => setFilter(value as "all" | "unread")}
          options={[
            { label: "الكل", value: "all" },
            {
              label: (
                <Space>
                  غير مقروء
                  {unreadCount > 0 && (
                    <Badge
                      count={unreadCount}
                      style={{ backgroundColor: "#f5222d" }}
                    />
                  )}
                </Space>
              ),
              value: "unread",
            },
          ]}
          size="large"
        />
      </div>

      {/* Notifications List */}
      {notifications.length === 0 ? (
        <Card>
          <Empty
            image={<BellOutlined style={{ fontSize: 64, color: "#d9d9d9" }} />}
            description={
              filter === "unread"
                ? "لا توجد إشعارات غير مقروءة"
                : "لا توجد إشعارات"
            }
          />
        </Card>
      ) : (
        <List
          dataSource={notifications}
          renderItem={(notif) => {
            const entityLink = getEntityLink(notif.entityType, notif.entityId);
            const typeConfig = getTypeConfig(notif.type);

            return (
              <Card
                key={notif.id}
                style={{
                  marginBottom: 12,
                  borderRight: notif.priority === "high" ? "4px solid #fa8c16" : undefined,
                  background: notif.isRead ? "#fff" : "#fafafa",
                }}
                bodyStyle={{ padding: 16 }}
              >
                <Row gutter={16} align="top" wrap={false}>
                  {/* Icon */}
                  <Col flex="none">
                    <Avatar
                      size={48}
                      style={{
                        backgroundColor: `${typeConfig.color}15`,
                        color: typeConfig.color,
                      }}
                      icon={typeConfig.icon}
                    />
                  </Col>

                  {/* Content */}
                  <Col flex="auto">
                    <Row justify="space-between" align="top">
                      <Col>
                        <Title
                          level={5}
                          style={{
                            margin: 0,
                            fontWeight: notif.isRead ? 500 : 600,
                          }}
                        >
                          {notif.titleAr || notif.title}
                        </Title>
                      </Col>
                      <Col>
                        <Space>
                          <Text type="secondary" style={{ fontSize: 12 }}>
                            {formatDate(notif.createdAt)}
                          </Text>
                          {!notif.isRead && (
                            <Badge status="processing" />
                          )}
                        </Space>
                      </Col>
                    </Row>

                    {(notif.messageAr || notif.message) && (
                      <Text
                        type="secondary"
                        style={{ display: "block", marginTop: 4 }}
                      >
                        {notif.messageAr || notif.message}
                      </Text>
                    )}

                    {/* Actions */}
                    <Space style={{ marginTop: 12 }}>
                      {entityLink && (
                        <Link to={entityLink}>
                          <Button size="small" icon={<EyeOutlined />}>
                            عرض التفاصيل
                          </Button>
                        </Link>
                      )}
                      {!notif.isRead && (
                        <Button
                          size="small"
                          type="primary"
                          ghost
                          icon={<CheckOutlined />}
                          onClick={() => handleMarkRead(notif.id)}
                        >
                          تعيين كمقروء
                        </Button>
                      )}
                      <Popconfirm
                        title="هل أنت متأكد من حذف هذا الإشعار؟"
                        onConfirm={() => handleDelete(notif.id)}
                        okText="نعم"
                        cancelText="لا"
                      >
                        <Button
                          size="small"
                          type="text"
                          danger
                          icon={<DeleteOutlined />}
                        >
                          حذف
                        </Button>
                      </Popconfirm>
                    </Space>
                  </Col>
                </Row>
              </Card>
            );
          }}
        />
      )}
    </div>
  );
}
