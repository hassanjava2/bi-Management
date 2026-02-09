/**
 * صفحة سجل تتبع الجهاز
 */
import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import {
  Row,
  Col,
  Card,
  Button,
  Tag,
  Space,
  Statistic,
  Empty,
  Timeline,
  Descriptions,
  Typography,
  Alert,
  Result,
} from "antd";
import {
  ArrowLeftOutlined,
  MobileOutlined,
  SafetyCertificateOutlined,
  UserOutlined,
  ShoppingOutlined,
  SwapOutlined,
  ToolOutlined,
  WarningOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
} from "@ant-design/icons";
import { PageHeader, DateDisplay, LoadingSkeleton } from "../components/shared";
import { API_BASE, getAuthHeaders } from "../utils/api";

const { Text, Title } = Typography;

interface Device {
  id: string;
  serialNumber: string;
  status: string;
  condition: string;
  productName: string;
  productNameAr: string;
  productModel: string;
  warehouseName: string;
  purchaseDate: string;
  saleDate: string;
  warrantyMonths: number;
  warrantyStart: string;
  warrantyEnd: string;
  supplierWarrantyEnd: string;
  sellingPrice: number;
  notes: string;
  createdAt: string;
  custodySince?: string;
  custodyReason?: string;
}

interface Movement {
  id: string;
  movementType: string;
  fromWarehouseId: string;
  toWarehouseId: string;
  fromStatus: string;
  toStatus: string;
  referenceType: string;
  referenceId: string;
  performedByName: string;
  performedAt: string;
  notes: string;
}

interface Customer {
  id: string;
  fullName: string;
  phone: string;
}

interface CustodyUser {
  id: string;
  fullName: string;
}

interface Stats {
  totalMovements: number;
  warehouseTransfers: number;
  custodyChanges: number;
  maintenanceCount: number;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  available: { label: "متاح للبيع", color: "green", icon: <CheckCircleOutlined /> },
  reserved: { label: "محجوز", color: "gold", icon: <ClockCircleOutlined /> },
  sold: { label: "مباع", color: "blue", icon: <ShoppingOutlined /> },
  in_custody: { label: "في عهدة موظف", color: "purple", icon: <UserOutlined /> },
  in_maintenance: { label: "قيد الصيانة", color: "orange", icon: <ToolOutlined /> },
  damaged: { label: "تالف", color: "red", icon: <WarningOutlined /> },
  returned: { label: "مرتجع", color: "default", icon: <SwapOutlined /> },
};

const MOVEMENT_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  purchase_received: { label: "استلام من المورد", color: "green", icon: <ShoppingOutlined /> },
  warehouse_transfer: { label: "نقل بين المخازن", color: "blue", icon: <SwapOutlined /> },
  custody_assign: { label: "تسليم عهدة", color: "purple", icon: <UserOutlined /> },
  custody_return: { label: "استرداد عهدة", color: "purple", icon: <SwapOutlined /> },
  sale: { label: "بيع للعميل", color: "green", icon: <ShoppingOutlined /> },
  sale_return: { label: "مرتجع من عميل", color: "orange", icon: <SwapOutlined /> },
  maintenance_in: { label: "دخول صيانة", color: "orange", icon: <ToolOutlined /> },
  maintenance_out: { label: "خروج صيانة", color: "green", icon: <CheckCircleOutlined /> },
  upgrade: { label: "ترقية", color: "blue", icon: <CheckCircleOutlined /> },
  downgrade: { label: "تنزيل", color: "default", icon: <WarningOutlined /> },
  damage: { label: "تسجيل تلف", color: "red", icon: <WarningOutlined /> },
  adjustment: { label: "تعديل جرد", color: "default", icon: <SwapOutlined /> },
};

