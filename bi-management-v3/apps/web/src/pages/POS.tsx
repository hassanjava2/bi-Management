import { useEffect, useState, useRef } from "react";
import { API_BASE, getAuthHeaders } from "../utils/api";

type Product = {
  id: string;
  code: string | null;
  name: string;
  barcode: string | null;
  salePrice: number | null;
  costPrice: number | null;
};

type CartItem = {
  productId: string;
  productName: string;
  productCode: string | null;
  barcode: string | null;
  quantity: number;
  unitPrice: number;
  discountAmount: number;
  total: number;
};

type Session = {
  id: string;
  code: string | null;
  openedAt: string | null;
  openingCash: number | null;
  totalSales: number | null;
  transactionCount: number | null;
  terminal: { id: string; name: string; code: string | null } | null;
};

export default function POS() {
  const [session, setSession] = useState<Session | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Product[]>([]);
  const [showSearch, setShowSearch] = useState(false);
  const [discount, setDiscount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "card" | "mixed">("cash");
  const [cashReceived, setCashReceived] = useState("");
  const [showPayment, setShowPayment] = useState(false);
  const [showOpenSession, setShowOpenSession] = useState(false);
  const [openingCash, setOpeningCash] = useState("");
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    document.title = "نقطة البيع | BI Management v3";
    checkSession();
  }, []);

  const checkSession = async () => {
    const userId = localStorage.getItem("userId") || "";
    try {
      const res = await fetch(`${API_BASE}/api/pos/sessions/current?cashierId=${userId}`, {
        headers: getAuthHeaders(),
      });
      const data = await res.json();
      if (data.session) {
        setSession(data.session);
      } else {
        setShowOpenSession(true);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenSession = async () => {
    const userId = localStorage.getItem("userId") || "";
    try {
      const res = await fetch(`${API_BASE}/api/pos/sessions/open`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          cashierId: userId,
          openingCash: parseFloat(openingCash) || 0,
        }),
      });

      if (!res.ok) throw new Error("Failed to open session");

      const data = await res.json();
      setShowOpenSession(false);
      checkSession();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Error");
    }
  };

  const handleCloseSession = async () => {
    if (!session) return;
    const closingCash = prompt("أدخل المبلغ النقدي في الدرج:");
    if (closingCash === null) return;

    try {
      const res = await fetch(`${API_BASE}/api/pos/sessions/${session.id}/close`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({ closingCash: parseFloat(closingCash) || 0 }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");

      alert(`تم إغلاق الجلسة\nالمتوقع: ${data.expectedCash?.toLocaleString()} IQD\nالفرق: ${data.difference?.toLocaleString()} IQD`);
      setSession(null);
      setShowOpenSession(true);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Error");
    }
  };

  const searchProducts = async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/api/pos/products/search?q=${encodeURIComponent(query)}`, {
        headers: getAuthHeaders(),
      });
      const data = await res.json();
      setSearchResults(data.items || []);
    } catch (err) {
      console.error(err);
    }
  };

  const handleBarcodeSearch = async (barcode: string) => {
    try {
      const res = await fetch(`${API_BASE}/api/pos/products/search?barcode=${encodeURIComponent(barcode)}`, {
        headers: getAuthHeaders(),
      });
      const data = await res.json();
      if (data.items && data.items.length > 0) {
        addToCart(data.items[0]);
        setSearchQuery("");
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      searchProducts(searchQuery);
    }, 300);
    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

  const addToCart = (product: Product) => {
    const existingIndex = cart.findIndex((item) => item.productId === product.id);

    if (existingIndex >= 0) {
      const newCart = [...cart];
      newCart[existingIndex].quantity += 1;
      newCart[existingIndex].total = newCart[existingIndex].quantity * newCart[existingIndex].unitPrice - newCart[existingIndex].discountAmount;
      setCart(newCart);
    } else {
      const price = product.salePrice || 0;
      setCart([
        ...cart,
        {
          productId: product.id,
          productName: product.name,
          productCode: product.code,
          barcode: product.barcode,
          quantity: 1,
          unitPrice: price,
          discountAmount: 0,
          total: price,
        },
      ]);
    }

    setSearchQuery("");
    setSearchResults([]);
    setShowSearch(false);
  };

  const updateQuantity = (index: number, quantity: number) => {
    if (quantity < 1) {
      removeFromCart(index);
      return;
    }
    const newCart = [...cart];
    newCart[index].quantity = quantity;
    newCart[index].total = quantity * newCart[index].unitPrice - newCart[index].discountAmount;
    setCart(newCart);
  };

  const removeFromCart = (index: number) => {
    setCart(cart.filter((_, i) => i !== index));
  };

  const clearCart = () => {
    if (cart.length === 0) return;
    if (confirm("هل تريد مسح السلة؟")) {
      setCart([]);
      setDiscount(0);
    }
  };

  const subtotal = cart.reduce((sum, item) => sum + item.total, 0);
  const total = subtotal - discount;
  const changeAmount = paymentMethod === "cash" ? (parseFloat(cashReceived) || 0) - total : 0;

  const handlePayment = async () => {
    if (!session || cart.length === 0) return;
    if (paymentMethod === "cash" && (parseFloat(cashReceived) || 0) < total) {
      alert("المبلغ المستلم أقل من الإجمالي");
      return;
    }

    setProcessing(true);
    const userId = localStorage.getItem("userId") || "";

    try {
      const res = await fetch(`${API_BASE}/api/pos/transactions`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          sessionId: session.id,
          terminalId: session.terminal?.id,
          cashierId: userId,
          items: cart,
          discountAmount: discount,
          paymentMethod,
          cashReceived: paymentMethod === "cash" ? parseFloat(cashReceived) : null,
        }),
      });

      if (!res.ok) throw new Error("Failed to process transaction");

      const data = await res.json();

      // Show receipt / success
      alert(`تمت العملية بنجاح\nرقم العملية: ${data.code}\nالإجمالي: ${total.toLocaleString()} IQD${paymentMethod === "cash" ? `\nالباقي: ${data.change?.toLocaleString()} IQD` : ""}`);

      // Reset
      setCart([]);
      setDiscount(0);
      setCashReceived("");
      setShowPayment(false);
      checkSession(); // Refresh session data
    } catch (err) {
      alert(err instanceof Error ? err.message : "Error");
    } finally {
      setProcessing(false);
    }
  };

  const formatCurrency = (n: number) => n.toLocaleString() + " IQD";

  const quickAmounts = [1000, 5000, 10000, 25000, 50000, 100000];

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "80vh", color: "#64748b" }}>
        جاري التحميل...
      </div>
    );
  }

  // Open Session Dialog
  if (showOpenSession) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "80vh" }}>
        <div style={{ background: "#fff", padding: "2rem", borderRadius: "16px", boxShadow: "0 10px 40px rgba(0,0,0,0.1)", width: "100%", maxWidth: "400px", textAlign: "center" }}>
          <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>💰</div>
          <h2 style={{ margin: "0 0 1rem" }}>افتتاح جلسة جديدة</h2>
          <p style={{ color: "#64748b", marginBottom: "1.5rem" }}>أدخل المبلغ الافتتاحي للبدء</p>
          <input
            type="number"
            placeholder="المبلغ الافتتاحي"
            value={openingCash}
            onChange={(e) => setOpeningCash(e.target.value)}
            style={{
              width: "100%",
              padding: "1rem",
              fontSize: "1.5rem",
              textAlign: "center",
              border: "2px solid #e2e8f0",
              borderRadius: "12px",
              marginBottom: "1rem",
              boxSizing: "border-box",
            }}
          />
          <button
            onClick={handleOpenSession}
            style={{
              width: "100%",
              padding: "1rem",
              background: "linear-gradient(135deg, #15803d 0%, #166534 100%)",
              color: "#fff",
              border: "none",
              borderRadius: "12px",
              fontSize: "1.1rem",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            افتتاح الجلسة
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", height: "calc(100vh - 2rem)", gap: "1rem" }}>
      {/* Left Panel - Products */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", background: "#fff", borderRadius: "16px", overflow: "hidden" }}>
        {/* Search */}
        <div style={{ padding: "1rem", borderBottom: "1px solid #e2e8f0" }}>
          <div style={{ position: "relative" }}>
            <input
              ref={searchRef}
              type="text"
              placeholder="بحث بالاسم أو الباركود..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setShowSearch(true);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && searchQuery.trim()) {
                  handleBarcodeSearch(searchQuery.trim());
                }
              }}
              onFocus={() => setShowSearch(true)}
              style={{
                width: "100%",
                padding: "1rem 1.25rem",
                fontSize: "1.1rem",
                border: "2px solid #e2e8f0",
                borderRadius: "12px",
                boxSizing: "border-box",
              }}
            />
            {/* Search Results */}
            {showSearch && searchResults.length > 0 && (
              <div
                style={{
                  position: "absolute",
                  top: "100%",
                  left: 0,
                  right: 0,
                  background: "#fff",
                  border: "1px solid #e2e8f0",
                  borderRadius: "12px",
                  boxShadow: "0 10px 40px rgba(0,0,0,0.1)",
                  maxHeight: "300px",
                  overflow: "auto",
                  zIndex: 100,
                  marginTop: "0.5rem",
                }}
              >
                {searchResults.map((product) => (
                  <div
                    key={product.id}
                    onClick={() => addToCart(product)}
                    style={{
                      padding: "1rem",
                      borderBottom: "1px solid #f1f5f9",
                      cursor: "pointer",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "#f8fafc")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "#fff")}
                  >
                    <div>
                      <div style={{ fontWeight: 500 }}>{product.name}</div>
                      <div style={{ fontSize: "0.8rem", color: "#64748b" }}>{product.code} {product.barcode ? `| ${product.barcode}` : ""}</div>
                    </div>
                    <div style={{ fontWeight: 600, color: "#15803d" }}>{formatCurrency(product.salePrice || 0)}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Session Info */}
        <div style={{ padding: "0.75rem 1rem", background: "#f8fafc", display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "0.9rem" }}>
          <div>
            <span style={{ color: "#64748b" }}>الجلسة: </span>
            <span style={{ fontWeight: 500 }}>{session?.code}</span>
            <span style={{ color: "#64748b", marginRight: "1rem" }}> | المبيعات: </span>
            <span style={{ fontWeight: 600, color: "#15803d" }}>{formatCurrency(session?.totalSales || 0)}</span>
            <span style={{ color: "#64748b", marginRight: "1rem" }}> | العمليات: </span>
            <span style={{ fontWeight: 500 }}>{session?.transactionCount || 0}</span>
          </div>
          <button
            onClick={handleCloseSession}
            style={{
              padding: "0.5rem 1rem",
              background: "#fee2e2",
              color: "#b91c1c",
              border: "none",
              borderRadius: "8px",
              cursor: "pointer",
              fontSize: "0.85rem",
              fontWeight: 500,
            }}
          >
            إغلاق الجلسة
          </button>
        </div>

        {/* Cart Items */}
        <div style={{ flex: 1, overflow: "auto", padding: "1rem" }}>
          {cart.length === 0 ? (
            <div style={{ textAlign: "center", padding: "3rem", color: "#94a3b8" }}>
              <div style={{ fontSize: "4rem", marginBottom: "1rem" }}>🛒</div>
              <div>السلة فارغة</div>
              <div style={{ fontSize: "0.9rem", marginTop: "0.5rem" }}>ابحث عن منتج أو امسح الباركود</div>
            </div>
          ) : (
            cart.map((item, index) => (
              <div
                key={index}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "1rem",
                  padding: "1rem",
                  background: "#f8fafc",
                  borderRadius: "12px",
                  marginBottom: "0.75rem",
                }}
              >
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 500, marginBottom: "0.25rem" }}>{item.productName}</div>
                  <div style={{ fontSize: "0.85rem", color: "#64748b" }}>{formatCurrency(item.unitPrice)}</div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <button
                    onClick={() => updateQuantity(index, item.quantity - 1)}
                    style={{
                      width: "36px",
                      height: "36px",
                      border: "1px solid #e2e8f0",
                      borderRadius: "8px",
                      background: "#fff",
                      cursor: "pointer",
                      fontSize: "1.2rem",
                    }}
                  >
                    -
                  </button>
                  <span style={{ width: "40px", textAlign: "center", fontWeight: 600, fontSize: "1.1rem" }}>{item.quantity}</span>
                  <button
                    onClick={() => updateQuantity(index, item.quantity + 1)}
                    style={{
                      width: "36px",
                      height: "36px",
                      border: "1px solid #e2e8f0",
                      borderRadius: "8px",
                      background: "#fff",
                      cursor: "pointer",
                      fontSize: "1.2rem",
                    }}
                  >
                    +
                  </button>
                </div>
                <div style={{ width: "100px", textAlign: "left", fontWeight: 600, color: "#1e293b" }}>{formatCurrency(item.total)}</div>
                <button
                  onClick={() => removeFromCart(index)}
                  style={{
                    width: "36px",
                    height: "36px",
                    border: "none",
                    borderRadius: "8px",
                    background: "#fee2e2",
                    color: "#b91c1c",
                    cursor: "pointer",
                    fontSize: "1rem",
                  }}
                >
                  ✕
                </button>
              </div>
            ))
          )}
        </div>

        {/* Cart Actions */}
        {cart.length > 0 && (
          <div style={{ padding: "1rem", borderTop: "1px solid #e2e8f0" }}>
            <button
              onClick={clearCart}
              style={{
                width: "100%",
                padding: "0.75rem",
                background: "#f1f5f9",
                color: "#64748b",
                border: "none",
                borderRadius: "10px",
                cursor: "pointer",
                fontSize: "0.95rem",
              }}
            >
              مسح السلة
            </button>
          </div>
        )}
      </div>

      {/* Right Panel - Payment */}
      <div style={{ width: "380px", display: "flex", flexDirection: "column", background: "#fff", borderRadius: "16px", overflow: "hidden" }}>
        {/* Totals */}
        <div style={{ padding: "1.5rem", borderBottom: "1px solid #e2e8f0" }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.75rem", fontSize: "1rem" }}>
            <span style={{ color: "#64748b" }}>المجموع الفرعي</span>
            <span style={{ fontWeight: 500 }}>{formatCurrency(subtotal)}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.75rem", fontSize: "1rem", alignItems: "center" }}>
            <span style={{ color: "#64748b" }}>الخصم</span>
            <input
              type="number"
              value={discount}
              onChange={(e) => setDiscount(parseFloat(e.target.value) || 0)}
              style={{
                width: "120px",
                padding: "0.5rem",
                textAlign: "left",
                border: "1px solid #e2e8f0",
                borderRadius: "8px",
                fontSize: "1rem",
              }}
            />
          </div>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              padding: "1rem",
              background: "linear-gradient(135deg, #15803d 0%, #166534 100%)",
              borderRadius: "12px",
              color: "#fff",
            }}
          >
            <span style={{ fontSize: "1.2rem" }}>الإجمالي</span>
            <span style={{ fontSize: "1.5rem", fontWeight: 700 }}>{formatCurrency(total)}</span>
          </div>
        </div>

        {/* Payment Section */}
        <div style={{ flex: 1, padding: "1.5rem", display: "flex", flexDirection: "column" }}>
          {/* Payment Method */}
          <div style={{ marginBottom: "1.5rem" }}>
            <label style={{ display: "block", marginBottom: "0.75rem", fontWeight: 500 }}>طريقة الدفع</label>
            <div style={{ display: "flex", gap: "0.5rem" }}>
              {(["cash", "card"] as const).map((method) => (
                <button
                  key={method}
                  onClick={() => setPaymentMethod(method)}
                  style={{
                    flex: 1,
                    padding: "0.75rem",
                    border: paymentMethod === method ? "2px solid #15803d" : "2px solid #e2e8f0",
                    borderRadius: "10px",
                    background: paymentMethod === method ? "#dcfce7" : "#fff",
                    color: paymentMethod === method ? "#15803d" : "#64748b",
                    cursor: "pointer",
                    fontWeight: 500,
                  }}
                >
                  {method === "cash" ? "نقدي" : "بطاقة"}
                </button>
              ))}
            </div>
          </div>

          {/* Cash Input */}
          {paymentMethod === "cash" && (
            <div style={{ marginBottom: "1.5rem" }}>
              <label style={{ display: "block", marginBottom: "0.75rem", fontWeight: 500 }}>المبلغ المستلم</label>
              <input
                type="number"
                value={cashReceived}
                onChange={(e) => setCashReceived(e.target.value)}
                placeholder="0"
                style={{
                  width: "100%",
                  padding: "1rem",
                  fontSize: "1.5rem",
                  textAlign: "center",
                  border: "2px solid #e2e8f0",
                  borderRadius: "12px",
                  boxSizing: "border-box",
                }}
              />
              {/* Quick Amounts */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "0.5rem", marginTop: "0.75rem" }}>
                {quickAmounts.map((amount) => (
                  <button
                    key={amount}
                    onClick={() => setCashReceived(amount.toString())}
                    style={{
                      padding: "0.5rem",
                      border: "1px solid #e2e8f0",
                      borderRadius: "8px",
                      background: "#f8fafc",
                      cursor: "pointer",
                      fontSize: "0.85rem",
                    }}
                  >
                    {amount.toLocaleString()}
                  </button>
                ))}
              </div>
              {/* Change */}
              {parseFloat(cashReceived) >= total && (
                <div
                  style={{
                    marginTop: "1rem",
                    padding: "1rem",
                    background: "#fef3c7",
                    borderRadius: "12px",
                    textAlign: "center",
                  }}
                >
                  <div style={{ color: "#92400e", fontSize: "0.9rem" }}>الباقي</div>
                  <div style={{ color: "#b45309", fontSize: "1.5rem", fontWeight: 700 }}>{formatCurrency(changeAmount)}</div>
                </div>
              )}
            </div>
          )}

          <div style={{ flex: 1 }} />

          {/* Pay Button */}
          <button
            onClick={handlePayment}
            disabled={cart.length === 0 || processing || (paymentMethod === "cash" && (parseFloat(cashReceived) || 0) < total)}
            style={{
              width: "100%",
              padding: "1.25rem",
              background: cart.length === 0 || processing ? "#94a3b8" : "linear-gradient(135deg, #15803d 0%, #166534 100%)",
              color: "#fff",
              border: "none",
              borderRadius: "14px",
              fontSize: "1.2rem",
              fontWeight: 600,
              cursor: cart.length === 0 || processing ? "not-allowed" : "pointer",
            }}
          >
            {processing ? "جاري المعالجة..." : `إتمام الدفع - ${formatCurrency(total)}`}
          </button>
        </div>
      </div>
    </div>
  );
}
