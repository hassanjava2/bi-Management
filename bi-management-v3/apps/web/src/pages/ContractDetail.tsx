/**
 * صفحة تفاصيل العقد
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
  Progress,
  Tabs,
  Modal,
  Form,
  Input,
  DatePicker,
  InputNumber,
  message,
  Empty,
  Alert,
} from "antd";
import {
  EditOutlined,
  CheckCircleOutlined,
  PauseCircleOutlined,
  PlayCircleOutlined,
  CloseCircleOutlined,
  ReloadOutlined,
  ExclamationCircleOutlined,
} from "@ant-design/icons";
import { PageHeader, StatusTag, MoneyDisplay, DateDisplay, LoadingSkeleton } from "../components/shared";
import { API_BASE, getAuthHeaders } from "../utils/api";
import dayjs from "dayjs";

interface Contract {
  id: string;
  contractNumber: string;
  contractTypeName: string | null;
  customerName: string;
  customerPhone: string | null;
  customerEmail: string | null;
  customerAddress: string | null;
  startDate: string;
  endDate: string;
  status: string;
  totalValue: string;
  billingType: string;
  billingAmount: string | null;
  paidAmount: string;
  autoRenew: boolean;
  terms: string | null;
  specialConditions: string | null;
  responseTimeHours: number | null;
  resolutionTimeHours: number | null;
  notes: string | null;
  createdAt: string;
  items: Array<{ id: string; productName: string; serialNumber: string | null; location: string | null; coverageType: string }>;
  services: Array<{ id: string; serviceName: string; frequency: string | null; includedQuantity: number | null; usedQuantity: number }>;
  serviceLogs: Array<{ id: string; serviceType: string; description: string | null; serviceDate: string; status: string; technicianName: string | null }>;
  invoices: Array<{ id: string; invoiceNumber: string | null; amount: string; status: string; dueDate: string | null }>;
  activities: Array<{ id: string; activityType: string; description: string | null; createdAt: string }>;
}

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  draft: { label: "مسودة", color: "default" },
  pending_approval: { label: "بانتظار الموافقة", color: "warning" },
  active: { label: "نشط", color: "success" },
  suspended: { label: "معلق", color: "error" },
  expired: { label: "منتهي", color: "default" },
  terminated: { label: "ملغي", color: "error" },
  renewed: { label: "تم التجديد", color: "processing" },
};

const COVERAGE_CONFIG: Record<string, { label: string; color: string }> = {
  full: { label: "شامل", color: "success" },
  parts_only: { label: "قطع فقط", color: "warning" },
  labor_only: { label: "عمل فقط", color: "processing" },
};

const SERVICE_STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  completed: { label: "مكتمل", color: "success" },
  scheduled: { label: "مجدول", color: "processing" },
  in_progress: { label: "جاري", color: "warning" },
};

const INVOICE_STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  paid: { label: "مدفوعة", color: "success" },
  overdue: { label: "متأخرة", color: "error" },
  pending: { label: "معلقة", color: "warning" },
};

export default function ContractDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [contract, setContract] = useState<Contract | null>(null);
  const [loading, setLoading] = useState(true);
  const [showRenewModal, setShowRenewModal] = useState(false);
  const [renewForm] = Form.useForm();
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    loadContract();
  }, [id]);

  const loadContract = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/contracts/${id}`, { headers: getAuthHeaders() });
      if (res.ok) setContract(await res.json());
    } catch (error) {
      console.error(error);
      message.error("فشل في تحميل بيانات العقد");
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (status: string, reason?: string) => {
    if (status === "terminated") {
      Modal.confirm({
        title: "تأكيد إلغاء العقد",
        icon: <ExclamationCircleOutlined />,
        content: "هل أنت متأكد من إلغاء العقد؟ هذا الإجراء لا يمكن التراجع عنه.",
        okText: "نعم، إلغاء",
        okType: "danger",
        cancelText: "لا",
        onOk: () => performStatusUpdate(status, reason),
      });
      return;
    }
    performStatusUpdate(status, reason);
  };

  const performStatusUpdate = async (status: string, reason?: string) => {
    setUpdating(true);
    try {
      await fetch(`${API_BASE}/api/contracts/${id}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify({ status, reason }),
      });
      message.success("تم تحديث الحالة");
      loadContract();
    } catch (error) {
      console.error(error);
      message.error("فشل في تحديث الحالة");
    } finally {
      setUpdating(false);
    }
  };

  const handleRenew = async () => {
    try {
      const values = await renewForm.validateFields();
      setUpdating(true);
      const res = await fetch(`${API_BASE}/api/contracts/${id}/renew`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify({
          newEndDate: values.newEndDate.format("YYYY-MM-DD"),
          newTotalValue: values.newTotalValue,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        message.success("تم تجديد العقد");
        navigate(`/contracts/${data.newContractId}`);
      }
    } catch (error) {
      console.error(error);
      message.error("فشل في تجديد العقد");
    } finally {
      setUpdating(false);
      setShowRenewModal(false);
    }
  };

  if (loading) return <LoadingSkeleton />;
  if (!contract) return <Empty description="العقد غير موجود" />;

  const statusCfg = STATUS_CONFIG[contract.status] || STATUS_CONFIG.draft;
  const daysRemaining = Math.ceil((new Date(contract.endDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
  const paidPercentage = contract.totalValue ? (parseFloat(contract.paidAmount || "0") / parseFloat(contract.totalValue)) * 100 : 0;

  const getActionButtons = () => {
    const buttons: React.ReactNode[] = [];

    if (contract.status === "draft") {
      buttons.push(
        <Button key="activate" type="primary" icon={<CheckCircleOutlined />} onClick={() => updateStatus("active")} loading={updating}>
          تفعيل
        </Button>
      );
    }
    if (contract.status === "active") {
      buttons.push(
        <Button key="renew" icon={<ReloadOutlined />} onClick={() => setShowRenewModal(true)}>
          تجديد
        </Button>,
        <Button key="suspend" icon={<PauseCircleOutlined />} onClick={() => updateStatus("suspended")} loading={updating}>
          تعليق
        </Button>
      );
    }
    if (contract.status === "suspended") {
      buttons.push(
        <Button key="resume" type="primary" icon={<PlayCircleOutlined />} onClick={() => updateStatus("active")} loading={updating}>
          استئناف
        </Button>
      );
    }
    if (contract.status === "active" || contract.status === "suspended") {
      buttons.push(
        <Button key="terminate" danger icon={<CloseCircleOutlined />} onClick={() => updateStatus("terminated")} loading={updating}>
          إلغاء
        </Button>
      );
    }
    buttons.push(
      <Button key="edit" icon={<EditOutlined />} onClick={() => navigate(`/contracts/${id}/edit`)}>
        تعديل
      </Button>
    );

    return buttons;
  };

  // Table columns
  const itemsColumns = [
    { title: "الجهاز", dataIndex: "productName", key: "productName" },
    { title: "السيريال", dataIndex: "serialNumber", key: "serialNumber", align: "center" as const, render: (v: string) => v || "-" },
    { title: "الموقع", dataIndex: "location", key: "location", align: "center" as const, render: (v: string) => v || "-" },
    {
      title: "التغطية",
      dataIndex: "coverageType",
      key: "coverageType",
      align: "center" as const,
      render: (v: string) => {
        const cfg = COVERAGE_CONFIG[v] || COVERAGE_CONFIG.full;
        return <Tag color={cfg.color}>{cfg.label}</Tag>;
      },
    },
  ];

  const logsColumns = [
    { title: "التاريخ", dataIndex: "serviceDate", key: "serviceDate", render: (v: string) => <DateDisplay date={v} /> },
    { title: "الخدمة", dataIndex: "description", key: "description", render: (v: string, r: any) => v || r.serviceType },
    { title: "الفني", dataIndex: "technicianName", key: "technicianName", align: "center" as const, render: (v: string) => v || "-" },
    {
      title: "الحالة",
      dataIndex: "status",
      key: "status",
      align: "center" as const,
      render: (v: string) => {
        const cfg = SERVICE_STATUS_CONFIG[v] || SERVICE_STATUS_CONFIG.scheduled;
        return <Tag color={cfg.color}>{cfg.label}</Tag>;
      },
    },
  ];

  const invoicesColumns = [
    { title: "رقم الفاتورة", dataIndex: "invoiceNumber", key: "invoiceNumber", render: (v: string) => v || "-" },
    {
      title: "المبلغ",
      dataIndex: "amount",
      key: "amount",
      align: "center" as const,
      render: (v: string) => <MoneyDisplay amount={Number(v)} />,
    },
    { title: "تاريخ الاستحقاق", dataIndex: "dueDate", key: "dueDate", align: "center" as const, render: (v: string) => v ? <DateDisplay date={v} /> : "-" },
    {
      title: "الحالة",
      dataIndex: "status",
      key: "status",
      align: "center" as const,
      render: (v: string) => {
        const cfg = INVOICE_STATUS_CONFIG[v] || INVOICE_STATUS_CONFIG.pending;
        return <Tag color={cfg.color}>{cfg.label}</Tag>;
      },
    },
  ];

  const tabItems = [
    {
      key: "items",
      label: `الأجهزة (${contract.items.length})`,
      children: (
        <Table
          columns={itemsColumns}
          dataSource={contract.items}
          rowKey="id"
          pagination={false}
          locale={{ emptyText: "لا توجد أجهزة مسجلة" }}
        />
      ),
    },
    {
      key: "services",
      label: `الخدمات (${contract.services.length})`,
      children: contract.services.length === 0 ? (
        <Empty description="لا توجد خدمات مسجلة" />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {contract.services.map((svc) => (
            <Card key={svc.id} size="small">
              <div style={{ fontWeight: 600 }}>{svc.serviceName}</div>
              <Space style={{ marginTop: 8 }}>
                <span style={{ color: "#666" }}>التكرار: {svc.frequency || "عند الطلب"}</span>
                <span style={{ color: "#666" }}>
                  الاستخدام: {svc.usedQuantity}
                  {svc.includedQuantity && ` / ${svc.includedQuantity}`}
                </span>
              </Space>
            </Card>
          ))}
        </div>
      ),
    },
    {
      key: "logs",
      label: `سجل الخدمات (${contract.serviceLogs.length})`,
      children: (
        <Table
          columns={logsColumns}
          dataSource={contract.serviceLogs}
          rowKey="id"
          pagination={false}
          locale={{ emptyText: "لا يوجد سجل خدمات" }}
        />
      ),
    },
    {
      key: "invoices",
      label: `الفواتير (${contract.invoices.length})`,
      children: (
        <Table
          columns={invoicesColumns}
          dataSource={contract.invoices}
          rowKey="id"
          pagination={false}
          locale={{ emptyText: "لا توجد فواتير" }}
        />
      ),
    },
    {
      key: "activities",
      label: "النشاط",
      children: (
        <Timeline
          items={contract.activities.map((act) => ({
            children: (
              <div>
                <span style={{ color: "#999", marginLeft: 8 }}>
                  <DateDisplay date={act.createdAt} />
                </span>
                <span>{act.description || act.activityType}</span>
              </div>
            ),
          }))}
        />
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title={contract.contractNumber}
        breadcrumbs={[
          { label: "العقود", path: "/contracts" },
          { label: contract.contractNumber },
        ]}
        extra={<Space>{getActionButtons()}</Space>}
      />

      {/* معلومات العقد */}
      <Card style={{ marginBottom: 16 }}>
        <Row gutter={[16, 16]} align="middle">
          <Col span={24}>
            <Space size="middle">
              <Tag color={statusCfg.color}>{statusCfg.label}</Tag>
              {contract.autoRenew && <Tag color="blue">تجديد تلقائي</Tag>}
            </Space>
          </Col>
          <Col span={24}>
            <h2 style={{ margin: "8px 0" }}>{contract.customerName}</h2>
            <Space>
              {contract.customerPhone && <span>📱 {contract.customerPhone}</span>}
              {contract.customerEmail && <span>✉️ {contract.customerEmail}</span>}
            </Space>
          </Col>
        </Row>
      </Card>

      {/* الإحصائيات */}
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={6}>
          <Card>
            <Statistic
              title="قيمة العقد"
              value={Number(contract.totalValue)}
              suffix="IQD"
              valueStyle={{ color: "#1890ff" }}
            />
            <Progress percent={Math.round(paidPercentage)} size="small" style={{ marginTop: 8 }} />
            <div style={{ fontSize: 12, color: "#666" }}>مدفوع: {paidPercentage.toFixed(0)}%</div>
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="تاريخ البداية"
              value={new Date(contract.startDate).toLocaleDateString("ar-IQ")}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="تاريخ الانتهاء"
              value={new Date(contract.endDate).toLocaleDateString("ar-IQ")}
            />
            {contract.status === "active" && daysRemaining > 0 && (
              <Tag color={daysRemaining <= 30 ? "warning" : "success"} style={{ marginTop: 8 }}>
                {daysRemaining} يوم متبقي
              </Tag>
            )}
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic title="أجهزة مشمولة" value={contract.items.length} />
          </Card>
        </Col>
      </Row>

      {/* SLA */}
      {(contract.responseTimeHours || contract.resolutionTimeHours) && (
        <Alert
          message="اتفاقية مستوى الخدمة (SLA)"
          description={
            <Space size="large">
              {contract.responseTimeHours && <span>وقت الاستجابة: <strong>{contract.responseTimeHours} ساعات</strong></span>}
              {contract.resolutionTimeHours && <span>وقت الحل: <strong>{contract.resolutionTimeHours} ساعات</strong></span>}
            </Space>
          }
          type="success"
          showIcon
          style={{ marginBottom: 16 }}
        />
      )}

      {/* التبويبات */}
      <Card>
        <Tabs items={tabItems} />
      </Card>

      {/* مودال التجديد */}
      <Modal
        title="تجديد العقد"
        open={showRenewModal}
        onOk={handleRenew}
        onCancel={() => setShowRenewModal(false)}
        okText="تجديد"
        cancelText="إلغاء"
        confirmLoading={updating}
      >
        <Form form={renewForm} layout="vertical">
          <Form.Item
            name="newEndDate"
            label="تاريخ الانتهاء الجديد"
            rules={[{ required: true, message: "مطلوب" }]}
          >
            <DatePicker style={{ width: "100%" }} />
          </Form.Item>
          <Form.Item name="newTotalValue" label="القيمة الجديدة (اختياري)">
            <InputNumber
              style={{ width: "100%" }}
              placeholder={contract.totalValue}
              formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")}
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
