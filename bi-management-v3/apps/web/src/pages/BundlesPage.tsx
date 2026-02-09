/**
 * صفحة إدارة الحزم والعروض
 */
import { useState, useEffect } from "react";
import {
  Row,
  Col,
  Card,
  Tag,
  Space,
  message,
  Statistic,
  Typography,
  Button,
  Empty,
  Modal,
  Form,
  Input,
  InputNumber,
  Select,
  DatePicker,
  Popconfirm,
  Badge,
  Divider,
  Tooltip,
} from "antd";
import {
  GiftOutlined,
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  CalendarOutlined,
  ShoppingCartOutlined,
  PercentageOutlined,
  TagOutlined,
  ReloadOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  FireOutlined,
} from "@ant-design/icons";
import { PageHeader, LoadingSkeleton, MoneyDisplay, DateDisplay } from "../components/shared";
import { API_BASE, getAuthHeaders } from "../utils/api";
import dayjs from "dayjs";

const { Text, Title } = Typography;
const { RangePicker } = DatePicker;

/* ---------- أنواع البيانات ---------- */

interface BundleItem {
  productId: string;
  productName: string;
  quantity: number;
  originalPrice: number;
}

interface Bundle {
  id: string;
  name: string;
  description?: string;
  items: BundleItem[];
  originalPrice: number;
  bundlePrice: number;
  discountPercent: number;
  startDate: string;
  endDate: string;
  usageCount: number;
  maxUsage?: number;
  isActive: boolean;
}

interface BundleStats {
  totalBundles: number;
  activeBundles: number;
  totalUsed: number;
  avgDiscount: number;
}

interface ProductOption {
  id: string;
  name: string;
  price: number;
}

/* ---------- المكوّن ---------- */