export default function DeviceHistory() {
  const { serialNumber } = useParams();
  const [device, setDevice] = useState<Device | null>(null);
  const [movements, setMovements] = useState<Movement[]>([]);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [custodyUser, setCustodyUser] = useState<CustodyUser | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchDeviceHistory();
  }, [serialNumber]);

  async function fetchDeviceHistory() {
    try {
      const res = await fetch(`${API_BASE}/api/device-movements/device/${serialNumber}`, {
        headers: getAuthHeaders(),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "الجهاز غير موجود");
        return;
      }

      const data = await res.json();
      setDevice(data.device);
      setMovements(data.movements || []);
      setCustomer(data.customer);
      setCustodyUser(data.custodyUser);
      setStats(data.stats);
    } catch (err) {
      console.error(err);
      setError("فشل في جلب البيانات");
    } finally {
      setLoading(false);
    }
  }

  function formatCurrency(amount: number) {
    if (!amount) return "-";
    return new Intl.NumberFormat("ar-IQ").format(amount) + " د.ع";
  }

  function getWarrantyStatus() {
    if (!device?.warrantyEnd) return null;
    const end = new Date(device.warrantyEnd);
    const now = new Date();
    const daysLeft = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    if (daysLeft < 0) {
      return { label: "منتهية", color: "red", days: Math.abs(daysLeft) };
    } else if (daysLeft < 30) {
      return { label: "تنتهي قريباً", color: "orange", days: daysLeft };
    } else {
      return { label: "سارية", color: "green", days: daysLeft };
    }
  }

  if (loading) {
    return (
      <div>
        <PageHeader
          title="سجل الجهاز"
          breadcrumbs={[{ title: "الأجهزة" }, { title: "السجل" }]}
        />
        <LoadingSkeleton type="card" />
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <PageHeader
          title="سجل الجهاز"
          breadcrumbs={[{ title: "الأجهزة" }, { title: "السجل" }]}
        />
        <Result
          status="error"
          title={error}
          extra={
            <Link to="/devices">
              <Button type="primary">العودة للبحث</Button>
            </Link>
          }
        />
      </div>
    );
  }

  if (!device) return null;

  const statusConfig = STATUS_CONFIG[device.status] || {
    label: device.status,
    color: "default",
    icon: <MobileOutlined />,
  };
  const warranty = getWarrantyStatus();

  const timelineItems = movements.map((movement) => {
    const config = MOVEMENT_CONFIG[movement.movementType] || {
      label: movement.movementType,
      color: "default",
      icon: <SwapOutlined />,
    };
    const fromStatus = STATUS_CONFIG[movement.fromStatus]?.label || movement.fromStatus;
    const toStatus = STATUS_CONFIG[movement.toStatus]?.label || movement.toStatus;

    return {
      key: movement.id,
      color: config.color,
      dot: config.icon,
      children: (
        <div>
          <Space direction="vertical" size={4}>
            <Space>
              <Text strong>{config.label}</Text>
              {movement.fromStatus !== movement.toStatus && (
                <Text type="secondary" style={{ fontSize: 12 }}>
                  ({fromStatus} ← {toStatus})
                </Text>
              )}
            </Space>
            {movement.notes && (
              <Text type="secondary" style={{ fontSize: 13 }}>
                {movement.notes}
              </Text>
            )}
            <Space style={{ fontSize: 12, color: "#9ca3af" }}>
              <span>بواسطة: {movement.performedByName || "النظام"}</span>
              <span>•</span>
              <DateDisplay date={movement.performedAt} format="datetime" />
            </Space>
          </Space>
        </div>
      ),
    };
  });

  return (
    <div>
      <PageHeader
        title={
          <Space>
            <Link to="/devices">
              <Button type="text" icon={<ArrowLeftOutlined />} />
            </Link>
            <span style={{ fontFamily: "monospace", direction: "ltr" }}>{device.serialNumber}</span>
          </Space>
        }
        subtitle={`${device.productNameAr || device.productName}${device.productModel ? ` - ${device.productModel}` : ""}`}
        breadcrumbs={[
          { title: "الأجهزة" },
          { title: "السجل" },
          { title: device.serialNumber },
        ]}
        extra={
          <Tag color={statusConfig.color} icon={statusConfig.icon} style={{ fontSize: 14, padding: "4px 12px" }}>
            {statusConfig.label}
          </Tag>
        }
      />

      {/* بطاقات المعلومات */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        {/* معلومات الجهاز */}
        <Col xs={24} md={8}>
          <Card title={<Space><MobileOutlined /> معلومات الجهاز</Space>} size="small">
            <Descriptions column={1} size="small">
              <Descriptions.Item label="المخزن الحالي">
                {device.warehouseName || "-"}
              </Descriptions.Item>
              <Descriptions.Item label="الحالة">
                {device.condition || "-"}
              </Descriptions.Item>
              <Descriptions.Item label="سعر البيع">
                {formatCurrency(device.sellingPrice)}
              </Descriptions.Item>
              <Descriptions.Item label="تاريخ الإنشاء">
                <DateDisplay date={device.createdAt} format="date" />
              </Descriptions.Item>
            </Descriptions>
          </Card>
        </Col>

        {/* معلومات الضمان */}
        <Col xs={24} md={8}>
          <Card title={<Space><SafetyCertificateOutlined /> الضمان</Space>} size="small">
            <Descriptions column={1} size="small">
              <Descriptions.Item label="مدة الضمان">
                {device.warrantyMonths ? `${device.warrantyMonths} شهر` : "-"}
              </Descriptions.Item>
              <Descriptions.Item label="بداية الضمان">
                <DateDisplay date={device.warrantyStart} format="date" />
              </Descriptions.Item>
              <Descriptions.Item label="نهاية الضمان">
                <DateDisplay date={device.warrantyEnd} format="date" />
              </Descriptions.Item>
              {warranty && (
                <Descriptions.Item label="حالة الضمان">
                  <Tag color={warranty.color}>
                    {warranty.label} ({warranty.days} يوم)
                  </Tag>
                </Descriptions.Item>
              )}
            </Descriptions>
          </Card>
        </Col>

        {/* العميل / العهدة / الإحصائيات */}
        <Col xs={24} md={8}>
          {device.status === "sold" && customer ? (
            <Card title={<Space><UserOutlined /> العميل</Space>} size="small">
              <Descriptions column={1} size="small">
                <Descriptions.Item label="الاسم">
                  {customer.fullName}
                </Descriptions.Item>
                <Descriptions.Item label="الهاتف">
                  <span style={{ fontFamily: "monospace" }}>{customer.phone}</span>
                </Descriptions.Item>
                <Descriptions.Item label="تاريخ البيع">
                  <DateDisplay date={device.saleDate} format="date" />
                </Descriptions.Item>
              </Descriptions>
            </Card>
          ) : device.status === "in_custody" && custodyUser ? (
            <Card title={<Space><UserOutlined /> العهدة</Space>} size="small">
              <Descriptions column={1} size="small">
                <Descriptions.Item label="حامل العهدة">
                  {custodyUser.fullName}
                </Descriptions.Item>
                <Descriptions.Item label="تاريخ التسليم">
                  <DateDisplay date={device.custodySince} format="date" />
                </Descriptions.Item>
                <Descriptions.Item label="السبب">
                  {device.custodyReason || "-"}
                </Descriptions.Item>
              </Descriptions>
            </Card>
          ) : (
            <Card title="إحصائيات" size="small">
              {stats && (
                <Row gutter={[8, 8]}>
                  <Col span={12}>
                    <Statistic
                      title="إجمالي الحركات"
                      value={stats.totalMovements}
                      valueStyle={{ fontSize: 20 }}
                    />
                  </Col>
                  <Col span={12}>
                    <Statistic
                      title="نقل بين المخازن"
                      value={stats.warehouseTransfers}
                      valueStyle={{ fontSize: 20 }}
                    />
                  </Col>
                  <Col span={12}>
                    <Statistic
                      title="تغييرات العهدة"
                      value={stats.custodyChanges}
                      valueStyle={{ fontSize: 20 }}
                    />
                  </Col>
                  <Col span={12}>
                    <Statistic
                      title="مرات الصيانة"
                      value={stats.maintenanceCount}
                      valueStyle={{ fontSize: 20 }}
                    />
                  </Col>
                </Row>
              )}
            </Card>
          )}
        </Col>
      </Row>

      {/* ملاحظات */}
      {device.notes && (
        <Alert
          message="ملاحظات"
          description={device.notes}
          type="warning"
          showIcon
          style={{ marginBottom: 24 }}
        />
      )}

      {/* سجل الحركات */}
      <Card
        title={
          <Space>
            <ClockCircleOutlined />
            سجل الحركات
            <Tag>{movements.length} حركة</Tag>
          </Space>
        }
      >
        {movements.length === 0 ? (
          <Empty description="لا توجد حركات مسجلة لهذا الجهاز" />
        ) : (
          <Timeline items={timelineItems} />
        )}
      </Card>
    </div>
  );
}
