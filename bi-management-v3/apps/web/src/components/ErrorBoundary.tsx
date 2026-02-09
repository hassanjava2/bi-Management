import React from "react";
import { Button, Result } from "antd";

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("ErrorBoundary caught:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            minHeight: "100vh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 24,
          }}
        >
          <Result
            status="error"
            title="حدث خطأ غير متوقع"
            subTitle={
              this.state.error?.message || "يرجى إعادة تحميل الصفحة أو المحاولة لاحقاً"
            }
            extra={[
              <Button
                type="primary"
                key="reload"
                onClick={() => window.location.reload()}
              >
                إعادة تحميل الصفحة
              </Button>,
              <Button
                key="home"
                onClick={() => {
                  this.setState({ hasError: false, error: null });
                  window.location.href = "/";
                }}
              >
                العودة للرئيسية
              </Button>,
            ]}
          />
        </div>
      );
    }

    return this.props.children;
  }
}
