/**
 * صفحة ترقية جهاز
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
  InputNumber,
  Space,
  message,
  Statistic,
  Empty,
  Tag,
  Alert,
  Spin,
  Typography,
} from "antd";
import {
  ArrowLeftOutlined,
  CheckOutlined,
  CloseOutlined,
  PlusOutlined,
  DeleteOutlined,
  CheckCircleOutlined,
} from "@ant-design/icons";
import { PageHeader, LoadingSkeleton, MoneyDisplay } from "../components/shared";
import { API_BASE, getAuthHeaders } from "../utils/api";

const { Text } = Typography;
const { TextArea } = Input;

interface PartType {
  id: string;
  name: string;
  nameAr: string;
}

interface Part {
  id: string;
  name: string;
  brand?: string;
  model?: string;
  specifications?: Record<string, string>;
  quantity: number;
  sellPrice?: number;
  installationFee?: number;
  partTypeId: string;
  partTypeName?: string;
}

interface DeviceInfo {
  id: string;
  serialNumber: string;
  productName?: string;
  productModel?: string;
}

interface UpgradeItem {
  id: string;
  part: Part;
  action: "install" | "swap" | "remove";
  quantity: number;
  installationFee: number;
  removedPartName?: string;
  removedPartValue?: number;
}

export default function UpgradeDevice() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const prefilledSerial = searchParams.get("serial") || "";

  const [partTypes, setPartTypes] = useState<PartType[]>([]);
  const [availableParts, setAvailableParts] = useState<Part[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  // Device search
  const [serialNumber, setSerialNumber] = useState(prefilledSerial);
  const [deviceInfo, setDeviceInfo] = useState<DeviceInfo | null>(null);
  const [searchingDevice, setSearchingDevice] = useState(false);
  const [deviceError, setDeviceError] = useState("");

  // Selected parts
  const [selectedItems, setSelectedItems] = useState<UpgradeItem[]>([]);
  const [selectedTypeId, setSelectedTypeId] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    fetchPartTypes();
    if (prefilledSerial) {
      searchDevice(prefilledSerial);
    }
  }, []);

  useEffect(() => {
    if (selectedTypeId) {
      fetchParts(selectedTypeId);
    }
  }, [selectedTypeId]);

  const fetchPartTypes = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/parts/types`, {
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        const data = await res.json();
        setPartTypes(data.types || []);
      }
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchParts = async (typeId: string) => {
    try {
      const res = await fetch(`${API_BASE}/api/parts/inventory?typeId=${typeId}`, {
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        const data = await res.json();
        setAvailableParts((data.parts || []).filter((p: Part) => p.quantity > 0));
      }
    } catch (error) {
      console.error("Error:", error);
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
      const res = await fetch(
        `${API_BASE}/api/device-movements/search?q=${encodeURIComponent(serial)}`,
        { headers: getAuthHeaders() }
      );

      if (res.ok) {
        const data = await res.json();
        if (data.results && data.results.length > 0) {
          const device = data.results[0];
          setDeviceInfo({
            id: device.id,
            serialNumber: device.serialNumber,
            productName: device.productName,
            productModel: device.productModel,
          });
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
    const timeoutId = setTimeout(() => {
      searchDevice(value);
    }, 500);
    return () => clearTimeout(timeoutId);
  };

  const addPart = (part: Part) => {
    const exists = selectedItems.some((i) => i.part.id === part.id);
    if (exists) {
      message.warning("هذه القطعة موجودة بالفعل");
      return;
    }

    const newItem: UpgradeItem = {
      id: `temp_${Date.now()}`,
      part,
      action: "install",
      quantity: 1,
      installationFee: parseFloat(String(part.installationFee || 0)),
    };

    setSelectedItems([...selectedItems, newItem]);
    setError("");
  };

  const removeItem = (id: string) => {
    setSelectedItems(selectedItems.filter((i) => i.id !== id));
  };

  const updateItem = (id: string, updates: Partial<UpgradeItem>) => {
    setSelectedItems(
      selectedItems.map((i) => (i.id === id ? { ...i, ...updates } : i))
    );
  };

  const calculateTotals = () => {
    let partsCost = 0;
    let installationFees = 0;

    for (const item of selectedItems) {
      const price = parseFloat(String(item.part.sellPrice || 0));
      partsCost += price * item.quantity;
      installationFees += item.installationFee;
    }

    return {
      partsCost,
      installationFees,
      total: partsCost + installationFees,
    };
  };

  const handleSubmit = async () => {
    if (!deviceInfo) {
      message.error("الرجاء تحديد الجهاز");
      return;
    }

    if (selectedItems.length === 0) {
      message.error("الرجاء إضافة قطعة واحدة على الأقل");
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      const res = await fetch(`${API_BASE}/api/parts/upgrades`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          serialNumber: deviceInfo.serialNumber,
          upgradeType: "add",
          items: selectedItems.map((i) => ({
            partId: i.part.id,
            action: i.action,
            quantity: i.quantity,
            installationFee: i.installationFee,
            removedPartName: i.removedPartName,
            removedPartValue: i.removedPartValue,
          })),
          notes,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        message.success("تم إنشاء طلب الترقية بنجاح");
        navigate(`/upgrades/${data.upgradeId}`);
      } else {
        message.error(data.error || "فشل في إنشاء طلب الترقية");
      }
    } catch (error) {
      message.error("حدث خطأ في الاتصال");
    } finally {
      setSubmitting(false);
    }
  };

  const totals = calculateTotals();

  if (loading) {
    return (
      <div style={{ padding: 24 }}>
        <LoadingSkeleton type="form" rows={8} />
      </div>
    );
  }

  return (
    <div style={{ padding: 24, maxWidth: 1200, margin: "0 auto" }}>
      <PageHeader
        title="ترقية جهاز"
        subtitle="إضافة أو استبدال قطع لجهاز"
        breadcrumbs={[
          { title: "القطع", href: "/parts" },
          { title: "طلبات الترقية", href: "/upgrades" },
          { title: "ترقية جديدة" },
        ]}
        extra={
          <Button icon={<ArrowLeftOutlined />} onClick={() => navigate(-1)}>
            رجوع
          </Button>
        }
      />

      {error && (
        <Alert
          message={error}
          type="error"
          showIcon
          closable
          style={{ marginBottom: 16 }}
          onClose={() => setError("")}
        />
      )}

      <Row gutter={24}>
        {/* Main Form */}
        <Col xs={24} lg={16}>
          <Space direction="vertical" size={16} style={{ width: "100%" }}>
            {/* Device Selection */}
            <Card title="اختيار الجهاز">
              <Input
                size="large"
                value={serialNumber}
                onChange={(e) => handleSerialChange(e.target.value)}
                placeholder="رقم السيريال..."
                style={{ fontFamily: "monospace", fontSize: 16 }}
                suffix={searchingDevice ? <Spin size="small" /> : null}
              />

              {deviceInfo && (
                <Alert
                  style={{ marginTop: 16 }}
                  message="تم العثور على الجهاز"
                  description={
                    <div>
                      <div style={{ fontWeight: 500 }}>{deviceInfo.productName}</div>
                      {deviceInfo.productModel && (
                        <div style={{ color: "#8c8c8c" }}>{deviceInfo.productModel}</div>
                      )}
                    </div>
                  }
                  type="success"
                  showIcon
                  icon={<CheckCircleOutlined />}
                />
              )}

              {deviceError && (
                <Alert
                  style={{ marginTop: 16 }}
                  message={deviceError}
                  type="error"
                  showIcon
                />
              )}
            </Card>

            {/* Parts Selection */}
            <Card title="اختيار القطع">
              {/* Part Type Filter */}
              <div style={{ marginBottom: 16 }}>
                <Space wrap>
                  {partTypes.map((type) => (
                    <Tag.CheckableTag
                      key={type.id}
                      checked={selectedTypeId === type.id}
                      onChange={() => setSelectedTypeId(type.id)}
                      style={{ padding: "4px 12px", fontSize: 14 }}
                    >
                      {type.nameAr}
                    </Tag.CheckableTag>
                  ))}
                </Space>
              </div>

              {/* Available Parts */}
              {selectedTypeId && (
                <div
                  style={{
                    border: "1px solid #f0f0f0",
                    borderRadius: 8,
                    maxHeight: 280,
                    overflow: "auto",
                  }}
                >
                  {availableParts.length === 0 ? (
                    <Empty
                      description="لا توجد قطع متوفرة"
                      style={{ padding: 24 }}
                    />
                  ) : (
                    availableParts.map((part) => (
                      <div
                        key={part.id}
                        style={{
                          padding: 12,
                          borderBottom: "1px solid #f0f0f0",
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                        }}
                      >
                        <div>
                          <div style={{ fontWeight: 500 }}>{part.name}</div>
                          <Space size={16}>
                            {part.brand && (
                              <Text type="secondary" style={{ fontSize: 13 }}>
                                {part.brand}
                              </Text>
                            )}
                            <Text type="secondary" style={{ fontSize: 13 }}>
                              متوفر: {part.quantity}
                            </Text>
                            <Text style={{ fontSize: 13, color: "#52c41a", fontWeight: 500 }}>
                              <MoneyDisplay amount={part.sellPrice || 0} />
                            </Text>
                          </Space>
                        </div>
                        <Button
                          type="primary"
                          size="small"
                          icon={<PlusOutlined />}
                          onClick={() => addPart(part)}
                          disabled={selectedItems.some((i) => i.part.id === part.id)}
                        >
                          إضافة
                        </Button>
                      </div>
                    ))
                  )}
                </div>
              )}
            </Card>

            {/* Selected Items */}
            {selectedItems.length > 0 && (
              <Card title="القطع المختارة">
                <Space direction="vertical" size={12} style={{ width: "100%" }}>
                  {selectedItems.map((item) => (
                    <Card
                      key={item.id}
                      size="small"
                      styles={{ body: { padding: 16 } }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "flex-start",
                          marginBottom: 12,
                        }}
                      >
                        <div>
                          <div style={{ fontWeight: 500 }}>{item.part.name}</div>
                          <Text type="secondary" style={{ fontSize: 13 }}>
                            {item.part.brand}
                          </Text>
                        </div>
                        <Button
                          type="text"
                          danger
                          icon={<DeleteOutlined />}
                          onClick={() => removeItem(item.id)}
                        />
                      </div>

                      <Row gutter={12}>
                        <Col span={8}>
                          <div style={{ marginBottom: 4 }}>
                            <Text type="secondary" style={{ fontSize: 12 }}>
                              العملية
                            </Text>
                          </div>
                          <Select
                            value={item.action}
                            onChange={(value) => updateItem(item.id, { action: value })}
                            style={{ width: "100%" }}
                            size="small"
                            options={[
                              { value: "install", label: "تركيب" },
                              { value: "swap", label: "استبدال" },
                            ]}
                          />
                        </Col>
                        <Col span={8}>
                          <div style={{ marginBottom: 4 }}>
                            <Text type="secondary" style={{ fontSize: 12 }}>
                              الكمية
                            </Text>
                          </div>
                          <InputNumber
                            min={1}
                            max={item.part.quantity}
                            value={item.quantity}
                            onChange={(value) =>
                              updateItem(item.id, { quantity: value || 1 })
                            }
                            style={{ width: "100%" }}
                            size="small"
                          />
                        </Col>
                        <Col span={8}>
                          <div style={{ marginBottom: 4 }}>
                            <Text type="secondary" style={{ fontSize: 12 }}>
                              أجرة التركيب
                            </Text>
                          </div>
                          <InputNumber
                            value={item.installationFee}
                            onChange={(value) =>
                              updateItem(item.id, { installationFee: value || 0 })
                            }
                            style={{ width: "100%" }}
                            size="small"
                            formatter={(value) =>
                              `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")
                            }
                          />
                        </Col>
                      </Row>

                      {item.action === "swap" && (
                        <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid #f0f0f0" }}>
                          <div style={{ marginBottom: 4 }}>
                            <Text type="secondary" style={{ fontSize: 12 }}>
                              القطعة المستبدلة
                            </Text>
                          </div>
                          <Input
                            value={item.removedPartName || ""}
                            onChange={(e) =>
                              updateItem(item.id, { removedPartName: e.target.value })
                            }
                            placeholder="اسم القطعة المسحوبة..."
                            size="small"
                          />
                        </div>
                      )}

                      <div style={{ marginTop: 12, textAlign: "left" }}>
                        <Text type="secondary" style={{ fontSize: 13 }}>
                          المجموع:{" "}
                        </Text>
                        <Text strong style={{ color: "#52c41a" }}>
                          <MoneyDisplay
                            amount={
                              (item.part.sellPrice || 0) * item.quantity +
                              item.installationFee
                            }
                          />
                        </Text>
                      </div>
                    </Card>
                  ))}
                </Space>
              </Card>
            )}

            {/* Notes */}
            <Card title="ملاحظات">
              <TextArea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                placeholder="أي ملاحظات إضافية..."
              />
            </Card>
          </Space>
        </Col>

        {/* Summary Sidebar */}
        <Col xs={24} lg={8}>
          <Card
            title="ملخص الطلب"
            style={{ position: "sticky", top: 24 }}
          >
            {deviceInfo && (
              <div style={{ marginBottom: 16, paddingBottom: 16, borderBottom: "1px solid #f0f0f0" }}>
                <Text type="secondary" style={{ fontSize: 13 }}>
                  الجهاز
                </Text>
                <div style={{ fontWeight: 500, fontFamily: "monospace" }}>
                  {deviceInfo.serialNumber}
                </div>
                <div style={{ fontSize: 13 }}>{deviceInfo.productName}</div>
              </div>
            )}

            <Row gutter={[16, 16]}>
              <Col span={12}>
                <Statistic
                  title="عدد القطع"
                  value={selectedItems.length}
                  valueStyle={{ fontSize: 20 }}
                />
              </Col>
              <Col span={12}>
                <Statistic
                  title="تكلفة القطع"
                  value={totals.partsCost}
                  suffix="د.ع"
                  valueStyle={{ fontSize: 16 }}
                />
              </Col>
              <Col span={24}>
                <Statistic
                  title="أجور التركيب"
                  value={totals.installationFees}
                  suffix="د.ع"
                  valueStyle={{ fontSize: 16 }}
                />
              </Col>
            </Row>

            <div
              style={{
                marginTop: 16,
                paddingTop: 16,
                borderTop: "1px solid #f0f0f0",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 16,
                }}
              >
                <Text strong style={{ fontSize: 16 }}>
                  الإجمالي:
                </Text>
                <Text strong style={{ fontSize: 20, color: "#52c41a" }}>
                  <MoneyDisplay amount={totals.total} size="large" />
                </Text>
              </div>

              <Button
                type="primary"
                block
                size="large"
                icon={<CheckOutlined />}
                onClick={handleSubmit}
                loading={submitting}
                disabled={!deviceInfo || selectedItems.length === 0}
              >
                إنشاء طلب الترقية
              </Button>
            </div>
          </Card>
        </Col>
      </Row>
    </div>
  );
}
