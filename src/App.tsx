import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Index from "./pages/Index.tsx";
import Landing from "./pages/Landing.tsx";
import AuthPage from "./pages/Auth.tsx";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import AppLayout from "@/components/AppLayout";
import AiChatLayout from "@/components/ai-calc/AiChatLayout";
import Calculator from "./pages/Calculator.tsx";
import MultiSkuCalculator from "./pages/MultiSkuCalculator.tsx";
import LeafletCalculator from "./pages/LeafletCalculator.tsx";
import FlyerCalculator from "./pages/FlyerCalculator.tsx";
import EuroflyerCalculator from "./pages/EuroflyerCalculator.tsx";
import BusinessCardCalculator from "./pages/BusinessCardCalculator.tsx";
import PosterCalculator from "./pages/PosterCalculator.tsx";
import InsertCalculator from "./pages/InsertCalculator.tsx";
import CouponCalculator from "./pages/CouponCalculator.tsx";
import FormCalculator from "./pages/FormCalculator.tsx";
import MenuCalculator from "./pages/MenuCalculator.tsx";
import BookletCalculator from "./pages/BookletCalculator.tsx";
import EurobookletCalculator from "./pages/EurobookletCalculator.tsx";
import LifletCalculator from "./pages/LifletCalculator.tsx";
import BrochureCalculator from "./pages/BrochureCalculator.tsx";
import CatalogCalculator from "./pages/CatalogCalculator.tsx";
import MagazineCalculator from "./pages/MagazineCalculator.tsx";
import SoftcoverBookCalculator from "./pages/SoftcoverBookCalculator.tsx";
import HardcoverBookCalculator from "./pages/HardcoverBookCalculator.tsx";
import PlannerCalculator from "./pages/PlannerCalculator.tsx";
import NotepadCalculator from "./pages/NotepadCalculator.tsx";
import MemocubeCalculator from "./pages/MemocubeCalculator.tsx";
import QuarterCalendarCalculator from "./pages/QuarterCalendarCalculator.tsx";
import DeskCalendarCalculator from "./pages/DeskCalendarCalculator.tsx";
import CardCalculator from "./pages/CardCalculator.tsx";
import FolderCalculator from "./pages/FolderCalculator.tsx";
import DiplomaCalculator from "./pages/DiplomaCalculator.tsx";
import PocketCalendarCalculator from "./pages/PocketCalendarCalculator.tsx";
import StickerCalculator from "./pages/StickerCalculator.tsx";
import LabelCalculator from "./pages/LabelCalculator.tsx";
import HangtagCalculator from "./pages/HangtagCalculator.tsx";
import BagCalculator from "./pages/BagCalculator.tsx";
import BoxCalculator from "./pages/BoxCalculator.tsx";
import TubeCalculator from "./pages/TubeCalculator.tsx";
import PosCalculator from "./pages/PosCalculator.tsx";
import References from "./pages/References.tsx";
import CalcVariants from "./pages/CalcVariants.tsx";
import CalcVariantEditor from "./pages/CalcVariantEditor.tsx";
import CalculationView from "./pages/CalculationView.tsx";
import Quote from "./pages/Quote.tsx";
import Analytics from "./pages/Analytics.tsx";
import Knowledge from "./pages/Knowledge.tsx";
import AiCalc from "./pages/AiCalc.tsx";
import AiCalcThread from "./pages/AiCalcThread.tsx";
import NotFound from "./pages/NotFound.tsx";

const queryClient = new QueryClient();

const HomeRoute = () => {
  const { user, loading } = useAuth();
  // Render Landing immediately — don't block on auth.
  // If a session resolves later and the user is signed in, redirect to /app.
  if (!loading && user) return <Navigate to="/app" replace />;
  return <Landing />;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<HomeRoute />} />
            <Route path="/landing" element={<Landing />} />
            <Route path="/auth" element={<AuthPage />} />

            {/* Protected app shell with sidebar */}
            <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
              <Route path="/app" element={<Index />} />
              <Route path="/calculator" element={<Calculator />} />
              <Route path="/calculator/multi-sku" element={<MultiSkuCalculator />} />
              <Route path="/calculator/leaflet" element={<LeafletCalculator />} />
              <Route path="/calculator/flyer" element={<FlyerCalculator />} />
              <Route path="/calculator/euroflyer" element={<EuroflyerCalculator />} />
              <Route path="/calculator/businesscard" element={<BusinessCardCalculator />} />
              <Route path="/calculator/poster" element={<PosterCalculator />} />
              <Route path="/calculator/insert" element={<InsertCalculator />} />
              <Route path="/calculator/coupon" element={<CouponCalculator />} />
              <Route path="/calculator/form" element={<FormCalculator />} />
              <Route path="/calculator/menu" element={<MenuCalculator />} />
              <Route path="/calculator/booklet" element={<BookletCalculator />} />
              <Route path="/calculator/eurobooklet" element={<EurobookletCalculator />} />
              <Route path="/calculator/liflet" element={<LifletCalculator />} />
              <Route path="/calculator/brochure" element={<BrochureCalculator />} />
              <Route path="/calculator/catalog" element={<CatalogCalculator />} />
              <Route path="/calculator/magazine" element={<MagazineCalculator />} />
              <Route path="/calculator/softcover-book" element={<SoftcoverBookCalculator />} />
              <Route path="/calculator/hardcover-book" element={<HardcoverBookCalculator />} />
              <Route path="/calculator/planner" element={<PlannerCalculator />} />
              <Route path="/calculator/notepad" element={<NotepadCalculator />} />
              <Route path="/calculator/memocube" element={<MemocubeCalculator />} />
              <Route path="/calculator/quarter-calendar" element={<QuarterCalendarCalculator />} />
              <Route path="/calculator/desk-calendar" element={<DeskCalendarCalculator />} />
              <Route path="/calculator/card" element={<CardCalculator />} />
             <Route path="/calculator/folder" element={<FolderCalculator />} />
             <Route path="/calculator/diploma" element={<DiplomaCalculator />} />
             <Route path="/calculator/pocket-calendar" element={<PocketCalendarCalculator />} />
             <Route path="/calculator/sticker" element={<StickerCalculator />} />
             <Route path="/calculator/label" element={<LabelCalculator />} />
            <Route path="/calculator/hangtag" element={<HangtagCalculator />} />
              <Route path="/calculator/bag" element={<BagCalculator />} />
              <Route path="/calculator/box" element={<BoxCalculator />} />
              <Route path="/calculator/tube" element={<TubeCalculator />} />
              <Route path="/calculator/pos" element={<PosCalculator />} />
              <Route path="/references" element={<References />} />
              <Route path="/references/variants" element={<CalcVariants />} />
              <Route path="/references/variants/:id" element={<CalcVariantEditor />} />
              <Route path="/analytics" element={<Analytics />} />
              <Route path="/knowledge" element={<Knowledge />} />
              <Route path="/calculation/:id" element={<CalculationView />} />
              <Route path="/calculation/:id/quote" element={<Quote />} />
            </Route>

            {/* Standalone AI chat shell with its own threads sidebar */}
            <Route element={<ProtectedRoute><AiChatLayout /></ProtectedRoute>}>
              <Route path="/ai-calc" element={<AiCalc />} />
              <Route path="/ai-calc/:threadId" element={<AiCalcThread />} />
            </Route>

            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
