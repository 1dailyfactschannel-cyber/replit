import React, { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Layout } from "@/components/layout/Layout";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import { apiRequest } from "@/lib/queryClient";
import { usePermission } from "@/hooks/use-permission";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import DOMPurify from "dompurify";
import {
  BookOpen,
  ChevronRight,
  ChevronDown,
  FileText,
  Search,
  Plus,
  Pencil,
  Trash2,
  Eye,
  EyeOff,
  GripVertical,
  ArrowUp,
  ArrowDown,
  AlertCircle,
  Loader2,
  X,
  LucideIcon,
  Lock,
  LayoutDashboard,
  Kanban,
  CheckSquare,
  Calendar,
  MessageSquare,
  Users,
  Settings,
  Bell,
  BarChart2,
  ShoppingBag,
  Shield,
  Star,
  Phone,
  Video,
  Paperclip,
  Send,
  Check,
  Download,
  Camera,
  Coins,
  Clock,
  TrendingUp,
  FolderOpen,
  Briefcase,
  RefreshCw,
  Play,
  Activity,
  LayoutGrid,
  Archive,
  RotateCcw,
  Layers,
  Tags,
  Palette,
  Store,
  Package,
  Code,
  Globe,
  Zap,
  Flag,
  Hash,
  ListChecks,
  XCircle,
  Timer,
  CreditCard,
  History,
  AlertTriangle,
  Wrench,
  GitBranch,
  Smartphone,
  FolderPlus,
  UserPlus,
  MessageCircle,
  ToggleLeft,
  User,
  Key,
  Mail,
  ExternalLink,
  Monitor,
  Award,
  Minus,
  Image,
} from "lucide-react";

const ICON_MAP: Record<string, LucideIcon> = {
  Lock, LayoutDashboard, Kanban, CheckSquare, Calendar, MessageSquare, Users,
  Settings, Bell, BarChart2, ShoppingBag, Shield, Star, Phone, Video, Paperclip,
  Send, Check, Download, Camera, Coins, Clock, TrendingUp, FolderOpen, Briefcase,
  RefreshCw, Play, Activity, LayoutGrid, Archive, RotateCcw, Layers, Tags,
  Palette, Store, Package, Code, Globe, Zap, Flag, Hash, ListChecks, XCircle,
  Timer, CreditCard, History, AlertTriangle, Wrench, GitBranch, Smartphone,
  FolderPlus, UserPlus, MessageCircle, ToggleLeft, User, Key, Mail, ExternalLink,
  Monitor, Award, Minus, Image, FileText, Eye, EyeOff, Plus, Pencil, Trash2,
  ArrowUp, ArrowDown, Search, BookOpen, ChevronRight, ChevronDown, GripVertical,
  AlertCircle, Loader2, X,
};

function DynamicIcon({ name, className }: { name?: string | null; className?: string }) {
  const Icon = name ? ICON_MAP[name] : null;
  if (!Icon) return <FileText className={className || "w-4 h-4"} />;
  return <Icon className={className || "w-4 h-4"} />;
}

const POPULAR_ICONS = [
  "BookOpen", "Lock", "LayoutDashboard", "Kanban", "CheckSquare", "Calendar",
  "MessageSquare", "Users", "Settings", "Bell", "BarChart2", "ShoppingBag",
  "Shield", "Star", "Phone", "Video", "Paperclip", "Send", "Check", "Download",
  "Camera", "Coins", "Clock", "TrendingUp", "FolderOpen", "Briefcase", "RefreshCw",
  "Play", "Activity", "LayoutGrid", "Archive", "RotateCcw", "Layers", "Tags",
  "Palette", "Store", "Package", "Code", "Globe", "Zap", "Flag", "Hash",
  "ListChecks", "XCircle", "Timer", "CreditCard", "History", "AlertTriangle",
  "Wrench", "GitBranch", "Smartphone", "FolderPlus", "UserPlus", "MessageCircle",
  "ToggleLeft", "User", "Key", "Mail", "ExternalLink", "Monitor", "Award",
  "Minus", "Image", "FileText", "Eye", "EyeOff", "Plus", "Pencil", "Trash2",
  "ArrowUp", "ArrowDown", "Search", "ChevronRight", "ChevronDown", "GripVertical",
  "AlertCircle", "Loader2", "X",
];

