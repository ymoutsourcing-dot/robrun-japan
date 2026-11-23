import { lazy, Suspense } from "react";
import { BrowserRouter, Route, Routes, useLocation } from "react-router-dom";
import { useEffect } from "react";
import Layout from "./components/Layout";
import HomePage from "./pages/HomePage";
import ItemsPage from "./pages/ItemsPage";
import ItemPage from "./pages/ItemPage";
import CalculatorPage from "./pages/CalculatorPage";
import RecommendedPage from "./pages/RecommendedPage";
import ProgressPage from "./pages/ProgressPage";
import AboutPage from "./pages/AboutPage";
import ChangelogPage from "./pages/ChangelogPage";
import NotFound from "./pages/NotFound";
import GuidesPage from "./pages/GuidesPage";
import GuidePage from "./pages/GuidePage";
import WeaponsPage from "./pages/WeaponsPage";
import VehiclesPage from "./pages/VehiclesPage";
import CargoPage from "./pages/CargoPage";
import ToolsPage from "./pages/ToolsPage";
import TipsPage from "./pages/TipsPage";

// React Flow を含むツリーページは遅延読み込み
const TreePage = lazy(() => import("./pages/TreePage"));

function ScrollToTop() {
  const { pathname } = useLocation();
  // scrollTo は新しいブラウザで Promise を返すため、戻り値を effect から返さない
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

export default function App() {
  return (
    <BrowserRouter>
      <ScrollToTop />
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<HomePage />} />
          <Route
            path="shipments"
            element={
              <Suspense fallback={<p className="p-8 text-center text-muted">研究ツリーを読み込み中…</p>}>
                <TreePage />
              </Suspense>
            }
          />
          <Route path="shipments/:id" element={<ItemPage />} />
          <Route path="items" element={<ItemsPage />} />
          <Route path="calculator" element={<CalculatorPage />} />
          <Route path="recommended" element={<RecommendedPage />} />
          <Route path="progress" element={<ProgressPage />} />
          <Route path="about" element={<AboutPage />} />
          <Route path="changelog" element={<ChangelogPage />} />
          <Route path="guides" element={<GuidesPage />} />
          <Route path="guides/:id" element={<GuidePage />} />
          <Route path="weapons" element={<WeaponsPage />} />
          <Route path="vehicles" element={<VehiclesPage />} />
          <Route path="cargo" element={<CargoPage />} />
          <Route path="tools" element={<ToolsPage />} />
          <Route path="tips" element={<TipsPage />} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
