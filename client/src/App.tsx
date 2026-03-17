import { useState, useEffect, lazy, Suspense, startTransition } from "react";
import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider, useQuery } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as SonnerToaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { PageLoadingAnimation } from "@/components/PageLoadingAnimation";

// Eager load critical pages for better initial load
import Dashboard from "@/pages/dashboard";

// Lazy load heavy pages
const NotFound = lazy(() => import("@/pages/not-found"));
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
const ReportsPage = lazy(() => import("@/pages/reports"));
const NotificationsPage = lazy(() => import("@/pages/notifications"));

// Preload function for route prefetching
const preloadProjects = () => {
  const ProjectsModule = import("@/pages/projects");
  return ProjectsModule;
};

const preloadTasks = () => {
  const TasksModule = import("@/pages/tasks");
  return TasksModule;
};

// Page Loader with smooth animation
function PageLoader() {
  return <PageLoadingAnimation />;
}

// Component for prefetching routes on hover
function PrefetchLink({ href, children, className }: { href: string; children: React.ReactNode; className?: string }) {
  const [, setLocation] = useLocation();
  
  const handleMouseEnter = () => {
    // Prefetch route based on href
    switch (href) {
      case "/projects":
        preloadProjects();
        break;
      case "/tasks":
        preloadTasks();
        break;
    }
  };
  
  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    startTransition(() => {
      setLocation(href);
    });
  };
  
  return (
    <a href={href} onClick={handleClick} onMouseEnter={handleMouseEnter} className={className}>
      {children}
    </a>
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
        <ProtectedRoute path="/reports" component={ReportsPage} />
        <ProtectedRoute path="/projects" component={Projects} />
        <ProtectedRoute path="/tasks" component={Tasks} />
        <ProtectedRoute path="/calendar" component={CalendarPage} />
        <ProtectedRoute path="/chat" component={Chat} />
        <ProtectedRoute path="/call" component={Call} />
        <ProtectedRoute path="/notifications" component={NotificationsPage} />
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
        <SonnerToaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}
