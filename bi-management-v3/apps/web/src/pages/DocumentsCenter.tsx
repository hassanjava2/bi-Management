/**
 * مركز إدارة المستندات
 */
import { useState, useEffect } from "react";
import {
  Row,
  Col,
  Card,
  List,
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
  Checkbox,
  Divider,
} from "antd";
import {
  FileOutlined,
  FilePdfOutlined,
  FileWordOutlined,
  FileExcelOutlined,
  FilePptOutlined,
  FileImageOutlined,
  PlusOutlined,
  SearchOutlined,
  EditOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  ClockCircleOutlined,
  InboxOutlined,
  DeleteOutlined,
  UserOutlined,
  MailOutlined,
} from "@ant-design/icons";
import { PageHeader, DateDisplay, LoadingSkeleton } from "../components/shared";
import { API_BASE, getAuthHeaders } from "../utils/api";

interface Document {
  id: string;
  documentNumber: string;
  title: string;
  description: string | null;
  documentType: string;
  status: string;
  requiresSignature: boolean;
  signatureStatus: string | null;
  fileType: string | null;
  createdAt: string;
  expiryDate: string | null;
}

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  draft: { label: "مسودة", color: "default" },
  pending_review: { label: "بانتظار المراجعة", color: "warning" },
  approved: { label: "معتمد", color: "success" },
  rejected: { label: "مرفوض", color: "error" },
  archived: { label: "مؤرشف", color: "default" },
};

const TYPE_CONFIG: Record<string, { label: string; icon: React.ReactNode }> = {
  contract: { label: "عقد", icon: <FileOutlined /> },
  policy: { label: "سياسة", icon: <FileOutlined /> },
  form: { label: "نموذج", icon: <EditOutlined /> },
  report: { label: "تقرير", icon: <FileOutlined /> },
  invoice: { label: "فاتورة", icon: <FileOutlined /> },
  general: { label: "عام", icon: <FileOutlined /> },
};

const FILE_ICONS: Record<string, React.ReactNode> = {
  pdf: <FilePdfOutlined style={{ fontSize: 32, color: "#dc2626" }} />,
  docx: <FileWordOutlined style={{ fontSize: 32, color: "#2563eb" }} />,
  xlsx: <FileExcelOutlined style={{ fontSize: 32, color: "#059669" }} />,
  pptx: <FilePptOutlined style={{ fontSize: 32, color: "#d97706" }} />,
  jpg: <FileImageOutlined style={{ fontSize: 32, color: "#8b5cf6" }} />,
  png: <FileImageOutlined style={{ fontSize: 32, color: "#8b5cf6" }} />,
};

