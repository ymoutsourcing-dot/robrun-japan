import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { ErrorBoundary } from './components/ErrorBoundary.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
)

// 正常に表示できたら、チャンク再読み込みのフラグを消す
setTimeout(() => {
  try {
    sessionStorage.removeItem('robrun-jp-chunk-reload')
  } catch {
    /* noop */
  }
}, 10000)
