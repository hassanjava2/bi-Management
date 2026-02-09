/**
 * مركز المراسلات الصادرة والواردة
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
  Descriptions,
} from "antd";
import type { TableColumnsType } from "antd";
import {
  PlusOutlined,
  SendOutlined,
  InboxOutlined,
  FileTextOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
} from "@ant-design/icons";
import { PageHeader, DateDisplay, LoadingSkeleton } from "../components/shared";
import { API_BASE, getAuthHeaders } from "../utils/api";

const { TextArea } = Input;

interface Correspondence {
  id: string;
  referenceNumber: string;
  subject: string;
  correspondenceType: string;
  category: string;
  priority: string;
  status: string;
  createdAt: string;
  // صادرة
  recipientName?: string;
  recipientOrganization?: string;
  issueDate?: string;
  sentDate?: string;
  // واردة
  senderName?: string;
  senderOrganization?: string;
  receivedDate?: string;
}

interface Stats {
  outgoing: {
    total: number;
    draft: number;
    sent: number;
    pending: number;
  };
  incoming: {
    total: number;
    received: number;
    inProgress: number;
    closed: number;
  };
}

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  draft: { label: "مسودة", color: "default" },
  pending_approval: { label: "بانتظار الموافقة", color: "gold" },
  approved: { label: "معتمدة", color: "green" },
  sent: { label: "مرسلة", color: "blue" },
  delivered: { label: "تم التسليم", color: "cyan" },
  received: { label: "واردة", color: "blue" },
  under_review: { label: "قيد المراجعة", color: "gold" },
  assigned: { label: "محالة", color: "purple" },
  in_progress: { label: "قيد المعالجة", color: "magenta" },
  responded: { label: "تم الرد", color: "green" },
  closed: { label: "مغلقة", color: "default" },
  archived: { label: "مؤرشفة", color: "default" },
};

const PRIORITY_CONFIG: Record<string, { label: string; color: string }> = {
  low: { label: "منخفضة", color: "default" },
  normal: { label: "عادية", color: "blue" },
  high: { label: "عالية", color: "gold" },
  urgent: { label: "عاجلة", color: "red" },
};

const TYPE_LABELS: Record<string, string> = {
  letter: "خطاب",
  memo: "مذكرة",
  circular: "تعميم",
  report: "تقرير",
  request: "طلب",
  decision: "قرار",
  contract: "عقد",
};

export default function CorrespondenceCenter() {
  const [outgoing, setOutgoing] = useState<Correspondence[]>([]);
  const [incoming, setIncoming] = useState<Correspondence[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<string>("outgoing");
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState<"outgoing" | "incoming">("outgoing");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterType, setFilterType] = useState("");
  const [form] = Form.useForm();

  useEffect(() => {
    fetchData();
  }, [activeTab, filterStatus, filterType]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [statsRes, dataRes] = await Promise.all([
        fetch(`${API_BASE}/api/correspondence/stats`, { headers: getAuthHeaders() }),
        fetch(`${API_BASE}/api/correspondence/${activeTab}?${filterStatus ? `status=${filterStatus}&` : ""}${filterType ? `type=${filterType}` : ""}`, { headers: getAuthHeaders() }),
      ]);

      if (statsRes.ok) setStats(await statsRes.json());
      if (dataRes.ok) {
        const data = await dataRes.json();
        if (activeTab === "outgoing") setOutgoing(data);
        else setIncoming(data);
      }
    } catch (error) {
      console.error("Error:", error);
      message.error("فشل في تحميل البيانات");
    }
    setLoading(false);
  };

  const createCorrespondence = async () => {
    try {
      const values = await form.validateFields();
      const endpoint = modalType === "outgoing" 
        ? `${API_BASE}/api/correspondence/outgoing` 
        : `${API_BASE}/api/correspondence/incoming`;

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });

      if (res.ok) {
        message.success("تم إنشاء المراسلة بنجاح");
        setShowModal(false);
        form.resetFields();
        fetchData();
      } else {
        message.error("فشل في إنشاء المراسلة");
      }
    } catch (error) {
      console.error("Error:", error);
    }
  };

  const updateStatus = async (id: string, direction: "outgoing" | "incoming", action: string) => {
    try {
      const res = await fetch(`${API_BASE}/api/correspondence/${direction}/${id}/${action}`, {
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

  const openModal = (type: "outgoing" | "incoming") => {
    setModalType(type);
    form.resetFields();
    form.setFieldsValue({
      correspondenceType: "letter",
      category: "general",
      priority: "normal",
      deliveryMethod: "email",
    });
    setShowModal(true);
  };

  const getActionButtons = (record: Correspondence) => {
    const buttons: React.ReactNode[] = [];

    if (activeTab === "outgoing") {
      if (record.status === "draft") {
        buttons.push(
          <Button
            key="submit"
            type="primary"
            size="small"
            style={{ backgroundColor: "#f59e0b" }}
            onClick={() => updateStatus(record.id, "outgoing", "submit")}
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
            onClick={() => updateStatus(record.id, "outgoing", "approve")}
          >
            اعتماد
          </Button>
        );
      }
      if (record.status === "approved") {
        buttons.push(
          <Button
            key="send"
            type="primary"
            size="small"
            onClick={() => updateStatus(record.id, "outgoing", "send")}
          >
            إرسال
          </Button>
        );
      }
    } else {
      if (record.status === "received") {
        buttons.push(
          <Button
            key="assign"
            type="primary"
            size="small"
            style={{ backgroundColor: "#8b5cf6" }}
            onClick={() => updateStatus(record.id, "incoming", "assign")}
          >
            إحالة
          </Button>
        );
      }
      if (record.status === "assigned" || record.status === "in_progress") {
        buttons.push(
          <Button
            key="close"
            size="small"
            onClick={() => updateStatus(record.id, "incoming", "close")}
          >
            إغلاق
          </Button>
        );
      }
    }

    return <Space>{buttons}</Space>;
  };

  const columns: TableColumnsType<Correspondence> = [
    {
      title: "رقم المرجع",
      dataIndex: "referenceNumber",
      key: "referenceNumber",
      width: 140,
    },
    {
      title: "الموضوع",
      dataIndex: "subject",
      key: "subject",
      render: (text, record) => (
        <Space direction="vertical" size={0}>
          <span style={{ fontWeight: 500 }}>{text}</span>
          <Tag>{TYPE_LABELS[record.correspondenceType] || record.correspondenceType}</Tag>
        </Space>
      ),
    },
    {
      title: activeTab === "outgoing" ? "المستلم" : "المرسل",
      key: "contact",
      width: 180,
      render: (_, record) =>
        activeTab === "outgoing" ? (
          <Space direction="vertical" size={0}>
            <span>{record.recipientName || "-"}</span>
            {record.recipientOrganization && (
              <span style={{ fontSize: 12, color: "#6b7280" }}>{record.recipientOrganization}</span>
            )}
          </Space>
        ) : (
          <Space direction="vertical" size={0}>
            <span>{record.senderName || "-"}</span>
            {record.senderOrganization && (
              <span style={{ fontSize: 12, color: "#6b7280" }}>{record.senderOrganization}</span>
            )}
          </Space>
        ),
    },
    {
      title: "الأولوية",
      dataIndex: "priority",
      key: "priority",
      width: 100,
      render: (priority) => {
        const config = PRIORITY_CONFIG[priority] || { label: priority, color: "default" };
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
      title: "التاريخ",
      key: "date",
      width: 120,
      render: (_, record) => (
        <DateDisplay
          date={activeTab === "outgoing" ? record.issueDate : record.receivedDate}
          format="date"
        />
      ),
    },
    {
      title: "الإجراءات",
      key: "actions",
      width: 150,
      render: (_, record) => getActionButtons(record),
    },
  ];

  const currentList = activeTab === "outgoing" ? outgoing : incoming;

  const outgoingStatusOptions = [
    { value: "", label: "جميع الحالات" },
    { value: "draft", label: "مسودة" },
    { value: "pending_approval", label: "بانتظار الموافقة" },
    { value: "sent", label: "مرسلة" },
    { value: "archived", label: "مؤرشفة" },
  ];

  const incomingStatusOptions = [
    { value: "", label: "جميع الحالات" },
    { value: "received", label: "واردة" },
    { value: "assigned", label: "محالة" },
    { value: "in_progress", label: "قيد المعالجة" },
    { value: "closed", label: "مغلقة" },
  ];

  const typeOptions = [
    { value: "", label: "جميع الأنواع" },
    { value: "letter", label: "خطاب" },
    { value: "memo", label: "مذكرة" },
    { value: "circular", label: "تعميم" },
    { value: "report", label: "تقرير" },
    { value: "request", label: "طلب" },
  ];

  if (loading && !stats) {
    return (
      <div>
        <PageHeader
          title="مركز المراسلات"
          subtitle="إدارة المراسلات الصادرة والواردة"
          breadcrumbs={[{ title: "المراسلات" }, { title: "المركز" }]}
        />
        <LoadingSkeleton type="table" rows={6} />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="مركز المراسلات"
        subtitle="إدارة المراسلات الصادرة والواردة"
        breadcrumbs={[{ title: "المراسلات" }, { title: "المركز" }]}
        extra={
          <Space>
            <Button
              type="primary"
              icon={<SendOutlined />}
              onClick={() => openModal("outgoing")}
            >
              صادر جديد
            </Button>
            <Button
              type="primary"
              icon={<InboxOutlined />}
              style={{ backgroundColor: "#10b981" }}
              onClick={() => openModal("incoming")}
            >
              وارد جديد
            </Button>
          </Space>
        }
      />

      {/* الإحصائيات */}
      {stats && (
        <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
          <Col xs={12} sm={6}>
            <Card>
              <Statistic
                title="إجمالي الصادر"
                value={stats.outgoing.total}
                prefix={<SendOutlined />}
                valueStyle={{ color: "#3b82f6" }}
              />
              <div style={{ fontSize: 12, color: "#9ca3af", marginTop: 8 }}>
                مسودة: {stats.outgoing.draft} | مرسل: {stats.outgoing.sent}
              </div>
            </Card>
          </Col>
          <Col xs={12} sm={6}>
            <Card>
              <Statistic
                title="إجمالي الوارد"
                value={stats.incoming.total}
                prefix={<InboxOutlined />}
                valueStyle={{ color: "#10b981" }}
              />
              <div style={{ fontSize: 12, color: "#9ca3af", marginTop: 8 }}>
                قيد المعالجة: {stats.incoming.inProgress} | مغلق: {stats.incoming.closed}
              </div>
            </Card>
          </Col>
          <Col xs={12} sm={6}>
            <Card>
              <Statistic
                title="بانتظار الموافقة"
                value={stats.outgoing.pending}
                prefix={<ClockCircleOutlined />}
                valueStyle={{ color: "#f59e0b" }}
              />
            </Card>
          </Col>
          <Col xs={12} sm={6}>
            <Card>
              <Statistic
                title="الواردات الجديدة"
                value={stats.incoming.received}
                prefix={<ExclamationCircleOutlined />}
                valueStyle={{ color: "#8b5cf6" }}
              />
            </Card>
          </Col>
        </Row>
      )}

      {/* التبويبات والجدول */}
      <Card>
        <Tabs
          activeKey={activeTab}
          onChange={(key) => {
            setActiveTab(key);
            setFilterStatus("");
            setFilterType("");
          }}
          items={[
            {
              key: "outgoing",
              label: (
                <Space>
                  <SendOutlined />
                  المراسلات الصادرة
                </Space>
              ),
            },
            {
              key: "incoming",
              label: (
                <Space>
                  <InboxOutlined />
                  المراسلات الواردة
                </Space>
              ),
            },
          ]}
        />

        {/* الفلاتر */}
        <Space style={{ marginBottom: 16 }}>
          <Select
            value={filterStatus}
            onChange={setFilterStatus}
            style={{ width: 160 }}
            options={activeTab === "outgoing" ? outgoingStatusOptions : incomingStatusOptions}
          />
          <Select
            value={filterType}
            onChange={setFilterType}
            style={{ width: 140 }}
            options={typeOptions}
          />
        </Space>

        <Table<Correspondence>
          columns={columns}
          dataSource={currentList}
          rowKey="id"
          loading={loading}
          pagination={{ pageSize: 10 }}
          locale={{ emptyText: <Empty description="لا توجد مراسلات" /> }}
          scroll={{ x: 900 }}
        />
      </Card>

      {/* Modal إضافة مراسلة */}
      <Modal
        title={modalType === "outgoing" ? "مراسلة صادرة جديدة" : "تسجيل مراسلة واردة"}
        open={showModal}
        onCancel={() => setShowModal(false)}
        onOk={createCorrespondence}
        okText="حفظ"
        cancelText="إلغاء"
        width={700}
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="subject"
            label="الموضوع"
            rules={[{ required: true, message: "الموضوع مطلوب" }]}
          >
            <Input />
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="correspondenceType" label="نوع المراسلة">
                <Select
                  options={[
                    { value: "letter", label: "خطاب" },
                    { value: "memo", label: "مذكرة" },
                    { value: "circular", label: "تعميم" },
                    { value: "report", label: "تقرير" },
                    { value: "request", label: "طلب" },
                    { value: "decision", label: "قرار" },
                  ]}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="priority" label="الأولوية">
                <Select
                  options={[
                    { value: "low", label: "منخفضة" },
                    { value: "normal", label: "عادية" },
                    { value: "high", label: "عالية" },
                    { value: "urgent", label: "عاجلة" },
                  ]}
                />
              </Form.Item>
            </Col>
          </Row>

          {modalType === "outgoing" ? (
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item name="recipientName" label="اسم المستلم">
                  <Input />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="recipientOrganization" label="الجهة">
                  <Input />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="recipientEmail" label="البريد الإلكتروني">
                  <Input type="email" />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="issueDate" label="تاريخ الإصدار">
                  <Input type="date" />
                </Form.Item>
              </Col>
            </Row>
          ) : (
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  name="senderName"
                  label="اسم المرسل"
                  rules={[{ required: true, message: "اسم المرسل مطلوب" }]}
                >
                  <Input />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="senderOrganization" label="الجهة المرسلة">
                  <Input />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="senderEmail" label="البريد الإلكتروني">
                  <Input type="email" />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  name="receivedDate"
                  label="تاريخ الاستلام"
                  rules={[{ required: true, message: "تاريخ الاستلام مطلوب" }]}
                >
                  <Input type="date" />
                </Form.Item>
              </Col>
            </Row>
          )}

          <Form.Item name="content" label="المحتوى">
            <TextArea rows={4} />
          </Form.Item>

          <Form.Item name="notes" label="ملاحظات">
            <TextArea rows={2} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
