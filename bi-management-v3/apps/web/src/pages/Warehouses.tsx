import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Row,
  Col,
  Card,
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
} from "antd";
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  HomeOutlined,
} from "@ant-design/icons";
import { PageHeader, LoadingSkeleton } from "../components/shared";
import { API_BASE, getAuthHeaders, fetchList } from "../utils/api";

type Warehouse = {
  id: string;
  code: string;
  name: string;
  nameAr: string | null;
  branchId: string | null;
  type: string;
  isActive: number | null;
};

function loadList(page: number) {
  return fetchList<Warehouse>("/api/warehouses", page);
}

const TYPE_LABELS: Record<string, { label: string; color: string }> = {
  main: { label: "رئيسي", color: "green" },
  inspection: { label: "فحص", color: "orange" },
  preparation: { label: "تحضير", color: "blue" },
  returns: { label: "مرتجعات", color: "red" },
  damaged: { label: "تالف", color: "magenta" },
  display: { label: "عرض", color: "purple" },
  maintenance: { label: "صيانة", color: "default" },
};

export default function Warehouses() {
  const [data, setData] = useState<Warehouse[]>([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [form] = Form.useForm();

  useEffect(() => {
    document.title = "المخازن | BI Management v3";
  }, []);

  const openEdit = (row: Warehouse) => {
    setEditingId(row.id);
    form.setFieldsValue({
      code: row.code,
      name: row.name,
      nameAr: row.nameAr ?? "",
      type: row.type || "main",
    });
    setShowForm(true);
  };

  const openAdd = () => {
    setEditingId(null);
    form.resetFields();
    form.setFieldsValue({ type: "main" });
    setShowForm(true);
  };

  const resetForm = () => {
    setEditingId(null);
    form.resetFields();
    setShowForm(false);
  };

  const refetch = () => {
    setLoading(true);
    loadList(page)
      .then((r) => setData(r.data))
      .catch((e) => message.error(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    setLoading(true);
    loadList(page)
      .then((r) => setData(r.data))
      .catch((e) => message.error(e.message))
      .finally(() => setLoading(false));
  }, [page]);

  const handleSubmit = async (values: {
    code: string;
    name: string;
    nameAr?: string;
    type: string;
  }) => {
    setSubmitting(true);

    const body = {
      code: values.code.trim(),
      name: values.name.trim(),
      nameAr: values.nameAr?.trim() || undefined,
      type: values.type.trim() || "main",
    };

    try {
      if (editingId) {
        const res = await fetch(`${API_BASE}/api/warehouses/${editingId}`, {
          method: "PUT",
          headers: getAuthHeaders(),
          body: JSON.stringify(body),
        });
        if (!res.ok) {
          const d = await res.json().catch(() => ({}));
          throw new Error(d.error || "فشل التعديل");
        }
        message.success("تم تعديل المخزن بنجاح");
      } else {
        const res = await fetch(`${API_BASE}/api/warehouses`, {
          method: "POST",
          headers: getAuthHeaders(),
          body: JSON.stringify(body),
        });
        if (!res.ok) {
          const d = await res.json().catch(() => ({}));
          throw new Error(d.error || "فشل الإضافة");
        }
        message.success("تمت إضافة المخزن بنجاح");
      }
      resetForm();
      refetch();
    } catch (err) {
      message.error(err instanceof Error ? err.message : "فشل الحفظ");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    Modal.confirm({
      title: "تعطيل المخزن",
      content: `هل أنت متأكد من تعطيل المخزن "${name}"؟`,
      okText: "تعطيل",
      cancelText: "إلغاء",
      okButtonProps: { danger: true },
      onOk: async () => {
        try {
          const res = await fetch(`${API_BASE}/api/warehouses/${id}`, {
            method: "DELETE",
            headers: getAuthHeaders(),
          });
          if (!res.ok) throw new Error("فشل التعطيل");
          message.success("تم تعطيل المخزن");
          refetch();
        } catch (err) {
          message.error(err instanceof Error ? err.message : "فشل التعطيل");
        }
      },
    });
  };

  // Group warehouses by type
  const groupedData = data.reduce(
    (acc, wh) => {
      if (!acc[wh.type]) acc[wh.type] = [];
      acc[wh.type].push(wh);
      return acc;
    },
    {} as Record<string, Warehouse[]>
  );

  // Calculate stats
  const totalWarehouses = data.length;
  const typeCount = Object.keys(groupedData).length;
  const activeCount = data.filter((w) => w.isActive === 1).length;

  return (
    <div>
      <PageHeader
        title="المخازن"
        subtitle="إدارة المخازن وأنواعها"
        breadcrumbs={[
          { icon: <HomeOutlined />, title: "الرئيسية", path: "/" },
          { title: "المخازن" },
        ]}
        extra={
          <Button type="primary" icon={<PlusOutlined />} onClick={openAdd}>
            إضافة مخزن
          </Button>
        }
      />

      {/* Stats Cards */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={8}>
          <Card>
            <Statistic
              title="إجمالي المخازن"
              value={totalWarehouses}
              valueStyle={{ color: "#1890ff" }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card>
            <Statistic
              title="أنواع المخازن"
              value={typeCount}
              valueStyle={{ color: "#722ed1" }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card>
            <Statistic
              title="المخازن النشطة"
              value={activeCount}
              valueStyle={{ color: "#52c41a" }}
            />
          </Card>
        </Col>
      </Row>

      {/* Form Modal */}
      <Modal
        title={editingId ? "تعديل مخزن" : "إضافة مخزن جديد"}
        open={showForm}
        onCancel={resetForm}
        footer={null}
        destroyOnClose
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          initialValues={{ type: "main" }}
        >
          <Form.Item
            name="code"
            label="الكود"
            rules={[{ required: true, message: "الكود مطلوب" }]}
          >
            <Input placeholder="أدخل كود المخزن" />
          </Form.Item>

          <Form.Item
            name="name"
            label="الاسم (إنجليزي)"
            rules={[{ required: true, message: "الاسم مطلوب" }]}
          >
            <Input placeholder="أدخل اسم المخزن بالإنجليزية" />
          </Form.Item>

          <Form.Item name="nameAr" label="الاسم (عربي)">
            <Input placeholder="أدخل اسم المخزن بالعربية" />
          </Form.Item>

          <Form.Item
            name="type"
            label="نوع المخزن"
            rules={[{ required: true, message: "نوع المخزن مطلوب" }]}
          >
            <Select placeholder="اختر نوع المخزن">
              {Object.entries(TYPE_LABELS).map(([key, val]) => (
                <Select.Option key={key} value={key}>
                  {val.label}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item style={{ marginBottom: 0, marginTop: 24 }}>
            <Space>
              <Button type="primary" htmlType="submit" loading={submitting}>
                {editingId ? "تعديل" : "حفظ"}
              </Button>
              <Button onClick={resetForm}>إلغاء</Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* Warehouses list */}
      {loading ? (
        <LoadingSkeleton />
      ) : data.length === 0 ? (
        <Card>
          <Empty description="لا توجد مخازن مسجلة" />
        </Card>
      ) : (
        <>
          {Object.entries(groupedData).map(([type, warehouses]) => {
            const typeInfo = TYPE_LABELS[type] || {
              label: type,
              color: "default",
            };
            return (
              <div key={type} style={{ marginBottom: 24 }}>
                <Space style={{ marginBottom: 12 }}>
                  <Tag color={typeInfo.color}>{typeInfo.label}</Tag>
                  <span style={{ color: "#8c8c8c", fontSize: 14 }}>
                    ({warehouses.length})
                  </span>
                </Space>
                <Row gutter={[16, 16]}>
                  {warehouses.map((row) => (
                    <Col xs={24} sm={12} lg={8} xl={6} key={row.id}>
                      <Card
                        size="small"
                        actions={[
                          <Button
                            key="edit"
                            type="text"
                            icon={<EditOutlined />}
                            onClick={() => openEdit(row)}
                          >
                            تعديل
                          </Button>,
                          <Button
                            key="delete"
                            type="text"
                            danger
                            icon={<DeleteOutlined />}
                            onClick={() =>
                              handleDelete(row.id, row.nameAr || row.name)
                            }
                          >
                            تعطيل
                          </Button>,
                        ]}
                      >
                        <Card.Meta
                          title={
                            <Link
                              to={`/warehouses/${row.id}`}
                              style={{ color: "#1890ff" }}
                            >
                              {row.nameAr || row.name}
                            </Link>
                          }
                          description={
                            <>
                              {row.nameAr && (
                                <div style={{ color: "#8c8c8c" }}>
                                  {row.name}
                                </div>
                              )}
                              <div
                                style={{
                                  color: "#bfbfbf",
                                  fontFamily: "monospace",
                                  fontSize: 12,
                                }}
                              >
                                {row.code}
                              </div>
                            </>
                          }
                        />
                      </Card>
                    </Col>
                  ))}
                </Row>
              </div>
            );
          })}

          {/* Pagination */}
          <Space style={{ marginTop: 24 }}>
            <Button disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
              السابق
            </Button>
            <span style={{ color: "#8c8c8c" }}>صفحة {page}</span>
            <Button
              disabled={data.length < 20}
              onClick={() => setPage((p) => p + 1)}
            >
              التالي
            </Button>
          </Space>
        </>
      )}
    </div>
  );
}
