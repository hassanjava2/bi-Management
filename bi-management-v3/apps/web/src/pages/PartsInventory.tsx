/**
 * صفحة مخزون القطع
 */
import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  Row,
  Col,
  Card,
  Table,
  Button,
  Input,
  Select,
  Form,
  Modal,
  Tag,
  Space,
  message,
  Statistic,
  Empty,
  InputNumber,
  Checkbox,
} from "antd";
import {
  PlusOutlined,
  SearchOutlined,
  FileTextOutlined,
  WarningOutlined,
  InboxOutlined,
  DollarOutlined,
  HomeOutlined,
} from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";
import { PageHeader, MoneyDisplay, LoadingSkeleton } from "../components/shared";
import { API_BASE, getAuthHeaders } from "../utils/api";

interface PartType {
  id: string;
  name: string;
  nameAr: string;
}

interface Part {
  id: string;
  name: string;
  brand?: string;
  model?: string;
  sku?: string;
  specifications?: Record<string, string>;
  quantity: number;
  minQuantity: number;
  costPrice?: number;
  sellPrice?: number;
  installationFee?: number;
  condition: string;
  warehouseId?: string;
  warehouseName?: string;
  partTypeId: string;
  partTypeName?: string;
  isActive: boolean;
}

interface Stats {
  totalParts: number;
  totalQuantity: number;
  lowStockCount: number;
  totalValue: number;
}

const CONDITION_CONFIG: Record<string, { label: string; color: string }> = {
  new: { label: "جديد", color: "green" },
  refurbished: { label: "مجدد", color: "orange" },
  used: { label: "مستعمل", color: "default" },
};

