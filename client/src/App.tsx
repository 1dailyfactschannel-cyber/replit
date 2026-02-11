import { useState, useEffect } from "react";
import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider, useQuery } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Loader2 } from "lucide-react";
import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/dashboard";
import Projects from "@/pages/projects";
import Tasks from "@/pages/tasks";
import CalendarPage from "@/pages/calendar";
import Chat from "@/pages/chat";
import Call from "@/pages/call";
import Auth from "@/pages/auth";
import Profile from "@/pages/profile";
import Team from "@/pages/team";
import Shop from "@/pages/shop";
import SettingsPage from "@/pages/settings";
import ManagementPage from "@/pages/management";

function ProtectedRoute({ component: Component, path }: { component: React.ComponentType, path: string }) {
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
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return <Route path={path} component={Component} />;
}

function Router() {
  return (
    <Switch>
      <Route path="/auth" component={Auth} />
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
      <Route component={NotFound} />
    </Switch>
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
