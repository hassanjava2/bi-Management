import { useState, useEffect } from "react";
import {
  Row,
  Col,
  Card,
  Button,
  Input,
  Select,
  Form,
  Tabs,
  Switch,
  message,
  Statistic,
  Space,
  InputNumber,
  TimePicker,
  Tag,
} from "antd";
import {
  SettingOutlined,
  BankOutlined,
  FileTextOutlined,
  SafetyCertificateOutlined,
  CloudUploadOutlined,
  SaveOutlined,
  SyncOutlined,
} from "@ant-design/icons";
import { PageHeader, LoadingSkeleton } from "../components/shared";
import { API_BASE } from "../utils/api";
import dayjs from "dayjs";

const { TextArea } = Input;

interface CompanyInfo {
  name: string;
  nameAr: string;
  fullName: string;
  tagline: string;
  logo: string;
  phone: string;
  phone2: string;
  whatsapp: string;
  email: string;
  website: string;
  country: string;
  city: string;
  address: string;
  addressAr: string;
  taxNumber: string;
  commercialRegister: string;
  facebook: string;
  instagram: string;
  ownerName: string;
  ownerPhone: string;
}

interface InvoiceSettings {
  invoicePrefix: string;
  invoiceNumberLength: number;
  invoiceStartNumber: number;
  taxEnabled: number;
  taxRate: number;
  taxName: string;
  printHeader: string;
  printFooter: string;
  showLogo: number;
  showQrCode: number;
  paperSize: string;
  termsAndConditions: string;
  returnPolicy: string;
  warrantyTerms: string;
  currency: string;
  currencySymbol: string;
  currencyPosition: string;
}

interface WarrantySettings {
  defaultWarrantyMonths: number;
  extendedWarrantyMonths: number;
  warrantyCovers: string;
  warrantyExcludes: string;
  warrantyProcess: string;
  notifyBeforeExpiry: number;
}

interface BackupSettings {
  autoBackupEnabled: number;
  backupFrequency: string;
  backupTime: string;
  backupRetentionDays: number;
  backupLocation: string;
  lastBackupAt: string;
  lastBackupSize: string;
  lastBackupStatus: string;
}

