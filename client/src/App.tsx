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

function Router() {
  return (
    <Switch>
      <Route path="/auth" component={Auth} />
      <Route path="/profile" component={Profile} />
      <Route path="/" component={Dashboard} />
      <Route path="/projects" component={Projects} />
      <Route path="/tasks" component={Tasks} />
      <Route path="/calendar" component={CalendarPage} />
      <Route path="/chat" component={Chat} />
      <Route path="/call" component={Call} />
      <Route path="/team" component={Dashboard} /> {/* Placeholder */}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
