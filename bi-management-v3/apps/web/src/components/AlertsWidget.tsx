/**
 * مكون ويدجت التنبيهات للوحة التحكم
 */
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { API_BASE, getAuthHeaders } from "../utils/api";

interface Alert {
  id: string;
  type: string;
  category: string;
  severity: "info" | "warning" | "critical";
  title: string;
  message: string;
  count?: number;
  actionUrl?: string;
}

interface Props {
  maxItems?: number;
  showHeader?: boolean;
}

export default function AlertsWidget({ maxItems = 5, showHeader = true }: Props) {
  const navigate = useNavigate();
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState({ total: 0, critical: 0, warning: 0, info: 0 });

  useEffect(() => {
    loadAlerts();
    // تحديث تلقائي كل 5 دقائق
    const interval = setInterval(loadAlerts, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const loadAlerts = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/alerts`, { headers: getAuthHeaders() });
      if (res.ok) {
        const data = await res.json();
        setAlerts(data.alerts || []);
        setSummary(data.summary || { total: 0, critical: 0, warning: 0, info: 0 });
      }
    } catch (error) {
      console.error("Error loading alerts:", error);
    } finally {
      setLoading(false);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "critical":
        return { bg: "#fef2f2", border: "#fecaca", text: "#dc2626" };
      case "warning":
        return { bg: "#fffbeb", border: "#fde68a", text: "#d97706" };
      default:
        return { bg: "#f0f9ff", border: "#bae6fd", text: "#0284c7" };
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case "critical":
        return "🚨";
      case "warning":
        return "⚠️";
      default:
        return "ℹ️";
    }
  };

  if (loading) {
    return (
      <div style={{ 
        background: "#fff", 
        borderRadius: "12px", 
        padding: "1.5rem",
        border: "1px solid #e5e7eb",
      }}>
        <p style={{ color: "#9ca3af", textAlign: "center" }}>جاري التحميل...</p>
      </div>
    );
  }

  const displayAlerts = alerts.slice(0, maxItems);

  return (
    <div style={{ 
      background: "#fff", 
      borderRadius: "12px", 
      border: "1px solid #e5e7eb",
      overflow: "hidden",
    }}>
      {showHeader && (
        <div style={{
          padding: "1rem 1.25rem",
          borderBottom: "1px solid #e5e7eb",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}>
          <h3 style={{ margin: 0, fontSize: "1rem", fontWeight: 600 }}>
            🔔 التنبيهات
          </h3>
          <div style={{ display: "flex", gap: "0.5rem" }}>
            {summary.critical > 0 && (
              <span style={{
                background: "#fef2f2",
                color: "#dc2626",
                padding: "0.25rem 0.5rem",
                borderRadius: "6px",
                fontSize: "0.75rem",
                fontWeight: 600,
              }}>
                {summary.critical} حرجة
              </span>
            )}
            {summary.warning > 0 && (
              <span style={{
                background: "#fffbeb",
                color: "#d97706",
                padding: "0.25rem 0.5rem",
                borderRadius: "6px",
                fontSize: "0.75rem",
                fontWeight: 600,
              }}>
                {summary.warning} تحذير
              </span>
            )}
          </div>
        </div>
      )}

      {alerts.length === 0 ? (
        <div style={{ padding: "2rem", textAlign: "center" }}>
          <div style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>✅</div>
          <p style={{ color: "#10b981", margin: 0, fontWeight: 500 }}>لا توجد تنبيهات</p>
          <p style={{ color: "#9ca3af", fontSize: "0.85rem", margin: "0.25rem 0 0" }}>
            كل شيء يعمل بشكل جيد
          </p>
        </div>
      ) : (
        <>
          <div style={{ maxHeight: "300px", overflowY: "auto" }}>
            {displayAlerts.map((alert, index) => {
              const colors = getSeverityColor(alert.severity);
              return (
                <div
                  key={alert.id}
                  onClick={() => alert.actionUrl && navigate(alert.actionUrl)}
                  style={{
                    padding: "0.875rem 1.25rem",
                    borderBottom: index < displayAlerts.length - 1 ? "1px solid #f3f4f6" : "none",
                    cursor: alert.actionUrl ? "pointer" : "default",
                    transition: "background 0.15s",
                    display: "flex",
                    alignItems: "flex-start",
                    gap: "0.75rem",
                  }}
                  onMouseEnter={(e) => {
                    if (alert.actionUrl) {
                      e.currentTarget.style.background = "#f9fafb";
                    }
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "transparent";
                  }}
                >
                  <span style={{
                    width: "28px",
                    height: "28px",
                    borderRadius: "6px",
                    background: colors.bg,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "0.9rem",
                    flexShrink: 0,
                  }}>
                    {getSeverityIcon(alert.severity)}
                  </span>
                  
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ 
                      fontWeight: 500, 
                      fontSize: "0.9rem",
                      color: colors.text,
                      marginBottom: "0.2rem",
                    }}>
                      {alert.title}
                    </div>
                    <div style={{ 
                      color: "#6b7280", 
                      fontSize: "0.8rem",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}>
                      {alert.message}
                    </div>
                  </div>

                  {alert.count && (
                    <span style={{
                      background: colors.bg,
                      color: colors.text,
                      padding: "0.25rem 0.5rem",
                      borderRadius: "6px",
                      fontSize: "0.75rem",
                      fontWeight: 600,
                      flexShrink: 0,
                    }}>
                      {alert.count}
                    </span>
                  )}
                </div>
              );
            })}
          </div>

          {alerts.length > maxItems && (
            <div 
              onClick={() => navigate("/alerts")}
              style={{
                padding: "0.75rem",
                textAlign: "center",
                borderTop: "1px solid #e5e7eb",
                cursor: "pointer",
                color: "#3b82f6",
                fontSize: "0.85rem",
                fontWeight: 500,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "#f0f9ff";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "transparent";
              }}
            >
              عرض كل التنبيهات ({alerts.length})
            </div>
          )}
        </>
      )}
    </div>
  );
}
