/**
 * صفحة تفاصيل المرتجع
 */
import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { Row, Col, Card, Descriptions, Tag, Space, Button, Table, Empty, message, Timeline, Alert, Modal, Form, Input, InputNumber, Select } from "antd";
import {
  ArrowLeftOutlined,
  SendOutlined,
  CheckCircleOutlined,
  BellOutlined,
  WarningOutlined,
  EditOutlined,
} from "@ant-design/icons";
import { PageHeader, DateDisplay, LoadingSkeleton, MoneyDisplay } from "../components/shared";
import { API_BASE, getAuthHeaders } from "../utils/api";

interface ReturnRequest {
  id: string;
  returnNumber: string;
  supplierId?: string;
  supplierName?: string;
  returnType: string;
  status: string;
  colorCode: string;
  totalItems: number;
  createdAt: string;
  sentAt?: string;
  receivedAt?: string;
  resolvedAt?: string;
  daysPending?: number;
  notes?: string;
  internalNotes?: string;
  shippingMethod?: string;
  trackingNumber?: string;
  shippingCost?: number;
  photosBefore?: string[];
  reminderCount?: number;
  lastReminderAt?: string;
}

interface ReturnItem {
  id: string;
  productId?: string;
  productName?: string;
  productModel?: string;
  serialId?: string;
  serialNumber?: string;
  quantity: number;
  returnReason?: string;
  reasonDetails?: string;
  itemStatus: string;
  resolution?: string;
  resolutionNotes?: string;
  resolvedAt?: string;
  replacementSerialNumber?: string;
  repairCost?: number;
}

interface HistoryEntry {
  id: string;
  eventType: string;
  fromStatus?: string;
  toStatus?: string;
  details?: string;
  performedAt: string;
  performedByName?: string;
}

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  pending: { label: "معلق", color: "gold" },
  sent: { label: "تم الإرسال", color: "blue" },
  received: { label: "تم الاستلام", color: "purple" },
  resolved: { label: "مُعالج", color: "green" },
  cancelled: { label: "ملغي", color: "default" },
};

const ITEM_STATUS_LABELS: Record<string, string> = {
  pending: "معلق",
  sent: "مُرسل",
  received: "مُستلم",
  repaired: "تم الإصلاح",
  replaced: "تم الاستبدال",
  rejected: "مرفوض",
  resolved: "مُعالج",
};

const RESOLUTION_LABELS: Record<string, string> = {
  repaired: "تم الإصلاح",
  replaced: "تم الاستبدال",
  refunded: "تم الاسترداد",
  rejected: "مرفوض",
};

const EVENT_LABELS: Record<string, string> = {
  created: "إنشاء المرتجع",
  sent: "إرسال للمورد",
  reminder_sent: "إرسال تذكير",
  received: "استلام من المورد",
  item_resolved: "معالجة عنصر",
  resolved: "اكتمال المعالجة",
  cancelled: "إلغاء",
  note_added: "إضافة ملاحظة",
};

