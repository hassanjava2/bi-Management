/**
 * صفحة تفاصيل الضمان
 */
import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Row,
  Col,
  Card,
  Descriptions,
  Button,
  Tag,
  Space,
  Statistic,
  Table,
  Timeline,
  Modal,
  Form,
  Input,
  Select,
  Alert,
  message,
} from "antd";
import {
  ArrowRightOutlined,
  SafetyCertificateOutlined,
  UserOutlined,
  CalendarOutlined,
  PlusOutlined,
  FileTextOutlined,
  HistoryOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
} from "@ant-design/icons";
import { PageHeader, StatusTag, DateDisplay, LoadingSkeleton } from "../components/shared";
import { API_BASE, getAuthHeaders } from "../utils/api";

const { TextArea } = Input;

interface Warranty {
  id: string;
  warrantyNumber: string;
  serialNumber: string | null;
  customerName: string | null;
  customerPhone: string | null;
  customerEmail: string | null;
  status: string;
  purchaseDate: string;
  startDate: string;
  endDate: string;
  claimsCount: number;
  notes: string | null;
  invoiceNumber: string | null;
  product: { id: string; nameAr: string; nameEn: string } | null;
  customer: { id: string; fullName: string; phone: string; email: string } | null;
  policy: { id: string; name: string; durationMonths: number } | null;
  claims: Claim[];
  activities: Activity[];
}

interface Claim {
  id: string;
  claimNumber: string;
  issueType: string;
  issueDescription: string;
  status: string;
  claimDate: string;
  completedAt: string | null;
}

interface Activity {
  id: string;
  activityType: string;
  description: string;
  createdAt: string;
  user: { fullName: string } | null;
}

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  active: { label: "ساري", color: "success" },
  expired: { label: "منتهي", color: "default" },
  voided: { label: "ملغي", color: "error" },
  claimed: { label: "مطالب", color: "warning" },
};

const CLAIM_STATUS: Record<string, { label: string; color: string }> = {
  pending: { label: "معلق", color: "warning" },
  approved: { label: "موافق", color: "processing" },
  rejected: { label: "مرفوض", color: "error" },
  in_repair: { label: "قيد الإصلاح", color: "purple" },
  completed: { label: "مكتمل", color: "success" },
  cancelled: { label: "ملغي", color: "default" },
};

const ISSUE_TYPES = [
  { value: "defect", label: "عيب مصنعي" },
  { value: "hardware", label: "مشكلة هاردوير" },
  { value: "software", label: "مشكلة سوفتوير" },
  { value: "damage", label: "تلف" },
  { value: "other", label: "أخرى" },
];

