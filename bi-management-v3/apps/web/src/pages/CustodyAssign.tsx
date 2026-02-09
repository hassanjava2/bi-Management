/**
 * صفحة تسليم عهدة جديدة
 */
import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  Row,
  Col,
  Card,
  Button,
  Input,
  Select,
  Space,
  message,
  Form,
  Alert,
  Spin,
  Radio,
  Avatar,
  Typography,
  Descriptions,
} from "antd";
import {
  ArrowRightOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  SearchOutlined,
  UserOutlined,
  LoadingOutlined,
  SaveOutlined,
} from "@ant-design/icons";
import { PageHeader, LoadingSkeleton } from "../components/shared";
import { API_BASE, getAuthHeaders } from "../utils/api";

const { TextArea } = Input;
const { Text } = Typography;

interface Employee {
  id: string;
  fullName: string;
  email?: string;
  department?: string;
}

interface AvailableDevice {
  id: string;
  serialNumber: string;
  productName: string;
  productModel?: string;
  warehouseName?: string;
  condition?: string;
}

const CUSTODY_REASONS = [
  "عمل ميداني",
  "عمل مكتبي",
  "مهمة خارجية",
  "بدل تالف",
  "تدريب",
  "مشروع مؤقت",
  "أخرى",
];

export default function CustodyAssign() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const prefilledSerial = searchParams.get("serial") || "";

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form
  const [form] = Form.useForm();
  const [serialNumber, setSerialNumber] = useState(prefilledSerial);
  const [selectedEmployee, setSelectedEmployee] = useState("");
  const [reason, setReason] = useState("");
  const [employeeSearch, setEmployeeSearch] = useState("");

  // Device search
  const [searchingDevice, setSearchingDevice] = useState(false);
  const [deviceInfo, setDeviceInfo] = useState<AvailableDevice | null>(null);
  const [deviceError, setDeviceError] = useState("");

  useEffect(() => {
    fetchEmployees();
    if (prefilledSerial) {
      searchDevice(prefilledSerial);
    }
  }, []);

  const fetchEmployees = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_BASE}/api/custody/employees`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setEmployees(data.employees || []);
      }
    } catch (error) {
      console.error("Error:", error);
      message.error("فشل في تحميل قائمة الموظفين");
    } finally {
      setLoading(false);
    }
  };

  const searchDevice = async (serial: string) => {
    if (!serial.trim()) {
      setDeviceInfo(null);
      setDeviceError("");
      return;
    }

    setSearchingDevice(true);
    setDeviceError("");
    setDeviceInfo(null);

    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_BASE}/api/device-movements/search?q=${encodeURIComponent(serial)}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        const data = await res.json();
        if (data.results && data.results.length > 0) {
          const device = data.results[0];
          if (device.status === "available") {
            setDeviceInfo({
              id: device.id,
              serialNumber: device.serialNumber,
              productName: device.productName || "غير معروف",
              productModel: device.productModel,
              warehouseName: device.warehouseName,
              condition: device.condition,
            });
          } else {
            setDeviceError(`الجهاز غير متاح للتسليم (الحالة: ${device.status})`);
          }
        } else {
          setDeviceError("الجهاز غير موجود");
        }
      }
    } catch (error) {
      setDeviceError("خطأ في البحث");
    } finally {
      setSearchingDevice(false);
    }
  };

  const handleSerialChange = (value: string) => {
    setSerialNumber(value);
    // Debounce search
    const timeoutId = setTimeout(() => {
      searchDevice(value);
    }, 500);
    return () => clearTimeout(timeoutId);
  };

  const handleSubmit = async () => {
    if (!serialNumber || !selectedEmployee) {
      message.error("الرجاء تعبئة جميع الحقول المطلوبة");
      return;
    }

    const values = form.getFieldsValue();
    const finalReason = reason === "أخرى" ? values.customReason : reason;

    setSubmitting(true);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_BASE}/api/custody/assign`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          serialNumber,
          userId: selectedEmployee,
          reason: finalReason,
          notes: values.notes,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        message.success(data.message || "تم تسليم العهدة بنجاح");
        setTimeout(() => {
          navigate("/custody");
        }, 1500);
      } else {
        message.error(data.error || "فشل في تسليم العهدة");
      }
    } catch (error) {
      message.error("حدث خطأ في الاتصال");
    } finally {
      setSubmitting(false);
    }
  };

  const filteredEmployees = employees.filter(
    (emp) =>
      emp.fullName?.toLowerCase().includes(employeeSearch.toLowerCase()) ||
      emp.email?.toLowerCase().includes(employeeSearch.toLowerCase())
  );

  if (loading && !employees.length) {
    return (
      <div style={{ padding: 24, maxWidth: 800, margin: "0 auto" }}>
        <LoadingSkeleton type="form" rows={6} />
      </div>
    );
  }

  return (
    <div style={{ padding: 24, maxWidth: 800, margin: "0 auto" }}>
      <PageHeader
        title="تسليم عهدة جديدة"
        subtitle="تسليم جهاز أو معدة لموظف"
        breadcrumbs={[
          { title: "إدارة العهد", href: "/custody" },
          { title: "تسليم عهدة" },
        ]}
        extra={
          <Button icon={<ArrowRightOutlined />} onClick={() => navigate(-1)}>
            رجوع
          </Button>
        }
      />

      <Card>
        <Form form={form} layout="vertical">
          {/* Serial Number */}
          <Form.Item
            label={
              <span>
                رقم السيريال <Text type="danger">*</Text>
              </span>
            }
          >
            <Input
              value={serialNumber}
              onChange={(e) => handleSerialChange(e.target.value)}
              placeholder="BI-2024-000001"
              style={{ fontFamily: "monospace", fontSize: 16 }}
              size="large"
              suffix={
                searchingDevice ? (
                  <LoadingOutlined spin style={{ color: "#1890ff" }} />
                ) : null
              }
            />

            {/* Device Info */}
            {deviceInfo && (
              <Alert
                type="success"
                showIcon
                icon={<CheckCircleOutlined />}
                message="جهاز متاح للتسليم"
                style={{ marginTop: 12 }}
                description={
                  <Descriptions column={2} size="small" style={{ marginTop: 8 }}>
                    <Descriptions.Item label="المنتج">{deviceInfo.productName}</Descriptions.Item>
                    {deviceInfo.productModel && (
                      <Descriptions.Item label="الموديل">{deviceInfo.productModel}</Descriptions.Item>
                    )}
                    {deviceInfo.warehouseName && (
                      <Descriptions.Item label="المستودع">{deviceInfo.warehouseName}</Descriptions.Item>
                    )}
                    {deviceInfo.condition && (
                      <Descriptions.Item label="الحالة">{deviceInfo.condition}</Descriptions.Item>
                    )}
                  </Descriptions>
                }
              />
            )}

            {deviceError && (
              <Alert
                type="error"
                showIcon
                icon={<CloseCircleOutlined />}
                message={deviceError}
                style={{ marginTop: 12 }}
              />
            )}
          </Form.Item>

          {/* Employee Selection */}
          <Form.Item
            label={
              <span>
                الموظف المستلم <Text type="danger">*</Text>
              </span>
            }
          >
            <Input
              prefix={<SearchOutlined />}
              placeholder="بحث عن موظف..."
              value={employeeSearch}
              onChange={(e) => setEmployeeSearch(e.target.value)}
              style={{ marginBottom: 12 }}
              allowClear
            />

            {loading ? (
              <div style={{ textAlign: "center", padding: 24 }}>
                <Spin tip="جاري التحميل..." />
              </div>
            ) : (
              <Card
                size="small"
                style={{ maxHeight: 250, overflow: "auto" }}
                styles={{ body: { padding: 0 } }}
              >
                {filteredEmployees.length === 0 ? (
                  <div style={{ textAlign: "center", padding: 24, color: "#6b7280" }}>
                    لا يوجد موظفين
                  </div>
                ) : (
                  <Radio.Group
                    value={selectedEmployee}
                    onChange={(e) => setSelectedEmployee(e.target.value)}
                    style={{ width: "100%" }}
                  >
                    {filteredEmployees.map((emp) => (
                      <div
                        key={emp.id}
                        style={{
                          padding: "12px 16px",
                          borderBottom: "1px solid #f0f0f0",
                          background: selectedEmployee === emp.id ? "#e6f7ff" : "transparent",
                          cursor: "pointer",
                        }}
                        onClick={() => setSelectedEmployee(emp.id)}
                      >
                        <Radio value={emp.id}>
                          <Space>
                            <Avatar
                              style={{ background: "#f0f0f0", color: "#666" }}
                              icon={<UserOutlined />}
                            >
                              {emp.fullName?.charAt(0)}
                            </Avatar>
                            <div>
                              <div style={{ fontWeight: 500 }}>{emp.fullName}</div>
                              {emp.email && (
                                <Text type="secondary" style={{ fontSize: 12 }}>
                                  {emp.email}
                                </Text>
                              )}
                            </div>
                          </Space>
                        </Radio>
                      </div>
                    ))}
                  </Radio.Group>
                )}
              </Card>
            )}
          </Form.Item>

          {/* Reason */}
          <Form.Item label="سبب التسليم">
            <Select
              value={reason}
              onChange={setReason}
              placeholder="اختر السبب..."
              allowClear
            >
              {CUSTODY_REASONS.map((r) => (
                <Select.Option key={r} value={r}>
                  {r}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>

          {reason === "أخرى" && (
            <Form.Item name="customReason" label="السبب">
              <Input placeholder="أدخل السبب..." />
            </Form.Item>
          )}

          {/* Notes */}
          <Form.Item name="notes" label="ملاحظات">
            <TextArea
              rows={3}
              placeholder="أي ملاحظات إضافية..."
            />
          </Form.Item>

          {/* Submit */}
          <Form.Item style={{ marginBottom: 0, marginTop: 24 }}>
            <Space style={{ width: "100%", justifyContent: "flex-end" }}>
              <Button onClick={() => navigate(-1)}>إلغاء</Button>
              <Button
                type="primary"
                icon={<SaveOutlined />}
                onClick={handleSubmit}
                loading={submitting}
                disabled={!deviceInfo}
              >
                تسليم العهدة
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Card>

      {/* Instructions */}
      <Alert
        type="info"
        showIcon
        style={{ marginTop: 24 }}
        message="تعليمات التسليم"
        description={
          <ul style={{ margin: "8px 0", paddingRight: 20 }}>
            <li>تأكد من صحة رقم السيريال قبل التسليم</li>
            <li>يجب أن يكون الجهاز متاحاً (غير مسلم لموظف آخر)</li>
            <li>سيتم تسجيل الحركة تلقائياً في سجل الأجهزة</li>
            <li>يمكن استرداد العهدة لاحقاً من صفحة قائمة العهد</li>
          </ul>
        }
      />
    </div>
  );
}
