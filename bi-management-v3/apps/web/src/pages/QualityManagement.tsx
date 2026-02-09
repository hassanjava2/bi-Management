/**
 * إدارة الجودة
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
  Avatar,
  Badge,
} from "antd";
import {
  PlusOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  ExclamationCircleOutlined,
  ClockCircleOutlined,
  FileSearchOutlined,
  SafetyCertificateOutlined,
  SyncOutlined,
  AimOutlined,
  AlertOutlined,
  AuditOutlined,
  PercentageOutlined,
  WarningOutlined,
  IssuesCloseOutlined,
} from "@ant-design/icons";
import { PageHeader, StatusTag, DateDisplay, LoadingSkeleton } from "../components/shared";
import { API_BASE, getAuthHeaders } from "../utils/api";
import type { ColumnsType } from "antd/es/table";

interface Inspection {
  id: string;
  inspectionNumber: string;
  inspectionType: string;
  targetType: string;
  status: string;
  result: string | null;
  score: number | null;
  scheduledAt: string;
  inspectedAt: string | null;
}

interface NonConformance {
  id: string;
  ncNumber: string;
  title: string;
  severity: string;
  status: string;
  detectedAt: string;
}

const RESULT_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  pass: { label: "ناجح", color: "success", icon: <CheckCircleOutlined /> },
  fail: { label: "فاشل", color: "error", icon: <CloseCircleOutlined /> },
  conditional: { label: "مشروط", color: "warning", icon: <ExclamationCircleOutlined /> },
};

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  scheduled: { label: "مجدول", color: "default" },
  in_progress: { label: "قيد التنفيذ", color: "processing" },
  completed: { label: "مكتمل", color: "success" },
  cancelled: { label: "ملغي", color: "error" },
};

const NC_STATUS: Record<string, { label: string; color: string }> = {
  open: { label: "مفتوح", color: "error" },
  investigating: { label: "قيد التحقيق", color: "warning" },
  action_required: { label: "يتطلب إجراء", color: "purple" },
  closed: { label: "مغلق", color: "success" },
};

const SEVERITY_CONFIG: Record<string, { label: string; color: string }> = {
  minor: { label: "بسيط", color: "default" },
  major: { label: "رئيسي", color: "warning" },
  critical: { label: "حرج", color: "error" },
};

const TYPE_CONFIG: Record<string, { label: string; icon: React.ReactNode }> = {
  routine: { label: "روتيني", icon: <SyncOutlined /> },
  random: { label: "عشوائي", icon: <AimOutlined /> },
  complaint: { label: "شكوى", icon: <AlertOutlined /> },
  audit: { label: "تدقيق", icon: <AuditOutlined /> },
};

const TARGET_TYPE_OPTIONS = [
  { value: "product", label: "منتج" },
  { value: "batch", label: "دفعة" },
  { value: "process", label: "عملية" },
  { value: "supplier", label: "مورد" },
];

export default function QualityManagement() {
  const [inspections, setInspections] = useState<Inspection[]>([]);
  const [nonConformances, setNonConformances] = useState<NonConformance[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<string>("inspections");
  const [showModal, setShowModal] = useState(false);
  const [form] = Form.useForm();

  useEffect(() => {
    loadData();
  }, [activeTab]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [statsRes] = await Promise.all([fetch(`${API_BASE}/api/quality/stats`)]);
      if (statsRes.ok) setStats(await statsRes.json());

      if (activeTab === "inspections") {
        const res = await fetch(`${API_BASE}/api/quality/inspections`);
        if (res.ok) setInspections((await res.json()).inspections || []);
      } else if (activeTab === "nc") {
        const res = await fetch(`${API_BASE}/api/quality/non-conformances`);
        if (res.ok) setNonConformances(await res.json());
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
        inspectionType: values.inspectionType,
        targetType: values.targetType,
        scheduledAt: values.scheduledAt?.format("YYYY-MM-DD"),
      };
      const res = await fetch(`${API_BASE}/api/quality/inspections`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        message.success("تم إنشاء الفحص بنجاح");
        setShowModal(false);
        form.resetFields();
        loadData();
      } else {
        message.error("فشل في إنشاء الفحص");
      }
    } catch (error) {
      console.error(error);
      message.error("حدث خطأ");
    }
  };

  const completeInspection = async (id: string) => {
    Modal.confirm({
      title: "إكمال الفحص",
      content: (
        <Form layout="vertical">
          <Form.Item label="النتيجة">
            <Select
              id="inspection-result"
              style={{ width: "100%" }}
              placeholder="اختر النتيجة"
              options={Object.entries(RESULT_CONFIG).map(([k, v]) => ({
                value: k,
                label: (
                  <Space>
                    {v.icon}
                    {v.label}
                  </Space>
                ),
              }))}
            />
          </Form.Item>
        </Form>
      ),
      okText: "إكمال",
      cancelText: "إلغاء",
      onOk: async () => {
        const resultSelect = document.querySelector("#inspection-result .ant-select-selection-item");
        const result = resultSelect?.getAttribute("title")?.toLowerCase();
        
        // Get value from select
        const selectElement = document.getElementById("inspection-result");
        const selectedValue = selectElement?.querySelector<HTMLInputElement>('input[type="search"]')?.value;
        
        if (!result && !selectedValue) {
          message.warning("يرجى اختيار النتيجة");
          return Promise.reject();
        }

        const finalResult = result || selectedValue || "pass";
        
        try {
          await fetch(`${API_BASE}/api/quality/inspections/${id}/complete`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ result: finalResult, createNC: finalResult === "fail" }),
          });
          message.success("تم إكمال الفحص");
          loadData();
        } catch (error) {
          console.error(error);
          message.error("حدث خطأ");
        }
      },
    });
  };

  const updateNCStatus = async (id: string, status: string) => {
    try {
      await fetch(`${API_BASE}/api/quality/non-conformances/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      message.success("تم تحديث الحالة");
      loadData();
    } catch (error) {
      console.error(error);
      message.error("حدث خطأ");
    }
  };

  const inspectionColumns: ColumnsType<Inspection> = [
    {
      title: "الفحص",
      key: "inspection",
      render: (_, record) => {
        const type = TYPE_CONFIG[record.inspectionType] || TYPE_CONFIG.routine;
        const result = record.result ? RESULT_CONFIG[record.result] : null;
        return (
          <Space>
            <Avatar
              style={{
                backgroundColor: result
                  ? result.color === "success"
                    ? "#d1fae5"
                    : result.color === "error"
                    ? "#fee2e2"
                    : "#fef3c7"
                  : "#f3f4f6",
                color: result
                  ? result.color === "success"
                    ? "#059669"
                    : result.color === "error"
                    ? "#dc2626"
                    : "#d97706"
                  : "#6b7280",
              }}
              icon={result ? result.icon : type.icon}
            />
            <div>
              <div style={{ fontWeight: 500 }}>
                {type.icon} فحص {type.label}
              </div>
              <div style={{ fontSize: 12, color: "#9ca3af", fontFamily: "monospace" }}>
                {record.inspectionNumber}
              </div>
            </div>
          </Space>
        );
      },
    },
    {
      title: "الحالة",
      dataIndex: "status",
      key: "status",
      width: 120,
      render: (status) => {
        const config = STATUS_CONFIG[status] || STATUS_CONFIG.scheduled;
        return <Tag color={config.color}>{config.label}</Tag>;
      },
    },
    {
      title: "النتيجة",
      dataIndex: "result",
      key: "result",
      width: 120,
      render: (result) => {
        if (!result) return <span style={{ color: "#9ca3af" }}>-</span>;
        const config = RESULT_CONFIG[result];
        return (
          <Tag color={config.color} icon={config.icon}>
            {config.label}
          </Tag>
        );
      },
    },
    {
      title: "التاريخ",
      key: "date",
      width: 160,
      render: (_, record) => (
        <div>
          {record.inspectedAt ? (
            <>
              <div>تم الفحص:</div>
              <DateDisplay date={record.inspectedAt} />
            </>
          ) : (
            <>
              <div style={{ color: "#6b7280" }}>مجدول:</div>
              <DateDisplay date={record.scheduledAt} />
            </>
          )}
        </div>
      ),
    },
    {
      title: "الدرجة",
      dataIndex: "score",
      key: "score",
      width: 100,
      render: (score) =>
        score ? (
          <span style={{ fontWeight: 600 }}>{score}%</span>
        ) : (
          <span style={{ color: "#9ca3af" }}>-</span>
        ),
    },
    {
      title: "الإجراءات",
      key: "actions",
      width: 140,
      render: (_, record) =>
        record.status === "scheduled" && (
          <Button type="primary" size="small" onClick={() => completeInspection(record.id)}>
            إكمال الفحص
          </Button>
        ),
    },
  ];

  const ncColumns: ColumnsType<NonConformance> = [
    {
      title: "رقم عدم المطابقة",
      dataIndex: "ncNumber",
      key: "ncNumber",
      width: 140,
      render: (text) => <span style={{ fontFamily: "monospace" }}>{text}</span>,
    },
    {
      title: "العنوان",
      dataIndex: "title",
      key: "title",
      render: (text, record) => (
        <div>
          <div style={{ fontWeight: 500 }}>{text}</div>
          <div style={{ fontSize: 12, color: "#6b7280" }}>
            تم الاكتشاف: <DateDisplay date={record.detectedAt} />
          </div>
        </div>
      ),
    },
    {
      title: "الخطورة",
      dataIndex: "severity",
      key: "severity",
      width: 100,
      render: (severity) => {
        const config = SEVERITY_CONFIG[severity] || SEVERITY_CONFIG.minor;
        return <Tag color={config.color}>{config.label}</Tag>;
      },
    },
    {
      title: "الحالة",
      dataIndex: "status",
      key: "status",
      width: 140,
      render: (status) => {
        const config = NC_STATUS[status] || NC_STATUS.open;
        return <Tag color={config.color}>{config.label}</Tag>;
      },
    },
    {
      title: "تغيير الحالة",
      key: "actions",
      width: 160,
      render: (_, record) => (
        <Select
          size="small"
          value={record.status}
          style={{ width: 140 }}
          onChange={(value) => updateNCStatus(record.id, value)}
          options={Object.entries(NC_STATUS).map(([k, v]) => ({
            value: k,
            label: v.label,
          }))}
        />
      ),
    },
  ];

  const breadcrumbs = [
    { title: "الرئيسية", path: "/" },
    { title: "إدارة الجودة" },
  ];

  if (loading && !stats) {
    return <LoadingSkeleton />;
  }

  return (
    <div>
      <PageHeader
        title="إدارة الجودة"
        subtitle="فحوصات الجودة وعدم المطابقة والإجراءات التصحيحية"
        breadcrumbs={breadcrumbs}
        icon={<SafetyCertificateOutlined />}
        extra={
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setShowModal(true)}>
            فحص جديد
          </Button>
        }
      />

      {/* الإحصائيات */}
      {stats && (
        <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
          <Col xs={12} sm={8} md={4}>
            <Card size="small">
              <Statistic
                title="الفحوصات"
                value={stats.totalInspections}
                valueStyle={{ fontSize: 24 }}
                prefix={<FileSearchOutlined />}
              />
            </Card>
          </Col>
          <Col xs={12} sm={8} md={4}>
            <Card size="small" style={{ background: "#d1fae5" }}>
              <Statistic
                title="ناجحة"
                value={stats.passedInspections}
                valueStyle={{ fontSize: 24, color: "#059669" }}
                prefix={<CheckCircleOutlined />}
              />
            </Card>
          </Col>
          <Col xs={12} sm={8} md={4}>
            <Card size="small" style={{ background: "#fee2e2" }}>
              <Statistic
                title="فاشلة"
                value={stats.failedInspections}
                valueStyle={{ fontSize: 24, color: "#dc2626" }}
                prefix={<CloseCircleOutlined />}
              />
            </Card>
          </Col>
          <Col xs={12} sm={8} md={4}>
            <Card size="small" style={{ background: "#f0fdf4" }}>
              <Statistic
                title="نسبة النجاح"
                value={stats.passRate}
                valueStyle={{ fontSize: 24, color: "#16a34a" }}
                suffix="%"
                prefix={<PercentageOutlined />}
              />
            </Card>
          </Col>
          <Col xs={12} sm={8} md={4}>
            <Card size="small" style={{ background: "#fef3c7" }}>
              <Statistic
                title="عدم مطابقة مفتوحة"
                value={stats.openNC}
                valueStyle={{ fontSize: 24, color: "#d97706" }}
                prefix={<WarningOutlined />}
              />
            </Card>
          </Col>
          <Col xs={12} sm={8} md={4}>
            <Card size="small" style={{ background: "#dbeafe" }}>
              <Statistic
                title="إجراءات معلقة"
                value={stats.pendingActions}
                valueStyle={{ fontSize: 24, color: "#2563eb" }}
                prefix={<IssuesCloseOutlined />}
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
              key: "inspections",
              label: (
                <span>
                  <FileSearchOutlined /> الفحوصات
                </span>
              ),
              children: inspections.length === 0 ? (
                <Empty
                  image={<FileSearchOutlined style={{ fontSize: 64, color: "#d9d9d9" }} />}
                  description="لا توجد فحوصات"
                />
              ) : (
                <Table
                  dataSource={inspections}
                  columns={inspectionColumns}
                  rowKey="id"
                  loading={loading}
                  pagination={{ pageSize: 10 }}
                />
              ),
            },
            {
              key: "nc",
              label: (
                <Badge count={stats?.openNC || 0} size="small" offset={[10, 0]}>
                  <span>
                    <WarningOutlined /> عدم المطابقة
                  </span>
                </Badge>
              ),
              children: nonConformances.length === 0 ? (
                <Empty
                  image={<CheckCircleOutlined style={{ fontSize: 64, color: "#52c41a" }} />}
                  description="لا توجد حالات عدم مطابقة"
                />
              ) : (
                <Table
                  dataSource={nonConformances}
                  columns={ncColumns}
                  rowKey="id"
                  loading={loading}
                  pagination={{ pageSize: 10 }}
                />
              ),
            },
          ]}
        />
      </Card>

      {/* موديل إضافة */}
      <Modal
        title="فحص جودة جديد"
        open={showModal}
        onCancel={() => setShowModal(false)}
        footer={null}
        width={480}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleCreate}
          initialValues={{
            inspectionType: "routine",
            targetType: "product",
          }}
        >
          <Form.Item name="inspectionType" label="نوع الفحص">
            <Select
              options={Object.entries(TYPE_CONFIG).map(([k, v]) => ({
                value: k,
                label: (
                  <Space>
                    {v.icon}
                    {v.label}
                  </Space>
                ),
              }))}
            />
          </Form.Item>

          <Form.Item name="targetType" label="الهدف">
            <Select options={TARGET_TYPE_OPTIONS} />
          </Form.Item>

          <Form.Item name="scheduledAt" label="تاريخ الفحص">
            <DatePicker style={{ width: "100%" }} placeholder="اختر التاريخ" />
          </Form.Item>

          <Form.Item style={{ marginBottom: 0, marginTop: 24 }}>
            <Space style={{ width: "100%", justifyContent: "flex-end" }}>
              <Button onClick={() => setShowModal(false)}>إلغاء</Button>
              <Button type="primary" htmlType="submit">
                إنشاء
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
