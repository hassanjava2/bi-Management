/**
 * صفحة تفاصيل طلب الصيانة
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
  InputNumber,
  Select,
  Avatar,
  message,
  Divider,
} from "antd";
import {
  ArrowRightOutlined,
  ToolOutlined,
  UserOutlined,
  DollarOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  PlusOutlined,
  CarOutlined,
  SettingOutlined,
  HistoryOutlined,
  EditOutlined,
} from "@ant-design/icons";
import { PageHeader, StatusTag, MoneyDisplay, DateDisplay, LoadingSkeleton } from "../components/shared";
import { API_BASE, getAuthHeaders } from "../utils/api";

const { TextArea } = Input;

interface MaintenanceOrder {
  id: string;
  orderNumber: string;
  type: string;
  serialId: string;
  serialNumber: string;
  productId: string;
  productName: string;
  productModel: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  customerAddress: string;
  issueDescription: string;
  issueCategory: string;
  diagnosis: string;
  diagnosedAt: string;
  status: string;
  isWarranty: number;
  warrantyClaimId: string;
  estimatedCost: number;
  partsCost: number;
  laborCost: number;
  totalCost: number;
  paidAmount: number;
  paymentStatus: string;
  assignedTo: string;
  expectedCompletion: string;
  completedAt: string;
  deliveredAt: string;
  notes: string;
  createdAt: string;
}

interface Part {
  id: string;
  partName: string;
  partNumber: string;
  quantity: number;
  unitCost: number;
  totalCost: number;
  source: string;
  notes: string;
}

interface HistoryItem {
  id: string;
  action: string;
  actionDetails: string;
  oldStatus: string;
  newStatus: string;
  performedByName: string;
  performedAt: string;
  notes: string;
}

interface Technician {
  id: string;
  fullName: string;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; next?: string[] }> = {
  received: { label: "تم الاستلام", color: "default", next: ["diagnosing"] },
  diagnosing: { label: "قيد الفحص", color: "warning", next: ["waiting_approval"] },
  waiting_approval: { label: "بانتظار الموافقة", color: "orange", next: ["in_progress", "cancelled"] },
  waiting_parts: { label: "بانتظار قطع الغيار", color: "purple", next: ["in_progress"] },
  in_progress: { label: "قيد الإصلاح", color: "processing", next: ["completed", "waiting_parts"] },
  completed: { label: "مكتمل", color: "success", next: ["delivered"] },
  delivered: { label: "تم التسليم", color: "cyan" },
  cancelled: { label: "ملغي", color: "error" },
};

const ACTION_LABELS: Record<string, string> = {
  created: "إنشاء الطلب",
  diagnosed: "تشخيص المشكلة",
  approved: "موافقة العميل",
  rejected: "رفض العميل",
  assigned: "تعيين فني",
  part_added: "إضافة قطعة غيار",
  completed: "إكمال الصيانة",
  delivered: "تسليم للعميل",
};

export default function MaintenanceDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState<MaintenanceOrder | null>(null);
  const [parts, setParts] = useState<Part[]>([]);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [technician, setTechnician] = useState<Technician | null>(null);
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  // Modals
  const [showDiagnosisModal, setShowDiagnosisModal] = useState(false);
  const [showPartModal, setShowPartModal] = useState(false);
  const [showDeliverModal, setShowDeliverModal] = useState(false);

  // Forms
  const [diagnosisForm] = Form.useForm();
  const [partForm] = Form.useForm();
  const [deliverForm] = Form.useForm();

  useEffect(() => {
    fetchOrder();
    fetchTechnicians();
  }, [id]);

  async function fetchOrder() {
    try {
      const res = await fetch(`${API_BASE}/api/maintenance/${id}`, {
        headers: getAuthHeaders(),
      });
      const data = await res.json();

      if (!res.ok) {
        message.error(data.error || "الطلب غير موجود");
        navigate("/maintenance");
        return;
      }

      setOrder(data.order);
      setParts(data.parts || []);
      setHistory(data.history || []);
      setTechnician(data.technician);
      
      // Set form initial values
      diagnosisForm.setFieldsValue({
        diagnosis: data.order.diagnosis || "",
        estimatedCost: data.order.estimatedCost || 0,
        laborCost: data.order.laborCost || 0,
        expectedDays: 3,
      });
      deliverForm.setFieldsValue({
        paidAmount: (data.order.totalCost || 0) - (data.order.paidAmount || 0),
        paymentMethod: "cash",
      });
    } catch (err) {
      console.error(err);
      message.error("فشل في تحميل بيانات الطلب");
    } finally {
      setLoading(false);
    }
  }

  async function fetchTechnicians() {
    try {
      const res = await fetch(`${API_BASE}/api/maintenance/technicians`, {
        headers: getAuthHeaders(),
      });
      const data = await res.json();
      setTechnicians(data.technicians || []);
    } catch (err) {
      console.error(err);
    }
  }

  async function updateStatus(endpoint: string, body: object = {}) {
    setActionLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/maintenance/${id}/${endpoint}`, {
        method: "PATCH",
        headers: getAuthHeaders(),
        body: JSON.stringify(body),
      });

      if (res.ok) {
        message.success("تم تحديث الطلب بنجاح");
        fetchOrder();
      } else {
        const data = await res.json();
        message.error(data.error || "حدث خطأ");
      }
    } catch (err) {
      console.error(err);
      message.error("حدث خطأ");
    } finally {
      setActionLoading(false);
    }
  }

  async function assignTechnician(techId: string) {
    await updateStatus("assign", { technicianId: techId });
  }

  async function submitDiagnosis() {
    const values = await diagnosisForm.validateFields();
    await updateStatus("diagnosis", values);
    setShowDiagnosisModal(false);
  }

  async function approveOrder(approved: boolean) {
    await updateStatus("approve", { approved, reason: approved ? "" : "رفض العميل" });
  }

  async function addPart() {
    const values = await partForm.validateFields();
    setActionLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/maintenance/${id}/parts`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify(values),
      });

      if (res.ok) {
        setShowPartModal(false);
        partForm.resetFields();
        message.success("تم إضافة القطعة بنجاح");
        fetchOrder();
      } else {
        const data = await res.json();
        message.error(data.error || "حدث خطأ");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(false);
    }
  }

  async function completeOrder() {
    Modal.confirm({
      title: "إكمال الصيانة",
      content: "هل أنت متأكد من إكمال الصيانة؟",
      okText: "نعم",
      cancelText: "إلغاء",
      onOk: () => updateStatus("complete", { completionNotes: "" }),
    });
  }

  async function deliverOrder() {
    const values = await deliverForm.validateFields();
    await updateStatus("deliver", values);
    setShowDeliverModal(false);
  }

  if (loading) {
    return <LoadingSkeleton type="detail" />;
  }

  if (!order) return null;

  const statusConfig = STATUS_CONFIG[order.status] || { label: order.status, color: "default" };

  const breadcrumbs = [
    { title: "الصيانة", path: "/maintenance" },
    { title: order.orderNumber },
  ];

  const partsColumns = [
    {
      title: "القطعة",
      dataIndex: "partName",
      key: "partName",
    },
    {
      title: "الكمية",
      dataIndex: "quantity",
      key: "quantity",
      width: 80,
    },
    {
      title: "سعر الوحدة",
      dataIndex: "unitCost",
      key: "unitCost",
      render: (val: number) => <MoneyDisplay amount={val} />,
    },
    {
      title: "الإجمالي",
      dataIndex: "totalCost",
      key: "totalCost",
      render: (val: number) => <MoneyDisplay amount={val} />,
    },
  ];

  return (
    <div>
      <PageHeader
        title={order.orderNumber}
        subtitle={order.customerName || "صيانة داخلية"}
        breadcrumbs={breadcrumbs}
        extra={
          <Space>
            {!["completed", "delivered", "cancelled"].includes(order.status) && (
              <Button
                icon={<EditOutlined />}
                onClick={() => navigate(`/maintenance/${id}/edit`)}
              >
                تعديل
              </Button>
            )}
            <Tag color={statusConfig.color}>{statusConfig.label}</Tag>
          </Space>
        }
      />

      <Row gutter={[24, 24]}>
        {/* Left Column - Details */}
        <Col xs={24} lg={16}>
          <Space direction="vertical" style={{ width: "100%" }} size="middle">
            {/* Device & Customer Info */}
            <Card
              title={
                <Space>
                  <SettingOutlined />
                  <span>معلومات الطلب</span>
                </Space>
              }
            >
              <Descriptions column={{ xs: 1, sm: 2 }} size="small">
                <Descriptions.Item label="الجهاز">
                  {order.productName || "-"}
                </Descriptions.Item>
                <Descriptions.Item label="السيريال">
                  <code>{order.serialNumber || "-"}</code>
                </Descriptions.Item>
                <Descriptions.Item label="العميل">
                  {order.customerName || "-"}
                </Descriptions.Item>
                <Descriptions.Item label="الهاتف">
                  <code>{order.customerPhone || "-"}</code>
                </Descriptions.Item>
                <Descriptions.Item label="العنوان" span={2}>
                  {order.customerAddress || "-"}
                </Descriptions.Item>
              </Descriptions>
            </Card>

            {/* Issue */}
            <Card title="المشكلة">
              {order.issueCategory && (
                <Tag style={{ marginBottom: "8px" }}>{order.issueCategory}</Tag>
              )}
              <p style={{ margin: 0 }}>{order.issueDescription}</p>
            </Card>

            {/* Diagnosis */}
            <Card
              title="التشخيص"
              extra={
                order.status === "diagnosing" && (
                  <Button
                    type="primary"
                    size="small"
                    onClick={() => setShowDiagnosisModal(true)}
                  >
                    إضافة تشخيص
                  </Button>
                )
              }
            >
              {order.diagnosis ? (
                <div>
                  <p>{order.diagnosis}</p>
                  <p style={{ color: "#8c8c8c", fontSize: "12px" }}>
                    تم التشخيص: <DateDisplay date={order.diagnosedAt} showTime />
                  </p>
                </div>
              ) : (
                <p style={{ color: "#8c8c8c" }}>لم يتم التشخيص بعد</p>
              )}
            </Card>

            {/* Parts */}
            <Card
              title="قطع الغيار"
              extra={
                ["in_progress", "waiting_parts"].includes(order.status) && (
                  <Button
                    type="primary"
                    size="small"
                    icon={<PlusOutlined />}
                    onClick={() => setShowPartModal(true)}
                  >
                    إضافة قطعة
                  </Button>
                )
              }
            >
              <Table
                columns={partsColumns}
                dataSource={parts}
                rowKey="id"
                pagination={false}
                size="small"
                locale={{ emptyText: "لا توجد قطع غيار" }}
              />
            </Card>

            {/* History */}
            <Card
              title={
                <Space>
                  <HistoryOutlined />
                  <span>سجل الطلب</span>
                </Space>
              }
            >
              <Timeline
                items={history.map((item) => ({
                  children: (
                    <div>
                      <Space>
                        <span style={{ fontWeight: 500 }}>
                          {ACTION_LABELS[item.action] || item.action}
                        </span>
                        {item.actionDetails && (
                          <span style={{ color: "#8c8c8c" }}>- {item.actionDetails}</span>
                        )}
                      </Space>
                      <div style={{ fontSize: "12px", color: "#8c8c8c" }}>
                        {item.performedByName && `${item.performedByName} • `}
                        <DateDisplay date={item.performedAt} showTime />
                      </div>
                    </div>
                  ),
                }))}
              />
            </Card>
          </Space>
        </Col>

        {/* Right Column - Actions & Summary */}
        <Col xs={24} lg={8}>
          <Space direction="vertical" style={{ width: "100%" }} size="middle">
            {/* Cost Summary */}
            <Card
              title={
                <Space>
                  <DollarOutlined />
                  <span>التكاليف</span>
                </Space>
              }
            >
              <Space direction="vertical" style={{ width: "100%" }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "#8c8c8c" }}>قطع الغيار</span>
                  <MoneyDisplay amount={order.partsCost} />
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "#8c8c8c" }}>أجرة العمل</span>
                  <MoneyDisplay amount={order.laborCost} />
                </div>
                <Divider style={{ margin: "8px 0" }} />
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ fontWeight: 600 }}>الإجمالي</span>
                  <Statistic
                    value={order.totalCost || 0}
                    suffix="د.ع"
                    valueStyle={{ fontSize: "16px", fontWeight: 600 }}
                  />
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "#8c8c8c" }}>المدفوع</span>
                  <span style={{ color: "#52c41a" }}>
                    <MoneyDisplay amount={order.paidAmount} />
                  </span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "#8c8c8c" }}>المتبقي</span>
                  <span style={{ color: "#f5222d" }}>
                    <MoneyDisplay amount={(order.totalCost || 0) - (order.paidAmount || 0)} />
                  </span>
                </div>
              </Space>
            </Card>

            {/* Technician */}
            <Card
              title={
                <Space>
                  <ToolOutlined />
                  <span>الفني المسؤول</span>
                </Space>
              }
            >
              {technician ? (
                <Space>
                  <Avatar style={{ backgroundColor: "#1890ff" }}>
                    {technician.fullName.charAt(0)}
                  </Avatar>
                  <span style={{ fontWeight: 500 }}>{technician.fullName}</span>
                </Space>
              ) : (
                <div>
                  <p style={{ color: "#8c8c8c", marginBottom: "8px" }}>لم يتم تعيين فني</p>
                  <Select
                    placeholder="اختر فني..."
                    style={{ width: "100%" }}
                    onChange={assignTechnician}
                    options={technicians.map((tech) => ({
                      value: tech.id,
                      label: tech.fullName,
                    }))}
                  />
                </div>
              )}
            </Card>

            {/* Actions */}
            <Card title="الإجراءات">
              <Space direction="vertical" style={{ width: "100%" }}>
                {order.status === "received" && (
                  <Button
                    type="primary"
                    block
                    style={{ background: "#faad14" }}
                    loading={actionLoading}
                    onClick={() => updateStatus("diagnosis", { status: "diagnosing" })}
                  >
                    بدء الفحص
                  </Button>
                )}

                {order.status === "waiting_approval" && (
                  <>
                    <Button
                      type="primary"
                      block
                      icon={<CheckCircleOutlined />}
                      loading={actionLoading}
                      onClick={() => approveOrder(true)}
                    >
                      موافقة العميل
                    </Button>
                    <Button
                      danger
                      block
                      icon={<CloseCircleOutlined />}
                      loading={actionLoading}
                      onClick={() => approveOrder(false)}
                    >
                      رفض العميل
                    </Button>
                  </>
                )}

                {order.status === "in_progress" && (
                  <Button
                    type="primary"
                    block
                    icon={<CheckCircleOutlined />}
                    loading={actionLoading}
                    onClick={completeOrder}
                  >
                    إكمال الصيانة
                  </Button>
                )}

                {order.status === "completed" && (
                  <Button
                    type="primary"
                    block
                    icon={<CarOutlined />}
                    style={{ background: "#13c2c2" }}
                    loading={actionLoading}
                    onClick={() => setShowDeliverModal(true)}
                  >
                    تسليم للعميل
                  </Button>
                )}
              </Space>
            </Card>
          </Space>
        </Col>
      </Row>

      {/* Diagnosis Modal */}
      <Modal
        title="إضافة التشخيص"
        open={showDiagnosisModal}
        onOk={submitDiagnosis}
        onCancel={() => setShowDiagnosisModal(false)}
        okText="حفظ"
        cancelText="إلغاء"
        confirmLoading={actionLoading}
      >
        <Form form={diagnosisForm} layout="vertical">
          <Form.Item
            name="diagnosis"
            label="التشخيص"
            rules={[{ required: true, message: "يرجى إدخال التشخيص" }]}
          >
            <TextArea rows={3} />
          </Form.Item>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="estimatedCost" label="التكلفة المتوقعة">
                <InputNumber style={{ width: "100%" }} min={0} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="laborCost" label="أجرة العمل">
                <InputNumber style={{ width: "100%" }} min={0} />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="expectedDays" label="المدة المتوقعة (أيام)">
            <InputNumber style={{ width: "100%" }} min={1} />
          </Form.Item>
        </Form>
      </Modal>

      {/* Part Modal */}
      <Modal
        title="إضافة قطعة غيار"
        open={showPartModal}
        onOk={addPart}
        onCancel={() => setShowPartModal(false)}
        okText="إضافة"
        cancelText="إلغاء"
        confirmLoading={actionLoading}
      >
        <Form form={partForm} layout="vertical" initialValues={{ quantity: 1, unitCost: 0 }}>
          <Form.Item
            name="partName"
            label="اسم القطعة"
            rules={[{ required: true, message: "يرجى إدخال اسم القطعة" }]}
          >
            <Input />
          </Form.Item>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="quantity" label="الكمية">
                <InputNumber style={{ width: "100%" }} min={1} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="unitCost" label="سعر الوحدة">
                <InputNumber style={{ width: "100%" }} min={0} />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>

      {/* Deliver Modal */}
      <Modal
        title="تسليم للعميل"
        open={showDeliverModal}
        onOk={deliverOrder}
        onCancel={() => setShowDeliverModal(false)}
        okText="تأكيد التسليم"
        cancelText="إلغاء"
        confirmLoading={actionLoading}
      >
        <Card size="small" style={{ marginBottom: "16px", background: "#fafafa" }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
            <span>الإجمالي:</span>
            <strong><MoneyDisplay amount={order.totalCost} /></strong>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", color: "#52c41a" }}>
            <span>المدفوع مسبقاً:</span>
            <MoneyDisplay amount={order.paidAmount} />
          </div>
        </Card>
        <Form form={deliverForm} layout="vertical">
          <Form.Item name="paidAmount" label="المبلغ المدفوع الآن">
            <InputNumber style={{ width: "100%" }} min={0} />
          </Form.Item>
          <Form.Item name="paymentMethod" label="طريقة الدفع">
            <Select
              options={[
                { value: "cash", label: "نقدي" },
                { value: "card", label: "بطاقة" },
                { value: "transfer", label: "تحويل" },
              ]}
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
