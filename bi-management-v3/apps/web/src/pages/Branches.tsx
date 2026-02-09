import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { API_BASE, getAuthHeaders, fetchList } from "../utils/api";
import {
  Row,
  Col,
  Card,
  Button,
  Input,
  Form,
  Modal,
  Tag,
  Space,
  message,
  Statistic,
  Checkbox,
  Empty,
} from "antd";
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  BankOutlined,
  CheckCircleOutlined,
  PhoneOutlined,
  MailOutlined,
  EnvironmentOutlined,
  EyeOutlined,
} from "@ant-design/icons";
import { PageHeader, StatusTag, ConfirmDelete, LoadingSkeleton } from "../components/shared";

type Branch = {
  id: string;
  code: string;
  name: string;
  nameAr: string | null;
  address: string | null;
  city: string | null;
  phone: string | null;
  email: string | null;
  isMain: number | null;
  isActive: number | null;
};

export default function Branches() {
  const [data, setData] = useState<Branch[]>([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [form] = Form.useForm();
  const navigate = useNavigate();

  useEffect(() => {
    document.title = "الفروع | BI Management v3";
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const result = await fetchList<Branch>("/api/branches", page);
      setData(result.data);
    } catch (e) {
      message.error("فشل في تحميل الفروع");
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

  const openEdit = (record: Branch) => {
    setEditingId(record.id);
    form.setFieldsValue({
      code: record.code,
      name: record.name,
      nameAr: record.nameAr || "",
      address: record.address || "",
      city: record.city || "",
      phone: record.phone || "",
      email: record.email || "",
      isMain: record.isMain === 1,
    });
    setModalOpen(true);
  };

  const handleSubmit = async (values: any) => {
    setSubmitting(true);
    try {
      const body = {
        code: values.code?.trim(),
        name: values.name?.trim(),
        nameAr: values.nameAr?.trim() || undefined,
        address: values.address?.trim() || undefined,
        city: values.city?.trim() || undefined,
        phone: values.phone?.trim() || undefined,
        email: values.email?.trim() || undefined,
        isMain: values.isMain ? 1 : 0,
      };

      if (editingId) {
        const res = await fetch(`${API_BASE}/api/branches/${editingId}`, {
          method: "PUT",
          headers: getAuthHeaders(),
          body: JSON.stringify(body),
        });
        if (!res.ok) {
          const d = await res.json().catch(() => ({}));
          throw new Error(d.error || "فشل التعديل");
        }
        message.success("تم تعديل الفرع بنجاح");
      } else {
        const res = await fetch(`${API_BASE}/api/branches`, {
          method: "POST",
          headers: getAuthHeaders(),
          body: JSON.stringify(body),
        });
        if (!res.ok) {
          const d = await res.json().catch(() => ({}));
          throw new Error(d.error || "فشل الإضافة");
        }
        message.success("تمت إضافة الفرع بنجاح");
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
      const res = await fetch(`${API_BASE}/api/branches/${id}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      });
      if (!res.ok) throw new Error("فشل التعطيل");
      message.success("تم تعطيل الفرع");
      fetchData();
    } catch (err) {
      message.error(err instanceof Error ? err.message : "فشل التعطيل");
    }
  };

  // Stats
  const mainBranch = data.find((b) => b.isMain);
  const activeBranches = data.filter((b) => b.isActive).length;

  if (loading && data.length === 0) {
    return (
      <div>
        <PageHeader
          title="الفروع"
          breadcrumbs={[{ title: "الإعدادات" }, { title: "الفروع" }]}
        />
        <LoadingSkeleton type="card" rows={4} />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="الفروع"
        subtitle={`إدارة فروع المؤسسة - ${data.length} فرع`}
        breadcrumbs={[{ title: "الإعدادات" }, { title: "الفروع" }]}
        extra={
          <Button type="primary" icon={<PlusOutlined />} onClick={openAdd}>
            إضافة فرع
          </Button>
        }
      />

      {/* Quick Stats */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={12} sm={8}>
          <Card>
            <Statistic
              title="إجمالي الفروع"
              value={data.length}
              prefix={<BankOutlined style={{ color: "#3b82f6" }} />}
              valueStyle={{ color: "#3b82f6" }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={8}>
          <Card>
            <Statistic
              title="فروع نشطة"
              value={activeBranches}
              prefix={<CheckCircleOutlined style={{ color: "#22c55e" }} />}
              valueStyle={{ color: "#22c55e" }}
            />
          </Card>
        </Col>
        {mainBranch && (
          <Col xs={24} sm={8}>
            <Card>
              <div style={{ fontSize: 12, color: "#64748b", marginBottom: 4 }}>
                الفرع الرئيسي
              </div>
              <div style={{ fontSize: 18, fontWeight: 600, color: "#10b981" }}>
                {mainBranch.nameAr || mainBranch.name}
              </div>
            </Card>
          </Col>
        )}
      </Row>

      {/* Branches Grid */}
      {data.length === 0 ? (
        <Card>
          <Empty description="لا توجد فروع مسجلة" />
        </Card>
      ) : (
        <Row gutter={[16, 16]}>
          {data.map((branch) => (
            <Col xs={24} sm={12} lg={8} key={branch.id}>
              <Card
                hoverable
                style={{
                  borderRight: branch.isMain
                    ? "4px solid #10b981"
                    : branch.isActive
                    ? "4px solid #3b82f6"
                    : "4px solid #e2e8f0",
                }}
                actions={[
                  <Link to={`/branches/${branch.id}`} key="view">
                    <Button type="text" icon={<EyeOutlined />} size="small">
                      عرض
                    </Button>
                  </Link>,
                  <Button
                    type="text"
                    icon={<EditOutlined />}
                    size="small"
                    onClick={() => openEdit(branch)}
                    key="edit"
                  >
                    تعديل
                  </Button>,
                  <ConfirmDelete
                    key="delete"
                    title="تعطيل الفرع"
                    description="هل تريد تعطيل هذا الفرع؟"
                    onConfirm={() =>
                      handleDelete(branch.id, branch.nameAr || branch.name)
                    }
                  >
                    <Button type="text" danger icon={<DeleteOutlined />} size="small">
                      تعطيل
                    </Button>
                  </ConfirmDelete>,
                ]}
              >
                <div style={{ minHeight: 100 }}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                      marginBottom: 12,
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 16 }}>
                        {branch.nameAr || branch.name}
                      </div>
                      {branch.nameAr && (
                        <div style={{ fontSize: 13, color: "#64748b" }}>
                          {branch.name}
                        </div>
                      )}
                    </div>
                    <Space>
                      <Tag>{branch.code}</Tag>
                      {branch.isMain === 1 && <Tag color="green">رئيسي</Tag>}
                    </Space>
                  </div>

                  <div style={{ fontSize: 13, color: "#64748b", marginBottom: 8 }}>
                    {branch.city && (
                      <div>
                        <EnvironmentOutlined /> {branch.city}
                      </div>
                    )}
                    {branch.address && (
                      <div style={{ marginTop: 4 }}>{branch.address}</div>
                    )}
                    {branch.phone && (
                      <div style={{ marginTop: 4 }}>
                        <PhoneOutlined /> {branch.phone}
                      </div>
                    )}
                    {branch.email && (
                      <div style={{ marginTop: 4 }}>
                        <MailOutlined /> {branch.email}
                      </div>
                    )}
                  </div>

                  <StatusTag status={branch.isActive ? "active" : "inactive"} />
                </div>
              </Card>
            </Col>
          ))}
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
          <Button disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
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
        title={editingId ? "تعديل فرع" : "إضافة فرع جديد"}
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        footer={null}
        width={700}
        destroyOnClose
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Row gutter={16}>
            <Col xs={24} md={12}>
              <Form.Item
                name="code"
                label="الكود"
                rules={[{ required: true, message: "مطلوب" }]}
              >
                <Input placeholder="كود الفرع" />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item
                name="name"
                label="الاسم (إنجليزي)"
                rules={[{ required: true, message: "مطلوب" }]}
              >
                <Input placeholder="Branch Name" />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item name="nameAr" label="الاسم (عربي)">
                <Input placeholder="اسم الفرع" />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item name="city" label="المدينة">
                <Input placeholder="المدينة" />
              </Form.Item>
            </Col>
            <Col xs={24}>
              <Form.Item name="address" label="العنوان">
                <Input prefix={<EnvironmentOutlined />} placeholder="العنوان" />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item name="phone" label="الهاتف">
                <Input prefix={<PhoneOutlined />} placeholder="رقم الهاتف" />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item name="email" label="البريد الإلكتروني">
                <Input prefix={<MailOutlined />} placeholder="email@example.com" />
              </Form.Item>
            </Col>
            <Col xs={24}>
              <Form.Item name="isMain" valuePropName="checked">
                <Checkbox>فرع رئيسي</Checkbox>
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
