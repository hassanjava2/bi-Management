import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { API_BASE, getAuthHeaders, fetchList } from "../utils/api";
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
  InputNumber,
} from "antd";
import type { TableColumnsType } from "antd";
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  SearchOutlined,
  ShoppingOutlined,
  CheckCircleOutlined,
  WarningOutlined,
} from "@ant-design/icons";
import { PageHeader, StatusTag, MoneyDisplay, ConfirmDelete, LoadingSkeleton } from "../components/shared";

type Product = {
  id: string;
  code: string | null;
  name: string;
  nameAr: string | null;
  categoryId: string | null;
  unit: string | null;
  sellingPrice: number | null;
  purchasePrice: number | null;
  quantity: number | null;
  minQuantity: number | null;
  isActive: number | null;
};

const UNIT_OPTIONS = [
  { value: "piece", label: "قطعة" },
  { value: "kg", label: "كجم" },
  { value: "gram", label: "جرام" },
  { value: "liter", label: "لتر" },
  { value: "meter", label: "متر" },
  { value: "box", label: "صندوق" },
  { value: "pack", label: "عبوة" },
  { value: "set", label: "طقم" },
];

const UNIT_LABELS: Record<string, string> = Object.fromEntries(
  UNIT_OPTIONS.map((u) => [u.value, u.label])
);

