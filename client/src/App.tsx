import { useState, useEffect, lazy, Suspense } from "react";
import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider, useQuery } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Loader2 } from "lucide-react";

// Lazy load pages
const NotFound = lazy(() => import("@/pages/not-found"));
const Dashboard = lazy(() => import("@/pages/dashboard"));
const Projects = lazy(() => import("@/pages/projects"));
const Tasks = lazy(() => import("@/pages/tasks"));
const CalendarPage = lazy(() => import("@/pages/calendar"));
const Chat = lazy(() => import("@/pages/chat"));
const Call = lazy(() => import("@/pages/call"));
const Auth = lazy(() => import("@/pages/auth"));
const Profile = lazy(() => import("@/pages/profile"));
const Team = lazy(() => import("@/pages/team"));
const Shop = lazy(() => import("@/pages/shop"));
const SettingsPage = lazy(() => import("@/pages/settings"));
const ManagementPage = lazy(() => import("@/pages/management"));

function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );
}

function ProtectedRoute({ component: Component, path }: { component: React.ComponentType<any>, path: string }) {
  const { data: user, isLoading } = useQuery({
    queryKey: ["/api/user"],
    retry: false,
  });
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!isLoading && !user) {
      setLocation("/auth");
    }
  }, [user, isLoading, setLocation]);

  if (isLoading) {
    return <PageLoader />;
  }

  if (!user) {
    return null;
  }

  return (
    <Route path={path}>
      {(params) => (
        <Suspense fallback={<PageLoader />}>
          <Component {...params} />
        </Suspense>
      )}
    </Route>
  );
}

function Router() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Switch>
        <Route path="/auth">
          {(params) => <Auth {...params} />}
        </Route>
        <ProtectedRoute path="/" component={Dashboard} />
        <ProtectedRoute path="/profile" component={Profile} />
        <ProtectedRoute path="/team" component={Team} />
        <ProtectedRoute path="/shop" component={Shop} />
        <ProtectedRoute path="/settings" component={SettingsPage} />
        <ProtectedRoute path="/management" component={ManagementPage} />
        <ProtectedRoute path="/projects" component={Projects} />
        <ProtectedRoute path="/tasks" component={Tasks} />
        <ProtectedRoute path="/calendar" component={CalendarPage} />
        <ProtectedRoute path="/chat" component={Chat} />
        <ProtectedRoute path="/call" component={Call} />
        <Route>
          {(params) => <NotFound {...params} />}
        </Route>
      </Switch>
    </Suspense>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Router />
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}
