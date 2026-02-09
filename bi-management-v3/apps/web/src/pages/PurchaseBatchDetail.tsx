/**
 * صفحة تفاصيل وجبة الشراء
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
} from "antd";
import {
  ArrowRightOutlined,
  HomeOutlined,
  EditOutlined,
  DeleteOutlined,
  DollarOutlined,
  CheckCircleOutlined,
  PrinterOutlined,
  ShoppingOutlined,
  CloseCircleOutlined,
} from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";
import { PageHeader, StatusTag, MoneyDisplay, DateDisplay, LoadingSkeleton, ConfirmDelete } from "../components/shared";
import { API_BASE, getAuthHeaders } from "../utils/api";

const { Text, Title } = Typography;

interface Supplier {
  id: string;
  name: string;
  phone?: string;
  email?: string;
}

interface BatchItem {
  id: string;
  productId: string | null;
  productName: string;
  quantity: number;
  unitCost?: number;
  totalCost?: number;
  notes?: string;
  product?: {
    id: string;
    name: string;
    code?: string;
  };
}

interface BatchDevice {
  id: string;
  serialNumber: string;
  productName: string;
  status: string;
  inspectionStatus: string;
  purchaseCost?: number;
  sellingPrice?: number;
  notes?: string;
}

interface Batch {
  id: string;
  batchNumber: string;
  status: string;
  totalItems: number;
  receivedItems: number;
  totalCost?: number;
  notes?: string;
  createdAt: string;
  createdBy?: string;
  receivedAt?: string;
  receivedBy?: string;
}

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  awaiting_prices: { label: "بانتظار الأسعار", color: "orange" },
  ready_for_receiving: { label: "جاهزة للاستلام", color: "blue" },
  receiving: { label: "قيد الاستلام", color: "purple" },
  received: { label: "تم الاستلام", color: "green" },
  ready_to_sell: { label: "جاهزة للبيع", color: "cyan" },
  cancelled: { label: "ملغية", color: "red" },
};

const DEVICE_STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  pending: { label: "في انتظار الفحص", color: "default" },
  inspecting: { label: "قيد الفحص", color: "processing" },
  passed: { label: "ناجح", color: "success" },
  failed: { label: "فاشل", color: "error" },
  needs_repair: { label: "يحتاج صيانة", color: "warning" },
};

export default function PurchaseBatchDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [batch, setBatch] = useState<Batch | null>(null);
  const [supplier, setSupplier] = useState<Supplier | null>(null);
  const [items, setItems] = useState<BatchItem[]>([]);
  const [devices, setDevices] = useState<BatchDevice[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (id) {
      fetchBatchDetails();
    }
  }, [id]);

  const fetchBatchDetails = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/purchases/batches/${id}`, {
        headers: getAuthHeaders(),
      });

      if (!res.ok) {
        throw new Error("فشل في جلب بيانات الوجبة");
      }

      const data = await res.json();
      setBatch(data.batch);
      setSupplier(data.supplier);
      setItems(data.items || []);
      setDevices(data.devices || []);
    } catch (err) {
      console.error(err);
      message.error("فشل في تحميل البيانات");
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async () => {
    if (!batch) return;

    try {
      setDeleting(true);
      const res = await fetch(`${API_BASE}/api/purchases/batches/${id}/cancel`, {
        method: "PATCH",
        headers: getAuthHeaders(),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "فشل في إلغاء الوجبة");
      }

      message.success("تم إلغاء الوجبة بنجاح");
      fetchBatchDetails();
    } catch (err) {
      message.error(err instanceof Error ? err.message : "فشل في إلغاء الوجبة");
    } finally {
      setDeleting(false);
    }
  };

  const itemColumns: ColumnsType<BatchItem> = [
    {
      title: "المنتج",
      key: "product",
      render: (_, record) => (
        <div>
          <div style={{ fontWeight: 500 }}>{record.productName}</div>
          {record.product?.code && (
            <Text type="secondary" style={{ fontSize: 12 }}>
              {record.product.code}
            </Text>
          )}
        </div>
      ),
    },
    {
      title: "الكمية",
      dataIndex: "quantity",
      key: "quantity",
      width: 100,
      align: "center",
    },
    {
      title: "سعر الوحدة",
      dataIndex: "unitCost",
      key: "unitCost",
      width: 150,
      render: (cost) => cost !== undefined ? <MoneyDisplay amount={cost} /> : "-",
    },
    {
      title: "الإجمالي",
      dataIndex: "totalCost",
      key: "totalCost",
      width: 150,
      render: (cost) => cost !== undefined ? <MoneyDisplay amount={cost} /> : "-",
    },
    {
      title: "ملاحظات",
      dataIndex: "notes",
      key: "notes",
      ellipsis: true,
      render: (notes) => notes || "-",
    },
  ];

  const deviceColumns: ColumnsType<BatchDevice> = [
    {
      title: "السيريال",
      dataIndex: "serialNumber",
      key: "serialNumber",
      render: (text) => <Text code>{text}</Text>,
    },
    {
      title: "المنتج",
      dataIndex: "productName",
      key: "productName",
    },
    {
      title: "حالة الفحص",
      dataIndex: "inspectionStatus",
      key: "inspectionStatus",
      render: (status) => {
        const config = DEVICE_STATUS_CONFIG[status];
        return config ? <Tag color={config.color}>{config.label}</Tag> : <Tag>{status}</Tag>;
      },
    },
    {
      title: "سعر الشراء",
      dataIndex: "purchaseCost",
      key: "purchaseCost",
      render: (cost) => cost !== undefined ? <MoneyDisplay amount={cost} /> : "-",
    },
    {
      title: "سعر البيع",
      dataIndex: "sellingPrice",
      key: "sellingPrice",
      render: (price) => price !== undefined ? <MoneyDisplay amount={price} /> : "-",
    },
    {
      title: "ملاحظات",
      dataIndex: "notes",
      key: "notes",
      ellipsis: true,
      render: (notes) => notes || "-",
    },
  ];

  if (loading) {
    return <LoadingSkeleton />;
  }

  if (!batch) {
    return (
      <Card>
        <div style={{ textAlign: "center", padding: 40 }}>
          <Title level={4}>الوجبة غير موجودة</Title>
          <Button type="primary" onClick={() => navigate("/purchases")}>
            العودة للقائمة
          </Button>
        </div>
      </Card>
    );
  }

  const statusConfig = STATUS_CONFIG[batch.status];

  // الإجراءات حسب الحالة
  const getActions = () => {
    const actions: React.ReactNode[] = [];

    if (batch.status === "awaiting_prices") {
      actions.push(
        <Link to={`/purchases/${id}/prices`} key="prices">
          <Button type="primary" icon={<DollarOutlined />}>
            إضافة الأسعار
          </Button>
        </Link>
      );
    }

    if (batch.status === "ready_for_receiving" || batch.status === "receiving") {
      actions.push(
        <Link to={`/purchases/${id}/receive`} key="receive">
          <Button type="primary" icon={<CheckCircleOutlined />} style={{ background: "#52c41a" }}>
            استلام وفحص
          </Button>
        </Link>
      );
    }

    if (batch.status === "received") {
      actions.push(
        <Link to={`/purchases/${id}/selling-prices`} key="selling">
          <Button icon={<DollarOutlined />}>
            أسعار البيع
          </Button>
        </Link>
      );
    }

    if (!["cancelled", "ready_to_sell"].includes(batch.status)) {
      actions.push(
        <Popconfirm
          key="cancel"
          title="إلغاء الوجبة"
          description="هل أنت متأكد من إلغاء هذه الوجبة؟"
          onConfirm={handleCancel}
          okText="نعم، إلغاء"
          cancelText="لا"
          okButtonProps={{ danger: true, loading: deleting }}
        >
          <Button danger icon={<CloseCircleOutlined />}>
            إلغاء الوجبة
          </Button>
        </Popconfirm>
      );
    }

    return actions;
  };

  return (
    <div>
      <PageHeader
        title={`وجبة ${batch.batchNumber}`}
        breadcrumbs={[
          { icon: <HomeOutlined />, title: "الرئيسية", path: "/" },
          { title: "المشتريات", path: "/purchases" },
          { title: batch.batchNumber },
        ]}
        extra={<Space>{getActions()}</Space>}
      />

      <Row gutter={[16, 16]}>
        {/* معلومات الوجبة */}
        <Col xs={24} lg={16}>
          <Card title="معلومات الوجبة" style={{ marginBottom: 16 }}>
            <Descriptions column={{ xs: 1, sm: 2, md: 3 }} bordered size="small">
              <Descriptions.Item label="رقم الوجبة">
                <Text strong>{batch.batchNumber}</Text>
              </Descriptions.Item>
              <Descriptions.Item label="الحالة">
                {statusConfig ? (
                  <Tag color={statusConfig.color}>{statusConfig.label}</Tag>
                ) : (
                  <Tag>{batch.status}</Tag>
                )}
              </Descriptions.Item>
              <Descriptions.Item label="تاريخ الإنشاء">
                <DateDisplay date={batch.createdAt} showTime />
              </Descriptions.Item>
              <Descriptions.Item label="إجمالي الأصناف">{batch.totalItems}</Descriptions.Item>
              <Descriptions.Item label="تم استلام">{batch.receivedItems}</Descriptions.Item>
              {batch.totalCost !== undefined && (
                <Descriptions.Item label="إجمالي التكلفة">
                  <MoneyDisplay amount={batch.totalCost} />
                </Descriptions.Item>
              )}
              {batch.receivedAt && (
                <Descriptions.Item label="تاريخ الاستلام">
                  <DateDisplay date={batch.receivedAt} showTime />
                </Descriptions.Item>
              )}
              {batch.notes && (
                <Descriptions.Item label="ملاحظات" span={3}>
                  {batch.notes}
                </Descriptions.Item>
              )}
            </Descriptions>
          </Card>

          {/* بنود الوجبة */}
          <Card title={`البنود (${items.length})`} style={{ marginBottom: 16 }}>
            <Table
              dataSource={items}
              columns={itemColumns}
              rowKey="id"
              pagination={false}
              size="small"
              scroll={{ x: 600 }}
            />
          </Card>

          {/* الأجهزة المستلمة */}
          {devices.length > 0 && (
            <Card title={`الأجهزة المستلمة (${devices.length})`}>
              <Table
                dataSource={devices}
                columns={deviceColumns}
                rowKey="id"
                pagination={devices.length > 10 ? { pageSize: 10 } : false}
                size="small"
                scroll={{ x: 800 }}
              />
            </Card>
          )}
        </Col>

        {/* الشريط الجانبي */}
        <Col xs={24} lg={8}>
          {/* معلومات المورد */}
          {supplier && (
            <Card title="المورد" style={{ marginBottom: 16 }}>
              <Descriptions column={1} size="small">
                <Descriptions.Item label="الاسم">
                  <Link to={`/suppliers/${supplier.id}`}>{supplier.name}</Link>
                </Descriptions.Item>
                {supplier.phone && (
                  <Descriptions.Item label="الهاتف">{supplier.phone}</Descriptions.Item>
                )}
                {supplier.email && (
                  <Descriptions.Item label="البريد">{supplier.email}</Descriptions.Item>
                )}
              </Descriptions>
            </Card>
          )}

          {/* ملخص التكلفة */}
          <Card title="ملخص التكلفة" style={{ marginBottom: 16 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <Text type="secondary">عدد البنود</Text>
                <Text strong>{items.length}</Text>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <Text type="secondary">إجمالي الكمية</Text>
                <Text strong>{batch.totalItems}</Text>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <Text type="secondary">تم استلام</Text>
                <Text strong>{batch.receivedItems}</Text>
              </div>
              <Divider style={{ margin: "8px 0" }} />
              {batch.totalCost !== undefined && (
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <Text strong>إجمالي التكلفة</Text>
                  <Text strong style={{ color: "#1890ff", fontSize: 18 }}>
                    <MoneyDisplay amount={batch.totalCost} />
                  </Text>
                </div>
              )}
            </div>
          </Card>

          {/* سير العمل */}
          <Card title="سير العمل">
            <Timeline
              items={[
                {
                  color: batch.status === "awaiting_prices" ? "blue" : "green",
                  children: (
                    <div>
                      <div style={{ fontWeight: 500 }}>إنشاء الوجبة</div>
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        <DateDisplay date={batch.createdAt} showTime />
                      </Text>
                    </div>
                  ),
                },
                {
                  color: ["ready_for_receiving", "receiving", "received", "ready_to_sell"].includes(batch.status)
                    ? "green"
                    : "gray",
                  children: (
                    <div>
                      <div style={{ fontWeight: 500 }}>إضافة الأسعار</div>
                      {batch.status !== "awaiting_prices" && (
                        <Text type="secondary" style={{ fontSize: 12 }}>مكتمل</Text>
                      )}
                    </div>
                  ),
                },
                {
                  color: ["received", "ready_to_sell"].includes(batch.status) ? "green" : "gray",
                  children: (
                    <div>
                      <div style={{ fontWeight: 500 }}>الاستلام والفحص</div>
                      {batch.receivedAt && (
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          <DateDisplay date={batch.receivedAt} showTime />
                        </Text>
                      )}
                    </div>
                  ),
                },
                {
                  color: batch.status === "ready_to_sell" ? "green" : "gray",
                  children: (
                    <div>
                      <div style={{ fontWeight: 500 }}>جاهز للبيع</div>
                    </div>
                  ),
                },
              ]}
            />
          </Card>
        </Col>
      </Row>
    </div>
  );
}
