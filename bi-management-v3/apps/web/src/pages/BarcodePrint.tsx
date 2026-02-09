/**
 * صفحة طباعة الباركود
 */
import { useState, useEffect, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import JsBarcode from "jsbarcode";
import QRCode from "qrcode";
import {
  Row,
  Col,
  Card,
  Button,
  Input,
  Select,
  Checkbox,
  InputNumber,
  Tabs,
  Empty,
  Tag,
  Spin,
} from "antd";
import {
  PrinterOutlined,
  SearchOutlined,
  CheckCircleOutlined,
  QrcodeOutlined,
  BarcodeOutlined,
} from "@ant-design/icons";
import { PageHeader } from "../components/shared";
import { API_BASE, getAuthHeaders } from "../utils/api";

interface PrintItem {
  type: "product" | "serial";
  id: string;
  name?: string;
  serialNumber?: string;
  sku?: string;
  barcode: string;
  price?: number;
  qrData?: string;
}

interface LabelSize {
  id: string;
  name: string;
  width: number;
  height: number;
  unit: string;
}

const LABEL_SIZES: LabelSize[] = [
  { id: "small", name: "صغير (40x25mm)", width: 40, height: 25, unit: "mm" },
  { id: "medium", name: "متوسط (60x40mm)", width: 60, height: 40, unit: "mm" },
  { id: "large", name: "كبير (100x60mm)", width: 100, height: 60, unit: "mm" },
  { id: "shelf", name: "رف (80x30mm)", width: 80, height: 30, unit: "mm" },
];

export default function BarcodePrint() {
  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState<string>("products");
  const [products, setProducts] = useState<any[]>([]);
  const [serials, setSerials] = useState<any[]>([]);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [printItems, setPrintItems] = useState<PrintItem[]>([]);
  const [search, setSearch] = useState("");
  const [copies, setCopies] = useState(1);
  const [labelSize, setLabelSize] = useState("medium");
  const [showPrice, setShowPrice] = useState(true);
  const [showName, setShowName] = useState(true);
  const [useQR, setUseQR] = useState(false);
  const [loading, setLoading] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadProducts();
    loadSerials();
  }, []);

  useEffect(() => {
    if (activeTab === "products") {
      loadProducts();
    } else {
      loadSerials();
    }
  }, [search, activeTab]);

  const loadProducts = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/barcode/products?search=${encodeURIComponent(search)}`);
      if (res.ok) {
        setProducts(await res.json());
      }
    } catch (error) {
      console.error("Load products error:", error);
    }
  };

  const loadSerials = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/barcode/serials?search=${encodeURIComponent(search)}`);
      if (res.ok) {
        setSerials(await res.json());
      }
    } catch (error) {
      console.error("Load serials error:", error);
    }
  };

  const toggleSelect = (id: string) => {
    const newSet = new Set(selectedItems);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedItems(newSet);
  };

  const selectAll = () => {
    const items = activeTab === "products" ? products : serials;
    if (selectedItems.size === items.length) {
      setSelectedItems(new Set());
    } else {
      setSelectedItems(new Set(items.map((i) => i.id)));
    }
  };

  const generatePrintData = async () => {
    if (selectedItems.size === 0) return;

    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/barcode/batch`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: activeTab,
          ids: Array.from(selectedItems),
          copies,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setPrintItems(data.items);
      }
    } catch (error) {
      console.error("Generate error:", error);
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const currentSize = LABEL_SIZES.find((s) => s.id === labelSize) || LABEL_SIZES[1];
  const items = activeTab === "products" ? products : serials;

  const tabItems = [
    {
      key: "products",
      label: (
        <span>
          <BarcodeOutlined /> المنتجات
        </span>
      ),
    },
    {
      key: "serials",
      label: (
        <span>
          <QrcodeOutlined /> السيريالات
        </span>
      ),
    },
  ];

  return (
    <div style={{ padding: 24 }}>
      <PageHeader
        title="طباعة الباركود"
        subtitle="طباعة ملصقات الباركود و QR للمنتجات والسيريالات"
        breadcrumbs={[
          { label: "الرئيسية", path: "/" },
          { label: "طباعة الباركود" },
        ]}
        extra={
          <Button
            type="primary"
            icon={<PrinterOutlined />}
            onClick={handlePrint}
            disabled={printItems.length === 0}
          >
            طباعة ({printItems.length})
          </Button>
        }
      />

      <Row gutter={24}>
        {/* Selection Panel */}
        <Col xs={24} lg={16}>
          <Card>
            {/* Tabs */}
            <Tabs
              activeKey={activeTab}
              onChange={(key) => {
                setActiveTab(key);
                setSelectedItems(new Set());
              }}
              items={tabItems}
            />

            {/* Search */}
            <div style={{ display: "flex", gap: 12, marginBottom: 16 }}>
              <Input
                placeholder={activeTab === "products" ? "بحث بالاسم أو SKU..." : "بحث بالسيريال..."}
                prefix={<SearchOutlined />}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{ flex: 1 }}
              />
              <Button onClick={selectAll}>
                {selectedItems.size === items.length ? "إلغاء التحديد" : "تحديد الكل"}
              </Button>
            </div>

            {/* Items List */}
            <div style={{ maxHeight: 400, overflowY: "auto", border: "1px solid #f0f0f0", borderRadius: 8 }}>
              {activeTab === "products" ? (
                products.length === 0 ? (
                  <Empty description="لا توجد منتجات" style={{ padding: 48 }} />
                ) : (
                  products.map((prod) => (
                    <div
                      key={prod.id}
                      onClick={() => toggleSelect(prod.id)}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 16,
                        padding: 16,
                        cursor: "pointer",
                        borderBottom: "1px solid #f0f0f0",
                        background: selectedItems.has(prod.id) ? "#f0f5ff" : undefined,
                      }}
                    >
                      <Checkbox checked={selectedItems.has(prod.id)} />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 500 }}>{prod.nameAr}</div>
                        <div style={{ fontSize: 13, color: "#64748b" }}>
                          SKU: {prod.sku || "-"} | الباركود: {prod.barcode || "-"}
                        </div>
                      </div>
                      <div style={{ textAlign: "left", fontWeight: 600 }}>
                        {prod.price ? `${Number(prod.price).toLocaleString()} IQD` : "-"}
                      </div>
                    </div>
                  ))
                )
              ) : serials.length === 0 ? (
                <Empty description="لا توجد سيريالات" style={{ padding: 48 }} />
              ) : (
                serials.map((serial) => (
                  <div
                    key={serial.id}
                    onClick={() => toggleSelect(serial.id)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 16,
                      padding: 16,
                      cursor: "pointer",
                      borderBottom: "1px solid #f0f0f0",
                      background: selectedItems.has(serial.id) ? "#f0f5ff" : undefined,
                    }}
                  >
                    <Checkbox checked={selectedItems.has(serial.id)} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 500, fontFamily: "monospace" }}>{serial.serialNumber}</div>
                      <div style={{ fontSize: 13, color: "#64748b" }}>{serial.productName || "منتج غير محدد"}</div>
                    </div>
                    <Tag
                      color={
                        serial.status === "available"
                          ? "success"
                          : serial.status === "sold"
                          ? "processing"
                          : "default"
                      }
                    >
                      {serial.status}
                    </Tag>
                  </div>
                ))
              )}
            </div>

            {/* Footer */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginTop: 16,
                paddingTop: 16,
                borderTop: "1px solid #f0f0f0",
              }}
            >
              <span style={{ color: "#64748b" }}>{selectedItems.size} عنصر محدد</span>
              <Button
                type="primary"
                icon={<CheckCircleOutlined />}
                onClick={generatePrintData}
                disabled={selectedItems.size === 0 || loading}
                loading={loading}
                style={{ background: "#16a34a" }}
              >
                إنشاء ملصقات
              </Button>
            </div>
          </Card>
        </Col>

        {/* Settings Panel */}
        <Col xs={24} lg={8}>
          <Card title="إعدادات الطباعة">
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: "block", marginBottom: 8, fontWeight: 500 }}>حجم الملصق</label>
              <Select
                value={labelSize}
                onChange={setLabelSize}
                style={{ width: "100%" }}
                options={LABEL_SIZES.map((size) => ({ value: size.id, label: size.name }))}
              />
            </div>

            <div style={{ marginBottom: 20 }}>
              <label style={{ display: "block", marginBottom: 8, fontWeight: 500 }}>عدد النسخ</label>
              <InputNumber
                min={1}
                max={100}
                value={copies}
                onChange={(v) => setCopies(v || 1)}
                style={{ width: "100%" }}
              />
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <Checkbox checked={showName} onChange={(e) => setShowName(e.target.checked)}>
                عرض اسم المنتج
              </Checkbox>
              <Checkbox checked={showPrice} onChange={(e) => setShowPrice(e.target.checked)}>
                عرض السعر
              </Checkbox>
              <Checkbox checked={useQR} onChange={(e) => setUseQR(e.target.checked)}>
                استخدام QR Code بدل الباركود
              </Checkbox>
            </div>

            {/* Preview Info */}
            {printItems.length > 0 && (
              <Card size="small" style={{ marginTop: 24, background: "#f8fafc" }}>
                <div style={{ fontSize: 13 }}>
                  <strong>{printItems.length}</strong> ملصق جاهز للطباعة
                </div>
                <div style={{ fontSize: 12, color: "#64748b", marginTop: 4 }}>
                  الحجم: {currentSize.width} × {currentSize.height} {currentSize.unit}
                </div>
              </Card>
            )}
          </Card>
        </Col>
      </Row>

      {/* Print Preview */}
      {printItems.length > 0 && (
        <Card title="معاينة الطباعة" style={{ marginTop: 24 }}>
          <div
            ref={printRef}
            className="print-area"
            style={{
              display: "grid",
              gap: 16,
              gridTemplateColumns: `repeat(auto-fill, minmax(${currentSize.width * 3}px, 1fr))`,
            }}
          >
            {printItems.map((item, index) => (
              <BarcodeLabel
                key={`${item.id}-${index}`}
                item={item}
                size={currentSize}
                showName={showName}
                showPrice={showPrice}
                useQR={useQR}
              />
            ))}
          </div>
        </Card>
      )}

      {/* Print Styles */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .print-area, .print-area * {
            visibility: visible;
          }
          .print-area {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
        }
      `}</style>
    </div>
  );
}

