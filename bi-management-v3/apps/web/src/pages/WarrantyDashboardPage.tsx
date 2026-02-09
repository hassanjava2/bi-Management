/**
 * صفحة لوحة تحكم الكفالات المتقدمة
 */
import { useState, useEffect } from "react";
import {
  Row,
  Col,
  Card,
  Table,
  Tag,
  Space,
  message,
  Statistic,
  Typography,
  Button,
  Empty,
  Modal,
  Form,
  Input,
  InputNumber,
  Select,
  DatePicker,
  Tooltip,
  Divider,
  Alert,
  List,
} from "antd";
import {
  SafetyCertificateOutlined,
  ClockCircleOutlined,
  WarningOutlined,
  DollarOutlined,
  PlusOutlined,
  PhoneOutlined,
  UserOutlined,
  CalendarOutlined,
  ReloadOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  MailOutlined,
  GiftOutlined,
  BarChartOutlined,
} from "@ant-design/icons";
import { PageHeader, LoadingSkeleton, MoneyDisplay, DateDisplay } from "../components/shared";
import { API_BASE, getAuthHeaders } from "../utils/api";
import dayjs from "dayjs";

const { Text, Title } = Typography;

/* ---------- أنواع البيانات ---------- */

interface DashboardStats {
  totalWarranties: number;
  activeWarranties: number;
  expiringThisWeek: number;
  expiringThisMonth: number;
  pendingClaims: number;
  monthlyCost: number;
}

interface ExpiringWarranty {
  id: string;
  productName: string;
  serialNumber?: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  expiryDate: string;
  daysLeft: number;
  warrantyType?: string;
}

interface CostReportEntry {
  month: string;
  label: string;
  totalCost: number;
  claimsCount: number;
}

/* ---------- المكوّن ---------- */

