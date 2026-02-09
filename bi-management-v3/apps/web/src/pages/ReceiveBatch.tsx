/**
 * صفحة استلام وفحص الأجهزة
 * ─────────────────────────
 * الفاحص يستلم كل جهاز ويسجل:
 * - المواصفات الفعلية
 * - حالة الفحص (ناجح / مع ملاحظات / فشل)
 * - العيوب إن وجدت
 */

import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Row, Col, Card, Button, Input, Tag, Space, message, Statistic, Progress, Alert } from "antd";
import {
  CheckCircleOutlined,
  WarningOutlined,
  CloseCircleOutlined,
  SearchOutlined,
  ArrowRightOutlined,
  CheckOutlined,
} from "@ant-design/icons";
import { PageHeader, LoadingSkeleton } from "../components/shared";
import { API_BASE, getAuthHeaders } from "../utils/api";

const { TextArea } = Input;

interface BatchItem {
  id: string;
  productId?: string;
  productName: string;
  brand?: string;
  model?: string;
  specs?: string;
  quantity: number;
  receivedQuantity: number;
  product?: {
    id: string;
    name: string;
  };
}

interface Batch {
  id: string;
  batchNumber: string;
  status: string;
  totalItems: number;
  receivedItems: number;
  notes?: string;
}

interface Supplier {
  id: string;
  name: string;
}

interface DeviceToReceive {
  batchItemId: string;
  actualSpecs: string;
  inspectionStatus: "passed" | "passed_with_issues" | "failed" | "needs_review";
  inspectionNotes: string;
  defects: string[];
}

const INSPECTION_STATUSES = [
  { value: "passed", label: "ناجح", icon: <CheckCircleOutlined />, color: "success" },
  { value: "passed_with_issues", label: "ناجح مع ملاحظات", icon: <WarningOutlined />, color: "warning" },
  { value: "failed", label: "فشل", icon: <CloseCircleOutlined />, color: "error" },
  { value: "needs_review", label: "يحتاج مراجعة", icon: <SearchOutlined />, color: "purple" },
];

const COMMON_DEFECTS = [
  "خدش على الشاشة",
  "خدش على الغطاء",
  "مفتاح لا يعمل",
  "البطارية ضعيفة",
  "صوت مروحة عالي",
  "الشاشة خافتة",
  "ميكروفون لا يعمل",
  "سماعات لا تعمل",
  "منفذ USB لا يعمل",
  "الكاميرا لا تعمل",
];

