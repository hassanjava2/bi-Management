import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
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
  Empty,
} from "antd";
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  SearchOutlined,
  ShopOutlined,
  WalletOutlined,
  CheckCircleOutlined,
  PhoneOutlined,
  MailOutlined,
  EnvironmentOutlined,
} from "@ant-design/icons";
import { PageHeader, StatusTag, MoneyDisplay, ConfirmDelete, LoadingSkeleton } from "../components/shared";

type Supplier = {
  id: string;
  code: string | null;
  name: string;
  nameAr: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  balance: number | null;
  isActive: number | null;
};

export default function Suppliers() {
  const [data, setData] = useState<Supplier[]>([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [form] = Form.useForm();

  useEffect(() => {
    document.title = "الموردين | BI Management v3";
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const result = await fetchList<Supplier>("/api/suppliers", page);
      setData(result.data);
    } catch (e) {
      message.error("فشل في تحميل الموردين");
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

  const openEdit = (record: Supplier) => {
    setEditingId(record.id);
    form.setFieldsValue({
      name: record.name,
      nameAr: record.nameAr || "",
      phone: record.phone || "",
      code: record.code || "",
      email: record.email || "",
      address: record.address || "",
    });
    setModalOpen(true);
  };

  const handleSubmit = async (values: any) => {
    setSubmitting(true);
    try {
      const body = {
        name: values.name?.trim(),
        code: values.code?.trim() || undefined,
        nameAr: values.nameAr?.trim() || undefined,
        phone: values.phone?.trim() || undefined,
        email: values.email?.trim() || undefined,
        address: values.address?.trim() || undefined,
      };

      if (editingId) {
        const res = await fetch(`${API_BASE}/api/suppliers/${editingId}`, {
          method: "PUT",
          headers: getAuthHeaders(),
          body: JSON.stringify(body),
        });
        if (!res.ok) {
          const d = await res.json().catch(() => ({}));
          throw new Error(d.error || "فشل التعديل");
        }
        message.success("تم تعديل المورد بنجاح");
      } else {
        const res = await fetch(`${API_BASE}/api/suppliers`, {
          method: "POST",
          headers: getAuthHeaders(),
          body: JSON.stringify(body),
        });
        if (!res.ok) {
          const d = await res.json().catch(() => ({}));
          throw new Error(d.error || "فشل الإضافة");
        }
        message.success("تمت إضافة المورد بنجاح");
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
      const res = await fetch(`${API_BASE}/api/suppliers/${id}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      });
      if (!res.ok) throw new Error("فشل الحذف");
      message.success("تم حذف المورد");
      fetchData();
    } catch (err) {
      message.error(err instanceof Error ? err.message : "فشل الحذف");
    }
  };

  // Filter suppliers
  const filteredData = filter
    ? data.filter(
        (s) =>
          s.name.toLowerCase().includes(filter.toLowerCase()) ||
          s.nameAr?.includes(filter) ||
          s.code?.toLowerCase().includes(filter.toLowerCase()) ||
          s.phone?.includes(filter)
      )
    : data;

  // Stats
  const totalBalance = data.reduce((acc, s) => acc + (s.balance || 0), 0);
  const activeCount = data.filter((s) => s.isActive).length;

  if (loading && data.length === 0) {
    return (
      <div>
        <PageHeader
          title="الموردين"
          breadcrumbs={[{ title: "المشتريات" }, { title: "الموردين" }]}
        />
        <LoadingSkeleton type="card" rows={6} />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="الموردين"
        subtitle={`إدارة بيانات الموردين - ${data.length} مورد`}
        breadcrumbs={[{ title: "المشتريات" }, { title: "الموردين" }]}
        extra={
          <Button type="primary" icon={<PlusOutlined />} onClick={openAdd}>
            إضافة مورد
          </Button>
        }
      />

      {/* Quick Stats */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={12} sm={8} md={6}>
          <Card>
            <Statistic
              title="إجمالي الموردين"
              value={data.length}
              prefix={<ShopOutlined style={{ color: "#22c55e" }} />}
              valueStyle={{ color: "#22c55e" }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={8} md={6}>
          <Card>
            <Statistic
              title="موردين نشطين"
              value={activeCount}
              prefix={<CheckCircleOutlined style={{ color: "#3b82f6" }} />}
              valueStyle={{ color: "#3b82f6" }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={8} md={6}>
          <Card>
            <Statistic
              title={totalBalance <= 0 ? "رصيد لنا" : "رصيد علينا"}
              value={Math.abs(totalBalance)}
              suffix="د.ع"
              prefix={
                <WalletOutlined
                  style={{ color: totalBalance <= 0 ? "#22c55e" : "#ef4444" }}
                />
              }
              valueStyle={{ color: totalBalance <= 0 ? "#22c55e" : "#ef4444" }}
              formatter={(value) =>
                new Intl.NumberFormat("ar-IQ").format(value as number)
              }
            />
          </Card>
        </Col>
      </Row>

      {/* Search */}
      <div style={{ marginBottom: 16 }}>
        <Input
          placeholder="بحث بالاسم أو الكود أو الهاتف..."
          prefix={<SearchOutlined />}
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          style={{ width: 300 }}
          allowClear
        />
      </div>

      {/* Suppliers Grid */}
      {filteredData.length === 0 ? (
        <Card>
          <Empty description="لا يوجد موردين مطابقين" />
        </Card>
      ) : (
        <Row gutter={[16, 16]}>
          {filteredData.map((supplier) => (
            <Col xs={24} sm={12} lg={8} key={supplier.id}>
              <Card
                hoverable
                style={{
                  borderRight: supplier.isActive
                    ? "4px solid #22c55e"
                    : "4px solid #e2e8f0",
                }}
                actions={[
                  <Button
                    type="text"
                    icon={<EditOutlined />}
                    onClick={() => openEdit(supplier)}
                  >
                    تعديل
                  </Button>,
                  <ConfirmDelete
                    onConfirm={() =>
                      handleDelete(supplier.id, supplier.nameAr || supplier.name)
                    }
                  >
                    <Button type="text" danger icon={<DeleteOutlined />}>
                      حذف
                    </Button>
                  </ConfirmDelete>,
                ]}
              >
                <div style={{ minHeight: 120 }}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                      marginBottom: 12,
                    }}
                  >
                    <div>
                      <Link
                        to={`/suppliers/${supplier.id}`}
                        style={{
                          fontWeight: 600,
                          fontSize: 16,
                          color: "#1e293b",
                        }}
                      >
                        {supplier.nameAr || supplier.name}
                      </Link>
                      {supplier.nameAr && (
                        <div style={{ fontSize: 13, color: "#64748b" }}>
                          {supplier.name}
                        </div>
                      )}
                    </div>
                    <Space>
                      {supplier.code && <Tag>{supplier.code}</Tag>}
                      <StatusTag
                        status={supplier.isActive ? "active" : "inactive"}
                      />
                    </Space>
                  </div>

                  <div style={{ fontSize: 13, color: "#64748b", marginBottom: 12 }}>
                    {supplier.phone && (
                      <div>
                        <PhoneOutlined /> {supplier.phone}
                      </div>
                    )}
                    {supplier.email && (
                      <div style={{ marginTop: 4 }}>
                        <MailOutlined /> {supplier.email}
                      </div>
                    )}
                    {supplier.address && (
                      <div style={{ marginTop: 4 }}>
                        <EnvironmentOutlined /> {supplier.address}
                      </div>
                    )}
                  </div>

                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <span style={{ fontSize: 12, color: "#94a3b8" }}>الرصيد:</span>
                    <span
                      style={{
                        fontWeight: 600,
                        color:
                          (supplier.balance || 0) <= 0 ? "#22c55e" : "#ef4444",
                      }}
                    >
                      <MoneyDisplay amount={Math.abs(supplier.balance || 0)} />{" "}
                      {(supplier.balance || 0) <= 0 ? "(لنا)" : "(علينا)"}
                    </span>
                  </div>
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
        title={editingId ? "تعديل مورد" : "إضافة مورد جديد"}
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
                <Input placeholder="كود المورد" />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item
                name="name"
                label="الاسم (إنجليزي)"
                rules={[{ required: true, message: "مطلوب" }]}
              >
                <Input placeholder="Supplier Name" />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item name="nameAr" label="الاسم (عربي)">
                <Input placeholder="اسم المورد" />
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
            <Col xs={24} md={12}>
              <Form.Item name="address" label="العنوان">
                <Input prefix={<EnvironmentOutlined />} placeholder="العنوان" />
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
