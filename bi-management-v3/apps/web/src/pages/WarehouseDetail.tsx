import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { Row, Col, Card, Descriptions, Button, Tag, Space, Statistic, Table, Input, message } from "antd";
import type { ColumnsType } from "antd/es/table";
import {
  EditOutlined,
  PrinterOutlined,
  ArrowRightOutlined,
  ShopOutlined,
  WarningOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
} from "@ant-design/icons";
import { PageHeader, StatusTag, DateDisplay, LoadingSkeleton } from "../components/shared";
import { API_BASE, getAuthHeaders } from "../utils/api";

type Warehouse = {
  id: string;
  code: string;
  name: string;
  nameAr: string | null;
  branchId: string | null;
  type: string;
  isActive: number | null;
  createdAt: string;
  branch?: { id: string; name: string; nameAr: string | null };
};

type InventoryItem = {
  id: string;
  product: { id: string; name: string; nameAr: string | null; sku: string };
  quantity: number;
  minQuantity: number;
  maxQuantity: number;
};

const TYPE_INFO: Record<string, { label: string; color: string; desc: string }> = {
  main: { label: "رئيسي", color: "green", desc: "المخزن الرئيسي لاستلام وتخزين البضائع" },
  inspection: { label: "فحص", color: "orange", desc: "مخزن فحص الجودة قبل الإدخال" },
  preparation: { label: "تحضير", color: "blue", desc: "مخزن تحضير الطلبات للشحن" },
  returns: { label: "مرتجعات", color: "red", desc: "مخزن استلام المرتجعات" },
  damaged: { label: "تالف", color: "magenta", desc: "مخزن البضائع التالفة" },
  display: { label: "عرض", color: "purple", desc: "مخزن عرض المنتجات" },
  maintenance: { label: "صيانة", color: "default", desc: "مخزن المواد للصيانة" },
};

