import React, { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Kanban,
  CheckSquare,
  Calendar,
  MessageSquare,
  Users,
  User,
  Settings,
  LogOut,
  Menu,
  Bell,
  Search,
  Plus,
  ShoppingBag,
  Shield
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ThemeToggle } from "./ThemeToggle";

const sidebarItems = [
  { icon: LayoutDashboard, label: "Главная", href: "/" },
  { icon: Kanban, label: "Проекты", href: "/projects" },
  { icon: CheckSquare, label: "Мои задачи", href: "/tasks" },
  { icon: Calendar, label: "Календарь", href: "/calendar" },
  { icon: MessageSquare, label: "Чат команды", href: "/chat" },
  { icon: Users, label: "Сотрудники", href: "/team" },
  { icon: ShoppingBag, label: "Магазин", href: "/shop" },
  { icon: Shield, label: "Роли", href: "/roles" },
];

export function Layout({ children }: { children: React.ReactNode }) {
  const [location, setLocation] = useLocation();
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);

  useEffect(() => {
    if (window.innerWidth >= 768) {
      if (location.startsWith("/projects")) {
        setIsCollapsed(true);
      } else {
        setIsCollapsed(false);
      }
    }
  }, [location]);

  const SidebarContent = () => (
    <div className={cn(
      "flex flex-col h-full bg-sidebar text-sidebar-foreground border-r border-sidebar-border transition-all duration-300 ease-in-out",
      isCollapsed ? "w-20" : "w-64"
    )}>
      <div className={cn("p-6", isCollapsed && "px-4 flex justify-center")}>
        <div className="flex items-center gap-2 mb-8">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-primary-foreground font-bold text-xl shrink-0">
            T
          </div>
          {!isCollapsed && <span className="font-sans font-bold text-lg animate-in fade-in duration-300">TeamSync</span>}
        </div>

        <div className="mb-4">
          <Button 
            variant="outline" 
            onClick={() => {
              if (window.innerWidth >= 768) setIsCollapsed(true);
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
            const isActive = location.startsWith(item.href) && (item.href !== "/" || location === "/");
            return (
              <div
                key={item.href}
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
                  isCollapsed && "px-2 justify-center"
                )}
                title={isCollapsed ? item.label : ""}
              >
                <item.icon className={cn("w-5 h-5 shrink-0", isActive ? "text-sidebar-primary-foreground" : "text-muted-foreground group-hover:text-sidebar-accent-foreground")} />
                {!isCollapsed && <span className="animate-in fade-in duration-300">{item.label}</span>}
              </div>
            );
          })}
        </div>

        <div className="mt-8 space-y-1">
          {!isCollapsed && <p className="text-xs font-medium text-muted-foreground px-2 mb-2 uppercase tracking-wider animate-in fade-in duration-300">Ваши команды</p>}
          {["Дизайн", "Разработка", "Маркетинг"].map((team, i) => (
             <button 
               key={i} 
               onClick={() => {
                 if (window.innerWidth >= 768) setIsCollapsed(true);
               }}
               className={cn(
                 "w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors text-left overflow-hidden whitespace-nowrap",
                 isCollapsed && "px-2 justify-center"
               )}
               title={isCollapsed ? team : ""}
             >
                <span className={cn("w-2 h-2 rounded-full shrink-0", i===0 ? "bg-purple-500" : i===1 ? "bg-blue-500" : "bg-orange-500")} />
                {!isCollapsed && <span className="animate-in fade-in duration-300">{team}</span>}
             </button>
          ))}
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
                <AvatarImage src="https://github.com/shadcn.png" />
                <AvatarFallback>ЮД</AvatarFallback>
              </Avatar>
              {!isCollapsed && (
                <div className="flex-1 min-w-0 animate-in fade-in duration-300">
                  <p className="text-sm font-medium truncate">Юлия Дарицкая</p>
                  <p className="text-xs text-muted-foreground truncate">Руководитель продукта</p>
                </div>
              )}
              {!isCollapsed && <Settings className="w-4 h-4 text-muted-foreground shrink-0" />}
            </div>
          </DropdownMenuTrigger>
          <DropdownMenuContent side={isCollapsed ? "right" : "top"} align="end" className="w-56 mb-2">
            <DropdownMenuLabel>Мой аккаунт</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="gap-2 cursor-pointer">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              Статус: В сети
            </DropdownMenuItem>
            <DropdownMenuItem 
              className="gap-2 cursor-pointer" 
              onClick={() => setLocation("/profile")}
            >
              <User className="w-4 h-4" />
              Профиль
            </DropdownMenuItem>
            <DropdownMenuItem className="gap-2 cursor-pointer">
              <Settings className="w-4 h-4" />
              Настройки
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem 
              className="gap-2 cursor-pointer text-rose-500 focus:text-rose-500"
              onClick={() => setLocation("/auth")}
            >
              <LogOut className="w-4 h-4" />
              Выход
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background flex overflow-hidden">
      {/* Desktop Sidebar */}
      <div className={cn(
        "hidden md:block flex-shrink-0 h-screen sticky top-0 transition-all duration-300 ease-in-out",
        isCollapsed ? "w-20" : "w-64"
      )}>
        <SidebarContent />
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-h-screen min-w-0 overflow-hidden">
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
                placeholder="Поиск задач, проектов или сообщений..."
                className="pl-9 bg-secondary/50 border-transparent hover:bg-secondary focus:bg-background transition-colors rounded-xl"
              />
            </div>
          </div>

          <div className="flex items-center gap-3">
             <ThemeToggle />
             <Button variant="ghost" size="icon" className="relative rounded-full hover:bg-secondary">
               <Bell className="w-5 h-5 text-muted-foreground" />
               <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-red-500 rounded-full border-2 border-background" />
             </Button>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