/**
 * مكون الملصق
 */
function BarcodeLabel({
  item,
  size,
  showName,
  showPrice,
  useQR,
}: {
  item: PrintItem;
  size: LabelSize;
  showName: boolean;
  showPrice: boolean;
  useQR: boolean;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current) return;

    if (useQR) {
      QRCode.toCanvas(canvasRef.current, item.qrData || item.barcode, {
        width: size.width * 2,
        margin: 1,
      });
    } else {
      try {
        JsBarcode(canvasRef.current, item.barcode, {
          format: "CODE128",
          width: 2,
          height: 40,
          displayValue: true,
          fontSize: 12,
          margin: 5,
        });
      } catch (e) {
        console.error("Barcode error:", e);
      }
    }
  }, [item, useQR, size]);

  return (
    <Card
      size="small"
      style={{
        width: `${size.width * 3}px`,
        minHeight: `${size.height * 3}px`,
        textAlign: "center",
      }}
      bodyStyle={{ padding: 8 }}
    >
      {showName && (
        <div
          style={{
            fontSize: 12,
            fontWeight: 500,
            marginBottom: 4,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {item.name || item.serialNumber}
        </div>
      )}

      <canvas ref={canvasRef} style={{ maxWidth: "100%" }} />

      {item.sku && (
        <div style={{ fontSize: 11, color: "#64748b", marginTop: 4 }}>SKU: {item.sku}</div>
      )}

      {showPrice && item.price && (
        <div style={{ fontSize: 13, fontWeight: 600, color: "#1677ff", marginTop: 4 }}>
          {Number(item.price).toLocaleString()} IQD
        </div>
      )}
    </Card>
  );
}
