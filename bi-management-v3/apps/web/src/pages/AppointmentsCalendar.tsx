/**
 * صفحة تقويم المواعيد
 */
import { useState, useEffect } from "react";
import { Row, Col, Card, Button, Input, Select, Space, Empty, Modal, Form, Tag, Statistic, Calendar } from "antd";
import type { Dayjs } from "dayjs";
import dayjs from "dayjs";
import "dayjs/locale/ar";
import {
  CalendarOutlined,
  PlusOutlined,
  LeftOutlined,
  RightOutlined,
  PhoneOutlined,
  TeamOutlined,
  ToolOutlined,
  MessageOutlined,
  SyncOutlined,
  DesktopOutlined,
  UserOutlined,
  EnvironmentOutlined,
  CheckOutlined,
  CloseOutlined,
} from "@ant-design/icons";
import { PageHeader, LoadingSkeleton, DateDisplay } from "../components/shared";
import { API_BASE, getAuthHeaders } from "../utils/api";

dayjs.locale("ar");

interface Appointment {
  id: string;
  title: string;
  description: string | null;
  appointmentType: string;
  startTime: string;
  endTime: string;
  status: string;
  customerName: string | null;
  location: string | null;
  color: string | null;
  assignedTo: string | null;
}

const APPOINTMENT_TYPES: Record<string, { label: string; icon: React.ReactNode }> = {
  meeting: { label: "اجتماع", icon: <TeamOutlined /> },
  call: { label: "مكالمة", icon: <PhoneOutlined /> },
  demo: { label: "عرض توضيحي", icon: <DesktopOutlined /> },
  support: { label: "دعم فني", icon: <ToolOutlined /> },
  consultation: { label: "استشارة", icon: <MessageOutlined /> },
  followup: { label: "متابعة", icon: <SyncOutlined /> },
};

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  scheduled: { label: "مجدول", color: "blue" },
  confirmed: { label: "مؤكد", color: "green" },
  in_progress: { label: "جاري", color: "purple" },
  completed: { label: "مكتمل", color: "default" },
  cancelled: { label: "ملغي", color: "red" },
  no_show: { label: "لم يحضر", color: "orange" },
};

