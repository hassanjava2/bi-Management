/**
 * صفحة تفاصيل عرض السعر
 */
import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import {
  Row,
  Col,
  Card,
  Descriptions,
  Button,
  Tag,
  Space,
  Statistic,
  Table,
  Timeline,
  message,
  Empty,
  Modal,
} from "antd";
import {
  EditOutlined,
  PrinterOutlined,
  SendOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  FileTextOutlined,
  CopyOutlined,
  ExclamationCircleOutlined,
} from "@ant-design/icons";
import { PageHeader, StatusTag, MoneyDisplay, DateDisplay, LoadingSkeleton } from "../components/shared";
import { API_BASE, getAuthHeaders } from "../utils/api";

interface Quotation {
  id: string;
  quotationNumber: string;
  customerName: string | null;
  customerPhone: string | null;
  customerEmail: string | null;
  customerAddress: string | null;
  status: string;
  subtotal: string;
  discountAmount: string;
  taxAmount: string;
  totalAmount: string;
  validUntil: string | null;
  terms: string | null;
  notes: string | null;
  convertedToInvoice: boolean;
  invoiceId: string | null;
  createdAt: string;
  customer: { id: string; fullName: string; phone: string; email: string } | null;
  createdByUser: { id: string; fullName: string } | null;
  items: QuotationItem[];
  activities: Activity[];
}

interface QuotationItem {
  id: string;
  productName: string;
  productSku: string | null;
  quantity: number;
  unitPrice: string;
  discountAmount: string;
  lineTotal: string;
}

interface Activity {
  id: string;
  activityType: string;
  description: string;
  createdAt: string;
  user: { fullName: string } | null;
}

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  draft: { label: "مسودة", color: "default" },
  sent: { label: "مُرسل", color: "processing" },
  viewed: { label: "تمت المشاهدة", color: "purple" },
  accepted: { label: "مقبول", color: "success" },
  rejected: { label: "مرفوض", color: "error" },
  expired: { label: "منتهي", color: "default" },
  converted: { label: "تم التحويل", color: "cyan" },
};

const ACTIVITY_ICONS: Record<string, string> = {
  created: "📝",
  sent: "📤",
  viewed: "👁️",
  status_changed: "🔄",
  converted: "✅",
  followed_up: "📞",
};

