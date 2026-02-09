import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Row,
  Col,
  Card,
  Button,
  Input,
  Select,
  Form,
  Modal,
  Tag,
  Space,
  message,
  Statistic,
  Empty,
  Progress,
  InputNumber,
  DatePicker,
} from "antd";
import {
  PlusOutlined,
  BankOutlined,
  DollarOutlined,
  CalculatorOutlined,
  ExclamationCircleOutlined,
  HomeOutlined,
  SearchOutlined,
} from "@ant-design/icons";
import { PageHeader, MoneyDisplay, DateDisplay, LoadingSkeleton } from "../components/shared";
import { API_BASE, getAuthHeaders } from "../utils/api";
import dayjs from "dayjs";

type Asset = {
  id: string;
  code: string | null;
  name: string;
  nameAr: string | null;
  acquisitionDate: string | null;
  acquisitionCost: number;
  currentValue: number | null;
  accumulatedDepreciation: number | null;
  status: string | null;
  category: { id: string; name: string; nameAr: string | null } | null;
  branch: { id: string; name: string } | null;
  assignee: { id: string; name: string } | null;
};

type AssetStats = {
  totalAssets: number;
  activeAssets: number;
  totalCost: number;
  totalCurrentValue: number;
  totalDepreciation: number;
  disposedAssets: number;
  fullyDepreciated: number;
};

type Category = {
  id: string;
  code: string | null;
  name: string;
  nameAr: string | null;
};

const STATUS_CONFIG: Record<string, { color: string; text: string }> = {
  active: { color: "green", text: "نشط" },
  disposed: { color: "red", text: "مستبعد" },
  sold: { color: "blue", text: "مباع" },
  fully_depreciated: { color: "orange", text: "مستهلك بالكامل" },
  under_maintenance: { color: "purple", text: "تحت الصيانة" },
};