export default function DocumentsCenter() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({ type: "", status: "", search: "" });
  const [showModal, setShowModal] = useState(false);
  const [form] = Form.useForm();
  const [signers, setSigners] = useState<{ name: string; email: string; role: string }[]>([]);
  const [requiresSignature, setRequiresSignature] = useState(false);

  useEffect(() => {
    loadData();
  }, [filter]);

  const loadData = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filter.type) params.append("type", filter.type);
      if (filter.status) params.append("status", filter.status);
      if (filter.search) params.append("search", filter.search);

      const [docsRes, statsRes] = await Promise.all([
        fetch(`${API_BASE}/api/documents?${params}`, { headers: getAuthHeaders() }),
        fetch(`${API_BASE}/api/documents/stats`, { headers: getAuthHeaders() }),
      ]);
      if (docsRes.ok) setDocuments((await docsRes.json()).documents || []);
      if (statsRes.ok) setStats(await statsRes.json());
    } catch (error) {
      console.error(error);
      message.error("فشل في تحميل المستندات");
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    try {
      const values = await form.validateFields();
      const payload = {
        ...values,
        requiresSignature,
        signers: requiresSignature ? signers : [],
      };

      const res = await fetch(`${API_BASE}/api/documents`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        message.success("تم إنشاء المستند بنجاح");
        setShowModal(false);
        form.resetFields();
        setSigners([]);
        setRequiresSignature(false);
        loadData();
      } else {
        message.error("فشل في إنشاء المستند");
      }
    } catch (error) {
      console.error(error);
    }
  };

  const updateStatus = async (id: string, status: string) => {
    try {
      await fetch(`${API_BASE}/api/documents/${id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      message.success("تم تحديث الحالة");
      loadData();
    } catch (error) {
      console.error(error);
      message.error("فشل في تحديث الحالة");
    }
  };

  const addSigner = () => {
    setSigners([...signers, { name: "", email: "", role: "approver" }]);
  };

  const updateSigner = (index: number, field: string, value: string) => {
    const updated = [...signers];
    (updated[index] as any)[field] = value;
    setSigners(updated);
  };

  const removeSigner = (index: number) => {
    setSigners(signers.filter((_, i) => i !== index));
  };

  const getFileIcon = (fileType: string | null) => {
    if (!fileType) return <FileOutlined style={{ fontSize: 32, color: "#6b7280" }} />;
    return FILE_ICONS[fileType] || <FileOutlined style={{ fontSize: 32, color: "#6b7280" }} />;
  };

  return (
    <div>
      <PageHeader
        title="مركز المستندات"
        subtitle="إدارة المستندات والتوقيعات الإلكترونية"
        breadcrumbs={[
          { label: "الرئيسية", path: "/" },
          { label: "مركز المستندات" },
        ]}
        extra={
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setShowModal(true)}>
            مستند جديد
          </Button>
        }
      />

      {/* الإحصائيات */}
      {stats && (
        <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
          <Col xs={12} sm={6}>
            <Card>
              <Statistic
                title="إجمالي المستندات"
                value={stats.total}
                prefix={<FileOutlined />}
              />
            </Card>
          </Col>
          <Col xs={12} sm={6}>
            <Card style={{ background: "#fffbe6", borderColor: "#ffe58f" }}>
              <Statistic
                title="بانتظار المراجعة"
                value={stats.pendingReview}
                valueStyle={{ color: "#d97706" }}
                prefix={<ClockCircleOutlined />}
              />
            </Card>
          </Col>
          <Col xs={12} sm={6}>
            <Card style={{ background: "#e6f7ff", borderColor: "#91d5ff" }}>
              <Statistic
                title="بانتظار التوقيع"
                value={stats.pendingSignature}
                valueStyle={{ color: "#2563eb" }}
                prefix={<EditOutlined />}
              />
            </Card>
          </Col>
          <Col xs={12} sm={6}>
            <Card style={{ background: "#fff1f0", borderColor: "#ffa39e" }}>
              <Statistic
                title="منتهية الصلاحية"
                value={stats.expired}
                valueStyle={{ color: "#dc2626" }}
                prefix={<CloseCircleOutlined />}
              />
            </Card>
          </Col>
        </Row>
      )}

      {/* الفلاتر */}
      <Card style={{ marginBottom: 16 }}>
        <Space wrap>
          <Input
            placeholder="بحث بالعنوان أو الرقم..."
            prefix={<SearchOutlined />}
            value={filter.search}
            onChange={(e) => setFilter({ ...filter, search: e.target.value })}
            style={{ width: 250 }}
            allowClear
          />
          <Select
            placeholder="نوع المستند"
            value={filter.type || undefined}
            onChange={(value) => setFilter({ ...filter, type: value || "" })}
            style={{ width: 150 }}
            allowClear
          >
            {Object.entries(TYPE_CONFIG).map(([k, v]) => (
              <Select.Option key={k} value={k}>
                <Space>
                  {v.icon}
                  {v.label}
                </Space>
              </Select.Option>
            ))}
          </Select>
          <Select
            placeholder="الحالة"
            value={filter.status || undefined}
            onChange={(value) => setFilter({ ...filter, status: value || "" })}
            style={{ width: 150 }}
            allowClear
          >
            {Object.entries(STATUS_CONFIG).map(([k, v]) => (
              <Select.Option key={k} value={k}>
                {v.label}
              </Select.Option>
            ))}
          </Select>
        </Space>
      </Card>

      {/* القائمة */}
      {loading ? (
        <LoadingSkeleton count={5} />
      ) : documents.length === 0 ? (
        <Card>
          <Empty
            image={<InboxOutlined style={{ fontSize: 64, color: "#d9d9d9" }} />}
            description="لا توجد مستندات"
          >
            <Button type="primary" onClick={() => setShowModal(true)}>
              إنشاء مستند جديد
            </Button>
          </Empty>
        </Card>
      ) : (
        <List
          dataSource={documents}
          renderItem={(doc) => {
            const status = STATUS_CONFIG[doc.status] || STATUS_CONFIG.draft;
            const type = TYPE_CONFIG[doc.documentType] || TYPE_CONFIG.general;
            const isExpired = doc.expiryDate && new Date(doc.expiryDate) < new Date();

            return (
              <Card style={{ marginBottom: 12 }} hoverable>
                <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                  {getFileIcon(doc.fileType)}
                  <div style={{ flex: 1 }}>
                    <Space style={{ marginBottom: 4 }}>
                      <span style={{ fontSize: 12, color: "#9ca3af", fontFamily: "monospace" }}>
                        {doc.documentNumber}
                      </span>
                      <Tag color={status.color}>{status.label}</Tag>
                      {doc.requiresSignature && (
                        <Tag color={doc.signatureStatus === "completed" ? "success" : "warning"}>
                          {doc.signatureStatus === "completed" ? "موقع" : "بانتظار التوقيع"}
                        </Tag>
                      )}
                    </Space>
                    <h3 style={{ margin: "4px 0", fontWeight: 600 }}>{doc.title}</h3>
                    <Space size="middle" style={{ fontSize: 13, color: "#6b7280" }}>
                      <span>
                        {type.icon} {type.label}
                      </span>
                      <DateDisplay date={doc.createdAt} />
                      {doc.expiryDate && (
                        <span style={{ color: isExpired ? "#dc2626" : "#6b7280" }}>
                          ينتهي: <DateDisplay date={doc.expiryDate} />
                        </span>
                      )}
                    </Space>
                  </div>
                  <Space>
                    {doc.status === "draft" && (
                      <Button
                        type="primary"
                        ghost
                        onClick={() => updateStatus(doc.id, "pending_review")}
                      >
                        إرسال للمراجعة
                      </Button>
                    )}
                    {doc.status === "pending_review" && (
                      <>
                        <Button
                          type="primary"
                          icon={<CheckCircleOutlined />}
                          onClick={() => updateStatus(doc.id, "approved")}
                        >
                          اعتماد
                        </Button>
                        <Button
                          danger
                          icon={<CloseCircleOutlined />}
                          onClick={() => updateStatus(doc.id, "rejected")}
                        >
                          رفض
                        </Button>
                      </>
                    )}
                  </Space>
                </div>
              </Card>
            );
          }}
        />
      )}

      {/* موديل إضافة */}
      <Modal
        title="مستند جديد"
        open={showModal}
        onOk={handleCreate}
        onCancel={() => {
          setShowModal(false);
          form.resetFields();
          setSigners([]);
          setRequiresSignature(false);
        }}
        okText="إنشاء"
        cancelText="إلغاء"
        width={600}
      >
        <Form form={form} layout="vertical" initialValues={{ documentType: "general" }}>
          <Form.Item
            name="title"
            label="العنوان"
            rules={[{ required: true, message: "العنوان مطلوب" }]}
          >
            <Input placeholder="أدخل عنوان المستند" />
          </Form.Item>

          <Form.Item name="description" label="الوصف">
            <Input.TextArea rows={3} placeholder="وصف المستند (اختياري)" />
          </Form.Item>

          <Form.Item name="documentType" label="نوع المستند">
            <Select>
              {Object.entries(TYPE_CONFIG).map(([k, v]) => (
                <Select.Option key={k} value={k}>
                  <Space>
                    {v.icon}
                    {v.label}
                  </Space>
                </Select.Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item>
            <Checkbox
              checked={requiresSignature}
              onChange={(e) => setRequiresSignature(e.target.checked)}
            >
              يتطلب توقيع إلكتروني
            </Checkbox>
          </Form.Item>

          {requiresSignature && (
            <Card
              size="small"
              title="الموقعون"
              extra={
                <Button type="link" size="small" icon={<PlusOutlined />} onClick={addSigner}>
                  إضافة موقع
                </Button>
              }
            >
              {signers.length === 0 ? (
                <Empty description="لم يتم إضافة موقعين" image={Empty.PRESENTED_IMAGE_SIMPLE} />
              ) : (
                signers.map((signer, i) => (
                  <div
                    key={i}
                    style={{ display: "flex", gap: 8, marginBottom: 8, alignItems: "center" }}
                  >
                    <Input
                      placeholder="الاسم"
                      prefix={<UserOutlined />}
                      value={signer.name}
                      onChange={(e) => updateSigner(i, "name", e.target.value)}
                      style={{ flex: 1 }}
                    />
                    <Input
                      placeholder="البريد الإلكتروني"
                      prefix={<MailOutlined />}
                      value={signer.email}
                      onChange={(e) => updateSigner(i, "email", e.target.value)}
                      style={{ flex: 1 }}
                    />
                    <Select
                      value={signer.role}
                      onChange={(value) => updateSigner(i, "role", value)}
                      style={{ width: 100 }}
                    >
                      <Select.Option value="approver">موافق</Select.Option>
                      <Select.Option value="reviewer">مراجع</Select.Option>
                      <Select.Option value="witness">شاهد</Select.Option>
                    </Select>
                    <Button
                      type="text"
                      danger
                      icon={<DeleteOutlined />}
                      onClick={() => removeSigner(i)}
                    />
                  </div>
                ))
              )}
            </Card>
          )}
        </Form>
      </Modal>
    </div>
  );
}
