/**
 * صفحة تعديل الوكيل
 */
import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Card, Form, Input, Select, InputNumber, DatePicker, Button, message, Space, Alert, Tag, Row, Col } from "antd";
import { SaveOutlined, ArrowRightOutlined } from "@ant-design/icons";
import { PageHeader, LoadingSkeleton } from "../components/shared";
import { API_BASE, getAuthHeaders } from "../utils/api";
import dayjs from "dayjs";

const AGENT_TYPES = [
  { value: "individual", label: "فرد" },
  { value: "company", label: "شركة" },
  { value: "distributor", label: "موزع" },
];

const TIERS = [
  { value: "bronze", label: "برونزي", color: "orange" },
  { value: "silver", label: "فضي", color: "default" },
  { value: "gold", label: "ذهبي", color: "gold" },
  { value: "platinum", label: "بلاتيني", color: "purple" },
];

const STATUSES = [
  { value: "active", label: "نشط", color: "success" },
  { value: "suspended", label: "معلق", color: "warning" },
  { value: "terminated", label: "منتهي", color: "error" },
];

export default function AgentEdit() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [agentNumber, setAgentNumber] = useState("");
  const [currentStatus, setCurrentStatus] = useState("");

  useEffect(() => {
    document.title = "تعديل الوكيل | BI Management v3";
  }, []);

  useEffect(() => {
    if (!id) {
      setError("معرف الوكيل مطلوب");
      setLoading(false);
      return;
    }

    fetch(`${API_BASE}/api/agents/${id}`, { headers: getAuthHeaders() })
      .then((r) => {
        if (!r.ok) throw new Error("الوكيل غير موجود");
        return r.json();
      })
      .then((agent) => {
        setAgentNumber(agent.agentNumber || "");
        setCurrentStatus(agent.status || "active");

        form.setFieldsValue({
          name: agent.name || "",
          agentType: agent.agentType || "individual",
          contactPerson: agent.contactPerson || "",
          phone: agent.phone || "",
          mobile: agent.mobile || "",
          email: agent.email || "",
          city: agent.city || "",
          address: agent.address || "",
          region: agent.region || "",
          status: agent.status || "active",
          tier: agent.tier || "bronze",
          commissionRate: agent.commissionRate ? parseFloat(agent.commissionRate) : undefined,
          discountRate: agent.discountRate ? parseFloat(agent.discountRate) : undefined,
          creditLimit: agent.creditLimit ? parseFloat(agent.creditLimit) : undefined,
          monthlyTarget: agent.monthlyTarget ? parseFloat(agent.monthlyTarget) : undefined,
          contractStartDate: agent.contractStartDate ? dayjs(agent.contractStartDate) : undefined,
          contractEndDate: agent.contractEndDate ? dayjs(agent.contractEndDate) : undefined,
          notes: agent.notes || "",
        });
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [id, form]);

  const handleSubmit = async (values: Record<string, unknown>) => {
    setSubmitting(true);
    try {
      const res = await fetch(`${API_BASE}/api/agents/${id}`, {
        method: "PUT",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          name: values.name,
          agentType: values.agentType,
          contactPerson: values.contactPerson || null,
          phone: values.phone || null,
          mobile: values.mobile || null,
          email: values.email || null,
          city: values.city || null,
          address: values.address || null,
          region: values.region || null,
          status: values.status,
          tier: values.tier,
          commissionRate: values.commissionRate ? String(values.commissionRate) : null,
          discountRate: values.discountRate ? String(values.discountRate) : null,
          creditLimit: values.creditLimit ? String(values.creditLimit) : null,
          monthlyTarget: values.monthlyTarget ? String(values.monthlyTarget) : null,
          contractStartDate: values.contractStartDate
            ? (values.contractStartDate as dayjs.Dayjs).format("YYYY-MM-DD")
            : null,
          contractEndDate: values.contractEndDate
            ? (values.contractEndDate as dayjs.Dayjs).format("YYYY-MM-DD")
            : null,
          notes: values.notes || null,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "فشل تحديث الوكيل");
      }

      message.success("تم تحديث بيانات الوكيل بنجاح");
      navigate(`/agents/${id}`);
    } catch (err: unknown) {
      message.error(err instanceof Error ? err.message : "حدث خطأ");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div>
        <PageHeader
          title="تعديل الوكيل"
          breadcrumbs={[
            { title: "الوكلاء", href: "/agents" },
            { title: "تعديل" },
          ]}
        />
        <LoadingSkeleton type="form" rows={10} />
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <PageHeader
          title="تعديل الوكيل"
          breadcrumbs={[
            { title: "الوكلاء", href: "/agents" },
            { title: "خطأ" },
          ]}
        />
        <Alert
          message="خطأ"
          description={error}
          type="error"
          showIcon
          action={
            <Button type="link" onClick={() => navigate("/agents")}>
              العودة للوكلاء
            </Button>
          }
        />
      </div>
    );
  }

  const statusConfig = STATUSES.find((s) => s.value === currentStatus) || STATUSES[0];

  return (
    <div>
      <PageHeader
        title={`تعديل الوكيل: ${agentNumber}`}
        breadcrumbs={[
          { title: "الوكلاء", href: "/agents" },
          { title: agentNumber, href: `/agents/${id}` },
          { title: "تعديل" },
        ]}
        extra={
          <Space>
            <Tag color={statusConfig.color}>{statusConfig.label}</Tag>
            <Button icon={<ArrowRightOutlined />} onClick={() => navigate(`/agents/${id}`)}>
              العودة للتفاصيل
            </Button>
          </Space>
        }
      />

      <Form form={form} layout="vertical" onFinish={handleSubmit}>
        {/* البيانات الأساسية */}
        <Card title="البيانات الأساسية" style={{ marginBottom: 24 }}>
          <Row gutter={16}>
            <Col xs={24} md={12}>
              <Form.Item
                name="name"
                label="اسم الوكيل"
                rules={[{ required: true, message: "الاسم مطلوب" }]}
              >
                <Input placeholder="اسم الوكيل أو الشركة" />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item name="agentType" label="نوع الوكيل">
                <Select>
                  {AGENT_TYPES.map((t) => (
                    <Select.Option key={t.value} value={t.value}>
                      {t.label}
                    </Select.Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col xs={24} md={8}>
              <Form.Item name="contactPerson" label="مسؤول التواصل">
                <Input placeholder="اسم مسؤول التواصل" />
              </Form.Item>
            </Col>
            <Col xs={24} md={8}>
              <Form.Item name="status" label="الحالة">
                <Select>
                  {STATUSES.map((s) => (
                    <Select.Option key={s.value} value={s.value}>
                      <Tag color={s.color}>{s.label}</Tag>
                    </Select.Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col xs={24} md={8}>
              <Form.Item name="tier" label="المستوى">
                <Select>
                  {TIERS.map((t) => (
                    <Select.Option key={t.value} value={t.value}>
                      <Tag color={t.color}>{t.label}</Tag>
                    </Select.Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>
        </Card>

        {/* معلومات الاتصال */}
        <Card title="معلومات الاتصال" style={{ marginBottom: 24 }}>
          <Row gutter={16}>
            <Col xs={24} md={8}>
              <Form.Item name="phone" label="الهاتف">
                <Input placeholder="رقم الهاتف" />
              </Form.Item>
            </Col>
            <Col xs={24} md={8}>
              <Form.Item name="mobile" label="الجوال">
                <Input placeholder="رقم الجوال" />
              </Form.Item>
            </Col>
            <Col xs={24} md={8}>
              <Form.Item name="email" label="البريد الإلكتروني">
                <Input type="email" placeholder="البريد الإلكتروني" />
              </Form.Item>
            </Col>
            <Col xs={24} md={8}>
              <Form.Item name="city" label="المدينة">
                <Input placeholder="المدينة" />
              </Form.Item>
            </Col>
            <Col xs={24} md={8}>
              <Form.Item name="region" label="المنطقة">
                <Input placeholder="المنطقة" />
              </Form.Item>
            </Col>
            <Col xs={24} md={8}>
              <Form.Item name="address" label="العنوان">
                <Input placeholder="العنوان" />
              </Form.Item>
            </Col>
          </Row>
        </Card>

        {/* الشروط المالية */}
        <Card title="الشروط المالية" style={{ marginBottom: 24 }}>
          <Row gutter={16}>
            <Col xs={24} md={6}>
              <Form.Item name="commissionRate" label="نسبة العمولة (%)">
                <InputNumber style={{ width: "100%" }} min={0} max={100} placeholder="مثال: 5" />
              </Form.Item>
            </Col>
            <Col xs={24} md={6}>
              <Form.Item name="discountRate" label="نسبة الخصم (%)">
                <InputNumber style={{ width: "100%" }} min={0} max={100} placeholder="مثال: 10" />
              </Form.Item>
            </Col>
            <Col xs={24} md={6}>
              <Form.Item name="creditLimit" label="حد الائتمان">
                <InputNumber
                  style={{ width: "100%" }}
                  min={0}
                  formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")}
                  placeholder="مثال: 10000"
                />
              </Form.Item>
            </Col>
            <Col xs={24} md={6}>
              <Form.Item name="monthlyTarget" label="الهدف الشهري">
                <InputNumber
                  style={{ width: "100%" }}
                  min={0}
                  formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")}
                  placeholder="مثال: 50000"
                />
              </Form.Item>
            </Col>
          </Row>
        </Card>

        {/* العقد */}
        <Card title="معلومات العقد" style={{ marginBottom: 24 }}>
          <Row gutter={16}>
            <Col xs={24} md={12}>
              <Form.Item name="contractStartDate" label="تاريخ بداية العقد">
                <DatePicker style={{ width: "100%" }} placeholder="اختر التاريخ" />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item name="contractEndDate" label="تاريخ نهاية العقد">
                <DatePicker style={{ width: "100%" }} placeholder="اختر التاريخ" />
              </Form.Item>
            </Col>
            <Col xs={24}>
              <Form.Item name="notes" label="ملاحظات">
                <Input.TextArea rows={3} placeholder="ملاحظات إضافية..." />
              </Form.Item>
            </Col>
          </Row>
        </Card>

        {/* أزرار */}
        <Space style={{ display: "flex", justifyContent: "flex-end" }}>
          <Button size="large" onClick={() => navigate(`/agents/${id}`)} icon={<ArrowRightOutlined />}>
            إلغاء
          </Button>
          <Button type="primary" size="large" htmlType="submit" loading={submitting} icon={<SaveOutlined />}>
            حفظ التعديلات
          </Button>
        </Space>
      </Form>
    </div>
  );
}