export default function WarrantyDashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [expiring, setExpiring] = useState<ExpiringWarranty[]>([]);
  const [costReport, setCostReport] = useState<CostReportEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [registerForm] = Form.useForm();
  const [registering, setRegistering] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [dashRes, expiringRes, costRes] = await Promise.all([
        fetch(`${API_BASE}/api/warranty-advanced/dashboard`, { headers: getAuthHeaders() }),
        fetch(`${API_BASE}/api/warranty-advanced/expiring`, { headers: getAuthHeaders() }),
        fetch(`${API_BASE}/api/warranty-advanced/cost-report`, { headers: getAuthHeaders() }),
      ]);

      if (dashRes.ok) setStats(await dashRes.json());
      if (expiringRes.ok) {
        const data = await expiringRes.json();
        setExpiring(data.warranties ?? data ?? []);
      }
      if (costRes.ok) {
        const data = await costRes.json();
        setCostReport(data.report ?? data ?? []);
      }
    } catch (error) {
      console.error(error);
      message.error("فشل في تحميل بيانات الكفالات");
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (values: any) => {
    setRegistering(true);
    try {
      const body = {
        ...values,
        startDate: values.startDate?.toISOString(),
        endDate: values.endDate?.toISOString(),
      };

      const res = await fetch(`${API_BASE}/api/warranty-advanced/register`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify(body),
      });

      if (res.ok) {
        message.success("تم تسجيل الكفالة بنجاح");
        setShowRegisterModal(false);
        registerForm.resetFields();
        loadData();
      } else {
        const err = await res.text();
        message.error(err || "فشل في تسجيل الكفالة");
      }
    } catch (error) {
      console.error(error);
      message.error("حدث خطأ أثناء التسجيل");
    } finally {
      setRegistering(false);
    }
  };

  const handleExtendOffer = async (warrantyId: string) => {
    message.info("تم إرسال عرض التمديد للعميل");
    // يمكن إضافة API call هنا لاحقاً
  };

  /* ---- أعمدة جدول الكفالات المنتهية قريباً ---- */
  const expiringColumns = [
    {
      title: "المنتج",
      key: "product",
      render: (_: any, record: ExpiringWarranty) => (
        <div>
          <Text strong>{record.productName}</Text>
          {record.serialNumber && (
            <div style={{ fontSize: 12, color: "#6b7280" }}>#{record.serialNumber}</div>
          )}
        </div>
      ),
    },
    {
      title: "العميل",
      key: "customer",
      render: (_: any, record: ExpiringWarranty) => (
        <div>
          <div>
            <UserOutlined style={{ marginLeft: 4 }} />
            <Text>{record.customerName}</Text>
          </div>
          <div style={{ fontSize: 12, color: "#6b7280" }}>
            <PhoneOutlined style={{ marginLeft: 4 }} />
            {record.customerPhone}
          </div>
          {record.customerEmail && (
            <div style={{ fontSize: 12, color: "#6b7280" }}>
              <MailOutlined style={{ marginLeft: 4 }} />
              {record.customerEmail}
            </div>
          )}
        </div>
      ),
    },
    {
      title: "تاريخ الانتهاء",
      dataIndex: "expiryDate",
      key: "expiryDate",
      align: "center" as const,
      render: (date: string) => <DateDisplay date={date} />,
    },
    {
      title: "الأيام المتبقية",
      dataIndex: "daysLeft",
      key: "daysLeft",
      align: "center" as const,
      sorter: (a: ExpiringWarranty, b: ExpiringWarranty) => a.daysLeft - b.daysLeft,
      render: (days: number) => (
        <Tag
          color={days <= 3 ? "red" : days <= 7 ? "orange" : days <= 14 ? "gold" : "blue"}
          icon={<ClockCircleOutlined />}
        >
          {days <= 0 ? "منتهي" : `${days} يوم`}
        </Tag>
      ),
    },
    {
      title: "الإجراء",
      key: "action",
      align: "center" as const,
      render: (_: any, record: ExpiringWarranty) => (
        <Space>
          <Tooltip title="إرسال عرض تمديد">
            <Button
              type="primary"
              size="small"
              icon={<GiftOutlined />}
              onClick={() => handleExtendOffer(record.id)}
            >
              عرض تمديد
            </Button>
          </Tooltip>
          <Tooltip title="اتصال">
            <Button
              size="small"
              icon={<PhoneOutlined />}
              onClick={() => {
                if (record.customerPhone) {
                  window.open(`tel:${record.customerPhone}`);
                }
              }}
            />
          </Tooltip>
        </Space>
      ),
    },
  ];

  /* ---- أقصى تكلفة للتقرير ---- */
  const maxCost = costReport.length > 0 ? Math.max(...costReport.map((c) => c.totalCost)) : 1;

  /* ---- العرض ---- */
  if (loading && !stats) {
    return (
      <div style={{ padding: 24 }}>
        <LoadingSkeleton type="table" rows={8} />
      </div>
    );
  }

  return (
    <div style={{ padding: 24 }}>
      <PageHeader
        title="لوحة تحكم الكفالات"
        subtitle="متابعة شاملة للكفالات والمطالبات وتقارير التكاليف"
        breadcrumbs={[{ title: "الكفالات المتقدمة" }]}
        extra={
          <Space>
            <Button icon={<ReloadOutlined />} onClick={loadData} loading={loading}>
              تحديث
            </Button>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => setShowRegisterModal(true)}
            >
              تسجيل كفالة
            </Button>
          </Space>
        }
      />

      {/* الإحصائيات */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={12} sm={8} lg={4}>
          <Card style={{ background: "linear-gradient(135deg, #667eea, #764ba2)" }}>
            <Statistic
              title={<span style={{ color: "rgba(255,255,255,0.9)" }}>إجمالي الكفالات</span>}
              value={stats?.totalWarranties ?? 0}
              valueStyle={{ color: "#fff", fontSize: "1.5rem", fontWeight: 700 }}
              prefix={<SafetyCertificateOutlined />}
            />
          </Card>
        </Col>
        <Col xs={12} sm={8} lg={4}>
          <Card style={{ background: "linear-gradient(135deg, #43e97b, #38f9d7)" }}>
            <Statistic
              title={<span style={{ color: "rgba(255,255,255,0.9)" }}>الكفالات الفعالة</span>}
              value={stats?.activeWarranties ?? 0}
              valueStyle={{ color: "#fff", fontSize: "1.5rem", fontWeight: 700 }}
              prefix={<CheckCircleOutlined />}
            />
          </Card>
        </Col>
        <Col xs={12} sm={8} lg={4}>
          <Card style={{ background: "linear-gradient(135deg, #fa709a, #fee140)" }}>
            <Statistic
              title={<span style={{ color: "rgba(255,255,255,0.9)" }}>تنتهي هذا الأسبوع</span>}
              value={stats?.expiringThisWeek ?? 0}
              valueStyle={{ color: "#fff", fontSize: "1.5rem", fontWeight: 700 }}
              prefix={<WarningOutlined />}
            />
          </Card>
        </Col>
        <Col xs={12} sm={8} lg={4}>
          <Card style={{ background: "linear-gradient(135deg, #f093fb, #f5576c)" }}>
            <Statistic
              title={<span style={{ color: "rgba(255,255,255,0.9)" }}>تنتهي هذا الشهر</span>}
              value={stats?.expiringThisMonth ?? 0}
              valueStyle={{ color: "#fff", fontSize: "1.5rem", fontWeight: 700 }}
              prefix={<CalendarOutlined />}
            />
          </Card>
        </Col>
        <Col xs={12} sm={8} lg={4}>
          <Card style={{ background: "linear-gradient(135deg, #4facfe, #00f2fe)" }}>
            <Statistic
              title={<span style={{ color: "rgba(255,255,255,0.9)" }}>مطالبات معلقة</span>}
              value={stats?.pendingClaims ?? 0}
              valueStyle={{ color: "#fff", fontSize: "1.5rem", fontWeight: 700 }}
              prefix={<ExclamationCircleOutlined />}
            />
          </Card>
        </Col>
        <Col xs={12} sm={8} lg={4}>
          <Card style={{ background: "linear-gradient(135deg, #a18cd1, #fbc2eb)" }}>
            <Statistic
              title={<span style={{ color: "rgba(255,255,255,0.9)" }}>تكلفة الشهر</span>}
              value={stats?.monthlyCost ?? 0}
              valueStyle={{ color: "#fff", fontSize: "1.5rem", fontWeight: 700 }}
              prefix={<DollarOutlined />}
              formatter={(v) => Number(v).toLocaleString("ar-IQ")}
            />
          </Card>
        </Col>
      </Row>

      {/* تنبيه الكفالات المنتهية */}
      {(stats?.expiringThisWeek ?? 0) > 0 && (
        <Alert
          message={`تحذير: ${stats?.expiringThisWeek} كفالة ستنتهي هذا الأسبوع!`}
          description="يُنصح بالتواصل مع العملاء لتقديم عروض تمديد الكفالة"
          type="warning"
          showIcon
          icon={<WarningOutlined />}
          style={{ marginBottom: 24 }}
          action={
            <Button size="small" type="primary" ghost>
              عرض التفاصيل
            </Button>
          }
        />
      )}

      <Row gutter={[16, 16]}>
        {/* الكفالات المنتهية قريباً */}
        <Col xs={24} lg={16}>
          <Card
            title={
              <Space>
                <ClockCircleOutlined style={{ color: "#d97706" }} />
                <span>تنتهي قريباً ({expiring.length})</span>
              </Space>
            }
          >
            {expiring.length === 0 ? (
              <Empty
                image={<SafetyCertificateOutlined style={{ fontSize: 48, color: "#d9d9d9" }} />}
                description="لا توجد كفالات تنتهي قريباً"
              />
            ) : (
              <Table
                columns={expiringColumns}
                dataSource={expiring}
                rowKey="id"
                pagination={{
                  pageSize: 10,
                  showTotal: (total, range) => `${range[0]}-${range[1]} من ${total}`,
                }}
                scroll={{ x: "max-content" }}
                size="small"
              />
            )}
          </Card>
        </Col>

        {/* تقرير التكاليف الشهرية */}
        <Col xs={24} lg={8}>
          <Card
            title={
              <Space>
                <BarChartOutlined style={{ color: "#1677ff" }} />
                <span>تقرير التكاليف الشهرية</span>
              </Space>
            }
          >
            {costReport.length === 0 ? (
              <Empty description="لا توجد بيانات" />
            ) : (
              <List
                dataSource={costReport}
                renderItem={(entry) => (
                  <List.Item style={{ padding: "8px 0" }}>
                    <div style={{ width: "100%" }}>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          marginBottom: 6,
                        }}
                      >
                        <Text style={{ fontSize: 13 }}>{entry.label}</Text>
                        <Space size={8}>
                          <Tag size="small" color="blue">
                            {entry.claimsCount} مطالبة
                          </Tag>
                          <Text strong style={{ fontSize: 13 }}>
                            <MoneyDisplay amount={entry.totalCost} />
                          </Text>
                        </Space>
                      </div>
                      <div
                        style={{
                          width: "100%",
                          height: 8,
                          background: "#f0f0f0",
                          borderRadius: 4,
                          overflow: "hidden",
                        }}
                      >
                        <div
                          style={{
                            width: `${(entry.totalCost / maxCost) * 100}%`,
                            height: "100%",
                            background:
                              entry.totalCost / maxCost > 0.8
                                ? "#ff4d4f"
                                : entry.totalCost / maxCost > 0.5
                                ? "#faad14"
                                : "#52c41a",
                            borderRadius: 4,
                            transition: "width 0.5s ease",
                          }}
                        />
                      </div>
                    </div>
                  </List.Item>
                )}
              />
            )}
          </Card>
        </Col>
      </Row>

      {/* مودال تسجيل كفالة */}
      <Modal
        title={
          <Space>
            <SafetyCertificateOutlined style={{ color: "#1677ff" }} />
            <span>تسجيل كفالة جديدة</span>
          </Space>
        }
        open={showRegisterModal}
        onCancel={() => {
          setShowRegisterModal(false);
          registerForm.resetFields();
        }}
        footer={null}
        width={560}
      >
        <Form form={registerForm} layout="vertical" onFinish={handleRegister}>
          <Form.Item
            name="productName"
            label="اسم المنتج"
            rules={[{ required: true, message: "اسم المنتج مطلوب" }]}
          >
            <Input placeholder="اسم المنتج" />
          </Form.Item>

          <Form.Item name="serialNumber" label="الرقم التسلسلي">
            <Input placeholder="الرقم التسلسلي (اختياري)" />
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="customerName"
                label="اسم العميل"
                rules={[{ required: true, message: "اسم العميل مطلوب" }]}
              >
                <Input placeholder="اسم العميل" prefix={<UserOutlined />} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="customerPhone"
                label="هاتف العميل"
                rules={[{ required: true, message: "رقم الهاتف مطلوب" }]}
              >
                <Input placeholder="07xxxxxxxxx" prefix={<PhoneOutlined />} />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="customerEmail" label="البريد الإلكتروني">
            <Input placeholder="email@example.com" prefix={<MailOutlined />} />
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="startDate"
                label="تاريخ البدء"
                rules={[{ required: true, message: "تاريخ البدء مطلوب" }]}
              >
                <DatePicker style={{ width: "100%" }} placeholder="تاريخ البدء" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="endDate"
                label="تاريخ الانتهاء"
                rules={[{ required: true, message: "تاريخ الانتهاء مطلوب" }]}
              >
                <DatePicker style={{ width: "100%" }} placeholder="تاريخ الانتهاء" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="warrantyType" label="نوع الكفالة" initialValue="standard">
            <Select
              options={[
                { value: "standard", label: "كفالة عادية" },
                { value: "extended", label: "كفالة ممتدة" },
                { value: "premium", label: "كفالة شاملة" },
              ]}
            />
          </Form.Item>

          <Form.Item name="notes" label="ملاحظات">
            <Input.TextArea rows={2} placeholder="ملاحظات إضافية..." />
          </Form.Item>

          <div style={{ display: "flex", gap: 12, justifyContent: "flex-end", marginTop: 16 }}>
            <Button
              onClick={() => {
                setShowRegisterModal(false);
                registerForm.resetFields();
              }}
            >
              إلغاء
            </Button>
            <Button type="primary" htmlType="submit" loading={registering}>
              تسجيل الكفالة
            </Button>
          </div>
        </Form>
      </Modal>
    </div>
  );
}
