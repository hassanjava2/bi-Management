import React from "react";
import ReactDOM from "react-dom/client";
import { ConfigProvider, App as AntApp } from "antd";
import arEG from "antd/locale/ar_EG";
import App from "./App";
import ErrorBoundary from "./components/ErrorBoundary";
import "./index.css";

const biTheme = {
  token: {
    colorPrimary: "#4f46e5",
    colorSuccess: "#059669",
    colorWarning: "#d97706",
    colorError: "#dc2626",
    borderRadius: 8,
    fontFamily: "Tajawal, Inter, system-ui, sans-serif",
    fontSize: 14,
    colorBgContainer: "#ffffff",
    colorBgLayout: "#f8fafc",
    controlHeight: 40,
  },
  components: {
    Button: { borderRadius: 8, controlHeight: 40 },
    Card: { borderRadius: 12 },
    Table: { headerBg: "#f8fafc" },
    Input: { borderRadius: 8, controlHeight: 40 },
    Select: { borderRadius: 8, controlHeight: 40 },
    Modal: { borderRadius: 16 },
  },
};

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ConfigProvider locale={arEG} direction="rtl" theme={biTheme}>
      <AntApp>
        <ErrorBoundary>
          <App />
        </ErrorBoundary>
      </AntApp>
    </ConfigProvider>
  </React.StrictMode>
);
