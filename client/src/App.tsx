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
import Roles from "@/pages/roles";

function Router() {
  return (
    <Switch>
      <Route path="/auth" component={Auth} />
      <Route path="/profile" component={Profile} />
      <Route path="/team" component={Team} />
      <Route path="/shop" component={Shop} />
      <Route path="/roles" component={Roles} />
      <Route path="/" component={Dashboard} />
      <Route path="/projects" component={Projects} />
      <Route path="/tasks" component={Tasks} />
      <Route path="/calendar" component={CalendarPage} />
      <Route path="/chat" component={Chat} />
      <Route path="/call" component={Call} />
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
