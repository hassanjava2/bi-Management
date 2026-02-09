/**
 * إدارة العقارات والإيجارات
 */
import { useState, useEffect } from "react";
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
  Tabs,
  Modal,
  Form,
  InputNumber,
  Empty,
} from "antd";
import {
  HomeOutlined,
  PlusOutlined,
  FileTextOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  StopOutlined,
  EnvironmentOutlined,
  AreaChartOutlined,
  BankOutlined,
  ExclamationCircleOutlined,
} from "@ant-design/icons";
import { PageHeader, MoneyDisplay, DateDisplay, LoadingSkeleton } from "../components/shared";
import { API_BASE, getAuthHeaders } from "../utils/api";

interface Property {
  id: string;
  propertyNumber: string;
  name: string;
  propertyType: string;
  address: string;
  status: string;
  totalArea: string | null;
}

interface Contract {
  id: string;
  contractNumber: string;
  propertyId: string;
  monthlyRent: string;
  startDate: string;
  endDate: string;
  status: string;
}

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  available: { label: "متاح", color: "green" },
  occupied: { label: "مؤجر", color: "blue" },
  maintenance: { label: "صيانة", color: "orange" },
  reserved: { label: "محجوز", color: "purple" },
  sold: { label: "مباع", color: "red" },
};

const TYPE_CONFIG: Record<string, { label: string; icon: string }> = {
  commercial: { label: "تجاري", icon: "🏢" },
  residential: { label: "سكني", icon: "🏠" },
  industrial: { label: "صناعي", icon: "🏭" },
  land: { label: "أرض", icon: "🌍" },
  mixed: { label: "مختلط", icon: "🏗️" },
};

const CONTRACT_STATUS: Record<string, { label: string; color: string }> = {
  draft: { label: "مسودة", color: "default" },
  active: { label: "نشط", color: "green" },
  expired: { label: "منتهي", color: "orange" },
  terminated: { label: "ملغي", color: "red" },
  renewed: { label: "مجدد", color: "blue" },
};

