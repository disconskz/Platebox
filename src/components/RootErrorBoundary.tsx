import { Component, ReactNode } from "react";

type Props = { children: ReactNode };
type State = { error: Error | null };

export class RootErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: unknown) {
    // eslint-disable-next-line no-console
    console.error("[RootErrorBoundary]", error, info);
  }

  reset = () => {
    this.setState({ error: null });
    if (typeof window !== "undefined") window.location.reload();
  };

  render() {
    if (this.state.error) {
      return (
        <div style={{
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "24px",
          fontFamily: "system-ui, -apple-system, sans-serif",
          background: "hsl(var(--background, 0 0% 100%))",
          color: "hsl(var(--foreground, 0 0% 10%))",
          textAlign: "center",
          gap: "12px",
        }}>
          <h1 style={{ fontSize: 20, fontWeight: 600, margin: 0 }}>
            Что-то пошло не так
          </h1>
          <p style={{ fontSize: 14, opacity: 0.7, maxWidth: 520 }}>
            Приложение неожиданно остановилось. Попробуйте перезагрузить страницу.
          </p>
          <pre style={{
            fontSize: 11,
            opacity: 0.6,
            maxWidth: 600,
            whiteSpace: "pre-wrap",
            wordBreak: "break-word",
            margin: 0,
          }}>{this.state.error.message}</pre>
          <button
            type="button"
            onClick={this.reset}
            style={{
              marginTop: 8,
              padding: "8px 16px",
              borderRadius: 8,
              border: "1px solid rgba(127,127,127,0.4)",
              background: "transparent",
              color: "inherit",
              cursor: "pointer",
              fontSize: 14,
            }}
          >
            Перезагрузить
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export default RootErrorBoundary;