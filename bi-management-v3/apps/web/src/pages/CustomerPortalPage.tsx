/**
 * بوابة العميل
 * Customer Portal - يدخل برقم الهاتف يشوف فواتيره وأقساطه وضماناته
 */
import { useState } from "react";
import { Row, Col, Card, Statistic, Table, Tag, Space, Input, Button, message, Empty, Tabs, Alert } from "antd";
import {
  PhoneOutlined, UserOutlined, DollarOutlined, FileTextOutlined,
  SafetyCertificateOutlined, GiftOutlined, CalendarOutlined,
  SearchOutlined, CheckCircleOutlined, WarningOutlined, ClockCircleOutlined,
} from "@ant-design/icons";
import { PageHeader, LoadingSkeleton } from "../components/shared";
import { API_BASE, getAuthHeaders } from "../utils/api";

export default function CustomerPortalPage() {
  const [phone, setPhone] = useState("");
  const [customerId, setCustomerId] = useState<string | null>(null);
  const [customerName, setCustomerName] = useState("");
  const [summary, setSummary] = useState<any>(null);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [installments, setInstallments] = useState<any>(null);
  const [warranties, setWarranties] = useState<any[]>([]);
  const [loyalty, setLoyalty] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [searching, setSearching] = useState(false);

  const searchCustomer = async () => {
    if (!phone.trim()) { message.warning("أدخل رقم الهاتف"); return; }
    setSearching(true);
    try {
      const res = await fetch(`${API_BASE}/api/customer-portal/login`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({ phone: phone.trim() }),
      });
      const data = await res.json();
      if (data.success) {
        setCustomerId(data.data.customerId);
        setCustomerName(data.data.name);
        loadCustomerData(data.data.customerId);
      } else {
        message.error(data.error || "رقم الهاتف غير مسجل");
      }
    } catch (error) {
      message.error("فشل في البحث");
    } finally {
      setSearching(false);
    }
  };

  const loadCustomerData = async (cid: string) => {
    setLoading(true);
    try {
      const [summaryRes, invoicesRes, installmentsRes, warrantiesRes, loyaltyRes] = await Promise.all([
        fetch(`${API_BASE}/api/customer-portal/${cid}/summary`, { headers: getAuthHeaders() }).then(r => r.ok ? r.json() : null).catch(() => null),
        fetch(`${API_BASE}/api/customer-portal/${cid}/invoices`, { headers: getAuthHeaders() }).then(r => r.ok ? r.json() : null).catch(() => null),
        fetch(`${API_BASE}/api/customer-portal/${cid}/installments`, { headers: getAuthHeaders() }).then(r => r.ok ? r.json() : null).catch(() => null),
        fetch(`${API_BASE}/api/customer-portal/${cid}/warranties`, { headers: getAuthHeaders() }).then(r => r.ok ? r.json() : null).catch(() => null),
        fetch(`${API_BASE}/api/customer-portal/${cid}/loyalty`, { headers: getAuthHeaders() }).then(r => r.ok ? r.json() : null).catch(() => null),
      ]);
      setSummary(summaryRes?.data || null);
      setInvoices(invoicesRes?.data || []);
      setInstallments(installmentsRes || null);
      setWarranties(warrantiesRes?.data || []);
      setLoyalty(loyaltyRes?.data || null);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  // شاشة البحث
  if (!customerId) {
    return (
      <div>
        <PageHeader title="بوابة العميل" subtitle="ابحث عن عميل بالهاتف لعرض بياناته" breadcrumbs={[{ title: "الرئيسية", href: "/" }, { title: "بوابة العميل" }]} />
        <Card style={{ maxWidth: 500, margin: "60px auto", borderRadius: 16, textAlign: "center" }}>
          <UserOutlined style={{ fontSize: 48, color: "#1890ff", marginBottom: 16 }} />
          <h2 style={{ marginBottom: 24 }}>بوابة العميل</h2>
          <Space.Compact style={{ width: "100%", marginBottom: 16 }}>
            <Input size="large" placeholder="رقم هاتف العميل..." prefix={<PhoneOutlined />} value={phone} onChange={(e) => setPhone(e.target.value)} onPressEnter={searchCustomer} dir="ltr" />
            <Button size="large" type="primary" icon={<SearchOutlined />} onClick={searchCustomer} loading={searching}>بحث</Button>
          </Space.Compact>
          <p style={{ color: "#999", fontSize: 13 }}>أدخل رقم هاتف العميل لعرض الفواتير والأقساط والضمانات</p>
        </Card>
      </div>
    );
  }

  if (loading) return <LoadingSkeleton />;

  const s = summary;
  const overdueInstallments = (installments?.data || []).filter((i: any) => i.category === "overdue");

  return (
    <div>
      <PageHeader
        title={`بوابة العميل: ${customerName}`}
        subtitle={`هاتف: ${phone}`}
        breadcrumbs={[{ title: "الرئيسية", href: "/" }, { title: "بوابة العميل" }]}
        extra={<Button onClick={() => { setCustomerId(null); setSummary(null); }}>بحث عن عميل آخر</Button>}
      />

      {/* تنبيه الأقساط المتأخرة */}
      {overdueInstallments.length > 0 && (
        <Alert type="error" showIcon icon={<WarningOutlined />} message={`يوجد ${overdueInstallments.length} قسط متأخر!`} style={{ marginBottom: 16, borderRadius: 8 }} />
      )}

      {/* الملخص */}
      <Row gutter={[12, 12]} style={{ marginBottom: 20 }}>
        <Col xs={12} sm={6}>
          <Card size="small" style={{ borderRadius: 10, borderTop: "3px solid #1890ff" }}>
            <Statistic title="الفواتير" value={s?.invoices?.total || 0} prefix={<FileTextOutlined />} valueStyle={{ color: "#1890ff" }} />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card size="small" style={{ borderRadius: 10, borderTop: "3px solid #ff4d4f" }}>
            <Statistic title="المبلغ المتبقي" value={s?.invoices?.remainingAmount || 0} prefix={<DollarOutlined />} valueStyle={{ color: "#ff4d4f" }} suffix="د.ع" />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card size="small" style={{ borderRadius: 10, borderTop: "3px solid #52c41a" }}>
            <Statistic title="ضمانات نشطة" value={s?.warranties?.activeCount || 0} prefix={<SafetyCertificateOutlined />} valueStyle={{ color: "#52c41a" }} />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card size="small" style={{ borderRadius: 10, borderTop: "3px solid #722ed1" }}>
            <Statistic title="نقاط الولاء" value={s?.loyalty?.currentPoints || 0} prefix={<GiftOutlined />} valueStyle={{ color: "#722ed1" }} />
          </Card>
        </Col>
      </Row>

      {/* التبويبات */}
      <Card style={{ borderRadius: 12 }}>
        <Tabs items={[
          {
            key: "invoices",
            label: <Space><FileTextOutlined /> الفواتير ({invoices.length})</Space>,
            children: invoices.length === 0 ? <Empty description="لا توجد فواتير" /> : (
              <Table dataSource={invoices} columns={[
                { title: "رقم الفاتورة", dataIndex: "invoiceNumber", key: "num" },
                { title: "النوع", dataIndex: "type", key: "type", render: (t: string) => <Tag>{t}</Tag> },
                { title: "المبلغ", dataIndex: "total", key: "total", render: (v: number) => `${(v || 0).toLocaleString()} د.ع` },
                { title: "المدفوع", dataIndex: "paidAmount", key: "paid", render: (v: number) => `${(v || 0).toLocaleString()}` },
                { title: "المتبقي", dataIndex: "remainingAmount", key: "remaining", render: (v: number) => v > 0 ? <span style={{ color: "#ff4d4f", fontWeight: 600 }}>{v.toLocaleString()}</span> : <Tag color="green">مدفوع</Tag> },
                { title: "الحالة", dataIndex: "paymentStatus", key: "status", render: (s: string) => <Tag color={s === "paid" ? "green" : s === "partial" ? "orange" : "red"}>{s === "paid" ? "مدفوع" : s === "partial" ? "جزئي" : "معلق"}</Tag> },
                { title: "التاريخ", dataIndex: "createdAt", key: "date", render: (d: string) => d ? new Date(d).toLocaleDateString("ar-IQ") : "-" },
              ]} rowKey="id" size="small" pagination={{ pageSize: 10 }} />
            ),
          },
          {
            key: "installments",
            label: <Space><CalendarOutlined /> الأقساط ({installments?.summary?.total || 0})</Space>,
            children: !installments?.data?.length ? <Empty description="لا توجد أقساط" /> : (
              <Table dataSource={installments.data} columns={[
                { title: "الفاتورة", dataIndex: "invoiceNumber", key: "inv" },
                { title: "رقم القسط", dataIndex: "installmentNumber", key: "num", align: "center" as const },
                { title: "المبلغ", dataIndex: "amount", key: "amount", render: (v: number) => `${(v || 0).toLocaleString()} د.ع` },
                { title: "تاريخ الاستحقاق", dataIndex: "dueDate", key: "due" },
                { title: "الحالة", dataIndex: "category", key: "cat", render: (cat: string) => (
                  <Tag color={cat === "paid" ? "green" : cat === "overdue" ? "red" : "blue"} icon={cat === "paid" ? <CheckCircleOutlined /> : cat === "overdue" ? <WarningOutlined /> : <ClockCircleOutlined />}>
                    {cat === "paid" ? "مدفوع" : cat === "overdue" ? "متأخر" : "قادم"}
                  </Tag>
                )},
                { title: "غرامة", dataIndex: "lateFee", key: "fee", render: (v: number) => v > 0 ? <span style={{ color: "#ff4d4f" }}>{v.toLocaleString()}</span> : "-" },
              ]} rowKey="id" size="small" />
            ),
          },
          {
            key: "warranties",
            label: <Space><SafetyCertificateOutlined /> الضمانات ({warranties.length})</Space>,
            children: warranties.length === 0 ? <Empty description="لا توجد ضمانات" /> : (
              <Table dataSource={warranties} columns={[
                { title: "رقم الضمان", dataIndex: "warrantyNumber", key: "num" },
                { title: "السيريال", dataIndex: "serialNumber", key: "serial" },
                { title: "المنتج", key: "product", render: (_: any, r: any) => r.productName || r.model || "-" },
                { title: "ينتهي", dataIndex: "endDate", key: "end", render: (d: string) => d ? new Date(d).toLocaleDateString("ar-IQ") : "-" },
                { title: "المتبقي", dataIndex: "daysLeft", key: "days", render: (d: number, r: any) => r.isExpired ? <Tag color="red">منتهي</Tag> : <Tag color={d <= 7 ? "orange" : "green"}>{d} يوم</Tag> },
                { title: "المطالبات", dataIndex: "claimsCount", key: "claims" },
              ]} rowKey="id" size="small" />
            ),
          },
          {
            key: "loyalty",
            label: <Space><GiftOutlined /> نقاط الولاء</Space>,
            children: !loyalty?.hasAccount ? (
              <Empty description="لا يوجد حساب ولاء لهذا العميل" />
            ) : (
              <div>
                <Row gutter={16} style={{ marginBottom: 16 }}>
                  <Col span={8}><Card size="small"><Statistic title="النقاط الحالية" value={loyalty.currentPoints} valueStyle={{ color: "#722ed1" }} /></Card></Col>
                  <Col span={8}><Card size="small"><Statistic title="إجمالي المكتسب" value={loyalty.totalEarned} valueStyle={{ color: "#52c41a" }} /></Card></Col>
                  <Col span={8}><Card size="small"><Statistic title="إجمالي المستبدل" value={loyalty.totalRedeemed} valueStyle={{ color: "#fa8c16" }} /></Card></Col>
                </Row>
                {loyalty.transactions?.length > 0 && (
                  <Table dataSource={loyalty.transactions} columns={[
                    { title: "النوع", dataIndex: "transactionType", key: "type", render: (t: string) => <Tag color={t === "earn" ? "green" : t === "redeem" ? "orange" : "blue"}>{t === "earn" ? "كسب" : t === "redeem" ? "استبدال" : t}</Tag> },
                    { title: "النقاط", dataIndex: "points", key: "points", render: (p: number) => <span style={{ color: p > 0 ? "#52c41a" : "#ff4d4f", fontWeight: 600 }}>{p > 0 ? `+${p}` : p}</span> },
                    { title: "الوصف", dataIndex: "description", key: "desc" },
                    { title: "التاريخ", dataIndex: "createdAt", key: "date", render: (d: string) => d ? new Date(d).toLocaleDateString("ar-IQ") : "-" },
                  ]} rowKey="id" size="small" pagination={{ pageSize: 10 }} />
                )}
              </div>
            ),
          },
        ]} />
      </Card>
    </div>
  );
}
