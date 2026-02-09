/**
 * صفحة تفاصيل الشحنة
 */
import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import {
  Row,
  Col,
  Card,
  Descriptions,
  Table,
  Button,
  Tag,
  Space,
  Timeline,
  message,
  Popconfirm,
  Typography,
  Divider,
  Steps,
} from "antd";
import {
  ArrowRightOutlined,
  HomeOutlined,
  PrinterOutlined,
  PhoneOutlined,
  EnvironmentOutlined,
  CarOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  ClockCircleOutlined,
  UserOutlined,
  DollarOutlined,
} from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";
import { PageHeader, MoneyDisplay, DateDisplay, LoadingSkeleton } from "../components/shared";
import { API_BASE, getAuthHeaders } from "../utils/api";

const { Text, Title } = Typography;

interface ShipmentItem {
  id: string;
  serialNumber?: string;
  productName: string;
  quantity: number;
}

interface TrackingEvent {
  id: string;
  status: string;
  notes?: string;
  recordedAt: string;
  recordedBy?: string;
}

interface DeliveryCompany {
  id: string;
  name: string;
  nameAr?: string;
  type: string;
  phone?: string;
}

interface Customer {
  id: string;
  fullName: string;
  phone?: string;
  email?: string;
  address?: string;
}

interface Invoice {
  id: string;
  invoiceNumber: string;
  total: number;
}

interface Shipment {
  id: string;
  shipmentNumber: string;
  invoiceId: string;
  status: string;
  recipientName: string;
  recipientPhone: string;
  recipientPhone2?: string;
  deliveryAddress: string;
  city?: string;
  area?: string;
  codAmount: number;
  deliveryFee: number;
  collectedAmount?: number;
  deliveryNotes?: string;
  notes?: string;
  packagingVideoUrl?: string;
  preparedAt?: string;
  preparedBy?: string;
  handedOverAt?: string;
  deliveredAt?: string;
  returnedAt?: string;
  createdAt: string;
  company?: DeliveryCompany;
  customer?: Customer;
  invoice?: Invoice;
  items?: ShipmentItem[];
  tracking?: TrackingEvent[];
}

const STATUS_CONFIG: Record<string, { label: string; color: string; step: number }> = {
  pending: { label: "بانتظار التجهيز", color: "default", step: 0 },
  preparing: { label: "قيد التجهيز", color: "gold", step: 1 },
  ready: { label: "جاهز للتسليم", color: "blue", step: 2 },
  handed_over: { label: "تم التسليم للمندوب", color: "purple", step: 3 },
  in_transit: { label: "في الطريق", color: "orange", step: 3 },
  delivered: { label: "تم التوصيل", color: "green", step: 4 },
  returned: { label: "مرتجع", color: "red", step: -1 },
  partial_return: { label: "راجع جزئي", color: "magenta", step: -1 },
};

