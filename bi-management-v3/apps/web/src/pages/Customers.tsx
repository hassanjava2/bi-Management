import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
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
  TeamOutlined,
  WalletOutlined,
  StopOutlined,
  PhoneOutlined,
  MailOutlined,
  EnvironmentOutlined,
} from "@ant-design/icons";
import { PageHeader, StatusTag, MoneyDisplay, ConfirmDelete, LoadingSkeleton } from "../components/shared";

type Customer = {
  id: string;
  code: string | null;
  name: string;
  nameAr: string | null;
  type: string | null;
  phone: string;
  email: string | null;
  address: string | null;
  balance: number | null;
  creditLimit: number | null;
  isActive: number | null;
  isBlocked: number | null;
};

const TYPE_OPTIONS = [
  { value: "retail", label: "قطاعي", color: "blue" },
  { value: "wholesale", label: "جملة", color: "purple" },
  { value: "company", label: "شركة", color: "gold" },
];

const TYPE_LABELS: Record<string, { label: string; color: string }> = Object.fromEntries(
  TYPE_OPTIONS.map((t) => [t.value, { label: t.label, color: t.color }])
);

export default function Customers() {
  const [data, setData] = useState<Customer[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [form] = Form.useForm();

  useEffect(() => {
    document.title = "العملاء | BI Management v3";
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const result = await fetchList<Customer>("/api/customers", page);
      setData(result.data);
      setTotal(result.total || result.data.length);
    } catch (e) {
      message.error("فشل في تحميل العملاء");
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
    form.setFieldsValue({ type: "retail" });
    setModalOpen(true);
  };

  const openEdit = (record: Customer) => {
    setEditingId(record.id);
    form.setFieldsValue({
      name: record.name,
      nameAr: record.nameAr || "",
      phone: record.phone,
      code: record.code || "",
      email: record.email || "",
      address: record.address || "",
      type: record.type || "retail",
      creditLimit: record.creditLimit,
    });
    setModalOpen(true);
  };

  const handleSubmit = async (values: any) => {
    setSubmitting(true);
    try {
      const body = {
        name: values.name?.trim(),
        nameAr: values.nameAr?.trim() || undefined,
        phone: values.phone?.trim(),
        code: values.code?.trim() || undefined,
        email: values.email?.trim() || undefined,
        address: values.address?.trim() || undefined,
        type: values.type,
        creditLimit: values.creditLimit,
      };

      if (editingId) {
        const res = await fetch(`${API_BASE}/api/customers/${editingId}`, {
          method: "PUT",
          headers: getAuthHeaders(),
          body: JSON.stringify(body),
        });
        if (!res.ok) {
          const d = await res.json().catch(() => ({}));
          throw new Error(d.error || "فشل التعديل");
        }
        message.success("تم تعديل العميل بنجاح");
      } else {
        const res = await fetch(`${API_BASE}/api/customers`, {
          method: "POST",
          headers: getAuthHeaders(),
          body: JSON.stringify(body),
        });
        if (!res.ok) {
          const d = await res.json().catch(() => ({}));
          throw new Error(d.error || "فشل الإضافة");
        }
        message.success("تمت إضافة العميل بنجاح");
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
      const res = await fetch(`${API_BASE}/api/customers/${id}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      });
      if (!res.ok) throw new Error("فشل الحذف");
      message.success("تم حذف العميل");
      fetchData();
    } catch (err) {
      message.error(err instanceof Error ? err.message : "فشل الحذف");
    }
  };

  // Filter customers
  const filteredData = filter
    ? data.filter(
        (c) =>
          c.name.toLowerCase().includes(filter.toLowerCase()) ||
          c.nameAr?.includes(filter) ||
          c.code?.toLowerCase().includes(filter.toLowerCase()) ||
          c.phone.includes(filter)
      )
    : data;

  // Stats
  const totalBalance = data.reduce((acc, c) => acc + (c.balance || 0), 0);
  const blockedCount = data.filter((c) => c.isBlocked).length;

  const columns: TableColumnsType<Customer> = [
    {
      title: "الكود",
      dataIndex: "code",
      key: "code",
      width: 90,
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
            to={`/customers/${record.id}`}
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
      title: "الهاتف",
      dataIndex: "phone",
      key: "phone",
      width: 130,
      render: (phone) => (
        <Space size={4}>
          <PhoneOutlined style={{ color: "#64748b" }} />
          {phone}
        </Space>
      ),
    },
    {
      title: "النوع",
      dataIndex: "type",
      key: "type",
      width: 100,
      render: (type) => {
        const info = TYPE_LABELS[type || "retail"] || TYPE_LABELS.retail;
        return <Tag color={info.color}>{info.label}</Tag>;
      },
    },
    {
      title: "الرصيد",
      dataIndex: "balance",
      key: "balance",
      width: 130,
      render: (balance, record) => {
        const isOverLimit =
          record.creditLimit && balance && balance > record.creditLimit;
        return (
          <div>
            <MoneyDisplay amount={balance || 0} colored />
            {isOverLimit && (
              <div style={{ fontSize: 11, color: "#f59e0b" }}>تجاوز الحد</div>
            )}
          </div>
        );
      },
    },
    {
      title: "حد الائتمان",
      dataIndex: "creditLimit",
      key: "creditLimit",
      width: 120,
      render: (limit) =>
        limit != null ? <MoneyDisplay amount={limit} /> : "—",
    },
    {
      title: "الحالة",
      dataIndex: "isActive",
      key: "status",
      width: 90,
      render: (isActive, record) => {
        if (record.isBlocked) return <Tag color="red">محظور</Tag>;
        return <StatusTag status={isActive ? "active" : "inactive"} />;
      },
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
          title="العملاء"
          breadcrumbs={[{ title: "المبيعات" }, { title: "العملاء" }]}
        />
        <LoadingSkeleton type="table" rows={8} />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="العملاء"
        subtitle={`إدارة بيانات العملاء - ${total} عميل`}
        breadcrumbs={[{ title: "المبيعات" }, { title: "العملاء" }]}
        extra={
          <Button type="primary" icon={<PlusOutlined />} onClick={openAdd}>
            إضافة عميل
          </Button>
        }
      />

      {/* Quick Stats */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={12} sm={8} md={6}>
          <Card>
            <Statistic
              title="إجمالي العملاء"
              value={data.length}
              prefix={<TeamOutlined style={{ color: "#3b82f6" }} />}
              valueStyle={{ color: "#3b82f6" }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={8} md={6}>
          <Card>
            <Statistic
              title="إجمالي الأرصدة"
              value={totalBalance}
              suffix="د.ع"
              prefix={<WalletOutlined style={{ color: totalBalance >= 0 ? "#22c55e" : "#ef4444" }} />}
              valueStyle={{ color: totalBalance >= 0 ? "#22c55e" : "#ef4444" }}
              formatter={(value) => new Intl.NumberFormat("ar-IQ").format(value as number)}
            />
          </Card>
        </Col>
        {blockedCount > 0 && (
          <Col xs={12} sm={8} md={6}>
            <Card>
              <Statistic
                title="عملاء محظورين"
                value={blockedCount}
                prefix={<StopOutlined style={{ color: "#ef4444" }} />}
                valueStyle={{ color: "#ef4444" }}
              />
            </Card>
          </Col>
        )}
      </Row>

      {/* Search & Table */}
      <Card
        title="قائمة العملاء"
        extra={
          <Input
            placeholder="بحث بالاسم أو الكود أو الهاتف..."
            prefix={<SearchOutlined />}
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            style={{ width: 280 }}
            allowClear
          />
        }
        styles={{ body: { padding: 0 } }}
      >
        <Table<Customer>
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
        title={editingId ? "تعديل عميل" : "إضافة عميل جديد"}
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
          initialValues={{ type: "retail" }}
        >
          <Row gutter={16}>
            <Col xs={24} md={12}>
              <Form.Item name="code" label="الكود">
                <Input placeholder="كود العميل" />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item
                name="name"
                label="الاسم"
                rules={[{ required: true, message: "مطلوب" }]}
              >
                <Input placeholder="اسم العميل" />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item name="nameAr" label="الاسم (عربي)">
                <Input placeholder="الاسم بالعربي" />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item
                name="phone"
                label="الهاتف"
                rules={[{ required: true, message: "مطلوب" }]}
              >
                <Input prefix={<PhoneOutlined />} placeholder="رقم الهاتف" />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item name="email" label="البريد الإلكتروني">
                <Input prefix={<MailOutlined />} placeholder="email@example.com" />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item name="type" label="نوع العميل">
                <Select
                  options={TYPE_OPTIONS.map((t) => ({
                    value: t.value,
                    label: t.label,
                  }))}
                />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item name="creditLimit" label="حد الائتمان">
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
              <Form.Item name="address" label="العنوان">
                <Input prefix={<EnvironmentOutlined />} placeholder="العنوان" />
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