export default function PartsInventory() {
  const [parts, setParts] = useState<Part[]>([]);
  const [partTypes, setPartTypes] = useState<PartType[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  // Filters
  const [typeFilter, setTypeFilter] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [lowStockOnly, setLowStockOnly] = useState(false);

  // Add Part Modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [form] = Form.useForm();

  useEffect(() => {
    fetchPartTypes();
    fetchParts();
  }, [typeFilter, lowStockOnly]);

  const fetchPartTypes = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/parts/types`, {
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        const data = await res.json();
        setPartTypes(data.types || []);
      }
    } catch (error) {
      console.error("Error:", error);
    }
  };

  const fetchParts = async () => {
    try {
      const params = new URLSearchParams();
      if (typeFilter) params.append("typeId", typeFilter);
      if (lowStockOnly) params.append("lowStock", "true");
      if (searchQuery) params.append("search", searchQuery);

      const res = await fetch(`${API_BASE}/api/parts/inventory?${params}`, {
        headers: getAuthHeaders(),
      });

      if (res.ok) {
        const data = await res.json();
        setParts(data.parts || []);
        setStats(data.stats || null);
      }
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    setLoading(true);
    fetchParts();
  };

  const handleAddPart = async (values: {
    partTypeId: string;
    name: string;
    brand?: string;
    model?: string;
    sku?: string;
    quantity?: number;
    minQuantity?: number;
    costPrice?: number;
    sellPrice?: number;
    installationFee?: number;
    condition?: string;
  }) => {
    setSubmitting(true);
    try {
      const res = await fetch(`${API_BASE}/api/parts/inventory`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify(values),
      });

      if (res.ok) {
        message.success("تم إضافة القطعة بنجاح");
        setShowAddModal(false);
        form.resetFields();
        fetchParts();
      } else {
        const data = await res.json();
        message.error(data.error || "فشل في إضافة القطعة");
      }
    } catch (error) {
      message.error("حدث خطأ");
    } finally {
      setSubmitting(false);
    }
  };

  const filteredParts = searchQuery
    ? parts.filter(
        (p) =>
          p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          p.brand?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          p.model?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          p.sku?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : parts;

  const columns: ColumnsType<Part> = [
    {
      title: "القطعة",
      key: "part",
      render: (_, record) => (
        <div>
          <div style={{ fontWeight: 500 }}>{record.name}</div>
          <div style={{ color: "#8c8c8c", fontSize: 12 }}>
            {record.brand && <span>{record.brand}</span>}
            {record.model && <span> - {record.model}</span>}
          </div>
          {record.specifications && Object.keys(record.specifications).length > 0 && (
            <Space wrap size={4} style={{ marginTop: 4 }}>
              {Object.entries(record.specifications).map(([key, val]) => (
                <Tag key={key} style={{ fontSize: 11 }}>
                  {val}
                </Tag>
              ))}
            </Space>
          )}
        </div>
      ),
    },
    {
      title: "النوع",
      dataIndex: "partTypeName",
      key: "partTypeName",
      render: (text) => text || "-",
    },
    {
      title: "المخزون",
      key: "stock",
      render: (_, record) => (
        <Space>
          <span
            style={{
              fontWeight: 600,
              color: record.quantity <= record.minQuantity ? "#f5222d" : "#262626",
            }}
          >
            {record.quantity}
          </span>
          <span style={{ color: "#8c8c8c" }}>/ {record.minQuantity}</span>
          {record.quantity <= record.minQuantity && (
            <WarningOutlined style={{ color: "#faad14" }} />
          )}
        </Space>
      ),
    },
    {
      title: "سعر الشراء",
      dataIndex: "costPrice",
      key: "costPrice",
      render: (price) => <MoneyDisplay amount={price} />,
    },
    {
      title: "سعر البيع",
      dataIndex: "sellPrice",
      key: "sellPrice",
      render: (price) => (
        <span style={{ fontWeight: 500 }}>
          <MoneyDisplay amount={price} />
        </span>
      ),
    },
    {
      title: "أجرة التركيب",
      dataIndex: "installationFee",
      key: "installationFee",
      render: (fee) => <MoneyDisplay amount={fee} />,
    },
    {
      title: "الحالة",
      dataIndex: "condition",
      key: "condition",
      render: (condition: string) => {
        const config = CONDITION_CONFIG[condition] || { label: condition, color: "default" };
        return <Tag color={config.color}>{config.label}</Tag>;
      },
    },
  ];

  if (loading && parts.length === 0) {
    return <LoadingSkeleton />;
  }

  return (
    <div>
      <PageHeader
        title="مخزون القطع"
        subtitle="إدارة قطع الترقية والاستبدال"
        breadcrumbs={[
          { icon: <HomeOutlined />, title: "الرئيسية", path: "/" },
          { title: "مخزون القطع" },
        ]}
        extra={
          <Space>
            <Link to="/upgrades">
              <Button icon={<FileTextOutlined />} style={{ background: "#52c41a", color: "#fff" }}>
                طلبات الترقية
              </Button>
            </Link>
            <Button type="primary" icon={<PlusOutlined />} onClick={() => setShowAddModal(true)}>
              إضافة قطعة
            </Button>
          </Space>
        }
      />

      {/* Stats */}
      {stats && (
        <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
          <Col xs={12} md={6}>
            <Card>
              <Statistic
                title="أنواع القطع"
                value={stats.totalParts}
                valueStyle={{ color: "#1890ff" }}
                prefix={<InboxOutlined />}
              />
            </Card>
          </Col>
          <Col xs={12} md={6}>
            <Card>
              <Statistic
                title="إجمالي المخزون"
                value={stats.totalQuantity}
                valueStyle={{ color: "#722ed1" }}
                prefix={<InboxOutlined />}
              />
            </Card>
          </Col>
          <Col xs={12} md={6}>
            <Card style={{ borderColor: stats.lowStockCount > 0 ? "#faad14" : undefined }}>
              <Statistic
                title="مخزون منخفض"
                value={stats.lowStockCount}
                valueStyle={{ color: stats.lowStockCount > 0 ? "#f5222d" : "#262626" }}
                prefix={<WarningOutlined />}
              />
            </Card>
          </Col>
          <Col xs={12} md={6}>
            <Card>
              <Statistic
                title="قيمة المخزون"
                value={stats.totalValue}
                valueStyle={{ color: "#52c41a" }}
                prefix={<DollarOutlined />}
                suffix="د.ع"
                formatter={(value) => value?.toLocaleString()}
              />
            </Card>
          </Col>
        </Row>
      )}

      {/* Filters */}
      <Card style={{ marginBottom: 24 }}>
        <Space wrap>
          <Input
            placeholder="بحث (اسم، موديل، SKU)..."
            prefix={<SearchOutlined />}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onPressEnter={handleSearch}
            style={{ width: 250 }}
            allowClear
          />
          <Select
            placeholder="كل الأنواع"
            value={typeFilter || undefined}
            onChange={(value) => setTypeFilter(value || "")}
            style={{ width: 180 }}
            allowClear
          >
            {partTypes.map((t) => (
              <Select.Option key={t.id} value={t.id}>
                {t.nameAr}
              </Select.Option>
            ))}
          </Select>
          <Checkbox
            checked={lowStockOnly}
            onChange={(e) => setLowStockOnly(e.target.checked)}
          >
            مخزون منخفض فقط
          </Checkbox>
          <Button type="primary" onClick={handleSearch}>
            بحث
          </Button>
        </Space>
      </Card>

      {/* Table */}
      <Card>
        <Table
          columns={columns}
          dataSource={filteredParts}
          rowKey="id"
          loading={loading}
          locale={{
            emptyText: <Empty description="لا توجد قطع" />,
          }}
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showTotal: (total) => `إجمالي ${total} قطعة`,
          }}
        />
      </Card>

      {/* Add Part Modal */}
      <Modal
        title="إضافة قطعة جديدة"
        open={showAddModal}
        onCancel={() => setShowAddModal(false)}
        footer={null}
        width={600}
        destroyOnClose
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleAddPart}
          initialValues={{ quantity: 0, minQuantity: 5, condition: "new" }}
        >
          <Form.Item
            name="partTypeId"
            label="نوع القطعة"
            rules={[{ required: true, message: "نوع القطعة مطلوب" }]}
          >
            <Select placeholder="اختر النوع...">
              {partTypes.map((t) => (
                <Select.Option key={t.id} value={t.id}>
                  {t.nameAr}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="name"
            label="الاسم"
            rules={[{ required: true, message: "الاسم مطلوب" }]}
          >
            <Input placeholder="مثال: Samsung DDR4 8GB" />
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="brand" label="الماركة">
                <Input placeholder="الماركة" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="model" label="الموديل">
                <Input placeholder="الموديل" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="quantity" label="الكمية">
                <InputNumber style={{ width: "100%" }} min={0} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="minQuantity" label="الحد الأدنى">
                <InputNumber style={{ width: "100%" }} min={0} />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={8}>
              <Form.Item name="costPrice" label="سعر الشراء">
                <InputNumber
                  style={{ width: "100%" }}
                  placeholder="0"
                  formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")}
                />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="sellPrice" label="سعر البيع">
                <InputNumber
                  style={{ width: "100%" }}
                  placeholder="0"
                  formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")}
                />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="installationFee" label="أجرة التركيب">
                <InputNumber
                  style={{ width: "100%" }}
                  placeholder="0"
                  formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")}
                />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="condition" label="الحالة">
            <Select>
              <Select.Option value="new">جديد</Select.Option>
              <Select.Option value="refurbished">مجدد</Select.Option>
              <Select.Option value="used">مستعمل</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item style={{ marginBottom: 0, marginTop: 24 }}>
            <Space>
              <Button type="primary" htmlType="submit" loading={submitting}>
                إضافة القطعة
              </Button>
              <Button onClick={() => setShowAddModal(false)}>إلغاء</Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