function IconPicker({ value, onChange }: { value: string; onChange: (icon: string) => void }) {
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState("");
  const filtered = useMemo(() => {
    if (!filter.trim()) return POPULAR_ICONS;
    const q = filter.toLowerCase();
    return POPULAR_ICONS.filter((name) => name.toLowerCase().includes(q));
  }, [filter]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" className="w-full justify-start gap-2 text-xs h-9">
          <DynamicIcon name={value} className="w-4 h-4" />
          <span className="truncate">{value || "Выберите иконку"}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-2" align="start">
        <div className="space-y-2">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input
              placeholder="Поиск иконки..."
              className="pl-7 h-7 text-xs"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
            />
          </div>
          <ScrollArea className="h-48">
            <div className="grid grid-cols-6 gap-1">
              {filtered.map((name) => (
                <button
                  key={name}
                  type="button"
                  onClick={() => { onChange(name); setOpen(false); }}
                  className={cn(
                    "flex items-center justify-center h-8 w-8 rounded-md transition-colors",
                    value === name
                      ? "bg-primary text-primary-foreground"
                      : "hover:bg-muted text-muted-foreground"
                  )}
                  title={name}
                >
                  <DynamicIcon name={name} className="w-4 h-4" />
                </button>
              ))}
            </div>
            {filtered.length === 0 && (
              <p className="text-xs text-muted-foreground text-center py-4">Ничего не найдено</p>
            )}
          </ScrollArea>
        </div>
      </PopoverContent>
    </Popover>
  );
}

interface KBArticle {
  id: string;
  sectionId: string;
  title: string;
  content: string | null;
  sortOrder: number | null;
  isVisible: boolean | null;
  createdAt: string | null;
  updatedAt: string | null;
}

interface KBSection {
  id: string;
  title: string;
  icon: string | null;
  sortOrder: number | null;
  isVisible: boolean | null;
  createdAt: string | null;
  updatedAt: string | null;
}

interface SectionWithArticles extends KBSection {
  articles: KBArticle[];
}

