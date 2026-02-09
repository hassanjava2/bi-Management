import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { Row, Col, Card, Descriptions, Button, Tag, Space, Statistic, message } from "antd";
import {
  EditOutlined,
  PrinterOutlined,
  ArrowRightOutlined,
  DownloadOutlined,
  UploadOutlined,
  BankOutlined,
  UserOutlined,
  WalletOutlined,
  CreditCardOutlined,
  DollarOutlined,
  FileTextOutlined,
} from "@ant-design/icons";
import { PageHeader, MoneyDisplay, DateDisplay, LoadingSkeleton } from "../components/shared";
import { API_BASE, getAuthHeaders, onAuthFailure } from "../utils/api";

type Voucher = {
  id: string;
  voucherNumber: string;
  type: string;
  amount: number;
  description: string | null;
  paymentMethod: string | null;
  referenceNumber: string | null;
  customerId: string | null;
  customerName?: string | null;
  supplierId: string | null;
  supplierName?: string | null;
  cashRegisterId: string | null;
  cashRegisterName?: string | null;
  bankAccountId: string | null;
  bankAccountName?: string | null;
  createdAt: string | null;
  createdBy?: string | null;
  notes?: string | null;
};

const TYPE_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  receipt: { label: "سند قبض", color: "green", icon: <DownloadOutlined /> },
  payment: { label: "سند صرف", color: "red", icon: <UploadOutlined /> },
};

const PAYMENT_METHOD_CONFIG: Record<string, { label: string; icon: React.ReactNode }> = {
  cash: { label: "نقداً", icon: <DollarOutlined /> },
  check: { label: "شيك", icon: <FileTextOutlined /> },
  bank_transfer: { label: "تحويل بنكي", icon: <BankOutlined /> },
  credit_card: { label: "بطاقة ائتمان", icon: <CreditCardOutlined /> },
};