export default function WarrantyDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [warranty, setWarranty] = useState<Warranty | null>(null);
  const [loading, setLoading] = useState(true);
  const [showClaimForm, setShowClaimForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [claimForm] = Form.useForm();

  useEffect(() => {
    loadWarranty();
  }, [id]);

  const loadWarranty = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/warranties/${id}`);
      if (res.ok) {
        setWarranty(await res.json());
      } else {
        navigate("/warranties");
      }
    } catch (error) {
      console.error(error);
      message.error("فشل في تحميل بيانات الضمان");
    } finally {
      setLoading(false);
    }
  };

  const extendWarranty = async (months: number) => {
    if (!warranty) return;
    
    Modal.confirm({
      title: "تمديد الضمان",
      content: `هل تريد تمديد الضمان ${months} شهر؟`,
      okText: "نعم",
      cancelText: "إلغاء",
      onOk: async () => {
        try {
          const res = await fetch(`${API_BASE}/api/warranties/${warranty.id}/extend`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ months }),
          });
          if (res.ok) {
            message.success("تم تمديد الضمان بنجاح");
            loadWarranty();
          }
        } catch (error) {
          console.error(error);
          message.error("فشل في تمديد الضمان");
        }
      },
    });
  };

  const submitClaim = async () => {
    if (!warranty) return;
    
    const values = await claimForm.validateFields();
    setSubmitting(true);
    try {
      const res = await fetch(`${API_BASE}/api/warranties/claims`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ warrantyId: warranty.id, ...values }),
      });
      if (res.ok) {
        setShowClaimForm(false);
        claimForm.resetFields();
        message.success("تم تقديم المطالبة بنجاح");
        loadWarranty();
      }
    } catch (error) {
      console.error(error);
      message.error("فشل في تقديم المطالبة");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <LoadingSkeleton type="detail" />;
  }

  if (!warranty) {
    return (
      <div style={{ padding: "2rem", textAlign: "center" }}>
        الضمان غير موجود
      </div>
    );
  }

  const statusCfg = STATUS_CONFIG[warranty.status] || STATUS_CONFIG.active;
  const daysRemaining = Math.ceil((new Date(warranty.endDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  const isActive = warranty.status === "active" && daysRemaining > 0;

  const breadcrumbs = [
    { title: "الضمانات", path: "/warranties" },
    { title: warranty.warrantyNumber },
  ];

  const claimsColumns = [
    {
      title: "رقم المطالبة",
      dataIndex: "claimNumber",
      key: "claimNumber",
      render: (val: string) => <code>{val}</code>,
    },
    {
      title: "نوع المشكلة",
      dataIndex: "issueType",
      key: "issueType",
      render: (val: string) => ISSUE_TYPES.find((t) => t.value === val)?.label || val,
    },
    {
      title: "الوصف",
      dataIndex: "issueDescription",
      key: "issueDescription",
      ellipsis: true,
    },
    {
      title: "التاريخ",
      dataIndex: "claimDate",
      key: "claimDate",
      render: (val: string) => <DateDisplay date={val} />,
    },
    {
      title: "الحالة",
      dataIndex: "status",
      key: "status",
      render: (val: string) => {
        const cfg = CLAIM_STATUS[val] || CLAIM_STATUS.pending;
        return <Tag color={cfg.color}>{cfg.label}</Tag>;
      },
    },
  ];

  return (
    <div>
      <PageHeader
        title={warranty.warrantyNumber}
        breadcrumbs={breadcrumbs}
        extra={
          <Space>
            <Tag color={statusCfg.color}>{statusCfg.label}</Tag>
            {isActive && (
              <>
                <Button
                  type="primary"
                  icon={<FileTextOutlined />}
                  style={{ background: "#faad14", borderColor: "#faad14" }}
                  onClick={() => setShowClaimForm(true)}
                >
                  تقديم مطالبة
                </Button>
                <Button
                  type="primary"
                  icon={<CalendarOutlined />}
                  onClick={() => extendWarranty(6)}
                >
                  تمديد 6 شهور
                </Button>
              </>
            )}
          </Space>
        }
      />

      <Row gutter={[24, 24]}>
        {/* المحتوى */}
        <Col xs={24} lg={16}>
          <Space direction="vertical" style={{ width: "100%" }} size="middle">
            {/* معلومات الضمان */}
            <Card
              title={
                <Space>
                  <SafetyCertificateOutlined />
                  <span>معلومات الضمان</span>
                </Space>
              }
            >
              <Descriptions column={{ xs: 1, sm: 2 }} size="small">
                <Descriptions.Item label="المنتج">
                  {warranty.product?.nameAr || "-"}
                </Descriptions.Item>
                <Descriptions.Item label="السيريال">
                  <code>{warranty.serialNumber || "-"}</code>
                </Descriptions.Item>
                <Descriptions.Item label="تاريخ الشراء">
                  <DateDisplay date={warranty.purchaseDate} />
                </Descriptions.Item>
                <Descriptions.Item label="تاريخ البداية">
                  <DateDisplay date={warranty.startDate} />
                </Descriptions.Item>
                <Descriptions.Item label="تاريخ الانتهاء">
                  <DateDisplay date={warranty.endDate} />
                </Descriptions.Item>
                <Descriptions.Item label="المتبقي">
                  <Tag color={daysRemaining > 30 ? "success" : daysRemaining > 0 ? "warning" : "error"}>
                    {daysRemaining > 0 ? `${daysRemaining} يوم` : "منتهي"}
                  </Tag>
                </Descriptions.Item>
                {warranty.policy && (
                  <Descriptions.Item label="السياسة">
                    {warranty.policy.name}
                  </Descriptions.Item>
                )}
                {warranty.invoiceNumber && (
                  <Descriptions.Item label="الفاتورة">
                    <code>{warranty.invoiceNumber}</code>
                  </Descriptions.Item>
                )}
              </Descriptions>
            </Card>

            {/* معلومات العميل */}
            <Card
              title={
                <Space>
                  <UserOutlined />
                  <span>معلومات العميل</span>
                </Space>
              }
            >
              <Descriptions column={{ xs: 1, sm: 2 }} size="small">
                <Descriptions.Item label="الاسم">
                  {warranty.customer?.fullName || warranty.customerName || "-"}
                </Descriptions.Item>
                <Descriptions.Item label="الهاتف">
                  {warranty.customer?.phone || warranty.customerPhone || "-"}
                </Descriptions.Item>
                <Descriptions.Item label="البريد">
                  {warranty.customer?.email || warranty.customerEmail || "-"}
                </Descriptions.Item>
              </Descriptions>
            </Card>

            {/* المطالبات */}
            <Card
              title={
                <Space>
                  <FileTextOutlined />
                  <span>المطالبات ({warranty.claims.length})</span>
                </Space>
              }
            >
              <Table
                columns={claimsColumns}
                dataSource={warranty.claims}
                rowKey="id"
                pagination={false}
                size="small"
                locale={{ emptyText: "لا توجد مطالبات" }}
              />
            </Card>
          </Space>
        </Col>

        {/* Sidebar */}
        <Col xs={24} lg={8}>
          <Space direction="vertical" style={{ width: "100%" }} size="middle">
            {/* حالة الضمان */}
            <Alert
              type={isActive ? "success" : "error"}
              icon={isActive ? <CheckCircleOutlined /> : <CloseCircleOutlined />}
              message={
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: "24px", marginBottom: "4px" }}>
                    {isActive ? "✅" : "❌"}
                  </div>
                  <div style={{ fontWeight: 600 }}>
                    {isActive ? "الضمان ساري" : "الضمان منتهي"}
                  </div>
                  {isActive && (
                    <div style={{ fontSize: "12px", marginTop: "4px" }}>
                      متبقي {daysRemaining} يوم
                    </div>
                  )}
                </div>
              }
              showIcon={false}
              style={{ textAlign: "center" }}
            />

            {/* إحصائيات */}
            <Card>
              <Row gutter={16}>
                <Col span={12}>
                  <Statistic
                    title="المطالبات"
                    value={warranty.claims.length}
                    valueStyle={{ color: "#1890ff" }}
                  />
                </Col>
                <Col span={12}>
                  <Statistic
                    title="الأيام المتبقية"
                    value={daysRemaining > 0 ? daysRemaining : 0}
                    valueStyle={{ color: daysRemaining > 30 ? "#52c41a" : daysRemaining > 0 ? "#faad14" : "#ff4d4f" }}
                  />
                </Col>
              </Row>
            </Card>

            {/* سجل النشاطات */}
            <Card
              title={
                <Space>
                  <HistoryOutlined />
                  <span>سجل النشاطات</span>
                </Space>
              }
              size="small"
            >
              {warranty.activities.length === 0 ? (
                <p style={{ color: "#8c8c8c", margin: 0 }}>لا توجد نشاطات</p>
              ) : (
                <Timeline
                  items={warranty.activities.map((act) => ({
                    children: (
                      <div>
                        <div>{act.description}</div>
                        <div style={{ fontSize: "12px", color: "#8c8c8c" }}>
                          {act.user?.fullName || "النظام"} •{" "}
                          <DateDisplay date={act.createdAt} showTime />
                        </div>
                      </div>
                    ),
                  }))}
                />
              )}
            </Card>
          </Space>
        </Col>
      </Row>

      {/* نموذج المطالبة */}
      <Modal
        title="تقديم مطالبة ضمان"
        open={showClaimForm}
        onOk={submitClaim}
        onCancel={() => setShowClaimForm(false)}
        okText="تقديم المطالبة"
        cancelText="إلغاء"
        confirmLoading={submitting}
      >
        <Form
          form={claimForm}
          layout="vertical"
          initialValues={{ issueType: "defect" }}
        >
          <Form.Item
            name="issueType"
            label="نوع المشكلة"
            rules={[{ required: true, message: "يرجى اختيار نوع المشكلة" }]}
          >
            <Select options={ISSUE_TYPES} />
          </Form.Item>
          <Form.Item
            name="issueDescription"
            label="وصف المشكلة"
            rules={[{ required: true, message: "يرجى إدخال وصف المشكلة" }]}
          >
            <TextArea rows={4} placeholder="اشرح المشكلة بالتفصيل..." />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
