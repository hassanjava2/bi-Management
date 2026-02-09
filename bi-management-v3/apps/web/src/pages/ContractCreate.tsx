/**
 * صفحة إنشاء عقد جديد
 */
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Row, Col, Card, Form, Input, Select, Button, InputNumber, DatePicker, message, Space, Checkbox } from "antd";
import { SaveOutlined, ArrowRightOutlined, PlusOutlined } from "@ant-design/icons";
import { PageHeader } from "../components/shared";
import { API_BASE, getAuthHeaders } from "../utils/api";
import dayjs from "dayjs";

interface Customer {
  id: string;
  fullName: string;
  phone: string;
  email: string;
  address: string;
}

interface ContractType {
  id: string;
  name: string;
  defaultDurationMonths: number;
  billingType: string;
}

export default function ContractCreate() {
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const [saving, setSaving] = useState(false);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [contractTypes, setContractTypes] = useState<ContractType[]>([]);

  const [items, setItems] = useState<Array<{ productName: string; serialNumber: string; location: string; coverageType: string }>>([]);
  const [services, setServices] = useState<Array<{ serviceName: string; frequency: string; includedQuantity: string }>>([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [customersRes, typesRes] = await Promise.all([
        fetch(`${API_BASE}/api/customers?limit=100`),
        fetch(`${API_BASE}/api/contracts/types/list`),
      ]);
      if (customersRes.ok) setCustomers((await customersRes.json()).customers || []);
      if (typesRes.ok) setContractTypes(await typesRes.json());
    } catch (error) {
      console.error(error);
    }
  };

  const handleCustomerSelect = (customerId: string) => {
    const customer = customers.find(c => c.id === customerId);
    if (customer) {
      form.setFieldsValue({
        customerId,
        customerName: customer.fullName,
        customerPhone: customer.phone || "",
        customerEmail: customer.email || "",
        customerAddress: customer.address || "",
      });
    }
  };

  const handleTypeSelect = (typeId: string) => {
    const type = contractTypes.find(t => t.id === typeId);
    if (type) {
      const startDate = form.getFieldValue("startDate") || dayjs();
      const endDate = dayjs(startDate).add(type.defaultDurationMonths, "month");

      form.setFieldsValue({
        contractTypeId: typeId,
        contractTypeName: type.name,
        billingType: type.billingType,
        endDate: endDate,
      });
    }
  };

  const addItem = () => setItems([...items, { productName: "", serialNumber: "", location: "", coverageType: "full" }]);
  const removeItem = (index: number) => setItems(items.filter((_, i) => i !== index));
  const updateItem = (index: number, field: string, value: string) => {
    const newItems = [...items];
    (newItems[index] as any)[field] = value;
    setItems(newItems);
  };

  const addService = () => setServices([...services, { serviceName: "", frequency: "monthly", includedQuantity: "" }]);
  const removeService = (index: number) => setServices(services.filter((_, i) => i !== index));
  const updateService = (index: number, field: string, value: string) => {
    const newServices = [...services];
    (newServices[index] as any)[field] = value;
    setServices(newServices);
  };

  const handleSubmit = async (values: any) => {
    setSaving(true);
    try {
      const res = await fetch(`${API_BASE}/api/contracts`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          ...values,
          startDate: values.startDate?.format("YYYY-MM-DD"),
          endDate: values.endDate?.format("YYYY-MM-DD"),
          responseTimeHours: values.responseTimeHours ? parseInt(values.responseTimeHours) : null,
          resolutionTimeHours: values.resolutionTimeHours ? parseInt(values.resolutionTimeHours) : null,
          items: items.filter(i => i.productName),
          services: services.filter(s => s.serviceName).map(s => ({
            ...s,
            includedQuantity: s.includedQuantity ? parseInt(s.includedQuantity) : null,
          })),
        }),
      });

      if (res.ok) {
        const data = await res.json();
        message.success("تم إنشاء العقد بنجاح");
        navigate(`/contracts/${data.id}`);
      } else {
        const err = await res.json();
        message.error(err.error || "فشل في إنشاء العقد");
      }
    } catch (err) {
      message.error("حدث خطأ في الاتصال");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="عقد جديد"
        subtitle="إنشاء عقد صيانة أو خدمات جديد"
        breadcrumbs={[
          { label: "الرئيسية", path: "/" },
          { label: "العقود", path: "/contracts" },
          { label: "عقد جديد" },
        ]}
      />

      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        initialValues={{
          startDate: dayjs(),
          billingType: "monthly",
          autoRenew: false,
        }}
      >
        {/* بيانات العميل */}
        <Card title="بيانات العميل" style={{ marginBottom: 24 }}>
          <Row gutter={16}>
            <Col xs={24} md={12}>
              <Form.Item label="اختر عميل موجود" name="customerId">
                <Select
                  placeholder="-- أو أدخل يدوياً --"
                  allowClear
                  showSearch
                  optionFilterProp="children"
                  onChange={handleCustomerSelect}
                >
                  {customers.map(c => (
                    <Select.Option key={c.id} value={c.id}>{c.fullName}</Select.Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item
                label="اسم العميل"
                name="customerName"
                rules={[{ required: true, message: "اسم العميل مطلوب" }]}
              >
                <Input placeholder="أدخل اسم العميل" />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item label="الهاتف" name="customerPhone">
                <Input placeholder="رقم الهاتف" />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item label="البريد الإلكتروني" name="customerEmail">
                <Input type="email" placeholder="البريد الإلكتروني" />
              </Form.Item>
            </Col>
            <Col xs={24}>
              <Form.Item label="العنوان" name="customerAddress">
                <Input placeholder="العنوان الكامل" />
              </Form.Item>
            </Col>
          </Row>
        </Card>

        {/* تفاصيل العقد */}
        <Card title="تفاصيل العقد" style={{ marginBottom: 24 }}>
          <Row gutter={16}>
            <Col xs={24} md={8}>
              <Form.Item label="نوع العقد" name="contractTypeId">
                <Select placeholder="-- اختر --" onChange={handleTypeSelect}>
                  {contractTypes.map(t => (
                    <Select.Option key={t.id} value={t.id}>{t.name}</Select.Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col xs={24} md={8}>
              <Form.Item
                label="تاريخ البداية"
                name="startDate"
                rules={[{ required: true, message: "تاريخ البداية مطلوب" }]}
              >
                <DatePicker style={{ width: "100%" }} placeholder="اختر التاريخ" />
              </Form.Item>
            </Col>
            <Col xs={24} md={8}>
              <Form.Item
                label="تاريخ الانتهاء"
                name="endDate"
                rules={[{ required: true, message: "تاريخ الانتهاء مطلوب" }]}
              >
                <DatePicker style={{ width: "100%" }} placeholder="اختر التاريخ" />
              </Form.Item>
            </Col>
            <Col xs={24} md={8}>
              <Form.Item
                label="قيمة العقد الإجمالية"
                name="totalValue"
                rules={[{ required: true, message: "قيمة العقد مطلوبة" }]}
              >
                <InputNumber
                  style={{ width: "100%" }}
                  placeholder="القيمة الإجمالية"
                  formatter={value => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")}
                />
              </Form.Item>
            </Col>
            <Col xs={24} md={8}>
              <Form.Item label="نوع الفوترة" name="billingType">
                <Select>
                  <Select.Option value="monthly">شهري</Select.Option>
                  <Select.Option value="quarterly">ربع سنوي</Select.Option>
                  <Select.Option value="yearly">سنوي</Select.Option>
                  <Select.Option value="one_time">دفعة واحدة</Select.Option>
                </Select>
              </Form.Item>
            </Col>
            <Col xs={24} md={8}>
              <Form.Item label=" " name="autoRenew" valuePropName="checked">
                <Checkbox>تجديد تلقائي</Checkbox>
              </Form.Item>
            </Col>
          </Row>
        </Card>

        {/* SLA */}
        <Card title="اتفاقية مستوى الخدمة (SLA)" style={{ marginBottom: 24 }}>
          <Row gutter={16}>
            <Col xs={24} md={12}>
              <Form.Item label="وقت الاستجابة (ساعات)" name="responseTimeHours">
                <InputNumber style={{ width: "100%" }} placeholder="مثال: 4" min={1} />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item label="وقت الحل (ساعات)" name="resolutionTimeHours">
                <InputNumber style={{ width: "100%" }} placeholder="مثال: 24" min={1} />
              </Form.Item>
            </Col>
          </Row>
        </Card>

        {/* الأجهزة المشمولة */}
        <Card
          title="الأجهزة المشمولة"
          style={{ marginBottom: 24 }}
          extra={
            <Button type="dashed" onClick={addItem} icon={<PlusOutlined />}>
              إضافة جهاز
            </Button>
          }
        >
          {items.length === 0 ? (
            <div style={{ textAlign: "center", padding: "1rem", color: "#9ca3af" }}>لا توجد أجهزة</div>
          ) : (
            items.map((item, index) => (
              <Row key={index} gutter={16} style={{ marginBottom: 12 }}>
                <Col xs={24} md={6}>
                  <Input
                    value={item.productName}
                    onChange={(e) => updateItem(index, "productName", e.target.value)}
                    placeholder="اسم الجهاز/المنتج"
                  />
                </Col>
                <Col xs={24} md={5}>
                  <Input
                    value={item.serialNumber}
                    onChange={(e) => updateItem(index, "serialNumber", e.target.value)}
                    placeholder="السيريال"
                  />
                </Col>
                <Col xs={24} md={5}>
                  <Input
                    value={item.location}
                    onChange={(e) => updateItem(index, "location", e.target.value)}
                    placeholder="الموقع"
                  />
                </Col>
                <Col xs={24} md={5}>
                  <Select
                    value={item.coverageType}
                    onChange={(value) => updateItem(index, "coverageType", value)}
                    style={{ width: "100%" }}
                  >
                    <Select.Option value="full">شامل</Select.Option>
                    <Select.Option value="parts_only">قطع فقط</Select.Option>
                    <Select.Option value="labor_only">عمل فقط</Select.Option>
                  </Select>
                </Col>
                <Col xs={24} md={3}>
                  <Button danger onClick={() => removeItem(index)}>حذف</Button>
                </Col>
              </Row>
            ))
          )}
        </Card>

        {/* الخدمات المشمولة */}
        <Card
          title="الخدمات المشمولة"
          style={{ marginBottom: 24 }}
          extra={
            <Button type="dashed" onClick={addService} icon={<PlusOutlined />}>
              إضافة خدمة
            </Button>
          }
        >
          {services.length === 0 ? (
            <div style={{ textAlign: "center", padding: "1rem", color: "#9ca3af" }}>لا توجد خدمات</div>
          ) : (
            services.map((svc, index) => (
              <Row key={index} gutter={16} style={{ marginBottom: 12 }}>
                <Col xs={24} md={8}>
                  <Input
                    value={svc.serviceName}
                    onChange={(e) => updateService(index, "serviceName", e.target.value)}
                    placeholder="اسم الخدمة"
                  />
                </Col>
                <Col xs={24} md={6}>
                  <Select
                    value={svc.frequency}
                    onChange={(value) => updateService(index, "frequency", value)}
                    style={{ width: "100%" }}
                  >
                    <Select.Option value="monthly">شهري</Select.Option>
                    <Select.Option value="quarterly">ربع سنوي</Select.Option>
                    <Select.Option value="yearly">سنوي</Select.Option>
                    <Select.Option value="on_demand">عند الطلب</Select.Option>
                  </Select>
                </Col>
                <Col xs={24} md={6}>
                  <Input
                    value={svc.includedQuantity}
                    onChange={(e) => updateService(index, "includedQuantity", e.target.value)}
                    placeholder="عدد الزيارات (فارغ=غير محدود)"
                  />
                </Col>
                <Col xs={24} md={4}>
                  <Button danger onClick={() => removeService(index)}>حذف</Button>
                </Col>
              </Row>
            ))
          )}
        </Card>

        {/* الشروط والملاحظات */}
        <Card title="الشروط والملاحظات" style={{ marginBottom: 24 }}>
          <Row gutter={16}>
            <Col xs={24}>
              <Form.Item label="شروط العقد" name="terms">
                <Input.TextArea rows={3} placeholder="أدخل شروط العقد..." />
              </Form.Item>
            </Col>
            <Col xs={24}>
              <Form.Item label="ملاحظات داخلية" name="notes">
                <Input.TextArea rows={2} placeholder="ملاحظات داخلية للفريق..." />
              </Form.Item>
            </Col>
          </Row>
        </Card>

        {/* أزرار */}
        <Space style={{ display: "flex", justifyContent: "flex-end" }}>
          <Button size="large" onClick={() => navigate("/contracts")} icon={<ArrowRightOutlined />}>
            إلغاء
          </Button>
          <Button type="primary" size="large" htmlType="submit" loading={saving} icon={<SaveOutlined />}>
            إنشاء العقد
          </Button>
        </Space>
      </Form>
    </div>
  );
}
