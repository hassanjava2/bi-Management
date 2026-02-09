/**
 * صفحة الأسهم والشراكة
 * Shares & Partnership Page
 */
import { useState, useEffect } from "react";
import { Row, Col, Card, Statistic, Table, Tag, Space, Button, Modal, Form, Input, InputNumber, message, Empty } from "antd";
import {
  PieChartOutlined, UserOutlined, DollarOutlined,
  PlusOutlined, BankOutlined, PercentageOutlined,
} from "@ant-design/icons";
import { PageHeader, LoadingSkeleton } from "../components/shared";
import { API_BASE, getAuthHeaders } from "../utils/api";

interface Shareholder {
  id: string;
  code: string;
  name: string;
  phone: string;
  email: string;
  sharePercentage: number;
  shareValue: number;
  joinDate: string;
  bankAccount: string;
  bankName: string;
  isActive: number;
}

export default function SharesPage() {
  const [shareholders, setShareholders] = useState<Shareholder[]>([]);
  const [config, setConfig] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form] = Form.useForm();

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [configRes, summaryRes] = await Promise.all([
        fetch(`${API_BASE}/api/shares/config`, { headers: getAuthHeaders() }),
        fetch(`${API_BASE}/api/shares/summary`, { headers: getAuthHeaders() }),
      ]);

      if (configRes.ok) {
        const data = await configRes.json();
        setConfig(data.data);
      }
      if (summaryRes.ok) {
        const data = await summaryRes.json();
        setShareholders(data.data?.shareholders || []);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (values: any) => {
    try {
      const res = await fetch(`${API_BASE}/api/shares/shareholders`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify(values),
      });
      if (res.ok) {
        message.success("تم إضافة المساهم بنجاح");
        setShowModal(false);
        form.resetFields();
        loadData();
      } else {
        message.error("فشل في إضافة المساهم");
      }
    } catch (error) {
      message.error("حدث خطأ");
    }
  };

  if (loading) return <LoadingSkeleton />;

  const totalPercentage = shareholders.reduce((s, sh) => s + (sh.sharePercentage || 0), 0);
  const totalValue = shareholders.reduce((s, sh) => s + (sh.shareValue || 0), 0);

  const columns = [
    { title: "الرمز", dataIndex: "code", key: "code", width: 100 },
    { title: "الاسم", dataIndex: "name", key: "name" },
    {
      title: "النسبة", dataIndex: "sharePercentage", key: "percentage",
      render: (v: number) => <Tag color="blue">{v}%</Tag>,
      align: "center" as const,
    },
    {
      title: "القيمة", dataIndex: "shareValue", key: "value",
      render: (v: number) => v ? `${v.toLocaleString()} د.ع` : "-",
    },
    { title: "الهاتف", dataIndex: "phone", key: "phone" },
    {
      title: "البنك", dataIndex: "bankName", key: "bank",
      render: (v: string) => v || "-",
    },
    {
      title: "الحالة", dataIndex: "isActive", key: "active",
      render: (v: number) => <Tag color={v ? "green" : "red"}>{v ? "نشط" : "غير نشط"}</Tag>,
    },
  ];

  return (
    <div>
      <PageHeader
        title="الأسهم والشراكة"
        subtitle={config?.share_system_type === "fixed_value_variable_count" ? "ثابتة القيمة متغيرة العدد" : "ثابتة العدد متغيرة القيمة"}
        breadcrumbs={[
          { title: "الرئيسية", href: "/" },
          { title: "الأسهم" },
        ]}
        extra={
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setShowModal(true)}>
            إضافة مساهم
          </Button>
        }
      />

      {/* الإحصائيات */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={12} sm={8} md={6}>
          <Card size="small" style={{ borderRadius: 12 }}>
            <Statistic title="عدد المساهمين" value={shareholders.length} prefix={<UserOutlined />} valueStyle={{ color: "#1890ff" }} />
          </Card>
        </Col>
        <Col xs={12} sm={8} md={6}>
          <Card size="small" style={{ borderRadius: 12 }}>
            <Statistic title="إجمالي النسب" value={totalPercentage} prefix={<PercentageOutlined />} suffix="%" valueStyle={{ color: totalPercentage === 100 ? "#52c41a" : "#ff4d4f" }} />
          </Card>
        </Col>
        <Col xs={12} sm={8} md={6}>
          <Card size="small" style={{ borderRadius: 12 }}>
            <Statistic title="إجمالي القيمة" value={totalValue} prefix={<DollarOutlined />} suffix="د.ع" />
          </Card>
        </Col>
        <Col xs={12} sm={8} md={6}>
          <Card size="small" style={{ borderRadius: 12 }}>
            <Statistic title="نوع النظام" value={config?.share_system_type === "fixed_value_variable_count" ? "قيمة ثابتة" : "عدد ثابت"} prefix={<PieChartOutlined />} valueStyle={{ fontSize: 16 }} />
          </Card>
        </Col>
      </Row>

      {/* جدول المساهمين */}
      <Card title={<Space><PieChartOutlined /> المساهمين</Space>} style={{ borderRadius: 12 }}>
        {shareholders.length === 0 ? (
          <Empty description="لا يوجد مساهمون" image={Empty.PRESENTED_IMAGE_SIMPLE}>
            <Button type="primary" icon={<PlusOutlined />} onClick={() => setShowModal(true)}>إضافة أول مساهم</Button>
          </Empty>
        ) : (
          <Table dataSource={shareholders} columns={columns} rowKey="id" size="small" />
        )}
      </Card>

      {/* نافذة إضافة مساهم */}
      <Modal title="إضافة مساهم جديد" open={showModal} onCancel={() => setShowModal(false)} footer={null} width={500}>
        <Form form={form} layout="vertical" onFinish={handleCreate}>
          <Form.Item name="name" label="الاسم" rules={[{ required: true, message: "يرجى إدخال الاسم" }]}>
            <Input placeholder="اسم المساهم" />
          </Form.Item>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="sharePercentage" label="نسبة المساهمة %" rules={[{ required: true, message: "يرجى إدخال النسبة" }]}>
                <InputNumber style={{ width: "100%" }} min={0} max={100} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="shareValue" label="القيمة">
                <InputNumber style={{ width: "100%" }} min={0} />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="phone" label="الهاتف">
                <Input placeholder="07xx..." />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="email" label="البريد">
                <Input placeholder="email@..." />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="bankName" label="البنك">
                <Input />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="bankAccount" label="رقم الحساب">
                <Input />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item style={{ marginBottom: 0, textAlign: "left" }}>
            <Space>
              <Button onClick={() => setShowModal(false)}>إلغاء</Button>
              <Button type="primary" htmlType="submit">إضافة</Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
