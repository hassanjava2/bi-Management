import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { API_BASE, getAuthHeaders, fetchList } from "../utils/api";
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
  SearchOutlined,
  AppstoreOutlined,
  CheckCircleOutlined,
  FolderOutlined,
} from "@ant-design/icons";
import { PageHeader, StatusTag, ConfirmDelete, LoadingSkeleton } from "../components/shared";

type Category = {
  id: string;
  code: string | null;
  name: string;
  nameAr: string | null;
  parentId: string | null;
  description: string | null;
  isActive: number | null;
};

export default function Categories() {
  const [data, setData] = useState<Category[]>([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [form] = Form.useForm();

  useEffect(() => {
    document.title = "التصنيفات | BI Management v3";
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const result = await fetchList<Category>("/api/categories", page);
      setData(result.data);
    } catch (e) {
      message.error("فشل في تحميل التصنيفات");
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
    setModalOpen(true);
  };

  const openEdit = (record: Category) => {
    setEditingId(record.id);
    form.setFieldsValue({
      name: record.name,
      nameAr: record.nameAr || "",
      code: record.code || "",
      description: record.description || "",
      parentId: record.parentId || undefined,
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
        description: values.description?.trim() || undefined,
        parentId: values.parentId || undefined,
      };

      if (editingId) {
        const res = await fetch(`${API_BASE}/api/categories/${editingId}`, {
          method: "PUT",
          headers: getAuthHeaders(),
          body: JSON.stringify(body),
        });
        if (!res.ok) {
          const d = await res.json().catch(() => ({}));
          throw new Error(d.error || "فشل التعديل");
        }
        message.success("تم تعديل التصنيف بنجاح");
      } else {
        const res = await fetch(`${API_BASE}/api/categories`, {
          method: "POST",
          headers: getAuthHeaders(),
          body: JSON.stringify(body),
        });
        if (!res.ok) {
          const d = await res.json().catch(() => ({}));
          throw new Error(d.error || "فشل الإضافة");
        }
        message.success("تمت إضافة التصنيف بنجاح");
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
      const res = await fetch(`${API_BASE}/api/categories/${id}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      });
      if (!res.ok) throw new Error("فشل الحذف");
      message.success("تم تعطيل التصنيف");
      fetchData();
    } catch (err) {
      message.error(err instanceof Error ? err.message : "فشل الحذف");
    }
  };

  // Filter categories
  const filteredData = filter
    ? data.filter(
        (c) =>
          c.name.toLowerCase().includes(filter.toLowerCase()) ||
          c.nameAr?.includes(filter) ||
          c.code?.toLowerCase().includes(filter.toLowerCase())
      )
    : data;

  // Get parent categories for dropdown
  const parentCategories = data.filter((c) => !c.parentId && c.id !== editingId);

  // Stats
  const activeCount = data.filter((c) => c.isActive).length;

  if (loading && data.length === 0) {
    return (
      <div>
        <PageHeader
          title="التصنيفات"
          breadcrumbs={[{ title: "المخزون" }, { title: "التصنيفات" }]}
        />
        <LoadingSkeleton type="card" rows={6} />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="التصنيفات"
        subtitle={`إدارة تصنيفات المنتجات - ${data.length} تصنيف`}
        breadcrumbs={[{ title: "المخزون" }, { title: "التصنيفات" }]}
        extra={
          <Button type="primary" icon={<PlusOutlined />} onClick={openAdd}>
            إضافة تصنيف
          </Button>
        }
      />

      {/* Quick Stats */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={12} sm={8} md={6}>
          <Card>
            <Statistic
              title="إجمالي التصنيفات"
              value={data.length}
              prefix={<AppstoreOutlined style={{ color: "#ec4899" }} />}
              valueStyle={{ color: "#ec4899" }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={8} md={6}>
          <Card>
            <Statistic
              title="تصنيفات نشطة"
              value={activeCount}
              prefix={<CheckCircleOutlined style={{ color: "#22c55e" }} />}
              valueStyle={{ color: "#22c55e" }}
            />
          </Card>
        </Col>
      </Row>

      {/* Search */}
      <div style={{ marginBottom: 16 }}>
        <Input
          placeholder="بحث بالاسم أو الكود..."
          prefix={<SearchOutlined />}
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          style={{ width: 300 }}
          allowClear
        />
      </div>

      {/* Categories Grid */}
      {filteredData.length === 0 ? (
        <Card>
          <Empty description="لا توجد تصنيفات مطابقة" />
        </Card>
      ) : (
        <Row gutter={[16, 16]}>
          {filteredData.map((category) => {
            const parent = category.parentId
              ? data.find((c) => c.id === category.parentId)
              : null;

            return (
              <Col xs={24} sm={12} md={8} lg={6} key={category.id}>
                <Card
                  hoverable
                  style={{
                    borderRight: category.isActive
                      ? "4px solid #ec4899"
                      : "4px solid #e2e8f0",
                  }}
                  actions={[
                    <Button
                      type="text"
                      icon={<EditOutlined />}
                      onClick={() => openEdit(category)}
                    >
                      تعديل
                    </Button>,
                    <ConfirmDelete
                      onConfirm={() =>
                        handleDelete(category.id, category.nameAr || category.name)
                      }
                      title="تعطيل التصنيف"
                      description="هل تريد تعطيل هذا التصنيف؟"
                    >
                      <Button type="text" danger icon={<DeleteOutlined />}>
                        تعطيل
                      </Button>
                    </ConfirmDelete>,
                  ]}
                >
                  <div style={{ minHeight: 80 }}>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "flex-start",
                        marginBottom: 8,
                      }}
                    >
                      <div>
                        <Link
                          to={`/categories/${category.id}`}
                          style={{
                            fontWeight: 600,
                            fontSize: 16,
                            color: "#1e293b",
                          }}
                        >
                          {category.nameAr || category.name}
                        </Link>
                        {category.nameAr && (
                          <div style={{ fontSize: 13, color: "#64748b" }}>
                            {category.name}
                          </div>
                        )}
                      </div>
                      {category.code && (
                        <Tag color="purple">{category.code}</Tag>
                      )}
                    </div>

                    {parent && (
                      <div
                        style={{
                          fontSize: 12,
                          color: "#94a3b8",
                          display: "flex",
                          alignItems: "center",
                          gap: 4,
                          marginBottom: 8,
                        }}
                      >
                        <FolderOutlined />
                        تابع لـ: {parent.nameAr || parent.name}
                      </div>
                    )}

                    <StatusTag
                      status={category.isActive ? "active" : "inactive"}
                    />
                  </div>
                </Card>
              </Col>
            );
          })}
        </Row>
      )}

      {/* Pagination */}
      {data.length >= 20 && (
        <div
          style={{
            marginTop: 24,
            display: "flex",
            gap: 8,
            justifyContent: "center",
          }}
        >
          <Button
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
          >
            السابق
          </Button>
          <span style={{ padding: "4px 12px", color: "#64748b" }}>
            صفحة {page}
          </span>
          <Button
            disabled={data.length < 20}
            onClick={() => setPage((p) => p + 1)}
          >
            التالي
          </Button>
        </div>
      )}

      {/* Add/Edit Modal */}
      <Modal
        title={editingId ? "تعديل تصنيف" : "إضافة تصنيف جديد"}
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        footer={null}
        width={600}
        destroyOnClose
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Row gutter={16}>
            <Col xs={24} md={12}>
              <Form.Item name="code" label="الكود">
                <Input placeholder="كود التصنيف" />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item
                name="name"
                label="الاسم (إنجليزي)"
                rules={[{ required: true, message: "مطلوب" }]}
              >
                <Input placeholder="Category Name" />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item name="nameAr" label="الاسم (عربي)">
                <Input placeholder="اسم التصنيف" />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item name="parentId" label="التصنيف الأب">
                <Select
                  placeholder="-- بدون --"
                  allowClear
                  options={parentCategories.map((cat) => ({
                    value: cat.id,
                    label: cat.nameAr || cat.name,
                  }))}
                />
              </Form.Item>
            </Col>
            <Col xs={24}>
              <Form.Item name="description" label="الوصف">
                <Input.TextArea rows={3} placeholder="وصف التصنيف..." />
              </Form.Item>
            </Col>
          </Row>
          <div
            style={{
              marginTop: 24,
              display: "flex",
              gap: 12,
              justifyContent: "flex-end",
            }}
          >
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
