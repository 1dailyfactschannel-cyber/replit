import React, { lazy, Suspense, useMemo } from "react";
import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight, Menu, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { User, Settings, LogOut } from "lucide-react";

const sidebarItems = [
  { icon: lazy(() => import("lucide-react").then(m => ({ default: m.LayoutDashboard }))), label: "Главная", href: "/" },
  { icon: lazy(() => import("lucide-react").then(m => ({ default: m.Kanban }))), label: "Проекты", href: "/projects" },
  { icon: lazy(() => import("lucide-react").then(m => ({ default: m.CheckSquare }))), label: "Мои задачи", href: "/tasks" },
  { icon: lazy(() => import("lucide-react").then(m => ({ default: m.Calendar }))), label: "Календарь", href: "/calendar" },
  { icon: lazy(() => import("lucide-react").then(m => ({ default: m.MessageSquare }))), label: "Общение", href: "/chat" },
  { icon: lazy(() => import("lucide-react").then(m => ({ default: m.Users }))), label: "Команда", href: "/team" },
  { icon: lazy(() => import("lucide-react").then(m => ({ default: m.BarChart2 }))), label: "Отчеты", href: "/reports" },
  { icon: lazy(() => import("lucide-react").then(m => ({ default: m.ShoppingBag }))), label: "Магазин", href: "/shop" },
  { icon: lazy(() => import("lucide-react").then(m => ({ default: m.Shield }))), label: "Управление", href: "/management" },
];

// Memoized sidebar item to prevent unnecessary re-renders
const SidebarItem = React.memo(({ 
  item, 
  isActive, 
  isCollapsed, 
  setLocation, 
  setIsMobileOpen 
}: { 
  item: typeof sidebarItems[0]; 
  isActive: boolean; 
  isCollapsed: boolean;
  setLocation: (href: string) => void;
  setIsMobileOpen: (open: boolean) => void;
}) => {
  const Icon = item.icon;
  
  return (
    <div
      onClick={() => {
        setLocation(item.href);
        if (window.innerWidth < 768) {
          setIsMobileOpen(false);
        }
      }}
      className={cn(
        "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 group overflow-hidden whitespace-nowrap cursor-pointer",
        isActive
          ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-sm"
          : "text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
        isCollapsed && "px-0 justify-center w-10 h-10 mx-auto rounded-xl hover:scale-105"
      )}
      title={isCollapsed ? item.label : ""}
    >
      <Suspense fallback={<div className="w-5 h-5 shrink-0" />}>
        <Icon className={cn("w-5 h-5 shrink-0", isActive ? "text-sidebar-primary-foreground" : "text-muted-foreground group-hover:text-sidebar-accent-foreground")} />
      </Suspense>
      {!isCollapsed && <span className="animate-in fade-in duration-300">{item.label}</span>}
    </div>
  );
});

SidebarItem.displayName = "SidebarItem";

interface SidebarContentProps {
  isCollapsed: boolean;
  location: string;
  status: string;
  setIsStatusDialogOpen: (open: boolean) => void;
  setLocation: (href: string) => void;
  setIsMobileOpen: (open: boolean) => void;
  setIsCollapsed: (collapsed: boolean) => void;
  user: any;
}

