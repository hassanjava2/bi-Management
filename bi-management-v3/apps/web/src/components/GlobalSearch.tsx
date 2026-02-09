/**
 * مكون البحث الشامل
 */
import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { API_BASE, getAuthHeaders } from "../utils/api";

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

export default function GlobalSearch() {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedType, setSelectedType] = useState<string>("");
  const [types, setTypes] = useState<SearchType[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // تحميل أنواع البحث
  useEffect(() => {
    fetch(`${API_BASE}/api/search/types`, { headers: getAuthHeaders() })
      .then((res) => res.json())
      .then(setTypes)
      .catch(console.error);
  }, []);

  // البحث عند تغيير النص
  useEffect(() => {
    if (query.length < 2) {
      setResults([]);
      return;
    }

    const timer = setTimeout(() => {
      performSearch();
    }, 300);

    return () => clearTimeout(timer);
  }, [query, selectedType]);

  // اختصار لوحة المفاتيح
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+K أو Cmd+K
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        setIsOpen(true);
        setTimeout(() => inputRef.current?.focus(), 100);
      }

      // Escape
      if (e.key === "Escape") {
        setIsOpen(false);
        setQuery("");
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  // إغلاق عند النقر خارج
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  const performSearch = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ q: query });
      if (selectedType) params.set("type", selectedType);

      const res = await fetch(`${API_BASE}/api/search?${params.toString()}`, { headers: getAuthHeaders() });
      if (res.ok) {
        const data = await res.json();
        setResults(data.results);
        setSelectedIndex(0);
      }
    } catch (error) {
      console.error("Search error:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter" && results[selectedIndex]) {
      e.preventDefault();
      goToResult(results[selectedIndex]);
    }
  };

  const goToResult = (result: SearchResult) => {
    setIsOpen(false);
    setQuery("");
    navigate(result.url);
  };

  return (
    <>
      {/* زر البحث */}
      <button
        onClick={() => {
          setIsOpen(true);
          setTimeout(() => inputRef.current?.focus(), 100);
        }}
        className="flex items-center gap-2 px-3 py-2 text-gray-400 hover:text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
        aria-label="فتح البحث"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <span className="text-sm hidden md:inline">بحث...</span>
        <kbd className="hidden md:inline px-1.5 py-0.5 text-xs bg-white border border-gray-300 rounded">Ctrl+K</kbd>
      </button>

      {/* Modal البحث */}
      {isOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          {/* Backdrop */}
          <div className="fixed inset-0 bg-black/50" onClick={() => setIsOpen(false)} />

          {/* Search Container */}
          <div className="relative min-h-screen flex items-start justify-center pt-20 px-4">
            <div
              ref={containerRef}
              className="relative w-full max-w-2xl bg-white rounded-xl shadow-2xl overflow-hidden"
            >
              {/* Search Input */}
              <div className="flex items-center border-b border-gray-200">
                <div className="pr-4">
                  <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <input
                  ref={inputRef}
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="ابحث في المنتجات، السيريالات، العملاء..."
                  className="flex-1 py-4 text-lg outline-none"
                  aria-label="البحث في النظام"
                  autoFocus
                />
                {loading && (
                  <div className="pl-4">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600" role="status" aria-label="جاري البحث" />
                  </div>
                )}
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-4 text-gray-400 hover:text-gray-600"
                  aria-label="إغلاق البحث"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Filters */}
              <div className="flex items-center gap-2 p-3 border-b border-gray-100 bg-gray-50">
                <span className="text-sm text-gray-500">فلتر:</span>
                <button
                  onClick={() => setSelectedType("")}
                  className={`px-2 py-1 text-xs rounded-lg transition-colors ${
                    !selectedType ? "bg-blue-600 text-white" : "bg-white text-gray-600 hover:bg-gray-100"
                  }`}
                >
                  الكل
                </button>
                {types.slice(0, 5).map((type) => (
                  <button
                    key={type.id}
                    onClick={() => setSelectedType(type.id)}
                    className={`px-2 py-1 text-xs rounded-lg transition-colors ${
                      selectedType === type.id ? "bg-blue-600 text-white" : "bg-white text-gray-600 hover:bg-gray-100"
                    }`}
                  >
                    {type.icon} {type.label}
                  </button>
                ))}
              </div>

              {/* Results */}
              <div className="max-h-96 overflow-y-auto">
                {query.length < 2 ? (
                  <div className="p-8 text-center text-gray-500">
                    <svg className="w-12 h-12 mx-auto mb-3 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    <p>اكتب حرفين على الأقل للبحث</p>
                    <p className="text-sm mt-2">
                      يمكنك البحث في المنتجات، السيريالات، العملاء، الموردين، والمزيد
                    </p>
                  </div>
                ) : results.length === 0 && !loading ? (
                  <div className="p-8 text-center text-gray-500">
                    <svg className="w-12 h-12 mx-auto mb-3 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <p>لا توجد نتائج لـ "{query}"</p>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-100">
                    {results.map((result, index) => (
                      <button
                        key={`${result.type}-${result.id}`}
                        onClick={() => goToResult(result)}
                        className={`w-full flex items-center gap-4 p-4 text-right hover:bg-gray-50 transition-colors ${
                          index === selectedIndex ? "bg-blue-50" : ""
                        }`}
                      >
                        <span className="text-2xl">{result.icon}</span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-gray-900 truncate">{result.title}</p>
                            <span className="px-1.5 py-0.5 text-xs bg-gray-100 text-gray-600 rounded">
                              {TYPE_LABELS[result.type] || result.type}
                            </span>
                          </div>
                          {result.subtitle && (
                            <p className="text-sm text-gray-500 truncate">{result.subtitle}</p>
                          )}
                          {result.description && (
                            <p className="text-xs text-gray-400 truncate">{result.description}</p>
                          )}
                        </div>
                        <svg className="w-5 h-5 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between p-3 border-t border-gray-100 bg-gray-50 text-xs text-gray-500">
                <div className="flex items-center gap-4">
                  <span>
                    <kbd className="px-1.5 py-0.5 bg-white border border-gray-300 rounded">↑↓</kbd> للتنقل
                  </span>
                  <span>
                    <kbd className="px-1.5 py-0.5 bg-white border border-gray-300 rounded">Enter</kbd> للفتح
                  </span>
                  <span>
                    <kbd className="px-1.5 py-0.5 bg-white border border-gray-300 rounded">Esc</kbd> للإغلاق
                  </span>
                </div>
                {results.length > 0 && (
                  <span>{results.length} نتيجة</span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
