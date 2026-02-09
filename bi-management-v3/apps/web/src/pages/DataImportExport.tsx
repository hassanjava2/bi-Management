/**
 * صفحة استيراد وتصدير البيانات
 */
import { useState, useEffect, useRef } from "react";
import {
  Row,
  Col,
  Card,
  Button,
  Upload,
  Steps,
  message,
  Table,
  Select,
  Tabs,
  Statistic,
  Radio,
  Checkbox,
  Alert,
  Spin,
  Empty,
} from "antd";
import {
  CloudUploadOutlined,
  CloudDownloadOutlined,
  DownloadOutlined,
  UploadOutlined,
  FileExcelOutlined,
  CheckCircleOutlined,
  WarningOutlined,
  InboxOutlined,
} from "@ant-design/icons";
import { PageHeader } from "../components/shared";
import { API_BASE, getAuthHeaders } from "../utils/api";

const { Dragger } = Upload;

interface ExportType {
  id: string;
  label: string;
  icon: string;
  fields: string[];
}

interface Stats {
  products: number;
  categories: number;
  customers: number;
  suppliers: number;
  serials: number;
  warehouses: number;
}

interface ImportResult {
  success: boolean;
  imported: number;
  updated: number;
  errors: { row: number; error: string }[];
  totalErrors: number;
}

const FIELD_LABELS: Record<string, string> = {
  id: "المعرف",
  nameAr: "الاسم عربي",
  nameEn: "الاسم انجليزي",
  sku: "SKU",
  barcode: "الباركود",
  price: "السعر",
  costPrice: "التكلفة",
  description: "الوصف",
  fullName: "الاسم الكامل",
  phone: "الهاتف",
  email: "البريد",
  address: "العنوان",
  city: "المدينة",
  notes: "ملاحظات",
  companyName: "اسم الشركة",
  contactPerson: "جهة الاتصال",
  serialNumber: "رقم السيريال",
  productId: "معرف المنتج",
  warehouseId: "معرف المخزن",
  status: "الحالة",
  parentId: "المعرف الأب",
  name: "الاسم",
  categoryId: "معرف التصنيف",
  purchaseDate: "تاريخ الشراء",
  managerId: "معرف المدير",
};

const STAT_ITEMS = [
  { key: "products", label: "المنتجات", icon: "📦" },
  { key: "categories", label: "التصنيفات", icon: "📁" },
  { key: "customers", label: "العملاء", icon: "👤" },
  { key: "suppliers", label: "الموردين", icon: "🏭" },
  { key: "serials", label: "السيريالات", icon: "🔢" },
  { key: "warehouses", label: "المخازن", icon: "🏪" },
];