export default function Products() {
  const [data, setData] = useState<Product[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [form] = Form.useForm();
  const navigate = useNavigate();

  useEffect(() => {
    document.title = "المنتجات | BI Management v3";
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const result = await fetchList<Product>("/api/products", page);
      setData(result.data);
      setTotal(result.total || result.data.length);
    } catch (e) {
      message.error("فشل في تحميل المنتجات");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [page]);

  const openAdd = () => {
    setEditingId(null);
    form.resetFields();
    form.setFieldsValue({ unit: "piece" });
    setModalOpen(true);
  };

  const openEdit = (record: Product) => {
    setEditingId(record.id);
    form.setFieldsValue({
      name: record.name,
      nameAr: record.nameAr || "",
      code: record.code || "",
      sellingPrice: record.sellingPrice,
      purchasePrice: record.purchasePrice,
      quantity: record.quantity,
      minQuantity: record.minQuantity,
      unit: record.unit || "piece",
    });
    setModalOpen(true);
  };

  const handleSubmit = async (values: any) => {
    setSubmitting(true);
    try {
      const body = {
        name: values.name?.trim(),
        nameAr: values.nameAr?.trim() || undefined,
        code: values.code?.trim() || undefined,
        sellingPrice: values.sellingPrice,
        purchasePrice: values.purchasePrice,
        quantity: values.quantity || 0,
        minQuantity: values.minQuantity,
        unit: values.unit,
      };

      if (editingId) {
        const res = await fetch(`${API_BASE}/api/products/${editingId}`, {
          method: "PUT",
          headers: getAuthHeaders(),
          body: JSON.stringify(body),
        });
        if (!res.ok) {
          const d = await res.json().catch(() => ({}));
          throw new Error(d.error || "فشل التعديل");
        }
        message.success("تم تعديل المنتج بنجاح");
      } else {
        const res = await fetch(`${API_BASE}/api/products`, {
          method: "POST",
          headers: getAuthHeaders(),
          body: JSON.stringify(body),
        });
        if (!res.ok) {
          const d = await res.json().catch(() => ({}));
          throw new Error(d.error || "فشل الإضافة");
        }
        message.success("تمت إضافة المنتج بنجاح");
      }
      setModalOpen(false);
      form.resetFields();
      fetchData();
    } catch (err) {
      message.error(err instanceof Error ? err.message : "فشل الحفظ");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    try {
      const res = await fetch(`${API_BASE}/api/products/${id}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      });
      if (!res.ok) throw new Error("فشل الحذف");
      message.success("تم حذف المنتج");
      fetchData();
    } catch (err) {
      message.error(err instanceof Error ? err.message : "فشل الحذف");
    }
  };

  // Filter products
  const filteredData = filter
    ? data.filter(
        (p) =>
          p.name.toLowerCase().includes(filter.toLowerCase()) ||
          p.nameAr?.includes(filter) ||
          p.code?.toLowerCase().includes(filter.toLowerCase())
      )
    : data;

  // Stats
  const activeCount = data.filter((p) => p.isActive).length;
  const lowStockCount = data.filter(
    (p) => p.minQuantity && p.quantity != null && p.quantity <= p.minQuantity
  ).length;

  const columns: TableColumnsType<Product> = [
    {
      title: "الكود",
      dataIndex: "code",
      key: "code",
      width: 100,
      render: (code) => (
        <span style={{ color: "#64748b", fontSize: 13 }}>{code || "—"}</span>
      ),
    },
    {
      title: "الاسم",
      dataIndex: "name",
      key: "name",
      render: (_, record) => (
        <div>
          <Link
            to={`/products/${record.id}`}
            style={{ fontWeight: 500, color: "#3730a3" }}
          >
            {record.nameAr || record.name}
          </Link>
          {record.nameAr && (
            <div style={{ fontSize: 12, color: "#94a3b8" }}>{record.name}</div>
          )}
        </div>
      ),
    },
    {
      title: "سعر الشراء",
      dataIndex: "purchasePrice",
      key: "purchasePrice",
      width: 120,
      render: (price) =>
        price != null ? <MoneyDisplay amount={price} /> : "—",
    },
    {
      title: "سعر البيع",
      dataIndex: "sellingPrice",
      key: "sellingPrice",
      width: 120,
      render: (price) =>
        price != null ? <MoneyDisplay amount={price} colored /> : "—",
    },
    {
      title: "الكمية",
      dataIndex: "quantity",
      key: "quantity",
      width: 100,
      render: (qty, record) => {
        const isLow =
          record.minQuantity && qty != null && qty <= record.minQuantity;
        return (
          <Tag color={isLow ? "warning" : "default"}>
            {qty ?? 0}
          </Tag>
        );
      },
    },
    {
      title: "الوحدة",
      dataIndex: "unit",
      key: "unit",
      width: 80,
      render: (unit) => UNIT_LABELS[unit || "piece"] || unit || "—",
    },
    {
      title: "الحالة",
      dataIndex: "isActive",
      key: "isActive",
      width: 80,
      render: (isActive) => (
        <StatusTag status={isActive ? "active" : "inactive"} />
      ),
    },
    {
      title: "إجراء",
      key: "actions",
      width: 140,
      render: (_, record) => (
        <Space>
          <Button
            type="link"
            size="small"
            icon={<EditOutlined />}
            onClick={() => openEdit(record)}
          >
            تعديل
          </Button>
          <ConfirmDelete
            onConfirm={() => handleDelete(record.id, record.nameAr || record.name)}
          >
            <Button type="link" danger size="small" icon={<DeleteOutlined />}>
              حذف
            </Button>
          </ConfirmDelete>
        </Space>
      ),
    },
  ];

  if (loading && data.length === 0) {
    return (
      <div>
        <PageHeader
          title="المنتجات"
          breadcrumbs={[{ title: "المخزون" }, { title: "المنتجات" }]}
        />
        <LoadingSkeleton type="table" rows={8} />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="المنتجات"
        subtitle={`إدارة منتجات المخزن - ${total} منتج`}
        breadcrumbs={[{ title: "المخزون" }, { title: "المنتجات" }]}
        extra={
          <Button type="primary" icon={<PlusOutlined />} onClick={openAdd}>
            إضافة منتج
          </Button>
        }
      />

      {/* Quick Stats */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={12} sm={8} md={6}>
          <Card>
            <Statistic
              title="إجمالي المنتجات"
              value={data.length}
              prefix={<ShoppingOutlined style={{ color: "#3b82f6" }} />}
              valueStyle={{ color: "#3b82f6" }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={8} md={6}>
          <Card>
            <Statistic
              title="منتجات نشطة"
              value={activeCount}
              prefix={<CheckCircleOutlined style={{ color: "#22c55e" }} />}
              valueStyle={{ color: "#22c55e" }}
            />
          </Card>
        </Col>
        {lowStockCount > 0 && (
          <Col xs={12} sm={8} md={6}>
            <Card>
              <Statistic
                title="مخزون منخفض"
                value={lowStockCount}
                prefix={<WarningOutlined style={{ color: "#f59e0b" }} />}
                valueStyle={{ color: "#f59e0b" }}
              />
            </Card>
          </Col>
        )}
      </Row>

      {/* Search & Table */}
      <Card
        title="قائمة المنتجات"
        extra={
          <Input
            placeholder="بحث بالاسم أو الكود..."
            prefix={<SearchOutlined />}
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            style={{ width: 250 }}
            allowClear
          />
        }
        styles={{ body: { padding: 0 } }}
      >
        <Table<Product>
          columns={columns}
          dataSource={filteredData}
          rowKey="id"
          loading={loading}
          pagination={{
            current: page,
            pageSize: 20,
            total: total,
            onChange: (p) => setPage(p),
            showSizeChanger: false,
            showTotal: (total, range) => `${range[0]}-${range[1]} من ${total}`,
          }}
          scroll={{ x: 900 }}
        />
      </Card>

      {/* Add/Edit Modal */}
      <Modal
        title={editingId ? "تعديل منتج" : "إضافة منتج جديد"}
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        footer={null}
        width={700}
        destroyOnClose
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          initialValues={{ unit: "piece" }}
        >
          <Row gutter={16}>
            <Col xs={24} md={12}>
              <Form.Item name="code" label="الكود">
                <Input placeholder="كود المنتج" />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item
                name="name"
                label="الاسم (إنجليزي)"
                rules={[{ required: true, message: "مطلوب" }]}
              >
                <Input placeholder="Product Name" />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item name="nameAr" label="الاسم (عربي)">
                <Input placeholder="اسم المنتج" />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item name="unit" label="الوحدة">
                <Select options={UNIT_OPTIONS} />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item name="purchasePrice" label="سعر الشراء">
                <InputNumber
                  style={{ width: "100%" }}
                  min={0}
                  placeholder="0"
                  formatter={(value) =>
                    `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")
                  }
                />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item name="sellingPrice" label="سعر البيع">
                <InputNumber
                  style={{ width: "100%" }}
                  min={0}
                  placeholder="0"
                  formatter={(value) =>
                    `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")
                  }
                />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item name="quantity" label="الكمية">
                <InputNumber style={{ width: "100%" }} min={0} placeholder="0" />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item name="minQuantity" label="الحد الأدنى">
                <InputNumber style={{ width: "100%" }} min={0} placeholder="0" />
              </Form.Item>
            </Col>
          </Row>
          <div style={{ marginTop: 24, display: "flex", gap: 12, justifyContent: "flex-end" }}>
            <Button onClick={() => setModalOpen(false)}>إلغاء</Button>
            <Button type="primary" htmlType="submit" loading={submitting}>
              {editingId ? "تعديل" : "حفظ"}
            </Button>
          </div>
        </Form>
      </Modal>
    </div>
  );
}
