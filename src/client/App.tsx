import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { BrowserRouter, Routes, Route, useLocation, useNavigate } from "react-router-dom";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { fetchCounts } from "@/lib/api.js";
import TriageView from "@/views/TriageView.js";
import ReviewView from "@/views/ReviewView.js";
import UploadView from "@/views/UploadView.js";
import ListView from "@/views/ListView.js";

const RefreshCountsContext = createContext<() => void>(() => {});
export const useRefreshCounts = () => useContext(RefreshCountsContext);

const TAB_ROUTES = [
  { value: "/", label: "New", countKey: "new" as const },
  { value: "/review", label: "Review", countKey: "due" as const },
  { value: "/list", label: "List", countKey: null },
  { value: "/upload", label: "Upload", countKey: null },
] as const;

function AppLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const [counts, setCounts] = useState<{ new: number; due: number }>({ new: 0, due: 0 });

  const loadCounts = useCallback(async () => {
    try {
      const data = await fetchCounts();
      setCounts(data);
    } catch {
      // silently ignore count fetch errors
    }
  }, []);

  // Refresh counts on route change
  useEffect(() => {
    loadCounts();
  }, [location.pathname, loadCounts]);

  const currentTab = TAB_ROUTES.find((r) => r.value === location.pathname)?.value ?? "/";

  return (
    <RefreshCountsContext.Provider value={loadCounts}>
      <div className="min-h-screen bg-background">
        <div className="mx-auto max-w-3xl px-4 py-8">
          <h1 className="mb-6 text-2xl font-bold tracking-tight">Daily Review</h1>

          <Tabs value={currentTab} onValueChange={(val) => navigate(val)} className="mb-8">
            <TabsList>
              {TAB_ROUTES.map((route) => (
                <TabsTrigger key={route.value} value={route.value} className="gap-1.5">
                  {route.label}
                  {route.countKey && counts[route.countKey] > 0 && (
                    <Badge className="ml-1 px-1.5 py-0 text-[10px] leading-4 min-w-[1.25rem] bg-emerald-600/70 text-white">
                      {counts[route.countKey]}
                    </Badge>
                  )}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>

          <Routes>
            <Route path="/" element={<TriageView />} />
            <Route path="/review" element={<ReviewView />} />
            <Route path="/list" element={<ListView />} />
            <Route path="/upload" element={<UploadView />} />
          </Routes>
        </div>
      </div>
    </RefreshCountsContext.Provider>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppLayout />
    </BrowserRouter>
  );
}