export default function DataImportExport() {
  const [activeTab, setActiveTab] = useState<string>("export");
  const [exportTypes, setExportTypes] = useState<ExportType[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(false);

  // Export state
  const [selectedExportType, setSelectedExportType] = useState<string>("");
  const [selectedFields, setSelectedFields] = useState<Set<string>>(new Set());
  const [exportFormat, setExportFormat] = useState<"csv" | "json">("csv");

  // Import state
  const [selectedImportType, setSelectedImportType] = useState<string>("");
  const [importData, setImportData] = useState<any[] | null>(null);
  const [importHeaders, setImportHeaders] = useState<string[]>([]);
  const [fieldMapping, setFieldMapping] = useState<Record<string, string>>({});
  const [importResult, setImportResult] = useState<ImportResult | null>(null);

  useEffect(() => {
    loadExportTypes();
    loadStats();
  }, []);

  useEffect(() => {
    if (selectedExportType) {
      const type = exportTypes.find((t) => t.id === selectedExportType);
      if (type) {
        setSelectedFields(new Set(type.fields));
      }
    }
  }, [selectedExportType, exportTypes]);

  const loadExportTypes = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/data/export/types`);
      if (res.ok) {
        setExportTypes(await res.json());
      }
    } catch (error) {
      console.error("Load types error:", error);
    }
  };

  const loadStats = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/data/stats`, { headers: getAuthHeaders() });
      if (res.ok) {
        setStats(await res.json());
      }
    } catch (error) {
      console.error("Load stats error:", error);
    }
  };

  const handleExport = async () => {
    if (!selectedExportType) return;

    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/data/export`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: selectedExportType,
          format: exportFormat,
          fields: Array.from(selectedFields),
        }),
      });

      if (res.ok) {
        const result = await res.json();

        if (exportFormat === "csv") {
          const blob = new Blob([atob(result.data)], { type: "text/csv;charset=utf-8;" });
          downloadBlob(blob, result.filename);
        } else {
          const blob = new Blob([JSON.stringify(result.data, null, 2)], { type: "application/json" });
          downloadBlob(blob, `${selectedExportType}_${new Date().toISOString().split("T")[0]}.json`);
        }
        message.success("تم تصدير البيانات بنجاح");
      }
    } catch (error) {
      console.error("Export error:", error);
      message.error("حدث خطأ أثناء التصدير");
    } finally {
      setLoading(false);
    }
  };

  const downloadBlob = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  };

  const downloadTemplate = async (type: string) => {
    try {
      const res = await fetch(`${API_BASE}/api/data/import/template/${type}`);
      if (res.ok) {
        const result = await res.json();
        const blob = new Blob([atob(result.data)], { type: "text/csv;charset=utf-8;" });
        downloadBlob(blob, result.filename);
        message.success("تم تحميل القالب");
      }
    } catch (error) {
      console.error("Template download error:", error);
      message.error("حدث خطأ أثناء تحميل القالب");
    }
  };

  const handleFileUpload = async (file: File) => {
    const reader = new FileReader();
    reader.onload = async (event) => {
      const content = event.target?.result as string;

      try {
        const res = await fetch(`${API_BASE}/api/data/import/parse`, {
          method: "POST",
          headers: getAuthHeaders(),
          body: JSON.stringify({ content: btoa(content) }),
        });

        if (res.ok) {
          const result = await res.json();
          setImportData(result.data);
          setImportHeaders(result.headers);

          // Auto-map matching fields
          const mapping: Record<string, string> = {};
          result.headers.forEach((h: string) => {
            if (FIELD_LABELS[h]) {
              mapping[h] = h;
            } else {
              const entry = Object.entries(FIELD_LABELS).find(
                ([_, label]) => label === h || label.includes(h) || h.includes(label)
              );
              if (entry) {
                mapping[h] = entry[0];
              }
            }
          });
          setFieldMapping(mapping);
          message.success(`تم قراءة ${result.data.length} سجل`);
        }
      } catch (error) {
        console.error("Parse error:", error);
        message.error("حدث خطأ أثناء قراءة الملف");
      }
    };
    reader.readAsText(file);
    return false; // Prevent auto upload
  };

  const handleImport = async () => {
    if (!selectedImportType || !importData) return;

    setLoading(true);
    setImportResult(null);

    try {
      const mappedData = importData.map((row) => {
        const mapped: Record<string, any> = {};
        Object.entries(fieldMapping).forEach(([csvField, dbField]) => {
          if (dbField && row[csvField] !== undefined) {
            mapped[dbField] = row[csvField];
          }
        });
        return mapped;
      });

      const res = await fetch(`${API_BASE}/api/data/import`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          type: selectedImportType,
          data: mappedData,
        }),
      });

      if (res.ok) {
        const result = await res.json();
        setImportResult(result);
        loadStats();
        message.success(`تم استيراد ${result.imported} سجل بنجاح`);
      }
    } catch (error) {
      console.error("Import error:", error);
      message.error("حدث خطأ أثناء الاستيراد");
    } finally {
      setLoading(false);
    }
  };

  const selectedType = exportTypes.find((t) => t.id === selectedExportType);

  const mappingColumns = [
    {
      title: "حقل الملف",
      dataIndex: "header",
      key: "header",
      render: (text: string) => <code style={{ background: "#f1f5f9", padding: "2px 6px", borderRadius: 4 }}>{text}</code>,
    },
    {
      title: "حقل النظام",
      dataIndex: "header",
      key: "mapping",
      render: (header: string) => (
        <Select
          style={{ width: "100%" }}
          value={fieldMapping[header] || undefined}
          onChange={(value) => setFieldMapping((prev) => ({ ...prev, [header]: value }))}
          placeholder="-- تجاهل --"
          allowClear
        >
          {Object.entries(FIELD_LABELS).map(([key, label]) => (
            <Select.Option key={key} value={key}>
              {label}
            </Select.Option>
          ))}
        </Select>
      ),
    },
    {
      title: "عينة",
      dataIndex: "header",
      key: "sample",
      render: (header: string) => (
        <span style={{ color: "#64748b" }}>{importData?.[0]?.[header] || "-"}</span>
      ),
    },
  ];

  const tabItems = [
    {
      key: "export",
      label: (
        <span>
          <CloudDownloadOutlined /> تصدير البيانات
        </span>
      ),
      children: (
        <div style={{ padding: "16px 0" }}>
          {/* Select Type */}
          <div style={{ marginBottom: 24 }}>
            <label style={{ display: "block", marginBottom: 12, fontWeight: 500 }}>اختر نوع البيانات</label>
            <Row gutter={[12, 12]}>
              {exportTypes.map((type) => (
                <Col xs={12} sm={8} md={4} key={type.id}>
                  <Card
                    hoverable
                    onClick={() => setSelectedExportType(type.id)}
                    style={{
                      textAlign: "center",
                      borderColor: selectedExportType === type.id ? "#1677ff" : undefined,
                      background: selectedExportType === type.id ? "#f0f5ff" : undefined,
                    }}
                    bodyStyle={{ padding: 16 }}
                  >
                    <div style={{ fontSize: 28 }}>{type.icon}</div>
                    <div style={{ fontSize: 13, fontWeight: 500, marginTop: 8 }}>{type.label}</div>
                    <div style={{ fontSize: 12, color: "#64748b" }}>
                      {(stats as any)?.[type.id]?.toLocaleString() || 0} سجل
                    </div>
                  </Card>
                </Col>
              ))}
            </Row>
          </div>

          {selectedType && (
            <>
              {/* Select Fields */}
              <div style={{ marginBottom: 24 }}>
                <label style={{ display: "block", marginBottom: 12, fontWeight: 500 }}>اختر الحقول</label>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {selectedType.fields.map((field) => (
                    <Checkbox
                      key={field}
                      checked={selectedFields.has(field)}
                      onChange={(e) => {
                        const newSet = new Set(selectedFields);
                        if (e.target.checked) {
                          newSet.add(field);
                        } else {
                          newSet.delete(field);
                        }
                        setSelectedFields(newSet);
                      }}
                      style={{
                        padding: "6px 12px",
                        borderRadius: 6,
                        border: selectedFields.has(field) ? "1px solid #1677ff" : "1px solid #d9d9d9",
                        background: selectedFields.has(field) ? "#f0f5ff" : undefined,
                      }}
                    >
                      {FIELD_LABELS[field] || field}
                    </Checkbox>
                  ))}
                </div>
              </div>

              {/* Format */}
              <div style={{ marginBottom: 24 }}>
                <label style={{ display: "block", marginBottom: 12, fontWeight: 500 }}>صيغة الملف</label>
                <Radio.Group value={exportFormat} onChange={(e) => setExportFormat(e.target.value)}>
                  <Radio value="csv">CSV</Radio>
                  <Radio value="json">JSON</Radio>
                </Radio.Group>
              </div>

              {/* Export Button */}
              <Button
                type="primary"
                size="large"
                icon={<CloudDownloadOutlined />}
                onClick={handleExport}
                disabled={loading || selectedFields.size === 0}
                loading={loading}
              >
                تصدير {selectedType.label}
              </Button>
            </>
          )}
        </div>
      ),
    },
    {
      key: "import",
      label: (
        <span>
          <CloudUploadOutlined /> استيراد البيانات
        </span>
      ),
      children: (
        <div style={{ padding: "16px 0" }}>
          {/* Select Type */}
          <div style={{ marginBottom: 24 }}>
            <label style={{ display: "block", marginBottom: 12, fontWeight: 500 }}>اختر نوع البيانات</label>
            <Row gutter={[12, 12]}>
              {["products", "categories", "customers", "suppliers"].map((type) => {
                const typeInfo = exportTypes.find((t) => t.id === type);
                return (
                  <Col xs={12} sm={6} key={type}>
                    <Card
                      hoverable
                      onClick={() => setSelectedImportType(type)}
                      style={{
                        textAlign: "center",
                        borderColor: selectedImportType === type ? "#1677ff" : undefined,
                        background: selectedImportType === type ? "#f0f5ff" : undefined,
                      }}
                      bodyStyle={{ padding: 16 }}
                    >
                      <div style={{ fontSize: 28 }}>{typeInfo?.icon || "📄"}</div>
                      <div style={{ fontSize: 13, fontWeight: 500, marginTop: 8 }}>{typeInfo?.label || type}</div>
                    </Card>
                  </Col>
                );
              })}
            </Row>
          </div>

          {selectedImportType && (
            <>
              {/* Download Template */}
              <Card style={{ marginBottom: 24, background: "#f8fafc" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <div style={{ fontWeight: 500 }}>قالب الاستيراد</div>
                    <div style={{ fontSize: 13, color: "#64748b" }}>حمّل القالب واملأه بالبيانات ثم ارفعه</div>
                  </div>
                  <Button icon={<DownloadOutlined />} onClick={() => downloadTemplate(selectedImportType)}>
                    تحميل القالب
                  </Button>
                </div>
              </Card>

              {/* File Upload */}
              <div style={{ marginBottom: 24 }}>
                <label style={{ display: "block", marginBottom: 12, fontWeight: 500 }}>رفع ملف CSV</label>
                <Dragger
                  accept=".csv"
                  showUploadList={false}
                  beforeUpload={handleFileUpload}
                  style={{ padding: 24 }}
                >
                  <p className="ant-upload-drag-icon">
                    <InboxOutlined style={{ fontSize: 48, color: "#1677ff" }} />
                  </p>
                  <p className="ant-upload-text">اضغط لاختيار ملف CSV</p>
                  <p className="ant-upload-hint">أو اسحب الملف وأفلته هنا</p>
                </Dragger>
              </div>

              {/* Preview & Mapping */}
              {importData && importData.length > 0 && (
                <>
                  <div style={{ marginBottom: 24 }}>
                    <label style={{ display: "block", marginBottom: 12, fontWeight: 500 }}>
                      ربط الحقول ({importData.length} سجل)
                    </label>
                    <Table
                      dataSource={importHeaders.map((h) => ({ key: h, header: h }))}
                      columns={mappingColumns}
                      pagination={false}
                      size="small"
                    />
                  </div>

                  {/* Import Button */}
                  <Button
                    type="primary"
                    size="large"
                    icon={<CloudUploadOutlined />}
                    onClick={handleImport}
                    disabled={loading || Object.values(fieldMapping).filter(Boolean).length === 0}
                    loading={loading}
                    style={{ background: "#16a34a" }}
                  >
                    استيراد {importData.length} سجل
                  </Button>
                </>
              )}

              {/* Import Result */}
              {importResult && (
                <Alert
                  style={{ marginTop: 24 }}
                  type={importResult.totalErrors > 0 ? "warning" : "success"}
                  icon={importResult.totalErrors > 0 ? <WarningOutlined /> : <CheckCircleOutlined />}
                  showIcon
                  message={`تم استيراد ${importResult.imported} سجل بنجاح`}
                  description={
                    importResult.errors.length > 0 && (
                      <div style={{ maxHeight: 150, overflow: "auto", marginTop: 8 }}>
                        <div style={{ fontWeight: 500, marginBottom: 8 }}>الأخطاء:</div>
                        {importResult.errors.map((err, i) => (
                          <div key={i} style={{ color: "#dc2626", fontSize: 13 }}>
                            سطر {err.row}: {err.error}
                          </div>
                        ))}
                      </div>
                    )
                  }
                />
              )}
            </>
          )}
        </div>
      ),
    },
  ];

  return (
    <div style={{ padding: 24 }}>
      <PageHeader
        title="استيراد وتصدير البيانات"
        subtitle="استيراد وتصدير البيانات بصيغ CSV و JSON"
        breadcrumbs={[
          { label: "الرئيسية", path: "/" },
          { label: "استيراد وتصدير البيانات" },
        ]}
      />

      {/* Stats */}
      {stats && (
        <Row gutter={[12, 12]} style={{ marginBottom: 24 }}>
          {STAT_ITEMS.map(({ key, label, icon }) => (
            <Col xs={12} sm={8} md={4} key={key}>
              <Card size="small" style={{ textAlign: "center" }}>
                <div style={{ fontSize: 24 }}>{icon}</div>
                <Statistic
                  value={(stats as any)[key] || 0}
                  valueStyle={{ fontSize: 20 }}
                />
                <div style={{ fontSize: 12, color: "#64748b" }}>{label}</div>
              </Card>
            </Col>
          ))}
        </Row>
      )}

      {/* Tabs */}
      <Card>
        <Tabs activeKey={activeTab} onChange={setActiveTab} items={tabItems} />
      </Card>
    </div>
  );
}
