/**
 * صفحة نتائج البحث
 */
import { useState, useEffect } from "react";
import { useSearchParams, Link } from "react-router-dom";
import {
  Row,
  Col,
  Card,
  Button,
  Input,
  Tag,
  Space,
  Empty,
  Spin,
  List,
  Typography,
} from "antd";
import {
  SearchOutlined,
  RightOutlined,
} from "@ant-design/icons";
import { PageHeader } from "../components/shared";
import { API_BASE, getAuthHeaders } from "../utils/api";

const { Text } = Typography;

interface SearchResult {
  type: string;
  id: string;
  title: string;
  subtitle?: string;
  description?: string;
  url: string;
  icon: string;
  metadata?: Record<string, any>;
}

interface SearchType {
  id: string;
  label: string;
  icon: string;
}

const TYPE_LABELS: Record<string, string> = {
  product: "منتج",
  serial: "سيريال",
  customer: "عميل",
  supplier: "مورد",
  invoice: "فاتورة",
  purchase: "طلب شراء",
  maintenance: "صيانة",
  user: "مستخدم",
};

const TYPE_COLORS: Record<string, string> = {
  product: "blue",
  serial: "purple",
  customer: "green",
  supplier: "orange",
  invoice: "gold",
  purchase: "cyan",
  maintenance: "red",
  user: "magenta",
};

export default function SearchResults() {
  const [searchParams, setSearchParams] = useSearchParams();
  const query = searchParams.get("q") || "";
  const typeFilter = searchParams.get("type") || "";

  const [results, setResults] = useState<SearchResult[]>([]);
  const [types, setTypes] = useState<SearchType[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchInput, setSearchInput] = useState(query);

  useEffect(() => {
    fetch(`${API_BASE}/api/search/types`)
      .then((res) => res.json())
      .then(setTypes)
      .catch(console.error);
  }, []);

  useEffect(() => {
    if (query) {
      performSearch();
    }
  }, [query, typeFilter]);

  const performSearch = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ q: query, limit: "100" });
      if (typeFilter) params.set("type", typeFilter);

      const res = await fetch(`${API_BASE}/api/search?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setResults(data.results);
      }
    } catch (error) {
      console.error("Search error:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchInput.trim()) {
      setSearchParams({
        q: searchInput.trim(),
        ...(typeFilter ? { type: typeFilter } : {}),
      });
    }
  };

  const setTypeFilterParam = (type: string) => {
    const params: Record<string, string> = { q: query };
    if (type) params.type = type;
    setSearchParams(params);
  };

  // تجميع النتائج حسب النوع
  const groupedResults = results.reduce((acc, result) => {
    if (!acc[result.type]) acc[result.type] = [];
    acc[result.type].push(result);
    return acc;
  }, {} as Record<string, SearchResult[]>);

  return (
    <div style={{ padding: 24 }}>
      <PageHeader
        title="نتائج البحث"
        subtitle="البحث في جميع أقسام النظام"
        breadcrumbs={[{ title: "البحث" }]}
      />

      {/* Search Header */}
      <Card style={{ marginBottom: 24 }}>
        <form onSubmit={handleSearch}>
          <Row gutter={16} align="middle">
            <Col flex="1">
              <Input
                size="large"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="ابحث في النظام..."
                prefix={<SearchOutlined style={{ color: "#bfbfbf", fontSize: 18 }} />}
                allowClear
              />
            </Col>
            <Col>
              <Button type="primary" size="large" htmlType="submit" icon={<SearchOutlined />}>
                بحث
              </Button>
            </Col>
          </Row>
        </form>

        {/* Type Filters */}
        <div style={{ marginTop: 16 }}>
          <Space size={8} wrap>
            <Text type="secondary">فلتر حسب النوع:</Text>
            <Tag.CheckableTag
              checked={!typeFilter}
              onChange={() => setTypeFilterParam("")}
            >
              الكل
            </Tag.CheckableTag>
            {types.map((type) => (
              <Tag.CheckableTag
                key={type.id}
                checked={typeFilter === type.id}
                onChange={() => setTypeFilterParam(type.id)}
              >
                {type.icon} {type.label}
              </Tag.CheckableTag>
            ))}
          </Space>
        </div>
      </Card>

      {/* Results */}
      {loading ? (
        <Card>
          <div style={{ textAlign: "center", padding: 48 }}>
            <Spin size="large" />
            <Text type="secondary" style={{ display: "block", marginTop: 16 }}>
              جاري البحث...
            </Text>
          </div>
        </Card>
      ) : !query ? (
        <Card>
          <Empty
            image={<SearchOutlined style={{ fontSize: 64, color: "#d9d9d9" }} />}
            description={
              <Text type="secondary">أدخل كلمة البحث للبدء</Text>
            }
          />
        </Card>
      ) : results.length === 0 ? (
        <Card>
          <Empty
            description={
              <div>
                <Text type="secondary">لا توجد نتائج لـ "{query}"</Text>
                <br />
                <Text type="secondary" style={{ fontSize: 13 }}>
                  جرب كلمات بحث مختلفة
                </Text>
              </div>
            }
          />
        </Card>
      ) : typeFilter ? (
        // عرض نتائج نوع واحد
        <Card
          title={`نتائج البحث (${results.length})`}
          styles={{ body: { padding: 0 } }}
        >
          <List
            dataSource={results}
            renderItem={(result) => <ResultItem result={result} />}
          />
        </Card>
      ) : (
        // عرض مجمع حسب النوع
        <Space direction="vertical" size={24} style={{ width: "100%" }}>
          <Text type="secondary">
            تم العثور على {results.length} نتيجة لـ "{query}"
          </Text>

          {Object.entries(groupedResults).map(([type, items]) => (
            <Card
              key={type}
              title={
                <Space>
                  <Tag color={TYPE_COLORS[type] || "default"}>
                    {TYPE_LABELS[type] || type}
                  </Tag>
                  <Text type="secondary">({items.length})</Text>
                </Space>
              }
              extra={
                items.length > 5 && (
                  <Button
                    type="link"
                    size="small"
                    onClick={() => setTypeFilterParam(type)}
                  >
                    عرض الكل
                  </Button>
                )
              }
              styles={{ body: { padding: 0 } }}
            >
              <List
                dataSource={items.slice(0, 5)}
                renderItem={(result) => <ResultItem result={result} />}
              />
            </Card>
          ))}
        </Space>
      )}
    </div>
  );
}

/**
 * بطاقة النتيجة
 */
function ResultItem({ result }: { result: SearchResult }) {
  return (
    <Link to={result.url} style={{ display: "block" }}>
      <List.Item
        style={{ padding: "12px 16px", cursor: "pointer" }}
        extra={<RightOutlined style={{ color: "#d9d9d9" }} />}
      >
        <List.Item.Meta
          avatar={<span style={{ fontSize: 28 }}>{result.icon}</span>}
          title={
            <Space>
              <Text strong>{result.title}</Text>
              {result.metadata?.price && (
                <Text style={{ color: "#1677ff", fontWeight: 500 }}>
                  {Number(result.metadata.price).toLocaleString()} IQD
                </Text>
              )}
              {result.metadata?.status && (
                <Tag>{result.metadata.status}</Tag>
              )}
            </Space>
          }
          description={
            <div>
              {result.subtitle && (
                <Text type="secondary" style={{ fontSize: 13 }}>
                  {result.subtitle}
                </Text>
              )}
              {result.description && (
                <Text type="secondary" style={{ fontSize: 12, display: "block" }}>
                  {result.description}
                </Text>
              )}
            </div>
          }
        />
      </List.Item>
    </Link>
  );
}