export default function WarehouseDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [warehouse, setWarehouse] = useState<Warehouse | null>(null);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    document.title = "تفاصيل المخزن | BI Management v3";

    const fetchData = async () => {
      try {
        // Fetch warehouse details
        const whRes = await fetch(`${API_BASE}/api/warehouses/${id}`, { headers: getAuthHeaders() });
        if (!whRes.ok) throw new Error("فشل تحميل بيانات المخزن");
        const whData = await whRes.json();
        setWarehouse(whData);

        // Fetch inventory (products in this warehouse)
        const invRes = await fetch(`${API_BASE}/api/inventory?warehouseId=${id}&limit=100`, { headers: getAuthHeaders() });
        if (invRes.ok) {
          const invData = await invRes.json();
          setInventory(invData.data || []);
        }
      } catch (err) {
        message.error(err instanceof Error ? err.message : "حدث خطأ");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id]);

  if (loading) {
    return <LoadingSkeleton type="form" rows={8} />;
  }

  if (!warehouse) {
    return (
      <Card>
        <div style={{ textAlign: "center", padding: "40px 0" }}>
          <p style={{ color: "#94a3b8", marginBottom: 16 }}>المخزن غير موجود</p>
          <Button type="primary" onClick={() => navigate("/warehouses")}>
            العودة للمخازن
          </Button>
        </div>
      </Card>
    );
  }

  const typeInfo = TYPE_INFO[warehouse.type] || { label: warehouse.type, color: "default", desc: "" };
  const totalItems = inventory.length;
  const totalQuantity = inventory.reduce((sum, item) => sum + item.quantity, 0);
  const lowStockItems = inventory.filter((item) => item.quantity <= item.minQuantity).length;
  const overStockItems = inventory.filter((item) => item.maxQuantity > 0 && item.quantity > item.maxQuantity).length;

  const filteredInventory = inventory.filter(
    (item) =>
      item.product.name.toLowerCase().includes(search.toLowerCase()) ||
      item.product.nameAr?.includes(search) ||
      item.product.sku.toLowerCase().includes(search.toLowerCase())
  );

  const columns: ColumnsType<InventoryItem> = [
    {
      title: "SKU",
      dataIndex: ["product", "sku"],
      key: "sku",
      width: 120,
      render: (sku: string) => (
        <code style={{ background: "#f1f5f9", padding: "2px 6px", borderRadius: 4, fontSize: 12 }}>
          {sku}
        </code>
      ),
    },
    {
      title: "المنتج",
      key: "product",
      render: (_, record) => (
        <Link to={`/products/${record.product.id}`} style={{ fontWeight: 500 }}>
          {record.product.nameAr || record.product.name}
        </Link>
      ),
    },
    {
      title: "الكمية",
      dataIndex: "quantity",
      key: "quantity",
      width: 100,
      align: "center",
      render: (quantity: number, record) => {
        const isLow = quantity <= record.minQuantity;
        const isOver = record.maxQuantity > 0 && quantity > record.maxQuantity;
        return (
          <span style={{ fontWeight: 600, color: isLow ? "#ef4444" : isOver ? "#f59e0b" : "#1e293b" }}>
            {quantity.toLocaleString("ar-IQ")}
          </span>
        );
      },
    },
    {
      title: "الحد الأدنى",
      dataIndex: "minQuantity",
      key: "minQuantity",
      width: 100,
      align: "center",
      render: (val: number) => val.toLocaleString("ar-IQ"),
    },
    {
      title: "الحد الأقصى",
      dataIndex: "maxQuantity",
      key: "maxQuantity",
      width: 100,
      align: "center",
      render: (val: number) => (val > 0 ? val.toLocaleString("ar-IQ") : "-"),
    },
    {
      title: "الحالة",
      key: "status",
      width: 100,
      align: "center",
      render: (_, record) => {
        const isLow = record.quantity <= record.minQuantity;
        const isOver = record.maxQuantity > 0 && record.quantity > record.maxQuantity;
        if (isLow) return <Tag color="red">منخفض</Tag>;
        if (isOver) return <Tag color="orange">زيادة</Tag>;
        return <Tag color="green">طبيعي</Tag>;
      },
    },
  ];

  return (
    <div>
      <PageHeader
        title={warehouse.nameAr || warehouse.name}
        subtitle={warehouse.nameAr ? warehouse.name : typeInfo.desc}
        breadcrumbs={[
          { title: "المخازن", href: "/warehouses" },
          { title: warehouse.nameAr || warehouse.name },
        ]}
        extra={
          <Space>
            <Button icon={<ArrowRightOutlined />} onClick={() => navigate("/warehouses")}>
              العودة للمخازن
            </Button>
            <Button icon={<PrinterOutlined />} onClick={() => window.print()}>
              طباعة
            </Button>
            <Button type="primary" icon={<EditOutlined />} onClick={() => navigate(`/warehouses/${id}/edit`)}>
              تعديل
            </Button>
          </Space>
        }
      />

      {/* الإحصائيات */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={12} sm={6}>
          <Card>
            <Statistic
              title="عدد المنتجات"
              value={totalItems}
              valueStyle={{ color: "#3b82f6" }}
              prefix={<ShopOutlined />}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card>
            <Statistic
              title="إجمالي الكميات"
              value={totalQuantity}
              valueStyle={{ color: "#22c55e" }}
              prefix={<CheckCircleOutlined />}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card>
            <Statistic
              title="منتجات منخفضة"
              value={lowStockItems}
              valueStyle={{ color: lowStockItems > 0 ? "#ef4444" : "#64748b" }}
              prefix={<WarningOutlined />}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card>
            <Statistic
              title="زيادة مخزون"
              value={overStockItems}
              valueStyle={{ color: overStockItems > 0 ? "#f59e0b" : "#64748b" }}
              prefix={<ExclamationCircleOutlined />}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={[24, 24]}>
        {/* معلومات المخزن */}
        <Col xs={24} lg={12}>
          <Card
            title="معلومات المخزن"
            extra={
              <Space>
                <Tag color={typeInfo.color}>{typeInfo.label}</Tag>
                <StatusTag status={warehouse.isActive === 1 ? "active" : "inactive"} />
              </Space>
            }
          >
            <Descriptions column={1} bordered size="small">
              <Descriptions.Item label="الكود">
                <code style={{ background: "#f1f5f9", padding: "2px 8px", borderRadius: 4 }}>
                  {warehouse.code}
                </code>
              </Descriptions.Item>
              <Descriptions.Item label="النوع">
                <Tag color={typeInfo.color}>{typeInfo.label}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="الحالة">
                <StatusTag status={warehouse.isActive === 1 ? "active" : "inactive"} />
              </Descriptions.Item>
              <Descriptions.Item label="تاريخ الإنشاء">
                <DateDisplay date={warehouse.createdAt} />
              </Descriptions.Item>
            </Descriptions>
          </Card>
        </Col>

        {/* الفرع */}
        <Col xs={24} lg={12}>
          <Card title="الفرع">
            {warehouse.branch ? (
              <Link
                to={`/branches/${warehouse.branch.id}`}
                style={{
                  display: "block",
                  padding: 16,
                  background: "#f8fafc",
                  borderRadius: 8,
                  textDecoration: "none",
                  color: "inherit",
                }}
              >
                <div style={{ fontWeight: 600, marginBottom: 4 }}>
                  {warehouse.branch.nameAr || warehouse.branch.name}
                </div>
                {warehouse.branch.nameAr && (
                  <div style={{ fontSize: 14, color: "#64748b" }}>{warehouse.branch.name}</div>
                )}
              </Link>
            ) : (
              <div style={{ padding: 24, background: "#f8fafc", borderRadius: 8, color: "#94a3b8", textAlign: "center" }}>
                لم يتم ربط المخزن بفرع
              </div>
            )}
          </Card>
        </Col>
      </Row>

      {/* جدول المخزون */}
      <Card
        title={`مخزون المنتجات (${inventory.length})`}
        style={{ marginTop: 24 }}
        extra={
          <Input.Search
            placeholder="بحث عن منتج..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ width: 250 }}
            allowClear
          />
        }
      >
        <Table
          columns={columns}
          dataSource={filteredInventory}
          rowKey="id"
          pagination={{
            showSizeChanger: true,
            showTotal: (total, range) => `${range[0]}-${range[1]} من ${total}`,
            pageSize: 10,
          }}
          locale={{
            emptyText: inventory.length === 0 ? "لا توجد منتجات في هذا المخزن" : "لا توجد نتائج للبحث",
          }}
        />
      </Card>
    </div>
  );
}
