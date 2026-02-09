/**
 * صفحة الشركات
 * Companies Page
 */
import { useState, useEffect } from "react";
import { Card, Table, Button, Modal, Form, Input, Space, message, Tag, Empty, Popconfirm } from "antd";
import { PlusOutlined, BankOutlined, EditOutlined, DeleteOutlined } from "@ant-design/icons";
import { PageHeader, LoadingSkeleton } from "../components/shared";
import { API_BASE, getAuthHeaders } from "../utils/api";

interface Company {
  id: string;
  code: string;
  name: string;
  name_ar: string;
  is_active: number;
}

export default function CompaniesPage() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form] = Form.useForm();

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/companies`, { headers: getAuthHeaders() });
      if (res.ok) {
        const data = await res.json();
        setCompanies(data.data || []);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (values: any) => {
    try {
      const method = editingId ? "PUT" : "POST";
      const url = editingId ? `${API_BASE}/api/companies/${editingId}` : `${API_BASE}/api/companies`;

      const res = await fetch(url, {
        method,
        headers: getAuthHeaders(),
        body: JSON.stringify(values),
      });

      if (res.ok) {
        message.success(editingId ? "تم تحديث الشركة" : "تم إضافة الشركة");
        setShowModal(false);
        setEditingId(null);
        form.resetFields();
        loadData();
      } else {
        message.error("فشل في حفظ البيانات");
      }
    } catch (error) {
      message.error("حدث خطأ");
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`${API_BASE}/api/companies/${id}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        message.success("تم حذف الشركة");
        loadData();
      } else {
        message.error("فشل في الحذف");
      }
    } catch (error) {
      message.error("حدث خطأ");
    }
  };

  const openEdit = (record: Company) => {
    setEditingId(record.id);
    form.setFieldsValue({
      code: record.code,
      name: record.name,
      name_ar: record.name_ar,
    });
    setShowModal(true);
  };

  if (loading) return <LoadingSkeleton />;

  const columns = [
    { title: "الرمز", dataIndex: "code", key: "code", width: 120 },
    { title: "الاسم (EN)", dataIndex: "name", key: "name" },
    { title: "الاسم (AR)", dataIndex: "name_ar", key: "name_ar" },
    {
      title: "الحالة", dataIndex: "is_active", key: "active",
      render: (v: number) => <Tag color={v !== 0 ? "green" : "red"}>{v !== 0 ? "نشط" : "غير نشط"}</Tag>,
    },
    {
      title: "إجراءات", key: "actions", width: 120,
      render: (_: any, record: Company) => (
        <Space size="small">
          <Button type="link" size="small" icon={<EditOutlined />} onClick={() => openEdit(record)} />
          <Popconfirm title="هل تريد حذف الشركة؟" onConfirm={() => handleDelete(record.id)} okText="نعم" cancelText="لا">
            <Button type="link" danger size="small" icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="الشركات"
        subtitle="إدارة الشركات والتصنيفات"
        breadcrumbs={[
          { title: "الرئيسية", href: "/" },
          { title: "الشركات" },
        ]}
        extra={
          <Button type="primary" icon={<PlusOutlined />} onClick={() => { setEditingId(null); form.resetFields(); setShowModal(true); }}>
            إضافة شركة
          </Button>
        }
      />

      <Card title={<Space><BankOutlined /> الشركات</Space>} style={{ borderRadius: 12 }}>
        {companies.length === 0 ? (
          <Empty description="لا توجد شركات" image={Empty.PRESENTED_IMAGE_SIMPLE}>
            <Button type="primary" icon={<PlusOutlined />} onClick={() => setShowModal(true)}>إضافة أول شركة</Button>
          </Empty>
        ) : (
          <Table dataSource={companies} columns={columns} rowKey="id" size="small" />
        )}
      </Card>

      <Modal
        title={editingId ? "تعديل شركة" : "إضافة شركة جديدة"}
        open={showModal}
        onCancel={() => { setShowModal(false); setEditingId(null); }}
        footer={null}
        width={400}
      >
        <Form form={form} layout="vertical" onFinish={handleSave}>
          <Form.Item name="code" label="الرمز">
            <Input placeholder="COMP-001" />
          </Form.Item>
          <Form.Item name="name" label="الاسم (EN)" rules={[{ required: true, message: "يرجى إدخال الاسم" }]}>
            <Input placeholder="Company Name" />
          </Form.Item>
          <Form.Item name="name_ar" label="الاسم (AR)">
            <Input placeholder="اسم الشركة" />
          </Form.Item>
          <Form.Item style={{ marginBottom: 0, textAlign: "left" }}>
            <Space>
              <Button onClick={() => setShowModal(false)}>إلغاء</Button>
              <Button type="primary" htmlType="submit">{editingId ? "تحديث" : "إضافة"}</Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
