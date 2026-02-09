/**
 * إدارة المركبات والأسطول
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
  Form,
  Modal,
  Tag,
  Space,
  message,
  Statistic,
  Empty,
  Tabs,
  DatePicker,
  InputNumber,
} from "antd";
import {
  PlusOutlined,
  CarOutlined,
  FileTextOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  ToolOutlined,
  StopOutlined,
  UserOutlined,
  WarningOutlined,
  EnvironmentOutlined,
  CalendarOutlined,
  DashboardOutlined,
} from "@ant-design/icons";
import { PageHeader, StatusTag, DateDisplay, LoadingSkeleton } from "../components/shared";
import { API_BASE, getAuthHeaders } from "../utils/api";
import type { ColumnsType } from "antd/es/table";

interface Vehicle {
  id: string;
  vehicleNumber: string;
  plateNumber: string;
  brand: string;
  model: string;
  year: number | null;
  vehicleType: string;
  fuelType: string;
  status: string;
  currentMileage: number;
}

interface VehicleRequest {
  id: string;
  requestNumber: string;
  purpose: string;
  destination: string | null;
  startDate: string;
  endDate: string;
  status: string;
}

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  available: { label: "متاحة", color: "success" },
  in_use: { label: "قيد الاستخدام", color: "processing" },
  maintenance: { label: "صيانة", color: "warning" },
  reserved: { label: "محجوزة", color: "purple" },
  retired: { label: "متوقفة", color: "error" },
};

const REQUEST_STATUS: Record<string, { label: string; color: string }> = {
  pending: { label: "معلق", color: "warning" },
  approved: { label: "موافق عليه", color: "success" },
  rejected: { label: "مرفوض", color: "error" },
  in_progress: { label: "جاري", color: "processing" },
  completed: { label: "مكتمل", color: "default" },
  cancelled: { label: "ملغي", color: "default" },
};

const VEHICLE_TYPE: Record<string, { label: string; icon: string }> = {
  sedan: { label: "سيدان", icon: "🚗" },
  suv: { label: "SUV", icon: "🚙" },
  pickup: { label: "بيك أب", icon: "🛻" },
  van: { label: "فان", icon: "🚐" },
  truck: { label: "شاحنة", icon: "🚚" },
  bus: { label: "باص", icon: "🚌" },
  motorcycle: { label: "دراجة نارية", icon: "🏍️" },
};

const FUEL_TYPE: Record<string, string> = {
  gasoline: "بنزين",
  diesel: "ديزل",
  electric: "كهربائي",
  hybrid: "هجين",
};

export default function FleetManagement() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [requests, setRequests] = useState<VehicleRequest[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<string>("vehicles");
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
        fetch(`${API_BASE}/api/fleet/stats`, { headers: getAuthHeaders() }),
      ]);
      if (statsRes.ok) setStats(await statsRes.json());

      if (activeTab === "vehicles") {
        const params = new URLSearchParams();
        if (filter.status) params.append("status", filter.status);
        if (filter.type) params.append("type", filter.type);
        const res = await fetch(`${API_BASE}/api/fleet/vehicles?${params}`, {
          headers: getAuthHeaders(),
        });
        if (res.ok) setVehicles(await res.json());
      } else {
        const res = await fetch(`${API_BASE}/api/fleet/requests`, {
          headers: getAuthHeaders(),
        });
        if (res.ok) setRequests(await res.json());
      }
    } catch (error) {
      console.error(error);
      message.error("حدث خطأ في تحميل البيانات");
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (values: any) => {
    try {
      const payload = {
        plateNumber: values.plateNumber,
        brand: values.brand,
        model: values.model,
        year: values.year,
        vehicleType: values.vehicleType,
        fuelType: values.fuelType,
        currentMileage: values.currentMileage,
      };
      const res = await fetch(`${API_BASE}/api/fleet/vehicles`, {
        method: "POST",
        headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        message.success("تمت إضافة المركبة بنجاح");
        setShowModal(false);
        form.resetFields();
        loadData();
      } else {
        message.error("فشل في إضافة المركبة");
      }
    } catch (error) {
      console.error(error);
      message.error("حدث خطأ");
    }
  };

  const approveRequest = async (id: string) => {
    try {
      await fetch(`${API_BASE}/api/fleet/requests/${id}/approve`, {
        method: "POST",
        headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ approverId: "current_user" }),
      });
      message.success("تمت الموافقة على الطلب");
      loadData();
    } catch (error) {
      console.error(error);
      message.error("حدث خطأ");
    }
  };

  const startTrip = async (id: string) => {
    Modal.confirm({
      title: "بدء الرحلة",
      content: (
        <Form layout="vertical">
          <Form.Item label="قراءة العداد الحالية">
            <InputNumber id="start-mileage" style={{ width: "100%" }} min={0} placeholder="أدخل قراءة العداد" />
          </Form.Item>
        </Form>
      ),
      okText: "بدء",
      cancelText: "إلغاء",
      onOk: async () => {
        const mileage = (document.getElementById("start-mileage") as HTMLInputElement)?.value;
        if (!mileage) {
          message.warning("يرجى إدخال قراءة العداد");
          return Promise.reject();
        }
        try {
          await fetch(`${API_BASE}/api/fleet/requests/${id}/start`, {
            method: "POST",
            headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
            body: JSON.stringify({ startMileage: parseInt(mileage) }),
          });
          message.success("تم بدء الرحلة");
          loadData();
        } catch (error) {
          console.error(error);
          message.error("حدث خطأ");
        }
      },
    });
  };

  const completeTrip = async (id: string) => {
    Modal.confirm({
      title: "إنهاء الرحلة",
      content: (
        <Form layout="vertical">
          <Form.Item label="قراءة العداد النهائية">
            <InputNumber id="end-mileage" style={{ width: "100%" }} min={0} placeholder="أدخل قراءة العداد النهائية" />
          </Form.Item>
        </Form>
      ),
      okText: "إنهاء",
      cancelText: "إلغاء",
      onOk: async () => {
        const mileage = (document.getElementById("end-mileage") as HTMLInputElement)?.value;
        if (!mileage) {
          message.warning("يرجى إدخال قراءة العداد");
          return Promise.reject();
        }
        try {
          await fetch(`${API_BASE}/api/fleet/requests/${id}/complete`, {
            method: "POST",
            headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
            body: JSON.stringify({ endMileage: parseInt(mileage) }),
          });
          message.success("تم إنهاء الرحلة");
          loadData();
        } catch (error) {
          console.error(error);
          message.error("حدث خطأ");
        }
      },
    });
  };

  const vehicleColumns: ColumnsType<Vehicle> = [
    {
      title: "المركبة",
      key: "vehicle",
      render: (_, record) => {
        const type = VEHICLE_TYPE[record.vehicleType] || VEHICLE_TYPE.sedan;
        return (
          <Space>
            <span style={{ fontSize: 24 }}>{type.icon}</span>
            <div>
              <div style={{ fontWeight: 600 }}>
                {record.brand} {record.model}
              </div>
              <div style={{ fontSize: 12, color: "#6b7280" }}>
                {record.year && `${record.year} • `}
                {type.label} • {FUEL_TYPE[record.fuelType]}
              </div>
            </div>
          </Space>
        );
      },
    },
    {
      title: "رقم اللوحة",
      dataIndex: "plateNumber",
      key: "plateNumber",
      width: 140,
      render: (text) => (
        <span style={{ fontWeight: 600, color: "#2563eb", fontFamily: "monospace" }}>
          {text}
        </span>
      ),
    },
    {
      title: "الحالة",
      dataIndex: "status",
      key: "status",
      width: 120,
      render: (status) => {
        const config = STATUS_CONFIG[status] || STATUS_CONFIG.available;
        return <Tag color={config.color}>{config.label}</Tag>;
      },
    },
    {
      title: "قراءة العداد",
      dataIndex: "currentMileage",
      key: "currentMileage",
      width: 140,
      render: (mileage) => (
        <Space>
          <DashboardOutlined />
          <span>{mileage?.toLocaleString()} كم</span>
        </Space>
      ),
    },
  ];

  const requestColumns: ColumnsType<VehicleRequest> = [
    {
      title: "رقم الطلب",
      dataIndex: "requestNumber",
      key: "requestNumber",
      width: 120,
      render: (text) => <span style={{ fontFamily: "monospace" }}>{text}</span>,
    },
    {
      title: "الغرض",
      dataIndex: "purpose",
      key: "purpose",
      render: (text, record) => (
        <div>
          <div style={{ fontWeight: 500 }}>{text}</div>
          <div style={{ fontSize: 12, color: "#6b7280" }}>
            {record.destination && (
              <Space>
                <EnvironmentOutlined />
                {record.destination}
              </Space>
            )}
          </div>
        </div>
      ),
    },
    {
      title: "الفترة",
      key: "period",
      width: 200,
      render: (_, record) => (
        <Space>
          <CalendarOutlined />
          <DateDisplay date={record.startDate} /> - <DateDisplay date={record.endDate} />
        </Space>
      ),
    },
    {
      title: "الحالة",
      dataIndex: "status",
      key: "status",
      width: 120,
      render: (status) => {
        const config = REQUEST_STATUS[status] || REQUEST_STATUS.pending;
        return <Tag color={config.color}>{config.label}</Tag>;
      },
    },
    {
      title: "الإجراءات",
      key: "actions",
      width: 180,
      render: (_, record) => (
        <Space size="small">
          {record.status === "pending" && (
            <Button type="link" size="small" onClick={() => approveRequest(record.id)}>
              موافقة
            </Button>
          )}
          {record.status === "approved" && (
            <Button type="link" size="small" onClick={() => startTrip(record.id)}>
              بدء الرحلة
            </Button>
          )}
          {record.status === "in_progress" && (
            <Button type="link" size="small" onClick={() => completeTrip(record.id)}>
              إنهاء
            </Button>
          )}
        </Space>
      ),
    },
  ];

  const breadcrumbs = [
    { title: "الرئيسية", path: "/" },
    { title: "إدارة الأسطول" },
  ];

  if (loading && !stats) {
    return <LoadingSkeleton />;
  }

  return (
    <div>
      <PageHeader
        title="إدارة الأسطول"
        subtitle="إدارة المركبات والطلبات والصيانة"
        breadcrumbs={breadcrumbs}
        icon={<CarOutlined />}
        extra={
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setShowModal(true)}>
            إضافة مركبة
          </Button>
        }
      />

      {/* الإحصائيات */}
      {stats && (
        <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
          <Col xs={12} sm={8} md={4} lg={3}>
            <Card size="small">
              <Statistic
                title="إجمالي المركبات"
                value={stats.totalVehicles}
                valueStyle={{ fontSize: 24 }}
                prefix={<CarOutlined />}
              />
            </Card>
          </Col>
          <Col xs={12} sm={8} md={4} lg={3}>
            <Card size="small" style={{ background: "#d1fae5" }}>
              <Statistic
                title="متاحة"
                value={stats.availableVehicles}
                valueStyle={{ fontSize: 24, color: "#059669" }}
                prefix={<CheckCircleOutlined />}
              />
            </Card>
          </Col>
          <Col xs={12} sm={8} md={4} lg={3}>
            <Card size="small" style={{ background: "#dbeafe" }}>
              <Statistic
                title="قيد الاستخدام"
                value={stats.inUseVehicles}
                valueStyle={{ fontSize: 24, color: "#2563eb" }}
                prefix={<CarOutlined />}
              />
            </Card>
          </Col>
          <Col xs={12} sm={8} md={4} lg={3}>
            <Card size="small" style={{ background: "#fef3c7" }}>
              <Statistic
                title="صيانة"
                value={stats.maintenanceVehicles}
                valueStyle={{ fontSize: 24, color: "#d97706" }}
                prefix={<ToolOutlined />}
              />
            </Card>
          </Col>
          <Col xs={12} sm={8} md={4} lg={3}>
            <Card size="small" style={{ background: "#ede9fe" }}>
              <Statistic
                title="طلبات معلقة"
                value={stats.pendingRequests}
                valueStyle={{ fontSize: 24, color: "#7c3aed" }}
                prefix={<ClockCircleOutlined />}
              />
            </Card>
          </Col>
          <Col xs={12} sm={8} md={4} lg={3}>
            <Card size="small" style={{ background: "#f3f4f6" }}>
              <Statistic
                title="سائقين نشطين"
                value={stats.activeDrivers}
                valueStyle={{ fontSize: 24, color: "#4b5563" }}
                prefix={<UserOutlined />}
              />
            </Card>
          </Col>
          <Col xs={12} sm={8} md={4} lg={3}>
            <Card size="small" style={{ background: "#fee2e2" }}>
              <Statistic
                title="مخالفات غير مدفوعة"
                value={stats.unpaidViolations}
                valueStyle={{ fontSize: 24, color: "#dc2626" }}
                prefix={<WarningOutlined />}
              />
            </Card>
          </Col>
        </Row>
      )}

      {/* التبويبات والمحتوى */}
      <Card>
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          items={[
            {
              key: "vehicles",
              label: (
                <span>
                  <CarOutlined /> المركبات
                </span>
              ),
              children: (
                <>
                  {/* الفلاتر */}
                  <Row gutter={16} style={{ marginBottom: 16 }}>
                    <Col xs={24} sm={12} md={6}>
                      <Select
                        style={{ width: "100%" }}
                        placeholder="كل الحالات"
                        allowClear
                        value={filter.status || undefined}
                        onChange={(value) => setFilter({ ...filter, status: value || "" })}
                        options={Object.entries(STATUS_CONFIG).map(([k, v]) => ({
                          value: k,
                          label: v.label,
                        }))}
                      />
                    </Col>
                    <Col xs={24} sm={12} md={6}>
                      <Select
                        style={{ width: "100%" }}
                        placeholder="كل الأنواع"
                        allowClear
                        value={filter.type || undefined}
                        onChange={(value) => setFilter({ ...filter, type: value || "" })}
                        options={Object.entries(VEHICLE_TYPE).map(([k, v]) => ({
                          value: k,
                          label: `${v.icon} ${v.label}`,
                        }))}
                      />
                    </Col>
                  </Row>

                  {vehicles.length === 0 ? (
                    <Empty
                      image={<CarOutlined style={{ fontSize: 64, color: "#d9d9d9" }} />}
                      description="لا توجد مركبات"
                    />
                  ) : (
                    <Table
                      dataSource={vehicles}
                      columns={vehicleColumns}
                      rowKey="id"
                      loading={loading}
                      pagination={{ pageSize: 10 }}
                    />
                  )}
                </>
              ),
            },
            {
              key: "requests",
              label: (
                <span>
                  <FileTextOutlined /> الطلبات
                </span>
              ),
              children: requests.length === 0 ? (
                <Empty
                  image={<FileTextOutlined style={{ fontSize: 64, color: "#d9d9d9" }} />}
                  description="لا توجد طلبات"
                />
              ) : (
                <Table
                  dataSource={requests}
                  columns={requestColumns}
                  rowKey="id"
                  loading={loading}
                  pagination={{ pageSize: 10 }}
                />
              ),
            },
          ]}
        />
      </Card>

      {/* موديل إضافة مركبة */}
      <Modal
        title="إضافة مركبة جديدة"
        open={showModal}
        onCancel={() => setShowModal(false)}
        footer={null}
        width={550}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleCreate}
          initialValues={{
            year: new Date().getFullYear(),
            vehicleType: "sedan",
            fuelType: "gasoline",
            currentMileage: 0,
          }}
        >
          <Form.Item
            name="plateNumber"
            label="رقم اللوحة"
            rules={[{ required: true, message: "رقم اللوحة مطلوب" }]}
          >
            <Input placeholder="مثال: 12345 أ ب ج" />
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="brand"
                label="الماركة"
                rules={[{ required: true, message: "الماركة مطلوبة" }]}
              >
                <Input placeholder="مثال: Toyota" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="model"
                label="الموديل"
                rules={[{ required: true, message: "الموديل مطلوب" }]}
              >
                <Input placeholder="مثال: Camry" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="year" label="سنة الصنع">
                <InputNumber style={{ width: "100%" }} min={1990} max={new Date().getFullYear() + 1} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="currentMileage" label="قراءة العداد (كم)">
                <InputNumber
                  style={{ width: "100%" }}
                  min={0}
                  formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")}
                  parser={(value) => value!.replace(/\$\s?|(,*)/g, "")}
                />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="vehicleType" label="نوع المركبة">
                <Select
                  options={Object.entries(VEHICLE_TYPE).map(([k, v]) => ({
                    value: k,
                    label: `${v.icon} ${v.label}`,
                  }))}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="fuelType" label="نوع الوقود">
                <Select
                  options={Object.entries(FUEL_TYPE).map(([k, v]) => ({
                    value: k,
                    label: v,
                  }))}
                />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item style={{ marginBottom: 0, marginTop: 24 }}>
            <Space style={{ width: "100%", justifyContent: "flex-end" }}>
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