export default function QuotationDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [quotation, setQuotation] = useState<Quotation | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    loadQuotation();
  }, [id]);

  const loadQuotation = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/quotations/${id}`, { headers: getAuthHeaders() });
      if (res.ok) {
        setQuotation(await res.json());
      } else {
        navigate("/quotations");
      }
    } catch (error) {
      console.error(error);
      message.error("فشل في تحميل بيانات عرض السعر");
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (newStatus: string) => {
    if (!quotation) return;
    setUpdating(true);
    try {
      const res = await fetch(`${API_BASE}/api/quotations/${quotation.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        message.success("تم تحديث الحالة");
        loadQuotation();
      }
    } catch (error) {
      console.error(error);
      message.error("فشل في تحديث الحالة");
    } finally {
      setUpdating(false);
    }
  };

  const convertToInvoice = async () => {
    if (!quotation) return;
    Modal.confirm({
      title: "تحويل إلى فاتورة",
      icon: <ExclamationCircleOutlined />,
      content: "هل تريد تحويل عرض السعر هذا إلى فاتورة؟",
      okText: "نعم، تحويل",
      cancelText: "إلغاء",
      onOk: async () => {
        setUpdating(true);
        try {
          const res = await fetch(`${API_BASE}/api/quotations/${quotation.id}/convert`, {
            method: "POST",
            headers: { "Content-Type": "application/json", ...getAuthHeaders() },
            body: JSON.stringify({}),
          });
          if (res.ok) {
            const data = await res.json();
            message.success("تم التحويل بنجاح");
            navigate(`/invoices/${data.invoiceId}`);
          }
        } catch (error) {
          console.error(error);
          message.error("فشل في التحويل");
        } finally {
          setUpdating(false);
        }
      },
    });
  };

  const duplicateQuotation = async () => {
    if (!quotation) return;
    try {
      const res = await fetch(`${API_BASE}/api/quotations/${quotation.id}/duplicate`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify({}),
      });
      if (res.ok) {
        const data = await res.json();
        message.success("تم النسخ بنجاح");
        navigate(`/quotations/${data.id}`);
      }
    } catch (error) {
      console.error(error);
      message.error("فشل في النسخ");
    }
  };

  if (loading) return <LoadingSkeleton />;
  if (!quotation) return <Empty description="عرض السعر غير موجود" />;

  const statusConfig = STATUS_CONFIG[quotation.status] || STATUS_CONFIG.draft;
  const isExpired = quotation.validUntil && new Date(quotation.validUntil) < new Date();

  const getActionButtons = () => {
    const buttons: React.ReactNode[] = [];

    if (quotation.status === "draft") {
      buttons.push(
        <Button key="edit" icon={<EditOutlined />} onClick={() => navigate(`/quotations/${quotation.id}/edit`)}>
          تعديل
        </Button>,
        <Button key="send" type="primary" icon={<SendOutlined />} onClick={() => updateStatus("sent")} loading={updating}>
          إرسال
        </Button>
      );
    }
    if (quotation.status === "sent") {
      buttons.push(
        <Button key="accept" type="primary" icon={<CheckCircleOutlined />} onClick={() => updateStatus("accepted")} loading={updating}>
          قبول
        </Button>,
        <Button key="reject" danger icon={<CloseCircleOutlined />} onClick={() => updateStatus("rejected")} loading={updating}>
          رفض
        </Button>
      );
    }
    if (quotation.status === "accepted" && !quotation.convertedToInvoice) {
      buttons.push(
        <Button key="convert" type="primary" icon={<FileTextOutlined />} onClick={convertToInvoice} loading={updating}>
          تحويل لفاتورة
        </Button>
      );
    }
    buttons.push(
      <Button key="duplicate" icon={<CopyOutlined />} onClick={duplicateQuotation}>
        تكرار
      </Button>,
      <Button key="print" icon={<PrinterOutlined />} onClick={() => window.print()}>
        طباعة
      </Button>
    );

    return buttons;
  };

  const itemsColumns = [
    {
      title: "المنتج",
      dataIndex: "productName",
      key: "productName",
      render: (v: string, r: QuotationItem) => (
        <div>
          <div style={{ fontWeight: 500 }}>{v}</div>
          {r.productSku && <div style={{ fontSize: 12, color: "#999" }}>{r.productSku}</div>}
        </div>
      ),
    },
    { title: "الكمية", dataIndex: "quantity", key: "quantity", align: "center" as const },
    {
      title: "السعر",
      dataIndex: "unitPrice",
      key: "unitPrice",
      align: "center" as const,
      render: (v: string) => <MoneyDisplay amount={Number(v)} showCurrency={false} />,
    },
    {
      title: "الخصم",
      dataIndex: "discountAmount",
      key: "discountAmount",
      align: "center" as const,
      render: (v: string) =>
        Number(v) > 0 ? (
          <span style={{ color: "#dc2626" }}>-<MoneyDisplay amount={Number(v)} showCurrency={false} /></span>
        ) : (
          "-"
        ),
    },
    {
      title: "المجموع",
      dataIndex: "lineTotal",
      key: "lineTotal",
      align: "center" as const,
      render: (v: string) => <strong><MoneyDisplay amount={Number(v)} showCurrency={false} /></strong>,
    },
  ];

  return (
    <div>
      <PageHeader
        title={quotation.quotationNumber}
        breadcrumbs={[
          { label: "عروض الأسعار", path: "/quotations" },
          { label: quotation.quotationNumber },
        ]}
        extra={<Space wrap>{getActionButtons()}</Space>}
      />

      {/* الحالة والتحذيرات */}
      <Card style={{ marginBottom: 16 }}>
        <Space size="middle">
          <Tag color={statusConfig.color}>{statusConfig.label}</Tag>
          {isExpired && quotation.status !== "converted" && quotation.status !== "rejected" && (
            <Tag color="error">منتهي الصلاحية</Tag>
          )}
        </Space>
      </Card>

      <Row gutter={16}>
        {/* المحتوى الرئيسي */}
        <Col span={17}>
          {/* معلومات العميل */}
          <Card title="معلومات العميل" style={{ marginBottom: 16 }}>
            <Descriptions column={2}>
              <Descriptions.Item label="الاسم">
                {quotation.customer?.fullName || quotation.customerName || "-"}
              </Descriptions.Item>
              <Descriptions.Item label="الهاتف">
                {quotation.customer?.phone || quotation.customerPhone || "-"}
              </Descriptions.Item>
              <Descriptions.Item label="البريد الإلكتروني">
                {quotation.customer?.email || quotation.customerEmail || "-"}
              </Descriptions.Item>
              <Descriptions.Item label="العنوان">
                {quotation.customerAddress || "-"}
              </Descriptions.Item>
            </Descriptions>
          </Card>

          {/* العناصر */}
          <Card title="العناصر" style={{ marginBottom: 16 }}>
            <Table
              columns={itemsColumns}
              dataSource={quotation.items}
              rowKey="id"
              pagination={false}
              locale={{ emptyText: "لا توجد عناصر" }}
              summary={() => (
                <Table.Summary>
                  <Table.Summary.Row>
                    <Table.Summary.Cell index={0} colSpan={4} align="left">
                      <strong>المجموع الفرعي:</strong>
                    </Table.Summary.Cell>
                    <Table.Summary.Cell index={1} align="center">
                      <MoneyDisplay amount={Number(quotation.subtotal)} />
                    </Table.Summary.Cell>
                  </Table.Summary.Row>
                  {Number(quotation.discountAmount) > 0 && (
                    <Table.Summary.Row>
                      <Table.Summary.Cell index={0} colSpan={4} align="left" style={{ color: "#dc2626" }}>
                        الخصم:
                      </Table.Summary.Cell>
                      <Table.Summary.Cell index={1} align="center" style={{ color: "#dc2626" }}>
                        -<MoneyDisplay amount={Number(quotation.discountAmount)} />
                      </Table.Summary.Cell>
                    </Table.Summary.Row>
                  )}
                  {Number(quotation.taxAmount) > 0 && (
                    <Table.Summary.Row>
                      <Table.Summary.Cell index={0} colSpan={4} align="left">
                        الضريبة:
                      </Table.Summary.Cell>
                      <Table.Summary.Cell index={1} align="center">
                        <MoneyDisplay amount={Number(quotation.taxAmount)} />
                      </Table.Summary.Cell>
                    </Table.Summary.Row>
                  )}
                  <Table.Summary.Row style={{ background: "#fafafa" }}>
                    <Table.Summary.Cell index={0} colSpan={4} align="left">
                      <strong style={{ fontSize: 16 }}>الإجمالي:</strong>
                    </Table.Summary.Cell>
                    <Table.Summary.Cell index={1} align="center">
                      <strong style={{ fontSize: 16, color: "#059669" }}>
                        <MoneyDisplay amount={Number(quotation.totalAmount)} />
                      </strong>
                    </Table.Summary.Cell>
                  </Table.Summary.Row>
                </Table.Summary>
              )}
            />
          </Card>

          {/* الشروط والملاحظات */}
          {(quotation.terms || quotation.notes) && (
            <Row gutter={16}>
              {quotation.terms && (
                <Col span={quotation.notes ? 12 : 24}>
                  <Card title="الشروط والأحكام" size="small">
                    <p style={{ margin: 0, whiteSpace: "pre-wrap", color: "#666" }}>{quotation.terms}</p>
                  </Card>
                </Col>
              )}
              {quotation.notes && (
                <Col span={quotation.terms ? 12 : 24}>
                  <Card title="ملاحظات" size="small">
                    <p style={{ margin: 0, whiteSpace: "pre-wrap", color: "#666" }}>{quotation.notes}</p>
                  </Card>
                </Col>
              )}
            </Row>
          )}
        </Col>

        {/* Sidebar */}
        <Col span={7}>
          {/* التفاصيل */}
          <Card title="التفاصيل" size="small" style={{ marginBottom: 16 }}>
            <Descriptions column={1} size="small">
              <Descriptions.Item label="تاريخ الإنشاء">
                <DateDisplay date={quotation.createdAt} />
              </Descriptions.Item>
              <Descriptions.Item label="صالح حتى">
                <span style={{ color: isExpired ? "#dc2626" : undefined }}>
                  {quotation.validUntil ? <DateDisplay date={quotation.validUntil} /> : "-"}
                </span>
              </Descriptions.Item>
              {quotation.createdByUser && (
                <Descriptions.Item label="أنشأه">
                  {quotation.createdByUser.fullName}
                </Descriptions.Item>
              )}
              {quotation.convertedToInvoice && (
                <Descriptions.Item label="الفاتورة">
                  <Link to={`/invoices/${quotation.invoiceId}`} style={{ color: "#1890ff" }}>
                    عرض الفاتورة
                  </Link>
                </Descriptions.Item>
              )}
            </Descriptions>
          </Card>

          {/* سجل النشاطات */}
          <Card title="سجل النشاطات" size="small">
            {quotation.activities.length === 0 ? (
              <Empty description="لا توجد نشاطات" image={Empty.PRESENTED_IMAGE_SIMPLE} />
            ) : (
              <Timeline
                items={quotation.activities.map((activity) => ({
                  children: (
                    <div style={{ fontSize: 13 }}>
                      <div>
                        <span style={{ marginLeft: 6 }}>{ACTIVITY_ICONS[activity.activityType] || "📌"}</span>
                        {activity.description}
                      </div>
                      <div style={{ fontSize: 11, color: "#999", marginTop: 4 }}>
                        {activity.user?.fullName || "النظام"} • <DateDisplay date={activity.createdAt} showTime />
                      </div>
                    </div>
                  ),
                }))}
              />
            )}
          </Card>
        </Col>
      </Row>
    </div>
  );
}