export default function SystemSettings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [company, setCompany] = useState<Partial<CompanyInfo>>({});
  const [invoice, setInvoice] = useState<Partial<InvoiceSettings>>({});
  const [warranty, setWarranty] = useState<Partial<WarrantySettings>>({});
  const [backup, setBackup] = useState<Partial<BackupSettings>>({});

  const [companyForm] = Form.useForm();
  const [invoiceForm] = Form.useForm();
  const [warrantyForm] = Form.useForm();
  const [backupForm] = Form.useForm();

  useEffect(() => {
    fetchAllSettings();
  }, []);

  useEffect(() => {
    companyForm.setFieldsValue(company);
  }, [company, companyForm]);

  useEffect(() => {
    invoiceForm.setFieldsValue({
      ...invoice,
      taxEnabled: invoice.taxEnabled === 1,
      showLogo: invoice.showLogo === 1,
      showQrCode: invoice.showQrCode === 1,
    });
  }, [invoice, invoiceForm]);

  useEffect(() => {
    warrantyForm.setFieldsValue(warranty);
  }, [warranty, warrantyForm]);

  useEffect(() => {
    backupForm.setFieldsValue({
      ...backup,
      autoBackupEnabled: backup.autoBackupEnabled === 1,
      backupTime: backup.backupTime ? dayjs(backup.backupTime, "HH:mm") : null,
    });
  }, [backup, backupForm]);

  async function fetchAllSettings() {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_BASE}/api/settings/all`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();

      setCompany(data.company || {});
      setInvoice(data.invoice || {});
      setWarranty(data.warranty || {});
      setBackup(data.backup || {});
    } catch (err) {
      console.error(err);
      message.error("فشل تحميل الإعدادات");
    } finally {
      setLoading(false);
    }
  }

  async function saveSettings(endpoint: string, data: object) {
    setSaving(true);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_BASE}/api/settings/${endpoint}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(data),
      });

      if (res.ok) {
        message.success("تم حفظ الإعدادات بنجاح");
      } else {
        const err = await res.json();
        message.error(err.error || "حدث خطأ");
      }
    } catch (err) {
      console.error(err);
      message.error("حدث خطأ");
    } finally {
      setSaving(false);
    }
  }

  async function createBackup() {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_BASE}/api/settings/backup/create`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();

      if (res.ok) {
        message.success(`تم بدء إنشاء النسخة الاحتياطية: ${data.fileName}`);
        setTimeout(fetchAllSettings, 3000);
      } else {
        message.error(data.error || "حدث خطأ");
      }
    } catch (err) {
      console.error(err);
      message.error("حدث خطأ");
    }
  }

  function formatDate(date: string) {
    if (!date) return "-";
    return new Intl.DateTimeFormat("ar-IQ", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(date));
  }

  const handleCompanySave = (values: Partial<CompanyInfo>) => {
    setCompany(values);
    saveSettings("company", values);
  };

  const handleInvoiceSave = (values: Record<string, unknown>) => {
    const data = {
      ...values,
      taxEnabled: values.taxEnabled ? 1 : 0,
      showLogo: values.showLogo ? 1 : 0,
      showQrCode: values.showQrCode ? 1 : 0,
    };
    setInvoice(data as Partial<InvoiceSettings>);
    saveSettings("invoice", data);
  };

  const handleWarrantySave = (values: Partial<WarrantySettings>) => {
    setWarranty(values);
    saveSettings("warranty", values);
  };

  const handleBackupSave = (values: Record<string, unknown>) => {
    const data = {
      ...values,
      autoBackupEnabled: values.autoBackupEnabled ? 1 : 0,
      backupTime: values.backupTime ? (values.backupTime as dayjs.Dayjs).format("HH:mm") : "03:00",
    };
    setBackup(data as Partial<BackupSettings>);
    saveSettings("backup", data);
  };

  if (loading) {
    return (
      <div>
        <PageHeader
          title="إعدادات النظام"
          subtitle="ضبط إعدادات الشركة والنظام"
          breadcrumbs={[{ title: "الإعدادات" }]}
        />
        <LoadingSkeleton type="form" rows={6} />
      </div>
    );
  }

  const tabItems = [
    {
      key: "company",
      label: (
        <span>
          <BankOutlined /> معلومات الشركة
        </span>
      ),
      children: (
        <Form
          form={companyForm}
          layout="vertical"
          onFinish={handleCompanySave}
          initialValues={company}
        >
          <Row gutter={16}>
            <Col xs={24} md={12}>
              <Form.Item label="اسم الشركة (إنجليزي)" name="name">
                <Input />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item label="اسم الشركة (عربي)" name="nameAr">
                <Input />
              </Form.Item>
            </Col>
            <Col xs={24}>
              <Form.Item label="الاسم الكامل" name="fullName">
                <Input />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item label="الهاتف الرئيسي" name="phone">
                <Input dir="ltr" style={{ textAlign: "left" }} />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item label="واتساب" name="whatsapp">
                <Input dir="ltr" style={{ textAlign: "left" }} />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item label="البريد الإلكتروني" name="email">
                <Input dir="ltr" style={{ textAlign: "left" }} />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item label="الموقع الإلكتروني" name="website">
                <Input dir="ltr" style={{ textAlign: "left" }} />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item label="المدينة" name="city">
                <Input />
              </Form.Item>
            </Col>
            <Col xs={24}>
              <Form.Item label="العنوان" name="addressAr">
                <Input />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item label="فيسبوك" name="facebook">
                <Input dir="ltr" style={{ textAlign: "left" }} />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item label="انستغرام" name="instagram">
                <Input dir="ltr" style={{ textAlign: "left" }} />
              </Form.Item>
            </Col>
          </Row>

          <Card title="معلومات المالك" size="small" style={{ marginTop: 16, marginBottom: 24 }}>
            <Row gutter={16}>
              <Col xs={24} md={12}>
                <Form.Item label="اسم المالك" name="ownerName">
                  <Input />
                </Form.Item>
              </Col>
              <Col xs={24} md={12}>
                <Form.Item label="هاتف المالك" name="ownerPhone">
                  <Input dir="ltr" style={{ textAlign: "left" }} />
                </Form.Item>
              </Col>
            </Row>
          </Card>

          <Form.Item>
            <Button type="primary" htmlType="submit" loading={saving} icon={<SaveOutlined />}>
              حفظ معلومات الشركة
            </Button>
          </Form.Item>
        </Form>
      ),
    },
    {
      key: "invoice",
      label: (
        <span>
          <FileTextOutlined /> الفواتير
        </span>
      ),
      children: (
        <Form
          form={invoiceForm}
          layout="vertical"
          onFinish={handleInvoiceSave}
        >
          <Card title="ترقيم الفواتير" size="small" style={{ marginBottom: 24 }}>
            <Row gutter={16}>
              <Col xs={24} md={8}>
                <Form.Item label="بادئة رقم الفاتورة" name="invoicePrefix">
                  <Input />
                </Form.Item>
              </Col>
              <Col xs={24} md={8}>
                <Form.Item label="طول الرقم" name="invoiceNumberLength">
                  <InputNumber min={4} max={10} style={{ width: "100%" }} />
                </Form.Item>
              </Col>
              <Col xs={24} md={8}>
                <Form.Item label="رقم البداية" name="invoiceStartNumber">
                  <InputNumber min={1} style={{ width: "100%" }} />
                </Form.Item>
              </Col>
            </Row>
          </Card>

          <Card title="الضريبة" size="small" style={{ marginBottom: 24 }}>
            <Row gutter={16}>
              <Col xs={24} md={8}>
                <Form.Item label="تفعيل الضريبة" name="taxEnabled" valuePropName="checked">
                  <Switch checkedChildren="مفعل" unCheckedChildren="معطل" />
                </Form.Item>
              </Col>
              <Col xs={24} md={8}>
                <Form.Item label="نسبة الضريبة %" name="taxRate">
                  <InputNumber min={0} max={100} step={0.5} style={{ width: "100%" }} />
                </Form.Item>
              </Col>
              <Col xs={24} md={8}>
                <Form.Item label="اسم الضريبة" name="taxName">
                  <Input placeholder="ضريبة القيمة المضافة" />
                </Form.Item>
              </Col>
            </Row>
          </Card>

          <Card title="خيارات الطباعة" size="small" style={{ marginBottom: 24 }}>
            <Row gutter={16}>
              <Col xs={24} md={8}>
                <Form.Item label="حجم الورق" name="paperSize">
                  <Select>
                    <Select.Option value="A4">A4</Select.Option>
                    <Select.Option value="A5">A5</Select.Option>
                    <Select.Option value="thermal">حراري (80mm)</Select.Option>
                  </Select>
                </Form.Item>
              </Col>
              <Col xs={24} md={8}>
                <Form.Item label="إظهار الشعار" name="showLogo" valuePropName="checked">
                  <Switch checkedChildren="نعم" unCheckedChildren="لا" />
                </Form.Item>
              </Col>
              <Col xs={24} md={8}>
                <Form.Item label="إظهار QR Code" name="showQrCode" valuePropName="checked">
                  <Switch checkedChildren="نعم" unCheckedChildren="لا" />
                </Form.Item>
              </Col>
            </Row>
          </Card>

          <Card title="العملة" size="small" style={{ marginBottom: 24 }}>
            <Row gutter={16}>
              <Col xs={24} md={8}>
                <Form.Item label="رمز العملة" name="currency">
                  <Input placeholder="IQD" />
                </Form.Item>
              </Col>
              <Col xs={24} md={8}>
                <Form.Item label="رمز العرض" name="currencySymbol">
                  <Input placeholder="د.ع" />
                </Form.Item>
              </Col>
              <Col xs={24} md={8}>
                <Form.Item label="موضع الرمز" name="currencyPosition">
                  <Select>
                    <Select.Option value="before">قبل المبلغ</Select.Option>
                    <Select.Option value="after">بعد المبلغ</Select.Option>
                  </Select>
                </Form.Item>
              </Col>
            </Row>
          </Card>

          <Card title="شروط وأحكام" size="small" style={{ marginBottom: 24 }}>
            <Row gutter={16}>
              <Col xs={24}>
                <Form.Item label="الشروط والأحكام" name="termsAndConditions">
                  <TextArea rows={3} />
                </Form.Item>
              </Col>
              <Col xs={24}>
                <Form.Item label="سياسة الاسترجاع" name="returnPolicy">
                  <TextArea rows={3} />
                </Form.Item>
              </Col>
            </Row>
          </Card>

          <Form.Item>
            <Button type="primary" htmlType="submit" loading={saving} icon={<SaveOutlined />}>
              حفظ إعدادات الفواتير
            </Button>
          </Form.Item>
        </Form>
      ),
    },
    {
      key: "warranty",
      label: (
        <span>
          <SafetyCertificateOutlined /> الضمان
        </span>
      ),
      children: (
        <Form
          form={warrantyForm}
          layout="vertical"
          onFinish={handleWarrantySave}
          initialValues={warranty}
        >
          <Row gutter={16}>
            <Col xs={24} md={8}>
              <Form.Item label="مدة الضمان الافتراضية (شهر)" name="defaultWarrantyMonths">
                <InputNumber min={0} style={{ width: "100%" }} />
              </Form.Item>
            </Col>
            <Col xs={24} md={8}>
              <Form.Item label="الضمان الممتد (شهر)" name="extendedWarrantyMonths">
                <InputNumber min={0} style={{ width: "100%" }} />
              </Form.Item>
            </Col>
            <Col xs={24} md={8}>
              <Form.Item label="التنبيه قبل الانتهاء (يوم)" name="notifyBeforeExpiry">
                <InputNumber min={0} style={{ width: "100%" }} />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item label="ما يشمله الضمان" name="warrantyCovers">
            <TextArea rows={4} placeholder="- عيوب التصنيع&#10;- الأعطال الفنية&#10;- ..." />
          </Form.Item>

          <Form.Item label="ما لا يشمله الضمان" name="warrantyExcludes">
            <TextArea rows={4} placeholder="- الأضرار الناتجة عن سوء الاستخدام&#10;- الكسر&#10;- ..." />
          </Form.Item>

          <Form.Item label="إجراءات المطالبة بالضمان" name="warrantyProcess">
            <TextArea rows={4} placeholder="1. إحضار الجهاز مع الفاتورة&#10;2. ..." />
          </Form.Item>

          <Form.Item>
            <Button type="primary" htmlType="submit" loading={saving} icon={<SaveOutlined />}>
              حفظ إعدادات الضمان
            </Button>
          </Form.Item>
        </Form>
      ),
    },
    {
      key: "backup",
      label: (
        <span>
          <CloudUploadOutlined /> النسخ الاحتياطي
        </span>
      ),
      children: (
        <Form
          form={backupForm}
          layout="vertical"
          onFinish={handleBackupSave}
        >
          <Card title="آخر نسخة احتياطية" size="small" style={{ marginBottom: 24 }}>
            <Row gutter={[24, 16]}>
              <Col xs={24} md={8}>
                <Statistic title="التاريخ" value={formatDate(backup.lastBackupAt || "")} />
              </Col>
              <Col xs={24} md={8}>
                <Statistic title="الحجم" value={backup.lastBackupSize || "-"} />
              </Col>
              <Col xs={24} md={8}>
                <div>
                  <div style={{ color: "rgba(0, 0, 0, 0.45)", fontSize: 14, marginBottom: 8 }}>الحالة</div>
                  <Tag
                    color={
                      backup.lastBackupStatus === "completed"
                        ? "success"
                        : backup.lastBackupStatus === "failed"
                        ? "error"
                        : "default"
                    }
                  >
                    {backup.lastBackupStatus === "completed"
                      ? "ناجح"
                      : backup.lastBackupStatus === "failed"
                      ? "فشل"
                      : backup.lastBackupStatus || "-"}
                  </Tag>
                </div>
              </Col>
            </Row>
            <div style={{ marginTop: 16 }}>
              <Button type="primary" icon={<SyncOutlined />} onClick={createBackup}>
                إنشاء نسخة احتياطية الآن
              </Button>
            </div>
          </Card>

          <Card title="إعدادات النسخ التلقائي" size="small" style={{ marginBottom: 24 }}>
            <Row gutter={16}>
              <Col xs={24} md={24}>
                <Form.Item label="تفعيل النسخ التلقائي" name="autoBackupEnabled" valuePropName="checked">
                  <Switch checkedChildren="مفعل" unCheckedChildren="معطل" />
                </Form.Item>
              </Col>
              <Col xs={24} md={8}>
                <Form.Item label="التكرار" name="backupFrequency">
                  <Select>
                    <Select.Option value="hourly">كل ساعة</Select.Option>
                    <Select.Option value="daily">يومي</Select.Option>
                    <Select.Option value="weekly">أسبوعي</Select.Option>
                  </Select>
                </Form.Item>
              </Col>
              <Col xs={24} md={8}>
                <Form.Item label="وقت النسخ" name="backupTime">
                  <TimePicker format="HH:mm" style={{ width: "100%" }} />
                </Form.Item>
              </Col>
              <Col xs={24} md={8}>
                <Form.Item label="الاحتفاظ (أيام)" name="backupRetentionDays">
                  <InputNumber min={1} style={{ width: "100%" }} />
                </Form.Item>
              </Col>
            </Row>
          </Card>

          <Card title="مكان التخزين" size="small" style={{ marginBottom: 24 }}>
            <Row gutter={16}>
              <Col xs={24} md={12}>
                <Form.Item label="موقع النسخ" name="backupLocation">
                  <Select>
                    <Select.Option value="local">محلي فقط</Select.Option>
                    <Select.Option value="cloud">سحابي فقط</Select.Option>
                    <Select.Option value="both">محلي وسحابي</Select.Option>
                  </Select>
                </Form.Item>
              </Col>
            </Row>
          </Card>

          <Form.Item>
            <Button type="primary" htmlType="submit" loading={saving} icon={<SaveOutlined />}>
              حفظ إعدادات النسخ الاحتياطي
            </Button>
          </Form.Item>
        </Form>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="إعدادات النظام"
        subtitle="ضبط إعدادات الشركة والنظام"
        breadcrumbs={[{ title: "الإعدادات" }]}
        extra={
          <Space>
            <SettingOutlined style={{ fontSize: 20, color: "#8c8c8c" }} />
          </Space>
        }
      />

      <Card>
        <Tabs items={tabItems} />
      </Card>
    </div>
  );
}