export default function VoucherDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [voucher, setVoucher] = useState<Voucher | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    document.title = "تفاصيل السند | BI Management v3";
  }, []);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    fetch(`${API_BASE}/api/vouchers/${id}`, { headers: getAuthHeaders() })
      .then((r) => {
        if (r.status === 401) {
          onAuthFailure();
          throw new Error("انتهت الجلسة");
        }
        return r.ok ? r.json() : Promise.reject(new Error("فشل التحميل"));
      })
      .then(setVoucher)
      .catch((e) => message.error(e.message))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return <LoadingSkeleton type="form" rows={6} />;
  }

  if (!voucher) {
    return (
      <Card>
        <div style={{ textAlign: "center", padding: "40px 0" }}>
          <p style={{ color: "#94a3b8", marginBottom: 16 }}>السند غير موجود</p>
          <Button type="primary" onClick={() => navigate("/vouchers")}>
            العودة للسندات
          </Button>
        </div>
      </Card>
    );
  }

  const typeInfo = TYPE_CONFIG[voucher.type] || { label: voucher.type, color: "default", icon: <FileTextOutlined /> };
  const paymentMethod = PAYMENT_METHOD_CONFIG[voucher.paymentMethod || ""] || { label: voucher.paymentMethod || "-", icon: <WalletOutlined /> };

  return (
    <div>
      <PageHeader
        title={`سند رقم ${voucher.voucherNumber}`}
        subtitle={typeInfo.label}
        breadcrumbs={[
          { title: "السندات", href: "/vouchers" },
          { title: `سند ${voucher.voucherNumber}` },
        ]}
        extra={
          <Space>
            <Button icon={<ArrowRightOutlined />} onClick={() => navigate("/vouchers")}>
              العودة للسندات
            </Button>
            <Button icon={<PrinterOutlined />} onClick={() => window.print()}>
              طباعة
            </Button>
            <Button type="primary" icon={<EditOutlined />} onClick={() => navigate(`/vouchers/${voucher.id}/edit`)}>
              تعديل السند
            </Button>
          </Space>
        }
      />

      {/* بطاقة المبلغ والنوع */}
      <Card style={{ marginBottom: 24 }}>
        <Row gutter={24} align="middle">
          <Col xs={24} sm={12} md={8}>
            <Statistic
              title="المبلغ"
              value={voucher.amount}
              suffix="د.ع"
              valueStyle={{ color: voucher.type === "receipt" ? "#15803d" : "#b91c1c", fontSize: 28 }}
            />
          </Col>
          <Col xs={24} sm={12} md={16}>
            <Space size="middle" wrap>
              <Tag color={typeInfo.color} icon={typeInfo.icon} style={{ fontSize: 14, padding: "4px 12px" }}>
                {typeInfo.label}
              </Tag>
              <Tag icon={paymentMethod.icon} style={{ fontSize: 14, padding: "4px 12px" }}>
                {paymentMethod.label}
              </Tag>
            </Space>
          </Col>
        </Row>
      </Card>

      <Row gutter={[24, 24]}>
        {/* تفاصيل السند */}
        <Col xs={24} lg={12}>
          <Card title="تفاصيل السند">
            <Descriptions column={1} bordered size="small">
              <Descriptions.Item label="رقم السند">
                <code style={{ background: "#f1f5f9", padding: "2px 8px", borderRadius: 4 }}>
                  {voucher.voucherNumber}
                </code>
              </Descriptions.Item>
              <Descriptions.Item label="طريقة الدفع">
                <Space>
                  {paymentMethod.icon}
                  {paymentMethod.label}
                </Space>
              </Descriptions.Item>
              {voucher.referenceNumber && (
                <Descriptions.Item label="رقم المرجع">
                  <code style={{ background: "#f1f5f9", padding: "2px 8px", borderRadius: 4 }}>
                    {voucher.referenceNumber}
                  </code>
                </Descriptions.Item>
              )}
              <Descriptions.Item label="التاريخ">
                <DateDisplay date={voucher.createdAt} format="datetime" />
              </Descriptions.Item>
              {voucher.createdBy && (
                <Descriptions.Item label="بواسطة">
                  <Space>
                    <UserOutlined />
                    {voucher.createdBy}
                  </Space>
                </Descriptions.Item>
              )}
            </Descriptions>
          </Card>
        </Col>

        {/* الأطراف */}
        <Col xs={24} lg={12}>
          <Card title="الأطراف">
            <Descriptions column={1} bordered size="small">
              {voucher.customerName && (
                <Descriptions.Item label="العميل">
                  <Link to={`/customers/${voucher.customerId}`} style={{ color: "#6366f1" }}>
                    <Space>
                      <UserOutlined />
                      {voucher.customerName}
                    </Space>
                  </Link>
                </Descriptions.Item>
              )}
              {voucher.supplierName && (
                <Descriptions.Item label="المورد">
                  <Link to={`/suppliers/${voucher.supplierId}`} style={{ color: "#6366f1" }}>
                    <Space>
                      <UserOutlined />
                      {voucher.supplierName}
                    </Space>
                  </Link>
                </Descriptions.Item>
              )}
              {voucher.cashRegisterName && (
                <Descriptions.Item label="الصندوق">
                  <Space>
                    <WalletOutlined />
                    {voucher.cashRegisterName}
                  </Space>
                </Descriptions.Item>
              )}
              {voucher.bankAccountName && (
                <Descriptions.Item label="الحساب البنكي">
                  <Space>
                    <BankOutlined />
                    {voucher.bankAccountName}
                  </Space>
                </Descriptions.Item>
              )}
              {!voucher.customerName && !voucher.supplierName && !voucher.cashRegisterName && !voucher.bankAccountName && (
                <Descriptions.Item label="الأطراف">
                  <span style={{ color: "#94a3b8" }}>لا توجد أطراف مرتبطة</span>
                </Descriptions.Item>
              )}
            </Descriptions>
          </Card>
        </Col>

        {/* الوصف والملاحظات */}
        {(voucher.description || voucher.notes) && (
          <Col xs={24}>
            <Card title="الوصف / الملاحظات">
              <p style={{ margin: 0, color: "#475569", lineHeight: 1.8 }}>
                {voucher.description || voucher.notes}
              </p>
            </Card>
          </Col>
        )}
      </Row>
    </div>
  );
}