// Memoized sidebar content component
export const SidebarContentComponent = React.memo(({ 
  isCollapsed, 
  location, 
  status,
  setIsStatusDialogOpen,
  setLocation, 
  setIsMobileOpen,
  setIsCollapsed,
  user
}: SidebarContentProps) => {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  
  const displayName = useMemo(() => 
    user ? `${user.firstName || ""} ${user.lastName || ""}`.trim() || user.username : "Пользователь",
    [user]
  );
  
  const initials = useMemo(() => 
    user ? (user.firstName && user.lastName ? `${user.firstName[0]}${user.lastName[0]}` : user.username.substring(0, 2).toUpperCase()) : "П",
    [user]
  );

  const handleLogout = React.useCallback(async () => {
    try {
      await apiRequest("POST", "/api/logout");
      queryClient.setQueryData(["/api/user"], null);
      navigate("/auth");
    } catch (error) {
      console.error("Logout failed:", error);
      navigate("/auth");
    }
  }, [navigate]);

  const statusColors = {
    online: "bg-emerald-500",
    offline: "bg-slate-500",
    vacation: "bg-blue-500",
    sick: "bg-rose-500",
  };

  const statusLabels = {
    online: "В сети",
    offline: "Не в сети",
    vacation: "В отпуске",
    sick: "Больничный",
  };

  return (
    <div className={cn(
      "flex flex-col h-full bg-sidebar text-sidebar-foreground border-r border-sidebar-border transition-all duration-300 ease-in-out relative group/sidebar",
      isCollapsed ? "w-20" : "w-64"
    )}>
      {/* Collapse Toggle Button */}
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setIsCollapsed(!isCollapsed)}
        className={cn(
          "absolute -right-4 top-10 z-50 h-8 w-8 rounded-full border border-sidebar-border bg-sidebar shadow-xl hover:bg-sidebar-accent hover:scale-110 transition-all hidden md:flex items-center justify-center group/collapse",
          isCollapsed && "rotate-180"
        )}
        title={isCollapsed ? "Развернуть меню" : "Свернуть меню"}
      >
        <ChevronLeft className="h-5 w-5 text-sidebar-foreground group-hover/collapse:text-primary transition-colors" />
      </Button>

      <div className={cn("p-6", isCollapsed && "px-4 flex flex-col items-center")}>
        <div className={cn("flex items-center gap-2 mb-8 w-full", isCollapsed ? "justify-center" : "justify-between")}>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-primary-foreground font-bold text-xl shrink-0">
              T
            </div>
            {!isCollapsed && <span className="font-sans font-bold text-lg animate-in fade-in duration-300">m4portal</span>}
          </div>
          {!isCollapsed && (
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-8 w-8 rounded-lg text-muted-foreground hover:bg-sidebar-accent hover:text-foreground"
              onClick={() => setIsCollapsed(true)}
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
          )}
          {isCollapsed && (
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-8 w-8 rounded-lg text-muted-foreground hover:bg-sidebar-accent hover:text-foreground md:hidden"
              onClick={() => setIsCollapsed(false)}
            >
              <ChevronRight className="h-5 w-5" />
            </Button>
          )}
        </div>

        <div className="mb-4">
          <Button 
            variant="outline" 
            onClick={() => {
              if (location !== "/projects") setLocation("/projects");
            }}
            className={cn(
              "w-full justify-start gap-2 bg-sidebar-accent/50 border-sidebar-border text-sidebar-foreground/70 hover:text-sidebar-foreground shadow-sm overflow-hidden whitespace-nowrap",
              isCollapsed && "px-2 justify-center"
            )}
          >
            <Plus className="w-4 h-4 shrink-0" />
            {!isCollapsed && <span className="animate-in fade-in duration-300">Новый проект</span>}
          </Button>
        </div>
      </div>

      <ScrollArea className="flex-1 px-4">
        <div className="space-y-1">
          {!isCollapsed && <p className="text-xs font-medium text-muted-foreground px-2 mb-2 uppercase tracking-wider animate-in fade-in duration-300">Меню</p>}
          {sidebarItems.map((item) => {
            const isActive = item.href ? (location.startsWith(item.href) && (item.href !== "/" || location === "/")) : false;
            return (
              <SidebarItem 
                key={item.href} 
                item={item} 
                isActive={isActive}
                isCollapsed={isCollapsed}
                setLocation={setLocation}
                setIsMobileOpen={setIsMobileOpen}
              />
            );
          })}
        </div>
      </ScrollArea>

      <div className="p-4 border-t border-sidebar-border overflow-hidden">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <div 
              className={cn(
                "flex items-center gap-3 p-2 rounded-lg hover:bg-sidebar-accent transition-colors cursor-pointer whitespace-nowrap",
                isCollapsed && "px-1 justify-center"
              )}
            >
              <Avatar className="w-9 h-9 border border-border shrink-0">
                <AvatarImage src={user?.avatar || ""} alt={displayName} />
                <AvatarFallback>{initials}</AvatarFallback>
              </Avatar>
              {!isCollapsed && (
                <div className="flex-1 min-w-0 animate-in fade-in duration-300">
                  <p className="text-sm font-medium truncate">{displayName}</p>
                  <p className="text-xs text-muted-foreground truncate">{user?.position || "Сотрудник"}</p>
                </div>
              )}
            </div>
          </DropdownMenuTrigger>
          <DropdownMenuContent side={isCollapsed ? "right" : "top"} align="end" className="w-56 mb-2">
            <DropdownMenuLabel>Мой аккаунт</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem 
              className="gap-2 cursor-pointer"
              onClick={() => setIsStatusDialogOpen(true)}
            >
              <span className={cn("w-2 h-2 rounded-full", statusColors[status as keyof typeof statusColors])} />
              Статус: {statusLabels[status as keyof typeof statusLabels]}
            </DropdownMenuItem>
            <DropdownMenuItem 
              className="gap-2 cursor-pointer" 
              onClick={() => setLocation("/profile")}
            >
              <User className="w-4 h-4" />
              Профиль
            </DropdownMenuItem>
            <DropdownMenuItem 
              className="gap-2 cursor-pointer" 
              onClick={() => setLocation("/settings")}
            >
              <Settings className="w-4 h-4" />
              Настройки
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem 
              className="gap-2 cursor-pointer text-rose-500 focus:text-rose-500"
              onClick={handleLogout}
            >
              <LogOut className="w-4 h-4" />
              Выход
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
});

SidebarContentComponent.displayName = "SidebarContentComponent";
