import React, { useState } from "react";
import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Kanban,
  CheckSquare,
  Calendar,
  MessageSquare,
  Users,
  Settings,
  LogOut,
  Menu,
  Bell,
  Search,
  Plus
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";

const sidebarItems = [
  { icon: LayoutDashboard, label: "Dashboard", href: "/" },
  { icon: Kanban, label: "Kanban Board", href: "/kanban" },
  { icon: CheckSquare, label: "My Tasks", href: "/tasks" },
  { icon: Calendar, label: "Calendar", href: "/calendar" },
  { icon: MessageSquare, label: "Team Chat", href: "/chat" },
  { icon: Users, label: "Team", href: "/team" },
];

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  const SidebarContent = () => (
    <div className="flex flex-col h-full bg-sidebar text-sidebar-foreground border-r border-sidebar-border">
      <div className="p-6">
        <div className="flex items-center gap-2 mb-8">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-primary-foreground font-bold text-xl">
            T
          </div>
          <span className="font-sans font-bold text-lg">TeamSync</span>
        </div>

        <div className="mb-4">
          <Button variant="outline" className="w-full justify-start gap-2 bg-sidebar-accent/50 border-sidebar-border text-sidebar-foreground/70 hover:text-sidebar-foreground shadow-sm">
            <Plus className="w-4 h-4" />
            <span>New Project</span>
          </Button>
        </div>
      </div>

      <ScrollArea className="flex-1 px-4">
        <div className="space-y-1">
          <p className="text-xs font-medium text-muted-foreground px-2 mb-2 uppercase tracking-wider">Menu</p>
          {sidebarItems.map((item) => {
            const isActive = location === item.href;
            return (
              <Link key={item.href} href={item.href}>
                <a
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 group",
                    isActive
                      ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                  )}
                >
                  <item.icon className={cn("w-5 h-5", isActive ? "text-sidebar-primary-foreground" : "text-muted-foreground group-hover:text-sidebar-accent-foreground")} />
                  {item.label}
                </a>
              </Link>
            );
          })}
        </div>

        <div className="mt-8 space-y-1">
          <p className="text-xs font-medium text-muted-foreground px-2 mb-2 uppercase tracking-wider">Your Teams</p>
          {["Design Team", "Engineering", "Marketing"].map((team, i) => (
             <button key={i} className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors text-left">
                <span className={cn("w-2 h-2 rounded-full", i===0 ? "bg-purple-500" : i===1 ? "bg-blue-500" : "bg-orange-500")} />
                {team}
             </button>
          ))}
        </div>
      </ScrollArea>

      <div className="p-4 border-t border-sidebar-border">
        <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-sidebar-accent transition-colors cursor-pointer">
          <Avatar className="w-9 h-9 border border-border">
            <AvatarImage src="https://github.com/shadcn.png" />
            <AvatarFallback>JD</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">Jane Doe</p>
            <p className="text-xs text-muted-foreground truncate">Product Lead</p>
          </div>
          <Settings className="w-4 h-4 text-muted-foreground" />
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background flex">
      {/* Desktop Sidebar */}
      <div className="hidden md:block w-64 flex-shrink-0 h-screen sticky top-0">
        <SidebarContent />
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-h-screen min-w-0">
        <header className="h-16 px-6 border-b border-border flex items-center justify-between bg-card/50 backdrop-blur-sm sticky top-0 z-10">
          <div className="flex items-center gap-4">
             <Sheet open={isMobileOpen} onOpenChange={setIsMobileOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="md:hidden">
                  <Menu className="w-5 h-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="p-0 w-64 border-r-sidebar-border bg-sidebar text-sidebar-foreground">
                <SidebarContent />
              </SheetContent>
            </Sheet>
            <div className="relative hidden sm:block w-96">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search tasks, projects, or messages..."
                className="pl-9 bg-secondary/50 border-transparent hover:bg-secondary focus:bg-background transition-colors rounded-xl"
              />
            </div>
          </div>

          <div className="flex items-center gap-3">
             <Button variant="ghost" size="icon" className="relative rounded-full hover:bg-secondary">
               <Bell className="w-5 h-5 text-muted-foreground" />
               <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-red-500 rounded-full border-2 border-background" />
             </Button>
          </div>
        </header>

        <main className="flex-1 p-6 md:p-8 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
