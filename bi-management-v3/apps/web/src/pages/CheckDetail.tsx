import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { Row, Col, Card, Descriptions, Button, Tag, Space, Statistic, Timeline, message } from "antd";
import {
  EditOutlined,
  PrinterOutlined,
  ArrowRightOutlined,
  BankOutlined,
  UserOutlined,
  CalendarOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
} from "@ant-design/icons";
import { PageHeader, StatusTag, MoneyDisplay, DateDisplay, LoadingSkeleton } from "../components/shared";
import { API_BASE, getAuthHeaders, onAuthFailure } from "../utils/api";

type Check = {
  id: string;
  checkNumber: string;
  type: string;
  status: string;
  amount: number;
  bankName: string | null;
  accountNumber: string | null;
  dueDate: string | null;
  issueDate: string | null;
  depositDate: string | null;
  clearDate: string | null;
  payee: string | null;
  drawer: string | null;
  description: string | null;
  customerId: string | null;
  customerName?: string | null;
  supplierId: string | null;
  supplierName?: string | null;
  bankAccountId: string | null;
  bankAccountName?: string | null;
  createdAt: string | null;
  notes?: string | null;
};

const TYPE_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  incoming: { label: "شيك وارد", color: "blue", icon: <BankOutlined /> },
  outgoing: { label: "شيك صادر", color: "orange", icon: <BankOutlined /> },
};

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  pending: { label: "معلق", color: "default" },
  deposited: { label: "مودع", color: "blue" },
  cleared: { label: "صُرف", color: "green" },
  bounced: { label: "مرتجع", color: "red" },
  cancelled: { label: "ملغي", color: "default" },
};