export default function RealEstateManagement() {
  const [properties, setProperties] = useState<Property[]>([]);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<string>("properties");
  const [filter, setFilter] = useState({ status: "", type: "" });
  const [showModal, setShowModal] = useState(false);
  const [form] = Form.useForm();

  useEffect(() => {
    loadData();
  }, [activeTab, filter]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [statsRes] = await Promise.all([
        fetch(`${API_BASE}/api/realestate/stats`, { headers: getAuthHeaders() }),
      ]);
      if (statsRes.ok) setStats(await statsRes.json());

      if (activeTab === "properties") {
        const params = new URLSearchParams();
        if (filter.status) params.append("status", filter.status);
        if (filter.type) params.append("type", filter.type);
        const res = await fetch(`${API_BASE}/api/realestate/properties?${params}`, { headers: getAuthHeaders() });
        if (res.ok) setProperties(await res.json());
      } else {
        const res = await fetch(`${API_BASE}/api/realestate/contracts`, { headers: getAuthHeaders() });
        if (res.ok) setContracts(await res.json());
      }
    } catch (error) {
      console.error(error);
      message.error("حدث خطأ أثناء تحميل البيانات");
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (values: any) => {
    try {
      const res = await fetch(`${API_BASE}/api/realestate/properties`, {
        method: "POST",
        headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      if (res.ok) {
        message.success("تم إضافة العقار بنجاح");
        setShowModal(false);
        form.resetFields();
        loadData();
      } else {
        message.error("فشل في إضافة العقار");
      }
    } catch (error) {
      console.error(error);
      message.error("حدث خطأ أثناء إضافة العقار");
    }
  };

  const activateContract = async (id: string) => {
    try {
      await fetch(`${API_BASE}/api/realestate/contracts/${id}/activate`, {
        method: "PATCH",
        headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ signedBy: "current_user" }),
      });
      message.success("تم تفعيل العقد بنجاح");
      loadData();
    } catch (error) {
      console.error(error);
      message.error("حدث خطأ أثناء تفعيل العقد");
    }
  };

  const terminateContract = async (id: string) => {
    const reason = prompt("سبب الإنهاء:");
    if (!reason) return;
    try {
      await fetch(`${API_BASE}/api/realestate/contracts/${id}/terminate`, {
        method: "PATCH",
        headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ reason }),
      });
      message.success("تم إنهاء العقد بنجاح");
      loadData();
    } catch (error) {
      console.error(error);
      message.error("حدث خطأ أثناء إنهاء العقد");
    }
  };

  const contractColumns = [
    {
      title: "رقم العقد",
      key: "contractNumber",
      render: (_: any, record: Contract) => (
        <Space direction="vertical" size={0}>
          <Space>
            <span style={{ fontFamily: "monospace", color: "#9ca3af" }}>{record.contractNumber}</span>
            <Tag color={CONTRACT_STATUS[record.status]?.color || "default"}>
              {CONTRACT_STATUS[record.status]?.label || record.status}
            </Tag>
          </Space>
          <span style={{ fontSize: "0.85rem", color: "#6b7280" }}>
            🗓️ <DateDisplay date={record.startDate} /> - <DateDisplay date={record.endDate} />
          </span>
        </Space>
      ),
    },
    {
      title: "الإيجار الشهري",
      dataIndex: "monthlyRent",
      key: "monthlyRent",
      align: "center" as const,
      render: (value: string) => (
        <span style={{ fontWeight: 700, color: "#059669" }}>
          <MoneyDisplay amount={Number(value)} /> /شهر
        </span>
      ),
    },
    {
      title: "إجراءات",
      key: "actions",
      align: "center" as const,
      render: (_: any, record: Contract) => (
        <Space>
          {record.status === "draft" && (
            <Button size="small" type="primary" onClick={() => activateContract(record.id)}>
              تفعيل
            </Button>
          )}
          {record.status === "active" && (
            <Button size="small" danger onClick={() => terminateContract(record.id)}>
              إنهاء
            </Button>
          )}
        </Space>
      ),
    },
  ];

  if (loading) {
    return <LoadingSkeleton />;
  }

  const tabItems = [
    {
      key: "properties",
      label: (
        <span>
          <HomeOutlined /> العقارات
        </span>
      ),
      children: (
        <>
          {/* الفلاتر */}
          <Space style={{ marginBottom: 16 }}>
            <Select
              value={filter.status}
              onChange={(value) => setFilter({ ...filter, status: value })}
              style={{ width: 150 }}
              placeholder="كل الحالات"
              allowClear
            >
              <Select.Option value="">كل الحالات</Select.Option>
              {Object.entries(STATUS_CONFIG).map(([k, v]) => (
                <Select.Option key={k} value={k}>
                  {v.label}
                </Select.Option>
              ))}
            </Select>
            <Select
              value={filter.type}
              onChange={(value) => setFilter({ ...filter, type: value })}
              style={{ width: 150 }}
              placeholder="كل الأنواع"
              allowClear
            >
              <Select.Option value="">كل الأنواع</Select.Option>
              {Object.entries(TYPE_CONFIG).map(([k, v]) => (
                <Select.Option key={k} value={k}>
                  {v.icon} {v.label}
                </Select.Option>
              ))}
            </Select>
          </Space>

          {properties.length === 0 ? (
            <Card>
              <Empty
                image={<HomeOutlined style={{ fontSize: 64, color: "#d9d9d9" }} />}
                description="لا توجد عقارات"
              />
            </Card>
          ) : (
            <Row gutter={[16, 16]}>
              {properties.map((property) => {
                const status = STATUS_CONFIG[property.status] || STATUS_CONFIG.available;
                const type = TYPE_CONFIG[property.propertyType] || TYPE_CONFIG.commercial;
                return (
                  <Col xs={24} sm={12} lg={8} xl={6} key={property.id}>
                    <Card hoverable>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                        <span style={{ fontSize: "2rem" }}>{type.icon}</span>
                        <Tag color={status.color}>{status.label}</Tag>
                      </div>
                      <div style={{ fontSize: "0.75rem", color: "#9ca3af", fontFamily: "monospace", marginBottom: 4 }}>
                        {property.propertyNumber}
                      </div>
                      <h3 style={{ fontWeight: 600, margin: "0 0 4px" }}>{property.name}</h3>
                      <div style={{ fontSize: "0.85rem", color: "#6b7280", marginBottom: 8 }}>
                        {type.label}
                        {property.totalArea && <span> • {Number(property.totalArea).toLocaleString()} م²</span>}
                      </div>
                      <div style={{ fontSize: "0.85rem", color: "#4b5563", paddingTop: 8, borderTop: "1px solid #e5e7eb" }}>
                        <EnvironmentOutlined /> {property.address}
                      </div>
                    </Card>
                  </Col>
                );
              })}
            </Row>
          )}
        </>
      ),
    },
    {
      key: "contracts",
      label: (
        <span>
          <FileTextOutlined /> العقود
        </span>
      ),
      children:
        contracts.length === 0 ? (
          <Card>
            <Empty
              image={<FileTextOutlined style={{ fontSize: 64, color: "#d9d9d9" }} />}
              description="لا توجد عقود"
            />
          </Card>
        ) : (
          <Card>
            <Table
              columns={contractColumns}
              dataSource={contracts}
              rowKey="id"
              pagination={{ pageSize: 10 }}
            />
          </Card>
        ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="إدارة العقارات"
        subtitle="إدارة العقارات والوحدات والإيجارات"
        breadcrumbs={[
          { label: "الرئيسية", path: "/" },
          { label: "العقارات" },
        ]}
        icon={<HomeOutlined />}
        extra={
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setShowModal(true)}>
            عقار جديد
          </Button>
        }
      />

      {/* الإحصائيات */}
      {stats && (
        <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
          <Col xs={12} sm={8} lg={4}>
            <Card>
              <Statistic
                title="إجمالي العقارات"
                value={stats.totalProperties}
                prefix={<HomeOutlined />}
              />
            </Card>
          </Col>
          <Col xs={12} sm={8} lg={4}>
            <Card style={{ background: "#d1fae5" }}>
              <Statistic
                title="متاحة"
                value={stats.availableProperties}
                prefix={<CheckCircleOutlined />}
                valueStyle={{ color: "#059669" }}
              />
            </Card>
          </Col>
          <Col xs={12} sm={8} lg={4}>
            <Card style={{ background: "#dbeafe" }}>
              <Statistic
                title="مؤجرة"
                value={stats.occupiedProperties}
                prefix={<BankOutlined />}
                valueStyle={{ color: "#2563eb" }}
              />
            </Card>
          </Col>
          <Col xs={12} sm={8} lg={4}>
            <Card style={{ background: "#fef3c7" }}>
              <Statistic
                title="وحدات شاغرة"
                value={stats.vacantUnits}
                prefix={<AreaChartOutlined />}
                valueStyle={{ color: "#d97706" }}
              />
            </Card>
          </Col>
          <Col xs={12} sm={8} lg={4}>
            <Card style={{ background: "#ede9fe" }}>
              <Statistic
                title="عقود نشطة"
                value={stats.activeContracts}
                prefix={<FileTextOutlined />}
                valueStyle={{ color: "#7c3aed" }}
              />
            </Card>
          </Col>
          <Col xs={12} sm={8} lg={4}>
            <Card style={{ background: "#fee2e2" }}>
              <Statistic
                title="دفعات معلقة"
                value={stats.pendingPayments}
                prefix={<ExclamationCircleOutlined />}
                valueStyle={{ color: "#dc2626" }}
              />
            </Card>
          </Col>
        </Row>
      )}

      {/* التبويبات */}
      <Tabs activeKey={activeTab} onChange={setActiveTab} items={tabItems} />

      {/* موديل إضافة عقار */}
      <Modal
        title={
          <span>
            <HomeOutlined /> عقار جديد
          </span>
        }
        open={showModal}
        onCancel={() => setShowModal(false)}
        footer={null}
        width={500}
      >
        <Form form={form} layout="vertical" onFinish={handleCreate}>
          <Form.Item
            name="name"
            label="اسم العقار"
            rules={[{ required: true, message: "اسم العقار مطلوب" }]}
          >
            <Input />
          </Form.Item>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="propertyType" label="نوع العقار" initialValue="commercial">
                <Select>
                  {Object.entries(TYPE_CONFIG).map(([k, v]) => (
                    <Select.Option key={k} value={k}>
                      {v.icon} {v.label}
                    </Select.Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="totalArea" label="المساحة (م²)">
                <InputNumber style={{ width: "100%" }} min={0} />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item
            name="address"
            label="العنوان"
            rules={[{ required: true, message: "العنوان مطلوب" }]}
          >
            <Input />
          </Form.Item>
          <Form.Item>
            <Space>
              <Button onClick={() => setShowModal(false)}>إلغاء</Button>
              <Button type="primary" htmlType="submit">
                إضافة
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
