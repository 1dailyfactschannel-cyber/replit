import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
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

function Router() {
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/auth" component={Auth} />
      <Route path="/profile" component={Profile} />
      <Route path="/team" component={Team} />
      <Route path="/shop" component={Shop} />
      <Route path="/settings" component={SettingsPage} />
      <Route path="/management" component={ManagementPage} />
      <Route path="/projects" component={Projects} />
      <Route path="/tasks" component={Tasks} />
      <Route path="/calendar" component={CalendarPage} />
      <Route path="/chat" component={Chat} />
      <Route path="/call" component={Call} />
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
