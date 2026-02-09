/**
 * صفحة إدارة المناقصات والعطاءات
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
  Tabs,
  Modal,
  Form,
  InputNumber,
  Checkbox,
  Descriptions,
  Empty,
} from "antd";
import {
  FileTextOutlined,
  PlusOutlined,
  ArrowLeftOutlined,
  SendOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  EditOutlined,
  StopOutlined,
  TrophyOutlined,
} from "@ant-design/icons";
import { PageHeader, MoneyDisplay, DateDisplay, LoadingSkeleton } from "../components/shared";
import { API_BASE, getAuthHeaders } from "../utils/api";

interface Tender {
  id: string;
  tenderNumber: string;
  title: string;
  description: string | null;
  tenderType: string;
  category: string;
  estimatedValue: string | null;
  currency: string;
  publishDate: string | null;
  submissionDeadline: string;
  openingDate: string | null;
  status: string;
  winnerId: string | null;
  awardValue: string | null;
  createdAt: string;
}

interface Bid {
  id: string;
  bidNumber: string;
  supplierId: string;
  totalValue: string;
  status: string;
  technicalScore: string | null;
  financialScore: string | null;
  totalScore: string | null;
  submittedAt: string;
}

interface Stats {
  totalTenders: number;
  draftTenders: number;
  publishedTenders: number;
  evaluationTenders: number;
  awardedTenders: number;
  totalBids: number;
  pendingEvaluation: number;
  totalValue: number;
}

const STATUS_LABELS: Record<string, string> = {
  draft: "مسودة",
  published: "منشورة",
  clarification: "فترة التوضيح",
  submission: "فترة التقديم",
  evaluation: "التقييم",
  awarded: "تم الترسية",
  cancelled: "ملغاة",
  completed: "مكتملة",
};

const STATUS_COLORS: Record<string, string> = {
  draft: "default",
  published: "blue",
  clarification: "orange",
  submission: "purple",
  evaluation: "magenta",
  awarded: "green",
  cancelled: "red",
  completed: "default",
};

const TYPE_LABELS: Record<string, string> = {
  open: "مفتوحة",
  limited: "محدودة",
  direct: "مباشرة",
  framework: "اتفاقية إطارية",
};

const CATEGORY_LABELS: Record<string, string> = {
  goods: "بضائع",
  services: "خدمات",
  works: "أعمال",
  consultancy: "استشارات",
};

const BID_STATUS_LABELS: Record<string, string> = {
  submitted: "مقدم",
  under_evaluation: "قيد التقييم",
  awarded: "فائز",
  rejected: "مرفوض",
};

export default function TendersManagement() {
  const [tenders, setTenders] = useState<Tender[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [activeTab, setActiveTab] = useState<string>("tenders");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterCategory, setFilterCategory] = useState("");
  const [selectedTender, setSelectedTender] = useState<Tender | null>(null);
  const [tenderBids, setTenderBids] = useState<Bid[]>([]);
  const [form] = Form.useForm();

  useEffect(() => {
    fetchData();
  }, [filterStatus, filterCategory]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [statsRes, tendersRes] = await Promise.all([
        fetch(`${API_BASE}/api/tenders/stats`, { headers: getAuthHeaders() }),
        fetch(`${API_BASE}/api/tenders?${filterStatus ? `status=${filterStatus}&` : ""}${filterCategory ? `category=${filterCategory}` : ""}`, { headers: getAuthHeaders() }),
      ]);

      if (statsRes.ok) setStats(await statsRes.json());
      if (tendersRes.ok) setTenders(await tendersRes.json());
    } catch (error) {
      console.error("Error:", error);
      message.error("حدث خطأ أثناء تحميل البيانات");
    }
    setLoading(false);
  };

  const fetchTenderDetails = async (tender: Tender) => {
    setSelectedTender(tender);
    try {
      const res = await fetch(`${API_BASE}/api/tenders/${tender.id}`, { headers: getAuthHeaders() });
      if (res.ok) {
        const data = await res.json();
        setTenderBids(data.bids || []);
      }
    } catch (error) {
      console.error("Error:", error);
      message.error("حدث خطأ أثناء تحميل تفاصيل المناقصة");
    }
  };

  const createTender = async (values: any) => {
    try {
      const res = await fetch(`${API_BASE}/api/tenders`, {
        method: "POST",
        headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      if (res.ok) {
        message.success("تم إنشاء المناقصة بنجاح");
        setShowModal(false);
        form.resetFields();
        fetchData();
      } else {
        message.error("فشل في إنشاء المناقصة");
      }
    } catch (error) {
      console.error("Error:", error);
      message.error("حدث خطأ أثناء إنشاء المناقصة");
    }
  };

  const publishTender = async (id: string) => {
    try {
      const res = await fetch(`${API_BASE}/api/tenders/${id}/publish`, {
        method: "PATCH",
        headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      if (res.ok) {
        message.success("تم نشر المناقصة بنجاح");
        fetchData();
      } else {
        message.error("فشل في نشر المناقصة");
      }
    } catch (error) {
      console.error("Error:", error);
      message.error("حدث خطأ أثناء نشر المناقصة");
    }
  };

  const closeSubmission = async (id: string) => {
    try {
      const res = await fetch(`${API_BASE}/api/tenders/${id}/close-submission`, {
        method: "PATCH",
        headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      if (res.ok) {
        message.success("تم إغلاق باب التقديم وبدء التقييم");
        fetchData();
      } else {
        message.error("فشل في إغلاق باب التقديم");
      }
    } catch (error) {
      console.error("Error:", error);
      message.error("حدث خطأ أثناء إغلاق باب التقديم");
    }
  };

  const isDeadlinePassed = (deadline: string) => new Date(deadline) < new Date();

  const tenderColumns = [
    {
      title: "المناقصة",
      key: "title",
      render: (_: any, record: Tender) => (
        <div style={{ cursor: "pointer" }} onClick={() => fetchTenderDetails(record)}>
          <Space>
            <span style={{ fontWeight: 600 }}>{record.title}</span>
            <Tag color={STATUS_COLORS[record.status]}>{STATUS_LABELS[record.status]}</Tag>
          </Space>
          <div style={{ fontSize: "0.875rem", color: "#6b7280" }}>
            <Space split="|">
              <span>{record.tenderNumber}</span>
              <span>{TYPE_LABELS[record.tenderType]}</span>
              <span>{CATEGORY_LABELS[record.category]}</span>
              {record.estimatedValue && (
                <span>القيمة: <MoneyDisplay amount={Number(record.estimatedValue)} currency={record.currency} /></span>
              )}
            </Space>
          </div>
          <div style={{ fontSize: "0.75rem", color: "#9ca3af", marginTop: 4 }}>
            آخر موعد للتقديم: <DateDisplay date={record.submissionDeadline} />
            {isDeadlinePassed(record.submissionDeadline) && record.status === "published" && (
              <Tag color="red" style={{ marginRight: 8 }}>انتهى</Tag>
            )}
          </div>
        </div>
      ),
    },
    {
      title: "إجراءات",
      key: "actions",
      width: 150,
      render: (_: any, record: Tender) => (
        <Space>
          {record.status === "draft" && (
            <Button size="small" type="primary" icon={<SendOutlined />} onClick={() => publishTender(record.id)}>
              نشر
            </Button>
          )}
          {record.status === "published" && isDeadlinePassed(record.submissionDeadline) && (
            <Button size="small" type="primary" style={{ background: "#8b5cf6" }} onClick={() => closeSubmission(record.id)}>
              بدء التقييم
            </Button>
          )}
        </Space>
      ),
    },
  ];

  const bidColumns = [
    {
      title: "رقم العرض",
      dataIndex: "bidNumber",
      key: "bidNumber",
    },
    {
      title: "القيمة",
      dataIndex: "totalValue",
      key: "totalValue",
      render: (value: string) => <MoneyDisplay amount={Number(value)} />,
    },
    {
      title: "النتيجة",
      key: "score",
      render: (_: any, record: Bid) => record.totalScore ? `${record.totalScore}%` : "-",
    },
    {
      title: "الحالة",
      dataIndex: "status",
      key: "status",
      render: (status: string) => (
        <Tag color={status === "awarded" ? "green" : "default"}>
          {BID_STATUS_LABELS[status] || status}
        </Tag>
      ),
    },
  ];

  if (loading) {
    return <LoadingSkeleton />;
  }

  const tabItems = [
    {
      key: "tenders",
      label: "المناقصات",
      children: selectedTender ? (
        <div>
          <Button
            icon={<ArrowLeftOutlined />}
            onClick={() => setSelectedTender(null)}
            style={{ marginBottom: 16 }}
          >
            العودة
          </Button>

          <Card style={{ marginBottom: 16 }}>
            <Descriptions title={selectedTender.title} column={{ xs: 1, sm: 2, lg: 3 }}>
              <Descriptions.Item label="الرقم">{selectedTender.tenderNumber}</Descriptions.Item>
              <Descriptions.Item label="النوع">{TYPE_LABELS[selectedTender.tenderType]}</Descriptions.Item>
              <Descriptions.Item label="الفئة">{CATEGORY_LABELS[selectedTender.category]}</Descriptions.Item>
              <Descriptions.Item label="القيمة التقديرية">
                <MoneyDisplay amount={Number(selectedTender.estimatedValue)} currency={selectedTender.currency} />
              </Descriptions.Item>
              <Descriptions.Item label="آخر موعد للتقديم">
                <DateDisplay date={selectedTender.submissionDeadline} />
              </Descriptions.Item>
              <Descriptions.Item label="الحالة">
                <Tag color={STATUS_COLORS[selectedTender.status]}>
                  {STATUS_LABELS[selectedTender.status]}
                </Tag>
              </Descriptions.Item>
            </Descriptions>
          </Card>

          <Card title={`العروض المقدمة (${tenderBids.length})`}>
            {tenderBids.length === 0 ? (
              <Empty description="لا توجد عروض مقدمة" />
            ) : (
              <Table columns={bidColumns} dataSource={tenderBids} rowKey="id" pagination={false} />
            )}
          </Card>
        </div>
      ) : (
        <>
          {/* الفلاتر */}
          <Space style={{ marginBottom: 16 }}>
            <Select
              value={filterStatus}
              onChange={setFilterStatus}
              style={{ width: 150 }}
              placeholder="جميع الحالات"
              allowClear
            >
              <Select.Option value="">جميع الحالات</Select.Option>
              <Select.Option value="draft">مسودة</Select.Option>
              <Select.Option value="published">منشورة</Select.Option>
              <Select.Option value="evaluation">قيد التقييم</Select.Option>
              <Select.Option value="awarded">تم الترسية</Select.Option>
              <Select.Option value="cancelled">ملغاة</Select.Option>
            </Select>
            <Select
              value={filterCategory}
              onChange={setFilterCategory}
              style={{ width: 150 }}
              placeholder="جميع الفئات"
              allowClear
            >
              <Select.Option value="">جميع الفئات</Select.Option>
              <Select.Option value="goods">بضائع</Select.Option>
              <Select.Option value="services">خدمات</Select.Option>
              <Select.Option value="works">أعمال</Select.Option>
              <Select.Option value="consultancy">استشارات</Select.Option>
            </Select>
          </Space>

          {tenders.length === 0 ? (
            <Card>
              <Empty description="لا توجد مناقصات" />
            </Card>
          ) : (
            <Card>
              <Table
                columns={tenderColumns}
                dataSource={tenders}
                rowKey="id"
                pagination={{ pageSize: 10 }}
              />
            </Card>
          )}
        </>
      ),
    },
    {
      key: "bids",
      label: "العروض المقدمة",
      children: (
        <Card>
          <Empty description="اختر مناقصة لعرض العروض المقدمة" />
        </Card>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="إدارة المناقصات والعطاءات"
        subtitle="إدارة المناقصات والعروض والتقييم"
        breadcrumbs={[
          { label: "الرئيسية", path: "/" },
          { label: "المناقصات" },
        ]}
        icon={<FileTextOutlined />}
        extra={
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setShowModal(true)}>
            مناقصة جديدة
          </Button>
        }
      />

      {/* الإحصائيات */}
      {stats && (
        <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
          <Col xs={12} sm={8} lg={4}>
            <Card>
              <Statistic
                title="إجمالي المناقصات"
                value={stats.totalTenders}
                prefix={<FileTextOutlined />}
                valueStyle={{ color: "#3b82f6" }}
              />
            </Card>
          </Col>
          <Col xs={12} sm={8} lg={4}>
            <Card>
              <Statistic
                title="مسودة"
                value={stats.draftTenders}
                prefix={<EditOutlined />}
                valueStyle={{ color: "#6b7280" }}
              />
            </Card>
          </Col>
          <Col xs={12} sm={8} lg={4}>
            <Card>
              <Statistic
                title="منشورة"
                value={stats.publishedTenders}
                prefix={<SendOutlined />}
                valueStyle={{ color: "#8b5cf6" }}
              />
            </Card>
          </Col>
          <Col xs={12} sm={8} lg={4}>
            <Card>
              <Statistic
                title="قيد التقييم"
                value={stats.evaluationTenders}
                prefix={<ClockCircleOutlined />}
                valueStyle={{ color: "#ec4899" }}
              />
            </Card>
          </Col>
          <Col xs={12} sm={8} lg={4}>
            <Card>
              <Statistic
                title="تم الترسية"
                value={stats.awardedTenders}
                prefix={<TrophyOutlined />}
                valueStyle={{ color: "#10b981" }}
              />
            </Card>
          </Col>
          <Col xs={12} sm={8} lg={4}>
            <Card>
              <Statistic
                title="إجمالي العروض"
                value={stats.totalBids}
                prefix={<CheckCircleOutlined />}
                valueStyle={{ color: "#f59e0b" }}
              />
            </Card>
          </Col>
        </Row>
      )}

      {/* التبويبات */}
      <Tabs
        activeKey={activeTab}
        onChange={(key) => {
          setActiveTab(key);
          setSelectedTender(null);
        }}
        items={tabItems}
      />

      {/* Modal */}
      <Modal
        title="مناقصة جديدة"
        open={showModal}
        onCancel={() => setShowModal(false)}
        footer={null}
        width={600}
      >
        <Form form={form} layout="vertical" onFinish={createTender}>
          <Form.Item
            name="title"
            label="العنوان"
            rules={[{ required: true, message: "العنوان مطلوب" }]}
          >
            <Input />
          </Form.Item>
          <Form.Item name="description" label="الوصف">
            <Input.TextArea rows={3} />
          </Form.Item>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="tenderType" label="نوع المناقصة" initialValue="open">
                <Select>
                  <Select.Option value="open">مفتوحة</Select.Option>
                  <Select.Option value="limited">محدودة</Select.Option>
                  <Select.Option value="direct">مباشرة</Select.Option>
                  <Select.Option value="framework">اتفاقية إطارية</Select.Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="category" label="الفئة" initialValue="goods">
                <Select>
                  <Select.Option value="goods">بضائع</Select.Option>
                  <Select.Option value="services">خدمات</Select.Option>
                  <Select.Option value="works">أعمال</Select.Option>
                  <Select.Option value="consultancy">استشارات</Select.Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="estimatedValue" label="القيمة التقديرية">
                <InputNumber style={{ width: "100%" }} min={0} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="participationFee" label="رسوم المشاركة">
                <InputNumber style={{ width: "100%" }} min={0} />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="clarificationDeadline" label="آخر موعد للتوضيح">
                <Input type="date" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="submissionDeadline"
                label="آخر موعد للتقديم"
                rules={[{ required: true, message: "آخر موعد للتقديم مطلوب" }]}
              >
                <Input type="date" />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="openingDate" label="تاريخ الفتح">
            <Input type="date" />
          </Form.Item>
          <Space>
            <Form.Item name="bidBondRequired" valuePropName="checked">
              <Checkbox>ضمان العطاء مطلوب</Checkbox>
            </Form.Item>
            <Form.Item name="allowPartialBids" valuePropName="checked">
              <Checkbox>السماح بالعروض الجزئية</Checkbox>
            </Form.Item>
            <Form.Item name="allowAlternativeBids" valuePropName="checked">
              <Checkbox>السماح بالعروض البديلة</Checkbox>
            </Form.Item>
          </Space>
          <Form.Item name="notes" label="ملاحظات">
            <Input.TextArea rows={2} />
          </Form.Item>
          <Form.Item>
            <Space>
              <Button onClick={() => setShowModal(false)}>إلغاء</Button>
              <Button type="primary" htmlType="submit">
                حفظ
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
