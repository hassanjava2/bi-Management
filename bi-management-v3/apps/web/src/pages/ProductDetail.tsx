import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Row, Col, Card, Descriptions, Button, Tag, Space, Statistic, message, Alert } from "antd";
import {
  EditOutlined,
  PrinterOutlined,
  FileTextOutlined,
  BarcodeOutlined,
  InboxOutlined,
  DollarOutlined,
  PercentageOutlined,
} from "@ant-design/icons";
import { PageHeader, MoneyDisplay, DateDisplay, LoadingSkeleton } from "../components/shared";
import { API_BASE, getAuthHeaders, onAuthFailure } from "../utils/api";

type ProductDetailType = {
  id: string;
  code: string | null;
  name: string;
  nameAr: string | null;
  categoryId: string | null;
  unit: string | null;
  sellingPrice: number | null;
  costPrice: number | null;
  purchasePrice: number | null;
  quantity: number | null;
  minQuantity: number | null;
  trackBySerial: number | null;
  isActive: number | null;
  description: string | null;
  specs: unknown;
  createdAt: string | null;
  updatedAt: string | null;
};

const UNIT_LABELS: Record<string, string> = {
  piece: "قطعة",
  kg: "كجم",
  gram: "جرام",
  liter: "لتر",
  meter: "متر",
  box: "صندوق",
  pack: "عبوة",
  set: "طقم",
};

export default function ProductDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [data, setData] = useState<ProductDetailType | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    document.title = "تفاصيل المنتج | BI Management v3";
  }, []);

  useEffect(() => {
    if (!id) {
      setError("معرف المنتج مطلوب");
      setLoading(false);
      return;
    }
    setLoading(true);
    setError("");
    fetch(`${API_BASE}/api/products/${id}`, { headers: getAuthHeaders() })
      .then((res) => {
        if (res.status === 401) {
          onAuthFailure();
          throw new Error("انتهت الجلسة");
        }
        if (!res.ok) throw new Error("المنتج غير موجود");
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
          title="تفاصيل المنتج"
          breadcrumbs={[
            { title: "المنتجات", href: "/products" },
            { title: "تفاصيل المنتج" },
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
          title="تفاصيل المنتج"
          breadcrumbs={[
            { title: "المنتجات", href: "/products" },
            { title: "خطأ" },
          ]}
        />
        <Alert
          message="خطأ"
          description={error}
          type="error"
          showIcon
          action={
            <Button type="link" onClick={() => navigate("/products")}>
              العودة للمنتجات
            </Button>
          }
        />
      </div>
    );
  }

  if (!data) return null;

  const isLowStock = data.minQuantity && data.quantity && data.quantity <= data.minQuantity;
  const profitMargin =
    data.sellingPrice && data.costPrice
      ? (((data.sellingPrice - data.costPrice) / data.costPrice) * 100).toFixed(1)
      : null;
  const unitLabel = UNIT_LABELS[data.unit || "piece"] || data.unit || "قطعة";

  return (
    <div>
      <PageHeader
        title={data.nameAr || data.name}
        subtitle={data.nameAr ? data.name : undefined}
        breadcrumbs={[
          { title: "المنتجات", href: "/products" },
          { title: data.nameAr || data.name },
        ]}
        extra={
          <>
            <Button icon={<EditOutlined />} onClick={() => navigate(`/products/${id}/edit`)}>
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
              {data.trackBySerial === 1 && <Tag color="blue">تتبع سيريال</Tag>}
              <Tag color={data.isActive ? "green" : "red"}>
                {data.isActive ? "نشط" : "غير نشط"}
              </Tag>
              {isLowStock && <Tag color="warning">مخزون منخفض</Tag>}
              {data.code && (
                <Tag icon={<BarcodeOutlined />} style={{ fontFamily: "monospace" }}>
                  {data.code}
                </Tag>
              )}
            </Space>
          </Col>
        </Row>
      </Card>

      {/* Stock & Pricing Summary */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="الكمية المتاحة"
              value={data.quantity || 0}
              suffix={unitLabel}
              valueStyle={{
                color: isLowStock ? "#faad14" : "#1890ff",
                fontWeight: 600,
              }}
              prefix={<InboxOutlined />}
            />
            {data.minQuantity && (
              <div style={{ marginTop: 8, color: "#8c8c8c", fontSize: 12 }}>
                الحد الأدنى: {data.minQuantity}
              </div>
            )}
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="سعر البيع"
              valueStyle={{ color: "#3f8600", fontWeight: 600 }}
              formatter={() =>
                data.sellingPrice ? (
                  <MoneyDisplay amount={data.sellingPrice} colored size="large" />
                ) : (
                  <span style={{ color: "#8c8c8c" }}>—</span>
                )
              }
              prefix={<DollarOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="سعر التكلفة"
              valueStyle={{ color: "#cf1322", fontWeight: 600 }}
              formatter={() => {
                const cost = data.costPrice || data.purchasePrice;
                return cost ? (
                  <MoneyDisplay amount={cost} size="large" />
                ) : (
                  <span style={{ color: "#8c8c8c" }}>—</span>
                );
              }}
              prefix={<DollarOutlined />}
            />
          </Card>
        </Col>
        {profitMargin && (
          <Col xs={24} sm={12} md={6}>
            <Card>
              <Statistic
                title="هامش الربح"
                value={profitMargin}
                suffix="%"
                valueStyle={{ color: "#722ed1", fontWeight: 600 }}
                prefix={<PercentageOutlined />}
              />
            </Card>
          </Col>
        )}
      </Row>

      {/* Product Details */}
      <Card title="معلومات المنتج" style={{ marginBottom: 24 }}>
        <Descriptions column={{ xs: 1, sm: 2, md: 3 }} bordered>
          <Descriptions.Item label="الوحدة">{unitLabel}</Descriptions.Item>
          <Descriptions.Item label="تاريخ الإنشاء">
            <DateDisplay date={data.createdAt} />
          </Descriptions.Item>
          {data.updatedAt && (
            <Descriptions.Item label="آخر تحديث">
              <DateDisplay date={data.updatedAt} />
            </Descriptions.Item>
          )}
        </Descriptions>
      </Card>

      {/* Description */}
      {data.description && (
        <Card title="الوصف" style={{ marginBottom: 24 }}>
          <p style={{ margin: 0, color: "#595959" }}>{data.description}</p>
        </Card>
      )}

      {/* Quick Actions */}
      <Card title="إجراءات سريعة">
        <Space wrap>
          <Button
            type="primary"
            icon={<FileTextOutlined />}
            style={{ background: "#14b8a6" }}
            onClick={() => navigate(`/invoices/new?productId=${id}`)}
          >
            إنشاء فاتورة مبيعات
          </Button>
          <Button icon={<EditOutlined />} onClick={() => navigate(`/products/${id}/edit`)}>
            تعديل المنتج
          </Button>
        </Space>
      </Card>
    </div>
  );
}