export default function ReturnDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [returnData, setReturnData] = useState<ReturnRequest | null>(null);
  const [items, setItems] = useState<ReturnItem[]>([]);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Modals
  const [showSendModal, setShowSendModal] = useState(false);
  const [showResolveModal, setShowResolveModal] = useState(false);
  const [showReminderModal, setShowReminderModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState<ReturnItem | null>(null);

  // Forms
  const [sendForm] = Form.useForm();
  const [resolveForm] = Form.useForm();
  const [reminderForm] = Form.useForm();

  useEffect(() => {
    if (id) fetchData();
  }, [id]);

  const fetchData = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/returns/${id}`, {
        headers: getAuthHeaders(),
      });

      if (res.ok) {
        const data = await res.json();
        setReturnData(data.return);
        setItems(data.items || []);
        setHistory(data.history || []);
      } else {
        navigate("/returns");
      }
    } catch (error) {
      console.error("Error:", error);
      message.error("فشل تحميل البيانات");
    } finally {
      setLoading(false);
    }
  };

  const handleSend = async (values: { shippingMethod: string; trackingNumber: string; shippingCost: number }) => {
    setSubmitting(true);
    try {
      const res = await fetch(`${API_BASE}/api/returns/${id}/send`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify(values),
      });

      if (res.ok) {
        message.success("تم تسجيل الإرسال بنجاح");
        setShowSendModal(false);
        sendForm.resetFields();
        fetchData();
      } else {
        const data = await res.json();
        message.error(data.error || "فشل في تسجيل الإرسال");
      }
    } catch (error) {
      message.error("حدث خطأ");
    } finally {
      setSubmitting(false);
    }
  };

  const handleReceive = async () => {
    setSubmitting(true);
    try {
      const res = await fetch(`${API_BASE}/api/returns/${id}/receive`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({}),
      });

      if (res.ok) {
        message.success("تم تأكيد الاستلام");
        fetchData();
      } else {
        const data = await res.json();
        message.error(data.error || "فشل في تأكيد الاستلام");
      }
    } catch (error) {
      message.error("حدث خطأ");
    } finally {
      setSubmitting(false);
    }
  };

  const handleResolveItem = async (values: { resolution: string; resolutionNotes: string; replacementSerialNumber?: string; repairCost?: number }) => {
    if (!selectedItem) return;

    setSubmitting(true);
    try {
      const res = await fetch(`${API_BASE}/api/returns/items/${selectedItem.id}/resolve`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify(values),
      });

      if (res.ok) {
        message.success("تم معالجة العنصر");
        setShowResolveModal(false);
        setSelectedItem(null);
        resolveForm.resetFields();
        fetchData();
      } else {
        const data = await res.json();
        message.error(data.error || "فشل في معالجة العنصر");
      }
    } catch (error) {
      message.error("حدث خطأ");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSendReminder = async (values: { message: string }) => {
    setSubmitting(true);
    try {
      const res = await fetch(`${API_BASE}/api/returns/${id}/reminder`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          message: values.message,
          channel: "system",
        }),
      });

      if (res.ok) {
        message.success("تم إرسال التذكير");
        setShowReminderModal(false);
        reminderForm.resetFields();
        fetchData();
      } else {
        const data = await res.json();
        message.error(data.error || "فشل في إرسال التذكير");
      }
    } catch (error) {
      message.error("حدث خطأ");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <LoadingSkeleton type="form" rows={6} />;
  }

  if (!returnData) {
    return (
      <Card>
        <Empty description="المرتجع غير موجود">
          <Link to="/returns">
            <Button type="primary">العودة للقائمة</Button>
          </Link>
        </Empty>
      </Card>
    );
  }

  const canSend = returnData.status === "pending";
  const canReceive = returnData.status === "sent";
  const canResolveItems = returnData.status === "received";
  const statusCfg = STATUS_CONFIG[returnData.status] || STATUS_CONFIG.pending;

  const itemColumns = [
    {
      title: "المنتج",
      dataIndex: "productName",
      key: "productName",
      render: (name: string, record: ReturnItem) => (
        <div>
          <div style={{ fontWeight: 500 }}>{name}</div>
          {record.productModel && (
            <div style={{ fontSize: 12, color: "#6b7280" }}>{record.productModel}</div>
          )}
        </div>
      ),
    },
    {
      title: "السيريال",
      dataIndex: "serialNumber",
      key: "serialNumber",
      render: (serial: string, record: ReturnItem) => (
        <span style={{ fontFamily: "monospace", fontSize: 13 }}>
          {serial || `×${record.quantity}`}
        </span>
      ),
    },
    {
      title: "السبب",
      dataIndex: "returnReason",
      key: "returnReason",
      render: (reason: string, record: ReturnItem) => (
        <div>
          <div>{reason}</div>
          {record.reasonDetails && (
            <div style={{ fontSize: 12, color: "#6b7280" }}>{record.reasonDetails}</div>
          )}
        </div>
      ),
    },
    {
      title: "الحالة",
      dataIndex: "itemStatus",
      key: "itemStatus",
      render: (status: string) => (
        <Tag>{ITEM_STATUS_LABELS[status] || status}</Tag>
      ),
    },
    {
      title: "النتيجة",
      dataIndex: "resolution",
      key: "resolution",
      render: (resolution: string, record: ReturnItem) =>
        resolution ? (
          <div>
            <div style={{ fontWeight: 500 }}>{RESOLUTION_LABELS[resolution]}</div>
            {record.replacementSerialNumber && (
              <div style={{ fontSize: 12, color: "#6b7280" }}>
                بديل: {record.replacementSerialNumber}
              </div>
            )}
            {record.repairCost && (
              <div style={{ fontSize: 12, color: "#6b7280" }}>
                تكلفة: <MoneyDisplay amount={record.repairCost} size="small" />
              </div>
            )}
          </div>
        ) : (
          <span style={{ color: "#9ca3af" }}>-</span>
        ),
    },
    ...(canResolveItems
      ? [
          {
            title: "إجراء",
            key: "action",
            render: (_: unknown, record: ReturnItem) =>
              !record.resolution && (
                <Button
                  type="link"
                  size="small"
                  onClick={() => {
                    setSelectedItem(record);
                    setShowResolveModal(true);
                  }}
                >
                  معالجة
                </Button>
              ),
          },
        ]
      : []),
  ];

  return (
    <div>
      <PageHeader
        title={returnData.returnNumber}
        subtitle={returnData.supplierName}
        breadcrumbs={[
          { title: "المرتجعات", href: "/returns" },
          { title: "تفاصيل المرتجع" },
        ]}
        extra={
          <Space>
            <Button icon={<ArrowLeftOutlined />} onClick={() => navigate(-1)}>
              العودة
            </Button>
            {returnData.status === "pending" && (
              <Button icon={<EditOutlined />} onClick={() => navigate(`/returns/${id}/edit`)}>
                تعديل
              </Button>
            )}
            {canSend && (
              <Button type="primary" icon={<SendOutlined />} onClick={() => setShowSendModal(true)}>
                تسجيل الإرسال
              </Button>
            )}
            {canReceive && (
              <>
                <Button
                  icon={<BellOutlined />}
                  onClick={() => setShowReminderModal(true)}
                  style={{ background: "#fef3c7", borderColor: "#f59e0b", color: "#d97706" }}
                >
                  إرسال تذكير
                </Button>
                <Button
                  type="primary"
                  icon={<CheckCircleOutlined />}
                  onClick={handleReceive}
                  loading={submitting}
                  style={{ background: "#7c3aed" }}
                >
                  تأكيد الاستلام
                </Button>
              </>
            )}
          </Space>
        }
      />

      {/* Status Badge */}
      <Card style={{ marginBottom: 24 }}>
        <Space>
          <Tag color={statusCfg.color} style={{ fontSize: 14, padding: "4px 12px" }}>
            {statusCfg.label}
          </Tag>
        </Space>
      </Card>

      {/* Alert Banner */}
      {returnData.daysPending && returnData.daysPending > 7 && (
        <Alert
          message={
            <span>
              <WarningOutlined /> هذا المرتجع معلق منذ {returnData.daysPending} يوم
              {returnData.reminderCount ? ` - تم إرسال ${returnData.reminderCount} تذكير` : ""}
            </span>
          }
          type={returnData.daysPending > 30 ? "error" : returnData.daysPending > 14 ? "warning" : "info"}
          showIcon
          style={{ marginBottom: 24 }}
        />
      )}

      {/* Info Cards */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} md={8}>
          <Card title="التواريخ" size="small">
            <Descriptions column={1} size="small">
              <Descriptions.Item label="الإنشاء">
                <DateDisplay date={returnData.createdAt} format="datetime" />
              </Descriptions.Item>
              {returnData.sentAt && (
                <Descriptions.Item label="الإرسال">
                  <DateDisplay date={returnData.sentAt} format="datetime" />
                </Descriptions.Item>
              )}
              {returnData.receivedAt && (
                <Descriptions.Item label="الاستلام">
                  <DateDisplay date={returnData.receivedAt} format="datetime" />
                </Descriptions.Item>
              )}
              {returnData.resolvedAt && (
                <Descriptions.Item label="المعالجة">
                  <DateDisplay date={returnData.resolvedAt} format="datetime" />
                </Descriptions.Item>
              )}
            </Descriptions>
          </Card>
        </Col>
        <Col xs={24} md={8}>
          <Card title="معلومات الشحن" size="small">
            {returnData.shippingMethod ? (
              <Descriptions column={1} size="small">
                <Descriptions.Item label="الطريقة">{returnData.shippingMethod}</Descriptions.Item>
                {returnData.trackingNumber && (
                  <Descriptions.Item label="رقم التتبع">
                    <span style={{ fontFamily: "monospace" }}>{returnData.trackingNumber}</span>
                  </Descriptions.Item>
                )}
                {returnData.shippingCost && (
                  <Descriptions.Item label="تكلفة الشحن">
                    <MoneyDisplay amount={returnData.shippingCost} />
                  </Descriptions.Item>
                )}
              </Descriptions>
            ) : (
              <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="لم يتم الإرسال بعد" />
            )}
          </Card>
        </Col>
        <Col xs={24} md={8}>
          <Card title="ملاحظات" size="small">
            {returnData.notes || "لا توجد ملاحظات"}
          </Card>
        </Col>
      </Row>

      {/* Items */}
      <Card title={`العناصر (${items.length})`} style={{ marginBottom: 24 }}>
        <Table
          columns={itemColumns}
          dataSource={items}
          rowKey="id"
          pagination={false}
          size="small"
        />
      </Card>

      {/* History */}
      <Card title="سجل الحركات">
        <Timeline
          items={history.map((entry) => ({
            color: "blue",
            children: (
              <div>
                <div style={{ fontWeight: 500 }}>{EVENT_LABELS[entry.eventType] || entry.eventType}</div>
                {entry.details && <div style={{ color: "#6b7280" }}>{entry.details}</div>}
                <div style={{ fontSize: 12, color: "#9ca3af", marginTop: 4 }}>
                  <DateDisplay date={entry.performedAt} format="datetime" />
                  {entry.performedByName && ` - ${entry.performedByName}`}
                </div>
              </div>
            ),
          }))}
        />
      </Card>

      {/* Send Modal */}
      <Modal
        title="تسجيل إرسال المرتجع"
        open={showSendModal}
        onCancel={() => setShowSendModal(false)}
        footer={null}
      >
        <Form form={sendForm} layout="vertical" onFinish={handleSend}>
          <Form.Item label="طريقة الشحن" name="shippingMethod">
            <Input placeholder="مثال: شحن مباشر" />
          </Form.Item>
          <Form.Item label="رقم التتبع" name="trackingNumber">
            <Input />
          </Form.Item>
          <Form.Item label="تكلفة الشحن (د.ع)" name="shippingCost">
            <InputNumber style={{ width: "100%" }} />
          </Form.Item>
          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit" loading={submitting}>
                تسجيل الإرسال
              </Button>
              <Button onClick={() => setShowSendModal(false)}>إلغاء</Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* Resolve Item Modal */}
      <Modal
        title="معالجة العنصر"
        open={showResolveModal}
        onCancel={() => {
          setShowResolveModal(false);
          setSelectedItem(null);
        }}
        footer={null}
      >
        {selectedItem && (
          <>
            <div style={{ marginBottom: 16, color: "#6b7280" }}>
              {selectedItem.productName}
              {selectedItem.serialNumber && (
                <span style={{ fontFamily: "monospace", marginRight: 8 }}>
                  ({selectedItem.serialNumber})
                </span>
              )}
            </div>
            <Form form={resolveForm} layout="vertical" onFinish={handleResolveItem} initialValues={{ resolution: "repaired" }}>
              <Form.Item label="النتيجة" name="resolution" rules={[{ required: true }]}>
                <Select
                  options={[
                    { value: "repaired", label: "تم الإصلاح" },
                    { value: "replaced", label: "تم الاستبدال" },
                    { value: "refunded", label: "تم الاسترداد" },
                    { value: "rejected", label: "مرفوض" },
                  ]}
                />
              </Form.Item>
              <Form.Item noStyle shouldUpdate={(prev, curr) => prev.resolution !== curr.resolution}>
                {({ getFieldValue }) =>
                  getFieldValue("resolution") === "replaced" && (
                    <Form.Item label="سيريال البديل" name="replacementSerialNumber">
                      <Input />
                    </Form.Item>
                  )
                }
              </Form.Item>
              <Form.Item noStyle shouldUpdate={(prev, curr) => prev.resolution !== curr.resolution}>
                {({ getFieldValue }) =>
                  getFieldValue("resolution") === "repaired" && (
                    <Form.Item label="تكلفة الإصلاح (د.ع)" name="repairCost">
                      <InputNumber style={{ width: "100%" }} />
                    </Form.Item>
                  )
                }
              </Form.Item>
              <Form.Item label="ملاحظات" name="resolutionNotes">
                <Input.TextArea rows={3} />
              </Form.Item>
              <Form.Item>
                <Space>
                  <Button type="primary" htmlType="submit" loading={submitting} style={{ background: "#059669" }}>
                    تأكيد المعالجة
                  </Button>
                  <Button onClick={() => { setShowResolveModal(false); setSelectedItem(null); }}>
                    إلغاء
                  </Button>
                </Space>
              </Form.Item>
            </Form>
          </>
        )}
      </Modal>

      {/* Reminder Modal */}
      <Modal
        title="إرسال تذكير للمورد"
        open={showReminderModal}
        onCancel={() => setShowReminderModal(false)}
        footer={null}
      >
        <Form form={reminderForm} layout="vertical" onFinish={handleSendReminder}>
          <Form.Item label="نص الرسالة" name="message">
            <Input.TextArea rows={4} placeholder="نرجو متابعة المرتجع رقم..." />
          </Form.Item>
          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit" loading={submitting} style={{ background: "#f59e0b", borderColor: "#f59e0b" }}>
                إرسال التذكير
              </Button>
              <Button onClick={() => setShowReminderModal(false)}>إلغاء</Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
