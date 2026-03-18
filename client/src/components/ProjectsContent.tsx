import React, { useState, useMemo, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useDebounce } from "@/hooks/useDebounce";
import { useProjectsContext } from "@/context/ProjectsContext";
import { Layout } from "@/components/layout/Layout";
import { cn } from "@/lib/utils";
import { 
  Users, 
  Shield, 
  Puzzle, 
  ChevronRight,
  ChevronDown,
  Columns,
  Send,
  Save,
  Loader2,
  Globe,
  Lock,
  Eye,
  Settings as SettingsIcon,
  Plus,
  Pencil,
  Trash2,
  MessageSquare,
  Search,
  Filter,
  MoreVertical,
  Mail,
  UserPlus,
  Github,
  Slack,
  MessageCircle,
  Hash,
  Activity,
  Zap,
  ExternalLink,
  Code,
  LayoutGrid,
  Flag,
  Check,
  ArrowUpDown,
  X,
  Palette,
  Tags,
  Folder,
  Archive,
  RotateCcw,
  Layers,
  Clock,
  GripVertical
} from "lucide-react";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { PageLoadingAnimation, SectionLoadingSpinner } from "@/components/PageLoadingAnimation";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { TaskDetailsModal, Task } from "@/components/kanban/TaskDetailsModal";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
  DialogDescription
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

// Loading animation components - replaced skeletons with smooth animations
const KanbanLoading = () => (
  <div className="flex gap-6 items-start h-full px-6 pb-6">
    {[1, 2, 3, 4].map((col) => (
      <div key={col} className="w-80 shrink-0 flex flex-col gap-4">
        <SectionLoadingSpinner text="" />
      </div>
    ))}
  </div>
);

const ProjectListLoading = () => (
  <div className="p-4">
    <SectionLoadingSpinner text="Загрузка проектов..." />
  </div>
);