export default function KnowledgeBasePage() {
  const queryClient = useQueryClient();
  const { isAdmin, canManage, isLoading: permLoading } = usePermission();
  const isEditor = canManage("team");

  const [searchQuery, setSearchQuery] = useState("");
  const [activeSectionId, setActiveSectionId] = useState<string | null>(null);
  const [activeArticleId, setActiveArticleId] = useState<string | null>(null);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());

  // Section dialog
  const [sectionDialogOpen, setSectionDialogOpen] = useState(false);
  const [editingSection, setEditingSection] = useState<KBSection | null>(null);
  const [sectionForm, setSectionForm] = useState({ title: "", icon: "FileText", sortOrder: 0, isVisible: true });

  // Article dialog
  const [articleDialogOpen, setArticleDialogOpen] = useState(false);
  const [editingArticle, setEditingArticle] = useState<KBArticle | null>(null);
  const [articleSectionId, setArticleSectionId] = useState<string | null>(null);
  const [articleForm, setArticleForm] = useState({ title: "", content: "", sortOrder: 0, isVisible: true });

  const { data: sectionsData = [], isLoading: sectionsLoading } = useQuery<KBSection[]>({
    queryKey: [isEditor ? "/api/kb/sections/all" : "/api/kb/sections"],
    queryFn: async () => {
      const url = isEditor ? "/api/kb/sections/all" : "/api/kb/sections";
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch sections");
      return res.json();
    },
  });

  const { data: articlesData = [], isLoading: articlesLoading } = useQuery<KBArticle[]>({
    queryKey: ["/api/kb/articles"],
    queryFn: async () => {
      const res = await fetch("/api/kb/articles", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch articles");
      return res.json();
    },
  });

  const sectionsWithArticles = useMemo<SectionWithArticles[]>(() => {
    const sections = sectionsData
      .filter((s) => isEditor || s.isVisible !== false)
      .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
    return sections.map((s) => ({
      ...s,
      articles: articlesData
        .filter((a) => a.sectionId === s.id)
        .filter((a) => isEditor || a.isVisible !== false)
        .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0)),
    }));
  }, [sectionsData, articlesData, isEditor]);

  const activeSection = useMemo(() => sectionsWithArticles.find((s) => s.id === activeSectionId) || null, [sectionsWithArticles, activeSectionId]);
  const activeArticle = useMemo(() => articlesData.find((a) => a.id === activeArticleId) || null, [articlesData, activeArticleId]);

  // Search across all articles
  const allArticles = useMemo(() => {
    return sectionsWithArticles.flatMap((s) => s.articles);
  }, [sectionsWithArticles]);

  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return null;
    const q = searchQuery.toLowerCase();
    return allArticles.filter((a) =>
      a.title.toLowerCase().includes(q) ||
      (a.content || "").toLowerCase().includes(q)
    );
  }, [searchQuery, allArticles]);

  // Mutations
  const createSectionMutation = useMutation({
    mutationFn: async (data: { title: string; icon: string; sortOrder: number; isVisible: boolean }) => {
      const res = await apiRequest("POST", "/api/kb/sections", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/kb/sections/all"] });
      queryClient.invalidateQueries({ queryKey: ["/api/kb/sections"] });
      setSectionDialogOpen(false);
    },
  });

  const updateSectionMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<KBSection> }) => {
      const res = await apiRequest("PATCH", `/api/kb/sections/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/kb/sections/all"] });
      queryClient.invalidateQueries({ queryKey: ["/api/kb/sections"] });
      setSectionDialogOpen(false);
    },
  });

  const deleteSectionMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/kb/sections/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/kb/sections/all"] });
      queryClient.invalidateQueries({ queryKey: ["/api/kb/sections"] });
      queryClient.invalidateQueries({ queryKey: ["/api/kb/articles"] });
      if (activeSectionId) {
        setActiveSectionId(null);
        setActiveArticleId(null);
      }
    },
  });

  const createArticleMutation = useMutation({
    mutationFn: async (data: { sectionId: string; title: string; content: string; sortOrder: number; isVisible: boolean }) => {
      const res = await apiRequest("POST", "/api/kb/articles", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/kb/articles"] });
      setArticleDialogOpen(false);
    },
  });

  const updateArticleMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<KBArticle> }) => {
      const res = await apiRequest("PATCH", `/api/kb/articles/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/kb/articles"] });
      setArticleDialogOpen(false);
    },
  });

  const deleteArticleMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/kb/articles/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/kb/articles"] });
      if (activeArticleId) setActiveArticleId(null);
    },
  });

  const reorderMutation = useMutation({
    mutationFn: async (data: { sections?: { id: string; sortOrder: number }[]; articles?: { id: string; sortOrder: number; sectionId: string }[] }) => {
      const res = await apiRequest("PATCH", "/api/kb/reorder", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/kb/sections/all"] });
      queryClient.invalidateQueries({ queryKey: ["/api/kb/sections"] });
      queryClient.invalidateQueries({ queryKey: ["/api/kb/articles"] });
    },
  });

  const openSectionDialog = (section?: KBSection) => {
    if (section) {
      setEditingSection(section);
      setSectionForm({
        title: section.title,
        icon: section.icon || "FileText",
        sortOrder: section.sortOrder ?? 0,
        isVisible: section.isVisible !== false,
      });
    } else {
      setEditingSection(null);
      setSectionForm({ title: "", icon: "FileText", sortOrder: sectionsData.length, isVisible: true });
    }
    setSectionDialogOpen(true);
  };

  const openArticleDialog = (sectionId: string, article?: KBArticle) => {
    setArticleSectionId(sectionId);
    if (article) {
      setEditingArticle(article);
      setArticleForm({
        title: article.title,
        content: article.content || "",
        sortOrder: article.sortOrder ?? 0,
        isVisible: article.isVisible !== false,
      });
    } else {
      setEditingArticle(null);
      setArticleForm({ title: "", content: "", sortOrder: 0, isVisible: true });
    }
    setArticleDialogOpen(true);
  };

  const handleSaveSection = () => {
    if (!sectionForm.title.trim()) return;
    if (editingSection) {
      updateSectionMutation.mutate({ id: editingSection.id, data: sectionForm });
    } else {
      createSectionMutation.mutate(sectionForm);
    }
  };

  const handleSaveArticle = () => {
    if (!articleForm.title.trim() || !articleSectionId) return;
    if (editingArticle) {
      updateArticleMutation.mutate({ id: editingArticle.id, data: articleForm });
    } else {
      createArticleMutation.mutate({ ...articleForm, sectionId: articleSectionId, content: articleForm.content || "" });
    }
  };

  const moveSection = (index: number, direction: "up" | "down") => {
    const items = [...sectionsWithArticles];
    if (direction === "up" && index > 0) {
      [items[index], items[index - 1]] = [items[index - 1], items[index]];
    } else if (direction === "down" && index < items.length - 1) {
      [items[index], items[index + 1]] = [items[index + 1], items[index]];
    }
    const updates = items.map((s, i) => ({ id: s.id, sortOrder: i }));
    reorderMutation.mutate({ sections: updates });
  };

  const moveArticle = (sectionId: string, index: number, direction: "up" | "down") => {
    const section = sectionsWithArticles.find((s) => s.id === sectionId);
    if (!section) return;
    const items = [...section.articles];
    if (direction === "up" && index > 0) {
      [items[index], items[index - 1]] = [items[index - 1], items[index]];
    } else if (direction === "down" && index < items.length - 1) {
      [items[index], items[index + 1]] = [items[index + 1], items[index]];
    }
    const updates = items.map((a, i) => ({ id: a.id, sortOrder: i, sectionId }));
    reorderMutation.mutate({ articles: updates });
  };

  const toggleSection = (id: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectArticle = (article: KBArticle) => {
    setActiveArticleId(article.id);
    setActiveSectionId(article.sectionId);
    if (!expandedSections.has(article.sectionId)) {
      setExpandedSections((prev) => new Set(prev).add(article.sectionId));
    }
  };

  const sanitizedHtml = (html: string) => {
    return DOMPurify.sanitize(html, {
      ALLOWED_TAGS: [
        "p", "br", "strong", "b", "em", "i", "u", "s", "strike", "del",
        "h1", "h2", "h3", "h4", "h5", "h6",
        "ul", "ol", "li", "blockquote", "pre", "code",
        "a", "img", "span", "div", "hr",
        "table", "thead", "tbody", "tr", "td", "th",
      ],
      ALLOWED_ATTR: [
        "href", "target", "rel", "src", "alt", "title", "class", "style",
        "width", "height", "data-icon",
      ],
    });
  };

  function domNodeToReact(node: Node, key: number): React.ReactNode {
    if (node.nodeType === Node.TEXT_NODE) {
      return node.textContent;
    }
    if (node.nodeType !== Node.ELEMENT_NODE) {
      return null;
    }
    const el = node as HTMLElement;
    const tagName = el.tagName.toLowerCase();

    // Handle icon spans
    if (tagName === 'span' && el.hasAttribute('data-icon')) {
      const iconName = el.getAttribute('data-icon');
      return (
        <DynamicIcon
          key={key}
          name={iconName}
          className="w-4 h-4 inline-block mr-1.5 align-text-bottom text-primary shrink-0"
        />
      );
    }

    // Build props
    const props: any = { key };
    const allowedAttrs = ['class', 'id', 'href', 'target', 'rel', 'src', 'alt', 'title', 'width', 'height'];
    allowedAttrs.forEach((attr) => {
      if (el.hasAttribute(attr)) {
        props[attr] = el.getAttribute(attr);
      }
    });

    // Recursively process children
    const children = Array.from(el.childNodes).map((child, i) => domNodeToReact(child, i));
    return React.createElement(tagName, props, children);
  }

  function ArticleContent({ html }: { html: string }) {
    const nodes = useMemo(() => {
      const clean = sanitizedHtml(html);
      const parser = new DOMParser();
      const doc = parser.parseFromString(clean, 'text/html');
      return Array.from(doc.body.childNodes);
    }, [html]);

    return <>{nodes.map((node, i) => domNodeToReact(node, i))}</>;
  }

  const isLoading = sectionsLoading || articlesLoading || permLoading;

  return (
    <Layout>
      <div className="flex h-[calc(100vh-4rem)] overflow-hidden">
        {/* Sidebar */}
        <aside className="w-80 border-r bg-card flex flex-col shrink-0 text-foreground">
          <div className="p-4 border-b space-y-3">
            <div className="flex items-center justify-between">
              <h1 className="font-semibold text-sm flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-primary" />
                База знаний
              </h1>
              {isEditor && (
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openSectionDialog()} title="Добавить раздел">
                  <Plus className="w-4 h-4" />
                </Button>
              )}
            </div>
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <Input
                placeholder="Поиск по статьям..."
                className="pl-8 h-8 text-xs"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <button
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  onClick={() => setSearchQuery("")}
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>

          <ScrollArea className="flex-1">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
              </div>
            ) : searchResults ? (
              <div className="p-3 space-y-1">
                {searchResults.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-8">Ничего не найдено</p>
                ) : (
                  searchResults.map((article) => {
                    const section = sectionsWithArticles.find((s) => s.id === article.sectionId);
                    return (
                      <button
                        key={article.id}
                        onClick={() => {
                          selectArticle(article);
                          setSearchQuery("");
                        }}
                        className={cn(
                          "w-full text-left px-3 py-2 rounded-md text-xs transition-colors",
                          activeArticleId === article.id
                            ? "bg-primary/10 text-primary font-medium"
                            : "hover:bg-muted text-foreground"
                        )}
                      >
                        <div className="font-medium truncate">{article.title}</div>
                        {section && (
                          <div className="text-[10px] text-muted-foreground flex items-center gap-1 mt-0.5">
                            <DynamicIcon name={section.icon} className="w-3 h-3" />
                            {section.title}
                          </div>
                        )}
                      </button>
                    );
                  })
                )}
              </div>
            ) : (
              <div className="p-2 space-y-1">
                {sectionsWithArticles.length === 0 && (
                  <p className="text-xs text-muted-foreground text-center py-8">
                    {isEditor ? "Нет разделов. Создайте первый раздел." : "База знаний пуста"}
                  </p>
                )}
                {sectionsWithArticles.map((section, sIdx) => {
                  const isExpanded = expandedSections.has(section.id);
                  const isActiveSection = activeSectionId === section.id;
                  return (
                    <Collapsible key={section.id} open={isExpanded} onOpenChange={() => toggleSection(section.id)}>
                      <CollapsibleTrigger asChild>
                        <button
                          className={cn(
                            "w-full flex items-center gap-2 px-3 py-2 rounded-md text-xs transition-colors group",
                            isActiveSection && !activeArticleId
                              ? "bg-primary/10 text-primary font-medium"
                              : "hover:bg-muted text-foreground"
                          )}
                        >
                          <ChevronDown
                            className={cn(
                              "w-3 h-3 shrink-0 transition-transform",
                              !isExpanded && "-rotate-90"
                            )}
                          />
                          <DynamicIcon name={section.icon} className="w-3.5 h-3.5 shrink-0" />
                          <span className="flex-1 text-left truncate">{section.title}</span>
                          {isEditor && section.isVisible === false && <EyeOff className="w-3 h-3 text-muted-foreground" />}
                          <Badge variant="secondary" className="text-[10px] h-4 px-1 shrink-0">
                            {section.articles.length}
                          </Badge>
                          {isEditor && (
                            <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                              <div
                                className={cn("inline-flex items-center justify-center h-5 w-5 rounded-md cursor-pointer hover:bg-accent", (sIdx === 0 || reorderMutation.isPending) && "opacity-30 pointer-events-none")}
                                onClick={(e) => { e.stopPropagation(); moveSection(sIdx, "up"); }}
                                role="button"
                                tabIndex={0}
                              >
                                <ArrowUp className="w-3 h-3" />
                              </div>
                              <div
                                className={cn("inline-flex items-center justify-center h-5 w-5 rounded-md cursor-pointer hover:bg-accent", (sIdx === sectionsWithArticles.length - 1 || reorderMutation.isPending) && "opacity-30 pointer-events-none")}
                                onClick={(e) => { e.stopPropagation(); moveSection(sIdx, "down"); }}
                                role="button"
                                tabIndex={0}
                              >
                                <ArrowDown className="w-3 h-3" />
                              </div>
                              <div
                                className="inline-flex items-center justify-center h-5 w-5 rounded-md cursor-pointer hover:bg-accent"
                                onClick={(e) => { e.stopPropagation(); openSectionDialog(section); }}
                                role="button"
                                tabIndex={0}
                              >
                                <Pencil className="w-3 h-3" />
                              </div>
                              <div
                                className="inline-flex items-center justify-center h-5 w-5 rounded-md cursor-pointer hover:bg-accent text-destructive hover:text-destructive"
                                onClick={(e) => { e.stopPropagation(); if (confirm("Удалить раздел и все статьи в нём?")) deleteSectionMutation.mutate(section.id); }}
                                role="button"
                                tabIndex={0}
                              >
                                <Trash2 className="w-3 h-3" />
                              </div>
                            </div>
                          )}
                        </button>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <div className="pl-7 pr-2 pb-1 space-y-0.5">
                          {section.articles.length === 0 && isEditor && (
                            <p className="text-[10px] text-muted-foreground px-2 py-1">Нет статей</p>
                          )}
                          {section.articles.map((article, aIdx) => (
                            <div key={article.id} className="flex items-center group">
                              <button
                                onClick={() => selectArticle(article)}
                                className={cn(
                                  "flex-1 text-left px-2 py-1.5 rounded-md text-xs transition-colors truncate",
                                  activeArticleId === article.id
                                    ? "bg-primary/10 text-primary font-medium"
                                    : "hover:bg-muted text-muted-foreground"
                                )}
                              >
                                <span className="truncate">{article.title}</span>
                                {isEditor && article.isVisible === false && (
                                  <EyeOff className="w-2.5 h-2.5 inline ml-1 text-muted-foreground" />
                                )}
                              </button>
                              {isEditor && (
                                <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                                  <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => moveArticle(section.id, aIdx, "up")} disabled={aIdx === 0 || reorderMutation.isPending}>
                                    <ArrowUp className="w-3 h-3" />
                                  </Button>
                                  <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => moveArticle(section.id, aIdx, "down")} disabled={aIdx === section.articles.length - 1 || reorderMutation.isPending}>
                                    <ArrowDown className="w-3 h-3" />
                                  </Button>
                                  <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => openArticleDialog(section.id, article)}>
                                    <Pencil className="w-3 h-3" />
                                  </Button>
                                  <Button variant="ghost" size="icon" className="h-5 w-5 text-destructive hover:text-destructive" onClick={() => { if (confirm("Удалить статью?")) deleteArticleMutation.mutate(article.id); }}>
                                    <Trash2 className="w-3 h-3" />
                                  </Button>
                                </div>
                              )}
                            </div>
                          ))}
                          {isEditor && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="w-full justify-start text-xs h-7 text-muted-foreground hover:text-foreground"
                              onClick={() => openArticleDialog(section.id)}
                            >
                              <Plus className="w-3 h-3 mr-1" />
                              Добавить статью
                            </Button>
                          )}
                        </div>
                      </CollapsibleContent>
                    </Collapsible>
                  );
                })}
              </div>
            )}
          </ScrollArea>
        </aside>

        {/* Content */}
        <main className="flex-1 flex flex-col min-w-0 bg-background overflow-hidden">
          <ScrollArea className="flex-1">
            {activeArticle ? (
              <article className="max-w-4xl mx-auto p-8 text-foreground">
                <nav className="flex items-center gap-2 text-xs text-muted-foreground mb-6">
                  <BookOpen className="w-3.5 h-3.5" />
                  <span>База знаний</span>
                  <ChevronRight className="w-3 h-3" />
                  <span>{activeSection?.title}</span>
                  <ChevronRight className="w-3 h-3" />
                  <span className="text-foreground font-medium">{activeArticle.title}</span>
                </nav>

                <div className="flex items-start justify-between gap-4 mb-4">
                  <h1 className="text-3xl font-bold tracking-tight text-foreground">{activeArticle.title}</h1>
                  {isEditor && (
                    <div className="flex items-center gap-1 shrink-0">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => activeSection && openArticleDialog(activeSection.id, activeArticle)}>
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => { if (confirm("Удалить статью?")) deleteArticleMutation.mutate(activeArticle.id); }}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  )}
                </div>

                {activeArticle.content ? (
                  <div className="prose prose-sm max-w-none kb-article">
                    <ArticleContent html={activeArticle.content} />
                  </div>
                ) : (
                  <p className="text-muted-foreground text-sm italic">Статья пока пуста</p>
                )}
              </article>
            ) : (
              <div className="flex h-full items-center justify-center">
                <div className="text-center space-y-4">
                  <BookOpen className="w-16 h-16 text-muted-foreground mx-auto opacity-30" />
                  <h2 className="text-xl font-bold text-muted-foreground">Выберите статью из списка</h2>
                  <p className="text-sm text-muted-foreground max-w-sm">
                    Используйте боковую панель для навигации по разделам базы знаний
                  </p>
                </div>
              </div>
            )}
          </ScrollArea>
        </main>
      </div>

      {/* Section Dialog */}
      <Dialog open={sectionDialogOpen} onOpenChange={setSectionDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingSection ? "Редактировать раздел" : "Новый раздел"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <label className="text-xs font-medium mb-1 block">Название</label>
              <Input
                value={sectionForm.title}
                onChange={(e) => setSectionForm((p) => ({ ...p, title: e.target.value }))}
                placeholder="Например, Авторизация"
              />
            </div>
            <div>
              <label className="text-xs font-medium mb-1 block">Иконка</label>
              <IconPicker
                value={sectionForm.icon}
                onChange={(icon) => setSectionForm((p) => ({ ...p, icon }))}
              />
            </div>
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <label className="text-xs font-medium mb-1 block">Порядок</label>
                <Input
                  type="number"
                  value={sectionForm.sortOrder}
                  onChange={(e) => setSectionForm((p) => ({ ...p, sortOrder: parseInt(e.target.value) || 0 }))}
                />
              </div>
              <div className="flex items-center gap-2 pt-5">
                <input
                  id="section-visible"
                  type="checkbox"
                  checked={sectionForm.isVisible}
                  onChange={(e) => setSectionForm((p) => ({ ...p, isVisible: e.target.checked }))}
                  className="rounded border-gray-300"
                />
                <label htmlFor="section-visible" className="text-xs">Видимый</label>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSectionDialogOpen(false)}>Отмена</Button>
            <Button onClick={handleSaveSection} disabled={!sectionForm.title.trim() || createSectionMutation.isPending || updateSectionMutation.isPending}>
              {(createSectionMutation.isPending || updateSectionMutation.isPending) && <Loader2 className="w-3 h-3 animate-spin mr-1" />}
              Сохранить
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Article Dialog */}
      <Dialog open={articleDialogOpen} onOpenChange={setArticleDialogOpen}>
        <DialogContent className="sm:max-w-none sm:w-[95vw] h-[95vh] flex flex-col p-0 gap-0 overflow-hidden">
          <DialogHeader className="px-6 py-4 border-b shrink-0">
            <DialogTitle>{editingArticle ? "Редактировать статью" : "Новая статья"}</DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-hidden flex flex-col px-6 py-4 gap-4 min-h-0">
            <div className="shrink-0">
              <label className="text-xs font-medium mb-1 block">Название</label>
              <Input
                value={articleForm.title}
                onChange={(e) => setArticleForm((p) => ({ ...p, title: e.target.value }))}
                placeholder="Название статьи"
              />
            </div>
            <div className="flex-1 flex flex-col min-h-0">
              <label className="text-xs font-medium mb-1 block">Содержимое</label>
              <div className="flex-1 min-h-0 flex flex-col">
                <RichTextEditor
                  content={articleForm.content}
                  onChange={(content) => setArticleForm((p) => ({ ...p, content }))}
                  placeholder="Начните писать статью..."
                />
              </div>
            </div>
            <div className="flex items-center gap-4 shrink-0">
              <div className="flex-1">
                <label className="text-xs font-medium mb-1 block">Порядок</label>
                <Input
                  type="number"
                  value={articleForm.sortOrder}
                  onChange={(e) => setArticleForm((p) => ({ ...p, sortOrder: parseInt(e.target.value) || 0 }))}
                />
              </div>
              <div className="flex items-center gap-2 pt-5">
                <input
                  id="article-visible"
                  type="checkbox"
                  checked={articleForm.isVisible}
                  onChange={(e) => setArticleForm((p) => ({ ...p, isVisible: e.target.checked }))}
                  className="rounded border-gray-300"
                />
                <label htmlFor="article-visible" className="text-xs">Видимая</label>
              </div>
            </div>
          </div>
          <DialogFooter className="px-6 py-4 border-t shrink-0">
            <Button variant="outline" onClick={() => setArticleDialogOpen(false)}>Отмена</Button>
            <Button onClick={handleSaveArticle} disabled={!articleForm.title.trim() || !articleSectionId || createArticleMutation.isPending || updateArticleMutation.isPending}>
              {(createArticleMutation.isPending || updateArticleMutation.isPending) && <Loader2 className="w-3 h-3 animate-spin mr-1" />}
              Сохранить
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
