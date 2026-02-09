/**
 * صفحة إضافة أسعار الشراء
 * ─────────────────────────
 * المدير يضيف سعر الشراء لكل بند في الوجبة
 */

import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Row, Col, Card, Table, Button, InputNumber, Tag, Space, message, Statistic } from "antd";
import { DollarOutlined, SaveOutlined, ArrowRightOutlined, InfoCircleOutlined } from "@ant-design/icons";
import { PageHeader, LoadingSkeleton, MoneyDisplay } from "../components/shared";
import { API_BASE, getAuthHeaders } from "../utils/api";

interface BatchItem {
  id: string;
  productId?: string;
  productName: string;
  brand?: string;
  model?: string;
  specs?: string;
  quantity: number;
  unitCost?: number;
  totalCost?: number;
  product?: {
    id: string;
    name: string;
    code?: string;
  };
}

interface Batch {
  id: string;
  batchNumber: string;
  status: string;
  totalItems: number;
  notes?: string;
  createdAt: string;
}

interface Supplier {
  id: string;
  name: string;
}

export default function AddBatchPrices() {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const [batch, setBatch] = useState<Batch | null>(null);
  const [supplier, setSupplier] = useState<Supplier | null>(null);
  const [items, setItems] = useState<BatchItem[]>([]);
  const [prices, setPrices] = useState<Record<string, number>>({});
  
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
        
        // تهيئة الأسعار
        const initialPrices: Record<string, number> = {};
        data.items?.forEach((item: BatchItem) => {
          initialPrices[item.id] = item.unitCost || 0;
        });
        setPrices(initialPrices);
      } else {
        message.error("فشل في تحميل الوجبة");
      }
    } catch (err) {
      message.error("حدث خطأ في الاتصال");
    } finally {
      setLoading(false);
    }
  };

  const handlePriceChange = (itemId: string, value: number | null) => {
    setPrices({ ...prices, [itemId]: value || 0 });
  };

  const calculateTotal = () => {
    return items.reduce((sum, item) => {
      const unitCost = prices[item.id] || 0;
      return sum + unitCost * item.quantity;
    }, 0);
  };

  const handleSubmit = async () => {
    // التحقق من إدخال جميع الأسعار
    const missingPrices = items.filter((item) => !prices[item.id] || prices[item.id] <= 0);
    if (missingPrices.length > 0) {
      message.error("يرجى إدخال سعر الشراء لجميع المنتجات");
      return;
    }
    
    setSaving(true);
    
    try {
      const res = await fetch(`${API_BASE}/api/purchases/batches/${id}/prices`, {
        method: "PATCH",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          items: items.map((item) => ({
            itemId: item.id,
            unitCost: prices[item.id],
          })),
        }),
      });
      
      const data = await res.json();
      
      if (res.ok) {
        message.success("تم إضافة الأسعار بنجاح! الوجبة جاهزة للاستلام والفحص.");
        navigate("/purchases");
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

  if (batch.status !== "awaiting_prices") {
    return (
      <div style={{ textAlign: "center", padding: "48px 0" }}>
        <Tag color="warning" style={{ fontSize: 16, padding: "8px 16px" }}>
          لا يمكن إضافة الأسعار - الوجبة في حالة: {batch.status}
        </Tag>
        <br />
        <Button 
          type="link" 
          onClick={() => navigate("/purchases")}
          style={{ marginTop: 16 }}
        >
          العودة للوجبات
        </Button>
      </div>
    );
  }

  const columns = [
    {
      title: "المنتج",
      dataIndex: "productName",
      key: "productName",
      render: (_: any, record: BatchItem) => (
        <div>
          <div style={{ fontWeight: 500 }}>
            {record.product?.name || record.productName}
          </div>
          {record.brand && (
            <div style={{ fontSize: 12, color: "#666" }}>
              {record.brand} {record.model && `- ${record.model}`}
            </div>
          )}
        </div>
      ),
    },
    {
      title: "المواصفات",
      dataIndex: "specs",
      key: "specs",
      render: (specs: string) => specs || "-",
    },
    {
      title: "الكمية",
      dataIndex: "quantity",
      key: "quantity",
      align: "center" as const,
      render: (quantity: number) => (
        <Tag color="blue" style={{ fontSize: 14, padding: "4px 12px" }}>
          {quantity}
        </Tag>
      ),
    },
    {
      title: "سعر الوحدة",
      key: "unitCost",
      render: (_: any, record: BatchItem) => (
        <Space>
          <InputNumber
            min={0}
            step={1000}
            value={prices[record.id] || undefined}
            onChange={(value) => handlePriceChange(record.id, value)}
            placeholder="0"
            style={{ width: 140 }}
            formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")}
            parser={(value) => value?.replace(/,/g, "") as unknown as number}
          />
          <span style={{ color: "#666" }}>د.ع</span>
        </Space>
      ),
    },
    {
      title: "الإجمالي",
      key: "total",
      render: (_: any, record: BatchItem) => (
        <MoneyDisplay amount={(prices[record.id] || 0) * record.quantity} />
      ),
    },
  ];

  return (
    <div style={{ maxWidth: 1000, margin: "0 auto" }}>
      <PageHeader
        title="إضافة أسعار الشراء"
        subtitle="أدخل سعر الشراء لكل منتج في الوجبة"
        breadcrumbs={[
          { label: "المشتريات", href: "/purchases" },
          { label: batch.batchNumber },
          { label: "إضافة الأسعار" },
        ]}
      />

      {/* Batch Info */}
      <Card style={{ marginBottom: 24 }}>
        <Row gutter={[24, 16]}>
          <Col xs={12} md={6}>
            <Statistic title="رقم الوجبة" value={batch.batchNumber} />
          </Col>
          <Col xs={12} md={6}>
            <Statistic title="المورد" value={supplier?.name || "-"} />
          </Col>
          <Col xs={12} md={6}>
            <Statistic title="عدد الأجهزة" value={batch.totalItems} />
          </Col>
          <Col xs={12} md={6}>
            <div>
              <div style={{ color: "#666", marginBottom: 8 }}>الحالة</div>
              <Tag color="orange" icon={<InfoCircleOutlined />}>بانتظار الأسعار</Tag>
            </div>
          </Col>
        </Row>
        {batch.notes && (
          <div style={{ marginTop: 16, paddingTop: 16, borderTop: "1px solid #f0f0f0" }}>
            <div style={{ color: "#666", marginBottom: 4 }}>ملاحظات</div>
            <div>{batch.notes}</div>
          </div>
        )}
      </Card>

      {/* Items Table */}
      <Card style={{ marginBottom: 24 }}>
        <Table
          columns={columns}
          dataSource={items}
          rowKey="id"
          pagination={false}
        />
      </Card>

      {/* Total & Submit */}
      <Card>
        <Row justify="space-between" align="middle">
          <Col>
            <Space size="large">
              <span style={{ color: "#666" }}>إجمالي التكلفة:</span>
              <Statistic
                value={calculateTotal()}
                suffix="د.ع"
                valueStyle={{ color: "#52c41a", fontSize: 28 }}
                formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")}
              />
            </Space>
          </Col>
          <Col>
            <Space>
              <Button
                icon={<ArrowRightOutlined />}
                onClick={() => navigate("/purchases")}
              >
                إلغاء
              </Button>
              <Button
                type="primary"
                icon={<SaveOutlined />}
                loading={saving}
                onClick={handleSubmit}
              >
                حفظ الأسعار
              </Button>
            </Space>
          </Col>
        </Row>
      </Card>
    </div>
  );
}