// Function to determine column color based on column name or custom color
const getColumnColor = (columnName: string, customColor?: string | null): { bg: string; text: string; border: string; badge: string } => {
  // If custom color is provided from database, use it
  if (customColor) {
    // Map Tailwind color classes to corresponding styles
    const colorMap: Record<string, { bg: string; text: string; border: string; badge: string }> = {
      'bg-blue-500': { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-500', badge: 'bg-blue-100 text-blue-700' },
      'bg-emerald-500': { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-500', badge: 'bg-emerald-100 text-emerald-700' },
      'bg-amber-500': { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-500', badge: 'bg-amber-100 text-amber-700' },
      'bg-rose-500': { bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-500', badge: 'bg-rose-100 text-rose-700' },
      'bg-purple-500': { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-500', badge: 'bg-purple-100 text-purple-700' },
      'bg-indigo-500': { bg: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-500', badge: 'bg-indigo-100 text-indigo-700' },
      'bg-pink-500': { bg: 'bg-pink-50', text: 'text-pink-700', border: 'border-pink-500', badge: 'bg-pink-100 text-pink-700' },
      'bg-slate-500': { bg: 'bg-slate-50', text: 'text-slate-700', border: 'border-slate-500', badge: 'bg-slate-100 text-slate-700' },
    };
    
    return colorMap[customColor] || {
      bg: 'bg-gray-50',
      text: 'text-gray-700',
      border: 'border-gray-500',
      badge: 'bg-gray-100 text-gray-700'
    };
  }
  
  // Fallback to automatic color based on name
  const colors = [
    { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-500', badge: 'bg-blue-100 text-blue-700' },
    { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-500', badge: 'bg-emerald-100 text-emerald-700' },
    { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-500', badge: 'bg-amber-100 text-amber-700' },
    { bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-500', badge: 'bg-rose-100 text-rose-700' },
    { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-500', badge: 'bg-purple-100 text-purple-700' },
    { bg: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-500', badge: 'bg-indigo-100 text-indigo-700' },
    { bg: 'bg-pink-50', text: 'text-pink-700', border: 'border-pink-500', badge: 'bg-pink-100 text-pink-700' },
    { bg: 'bg-slate-50', text: 'text-slate-700', border: 'border-slate-500', badge: 'bg-slate-100 text-slate-700' },
  ];
  
  let hash = 0;
  for (let i = 0; i < columnName.length; i++) {
    hash = columnName.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
};

// ProjectItem component
const ProjectItem = ({ 
  project, 
  isActive, 
  isCollapsed, 
  onSelect, 
  onToggleCollapse,
  onEdit,
  onDelete
}: { 
  project: any; 
  isActive: boolean; 
  isCollapsed: boolean; 
  onSelect: (id: string) => void;
  onToggleCollapse: (id: string, e: React.MouseEvent) => void;
  onEdit: (project: any) => void;
  onDelete: (project: any) => void;
}) => {
  return (
    <div className={cn("group", isActive && "bg-accent/50")}>
      <div
        className={cn(
          "flex items-center justify-between px-3 py-2 rounded-md cursor-pointer hover:bg-accent/50 transition-colors",
          isActive && "bg-accent/70"
        )}
        onClick={() => onSelect(project.id)}
      >
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <button
            onClick={(e) => onToggleCollapse(project.id, e)}
            className="p-1 hover:bg-accent rounded"
          >
            <ChevronRight className={cn("w-4 h-4 transition-transform", isCollapsed && "rotate-90")} />
          </button>
          <div className={cn("w-3 h-3 rounded-full flex-shrink-0", project.color || "bg-blue-500")} />
          <span className="truncate text-sm font-medium">{project.name}</span>
          <Badge variant="secondary" className="flex-shrink-0">
            {project.boardCount || 0}
          </Badge>
        </div>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={(e) => {
              e.stopPropagation();
              onEdit(project);
            }}
          >
            <Pencil className="w-3 h-3" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 text-red-500 hover:text-red-600 hover:bg-red-50"
            onClick={(e) => {
              e.stopPropagation();
              onDelete(project);
            }}
          >
            <Trash2 className="w-3 h-3" />
          </Button>
        </div>
      </div>
    </div>
  );
};

ProjectItem.displayName = 'ProjectItem';

// Main component
export default function ProjectsContent() {
  const { data: user } = useQuery<any>({ queryKey: ["/api/user"] });
  
  // Get state and handlers from context
  const {
    selectedWorkspaceId,
    activeProjectId,
    activeBoardId,
    collapsedProjects,
    isLoading,
    handleWorkspaceChange,
    handleProjectChange,
    handleBoardChange,
    handleCollapsedProjectsChange,
  } = useProjectsContext();

  // UI state (kept in component, not synced to server)
  const [modalOpen, setModalOpen] = useState(false);
  const [isCreateProjectOpen, setIsCreateProjectOpen] = useState(false);
  const [isCreateBoardOpen, setIsCreateBoardOpen] = useState(false);
  const [isCreateWorkspaceOpen, setIsCreateWorkspaceOpen] = useState(false);
  const [isWorkspaceDropdownOpen, setIsWorkspaceDropdownOpen] = useState(false);
  const [newProject, setNewProject] = useState({ name: "", color: "bg-blue-500", priority: "Средний" });
  const [newBoardName, setNewBoardName] = useState("");
  const [newWorkspaceName, setNewWorkspaceName] = useState("");
  const [editingColumn, setEditingColumn] = useState<{ originalName: string, currentName: string } | null>(null);
  const [showAllTasks, setShowAllTasks] = useState(false);
  const [editingProject, setEditingProject] = useState<any>(null);
  const [isEditProjectOpen, setIsEditProjectOpen] = useState(false);
  const [deletingProjectId, setDeletingProjectId] = useState<string | null>(null);
  const [deletingBoardId, setDeletingBoardId] = useState<string | null>(null);
  
  // Column sorting state
  const [columnSortBy, setColumnSortBy] = useState<Record<string, string>>({});
  
  // Search with debounce for better performance
  const [projectSearchQuery, setProjectSearchQuery] = useState("");
  const debouncedProjectSearch = useDebounce(projectSearchQuery, 300);
  
  // Task filters state
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [taskFilters, setTaskFilters] = useState({
    status: [] as string[],
    assignee: [] as string[],
    priority: [] as string[],
    labels: [] as string[],
    search: "",
    dateFrom: undefined as Date | undefined,
    dateTo: undefined as Date | undefined,
    projects: [] as string[]
  });
  const [activeFiltersCount, setActiveFiltersCount] = useState(0);
  
  // Filter dropdown states
  const [projectFilterOpen, setProjectFilterOpen] = useState(false);
  const [workspaceFilterOpen, setWorkspaceFilterOpen] = useState(false);
  const [statusFilterOpen, setStatusFilterOpen] = useState(false);
  const [assigneeFilterOpen, setAssigneeFilterOpen] = useState(false);
  const [priorityFilterOpen, setPriorityFilterOpen] = useState(false);
  const [labelsFilterOpen, setLabelsFilterOpen] = useState(false);
  
  // Get data from server
  const { data: projects = [], isLoading: isLoadingProjects } = useQuery<any[]>({
    queryKey: ["/api/projects", selectedWorkspaceId],
    queryFn: async () => {
      const url = selectedWorkspaceId 
        ? `/api/projects?workspaceId=${selectedWorkspaceId}` 
        : "/api/projects";
      const res = await apiRequest("GET", url);
      return res.json();
    },
    staleTime: 1000 * 60 * 10,
    gcTime: 1000 * 60 * 30,
    placeholderData: [],
  });

  const { data: workspaces = [] } = useQuery<any[]>({
    queryKey: ["/api/workspaces"],
    staleTime: 1000 * 60 * 10,
    enabled: !!user?.id,
  });

  const { data: availableLabels = [] } = useQuery<any[]>({
    queryKey: ["/api/labels"],
    staleTime: 1000 * 60 * 60,
  });

  const { data: availablePriorities = [] } = useQuery<any[]>({
    queryKey: ["/api/priorities"],
    staleTime: 1000 * 60 * 60,
  });

  const { data: availableTaskTypes = [] } = useQuery<any[]>({
    queryKey: ["/api/task-types"],
    staleTime: 1000 * 60 * 60,
  });

  const { data: availableStatuses = [] } = useQuery<any[]>({
    queryKey: ["/api/custom-statuses"],
    staleTime: 1000 * 60 * 60,
  });

  // Далее остальной код компонента (useMemo, функции, mutations, JSX)
  // ...

  return (
    <Layout>
      {/* ... JSX ... */}
    </Layout>
  );
}