const DAYS_AR = ["الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];

export default function AppointmentsCalendar() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<"day" | "week" | "month">("week");
  const [showAddModal, setShowAddModal] = useState(false);
  const [form] = Form.useForm();

  useEffect(() => { loadData(); }, [currentDate, view]);

  const loadData = async () => {
    setLoading(true);
    try {
      const { start, end } = getDateRange();
      const params = new URLSearchParams({ start: start.toISOString(), end: end.toISOString() });
      
      const [apptRes, statsRes] = await Promise.all([
        fetch(`${API_BASE}/api/appointments?${params}`, { headers: getAuthHeaders() }),
        fetch(`${API_BASE}/api/appointments/stats/overview`, { headers: getAuthHeaders() }),
      ]);
      if (apptRes.ok) setAppointments((await apptRes.json()).appointments || []);
      if (statsRes.ok) setStats(await statsRes.json());
    } catch (error) { console.error(error); }
    finally { setLoading(false); }
  };

  const getDateRange = () => {
    const start = new Date(currentDate);
    const end = new Date(currentDate);
    if (view === "day") {
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
    } else if (view === "week") {
      const day = start.getDay();
      start.setDate(start.getDate() - day);
      start.setHours(0, 0, 0, 0);
      end.setDate(start.getDate() + 6);
      end.setHours(23, 59, 59, 999);
    } else {
      start.setDate(1);
      start.setHours(0, 0, 0, 0);
      end.setMonth(end.getMonth() + 1, 0);
      end.setHours(23, 59, 59, 999);
    }
    return { start, end };
  };

  const navigate = (direction: number) => {
    const newDate = new Date(currentDate);
    if (view === "day") newDate.setDate(newDate.getDate() + direction);
    else if (view === "week") newDate.setDate(newDate.getDate() + (direction * 7));
    else newDate.setMonth(newDate.getMonth() + direction);
    setCurrentDate(newDate);
  };

  const goToToday = () => setCurrentDate(new Date());

  const handleAddAppointment = async () => {
    try {
      const values = await form.validateFields();
      await fetch(`${API_BASE}/api/appointments`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify(values),
      });
      setShowAddModal(false);
      form.resetFields();
      loadData();
    } catch (error) { console.error(error); }
  };

  const changeStatus = async (id: string, status: string) => {
    try {
      await fetch(`${API_BASE}/api/appointments/${id}/status`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({ status }),
      });
      loadData();
    } catch (error) { console.error(error); }
  };

  const getWeekDays = () => {
    const { start } = getDateRange();
    return Array.from({ length: 7 }, (_, i) => {
      const date = new Date(start);
      date.setDate(start.getDate() + i);
      return date;
    });
  };

  const getAppointmentsForDay = (date: Date) => {
    return appointments.filter(appt => {
      const apptDate = new Date(appt.startTime);
      return apptDate.toDateString() === date.toDateString();
    });
  };

  const formatDateHeader = () => {
    if (view === "day") return currentDate.toLocaleDateString("ar-IQ", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
    if (view === "week") {
      const { start, end } = getDateRange();
      return `${start.toLocaleDateString("ar-IQ", { month: "long", day: "numeric" })} - ${end.toLocaleDateString("ar-IQ", { month: "long", day: "numeric", year: "numeric" })}`;
    }
    return currentDate.toLocaleDateString("ar-IQ", { year: "numeric", month: "long" });
  };

  const viewLabels: Record<string, string> = {
    day: "يوم",
    week: "أسبوع",
    month: "شهر",
  };

  return (
    <div>
      <PageHeader
        title="جدولة المواعيد"
        subtitle="إدارة المواعيد والاجتماعات والمكالمات"
        icon={<CalendarOutlined />}
        breadcrumbs={[
          { label: "الرئيسية", path: "/" },
          { label: "المواعيد" },
        ]}
        extra={
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setShowAddModal(true)}>
            موعد جديد
          </Button>
        }
      />

      {/* الإحصائيات */}
      {stats && (
        <Row gutter={[12, 12]} style={{ marginBottom: 24 }}>
          <Col xs={12} sm={6}>
            <Card bordered={false} style={{ background: "#dbeafe", textAlign: "center" }}>
              <Statistic
                title={<span style={{ color: "#1e40af" }}>اليوم</span>}
                value={stats.today}
                valueStyle={{ color: "#2563eb", fontWeight: 700 }}
              />
            </Card>
          </Col>
          <Col xs={12} sm={6}>
            <Card bordered={false} style={{ background: "#d1fae5", textAlign: "center" }}>
              <Statistic
                title={<span style={{ color: "#047857" }}>هذا الأسبوع</span>}
                value={stats.thisWeek}
                valueStyle={{ color: "#059669", fontWeight: 700 }}
              />
            </Card>
          </Col>
          <Col xs={12} sm={6}>
            <Card bordered={false} style={{ background: "#fef3c7", textAlign: "center" }}>
              <Statistic
                title={<span style={{ color: "#92400e" }}>مجدولة</span>}
                value={stats.byStatus?.scheduled || 0}
                valueStyle={{ color: "#d97706", fontWeight: 700 }}
              />
            </Card>
          </Col>
          <Col xs={12} sm={6}>
            <Card bordered={false} style={{ background: "#ede9fe", textAlign: "center" }}>
              <Statistic
                title={<span style={{ color: "#5b21b6" }}>مؤكدة</span>}
                value={stats.byStatus?.confirmed || 0}
                valueStyle={{ color: "#7c3aed", fontWeight: 700 }}
              />
            </Card>
          </Col>
        </Row>
      )}

      {/* التنقل */}
      <Card style={{ marginBottom: 16 }}>
        <Row justify="space-between" align="middle">
          <Col>
            <Space>
              <Button icon={<RightOutlined />} onClick={() => navigate(-1)} />
              <Button onClick={goToToday}>اليوم</Button>
              <Button icon={<LeftOutlined />} onClick={() => navigate(1)} />
            </Space>
          </Col>
          <Col>
            <span style={{ fontSize: 16, fontWeight: 600 }}>{formatDateHeader()}</span>
          </Col>
          <Col>
            <Space>
              {(["day", "week", "month"] as const).map(v => (
                <Button
                  key={v}
                  type={view === v ? "primary" : "default"}
                  onClick={() => setView(v)}
                >
                  {viewLabels[v]}
                </Button>
              ))}
            </Space>
          </Col>
        </Row>
      </Card>

      {/* التقويم */}
      {loading ? <LoadingSkeleton /> : (
        <Card>
          {view === "week" && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", border: "1px solid #e5e7eb", borderRadius: 8, overflow: "hidden" }}>
              {getWeekDays().map((date, i) => {
                const isToday = date.toDateString() === new Date().toDateString();
                const dayAppts = getAppointmentsForDay(date);
                return (
                  <div key={i} style={{ borderLeft: i > 0 ? "1px solid #e5e7eb" : "none", minHeight: 300 }}>
                    <div style={{
                      padding: 12,
                      textAlign: "center",
                      borderBottom: "1px solid #e5e7eb",
                      background: isToday ? "#dbeafe" : "#f9fafb",
                    }}>
                      <div style={{ fontSize: 12, color: "#6b7280" }}>{DAYS_AR[date.getDay()]}</div>
                      <div style={{
                        fontSize: 20,
                        fontWeight: isToday ? 700 : 500,
                        color: isToday ? "#2563eb" : "#111",
                      }}>
                        {date.getDate()}
                      </div>
                    </div>
                    <div style={{ padding: 8, display: "flex", flexDirection: "column", gap: 4 }}>
                      {dayAppts.map(appt => {
                        const status = STATUS_CONFIG[appt.status] || STATUS_CONFIG.scheduled;
                        const type = APPOINTMENT_TYPES[appt.appointmentType] || APPOINTMENT_TYPES.meeting;
                        return (
                          <div
                            key={appt.id}
                            style={{
                              padding: 8,
                              borderRadius: 6,
                              fontSize: 12,
                              background: appt.color ? `${appt.color}20` : "#f3f4f6",
                              borderRight: `3px solid ${appt.color || "#3b82f6"}`,
                              cursor: "pointer",
                            }}
                          >
                            <div style={{ fontWeight: 600, display: "flex", alignItems: "center", gap: 4 }}>
                              {type.icon} {appt.title}
                            </div>
                            <div style={{ color: "#6b7280" }}>
                              {new Date(appt.startTime).toLocaleTimeString("ar-IQ", { hour: "2-digit", minute: "2-digit" })}
                            </div>
                            {appt.customerName && (
                              <div style={{ color: "#6b7280" }}>
                                <UserOutlined /> {appt.customerName}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {view === "day" && (
            <div style={{ padding: 16 }}>
              {getAppointmentsForDay(currentDate).length === 0 ? (
                <Empty description="لا توجد مواعيد في هذا اليوم" />
              ) : (
                <Space direction="vertical" style={{ width: "100%" }} size={12}>
                  {getAppointmentsForDay(currentDate).map(appt => {
                    const status = STATUS_CONFIG[appt.status] || STATUS_CONFIG.scheduled;
                    const type = APPOINTMENT_TYPES[appt.appointmentType] || APPOINTMENT_TYPES.meeting;
                    return (
                      <Card
                        key={appt.id}
                        size="small"
                        style={{ borderRight: `4px solid ${appt.color || "#3b82f6"}` }}
                      >
                        <Row gutter={16} align="middle">
                          <Col flex="80px" style={{ textAlign: "center" }}>
                            <div style={{ fontSize: 16, fontWeight: 600 }}>
                              {new Date(appt.startTime).toLocaleTimeString("ar-IQ", { hour: "2-digit", minute: "2-digit" })}
                            </div>
                            <div style={{ fontSize: 12, color: "#6b7280" }}>
                              {new Date(appt.endTime).toLocaleTimeString("ar-IQ", { hour: "2-digit", minute: "2-digit" })}
                            </div>
                          </Col>
                          <Col flex="1">
                            <Space align="center" style={{ marginBottom: 4 }}>
                              <span style={{ fontSize: 18 }}>{type.icon}</span>
                              <span style={{ fontWeight: 600 }}>{appt.title}</span>
                              <Tag color={status.color}>{status.label}</Tag>
                            </Space>
                            {appt.description && (
                              <div style={{ fontSize: 13, color: "#6b7280", marginBottom: 4 }}>{appt.description}</div>
                            )}
                            <Space size={16}>
                              {appt.customerName && (
                                <span style={{ fontSize: 13 }}><UserOutlined /> {appt.customerName}</span>
                              )}
                              {appt.location && (
                                <span style={{ fontSize: 13 }}><EnvironmentOutlined /> {appt.location}</span>
                              )}
                            </Space>
                          </Col>
                          <Col>
                            <Space>
                              {appt.status === "scheduled" && (
                                <Button
                                  size="small"
                                  type="primary"
                                  ghost
                                  icon={<CheckOutlined />}
                                  onClick={() => changeStatus(appt.id, "confirmed")}
                                >
                                  تأكيد
                                </Button>
                              )}
                              {appt.status === "confirmed" && (
                                <Button
                                  size="small"
                                  icon={<CheckOutlined />}
                                  onClick={() => changeStatus(appt.id, "completed")}
                                >
                                  إكمال
                                </Button>
                              )}
                            </Space>
                          </Col>
                        </Row>
                      </Card>
                    );
                  })}
                </Space>
              )}
            </div>
          )}

          {view === "month" && (
            <Calendar
              value={dayjs(currentDate)}
              onSelect={(date: Dayjs) => {
                setCurrentDate(date.toDate());
                setView("day");
              }}
              cellRender={(date: Dayjs) => {
                const dayAppts = getAppointmentsForDay(date.toDate());
                if (dayAppts.length === 0) return null;
                return (
                  <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                    {dayAppts.slice(0, 2).map(appt => {
                      const type = APPOINTMENT_TYPES[appt.appointmentType] || APPOINTMENT_TYPES.meeting;
                      return (
                        <li key={appt.id} style={{
                          fontSize: 10,
                          padding: "2px 4px",
                          marginBottom: 2,
                          borderRadius: 4,
                          background: appt.color ? `${appt.color}20` : "#e5e7eb",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}>
                          {type.icon} {appt.title}
                        </li>
                      );
                    })}
                    {dayAppts.length > 2 && (
                      <li style={{ fontSize: 10, color: "#6b7280" }}>+{dayAppts.length - 2} المزيد</li>
                    )}
                  </ul>
                );
              }}
            />
          )}
        </Card>
      )}

      {/* موديل إضافة */}
      <Modal
        title={<span><CalendarOutlined /> موعد جديد</span>}
        open={showAddModal}
        onCancel={() => setShowAddModal(false)}
        onOk={handleAddAppointment}
        okText="حفظ"
        cancelText="إلغاء"
        width={550}
        destroyOnClose
      >
        <Form form={form} layout="vertical" initialValues={{ appointmentType: "meeting" }}>
          <Form.Item
            name="title"
            label="العنوان"
            rules={[{ required: true, message: "العنوان مطلوب" }]}
          >
            <Input placeholder="عنوان الموعد" />
          </Form.Item>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="startTime"
                label="وقت البدء"
                rules={[{ required: true, message: "وقت البدء مطلوب" }]}
              >
                <Input type="datetime-local" style={{ width: "100%" }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="endTime"
                label="وقت الانتهاء"
                rules={[{ required: true, message: "وقت الانتهاء مطلوب" }]}
              >
                <Input type="datetime-local" style={{ width: "100%" }} />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="appointmentType" label="النوع">
                <Select>
                  {Object.entries(APPOINTMENT_TYPES).map(([k, v]) => (
                    <Select.Option key={k} value={k}>
                      {v.icon} {v.label}
                    </Select.Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="customerName" label="اسم العميل">
                <Input placeholder="اسم العميل (اختياري)" />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="location" label="الموقع">
            <Input placeholder="المكتب / عبر الإنترنت / موقع العميل" />
          </Form.Item>
          <Form.Item name="description" label="وصف">
            <Input.TextArea rows={2} placeholder="وصف الموعد (اختياري)" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
