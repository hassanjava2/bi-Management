/**
 * صفحة إدارة اللوائح والسياسات
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
  Empty,
  Modal,
  Form,
  Tabs,
  Typography,
} from "antd";
import type { TableColumnsType } from "antd";
import {
  PlusOutlined,
  FileTextOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  ExclamationCircleOutlined,
  StopOutlined,
  EyeOutlined,
  WarningOutlined,
} from "@ant-design/icons";
import { PageHeader, DateDisplay, LoadingSkeleton } from "../components/shared";
import { API_BASE, getAuthHeaders } from "../utils/api";

const { TextArea } = Input;
const { Text } = Typography;

interface Policy {
  id: string;
  policyNumber: string;
  title: string;
  description: string | null;
  policyType: string;
  category: string;
  scope: string;
  version: string;
  effectiveDate: string;
  status: string;
  priority: string;
  complianceLevel: string;
  viewCount: number;
  createdAt: string;
}

interface Stats {
  policies: {
    total: number;
    active: number;
    draft: number;
    pendingApproval: number;
    expired: number;
  };
  acknowledgments: number;
  changeRequests: {
    total: number;
    pending: number;
  };
  violations: {
    total: number;
    open: number;
  };
}

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  draft: { label: "مسودة", color: "default" },
  pending_approval: { label: "بانتظار الموافقة", color: "gold" },
  approved: { label: "معتمدة", color: "blue" },
  active: { label: "نشطة", color: "green" },
  suspended: { label: "موقوفة", color: "red" },
  expired: { label: "منتهية", color: "default" },
  archived: { label: "مؤرشفة", color: "default" },
};

const TYPE_LABELS: Record<string, string> = {
  policy: "سياسة",
  regulation: "لائحة",
  procedure: "إجراء",
  guideline: "دليل إرشادي",
  standard: "معيار",
  bylaw: "نظام داخلي",
};

const CATEGORY_LABELS: Record<string, string> = {
  general: "عامة",
  hr: "الموارد البشرية",
  finance: "المالية",
  operations: "العمليات",
  it: "تقنية المعلومات",
  safety: "السلامة",
  quality: "الجودة",
  compliance: "الامتثال",
  admin: "الإدارية",
};

const COMPLIANCE_CONFIG: Record<string, { label: string; color: string }> = {
  mandatory: { label: "إلزامية", color: "red" },
  recommended: { label: "موصى بها", color: "gold" },
  optional: { label: "اختيارية", color: "default" },
};

export default function PoliciesManagement() {
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [activeTab, setActiveTab] = useState<string>("policies");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterType, setFilterType] = useState("");
  const [filterCategory, setFilterCategory] = useState("");
  const [form] = Form.useForm();

  useEffect(() => {
    fetchData();
  }, [filterStatus, filterType, filterCategory]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [statsRes, policiesRes] = await Promise.all([
        fetch(`${API_BASE}/api/policies/stats`, { headers: getAuthHeaders() }),
        fetch(`${API_BASE}/api/policies?${filterStatus ? `status=${filterStatus}&` : ""}${filterType ? `type=${filterType}&` : ""}${filterCategory ? `category=${filterCategory}` : ""}`, { headers: getAuthHeaders() }),
      ]);

      if (statsRes.ok) setStats(await statsRes.json());
      if (policiesRes.ok) setPolicies(await policiesRes.json());
    } catch (error) {
      console.error("Error:", error);
      message.error("فشل في تحميل البيانات");
    }
    setLoading(false);
  };

  const createPolicy = async () => {
    try {
      const values = await form.validateFields();
      const res = await fetch(`${API_BASE}/api/policies`, {
        method: "POST",
        headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      if (res.ok) {
        message.success("تم إنشاء اللائحة بنجاح");
        setShowModal(false);
        form.resetFields();
        fetchData();
      } else {
        message.error("فشل في إنشاء اللائحة");
      }
    } catch (error) {
      console.error("Error:", error);
    }
  };

  const updatePolicyStatus = async (id: string, action: string) => {
    try {
      const res = await fetch(`${API_BASE}/api/policies/${id}/${action}`, {
        method: "PATCH",
        headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      if (res.ok) {
        message.success("تم تحديث الحالة بنجاح");
        fetchData();
      } else {
        message.error("فشل في تحديث الحالة");
      }
    } catch (error) {
      console.error("Error:", error);
      message.error("حدث خطأ");
    }
  };

  const openModal = () => {
    form.resetFields();
    form.setFieldsValue({
      policyType: "policy",
      category: "general",
      scope: "organization",
      priority: "medium",
      complianceLevel: "mandatory",
    });
    setShowModal(true);
  };

  const getActionButtons = (record: Policy) => {
    const buttons: React.ReactNode[] = [];

    if (record.status === "draft") {
      buttons.push(
        <Button
          key="submit"
          type="primary"
          size="small"
          style={{ backgroundColor: "#f59e0b" }}
          onClick={() => updatePolicyStatus(record.id, "submit")}
        >
          إرسال للموافقة
        </Button>
      );
    }
    if (record.status === "pending_approval") {
      buttons.push(
        <Button
          key="approve"
          type="primary"
          size="small"
          onClick={() => updatePolicyStatus(record.id, "approve")}
        >
          اعتماد
        </Button>
      );
    }
    if (record.status === "approved") {
      buttons.push(
        <Button
          key="activate"
          type="primary"
          size="small"
          onClick={() => updatePolicyStatus(record.id, "activate")}
        >
          تفعيل
        </Button>
      );
    }
    if (record.status === "active") {
      buttons.push(
        <Button
          key="suspend"
          danger
          size="small"
          onClick={() => updatePolicyStatus(record.id, "suspend")}
        >
          إيقاف
        </Button>
      );
    }

    return <Space>{buttons}</Space>;
  };

  const columns: TableColumnsType<Policy> = [
    {
      title: "رقم اللائحة",
      dataIndex: "policyNumber",
      key: "policyNumber",
      width: 130,
    },
    {
      title: "العنوان",
      dataIndex: "title",
      key: "title",
      render: (text, record) => (
        <Space direction="vertical" size={0}>
          <span style={{ fontWeight: 500 }}>{text}</span>
          <Space size={4}>
            <Tag>{TYPE_LABELS[record.policyType] || record.policyType}</Tag>
            <Tag>{CATEGORY_LABELS[record.category] || record.category}</Tag>
          </Space>
          {record.description && (
            <Text type="secondary" style={{ fontSize: 12 }}>
              {record.description.substring(0, 80)}{record.description.length > 80 ? "..." : ""}
            </Text>
          )}
        </Space>
      ),
    },
    {
      title: "الإصدار",
      dataIndex: "version",
      key: "version",
      width: 80,
      align: "center",
    },
    {
      title: "مستوى الامتثال",
      dataIndex: "complianceLevel",
      key: "complianceLevel",
      width: 120,
      render: (level) => {
        const config = COMPLIANCE_CONFIG[level] || { label: level, color: "default" };
        return <Tag color={config.color}>{config.label}</Tag>;
      },
    },
    {
      title: "الحالة",
      dataIndex: "status",
      key: "status",
      width: 130,
      render: (status) => {
        const config = STATUS_CONFIG[status] || { label: status, color: "default" };
        return <Tag color={config.color}>{config.label}</Tag>;
      },
    },
    {
      title: "تاريخ السريان",
      dataIndex: "effectiveDate",
      key: "effectiveDate",
      width: 120,
      render: (date) => <DateDisplay date={date} format="date" />,
    },
    {
      title: "المشاهدات",
      dataIndex: "viewCount",
      key: "viewCount",
      width: 90,
      align: "center",
      render: (count) => (
        <Space>
          <EyeOutlined />
          {count}
        </Space>
      ),
    },
    {
      title: "الإجراءات",
      key: "actions",
      width: 150,
      render: (_, record) => getActionButtons(record),
    },
  ];

  const statusOptions = [
    { value: "", label: "جميع الحالات" },
    { value: "draft", label: "مسودة" },
    { value: "pending_approval", label: "بانتظار الموافقة" },
    { value: "active", label: "نشطة" },
    { value: "suspended", label: "موقوفة" },
    { value: "archived", label: "مؤرشفة" },
  ];

  const typeOptions = [
    { value: "", label: "جميع الأنواع" },
    { value: "policy", label: "سياسة" },
    { value: "regulation", label: "لائحة" },
    { value: "procedure", label: "إجراء" },
    { value: "guideline", label: "دليل إرشادي" },
    { value: "standard", label: "معيار" },
  ];

  const categoryOptions = [
    { value: "", label: "جميع الفئات" },
    { value: "general", label: "عامة" },
    { value: "hr", label: "الموارد البشرية" },
    { value: "finance", label: "المالية" },
    { value: "operations", label: "العمليات" },
    { value: "it", label: "تقنية المعلومات" },
    { value: "safety", label: "السلامة" },
  ];

  if (loading && !stats) {
    return (
      <div>
        <PageHeader
          title="إدارة اللوائح والسياسات"
          subtitle="إدارة السياسات واللوائح والإجراءات التنظيمية"
          breadcrumbs={[{ title: "اللوائح" }, { title: "الإدارة" }]}
        />
        <LoadingSkeleton type="table" rows={6} />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="إدارة اللوائح والسياسات"
        subtitle="إدارة السياسات واللوائح والإجراءات التنظيمية"
        breadcrumbs={[{ title: "اللوائح" }, { title: "الإدارة" }]}
        extra={
          <Button type="primary" icon={<PlusOutlined />} onClick={openModal}>
            لائحة جديدة
          </Button>
        }
      />

      {/* الإحصائيات */}
      {stats && (
        <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
          <Col xs={12} sm={8} md={4}>
            <Card>
              <Statistic
                title="إجمالي اللوائح"
                value={stats.policies.total}
                prefix={<FileTextOutlined />}
                valueStyle={{ color: "#3b82f6" }}
              />
            </Card>
          </Col>
          <Col xs={12} sm={8} md={4}>
            <Card>
              <Statistic
                title="نشطة"
                value={stats.policies.active}
                prefix={<CheckCircleOutlined />}
                valueStyle={{ color: "#10b981" }}
              />
            </Card>
          </Col>
          <Col xs={12} sm={8} md={4}>
            <Card>
              <Statistic
                title="مسودة"
                value={stats.policies.draft}
                prefix={<FileTextOutlined />}
                valueStyle={{ color: "#6b7280" }}
              />
            </Card>
          </Col>
          <Col xs={12} sm={8} md={4}>
            <Card>
              <Statistic
                title="بانتظار الموافقة"
                value={stats.policies.pendingApproval}
                prefix={<ClockCircleOutlined />}
                valueStyle={{ color: "#f59e0b" }}
              />
            </Card>
          </Col>
          <Col xs={12} sm={8} md={4}>
            <Card>
              <Statistic
                title="إجمالي الإقرارات"
                value={stats.acknowledgments}
                prefix={<CheckCircleOutlined />}
                valueStyle={{ color: "#8b5cf6" }}
              />
            </Card>
          </Col>
          <Col xs={12} sm={8} md={4}>
            <Card>
              <Statistic
                title="مخالفات مفتوحة"
                value={stats.violations.open}
                prefix={<WarningOutlined />}
                valueStyle={{ color: "#ef4444" }}
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
              key: "policies",
              label: (
                <Space>
                  <FileTextOutlined />
                  اللوائح والسياسات
                </Space>
              ),
            },
            {
              key: "violations",
              label: (
                <Space>
                  <WarningOutlined />
                  المخالفات
                </Space>
              ),
            },
            {
              key: "requests",
              label: (
                <Space>
                  <ClockCircleOutlined />
                  طلبات التعديل
                </Space>
              ),
            },
          ]}
        />

        {activeTab === "policies" && (
          <>
            {/* الفلاتر */}
            <Space style={{ marginBottom: 16 }} wrap>
              <Select
                value={filterStatus}
                onChange={setFilterStatus}
                style={{ width: 160 }}
                options={statusOptions}
              />
              <Select
                value={filterType}
                onChange={setFilterType}
                style={{ width: 140 }}
                options={typeOptions}
              />
              <Select
                value={filterCategory}
                onChange={setFilterCategory}
                style={{ width: 160 }}
                options={categoryOptions}
              />
            </Space>

            <Table<Policy>
              columns={columns}
              dataSource={policies}
              rowKey="id"
              loading={loading}
              pagination={{ pageSize: 10 }}
              locale={{ emptyText: <Empty description="لا توجد لوائح" /> }}
              scroll={{ x: 1000 }}
            />
          </>
        )}

        {activeTab === "violations" && (
          <Empty description="قسم المخالفات - قيد التطوير" />
        )}

        {activeTab === "requests" && (
          <Empty description="قسم طلبات التعديل - قيد التطوير" />
        )}
      </Card>

      {/* Modal إضافة لائحة */}
      <Modal
        title="لائحة / سياسة جديدة"
        open={showModal}
        onCancel={() => setShowModal(false)}
        onOk={createPolicy}
        okText="حفظ"
        cancelText="إلغاء"
        width={800}
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="title"
            label="العنوان"
            rules={[{ required: true, message: "العنوان مطلوب" }]}
          >
            <Input />
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="policyType" label="النوع">
                <Select
                  options={[
                    { value: "policy", label: "سياسة" },
                    { value: "regulation", label: "لائحة" },
                    { value: "procedure", label: "إجراء" },
                    { value: "guideline", label: "دليل إرشادي" },
                    { value: "standard", label: "معيار" },
                    { value: "bylaw", label: "نظام داخلي" },
                  ]}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="category" label="الفئة">
                <Select
                  options={[
                    { value: "general", label: "عامة" },
                    { value: "hr", label: "الموارد البشرية" },
                    { value: "finance", label: "المالية" },
                    { value: "operations", label: "العمليات" },
                    { value: "it", label: "تقنية المعلومات" },
                    { value: "safety", label: "السلامة" },
                    { value: "quality", label: "الجودة" },
                    { value: "compliance", label: "الامتثال" },
                    { value: "admin", label: "الإدارية" },
                  ]}
                />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="scope" label="النطاق">
                <Select
                  options={[
                    { value: "organization", label: "المنظمة كاملة" },
                    { value: "department", label: "قسم محدد" },
                    { value: "branch", label: "فرع محدد" },
                    { value: "specific", label: "مجموعة محددة" },
                  ]}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="complianceLevel" label="مستوى الامتثال">
                <Select
                  options={[
                    { value: "mandatory", label: "إلزامية" },
                    { value: "recommended", label: "موصى بها" },
                    { value: "optional", label: "اختيارية" },
                  ]}
                />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={8}>
              <Form.Item
                name="effectiveDate"
                label="تاريخ السريان"
                rules={[{ required: true, message: "تاريخ السريان مطلوب" }]}
              >
                <Input type="date" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="expirationDate" label="تاريخ الانتهاء">
                <Input type="date" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="reviewDate" label="تاريخ المراجعة التالية">
                <Input type="date" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="description" label="الوصف">
            <TextArea rows={2} />
          </Form.Item>

          <Form.Item name="content" label="المحتوى">
            <TextArea rows={6} placeholder="يمكنك كتابة محتوى اللائحة هنا..." />
          </Form.Item>

          <Form.Item name="notes" label="ملاحظات">
            <TextArea rows={2} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
