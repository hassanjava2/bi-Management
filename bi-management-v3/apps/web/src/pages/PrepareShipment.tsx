/**
 * صفحة تجهيز الشحنة
 * ─────────────────────────
 * تأكيد المنتجات وتسجيل فيديو التغليف
 */

import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Row, Col, Card, Button, Input, Tag, Space, message, Statistic, Checkbox, Progress, Alert } from "antd";
import {
  VideoCameraOutlined,
  CheckCircleOutlined,
  CloseOutlined,
  PlayCircleOutlined,
  PauseCircleOutlined,
  ReloadOutlined,
  ArrowRightOutlined,
} from "@ant-design/icons";
import { PageHeader, LoadingSkeleton, MoneyDisplay } from "../components/shared";
import { API_BASE, getAuthHeaders } from "../utils/api";

const { TextArea } = Input;

interface ShipmentItem {
  id: string;
  productId: string;
  productName: string;
  serialNumber: string;
  quantity: number;
  packed: boolean;
}

interface Shipment {
  id: string;
  shipmentNumber: string;
  invoiceId: string;
  invoice?: { invoiceNumber: string };
  customer?: { fullName: string; phone: string; address: string };
  company?: { name: string; nameAr: string };
  totalAmount: number;
  customerPays: number;
  deliveryFee: number;
  customerAddress: string;
  customerPhone: string;
  recipientName: string;
  status: string;
  notes: string;
  items?: ShipmentItem[];
  packagingVideoUrl?: string;
}