export default function Assets() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [stats, setStats] = useState<AssetStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [form] = Form.useForm();

  useEffect(() => {
    document.title = "الأصول الثابتة | BI Management v3";
  }, []);

  const loadData = () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.append("search", search);
    if (statusFilter) params.append("status", statusFilter);
    if (categoryFilter) params.append("categoryId", categoryFilter);

    Promise.all([
      fetch(`${API_BASE}/api/assets?${params}`, { headers: getAuthHeaders() }).then((r) => r.json()),
      fetch(`${API_BASE}/api/assets/stats`, { headers: getAuthHeaders() }).then((r) => r.json()),
      fetch(`${API_BASE}/api/assets/categories`, { headers: getAuthHeaders() }).then((r) => r.json()),
    ])
      .then(([assetsRes, statsRes, categoriesRes]) => {
        setAssets(assetsRes.items || []);
        setStats(statsRes);
        setCategories(categoriesRes.items || []);
      })
      .catch((e) => message.error(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
  }, [search, statusFilter, categoryFilter]);

  const handleSubmit = async (values: {
    name: string;
    nameAr?: string;
    categoryId?: string;
    acquisitionDate?: dayjs.Dayjs;
    acquisitionCost: number;
    usefulLifeYears?: number;
    salvageValue?: number;
    serialNumber?: string;
    location?: string;
  }) => {
    setSubmitting(true);
    try {
      const res = await fetch(`${API_BASE}/api/assets`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          ...values,
          acquisitionDate: values.acquisitionDate?.format("YYYY-MM-DD"),
        }),
      });

      if (!res.ok) throw new Error("Failed to create asset");

      message.success("تم إضافة الأصل بنجاح");
      setShowForm(false);
      form.resetFields();
      loadData();
    } catch (err) {
      message.error(err instanceof Error ? err.message : "حدث خطأ");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDepreciate = async (assetId: string) => {
    const now = new Date();
    const periodEnd = now.toISOString().split("T")[0];
    const periodStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0];

    Modal.confirm({
      title: "حساب الإهلاك",
      icon: <CalculatorOutlined />,
      content: "هل تريد حساب الإهلاك لهذا الأصل؟",
      okText: "حساب",
      cancelText: "إلغاء",
      onOk: async () => {
        try {
          const res = await fetch(`${API_BASE}/api/assets/${assetId}/depreciate`, {
            method: "POST",
            headers: getAuthHeaders(),
            body: JSON.stringify({ periodStart, periodEnd }),
          });

          const data = await res.json();
          if (!res.ok) throw new Error(data.error || "Failed");

          message.success(
            `تم حساب الإهلاك: ${data.depreciationAmount?.toLocaleString()} IQD - القيمة الجديدة: ${data.newValue?.toLocaleString()} IQD`
          );
          loadData();
        } catch (err) {
          message.error(err instanceof Error ? err.message : "حدث خطأ");
        }
      },
    });
  };

  const calculateDepreciationPercent = (asset: Asset) => {
    if (!asset.accumulatedDepreciation || !asset.acquisitionCost) return 0;
    return Math.round((asset.accumulatedDepreciation / asset.acquisitionCost) * 100);
  };

  return (
    <div>
      <PageHeader
        title="الأصول الثابتة"
        subtitle="إدارة وتتبع الأصول الثابتة والإهلاك"
        breadcrumbs={[
          { icon: <HomeOutlined />, title: "الرئيسية", path: "/" },
          { title: "الأصول الثابتة" },
        ]}
        extra={
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setShowForm(true)}>
            إضافة أصل
          </Button>
        }
      />

      {/* Form Modal */}
      <Modal
        title="إضافة أصل جديد"
        open={showForm}
        onCancel={() => setShowForm(false)}
        footer={null}
        width={600}
        destroyOnClose
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          initialValues={{ usefulLifeYears: 5, salvageValue: 0 }}
        >
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="name"
                label="الاسم"
                rules={[{ required: true, message: "الاسم مطلوب" }]}
              >
                <Input placeholder="اسم الأصل" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="nameAr" label="الاسم (عربي)">
                <Input placeholder="اسم الأصل بالعربية" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="categoryId" label="الفئة">
                <Select placeholder="اختر الفئة" allowClear>
                  {categories.map((cat) => (
                    <Select.Option key={cat.id} value={cat.id}>
                      {cat.nameAr || cat.name}
                    </Select.Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="acquisitionDate" label="تاريخ الاقتناء">
                <DatePicker style={{ width: "100%" }} placeholder="اختر التاريخ" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="acquisitionCost"
                label="تكلفة الاقتناء"
                rules={[{ required: true, message: "التكلفة مطلوبة" }]}
              >
                <InputNumber
                  style={{ width: "100%" }}
                  placeholder="0"
                  formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="usefulLifeYears" label="العمر الإنتاجي (سنوات)">
                <InputNumber style={{ width: "100%" }} min={1} max={100} />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="salvageValue" label="قيمة الخردة">
                <InputNumber
                  style={{ width: "100%" }}
                  placeholder="0"
                  formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="serialNumber" label="الرقم التسلسلي">
                <Input placeholder="الرقم التسلسلي" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="location" label="الموقع">
            <Input placeholder="موقع الأصل" />
          </Form.Item>

          <Form.Item style={{ marginBottom: 0, marginTop: 24 }}>
            <Space>
              <Button type="primary" htmlType="submit" loading={submitting}>
                حفظ الأصل
              </Button>
              <Button onClick={() => setShowForm(false)}>إلغاء</Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* Stats */}
      {stats && (
        <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
          <Col xs={12} sm={6}>
            <Card>
              <Statistic
                title="إجمالي الأصول"
                value={stats.totalAssets}
                valueStyle={{ color: "#1890ff" }}
                prefix={<BankOutlined />}
                suffix={<span style={{ fontSize: 14, color: "#52c41a" }}>{stats.activeAssets} نشط</span>}
              />
            </Card>
          </Col>
          <Col xs={12} sm={6}>
            <Card>
              <Statistic
                title="تكلفة الاقتناء"
                value={stats.totalCost}
                valueStyle={{ color: "#722ed1" }}
                prefix={<DollarOutlined />}
                suffix="IQD"
                formatter={(value) => value?.toLocaleString()}
              />
            </Card>
          </Col>
          <Col xs={12} sm={6}>
            <Card>
              <Statistic
                title="القيمة الدفترية"
                value={stats.totalCurrentValue}
                valueStyle={{ color: "#52c41a" }}
                prefix={<DollarOutlined />}
                suffix="IQD"
                formatter={(value) => value?.toLocaleString()}
              />
            </Card>
          </Col>
          <Col xs={12} sm={6}>
            <Card>
              <Statistic
                title="مجمع الإهلاك"
                value={stats.totalDepreciation}
                valueStyle={{ color: "#f5222d" }}
                prefix={<ExclamationCircleOutlined />}
                suffix="IQD"
                formatter={(value) => value?.toLocaleString()}
              />
            </Card>
          </Col>
        </Row>
      )}

      {/* Filters */}
      <Card style={{ marginBottom: 24 }}>
        <Space wrap>
          <Input
            placeholder="بحث بالاسم أو الكود..."
            prefix={<SearchOutlined />}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ width: 250 }}
            allowClear
          />
          <Select
            placeholder="جميع الفئات"
            value={categoryFilter || undefined}
            onChange={(value) => setCategoryFilter(value || "")}
            style={{ width: 180 }}
            allowClear
          >
            {categories.map((cat) => (
              <Select.Option key={cat.id} value={cat.id}>
                {cat.nameAr || cat.name}
              </Select.Option>
            ))}
          </Select>
          <Select
            placeholder="جميع الحالات"
            value={statusFilter || undefined}
            onChange={(value) => setStatusFilter(value || "")}
            style={{ width: 180 }}
            allowClear
          >
            <Select.Option value="active">نشط</Select.Option>
            <Select.Option value="fully_depreciated">مستهلك بالكامل</Select.Option>
            <Select.Option value="disposed">مستبعد</Select.Option>
            <Select.Option value="under_maintenance">تحت الصيانة</Select.Option>
          </Select>
        </Space>
      </Card>

      {/* Assets Grid */}
      {loading ? (
        <LoadingSkeleton />
      ) : assets.length === 0 ? (
        <Card>
          <Empty
            image={<BankOutlined style={{ fontSize: 64, color: "#d9d9d9" }} />}
            description="لا توجد أصول"
          />
        </Card>
      ) : (
        <Row gutter={[16, 16]}>
          {assets.map((asset) => {
            const depPercent = calculateDepreciationPercent(asset);
            const statusInfo = STATUS_CONFIG[asset.status || ""] || {
              color: "default",
              text: asset.status || "-",
            };

            return (
              <Col xs={24} sm={12} lg={8} key={asset.id}>
                <Card
                  hoverable
                  actions={
                    asset.status === "active"
                      ? [
                          <Button
                            key="depreciate"
                            type="link"
                            icon={<CalculatorOutlined />}
                            onClick={() => handleDepreciate(asset.id)}
                          >
                            حساب الإهلاك
                          </Button>,
                          <Link key="details" to={`/assets/${asset.id}`}>
                            <Button type="link">التفاصيل</Button>
                          </Link>,
                        ]
                      : [
                          <Link key="details" to={`/assets/${asset.id}`}>
                            <Button type="link">التفاصيل</Button>
                          </Link>,
                        ]
                  }
                >
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 16 }}>{asset.nameAr || asset.name}</div>
                      <div style={{ color: "#8c8c8c", fontFamily: "monospace", fontSize: 12 }}>
                        {asset.code}
                      </div>
                    </div>
                    <Tag color={statusInfo.color}>{statusInfo.text}</Tag>
                  </div>

                  <div style={{ marginBottom: 16 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                      <span style={{ color: "#8c8c8c", fontSize: 12 }}>الإهلاك</span>
                      <span style={{ fontSize: 12 }}>
                        {depPercent}% - <MoneyDisplay amount={asset.accumulatedDepreciation} />
                      </span>
                    </div>
                    <Progress
                      percent={depPercent}
                      showInfo={false}
                      strokeColor={asset.status === "fully_depreciated" ? "#f5222d" : "#722ed1"}
                      size="small"
                    />
                  </div>

                  <Row gutter={[8, 8]}>
                    <Col span={12}>
                      <div style={{ color: "#8c8c8c", fontSize: 12 }}>تكلفة الاقتناء</div>
                      <div style={{ fontWeight: 500 }}>
                        <MoneyDisplay amount={asset.acquisitionCost} />
                      </div>
                    </Col>
                    <Col span={12}>
                      <div style={{ color: "#8c8c8c", fontSize: 12 }}>القيمة الحالية</div>
                      <div style={{ fontWeight: 500, color: "#52c41a" }}>
                        <MoneyDisplay amount={asset.currentValue} />
                      </div>
                    </Col>
                    <Col span={12}>
                      <div style={{ color: "#8c8c8c", fontSize: 12 }}>الفئة</div>
                      <div style={{ fontWeight: 500 }}>
                        {asset.category?.nameAr || asset.category?.name || "-"}
                      </div>
                    </Col>
                    <Col span={12}>
                      <div style={{ color: "#8c8c8c", fontSize: 12 }}>تاريخ الاقتناء</div>
                      <div style={{ fontWeight: 500 }}>
                        <DateDisplay date={asset.acquisitionDate} />
                      </div>
                    </Col>
                  </Row>
                </Card>
              </Col>
            );
          })}
        </Row>
      )}
    </div>
  );
}
