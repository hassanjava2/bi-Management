/**
 * صفحة الكاميرات
 * Cameras Management Page
 */
import { useState, useEffect } from "react";
import { Row, Col, Card, Statistic, Table, Tag, Space, Button, Modal, Form, Input, Select, message, Empty, Badge, Popconfirm } from "antd";
import {
  VideoCameraOutlined, PlusOutlined, PlayCircleOutlined,
  PauseCircleOutlined, DeleteOutlined, EditOutlined,
  EyeOutlined, AlertOutlined, EnvironmentOutlined,
  CheckCircleOutlined, CloseCircleOutlined, SyncOutlined,
} from "@ant-design/icons";
import { PageHeader, LoadingSkeleton } from "../components/shared";
import { API_BASE, getAuthHeaders } from "../utils/api";

interface Camera {
  id: string;
  name: string;
  rtspUrl: string;
  location: string;
  detectionTypes: string[];
  isActive: boolean;
  isAnalyzing: boolean;
  status: string;
  createdAt: string;
}

interface CameraStats {
  totalCameras: number;
  activeCameras: number;
  analyzingCameras: number;
  totalDetections: number;
  recentDetections: number;
  detectionsByType: Record<string, number>;
}

export default function CamerasPage() {
  const [cameras, setCameras] = useState<Camera[]>([]);
  const [stats, setStats] = useState<CameraStats | null>(null);
  const [detections, setDetections] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"cameras" | "detections">("cameras");
  const [form] = Form.useForm();

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [camerasRes, statsRes, detectionsRes] = await Promise.all([
        fetch(`${API_BASE}/api/cameras`, { headers: getAuthHeaders() }).then(r => r.ok ? r.json() : null).catch(() => null),
        fetch(`${API_BASE}/api/cameras/statistics`, { headers: getAuthHeaders() }).then(r => r.ok ? r.json() : null).catch(() => null),
        fetch(`${API_BASE}/api/cameras/detections/all?limit=50`, { headers: getAuthHeaders() }).then(r => r.ok ? r.json() : null).catch(() => null),
      ]);

      setCameras(camerasRes?.data || []);
      setStats(statsRes?.data || null);
      setDetections(detectionsRes?.data || []);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (values: any) => {
    try {
      const method = editingId ? "PUT" : "POST";
      const url = editingId ? `${API_BASE}/api/cameras/${editingId}` : `${API_BASE}/api/cameras`;

      const res = await fetch(url, {
        method,
        headers: getAuthHeaders(),
        body: JSON.stringify({
          name: values.name,
          rtsp_url: values.rtspUrl,
          location: values.location,
          detection_types: values.detectionTypes,
        }),
      });

      if (res.ok) {
        message.success(editingId ? "تم تحديث الكاميرا" : "تم إضافة الكاميرا");
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
      const res = await fetch(`${API_BASE}/api/cameras/${id}`, { method: "DELETE", headers: getAuthHeaders() });
      if (res.ok) {
        message.success("تم حذف الكاميرا");
        loadData();
      } else {
        message.error("فشل في الحذف");
      }
    } catch (error) {
      message.error("حدث خطأ");
    }
  };

  const toggleAnalysis = async (camera: Camera) => {
    const endpoint = camera.isAnalyzing ? "stop" : "start";
    try {
      const res = await fetch(`${API_BASE}/api/cameras/${camera.id}/${endpoint}`, {
        method: "POST",
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        message.success(camera.isAnalyzing ? "تم إيقاف التحليل" : "تم بدء التحليل");
        loadData();
      }
    } catch (error) {
      message.error("حدث خطأ");
    }
  };

  if (loading) return <LoadingSkeleton />;

  const getStatusConfig = (status: string) => {
    switch (status) {
      case "analyzing": return { color: "processing" as const, text: "يحلّل", icon: <SyncOutlined spin /> };
      case "connected": return { color: "success" as const, text: "متصل", icon: <CheckCircleOutlined /> };
      default: return { color: "error" as const, text: "غير متصل", icon: <CloseCircleOutlined /> };
    }
  };

  const columns = [
    {
      title: "الكاميرا", key: "camera",
      render: (_: any, record: Camera) => (
        <Space>
          <Badge status={record.status === "analyzing" ? "processing" : record.status === "connected" ? "success" : "error"} />
          <div>
            <div style={{ fontWeight: 500 }}>{record.name}</div>
            <div style={{ fontSize: 11, color: "#999" }}><EnvironmentOutlined /> {record.location || "غير محدد"}</div>
          </div>
        </Space>
      ),
    },
    {
      title: "الحالة", dataIndex: "status", key: "status",
      render: (s: string) => {
        const config = getStatusConfig(s);
        return <Tag color={config.color} icon={config.icon}>{config.text}</Tag>;
      },
    },
    {
      title: "أنواع الكشف", dataIndex: "detectionTypes", key: "types",
      render: (types: string[]) => (
        <Space wrap>
          {(types || []).map((t) => (
            <Tag key={t} color="blue">{t}</Tag>
          ))}
        </Space>
      ),
    },
    {
      title: "RTSP URL", dataIndex: "rtspUrl", key: "url",
      render: (url: string) => <span style={{ fontSize: 11, color: "#999", fontFamily: "monospace" }}>{url?.substring(0, 30)}...</span>,
    },
    {
      title: "إجراءات", key: "actions", width: 180,
      render: (_: any, record: Camera) => (
        <Space size="small">
          <Button
            type={record.isAnalyzing ? "default" : "primary"}
            size="small"
            icon={record.isAnalyzing ? <PauseCircleOutlined /> : <PlayCircleOutlined />}
            onClick={() => toggleAnalysis(record)}
          >
            {record.isAnalyzing ? "إيقاف" : "تشغيل"}
          </Button>
          <Button type="link" size="small" icon={<EditOutlined />} onClick={() => {
            setEditingId(record.id);
            form.setFieldsValue({
              name: record.name,
              rtspUrl: record.rtspUrl,
              location: record.location,
              detectionTypes: record.detectionTypes,
            });
            setShowModal(true);
          }} />
          <Popconfirm title="هل تريد حذف الكاميرا؟" onConfirm={() => handleDelete(record.id)} okText="نعم" cancelText="لا">
            <Button type="link" danger size="small" icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const detectionColumns = [
    { title: "الكاميرا", dataIndex: "cameraName", key: "camera" },
    {
      title: "نوع الكشف", dataIndex: "detectionType", key: "type",
      render: (t: string) => <Tag color="orange">{t}</Tag>,
    },
    {
      title: "الخطورة", dataIndex: "severity", key: "severity",
      render: (s: string) => (
        <Tag color={s === "critical" ? "red" : s === "high" ? "orange" : s === "medium" ? "gold" : "green"}>
          {s}
        </Tag>
      ),
    },
    { title: "الموقع", dataIndex: "location", key: "location" },
    {
      title: "التاريخ", dataIndex: "createdAt", key: "date",
      render: (d: string) => new Date(d).toLocaleString("ar-IQ"),
    },
    {
      title: "مهمة", dataIndex: "taskCreated", key: "task",
      render: (v: boolean) => v ? <Tag color="blue">تم إنشاء مهمة</Tag> : <Tag>لا</Tag>,
    },
  ];

  return (
    <div>
      <PageHeader
        title="إدارة الكاميرات"
        subtitle="مراقبة وتحليل الكاميرات المتصلة بالنظام"
        breadcrumbs={[
          { title: "الرئيسية", href: "/" },
          { title: "الكاميرات" },
        ]}
        extra={
          <Button type="primary" icon={<PlusOutlined />} onClick={() => { setEditingId(null); form.resetFields(); setShowModal(true); }}>
            إضافة كاميرا
          </Button>
        }
      />

      {/* الإحصائيات */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={12} sm={8} md={4}>
          <Card size="small" style={{ borderRadius: 12 }}>
            <Statistic title="إجمالي الكاميرات" value={stats?.totalCameras || 0} prefix={<VideoCameraOutlined />} valueStyle={{ color: "#1890ff" }} />
          </Card>
        </Col>
        <Col xs={12} sm={8} md={4}>
          <Card size="small" style={{ borderRadius: 12 }}>
            <Statistic title="متصلة" value={stats?.activeCameras || 0} prefix={<CheckCircleOutlined />} valueStyle={{ color: "#52c41a" }} />
          </Card>
        </Col>
        <Col xs={12} sm={8} md={4}>
          <Card size="small" style={{ borderRadius: 12 }}>
            <Statistic title="تحلّل الآن" value={stats?.analyzingCameras || 0} prefix={<SyncOutlined />} valueStyle={{ color: "#722ed1" }} />
          </Card>
        </Col>
        <Col xs={12} sm={8} md={4}>
          <Card size="small" style={{ borderRadius: 12 }}>
            <Statistic title="إجمالي الكشوفات" value={stats?.totalDetections || 0} prefix={<AlertOutlined />} />
          </Card>
        </Col>
        <Col xs={12} sm={8} md={4}>
          <Card size="small" style={{ borderRadius: 12 }}>
            <Statistic title="آخر 24 ساعة" value={stats?.recentDetections || 0} prefix={<EyeOutlined />} valueStyle={{ color: "#fa8c16" }} />
          </Card>
        </Col>
      </Row>

      {/* التبويبات */}
      <Card style={{ borderRadius: 12 }}>
        <Space style={{ marginBottom: 16 }}>
          <Button type={activeTab === "cameras" ? "primary" : "default"} icon={<VideoCameraOutlined />} onClick={() => setActiveTab("cameras")}>
            الكاميرات
          </Button>
          <Button type={activeTab === "detections" ? "primary" : "default"} icon={<AlertOutlined />} onClick={() => setActiveTab("detections")}>
            الكشوفات ({detections.length})
          </Button>
        </Space>

        {activeTab === "cameras" ? (
          cameras.length === 0 ? (
            <Empty description="لا توجد كاميرات" image={Empty.PRESENTED_IMAGE_SIMPLE}>
              <Button type="primary" icon={<PlusOutlined />} onClick={() => setShowModal(true)}>إضافة أول كاميرا</Button>
            </Empty>
          ) : (
            <Table dataSource={cameras} columns={columns} rowKey="id" size="small" />
          )
        ) : (
          detections.length === 0 ? (
            <Empty description="لا توجد كشوفات" image={Empty.PRESENTED_IMAGE_SIMPLE} />
          ) : (
            <Table dataSource={detections} columns={detectionColumns} rowKey="id" size="small" />
          )
        )}
      </Card>

      {/* نافذة إضافة/تعديل */}
      <Modal
        title={editingId ? "تعديل كاميرا" : "إضافة كاميرا جديدة"}
        open={showModal}
        onCancel={() => { setShowModal(false); setEditingId(null); }}
        footer={null}
        width={500}
      >
        <Form form={form} layout="vertical" onFinish={handleSave}>
          <Form.Item name="name" label="اسم الكاميرا" rules={[{ required: true, message: "يرجى إدخال الاسم" }]}>
            <Input placeholder="مثل: كاميرا المدخل الرئيسي" />
          </Form.Item>
          <Form.Item name="rtspUrl" label="RTSP URL" rules={[{ required: true, message: "يرجى إدخال رابط البث" }]}>
            <Input placeholder="rtsp://192.168.1.100:554/stream" dir="ltr" />
          </Form.Item>
          <Form.Item name="location" label="الموقع">
            <Input placeholder="المدخل الرئيسي / المخزن / ..." />
          </Form.Item>
          <Form.Item name="detectionTypes" label="أنواع الكشف">
            <Select mode="multiple" placeholder="اختر أنواع الكشف">
              <Select.Option value="motion">حركة</Select.Option>
              <Select.Option value="person">شخص</Select.Option>
              <Select.Option value="vehicle">مركبة</Select.Option>
              <Select.Option value="fire">حريق</Select.Option>
              <Select.Option value="intrusion">تسلل</Select.Option>
              <Select.Option value="device_tracking">تتبع أجهزة</Select.Option>
            </Select>
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
