import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Row, Col, Card, Descriptions, Button, Tag, Space, Statistic, Table, Alert } from "antd";
import type { ColumnsType } from "antd/es/table";
import {
  EditOutlined,
  PrinterOutlined,
  FileTextOutlined,
} from "@ant-design/icons";
import { PageHeader, MoneyDisplay, DateDisplay, LoadingSkeleton } from "../components/shared";
import { API_BASE, getAuthHeaders, onAuthFailure } from "../utils/api";

type InvoiceItem = {
  id: string;
  invoiceId: string;
  productId: string | null;
  description: string | null;
  quantity: number | null;
  unitPrice: number;
  discount: number | null;
  total: number;
};

type InvoiceDetailType = {
  id: string;
  invoiceNumber: string;
  type: string;
  paymentType: string | null;
  paymentStatus: string | null;
  status: string | null;
  subtotal: number | null;
  discountAmount: number | null;
  taxAmount: number | null;
  total: number | null;
  paidAmount: number | null;
  remainingAmount: number | null;
  createdAt: string | null;
  notes: string | null;
  items?: InvoiceItem[];
};

const TYPE_LABELS: Record<string, { label: string; color: string }> = {
  sales: { label: "مبيعات", color: "green" },
  purchases: { label: "مشتريات", color: "orange" },
  sales_return: { label: "مرتجع مبيعات", color: "red" },
  purchases_return: { label: "مرتجع مشتريات", color: "purple" },
};

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  draft: { label: "مسودة", color: "default" },
  confirmed: { label: "مؤكدة", color: "blue" },
  completed: { label: "مكتملة", color: "green" },
  cancelled: { label: "ملغاة", color: "red" },
};

const PAYMENT_STATUS_LABELS: Record<string, { label: string; color: string }> = {
  unpaid: { label: "غير مدفوعة", color: "red" },
  partial: { label: "جزئي", color: "orange" },
  paid: { label: "مدفوعة", color: "green" },
};

