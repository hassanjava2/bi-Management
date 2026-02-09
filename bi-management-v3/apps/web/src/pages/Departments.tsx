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
  Avatar,
  List,
} from "antd";
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  SearchOutlined,
  TeamOutlined,
  ApartmentOutlined,
} from "@ant-design/icons";
import { PageHeader, ConfirmDelete, LoadingSkeleton } from "../components/shared";
import { API_BASE, getAuthHeaders } from "../utils/api";

type Department = {
  id: string;
  code: string | null;
  name: string;
  nameAr: string | null;
  parentId: string | null;
  isActive: number | null;
  createdAt: string | null;
  childrenCount?: number;
};

export default function Departments() {
  const [data, setData] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [form] = Form.useForm();

  useEffect(() => {
    document.title = "الأقسام | BI Management v3";
  }, []);

  const loadData = () => {
    setLoading(true);
    fetch(`${API_BASE}/api/departments?limit=200`, { headers: getAuthHeaders() })
      .then((r) => r.json())
      .then((res) => setData(res.items || []))
      .catch((e) => message.error(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSubmit = async (values: { code: string; name: string; nameAr: string; parentId: string }) => {
    setSubmitting(true);
    try {
      const url = editingId ? `${API_BASE}/api/departments/${editingId}` : `${API_BASE}/api/departments`;
      const method = editingId ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: getAuthHeaders(),
        body: JSON.stringify({
          code: values.code || null,
          name: values.name,
          nameAr: values.nameAr || null,
          parentId: values.parentId || null,
        }),
      });

      if (!res.ok) throw new Error("فشل الحفظ");

      message.success(editingId ? "تم تعديل القسم بنجاح" : "تم إضافة القسم بنجاح");
      setShowForm(false);
      setEditingId(null);
      form.resetFields();
      loadData();
    } catch (err) {
      message.error(err instanceof Error ? err.message : "حدث خطأ");
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (dept: Department) => {
    setEditingId(dept.id);
    form.setFieldsValue({
      code: dept.code || "",
      name: dept.name,
      nameAr: dept.nameAr || "",
      parentId: dept.parentId || "",
    });
    setShowForm(true);
  };

  const handleDelete = async () => {
    if (!deletingId) return;

    try {
      await fetch(`${API_BASE}/api/departments/${deletingId}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      });
      message.success("تم حذف القسم بنجاح");
      loadData();
    } catch {
      message.error("فشل الحذف");
    } finally {
      setDeleteModalVisible(false);
      setDeletingId(null);
    }
  };

  const showDeleteConfirm = (id: string) => {
    setDeletingId(id);
    setDeleteModalVisible(true);
  };

  // Build tree structure
  const rootDepts = data.filter((d) => !d.parentId);
  const getChildren = (parentId: string) => data.filter((d) => d.parentId === parentId);

  const filteredData = search
    ? data.filter((d) => d.name.toLowerCase().includes(search.toLowerCase()) || (d.nameAr && d.nameAr.includes(search)))
    : rootDepts;

  // Stats
  const totalDepartments = data.length;
  const rootCount = rootDepts.length;
  const subDepartments = data.filter((d) => d.parentId).length;
  const activeDepartments = data.filter((d) => d.isActive === 1 || d.isActive === null).length;

  const renderDepartment = (dept: Department, level = 0) => {
    const children = getChildren(dept.id);
    const colors = ["#6366f1", "#8b5cf6", "#a855f7", "#c084fc"];
    const bgColor = colors[level % colors.length];

    return (
      <div key={dept.id}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "12px 16px",
            paddingRight: `${16 + level * 24}px`,
            background: level === 0 ? "#fff" : "#fafafa",
            borderBottom: "1px solid #f0f0f0",
          }}
        >
          <Space size="middle">
            <Avatar
              style={{
                background: bgColor,
                fontWeight: 600,
              }}
            >
              {dept.name.charAt(0)}
            </Avatar>
            <div>
              <div style={{ fontWeight: 600 }}>{dept.name}</div>
              <Space size="small" style={{ fontSize: "12px", color: "#8c8c8c" }}>
                {dept.code && <span style={{ fontFamily: "monospace" }}>{dept.code}</span>}
                {dept.nameAr && <span>{dept.nameAr}</span>}
              </Space>
            </div>
          </Space>
          <Space>
            {children.length > 0 && (
              <Tag color="default">{children.length} قسم فرعي</Tag>
            )}
            <Button
              type="text"
              icon={<EditOutlined />}
              onClick={() => handleEdit(dept)}
            >
              تعديل
            </Button>
            <Button
              type="text"
              danger
              icon={<DeleteOutlined />}
              onClick={() => showDeleteConfirm(dept.id)}
            >
              حذف
            </Button>
          </Space>
        </div>
        {!search && children.map((child) => renderDepartment(child, level + 1))}
      </div>
    );
  };

  return (
    <div>
      <PageHeader
        title="الأقسام والمناصب"
        subtitle="إدارة الهيكل التنظيمي للشركة"
        breadcrumbs={[
          { title: "الرئيسية", path: "/" },
          { title: "الموارد البشرية", path: "/hr" },
          { title: "الأقسام" },
        ]}
        extra={
          <Space>
            <Link to="/hr/positions">
              <Button icon={<TeamOutlined />}>المناصب</Button>
            </Link>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => {
                setShowForm(true);
                setEditingId(null);
                form.resetFields();
              }}
            >
              إضافة قسم
            </Button>
          </Space>
        }
      />

      {/* Stats Cards */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={12} sm={6}>
          <Card>
            <Statistic
              title="إجمالي الأقسام"
              value={totalDepartments}
              prefix={<ApartmentOutlined style={{ color: "#6366f1" }} />}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card>
            <Statistic
              title="أقسام رئيسية"
              value={rootCount}
              valueStyle={{ color: "#52c41a" }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card>
            <Statistic
              title="أقسام فرعية"
              value={subDepartments}
              valueStyle={{ color: "#faad14" }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card>
            <Statistic
              title="أقسام نشطة"
              value={activeDepartments}
              valueStyle={{ color: "#1890ff" }}
            />
          </Card>
        </Col>
      </Row>

      {/* Search */}
      <Card style={{ marginBottom: 16 }}>
        <Input
          placeholder="بحث في الأقسام..."
          prefix={<SearchOutlined />}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ maxWidth: 400 }}
          allowClear
        />
      </Card>

      {/* Departments List */}
      <Card bodyStyle={{ padding: 0 }}>
        {loading ? (
          <LoadingSkeleton />
        ) : filteredData.length === 0 ? (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description="لا توجد أقسام"
            style={{ padding: "48px 0" }}
          >
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => {
                setShowForm(true);
                setEditingId(null);
                form.resetFields();
              }}
            >
              إضافة قسم جديد
            </Button>
          </Empty>
        ) : (
          filteredData.map((dept) => renderDepartment(dept))
        )}
      </Card>

      {/* Add/Edit Modal */}
      <Modal
        title={editingId ? "تعديل القسم" : "إضافة قسم جديد"}
        open={showForm}
        onCancel={() => {
          setShowForm(false);
          setEditingId(null);
          form.resetFields();
        }}
        footer={null}
        destroyOnClose
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          initialValues={{ code: "", name: "", nameAr: "", parentId: "" }}
        >
          <Form.Item label="كود القسم" name="code">
            <Input placeholder="DEPT-001" />
          </Form.Item>

          <Form.Item
            label="اسم القسم (English)"
            name="name"
            rules={[{ required: true, message: "اسم القسم مطلوب" }]}
          >
            <Input placeholder="Department Name" />
          </Form.Item>

          <Form.Item label="اسم القسم (عربي)" name="nameAr">
            <Input placeholder="اسم القسم بالعربي" />
          </Form.Item>

          <Form.Item label="القسم الأب" name="parentId">
            <Select placeholder="قسم رئيسي" allowClear>
              {data
                .filter((d) => d.id !== editingId)
                .map((d) => (
                  <Select.Option key={d.id} value={d.id}>
                    {d.name}
                  </Select.Option>
                ))}
            </Select>
          </Form.Item>

          <Form.Item style={{ marginBottom: 0, marginTop: 24 }}>
            <Space style={{ width: "100%", justifyContent: "flex-end" }}>
              <Button
                onClick={() => {
                  setShowForm(false);
                  setEditingId(null);
                  form.resetFields();
                }}
              >
                إلغاء
              </Button>
              <Button type="primary" htmlType="submit" loading={submitting}>
                {submitting ? "جاري الحفظ..." : "حفظ"}
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmDelete
        open={deleteModalVisible}
        onConfirm={handleDelete}
        onCancel={() => {
          setDeleteModalVisible(false);
          setDeletingId(null);
        }}
        title="حذف القسم"
        description="هل أنت متأكد من حذف هذا القسم؟ لا يمكن التراجع عن هذا الإجراء."
      />
    </div>
  );
}
