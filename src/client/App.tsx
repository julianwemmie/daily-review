import { useState, useCallback, useEffect, useMemo } from "react";
import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useSession } from "@/lib/auth-client.js";
import { useHotkey } from "@/lib/useHotkey.js";
import { useCounts, usePrefetchCards } from "@/hooks/useCards.js";
import { ROUTES } from "@/lib/routes.js";
import UserMenu from "@/components/UserMenu.js";
import OnboardingModal from "@/components/OnboardingModal.js";
import AuthView from "@/views/AuthView.js";
import TriageView from "@/views/TriageView.js";
import ReviewView from "@/views/ReviewView.js";
import CreateView from "@/views/CreateView.js";
import ExploreView from "@/views/ExploreView.js";
import DeviceView from "@/views/DeviceView.js";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      refetchOnWindowFocus: false,
    },
  },
});

const ALL_TAB_ROUTES = [
  { value: ROUTES.review, label: "Review", countKey: "due", hideWhenZero: false },
  { value: ROUTES.explore, label: "Explore", countKey: null, hideWhenZero: false },
  { value: ROUTES.triage, label: "New", countKey: "new", hideWhenZero: true },
  { value: ROUTES.create, label: "Create", countKey: null, hideWhenZero: false },
] as const;

function AppLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { data: counts, error: countsError } = useCounts();
  const { data: session } = useSession();

  // Prefetch all card views on mount for instant tab switching
  usePrefetchCards();

  const [onboardingOpen, setOnboardingOpen] = useState(false);

  useEffect(() => {
    if (!session?.user?.id) return;
    fetch("/api/onboarding/status", { credentials: "include" })
      .then((res) => res.json())
      .then((data) => {
        if (!data.completed) setOnboardingOpen(true);
      })
      .catch(() => {});
  }, [session?.user?.id]);

  function handleOnboardingOpenChange(open: boolean) {
    setOnboardingOpen(open);
    if (!open) {
      fetch("/api/onboarding/complete", {
        method: "POST",
        credentials: "include",
      }).catch(() => {});
    }
  }

  const visibleTabs = useMemo(() => {
    return ALL_TAB_ROUTES.filter((route) => {
      if (!route.hideWhenZero) return true;
      if (route.value === location.pathname) return true;
      return counts && route.countKey && counts[route.countKey] > 0;
    });
  }, [counts, location.pathname]);

  const currentTabIndex = visibleTabs.findIndex((r) => r.value === location.pathname);

  const goLeft = useCallback(() => {
    const prev = currentTabIndex > 0 ? currentTabIndex - 1 : visibleTabs.length - 1;
    navigate(visibleTabs[prev].value);
  }, [currentTabIndex, visibleTabs, navigate]);

  const goRight = useCallback(() => {
    const next = currentTabIndex < visibleTabs.length - 1 ? currentTabIndex + 1 : 0;
    navigate(visibleTabs[next].value);
  }, [currentTabIndex, visibleTabs, navigate]);

  useHotkey({ key: "ArrowLeft", onPress: goLeft });
  useHotkey({ key: "ArrowRight", onPress: goRight });

  const currentTab = visibleTabs.some((r) => r.value === location.pathname)
    ? location.pathname
    : ROUTES.review;

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-3xl px-4 py-8">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-bold tracking-tight">Amber</h1>
          <UserMenu onHelpClick={() => setOnboardingOpen(true)} />
        </div>

        {countsError && (
          <p className="mb-4 text-sm text-destructive">{countsError.message}</p>
        )}

        <Tabs value={currentTab} onValueChange={(val) => navigate(val)} className="mb-8">
          <div className="flex items-center gap-3">
            <TabsList>
              {visibleTabs.map((route) => (
                <TabsTrigger key={route.value} value={route.value} className="gap-1.5">
                  {route.label}
                  {route.countKey && counts && counts[route.countKey] > 0 && (
                    <Badge className="ml-1 px-1.5 py-0 text-[10px] leading-4 min-w-[1.25rem] bg-emerald-600/70 text-white">
                      {counts[route.countKey]}
                    </Badge>
                  )}
                </TabsTrigger>
              ))}
            </TabsList>
            <span className="text-[11px] text-muted-foreground">
              <kbd className="rounded border border-border bg-muted px-1 py-0.5 font-mono text-[10px]">&larr;</kbd>
              {" "}
              <kbd className="rounded border border-border bg-muted px-1 py-0.5 font-mono text-[10px]">&rarr;</kbd>
            </span>
          </div>
        </Tabs>

        <Routes>
          <Route path={ROUTES.review} element={<ReviewView />} />
          <Route path={ROUTES.triage} element={<TriageView />} />
          <Route path={ROUTES.explore} element={<ExploreView />} />
          <Route path={ROUTES.create} element={<CreateView />} />
          <Route path="*" element={<Navigate to={ROUTES.review} replace />} />
        </Routes>
      </div>

      <OnboardingModal open={onboardingOpen} onOpenChange={handleOnboardingOpenChange} />
    </div>
  );
}

function AuthGate() {
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

  return <AppLayout />;
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path={ROUTES.device} element={<DeviceView />} />
          <Route path="*" element={<AuthGate />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