export default function PrepareShipment() {
  const { id } = useParams();
  const navigate = useNavigate();
  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const [shipment, setShipment] = useState<Shipment | null>(null);
  const [loading, setLoading] = useState(true);
  const [checkedItems, setCheckedItems] = useState<Set<string>>(new Set());
  const [recording, setRecording] = useState(false);
  const [videoBlob, setVideoBlob] = useState<Blob | null>(null);
  const [videoUrl, setVideoUrl] = useState<string>("");
  const [uploading, setUploading] = useState(false);
  const [notes, setNotes] = useState("");
  const [stream, setStream] = useState<MediaStream | null>(null);

  useEffect(() => {
    fetchShipment();
    return () => {
      // Cleanup camera on unmount
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [id]);

  async function fetchShipment() {
    try {
      const res = await fetch(`${API_BASE}/api/delivery/shipments/${id}`, {
        headers: getAuthHeaders(),
      });
      const data = await res.json();
      setShipment(data.shipment);
      setNotes(data.shipment?.notes || "");
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function startCamera() {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: 1280, height: 720 },
        audio: true,
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err) {
      message.error("لا يمكن الوصول للكاميرا. تأكد من إعطاء الصلاحيات.");
      console.error(err);
    }
  }

  function startRecording() {
    if (!stream) return;

    chunksRef.current = [];
    const mediaRecorder = new MediaRecorder(stream, {
      mimeType: "video/webm;codecs=vp9",
    });

    mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) {
        chunksRef.current.push(e.data);
      }
    };

    mediaRecorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: "video/webm" });
      setVideoBlob(blob);
      setVideoUrl(URL.createObjectURL(blob));
    };

    mediaRecorderRef.current = mediaRecorder;
    mediaRecorder.start();
    setRecording(true);
  }

  function stopRecording() {
    if (mediaRecorderRef.current && recording) {
      mediaRecorderRef.current.stop();
      setRecording(false);
      // Stop camera after recording
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
        setStream(null);
        if (videoRef.current) {
          videoRef.current.srcObject = null;
        }
      }
    }
  }

  function toggleItem(itemId: string) {
    const newChecked = new Set(checkedItems);
    if (newChecked.has(itemId)) {
      newChecked.delete(itemId);
    } else {
      newChecked.add(itemId);
    }
    setCheckedItems(newChecked);
  }

  async function handleSubmit() {
    if (!shipment) return;

    // Validate all items checked
    const allItems = shipment.items || [];
    if (checkedItems.size < allItems.length) {
      message.warning("يجب تأكيد تغليف جميع المنتجات قبل المتابعة");
      return;
    }

    // Validate video recorded
    if (!videoBlob && !shipment.packagingVideoUrl) {
      message.warning("يجب تسجيل فيديو التغليف قبل المتابعة");
      return;
    }

    setUploading(true);
    try {
      // Upload video if we have a new one
      let packagingVideoUrl = "";
      if (videoBlob) {
        const formData = new FormData();
        formData.append("video", videoBlob, `${shipment.shipmentNumber}.webm`);

        // In production, upload to storage service
        // For now, we'll create a data URL (not recommended for production)
        packagingVideoUrl = await blobToDataUrl(videoBlob);
      }

      // Update shipment status to ready
      const res = await fetch(`${API_BASE}/api/delivery/shipments/${id}/prepare`, {
        method: "PATCH",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          packagingVideoUrl,
          notes,
        }),
      });

      if (res.ok) {
        message.success("تم تجهيز الشحنة بنجاح");
        navigate("/delivery/shipments");
      } else {
        const data = await res.json();
        message.error(data.error || "حدث خطأ");
      }
    } catch (err) {
      console.error(err);
      message.error("حدث خطأ أثناء حفظ البيانات");
    } finally {
      setUploading(false);
    }
  }

  function blobToDataUrl(blob: Blob): Promise<string> {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.readAsDataURL(blob);
    });
  }

  if (loading) {
    return <LoadingSkeleton />;
  }

  if (!shipment) {
    return (
      <div style={{ textAlign: "center", padding: "32px 0" }}>
        <Tag color="error" style={{ fontSize: 16, padding: "8px 16px" }}>الشحنة غير موجودة</Tag>
      </div>
    );
  }

  const allItems = shipment.items || [];
  const allChecked = checkedItems.size >= allItems.length;
  const checkProgress = allItems.length > 0 ? Math.round((checkedItems.size / allItems.length) * 100) : 0;

  return (
    <div style={{ maxWidth: 900, margin: "0 auto" }}>
      <PageHeader
        title="تجهيز الشحنة"
        subtitle={shipment.shipmentNumber}
        breadcrumbs={[
          { label: "التوصيل", href: "/delivery" },
          { label: "الشحنات", href: "/delivery/shipments" },
          { label: shipment.shipmentNumber },
        ]}
      />

      {/* Header */}
      <Card style={{ marginBottom: 24 }}>
        <Row justify="space-between" align="top">
          <Col>
            <div style={{ fontSize: 20, fontWeight: 600, color: "#1890ff", fontFamily: "monospace" }}>
              {shipment.shipmentNumber}
            </div>
          </Col>
          <Col style={{ textAlign: "left" }}>
            <div style={{ color: "#666", fontSize: 12 }}>المبلغ المطلوب</div>
            <Statistic
              value={shipment.customerPays || shipment.totalAmount}
              suffix="د.ع"
              valueStyle={{ color: "#52c41a", fontSize: 24 }}
              formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")}
            />
          </Col>
        </Row>

        <Row gutter={[16, 8]} style={{ marginTop: 16, fontSize: 14 }}>
          <Col xs={12}>
            <span style={{ color: "#666" }}>العميل:</span>
            <span style={{ fontWeight: 500, marginRight: 8 }}>
              {shipment.recipientName || shipment.customer?.fullName}
            </span>
          </Col>
          <Col xs={12}>
            <span style={{ color: "#666" }}>الهاتف:</span>
            <span style={{ fontWeight: 500, marginRight: 8, fontFamily: "monospace" }}>
              {shipment.customerPhone || shipment.customer?.phone}
            </span>
          </Col>
          <Col xs={24}>
            <span style={{ color: "#666" }}>العنوان:</span>
            <span style={{ fontWeight: 500, marginRight: 8 }}>
              {shipment.customerAddress || shipment.customer?.address}
            </span>
          </Col>
          <Col xs={24}>
            <span style={{ color: "#666" }}>شركة التوصيل:</span>
            <span style={{ fontWeight: 500, marginRight: 8 }}>
              {shipment.company?.nameAr || shipment.company?.name}
            </span>
          </Col>
        </Row>
      </Card>

      {/* Items Checklist */}
      <Card
        title={
          <Space>
            <Tag color="blue" style={{ fontSize: 14, padding: "2px 8px" }}>1</Tag>
            <span>تأكيد المنتجات</span>
          </Space>
        }
        style={{ marginBottom: 24 }}
      >
        {allItems.length === 0 ? (
          <div style={{ textAlign: "center", padding: "24px 0", color: "#999" }}>
            لا توجد منتجات مسجلة للشحنة
          </div>
        ) : (
          <Space direction="vertical" style={{ width: "100%" }}>
            {allItems.map((item) => (
              <Card
                key={item.id}
                size="small"
                style={{
                  cursor: "pointer",
                  backgroundColor: checkedItems.has(item.id) ? "#f6ffed" : "#fafafa",
                  borderColor: checkedItems.has(item.id) ? "#b7eb8f" : "#d9d9d9",
                }}
                onClick={() => toggleItem(item.id)}
              >
                <Row align="middle" gutter={12}>
                  <Col>
                    <Checkbox
                      checked={checkedItems.has(item.id)}
                      onChange={() => toggleItem(item.id)}
                    />
                  </Col>
                  <Col flex={1}>
                    <div style={{ fontWeight: 500 }}>{item.productName}</div>
                    {item.serialNumber && (
                      <div style={{ fontSize: 12, color: "#666", fontFamily: "monospace" }}>
                        SN: {item.serialNumber}
                      </div>
                    )}
                  </Col>
                  <Col>
                    <Tag>×{item.quantity}</Tag>
                  </Col>
                </Row>
              </Card>
            ))}
          </Space>
        )}

        {allItems.length > 0 && (
          <Alert
            type={allChecked ? "success" : "warning"}
            message={
              allChecked
                ? "تم تأكيد جميع المنتجات"
                : `تم تأكيد ${checkedItems.size} من ${allItems.length} منتج`
            }
            icon={allChecked ? <CheckCircleOutlined /> : undefined}
            showIcon
            style={{ marginTop: 16 }}
          />
        )}
      </Card>

      {/* Video Recording */}
      <Card
        title={
          <Space>
            <Tag color="blue" style={{ fontSize: 14, padding: "2px 8px" }}>2</Tag>
            <span>فيديو التغليف</span>
            <Tag color="error" style={{ fontSize: 11 }}>إلزامي</Tag>
          </Space>
        }
        style={{ marginBottom: 24 }}
      >
        <Alert
          type="info"
          message="قم بتصوير فيديو يوضح حالة المنتجات وعملية التغليف. هذا الفيديو مهم لحماية الشركة والعميل في حالة وجود أي مشاكل."
          style={{ marginBottom: 16 }}
        />

        {/* Camera Preview / Recorded Video */}
        <div
          style={{
            aspectRatio: "16/9",
            backgroundColor: "#000",
            borderRadius: 8,
            overflow: "hidden",
            position: "relative",
            marginBottom: 16,
          }}
        >
          {!videoUrl && !stream && (
            <div
              style={{
                position: "absolute",
                inset: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#666",
              }}
            >
              <div style={{ textAlign: "center" }}>
                <VideoCameraOutlined style={{ fontSize: 64, marginBottom: 16 }} />
                <div>اضغط "تشغيل الكاميرا" للبدء</div>
              </div>
            </div>
          )}

          {stream && !videoUrl && (
            <video
              ref={videoRef}
              autoPlay
              muted
              playsInline
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
          )}

          {videoUrl && (
            <video
              src={videoUrl}
              controls
              style={{ width: "100%", height: "100%", objectFit: "contain" }}
            />
          )}

          {recording && (
            <div
              style={{
                position: "absolute",
                top: 16,
                right: 16,
                display: "flex",
                alignItems: "center",
                gap: 8,
                backgroundColor: "#f5222d",
                color: "#fff",
                padding: "4px 12px",
                borderRadius: 16,
              }}
            >
              <span
                style={{
                  width: 12,
                  height: 12,
                  backgroundColor: "#fff",
                  borderRadius: "50%",
                  animation: "pulse 1s infinite",
                }}
              />
              جاري التسجيل...
            </div>
          )}
        </div>

        {/* Controls */}
        <Row justify="center" gutter={16}>
          {!stream && !videoUrl && (
            <Col>
              <Button
                type="primary"
                size="large"
                icon={<VideoCameraOutlined />}
                onClick={startCamera}
              >
                تشغيل الكاميرا
              </Button>
            </Col>
          )}

          {stream && !recording && (
            <Col>
              <Button
                type="primary"
                danger
                size="large"
                icon={<PlayCircleOutlined />}
                onClick={startRecording}
              >
                بدء التسجيل
              </Button>
            </Col>
          )}

          {recording && (
            <Col>
              <Button
                size="large"
                icon={<PauseCircleOutlined />}
                onClick={stopRecording}
                style={{ backgroundColor: "#333", color: "#fff" }}
              >
                إيقاف التسجيل
              </Button>
            </Col>
          )}

          {videoUrl && (
            <Col>
              <Button
                size="large"
                icon={<ReloadOutlined />}
                onClick={() => {
                  setVideoUrl("");
                  setVideoBlob(null);
                }}
              >
                إعادة التسجيل
              </Button>
            </Col>
          )}
        </Row>

        {videoUrl && (
          <Alert
            type="success"
            message="تم تسجيل الفيديو بنجاح"
            icon={<CheckCircleOutlined />}
            showIcon
            style={{ marginTop: 16 }}
          />
        )}
      </Card>

      {/* Notes */}
      <Card
        title={
          <Space>
            <Tag color="blue" style={{ fontSize: 14, padding: "2px 8px" }}>3</Tag>
            <span>ملاحظات</span>
            <Tag style={{ fontSize: 11 }}>اختياري</Tag>
          </Space>
        }
        style={{ marginBottom: 24 }}
      >
        <TextArea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          placeholder="أي ملاحظات خاصة بالشحنة..."
        />
      </Card>

      {/* Submit */}
      <Row gutter={16}>
        <Col flex={1}>
          <Button
            size="large"
            block
            icon={<ArrowRightOutlined />}
            onClick={() => navigate(-1)}
          >
            إلغاء
          </Button>
        </Col>
        <Col flex={1}>
          <Button
            type="primary"
            size="large"
            block
            icon={<CheckCircleOutlined />}
            loading={uploading}
            disabled={!allChecked || (!videoUrl && !shipment.packagingVideoUrl)}
            onClick={handleSubmit}
          >
            تأكيد التجهيز
          </Button>
        </Col>
      </Row>
    </div>
  );
}