export default function ReceiveBatch() {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const [batch, setBatch] = useState<Batch | null>(null);
  const [supplier, setSupplier] = useState<Supplier | null>(null);
  const [items, setItems] = useState<BatchItem[]>([]);
  
  const [selectedItem, setSelectedItem] = useState<BatchItem | null>(null);
  const [deviceForm, setDeviceForm] = useState<DeviceToReceive>({
    batchItemId: "",
    actualSpecs: "",
    inspectionStatus: "passed",
    inspectionNotes: "",
    defects: [],
  });
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchBatch();
  }, [id]);

  const fetchBatch = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/purchases/batches/${id}`, {
        headers: getAuthHeaders(),
      });
      
      if (res.ok) {
        const data = await res.json();
        setBatch(data.batch);
        setSupplier(data.supplier);
        setItems(data.items || []);
      } else {
        message.error("فشل في تحميل الوجبة");
      }
    } catch (err) {
      message.error("حدث خطأ في الاتصال");
    } finally {
      setLoading(false);
    }
  };

  const selectItem = (item: BatchItem) => {
    setSelectedItem(item);
    setDeviceForm({
      batchItemId: item.id,
      actualSpecs: item.specs || "",
      inspectionStatus: "passed",
      inspectionNotes: "",
      defects: [],
    });
  };

  const toggleDefect = (defect: string) => {
    const newDefects = deviceForm.defects.includes(defect)
      ? deviceForm.defects.filter((d) => d !== defect)
      : [...deviceForm.defects, defect];
    setDeviceForm({ ...deviceForm, defects: newDefects });
  };

  const handleReceiveDevice = async () => {
    if (!selectedItem) return;
    
    setSaving(true);
    
    try {
      const res = await fetch(`${API_BASE}/api/purchases/batches/${id}/receive`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          devices: [
            {
              batchItemId: deviceForm.batchItemId,
              actualSpecs: deviceForm.actualSpecs,
              inspectionStatus: deviceForm.inspectionStatus,
              inspectionNotes: deviceForm.inspectionNotes,
              defects: deviceForm.defects.length > 0 ? deviceForm.defects : undefined,
            },
          ],
        }),
      });
      
      const data = await res.json();
      
      if (res.ok) {
        message.success(`تم استلام الجهاز بنجاح! (${data.receivedItems}/${data.totalItems})`);
        
        // تحديث البيانات
        fetchBatch();
        
        // إعادة تعيين النموذج
        setDeviceForm({
          batchItemId: selectedItem.id,
          actualSpecs: selectedItem.specs || "",
          inspectionStatus: "passed",
          inspectionNotes: "",
          defects: [],
        });
        
        // التحقق من اكتمال الوجبة
        if (data.status === "received") {
          message.success("تم استلام جميع الأجهزة! الوجبة جاهزة لتحديد أسعار البيع.");
          navigate("/purchases");
        }
      } else {
        message.error(data.error || "حدث خطأ");
      }
    } catch (err) {
      message.error("حدث خطأ في الاتصال");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <LoadingSkeleton />;
  }

  if (!batch) {
    return (
      <div style={{ textAlign: "center", padding: "48px 0" }}>
        <Tag color="error" style={{ fontSize: 16, padding: "8px 16px" }}>الوجبة غير موجودة</Tag>
      </div>
    );
  }

  const canReceive = batch.status === "ready_for_receiving" || batch.status === "receiving";
  const progressPercent = Math.round((batch.receivedItems / batch.totalItems) * 100);

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto" }}>
      <PageHeader
        title="استلام وفحص الأجهزة"
        subtitle="استلم كل جهاز وسجل المواصفات الفعلية وحالة الفحص"
        breadcrumbs={[
          { label: "المشتريات", href: "/purchases" },
          { label: batch.batchNumber },
          { label: "استلام" },
        ]}
      />

      {/* Batch Info */}
      <Card style={{ marginBottom: 24 }}>
        <Row gutter={[24, 16]}>
          <Col xs={12} md={4}>
            <Statistic title="رقم الوجبة" value={batch.batchNumber} />
          </Col>
          <Col xs={12} md={5}>
            <Statistic title="المورد" value={supplier?.name || "-"} />
          </Col>
          <Col xs={8} md={5}>
            <Statistic title="إجمالي الأجهزة" value={batch.totalItems} />
          </Col>
          <Col xs={8} md={5}>
            <Statistic 
              title="تم استلامه" 
              value={batch.receivedItems} 
              valueStyle={{ color: "#52c41a" }}
            />
          </Col>
          <Col xs={8} md={5}>
            <Statistic 
              title="المتبقي" 
              value={batch.totalItems - batch.receivedItems}
              valueStyle={{ color: "#fa8c16" }}
            />
          </Col>
        </Row>
        
        {/* Progress Bar */}
        <div style={{ marginTop: 24 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
            <span>تقدم الاستلام</span>
            <span>{progressPercent}%</span>
          </div>
          <Progress percent={progressPercent} status="active" />
        </div>
      </Card>

      {!canReceive && (
        <Alert
          type="warning"
          message={`الوجبة غير جاهزة للاستلام - الحالة: ${batch.status}`}
          style={{ marginBottom: 24 }}
        />
      )}

      <Row gutter={24}>
        {/* Items List */}
        <Col xs={24} lg={12}>
          <Card title="المنتجات في الوجبة">
            <Space direction="vertical" style={{ width: "100%" }}>
              {items.map((item) => {
                const remaining = item.quantity - item.receivedQuantity;
                const isComplete = remaining === 0;
                
                return (
                  <Card
                    key={item.id}
                    size="small"
                    onClick={() => !isComplete && canReceive && selectItem(item)}
                    style={{
                      cursor: isComplete ? "default" : "pointer",
                      opacity: isComplete ? 0.6 : 1,
                      borderColor: selectedItem?.id === item.id ? "#1890ff" : undefined,
                      backgroundColor: selectedItem?.id === item.id ? "#e6f7ff" : isComplete ? "#fafafa" : undefined,
                    }}
                  >
                    <Row justify="space-between" align="top">
                      <Col>
                        <div style={{ fontWeight: 500 }}>
                          {item.product?.name || item.productName}
                        </div>
                        {item.brand && (
                          <div style={{ fontSize: 12, color: "#666" }}>
                            {item.brand} {item.model && `- ${item.model}`}
                          </div>
                        )}
                        {item.specs && (
                          <div style={{ fontSize: 11, color: "#999", marginTop: 4 }}>
                            {item.specs}
                          </div>
                        )}
                      </Col>
                      <Col style={{ textAlign: "left" }}>
                        <div style={{ fontWeight: 600, color: isComplete ? "#52c41a" : "#333" }}>
                          {item.receivedQuantity} / {item.quantity}
                        </div>
                        {isComplete ? (
                          <Tag color="success" icon={<CheckOutlined />}>مكتمل</Tag>
                        ) : (
                          <Tag color="warning">متبقي: {remaining}</Tag>
                        )}
                      </Col>
                    </Row>
                  </Card>
                );
              })}
            </Space>
          </Card>
        </Col>

        {/* Receive Form */}
        <Col xs={24} lg={12}>
          <Card title="استلام جهاز">
            {!selectedItem ? (
              <div style={{ textAlign: "center", padding: "48px 0", color: "#999" }}>
                اختر منتج من القائمة لبدء الاستلام
              </div>
            ) : (
              <Space direction="vertical" style={{ width: "100%" }} size="middle">
                {/* Selected Product */}
                <Alert
                  type="info"
                  message={selectedItem.product?.name || selectedItem.productName}
                  description={`المواصفات المتوقعة: ${selectedItem.specs || "-"}`}
                />

                {/* Actual Specs */}
                <div>
                  <label style={{ display: "block", marginBottom: 8, fontWeight: 500 }}>
                    المواصفات الفعلية
                  </label>
                  <Input
                    value={deviceForm.actualSpecs}
                    onChange={(e) => setDeviceForm({ ...deviceForm, actualSpecs: e.target.value })}
                    placeholder="i7-11th | 16GB | 256GB SSD"
                  />
                </div>

                {/* Inspection Status */}
                <div>
                  <label style={{ display: "block", marginBottom: 8, fontWeight: 500 }}>
                    حالة الفحص
                  </label>
                  <Row gutter={[8, 8]}>
                    {INSPECTION_STATUSES.map((status) => (
                      <Col span={12} key={status.value}>
                        <Button
                          block
                          type={deviceForm.inspectionStatus === status.value ? "primary" : "default"}
                          danger={status.value === "failed" && deviceForm.inspectionStatus === status.value}
                          icon={status.icon}
                          onClick={() =>
                            setDeviceForm({
                              ...deviceForm,
                              inspectionStatus: status.value as any,
                            })
                          }
                          style={{
                            height: "auto",
                            padding: "8px 12px",
                            ...(deviceForm.inspectionStatus === status.value && status.value === "passed_with_issues"
                              ? { backgroundColor: "#faad14", borderColor: "#faad14" }
                              : {}),
                            ...(deviceForm.inspectionStatus === status.value && status.value === "needs_review"
                              ? { backgroundColor: "#722ed1", borderColor: "#722ed1" }
                              : {}),
                          }}
                        >
                          {status.label}
                        </Button>
                      </Col>
                    ))}
                  </Row>
                </div>

                {/* Defects */}
                {(deviceForm.inspectionStatus === "passed_with_issues" ||
                  deviceForm.inspectionStatus === "failed") && (
                  <div>
                    <label style={{ display: "block", marginBottom: 8, fontWeight: 500 }}>
                      العيوب المكتشفة
                    </label>
                    <Space wrap>
                      {COMMON_DEFECTS.map((defect) => (
                        <Tag
                          key={defect}
                          color={deviceForm.defects.includes(defect) ? "error" : "default"}
                          style={{ cursor: "pointer", padding: "4px 8px" }}
                          onClick={() => toggleDefect(defect)}
                        >
                          {defect}
                        </Tag>
                      ))}
                    </Space>
                  </div>
                )}

                {/* Notes */}
                <div>
                  <label style={{ display: "block", marginBottom: 8, fontWeight: 500 }}>
                    ملاحظات الفحص
                  </label>
                  <TextArea
                    value={deviceForm.inspectionNotes}
                    onChange={(e) =>
                      setDeviceForm({ ...deviceForm, inspectionNotes: e.target.value })
                    }
                    rows={2}
                    placeholder="ملاحظات إضافية..."
                  />
                </div>

                {/* Submit */}
                <Button
                  type="primary"
                  size="large"
                  block
                  icon={<CheckOutlined />}
                  loading={saving}
                  disabled={!canReceive}
                  onClick={handleReceiveDevice}
                  style={{ height: 48 }}
                >
                  استلام الجهاز وتوليد السيريال
                </Button>
              </Space>
            )}
          </Card>
        </Col>
      </Row>

      {/* Back Button */}
      <div style={{ marginTop: 24 }}>
        <Button
          type="link"
          icon={<ArrowRightOutlined />}
          onClick={() => navigate("/purchases")}
        >
          العودة للوجبات
        </Button>
      </div>
    </div>
  );
}
