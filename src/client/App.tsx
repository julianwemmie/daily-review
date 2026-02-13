import { useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate } from "react-router-dom";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { CountsProvider, useCounts } from "@/contexts/CountsContext.js";
import { useSession } from "@/lib/auth-client.js";
import UserMenu from "@/components/UserMenu.js";
import AuthView from "@/views/AuthView.js";
import TriageView from "@/views/TriageView.js";
import ReviewView from "@/views/ReviewView.js";
import UploadView from "@/views/UploadView.js";
import ListView from "@/views/ListView.js";

const TAB_ROUTES = [
  { value: "/", label: "New", countKey: "new" },
  { value: "/review", label: "Review", countKey: "due" },
  { value: "/list", label: "List", countKey: null },
  { value: "/upload", label: "Upload", countKey: null },
] as const;

function AppLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { counts, countsError, refreshCounts } = useCounts();

  // Refresh counts on route change
  useEffect(() => {
    refreshCounts();
  }, [location.pathname]);

  const currentTab = TAB_ROUTES.some((r) => r.value === location.pathname)
    ? location.pathname
    : "/";

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-3xl px-4 py-8">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-bold tracking-tight">Daily Review</h1>
          <UserMenu />
        </div>

        {countsError && (
          <p className="mb-4 text-sm text-destructive">{countsError}</p>
        )}

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
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </div>
  );
}

export default function App() {
  const { data: session, isPending } = useSession();

  if (isPending) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (!session) {
    return <AuthView />;
  }

  return (
    <BrowserRouter>
      <CountsProvider>
        <AppLayout />
      </CountsProvider>
    </BrowserRouter>
  );
}