export default function ShipmentDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [shipment, setShipment] = useState<Shipment | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      fetchShipmentDetails();
    }
  }, [id]);

  const fetchShipmentDetails = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/delivery/shipments/${id}`, {
        headers: getAuthHeaders(),
      });

      if (!res.ok) {
        throw new Error("فشل في جلب بيانات الشحنة");
      }

      const data = await res.json();
      setShipment(data);
    } catch (err) {
      console.error(err);
      message.error("فشل في تحميل البيانات");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (newStatus: string) => {
    try {
      const res = await fetch(`${API_BASE}/api/delivery/shipments/${id}/status`, {
        method: "PATCH",
        headers: getAuthHeaders(),
        body: JSON.stringify({ status: newStatus }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "فشل في تحديث الحالة");
      }

      message.success("تم تحديث الحالة بنجاح");
      fetchShipmentDetails();
    } catch (err) {
      message.error(err instanceof Error ? err.message : "فشل في تحديث الحالة");
    }
  };

  const itemColumns: ColumnsType<ShipmentItem> = [
    {
      title: "المنتج",
      dataIndex: "productName",
      key: "productName",
    },
    {
      title: "السيريال",
      dataIndex: "serialNumber",
      key: "serialNumber",
      render: (text) => text ? <Text code>{text}</Text> : "-",
    },
    {
      title: "الكمية",
      dataIndex: "quantity",
      key: "quantity",
      width: 100,
      align: "center",
    },
  ];

  if (loading) {
    return <LoadingSkeleton />;
  }

  if (!shipment) {
    return (
      <Card>
        <div style={{ textAlign: "center", padding: 40 }}>
          <Title level={4}>الشحنة غير موجودة</Title>
          <Button type="primary" onClick={() => navigate("/delivery/shipments")}>
            العودة للقائمة
          </Button>
        </div>
      </Card>
    );
  }

  const statusConfig = STATUS_CONFIG[shipment.status] || STATUS_CONFIG.pending;

  // تحديد الخطوة الحالية
  const currentStep = statusConfig.step >= 0 ? statusConfig.step : 0;

  // الإجراءات المتاحة حسب الحالة
  const getActions = () => {
    const actions: React.ReactNode[] = [];

    if (shipment.status === "pending") {
      actions.push(
        <Link to={`/delivery/prepare/${id}`} key="prepare">
          <Button type="primary" icon={<CarOutlined />}>
            تجهيز الشحنة
          </Button>
        </Link>
      );
    }

    if (shipment.status === "preparing") {
      actions.push(
        <Button
          key="ready"
          type="primary"
          icon={<CheckCircleOutlined />}
          onClick={() => handleUpdateStatus("ready")}
        >
          جاهز للتسليم
        </Button>
      );
    }

    if (shipment.status === "ready") {
      actions.push(
        <Button
          key="handover"
          type="primary"
          style={{ background: "#722ed1" }}
          icon={<CarOutlined />}
          onClick={() => handleUpdateStatus("handed_over")}
        >
          تسليم للمندوب
        </Button>
      );
    }

    if (shipment.status === "handed_over" || shipment.status === "in_transit") {
      actions.push(
        <Button
          key="delivered"
          type="primary"
          style={{ background: "#52c41a" }}
          icon={<CheckCircleOutlined />}
          onClick={() => handleUpdateStatus("delivered")}
        >
          تم التوصيل
        </Button>,
        <Popconfirm
          key="return"
          title="تأكيد الإرجاع"
          description="هل الشحنة مرتجعة؟"
          onConfirm={() => handleUpdateStatus("returned")}
          okText="نعم"
          cancelText="لا"
          okButtonProps={{ danger: true }}
        >
          <Button danger icon={<CloseCircleOutlined />}>
            مرتجع
          </Button>
        </Popconfirm>
      );
    }

    actions.push(
      <Button key="print" icon={<PrinterOutlined />}>
        طباعة بوليصة
      </Button>
    );

    return actions;
  };

  return (
    <div>
      <PageHeader
        title={`شحنة ${shipment.shipmentNumber}`}
        breadcrumbs={[
          { icon: <HomeOutlined />, title: "الرئيسية", path: "/" },
          { title: "الشحنات", path: "/delivery/shipments" },
          { title: shipment.shipmentNumber },
        ]}
        extra={<Space wrap>{getActions()}</Space>}
      />

      {/* مسار الشحنة */}
      <Card style={{ marginBottom: 16 }}>
        <Steps
          current={currentStep}
          status={shipment.status === "returned" ? "error" : "process"}
          items={[
            { title: "بانتظار التجهيز", icon: <ClockCircleOutlined /> },
            { title: "قيد التجهيز", icon: <CarOutlined /> },
            { title: "جاهز للتسليم", icon: <CheckCircleOutlined /> },
            { title: "مع المندوب", icon: <CarOutlined /> },
            { title: "تم التوصيل", icon: <CheckCircleOutlined /> },
          ]}
        />
      </Card>

      <Row gutter={[16, 16]}>
        {/* معلومات الشحنة */}
        <Col xs={24} lg={16}>
          <Card title="معلومات الشحنة" style={{ marginBottom: 16 }}>
            <Descriptions column={{ xs: 1, sm: 2, md: 3 }} bordered size="small">
              <Descriptions.Item label="رقم الشحنة">
                <Text strong copyable>{shipment.shipmentNumber}</Text>
              </Descriptions.Item>
              <Descriptions.Item label="الحالة">
                <Tag color={statusConfig.color}>{statusConfig.label}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="تاريخ الإنشاء">
                <DateDisplay date={shipment.createdAt} showTime />
              </Descriptions.Item>
              {shipment.invoice && (
                <Descriptions.Item label="رقم الفاتورة">
                  <Link to={`/invoices/${shipment.invoiceId}`}>
                    {shipment.invoice.invoiceNumber}
                  </Link>
                </Descriptions.Item>
              )}
              {shipment.preparedAt && (
                <Descriptions.Item label="تاريخ التجهيز">
                  <DateDisplay date={shipment.preparedAt} showTime />
                </Descriptions.Item>
              )}
              {shipment.handedOverAt && (
                <Descriptions.Item label="تاريخ التسليم للمندوب">
                  <DateDisplay date={shipment.handedOverAt} showTime />
                </Descriptions.Item>
              )}
              {shipment.deliveredAt && (
                <Descriptions.Item label="تاريخ التوصيل">
                  <DateDisplay date={shipment.deliveredAt} showTime />
                </Descriptions.Item>
              )}
            </Descriptions>
          </Card>

          {/* بيانات المستلم */}
          <Card
            title={
              <span>
                <UserOutlined style={{ marginInlineEnd: 8 }} />
                بيانات المستلم
              </span>
            }
            style={{ marginBottom: 16 }}
          >
            <Descriptions column={{ xs: 1, sm: 2 }} bordered size="small">
              <Descriptions.Item label="الاسم">
                <Text strong>{shipment.recipientName}</Text>
              </Descriptions.Item>
              <Descriptions.Item label="رقم الهاتف">
                <Space>
                  <PhoneOutlined />
                  <a href={`tel:${shipment.recipientPhone}`}>{shipment.recipientPhone}</a>
                </Space>
              </Descriptions.Item>
              {shipment.recipientPhone2 && (
                <Descriptions.Item label="هاتف إضافي">
                  <a href={`tel:${shipment.recipientPhone2}`}>{shipment.recipientPhone2}</a>
                </Descriptions.Item>
              )}
              <Descriptions.Item label="العنوان" span={2}>
                <Space>
                  <EnvironmentOutlined />
                  {shipment.deliveryAddress}
                </Space>
              </Descriptions.Item>
              {shipment.city && (
                <Descriptions.Item label="المدينة">{shipment.city}</Descriptions.Item>
              )}
              {shipment.area && (
                <Descriptions.Item label="المنطقة">{shipment.area}</Descriptions.Item>
              )}
            </Descriptions>
          </Card>

          {/* البنود */}
          {shipment.items && shipment.items.length > 0 && (
            <Card title={`المحتويات (${shipment.items.length})`} style={{ marginBottom: 16 }}>
              <Table
                dataSource={shipment.items}
                columns={itemColumns}
                rowKey="id"
                pagination={false}
                size="small"
              />
            </Card>
          )}

          {/* ملاحظات */}
          {(shipment.deliveryNotes || shipment.notes) && (
            <Card title="ملاحظات" style={{ marginBottom: 16 }}>
              {shipment.deliveryNotes && (
                <div style={{ marginBottom: 8 }}>
                  <Text type="secondary">ملاحظات التوصيل:</Text>
                  <div>{shipment.deliveryNotes}</div>
                </div>
              )}
              {shipment.notes && (
                <div>
                  <Text type="secondary">ملاحظات أخرى:</Text>
                  <div>{shipment.notes}</div>
                </div>
              )}
            </Card>
          )}
        </Col>

        {/* الشريط الجانبي */}
        <Col xs={24} lg={8}>
          {/* المبالغ */}
          <Card
            title={
              <span>
                <DollarOutlined style={{ marginInlineEnd: 8 }} />
                المبالغ
              </span>
            }
            style={{ marginBottom: 16 }}
          >
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {shipment.invoice && (
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <Text type="secondary">قيمة الفاتورة</Text>
                  <MoneyDisplay amount={shipment.invoice.total} />
                </div>
              )}
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <Text type="secondary">رسوم التوصيل</Text>
                <MoneyDisplay amount={shipment.deliveryFee} />
              </div>
              <Divider style={{ margin: "8px 0" }} />
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <Text strong>المبلغ عند الاستلام (COD)</Text>
                <Text strong style={{ color: "#1890ff", fontSize: 18 }}>
                  <MoneyDisplay amount={shipment.codAmount} />
                </Text>
              </div>
              {shipment.collectedAmount !== undefined && shipment.collectedAmount > 0 && (
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <Text type="secondary">المبلغ المحصّل</Text>
                  <Text style={{ color: "#52c41a" }}>
                    <MoneyDisplay amount={shipment.collectedAmount} />
                  </Text>
                </div>
              )}
            </div>
          </Card>

          {/* شركة التوصيل */}
          {shipment.company && (
            <Card
              title={
                <span>
                  <CarOutlined style={{ marginInlineEnd: 8 }} />
                  شركة التوصيل
                </span>
              }
              style={{ marginBottom: 16 }}
            >
              <Descriptions column={1} size="small">
                <Descriptions.Item label="الاسم">
                  {shipment.company.nameAr || shipment.company.name}
                </Descriptions.Item>
                <Descriptions.Item label="النوع">
                  <Tag>{shipment.company.type === "internal" ? "داخلي" : "خارجي"}</Tag>
                </Descriptions.Item>
                {shipment.company.phone && (
                  <Descriptions.Item label="الهاتف">
                    <a href={`tel:${shipment.company.phone}`}>{shipment.company.phone}</a>
                  </Descriptions.Item>
                )}
              </Descriptions>
            </Card>
          )}

          {/* سجل التتبع */}
          {shipment.tracking && shipment.tracking.length > 0 && (
            <Card title="سجل التتبع">
              <Timeline
                items={shipment.tracking.map((event) => {
                  const config = STATUS_CONFIG[event.status] || { label: event.status, color: "default" };
                  return {
                    color: config.color === "green" ? "green" : config.color === "red" ? "red" : "blue",
                    children: (
                      <div>
                        <Tag color={config.color}>{config.label}</Tag>
                        {event.notes && <div style={{ marginTop: 4 }}>{event.notes}</div>}
                        <Text type="secondary" style={{ fontSize: 12, display: "block" }}>
                          <DateDisplay date={event.recordedAt} showTime />
                        </Text>
                      </div>
                    ),
                  };
                })}
              />
            </Card>
          )}

          {/* فيديو التغليف */}
          {shipment.packagingVideoUrl && (
            <Card title="فيديو التغليف" style={{ marginTop: 16 }}>
              <video
                src={shipment.packagingVideoUrl}
                controls
                style={{ width: "100%", borderRadius: 8 }}
              />
            </Card>
          )}
        </Col>
      </Row>
    </div>
  );
}