export default function BundlesPage() {
  const [bundles, setBundles] = useState<Bundle[]>([]);
  const [stats, setStats] = useState<BundleStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editingBundle, setEditingBundle] = useState<Bundle | null>(null);
  const [form] = Form.useForm();
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [bundlesRes, statsRes] = await Promise.all([
        fetch(`${API_BASE}/api/bundles`, { headers: getAuthHeaders() }),
        fetch(`${API_BASE}/api/bundles/stats/summary`, { headers: getAuthHeaders() }),
      ]);

      if (bundlesRes.ok) {
        const data = await bundlesRes.json();
        setBundles(data.bundles ?? data ?? []);
      }
      if (statsRes.ok) {
        setStats(await statsRes.json());
      }
    } catch (error) {
      console.error(error);
      message.error("فشل في تحميل البيانات");
    } finally {
      setLoading(false);
    }
  };

  const loadProducts = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/products?limit=200`, {
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        const data = await res.json();
        setProducts(data.data ?? data.products ?? data ?? []);
      }
    } catch (error) {
      console.error(error);
    }
  };

  const openCreateModal = () => {
    setEditingBundle(null);
    form.resetFields();
    loadProducts();
    setShowModal(true);
  };

  const openEditModal = (bundle: Bundle) => {
    setEditingBundle(bundle);
    loadProducts();
    form.setFieldsValue({
      name: bundle.name,
      description: bundle.description,
      bundlePrice: bundle.bundlePrice,
      productIds: bundle.items?.map((i) => i.productId) ?? [],
      dates: bundle.startDate && bundle.endDate ? [dayjs(bundle.startDate), dayjs(bundle.endDate)] : undefined,
      maxUsage: bundle.maxUsage,
    });
    setShowModal(true);
  };

  const handleSave = async (values: any) => {
    setSaving(true);
    try {
      const body = {
        name: values.name,
        description: values.description,
        bundlePrice: values.bundlePrice,
        productIds: values.productIds,
        startDate: values.dates?.[0]?.toISOString(),
        endDate: values.dates?.[1]?.toISOString(),
        maxUsage: values.maxUsage,
      };

      const url = editingBundle
        ? `${API_BASE}/api/bundles/${editingBundle.id}`
        : `${API_BASE}/api/bundles`;
      const method = editingBundle ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: getAuthHeaders(),
        body: JSON.stringify(body),
      });

      if (res.ok) {
        message.success(editingBundle ? "تم تحديث الحزمة بنجاح" : "تم إنشاء الحزمة بنجاح");
        setShowModal(false);
        form.resetFields();
        setEditingBundle(null);
        loadData();
      } else {
        const err = await res.text();
        message.error(err || "فشل في حفظ الحزمة");
      }
    } catch (error) {
      console.error(error);
      message.error("حدث خطأ أثناء الحفظ");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`${API_BASE}/api/bundles/${id}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        message.success("تم حذف الحزمة بنجاح");
        loadData();
      } else {
        message.error("فشل في حذف الحزمة");
      }
    } catch (error) {
      console.error(error);
      message.error("حدث خطأ أثناء الحذف");
    }
  };

  /* ---- حالة الحزمة ---- */
  const getBundleStatus = (bundle: Bundle) => {
    const now = dayjs();
    if (!bundle.isActive) return { color: "default" as const, label: "غير فعّال", icon: <ClockCircleOutlined /> };
    if (dayjs(bundle.endDate).isBefore(now)) return { color: "red" as const, label: "منتهي", icon: <ClockCircleOutlined /> };
    if (dayjs(bundle.startDate).isAfter(now)) return { color: "blue" as const, label: "قادم", icon: <CalendarOutlined /> };
    return { color: "green" as const, label: "فعّال", icon: <CheckCircleOutlined /> };
  };

  /* ---- العرض ---- */
  if (loading && bundles.length === 0) {
    return (
      <div style={{ padding: 24 }}>
        <LoadingSkeleton type="list" rows={6} />
      </div>
    );
  }

  return (
    <div style={{ padding: 24 }}>
      <PageHeader
        title="الحزم والعروض"
        subtitle="إنشاء وإدارة حزم المنتجات والعروض الترويجية"
        breadcrumbs={[{ title: "الحزم والعروض" }]}
        extra={
          <Space>
            <Button icon={<ReloadOutlined />} onClick={loadData} loading={loading}>
              تحديث
            </Button>
            <Button type="primary" icon={<PlusOutlined />} onClick={openCreateModal}>
              إنشاء حزمة
            </Button>
          </Space>
        }
      />

      {/* الإحصائيات */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={12} sm={6}>
          <Card style={{ background: "linear-gradient(135deg, #667eea, #764ba2)" }}>
            <Statistic
              title={<span style={{ color: "rgba(255,255,255,0.9)" }}>إجمالي الحزم</span>}
              value={stats?.totalBundles ?? bundles.length}
              valueStyle={{ color: "#fff", fontSize: "1.8rem", fontWeight: 700 }}
              prefix={<GiftOutlined />}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card style={{ background: "linear-gradient(135deg, #43e97b, #38f9d7)" }}>
            <Statistic
              title={<span style={{ color: "rgba(255,255,255,0.9)" }}>الحزم الفعالة</span>}
              value={stats?.activeBundles ?? bundles.filter((b) => b.isActive).length}
              valueStyle={{ color: "#fff", fontSize: "1.8rem", fontWeight: 700 }}
              prefix={<CheckCircleOutlined />}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card style={{ background: "linear-gradient(135deg, #4facfe, #00f2fe)" }}>
            <Statistic
              title={<span style={{ color: "rgba(255,255,255,0.9)" }}>إجمالي الاستخدام</span>}
              value={stats?.totalUsed ?? bundles.reduce((s, b) => s + b.usageCount, 0)}
              valueStyle={{ color: "#fff", fontSize: "1.8rem", fontWeight: 700 }}
              prefix={<ShoppingCartOutlined />}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card style={{ background: "linear-gradient(135deg, #f093fb, #f5576c)" }}>
            <Statistic
              title={<span style={{ color: "rgba(255,255,255,0.9)" }}>متوسط الخصم</span>}
              value={stats?.avgDiscount ?? 0}
              valueStyle={{ color: "#fff", fontSize: "1.8rem", fontWeight: 700 }}
              prefix={<PercentageOutlined />}
              precision={1}
              suffix="%"
            />
          </Card>
        </Col>
      </Row>

      {/* بطاقات الحزم */}
      {bundles.length === 0 ? (
        <Card>
          <Empty
            image={<GiftOutlined style={{ fontSize: 64, color: "#d9d9d9" }} />}
            description="لا توجد حزم حالياً"
          >
            <Button type="primary" icon={<PlusOutlined />} onClick={openCreateModal}>
              إنشاء أول حزمة
            </Button>
          </Empty>
        </Card>
      ) : (
        <Row gutter={[16, 16]}>
          {bundles.map((bundle) => {
            const status = getBundleStatus(bundle);
            return (
              <Col xs={24} sm={12} lg={8} key={bundle.id}>
                <Badge.Ribbon
                  text={`${bundle.discountPercent.toFixed(0)}% خصم`}
                  color="red"
                >
                  <Card
                    hoverable
                    actions={[
                      <Tooltip key="edit" title="تعديل">
                        <Button
                          type="text"
                          icon={<EditOutlined />}
                          onClick={() => openEditModal(bundle)}
                        />
                      </Tooltip>,
                      <Popconfirm
                        key="delete"
                        title="حذف الحزمة"
                        description="هل أنت متأكد من حذف هذه الحزمة؟"
                        onConfirm={() => handleDelete(bundle.id)}
                        okText="حذف"
                        cancelText="إلغاء"
                        okButtonProps={{ danger: true }}
                      >
                        <Tooltip title="حذف">
                          <Button type="text" danger icon={<DeleteOutlined />} />
                        </Tooltip>
                      </Popconfirm>,
                    ]}
                  >
                    {/* العنوان والحالة */}
                    <div style={{ marginBottom: 12 }}>
                      <Space style={{ marginBottom: 4 }}>
                        <Title level={5} style={{ margin: 0 }}>
                          {bundle.name}
                        </Title>
                      </Space>
                      <div>
                        <Tag color={status.color} icon={status.icon}>
                          {status.label}
                        </Tag>
                      </div>
                    </div>

                    {/* المنتجات */}
                    <div style={{ marginBottom: 12 }}>
                      <Text type="secondary" style={{ fontSize: 12, display: "block", marginBottom: 4 }}>
                        المنتجات:
                      </Text>
                      <Space wrap size={4}>
                        {bundle.items?.slice(0, 4).map((item, idx) => (
                          <Tag key={idx} icon={<TagOutlined />}>
                            {item.productName}
                            {item.quantity > 1 ? ` ×${item.quantity}` : ""}
                          </Tag>
                        ))}
                        {bundle.items?.length > 4 && (
                          <Tag>+{bundle.items.length - 4} أخرى</Tag>
                        )}
                      </Space>
                    </div>

                    <Divider style={{ margin: "12px 0" }} />

                    {/* الأسعار */}
                    <Row gutter={16} style={{ marginBottom: 12 }}>
                      <Col span={12}>
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          السعر الأصلي
                        </Text>
                        <div style={{ textDecoration: "line-through", color: "#9ca3af" }}>
                          <MoneyDisplay amount={bundle.originalPrice} />
                        </div>
                      </Col>
                      <Col span={12}>
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          سعر الحزمة
                        </Text>
                        <div style={{ color: "#059669", fontWeight: 700 }}>
                          <MoneyDisplay amount={bundle.bundlePrice} />
                        </div>
                      </Col>
                    </Row>

                    {/* التاريخ والاستخدام */}
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        fontSize: 12,
                        color: "#6b7280",
                      }}
                    >
                      <Space size={4}>
                        <CalendarOutlined />
                        <DateDisplay date={bundle.startDate} />
                        <span>-</span>
                        <DateDisplay date={bundle.endDate} />
                      </Space>
                      <Tooltip title="عدد مرات الاستخدام">
                        <Space size={4}>
                          <FireOutlined style={{ color: "#d97706" }} />
                          <span>{bundle.usageCount}</span>
                          {bundle.maxUsage && <span>/ {bundle.maxUsage}</span>}
                        </Space>
                      </Tooltip>
                    </div>
                  </Card>
                </Badge.Ribbon>
              </Col>
            );
          })}
        </Row>
      )}

      {/* مودال إنشاء/تعديل */}
      <Modal
        title={
          <Space>
            <GiftOutlined style={{ color: "#1677ff" }} />
            <span>{editingBundle ? "تعديل الحزمة" : "إنشاء حزمة جديدة"}</span>
          </Space>
        }
        open={showModal}
        onCancel={() => {
          setShowModal(false);
          setEditingBundle(null);
          form.resetFields();
        }}
        footer={null}
        width={560}
      >
        <Form form={form} layout="vertical" onFinish={handleSave}>
          <Form.Item
            name="name"
            label="اسم الحزمة"
            rules={[{ required: true, message: "اسم الحزمة مطلوب" }]}
          >
            <Input placeholder="مثال: عرض الصيف - 3 أجهزة" />
          </Form.Item>

          <Form.Item name="description" label="الوصف">
            <Input.TextArea rows={2} placeholder="وصف الحزمة..." />
          </Form.Item>

          <Form.Item
            name="productIds"
            label="المنتجات"
            rules={[{ required: true, message: "اختر منتجاً واحداً على الأقل" }]}
          >
            <Select
              mode="multiple"
              placeholder="اختر المنتجات"
              showSearch
              optionFilterProp="label"
              options={products.map((p) => ({
                value: p.id,
                label: `${p.name} - ${Number(p.price).toLocaleString("ar-IQ")} د.ع`,
              }))}
            />
          </Form.Item>

          <Form.Item
            name="bundlePrice"
            label="سعر الحزمة (د.ع)"
            rules={[{ required: true, message: "سعر الحزمة مطلوب" }]}
          >
            <InputNumber
              style={{ width: "100%" }}
              min={0}
              placeholder="سعر الحزمة"
              formatter={(v) => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")}
              parser={(v) => Number(v?.replace(/,/g, "") ?? 0)}
            />
          </Form.Item>

          <Form.Item
            name="dates"
            label="فترة العرض"
            rules={[{ required: true, message: "حدد فترة العرض" }]}
          >
            <RangePicker style={{ width: "100%" }} placeholder={["تاريخ البدء", "تاريخ الانتهاء"]} />
          </Form.Item>

          <Form.Item name="maxUsage" label="الحد الأقصى للاستخدام (اختياري)">
            <InputNumber style={{ width: "100%" }} min={1} placeholder="بدون حد" />
          </Form.Item>

          <div style={{ display: "flex", gap: 12, justifyContent: "flex-end", marginTop: 16 }}>
            <Button
              onClick={() => {
                setShowModal(false);
                setEditingBundle(null);
                form.resetFields();
              }}
            >
              إلغاء
            </Button>
            <Button type="primary" htmlType="submit" loading={saving}>
              {editingBundle ? "تحديث" : "إنشاء"}
            </Button>
          </div>
        </Form>
      </Modal>
    </div>
  );
}