export default function InvoiceDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [data, setData] = useState<InvoiceDetailType | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    document.title = "تفاصيل الفاتورة | BI Management v3";
  }, []);

  useEffect(() => {
    if (!id) {
      setError("معرف الفاتورة مطلوب");
      setLoading(false);
      return;
    }
    setLoading(true);
    setError("");
    fetch(`${API_BASE}/api/invoices/${id}`, { headers: getAuthHeaders() })
      .then((res) => {
        if (res.status === 401) {
          onAuthFailure();
          throw new Error("انتهت الجلسة");
        }
        if (!res.ok) throw new Error("الفاتورة غير موجودة");
        return res.json();
      })
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div>
        <PageHeader
          title="تفاصيل الفاتورة"
          breadcrumbs={[
            { title: "الفواتير", href: "/invoices" },
            { title: "تفاصيل الفاتورة" },
          ]}
        />
        <LoadingSkeleton type="form" rows={6} />
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <PageHeader
          title="تفاصيل الفاتورة"
          breadcrumbs={[
            { title: "الفواتير", href: "/invoices" },
            { title: "خطأ" },
          ]}
        />
        <Alert
          message="خطأ"
          description={error}
          type="error"
          showIcon
          action={
            <Button type="link" onClick={() => navigate("/invoices")}>
              العودة للفواتير
            </Button>
          }
        />
      </div>
    );
  }

  if (!data) return null;

  const typeInfo = TYPE_LABELS[data.type] || { label: data.type, color: "default" };
  const statusInfo = STATUS_LABELS[data.status || "draft"] || STATUS_LABELS.draft;
  const paymentInfo = PAYMENT_STATUS_LABELS[data.paymentStatus || "unpaid"] || PAYMENT_STATUS_LABELS.unpaid;

  const itemColumns: ColumnsType<InvoiceItem> = [
    {
      title: "#",
      dataIndex: "index",
      key: "index",
      width: 60,
      render: (_, __, index) => index + 1,
    },
    {
      title: "الوصف",
      dataIndex: "description",
      key: "description",
      render: (text) => text || "—",
    },
    {
      title: "الكمية",
      dataIndex: "quantity",
      key: "quantity",
      width: 100,
      render: (qty) => qty || 0,
    },
    {
      title: "سعر الوحدة",
      dataIndex: "unitPrice",
      key: "unitPrice",
      width: 130,
      render: (price) => <MoneyDisplay amount={price} />,
    },
    {
      title: "الخصم",
      dataIndex: "discount",
      key: "discount",
      width: 100,
      render: (discount) =>
        discount && discount > 0 ? (
          <Tag color="orange">-{discount}</Tag>
        ) : (
          <span style={{ color: "#bfbfbf" }}>—</span>
        ),
    },
    {
      title: "الإجمالي",
      dataIndex: "total",
      key: "total",
      width: 130,
      render: (total) => <MoneyDisplay amount={total} colored />,
    },
  ];

  return (
    <div>
      <PageHeader
        title={`فاتورة #${data.invoiceNumber}`}
        breadcrumbs={[
          { title: "الفواتير", href: "/invoices" },
          { title: `فاتورة #${data.invoiceNumber}` },
        ]}
        extra={
          <>
            <Button icon={<EditOutlined />} onClick={() => navigate(`/invoices/${id}/edit`)}>
              تعديل
            </Button>
            <Button icon={<PrinterOutlined />} onClick={() => window.print()}>
              طباعة
            </Button>
          </>
        }
      />

      {/* Header Card with Status */}
      <Card style={{ marginBottom: 24 }}>
        <Row justify="space-between" align="middle">
          <Col>
            <Space size="middle">
              <Tag color={typeInfo.color}>{typeInfo.label}</Tag>
              <Tag color={statusInfo.color}>{statusInfo.label}</Tag>
              <Tag color={paymentInfo.color}>{paymentInfo.label}</Tag>
            </Space>
          </Col>
          <Col>
            <span style={{ color: "#8c8c8c" }}>
              تاريخ الإنشاء: <DateDisplay date={data.createdAt} />
            </span>
          </Col>
        </Row>
      </Card>

      {/* Financial Summary */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} md={4}>
          <Card>
            <Statistic
              title="المجموع الفرعي"
              formatter={() => <MoneyDisplay amount={data.subtotal || 0} />}
            />
          </Card>
        </Col>
        {(data.discountAmount || 0) > 0 && (
          <Col xs={24} sm={12} md={4}>
            <Card style={{ background: "#fffbe6", borderColor: "#ffe58f" }}>
              <Statistic
                title="الخصم"
                valueStyle={{ color: "#d48806" }}
                formatter={() => (
                  <span style={{ color: "#d48806" }}>
                    -<MoneyDisplay amount={data.discountAmount || 0} />
                  </span>
                )}
              />
            </Card>
          </Col>
        )}
        {(data.taxAmount || 0) > 0 && (
          <Col xs={24} sm={12} md={4}>
            <Card>
              <Statistic
                title="الضريبة"
                formatter={() => <MoneyDisplay amount={data.taxAmount || 0} />}
              />
            </Card>
          </Col>
        )}
        <Col xs={24} sm={12} md={4}>
          <Card style={{ background: "#e6f7ff", borderColor: "#91d5ff" }}>
            <Statistic
              title="الإجمالي"
              valueStyle={{ color: "#1890ff", fontWeight: 700 }}
              formatter={() => <MoneyDisplay amount={data.total || 0} size="large" />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={4}>
          <Card style={{ background: "#f6ffed", borderColor: "#b7eb8f" }}>
            <Statistic
              title="المدفوع"
              valueStyle={{ color: "#52c41a" }}
              formatter={() => <MoneyDisplay amount={data.paidAmount || 0} colored />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={4}>
          <Card
            style={{
              background: (data.remainingAmount || 0) > 0 ? "#fff2f0" : "#f5f5f5",
              borderColor: (data.remainingAmount || 0) > 0 ? "#ffccc7" : "#d9d9d9",
            }}
          >
            <Statistic
              title="المتبقي"
              valueStyle={{
                color: (data.remainingAmount || 0) > 0 ? "#ff4d4f" : "#8c8c8c",
              }}
              formatter={() => <MoneyDisplay amount={data.remainingAmount || 0} />}
            />
          </Card>
        </Col>
      </Row>

      {/* Notes */}
      {data.notes && (
        <Card
          title="ملاحظات"
          style={{ marginBottom: 24, background: "#fffbe6", borderColor: "#ffe58f" }}
        >
          <p style={{ margin: 0, color: "#8c6d1f" }}>{data.notes}</p>
        </Card>
      )}

      {/* Invoice Items */}
      <Card title="بنود الفاتورة" style={{ marginBottom: 24 }}>
        <Table
          columns={itemColumns}
          dataSource={data.items || []}
          rowKey="id"
          pagination={false}
          locale={{
            emptyText: "لا توجد بنود في هذه الفاتورة",
          }}
          scroll={{ x: "max-content" }}
        />
      </Card>

      {/* Quick Actions */}
      <Card title="إجراءات">
        <Space wrap>
          <Button
            type="primary"
            icon={<EditOutlined />}
            onClick={() => navigate(`/invoices/${id}/edit`)}
          >
            تعديل الفاتورة
          </Button>
          <Button icon={<PrinterOutlined />} onClick={() => window.print()}>
            طباعة
          </Button>
        </Space>
      </Card>
    </div>
  );
}
