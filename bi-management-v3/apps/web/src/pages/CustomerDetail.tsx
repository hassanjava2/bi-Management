import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { Row, Col, Card, Descriptions, Button, Tag, Space, Statistic, message, Alert } from "antd";
import {
  EditOutlined,
  PrinterOutlined,
  FileTextOutlined,
  WalletOutlined,
  PhoneOutlined,
  MailOutlined,
  EnvironmentOutlined,
  UserOutlined,
} from "@ant-design/icons";
import { PageHeader, StatusTag, MoneyDisplay, DateDisplay, LoadingSkeleton } from "../components/shared";
import { API_BASE, getAuthHeaders, onAuthFailure } from "../utils/api";

type CustomerDetailType = {
  id: string;
  code: string | null;
  name: string;
  nameAr: string | null;
  type: string | null;
  phone: string | null;
  phone2: string | null;
  email: string | null;
  address: string | null;
  city: string | null;
  balance: number | null;
  creditLimit: number | null;
  isActive: number | null;
  isBlocked: number | null;
  createdAt: string | null;
  notes: string | null;
};

const TYPE_LABELS: Record<string, { label: string; color: string }> = {
  retail: { label: "قطاعي", color: "blue" },
  wholesale: { label: "جملة", color: "purple" },
  company: { label: "شركة", color: "orange" },
};

export default function CustomerDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [data, setData] = useState<CustomerDetailType | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    document.title = "تفاصيل العميل | BI Management v3";
  }, []);

  useEffect(() => {
    if (!id) {
      setError("معرف العميل مطلوب");
      setLoading(false);
      return;
    }
    setLoading(true);
    setError("");
    fetch(`${API_BASE}/api/customers/${id}`, { headers: getAuthHeaders() })
      .then((res) => {
        if (res.status === 401) {
          onAuthFailure();
          throw new Error("انتهت الجلسة");
        }
        if (!res.ok) throw new Error("العميل غير موجود");
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
          title="تفاصيل العميل"
          breadcrumbs={[
            { title: "العملاء", href: "/customers" },
            { title: "تفاصيل العميل" },
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
          title="تفاصيل العميل"
          breadcrumbs={[
            { title: "العملاء", href: "/customers" },
            { title: "خطأ" },
          ]}
        />
        <Alert
          message="خطأ"
          description={error}
          type="error"
          showIcon
          action={
            <Button type="link" onClick={() => navigate("/customers")}>
              العودة للعملاء
            </Button>
          }
        />
      </div>
    );
  }

  if (!data) return null;

  const typeInfo = TYPE_LABELS[data.type || "retail"] || TYPE_LABELS.retail;
  const isOverLimit = data.creditLimit && data.balance && data.balance > data.creditLimit;

  const getStatusTag = () => {
    if (data.isBlocked) {
      return <Tag color="red">محظور</Tag>;
    }
    if (data.isActive) {
      return <Tag color="green">نشط</Tag>;
    }
    return <Tag color="default">غير نشط</Tag>;
  };

  return (
    <div>
      <PageHeader
        title={data.nameAr || data.name}
        subtitle={data.nameAr ? data.name : undefined}
        breadcrumbs={[
          { title: "العملاء", href: "/customers" },
          { title: data.nameAr || data.name },
        ]}
        extra={
          <>
            <Button icon={<EditOutlined />} onClick={() => navigate(`/customers/${id}/edit`)}>
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
              {getStatusTag()}
              {data.code && (
                <Tag color="default" style={{ fontFamily: "monospace" }}>
                  كود: {data.code}
                </Tag>
              )}
            </Space>
          </Col>
        </Row>
      </Card>

      {/* Financial Summary */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} md={8}>
          <Card>
            <Statistic
              title="الرصيد الحالي"
              value={data.balance || 0}
              precision={0}
              valueStyle={{
                color: (data.balance || 0) >= 0 ? "#3f8600" : "#cf1322",
                fontWeight: 600,
              }}
              formatter={(value) => <MoneyDisplay amount={Number(value)} colored size="large" />}
            />
            {isOverLimit && (
              <Tag color="warning" style={{ marginTop: 8 }}>
                تجاوز حد الائتمان!
              </Tag>
            )}
          </Card>
        </Col>
        <Col xs={24} sm={12} md={8}>
          <Card>
            <Statistic
              title="حد الائتمان"
              value={data.creditLimit || 0}
              precision={0}
              valueStyle={{ color: "#1890ff", fontWeight: 600 }}
              formatter={(value) =>
                data.creditLimit ? (
                  <MoneyDisplay amount={Number(value)} size="large" />
                ) : (
                  <span style={{ color: "#8c8c8c" }}>غير محدد</span>
                )
              }
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={8}>
          <Card>
            <Statistic
              title="تاريخ الإنشاء"
              valueStyle={{ fontSize: 18 }}
              formatter={() => <DateDisplay date={data.createdAt} />}
            />
          </Card>
        </Col>
      </Row>

      {/* Contact Information */}
      <Card title="معلومات الاتصال" style={{ marginBottom: 24 }}>
        <Descriptions column={{ xs: 1, sm: 2, md: 3 }} bordered>
          {data.phone && (
            <Descriptions.Item label={<><PhoneOutlined /> الهاتف</>}>
              {data.phone}
            </Descriptions.Item>
          )}
          {data.phone2 && (
            <Descriptions.Item label={<><PhoneOutlined /> هاتف إضافي</>}>
              {data.phone2}
            </Descriptions.Item>
          )}
          {data.email && (
            <Descriptions.Item label={<><MailOutlined /> البريد الإلكتروني</>}>
              <a href={`mailto:${data.email}`}>{data.email}</a>
            </Descriptions.Item>
          )}
          {data.city && (
            <Descriptions.Item label={<><EnvironmentOutlined /> المدينة</>}>
              {data.city}
            </Descriptions.Item>
          )}
          {data.address && (
            <Descriptions.Item label={<><EnvironmentOutlined /> العنوان</>} span={2}>
              {data.address}
            </Descriptions.Item>
          )}
        </Descriptions>
      </Card>

      {/* Notes */}
      {data.notes && (
        <Card
          title="ملاحظات"
          style={{ marginBottom: 24, background: "#fffbe6", borderColor: "#ffe58f" }}
        >
          <p style={{ margin: 0, color: "#8c6d1f" }}>{data.notes}</p>
        </Card>
      )}

      {/* Quick Actions */}
      <Card title="إجراءات سريعة">
        <Space wrap>
          <Button
            type="primary"
            icon={<FileTextOutlined />}
            style={{ background: "#14b8a6" }}
            onClick={() => navigate(`/invoices/new?customerId=${id}`)}
          >
            إنشاء فاتورة
          </Button>
          <Button
            type="primary"
            icon={<WalletOutlined />}
            style={{ background: "#f97316" }}
            onClick={() => navigate(`/vouchers/new?customerId=${id}`)}
          >
            إنشاء سند قبض
          </Button>
          <Button
            icon={<EditOutlined />}
            onClick={() => navigate(`/customers/${id}/edit`)}
          >
            تعديل البيانات
          </Button>
        </Space>
      </Card>
    </div>
  );
}