export default function CheckDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [check, setCheck] = useState<Check | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    document.title = "تفاصيل الشيك | BI Management v3";
  }, []);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    fetch(`${API_BASE}/api/checks/${id}`, { headers: getAuthHeaders() })
      .then((r) => {
        if (r.status === 401) {
          onAuthFailure();
          throw new Error("انتهت الجلسة");
        }
        return r.ok ? r.json() : Promise.reject(new Error("فشل التحميل"));
      })
      .then(setCheck)
      .catch((e) => message.error(e.message))
      .finally(() => setLoading(false));
  }, [id]);

  const isOverdue = (date: string | null, status: string) => {
    if (!date || status === "cleared" || status === "cancelled" || status === "bounced") return false;
    return new Date(date) < new Date();
  };

  if (loading) {
    return <LoadingSkeleton type="form" rows={8} />;
  }

  if (!check) {
    return (
      <Card>
        <div style={{ textAlign: "center", padding: "40px 0" }}>
          <p style={{ color: "#94a3b8", marginBottom: 16 }}>الشيك غير موجود</p>
          <Button type="primary" onClick={() => navigate("/checks")}>
            العودة للشيكات
          </Button>
        </div>
      </Card>
    );
  }

  const typeInfo = TYPE_CONFIG[check.type] || { label: check.type, color: "default", icon: <BankOutlined /> };
  const statusInfo = STATUS_CONFIG[check.status] || { label: check.status, color: "default" };
  const overdue = isOverdue(check.dueDate, check.status);

  // بناء التايم لاين للتواريخ
  const timelineItems = [];
  if (check.issueDate) {
    timelineItems.push({
      color: "blue",
      dot: <CalendarOutlined />,
      children: (
        <div>
          <div style={{ fontWeight: 500 }}>تاريخ الإصدار</div>
          <DateDisplay date={check.issueDate} />
        </div>
      ),
    });
  }
  if (check.dueDate) {
    timelineItems.push({
      color: overdue ? "red" : "gold",
      dot: overdue ? <ExclamationCircleOutlined /> : <ClockCircleOutlined />,
      children: (
        <div>
          <div style={{ fontWeight: 500, color: overdue ? "#ef4444" : undefined }}>
            تاريخ الاستحقاق {overdue && <Tag color="red" size="small">متأخر</Tag>}
          </div>
          <DateDisplay date={check.dueDate} />
        </div>
      ),
    });
  }
  if (check.depositDate) {
    timelineItems.push({
      color: "blue",
      dot: <BankOutlined />,
      children: (
        <div>
          <div style={{ fontWeight: 500 }}>تاريخ الإيداع</div>
          <DateDisplay date={check.depositDate} />
        </div>
      ),
    });
  }
  if (check.clearDate) {
    timelineItems.push({
      color: "green",
      dot: <CheckCircleOutlined />,
      children: (
        <div>
          <div style={{ fontWeight: 500, color: "#15803d" }}>تاريخ الصرف</div>
          <DateDisplay date={check.clearDate} />
        </div>
      ),
    });
  }

  return (
    <div>
      <PageHeader
        title={`شيك رقم ${check.checkNumber}`}
        subtitle={typeInfo.label}
        breadcrumbs={[
          { title: "الشيكات", href: "/checks" },
          { title: `شيك ${check.checkNumber}` },
        ]}
        extra={
          <Space>
            <Button icon={<ArrowRightOutlined />} onClick={() => navigate("/checks")}>
              العودة للشيكات
            </Button>
            <Button icon={<PrinterOutlined />} onClick={() => window.print()}>
              طباعة
            </Button>
            <Button type="primary" icon={<EditOutlined />} onClick={() => navigate(`/checks/${check.id}/edit`)}>
              تعديل الشيك
            </Button>
          </Space>
        }
      />

      {/* بطاقة المبلغ والحالة */}
      <Card style={{ marginBottom: 24 }}>
        <Row gutter={24} align="middle">
          <Col xs={24} sm={12} md={8}>
            <Statistic
              title="المبلغ"
              value={check.amount}
              suffix="د.ع"
              valueStyle={{ color: typeInfo.color === "blue" ? "#1d4ed8" : "#b45309", fontSize: 28 }}
            />
          </Col>
          <Col xs={24} sm={12} md={16}>
            <Space size="middle" wrap>
              <Tag color={typeInfo.color} icon={typeInfo.icon} style={{ fontSize: 14, padding: "4px 12px" }}>
                {typeInfo.label}
              </Tag>
              <Tag color={statusInfo.color} style={{ fontSize: 14, padding: "4px 12px" }}>
                {statusInfo.label}
              </Tag>
              {overdue && (
                <Tag color="red" icon={<ExclamationCircleOutlined />} style={{ fontSize: 14, padding: "4px 12px" }}>
                  متأخر
                </Tag>
              )}
            </Space>
          </Col>
        </Row>
      </Card>

      <Row gutter={[24, 24]}>
        {/* معلومات الشيك */}
        <Col xs={24} lg={12}>
          <Card title="معلومات الشيك">
            <Descriptions column={1} bordered size="small">
              <Descriptions.Item label="رقم الشيك">
                <code style={{ background: "#f1f5f9", padding: "2px 8px", borderRadius: 4 }}>
                  {check.checkNumber}
                </code>
              </Descriptions.Item>
              {check.bankName && (
                <Descriptions.Item label="البنك">
                  <Space>
                    <BankOutlined style={{ color: "#6366f1" }} />
                    {check.bankName}
                  </Space>
                </Descriptions.Item>
              )}
              {check.accountNumber && (
                <Descriptions.Item label="رقم الحساب">
                  <code style={{ background: "#f1f5f9", padding: "2px 8px", borderRadius: 4 }}>
                    {check.accountNumber}
                  </code>
                </Descriptions.Item>
              )}
              {check.payee && (
                <Descriptions.Item label="المستفيد">
                  <Space>
                    <UserOutlined />
                    {check.payee}
                  </Space>
                </Descriptions.Item>
              )}
              {check.drawer && (
                <Descriptions.Item label="الساحب">
                  <Space>
                    <UserOutlined />
                    {check.drawer}
                  </Space>
                </Descriptions.Item>
              )}
            </Descriptions>
          </Card>
        </Col>

        {/* التواريخ */}
        <Col xs={24} lg={12}>
          <Card title="التواريخ">
            {timelineItems.length > 0 ? (
              <Timeline items={timelineItems} />
            ) : (
              <div style={{ textAlign: "center", color: "#94a3b8", padding: 24 }}>
                لا توجد تواريخ مسجلة
              </div>
            )}
          </Card>
        </Col>

        {/* الأطراف */}
        <Col xs={24}>
          <Card title="الأطراف">
            <Descriptions column={{ xs: 1, sm: 2, md: 3 }} bordered size="small">
              {check.customerName && (
                <Descriptions.Item label="العميل">
                  <Link to={`/customers/${check.customerId}`} style={{ color: "#6366f1" }}>
                    <Space>
                      <UserOutlined />
                      {check.customerName}
                    </Space>
                  </Link>
                </Descriptions.Item>
              )}
              {check.supplierName && (
                <Descriptions.Item label="المورد">
                  <Link to={`/suppliers/${check.supplierId}`} style={{ color: "#6366f1" }}>
                    <Space>
                      <UserOutlined />
                      {check.supplierName}
                    </Space>
                  </Link>
                </Descriptions.Item>
              )}
              {check.bankAccountName && (
                <Descriptions.Item label="الحساب البنكي">
                  <Space>
                    <BankOutlined />
                    {check.bankAccountName}
                  </Space>
                </Descriptions.Item>
              )}
              {!check.customerName && !check.supplierName && !check.bankAccountName && (
                <Descriptions.Item label="الأطراف" span={3}>
                  <span style={{ color: "#94a3b8" }}>لا توجد أطراف مرتبطة</span>
                </Descriptions.Item>
              )}
            </Descriptions>
          </Card>
        </Col>

        {/* الوصف والملاحظات */}
        {(check.description || check.notes) && (
          <Col xs={24}>
            <Card title="الوصف / الملاحظات">
              <p style={{ margin: 0, color: "#475569", lineHeight: 1.8 }}>
                {check.description || check.notes}
              </p>
            </Card>
          </Col>
        )}
      </Row>
    </div>
  );
}
