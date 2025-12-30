import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/dashboard";
import Kanban from "@/pages/kanban";
import Tasks from "@/pages/tasks";
import CalendarPage from "@/pages/calendar";
import Chat from "@/pages/chat";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/kanban" component={Kanban} />
      <Route path="/tasks" component={Tasks} />
      <Route path="/calendar" component={CalendarPage} />
      <Route path="/chat" component={Chat} />
      <Route path="/team" component={Dashboard} /> {/* Placeholder for now */}
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
