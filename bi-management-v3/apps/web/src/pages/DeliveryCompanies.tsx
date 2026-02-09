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
  Tag,
  Space,
  message,
  Statistic,
  Empty,
  Form,
  InputNumber,
  Modal,
} from "antd";
import {
  PlusOutlined,
  CarOutlined,
  ShoppingOutlined,
  DollarOutlined,
  CheckCircleOutlined,
  EyeOutlined,
  CloseOutlined,
} from "@ant-design/icons";
import { PageHeader, LoadingSkeleton } from "../components/shared";
import { API_BASE, getAuthHeaders } from "../utils/api";

interface Company {
  id: string;
  code: string;
  name: string;
  nameAr: string;
  type: string;
  phone: string;
  contactPerson: string;
  balance: number;
  pendingOrders: number;
  pendingCount?: number;
  pendingAmount?: number;
  feeType: string;
  feeAmount: number;
  isActive: number;
}

const TYPE_LABELS: Record<string, { label: string; color: string }> = {
  company: { label: "شركة توصيل", color: "blue" },
  platform: { label: "منصة أقساط", color: "purple" },
  taxi: { label: "تكسي", color: "gold" },
  pickup: { label: "استلام شخصي", color: "green" },
};

export default function DeliveryCompanies() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form] = Form.useForm();

  useEffect(() => {
    fetchCompanies();
  }, []);

  async function fetchCompanies() {
    try {
      const res = await fetch(`${API_BASE}/api/delivery/companies-stats`, {
        headers: getAuthHeaders(),
      });
      const data = await res.json();
      setCompanies(data.companies || []);
    } catch (err) {
      console.error(err);
      message.error("فشل في تحميل شركات التوصيل");
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(values: any) {
    setSubmitting(true);
    try {
      const res = await fetch(`${API_BASE}/api/delivery/companies`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify(values),
      });
      if (res.ok) {
        message.success("تم إضافة الشركة بنجاح");
        setShowForm(false);
        form.resetFields();
        fetchCompanies();
      } else {
        message.error("فشل في إضافة الشركة");
      }
    } catch (err) {
      console.error(err);
      message.error("حدث خطأ أثناء الحفظ");
    } finally {
      setSubmitting(false);
    }
  }

  function formatCurrency(amount: number) {
    return (
      new Intl.NumberFormat("ar-IQ", {
        style: "decimal",
        minimumFractionDigits: 0,
      }).format(amount) + " د.ع"
    );
  }

  const columns = [
    {
      title: "الشركة",
      dataIndex: "nameAr",
      key: "company",
      render: (_: any, record: Company) => (
        <div>
          <div style={{ fontWeight: 500 }}>{record.nameAr || record.name}</div>
          {record.code && (
            <div style={{ fontSize: 12, color: "#8c8c8c" }}>{record.code}</div>
          )}
        </div>
      ),
    },
    {
      title: "النوع",
      dataIndex: "type",
      key: "type",
      render: (type: string) => (
        <Tag color={TYPE_LABELS[type]?.color || "default"}>
          {TYPE_LABELS[type]?.label || type}
        </Tag>
      ),
    },
    {
      title: "التواصل",
      key: "contact",
      render: (_: any, record: Company) => (
        <div>
          <div>{record.phone}</div>
          {record.contactPerson && (
            <div style={{ fontSize: 12, color: "#8c8c8c" }}>
              {record.contactPerson}
            </div>
          )}
        </div>
      ),
    },
    {
      title: "الأجرة",
      key: "fee",
      render: (_: any, record: Company) =>
        record.feeType === "fixed"
          ? formatCurrency(record.feeAmount)
          : `${record.feeAmount}%`,
    },
    {
      title: "طلبات معلقة",
      dataIndex: "pendingCount",
      key: "pendingCount",
      render: (count: number) => (
        <span style={{ color: count ? "#fa8c16" : "#bfbfbf", fontWeight: 500 }}>
          {count || 0}
        </span>
      ),
    },
    {
      title: "مبلغ معلق",
      dataIndex: "pendingAmount",
      key: "pendingAmount",
      render: (amount: number) => (
        <span style={{ color: amount ? "#f5222d" : "#bfbfbf", fontWeight: 500 }}>
          {formatCurrency(amount || 0)}
        </span>
      ),
    },
    {
      title: "إجراءات",
      key: "actions",
      render: (_: any, record: Company) => (
        <Link to={`/delivery/companies/${record.id}`}>
          <Button type="link" icon={<EyeOutlined />}>
            تفاصيل
          </Button>
        </Link>
      ),
    },
  ];

  if (loading) {
    return <LoadingSkeleton />;
  }

  const totalPendingCount = companies.reduce(
    (sum, c) => sum + (c.pendingCount || 0),
    0
  );
  const totalPendingAmount = companies.reduce(
    (sum, c) => sum + (c.pendingAmount || 0),
    0
  );
  const activeCount = companies.filter((c) => c.isActive).length;

  return (
    <div>
      <PageHeader
        title="شركات التوصيل"
        subtitle="إدارة شركات ومندوبي التوصيل"
        breadcrumbs={[
          { label: "الرئيسية", path: "/" },
          { label: "التوصيل", path: "/delivery" },
          { label: "شركات التوصيل" },
        ]}
        extra={
          <Button
            type="primary"
            icon={showForm ? <CloseOutlined /> : <PlusOutlined />}
            onClick={() => setShowForm(!showForm)}
          >
            {showForm ? "إلغاء" : "إضافة شركة"}
          </Button>
        }
      />

      {/* Add Form Modal */}
      <Modal
        title="إضافة شركة توصيل جديدة"
        open={showForm}
        onCancel={() => setShowForm(false)}
        footer={null}
        width={700}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          initialValues={{
            type: "company",
            feeType: "fixed",
            feeAmount: 0,
          }}
        >
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label="الكود" name="code">
                <Input placeholder="PRIME" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="الاسم بالإنجليزي"
                name="name"
                rules={[{ required: true, message: "مطلوب" }]}
              >
                <Input />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="الاسم بالعربي" name="nameAr">
                <Input />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="النوع" name="type">
                <Select>
                  <Select.Option value="company">شركة توصيل</Select.Option>
                  <Select.Option value="platform">
                    منصة أقساط (جني)
                  </Select.Option>
                  <Select.Option value="taxi">تكسي</Select.Option>
                  <Select.Option value="pickup">استلام شخصي</Select.Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="رقم الهاتف" name="phone">
                <Input />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="جهة الاتصال" name="contactPerson">
                <Input />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="نوع الأجرة" name="feeType">
                <Select>
                  <Select.Option value="fixed">مبلغ ثابت</Select.Option>
                  <Select.Option value="percentage">نسبة مئوية</Select.Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                noStyle
                shouldUpdate={(prev, cur) => prev.feeType !== cur.feeType}
              >
                {({ getFieldValue }) => (
                  <Form.Item
                    label={
                      getFieldValue("feeType") === "fixed" ? "الأجرة" : "النسبة %"
                    }
                    name="feeAmount"
                  >
                    <InputNumber
                      style={{ width: "100%" }}
                      min={0}
                      step={getFieldValue("feeType") === "fixed" ? 500 : 0.1}
                    />
                  </Form.Item>
                )}
              </Form.Item>
            </Col>
            <Col span={24}>
              <Form.Item>
                <Button
                  type="primary"
                  htmlType="submit"
                  loading={submitting}
                  block
                >
                  حفظ
                </Button>
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>

      {/* Summary Cards */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="إجمالي الشركات"
              value={companies.length}
              prefix={<CarOutlined style={{ color: "#1890ff" }} />}
              valueStyle={{ color: "#1890ff" }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="طلبات قيد التوصيل"
              value={totalPendingCount}
              prefix={<ShoppingOutlined style={{ color: "#fa8c16" }} />}
              valueStyle={{ color: "#fa8c16" }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="مبالغ معلقة"
              value={totalPendingAmount}
              suffix="د.ع"
              prefix={<DollarOutlined style={{ color: "#f5222d" }} />}
              valueStyle={{ color: "#f5222d" }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="شركات نشطة"
              value={activeCount}
              prefix={<CheckCircleOutlined style={{ color: "#52c41a" }} />}
              valueStyle={{ color: "#52c41a" }}
            />
          </Card>
        </Col>
      </Row>

      {/* Companies Table */}
      <Card>
        <Table
          dataSource={companies}
          columns={columns}
          rowKey="id"
          locale={{
            emptyText: (
              <Empty
                description="لا توجد شركات توصيل. أضف شركة جديدة للبدء."
                image={Empty.PRESENTED_IMAGE_SIMPLE}
              />
            ),
          }}
          pagination={{
            showSizeChanger: true,
            showTotal: (total) => `إجمالي ${total} شركة`,
            pageSizeOptions: ["10", "20", "50"],
          }}
        />
      </Card>
    </div>
  );
}
