/**
 * صفحة تفاصيل التصنيف
 */
import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import {
  Row,
  Col,
  Card,
  Descriptions,
  Button,
  Tag,
  Space,
  Statistic,
  Table,
  Input,
  Alert,
  message,
} from "antd";
import {
  EditOutlined,
  PrinterOutlined,
  FolderOutlined,
  AppstoreOutlined,
  ArrowRightOutlined,
} from "@ant-design/icons";
import { PageHeader, StatusTag, MoneyDisplay, DateDisplay, LoadingSkeleton } from "../components/shared";
import { API_BASE, getAuthHeaders } from "../utils/api";

const { Search } = Input;

type Category = {
  id: string;
  code: string | null;
  name: string;
  nameAr: string | null;
  parentId: string | null;
  description: string | null;
  isActive: number | null;
  createdAt: string;
  parent?: { id: string; name: string; nameAr: string | null };
  _count?: { products: number; children: number };
};

type Product = {
  id: string;
  sku: string;
  name: string;
  nameAr: string | null;
  unitPrice: number | string;
  isActive: number | null;
};

type ChildCategory = {
  id: string;
  code: string | null;
  name: string;
  nameAr: string | null;
  isActive: number | null;
  _count?: { products: number };
};

export default function CategoryDetail() {
  const { id } = useParams<{ id: string }>();
  const [category, setCategory] = useState<Category | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [children, setChildren] = useState<ChildCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  useEffect(() => {
    document.title = "تفاصيل التصنيف | BI Management v3";

    const fetchData = async () => {
      try {
        // Fetch category details
        const catRes = await fetch(`${API_BASE}/api/categories/${id}`, { headers: getAuthHeaders() });
        if (!catRes.ok) throw new Error("فشل تحميل بيانات التصنيف");
        const catData = await catRes.json();
        setCategory(catData);

        // Fetch products in this category
        const prodRes = await fetch(`${API_BASE}/api/products?categoryId=${id}&limit=50`, { headers: getAuthHeaders() });
        if (prodRes.ok) {
          const prodData = await prodRes.json();
          setProducts(prodData.data || []);
        }

        // Fetch child categories
        const childRes = await fetch(`${API_BASE}/api/categories?parentId=${id}&limit=50`, { headers: getAuthHeaders() });
        if (childRes.ok) {
          const childData = await childRes.json();
          setChildren(childData.data || []);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "حدث خطأ");
        message.error("فشل في تحميل بيانات التصنيف");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id]);

  if (loading) {
    return <LoadingSkeleton type="detail" />;
  }

  if (error || !category) {
    return (
      <div style={{ padding: "2rem" }}>
        <Alert
          type="error"
          message={error || "التصنيف غير موجود"}
          action={
            <Link to="/categories">
              <Button type="link">العودة للتصنيفات</Button>
            </Link>
          }
        />
      </div>
    );
  }

  const activeProducts = products.filter((p) => p.isActive === 1).length;
  const totalValue = products.reduce((sum, p) => sum + Number(p.unitPrice || 0), 0);

  const filteredProducts = products.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.nameAr?.includes(search) ||
      p.sku.toLowerCase().includes(search.toLowerCase())
  );

  const breadcrumbs = [
    { title: "التصنيفات", path: "/categories" },
    { title: category.nameAr || category.name },
  ];

  const productsColumns = [
    {
      title: "SKU",
      dataIndex: "sku",
      key: "sku",
      render: (val: string) => <code style={{ color: "#8c8c8c" }}>{val}</code>,
    },
    {
      title: "المنتج",
      dataIndex: "name",
      key: "name",
      render: (_: any, record: Product) => (
        <Link to={`/products/${record.id}`} style={{ fontWeight: 500 }}>
          {record.nameAr || record.name}
        </Link>
      ),
    },
    {
      title: "السعر",
      dataIndex: "unitPrice",
      key: "unitPrice",
      render: (val: number) => <MoneyDisplay amount={val} />,
    },
    {
      title: "الحالة",
      dataIndex: "isActive",
      key: "isActive",
      render: (val: number) => (
        <Tag color={val === 1 ? "success" : "error"}>
          {val === 1 ? "نشط" : "غير نشط"}
        </Tag>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title={category.nameAr || category.name}
        subtitle={category.nameAr ? category.name : undefined}
        breadcrumbs={breadcrumbs}
        extra={
          <Space>
            <Tag color={category.isActive === 1 ? "success" : "error"}>
              {category.isActive === 1 ? "نشط" : "غير نشط"}
            </Tag>
            {category.code && <Tag color="purple">{category.code}</Tag>}
            <Link to={`/categories/${id}/edit`}>
              <Button type="primary" icon={<EditOutlined />}>
                تعديل
              </Button>
            </Link>
            <Button icon={<PrinterOutlined />} onClick={() => window.print()}>
              طباعة
            </Button>
          </Space>
        }
      />

      {/* Stats */}
      <Row gutter={[16, 16]} style={{ marginBottom: "24px" }}>
        <Col xs={12} sm={6}>
          <Card>
            <Statistic
              title="عدد المنتجات"
              value={products.length}
              valueStyle={{ color: "#eb2f96" }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card>
            <Statistic
              title="منتج نشط"
              value={activeProducts}
              valueStyle={{ color: "#52c41a" }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card>
            <Statistic
              title="تصنيفات فرعية"
              value={children.length}
              valueStyle={{ color: "#722ed1" }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card>
            <Statistic
              title="مجموع الأسعار"
              value={totalValue}
              suffix="د.ع"
              valueStyle={{ color: "#1890ff" }}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={[24, 24]}>
        {/* Details */}
        <Col xs={24} md={12}>
          <Card
            title={
              <Space>
                <FolderOutlined />
                <span>معلومات التصنيف</span>
              </Space>
            }
          >
            <Descriptions column={1} size="small">
              <Descriptions.Item label="الكود">
                {category.code ? <code>{category.code}</code> : "-"}
              </Descriptions.Item>
              <Descriptions.Item label="الحالة">
                <Tag color={category.isActive === 1 ? "success" : "error"}>
                  {category.isActive === 1 ? "نشط" : "غير نشط"}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="تاريخ الإنشاء">
                <DateDisplay date={category.createdAt} />
              </Descriptions.Item>
              {category.description && (
                <Descriptions.Item label="الوصف">
                  {category.description}
                </Descriptions.Item>
              )}
            </Descriptions>
          </Card>
        </Col>

        {/* Parent Category */}
        <Col xs={24} md={12}>
          <Card
            title={
              <Space>
                <FolderOutlined />
                <span>التصنيف الأب</span>
              </Space>
            }
          >
            {category.parent ? (
              <Link
                to={`/categories/${category.parent.id}`}
                style={{ textDecoration: "none", color: "inherit" }}
              >
                <Card
                  size="small"
                  hoverable
                  style={{ background: "#fafafa" }}
                >
                  <Space>
                    <FolderOutlined style={{ fontSize: "24px", color: "#eb2f96" }} />
                    <div>
                      <div style={{ fontWeight: 600 }}>
                        {category.parent.nameAr || category.parent.name}
                      </div>
                      {category.parent.nameAr && (
                        <div style={{ fontSize: "12px", color: "#8c8c8c" }}>
                          {category.parent.name}
                        </div>
                      )}
                    </div>
                  </Space>
                </Card>
              </Link>
            ) : (
              <div style={{ textAlign: "center", padding: "16px", color: "#8c8c8c" }}>
                تصنيف رئيسي (لا يوجد تصنيف أب)
              </div>
            )}
          </Card>
        </Col>
      </Row>

      {/* Child Categories */}
      {children.length > 0 && (
        <Card
          title={
            <Space>
              <AppstoreOutlined />
              <span>التصنيفات الفرعية ({children.length})</span>
            </Space>
          }
          style={{ marginTop: "24px" }}
        >
          <Row gutter={[16, 16]}>
            {children.map((child) => (
              <Col xs={12} sm={8} md={6} key={child.id}>
                <Link
                  to={`/categories/${child.id}`}
                  style={{ textDecoration: "none", color: "inherit" }}
                >
                  <Card
                    size="small"
                    hoverable
                    style={{ height: "100%" }}
                  >
                    <div style={{ fontWeight: 500, marginBottom: "4px" }}>
                      {child.nameAr || child.name}
                    </div>
                    <Space style={{ width: "100%", justifyContent: "space-between" }}>
                      {child.code && (
                        <Tag style={{ margin: 0 }}>{child.code}</Tag>
                      )}
                      <span style={{ fontSize: "12px", color: "#8c8c8c" }}>
                        {child._count?.products || 0} منتج
                      </span>
                    </Space>
                  </Card>
                </Link>
              </Col>
            ))}
          </Row>
        </Card>
      )}

      {/* Products */}
      <Card
        title={
          <Space>
            <AppstoreOutlined />
            <span>منتجات التصنيف ({products.length})</span>
          </Space>
        }
        extra={
          <Search
            placeholder="بحث عن منتج..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ width: 250 }}
            allowClear
          />
        }
        style={{ marginTop: "24px" }}
      >
        <Table
          columns={productsColumns}
          dataSource={filteredProducts}
          rowKey="id"
          pagination={{ pageSize: 10 }}
          size="small"
          locale={{
            emptyText: products.length === 0
              ? "لا توجد منتجات في هذا التصنيف"
              : "لا توجد نتائج للبحث",
          }}
        />
      </Card>
    </div>
  );
}
