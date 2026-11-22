import { Component, type ErrorInfo, type ReactNode } from "react";

interface Props {
  children: ReactNode;
  /** 表示中のページが変わったらエラー状態をリセットするためのキー */
  resetKey?: string;
}
interface State {
  error: Error | null;
  stack: string;
}

const RELOAD_FLAG = "robrun-jp-chunk-reload";

/**
 * 描画中のエラーで画面が真っ黒になるのを防ぎ、原因を表示する。
 * デプロイ直後の古いファイル参照（チャンク読み込み失敗）は 1 回だけ自動で再読み込みする。
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null, stack: "" };

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error(error, info.componentStack);
    this.setState({ stack: info.componentStack ?? "" });
    const chunkError = /Failed to fetch dynamically imported module|Importing a module script failed|error loading dynamically imported module/i.test(
      error.message,
    );
    try {
      if (chunkError && !sessionStorage.getItem(RELOAD_FLAG)) {
        sessionStorage.setItem(RELOAD_FLAG, "1");
        window.location.reload();
      }
    } catch {
      /* sessionStorage が使えない環境では何もしない */
    }
  }

  componentDidUpdate(prev: Props) {
    if (prev.resetKey !== this.props.resetKey && this.state.error) this.setState({ error: null, stack: "" });
  }

  render() {
    const { error, stack } = this.state;
    if (!error) return this.props.children;
    const report = `${error.name}: ${error.message}\n${(error.stack ?? "").split("\n").slice(0, 6).join("\n")}\n${stack
      .split("\n")
      .slice(0, 6)
      .join("\n")}\nURL: ${location.href}\nUA: ${navigator.userAgent}`;
    return (
      <div className="mx-auto max-w-2xl space-y-3 px-4 py-10">
        <h1 className="text-xl font-bold text-danger">表示中にエラーが発生しました</h1>
        <p className="text-sm text-muted">再読み込みで直らない場合は、下のエラー内容をコピーして管理者に送ってください。</p>
        <pre className="max-h-64 overflow-auto whitespace-pre-wrap rounded-lg border border-line bg-bg-panel p-3 text-xs">{report}</pre>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => location.reload()} className="rounded-md border border-neon px-3 py-1.5 text-sm text-neon">
            再読み込み
          </button>
          <button
            onClick={() => navigator.clipboard?.writeText(report)}
            className="rounded-md border border-line px-3 py-1.5 text-sm"
          >
            エラー内容をコピー
          </button>
          <a href="/shipments?view=list" className="rounded-md border border-line px-3 py-1.5 text-sm">
            リスト表示で開く
          </a>
          <a href="/" className="rounded-md border border-line px-3 py-1.5 text-sm">
            ホームへ
          </a>
        </div>
      </div>
    );
  }
}
