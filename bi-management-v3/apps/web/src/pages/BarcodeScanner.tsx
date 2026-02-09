/**
 * صفحة ماسح الباركود
 */
import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Row,
  Col,
  Card,
  Button,
  Input,
  Empty,
  Tag,
  Alert,
  Spin,
  List,
  Descriptions,
} from "antd";
import {
  ScanOutlined,
  SearchOutlined,
  CameraOutlined,
  StopOutlined,
  CheckCircleFilled,
  CloseCircleFilled,
  EyeOutlined,
} from "@ant-design/icons";
import { PageHeader } from "../components/shared";
import { API_BASE, getAuthHeaders } from "../utils/api";

interface ScanResult {
  found: boolean;
  type?: "product" | "serial";
  data?: {
    product?: any;
    serial?: any;
  };
  message?: string;
}

export default function BarcodeScanner() {
  const navigate = useNavigate();
  const [code, setCode] = useState("");
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [history, setHistory] = useState<{ code: string; result: ScanResult; time: Date }[]>([]);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
    return () => {
      stopCamera();
    };
  }, []);

  const handleScan = async (scannedCode?: string) => {
    const scanCode = scannedCode || code.trim();
    if (!scanCode) return;

    setScanning(true);
    setResult(null);

    try {
      const res = await fetch(`${API_BASE}/api/barcode/scan?code=${encodeURIComponent(scanCode)}`, {
        headers: getAuthHeaders(),
      });
      const data = await res.json();

      setResult(data);
      setHistory((prev) => [{ code: scanCode, result: data, time: new Date() }, ...prev.slice(0, 19)]);

      if (!scannedCode) setCode("");
    } catch (error) {
      console.error("Scan error:", error);
      setResult({ found: false, message: "خطأ في الاتصال" });
    } finally {
      setScanning(false);
      inputRef.current?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleScan();
    }
  };

  const startCamera = async () => {
    try {
      setCameraError(null);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setCameraActive(true);
    } catch (error) {
      console.error("Camera error:", error);
      setCameraError("لا يمكن الوصول للكاميرا. تأكد من منح الإذن.");
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  };

  const goToDetail = () => {
    if (!result?.found || !result.data) return;

    if (result.type === "product" && result.data.product) {
      navigate(`/products/${result.data.product.id}`);
    } else if (result.type === "serial" && result.data.serial) {
      navigate(`/devices/${result.data.serial.serialNumber}`);
    }
  };

  return (
    <div style={{ padding: 24 }}>
      <PageHeader
        title="ماسح الباركود"
        subtitle="مسح وبحث بالباركود أو السيريال"
        breadcrumbs={[
          { label: "الرئيسية", path: "/" },
          { label: "ماسح الباركود" },
        ]}
      />

      <Row gutter={24}>
        {/* Scanner Panel */}
        <Col xs={24} lg={12}>
          {/* Manual Input */}
          <Card title="إدخال يدوي" style={{ marginBottom: 24 }}>
            <Input.Search
              ref={inputRef as any}
              size="large"
              placeholder="أدخل الباركود أو السيريال..."
              prefix={<ScanOutlined />}
              value={code}
              onChange={(e) => setCode(e.target.value)}
              onKeyDown={handleKeyDown}
              onSearch={() => handleScan()}
              enterButton={
                <Button type="primary" loading={scanning} icon={<SearchOutlined />}>
                  بحث
                </Button>
              }
              style={{ fontFamily: "monospace" }}
            />
            <div style={{ marginTop: 12, fontSize: 13, color: "#64748b" }}>
              يمكنك استخدام ماسح الباركود المتصل بالكمبيوتر للمسح المباشر
            </div>
          </Card>

          {/* Camera Scanner */}
          <Card
            title="الكاميرا"
            extra={
              <Button
                type={cameraActive ? "default" : "primary"}
                danger={cameraActive}
                icon={cameraActive ? <StopOutlined /> : <CameraOutlined />}
                onClick={cameraActive ? stopCamera : startCamera}
              >
                {cameraActive ? "إيقاف" : "تشغيل الكاميرا"}
              </Button>
            }
          >
            {cameraError && (
              <Alert message={cameraError} type="error" showIcon style={{ marginBottom: 16 }} />
            )}

            {cameraActive ? (
              <div style={{ position: "relative", background: "#000", borderRadius: 8, overflow: "hidden" }}>
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  style={{ width: "100%", display: "block", aspectRatio: "16/9", objectFit: "cover" }}
                />
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    pointerEvents: "none",
                  }}
                >
                  <div
                    style={{
                      width: 256,
                      height: 192,
                      border: "2px solid #1677ff",
                      borderRadius: 8,
                    }}
                  />
                </div>
                <div
                  style={{
                    position: "absolute",
                    bottom: 0,
                    left: 0,
                    right: 0,
                    textAlign: "center",
                    color: "#fff",
                    background: "rgba(0,0,0,0.5)",
                    padding: 8,
                    fontSize: 13,
                  }}
                >
                  وجه الكاميرا نحو الباركود
                </div>
              </div>
            ) : (
              <div
                style={{
                  aspectRatio: "16/9",
                  background: "#f5f5f5",
                  borderRadius: 8,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <div style={{ textAlign: "center", color: "#8c8c8c" }}>
                  <CameraOutlined style={{ fontSize: 48, opacity: 0.5, marginBottom: 8 }} />
                  <div>الكاميرا غير مفعلة</div>
                </div>
              </div>
            )}
          </Card>
        </Col>

        {/* Result Panel */}
        <Col xs={24} lg={12}>
          {/* Current Result */}
          <Card title="النتيجة" style={{ marginBottom: 24 }}>
            {scanning ? (
              <div style={{ textAlign: "center", padding: 48 }}>
                <Spin size="large" />
                <div style={{ marginTop: 16, color: "#64748b" }}>جاري البحث...</div>
              </div>
            ) : !result ? (
              <Empty
                image={<ScanOutlined style={{ fontSize: 64, color: "#d9d9d9" }} />}
                description="امسح باركود أو أدخل الرمز للبحث"
              />
            ) : !result.found ? (
              <div style={{ textAlign: "center", padding: 32 }}>
                <CloseCircleFilled style={{ fontSize: 64, color: "#ff4d4f", marginBottom: 16 }} />
                <div style={{ color: "#ff4d4f", fontWeight: 500 }}>
                  {result.message || "لم يتم العثور على نتائج"}
                </div>
              </div>
            ) : (
              <div>
                {/* Success Icon */}
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
                  <CheckCircleFilled style={{ fontSize: 48, color: "#52c41a" }} />
                  <div>
                    <div style={{ fontWeight: 500 }}>
                      تم العثور على {result.type === "product" ? "منتج" : "سيريال"}
                    </div>
                  </div>
                </div>

                {/* Details */}
                {result.type === "product" && result.data?.product && (
                  <Card size="small" style={{ background: "#fafafa" }}>
                    <Descriptions column={1} size="small">
                      <Descriptions.Item label="الاسم">
                        {result.data.product.nameAr}
                      </Descriptions.Item>
                      <Descriptions.Item label="SKU">
                        <code>{result.data.product.sku || "-"}</code>
                      </Descriptions.Item>
                      <Descriptions.Item label="الباركود">
                        <code>{result.data.product.barcode || "-"}</code>
                      </Descriptions.Item>
                      <Descriptions.Item label="السعر">
                        <span style={{ fontWeight: 600, color: "#1677ff" }}>
                          {result.data.product.price
                            ? `${Number(result.data.product.price).toLocaleString()} IQD`
                            : "-"}
                        </span>
                      </Descriptions.Item>
                    </Descriptions>
                  </Card>
                )}

                {result.type === "serial" && result.data?.serial && (
                  <Card size="small" style={{ background: "#fafafa" }}>
                    <Descriptions column={1} size="small">
                      <Descriptions.Item label="السيريال">
                        <code style={{ fontWeight: 500 }}>{result.data.serial.serialNumber}</code>
                      </Descriptions.Item>
                      <Descriptions.Item label="المنتج">
                        {result.data.product?.nameAr || "-"}
                      </Descriptions.Item>
                      <Descriptions.Item label="الحالة">
                        <Tag
                          color={
                            result.data.serial.status === "available"
                              ? "success"
                              : result.data.serial.status === "sold"
                              ? "processing"
                              : "default"
                          }
                        >
                          {result.data.serial.status}
                        </Tag>
                      </Descriptions.Item>
                    </Descriptions>
                  </Card>
                )}

                {/* Action Button */}
                <Button
                  type="primary"
                  icon={<EyeOutlined />}
                  onClick={goToDetail}
                  block
                  style={{ marginTop: 16 }}
                >
                  عرض التفاصيل
                </Button>
              </div>
            )}
          </Card>

          {/* History */}
          <Card
            title={
              <span>
                سجل المسح
                {history.length > 0 && (
                  <Tag style={{ marginRight: 8 }}>{history.length}</Tag>
                )}
              </span>
            }
          >
            {history.length === 0 ? (
              <Empty description="لا يوجد سجل بعد" />
            ) : (
              <List
                size="small"
                dataSource={history}
                style={{ maxHeight: 256, overflowY: "auto" }}
                renderItem={(item) => (
                  <List.Item
                    onClick={() => handleScan(item.code)}
                    style={{ cursor: "pointer" }}
                    extra={
                      <span style={{ fontSize: 12, color: "#8c8c8c" }}>
                        {item.time.toLocaleTimeString("ar-IQ")}
                      </span>
                    }
                  >
                    <List.Item.Meta
                      avatar={
                        item.result.found ? (
                          <CheckCircleFilled style={{ fontSize: 20, color: "#52c41a" }} />
                        ) : (
                          <CloseCircleFilled style={{ fontSize: 20, color: "#ff4d4f" }} />
                        )
                      }
                      title={<code style={{ fontSize: 13 }}>{item.code}</code>}
                      description={
                        item.result.found
                          ? item.result.type === "product"
                            ? "منتج"
                            : "سيريال"
                          : "غير موجود"
                      }
                    />
                  </List.Item>
                )}
              />
            )}
          </Card>
        </Col>
      </Row>
    </div>
  );
}
