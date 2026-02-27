import { Layout } from "@/components/layout/Layout";
import React, { useState, useMemo, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";
import { 
  ChevronRight, 
  ChevronDown,
  MoreVertical,
  Search,
  Hash,
  Filter,
  Users,
  Flag,
  GripVertical,
  Trash2,
  Pencil,
  Loader2,
  Plus,
  LayoutGrid,
  Columns,
  Folder,
  Check
} from "lucide-react";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { PageLoadingAnimation, SectionLoadingSpinner } from "@/components/PageLoadingAnimation";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
// import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useDebounce } from "@/hooks/useDebounce";

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

// Function to determine column color based on column name
const getColumnColor = (columnName: string): { bg: string; text: string; border: string; badge: string } => {
  const name = columnName.toLowerCase();
  
  if (name.includes('сделать') || name.includes('план') || name.includes('todo') || name.includes('to do') || name.includes('backlog')) {
    return { 
      bg: 'bg-blue-50', 
      text: 'text-blue-700', 
      border: 'border-blue-500',
      badge: 'bg-blue-100 text-blue-700'
    };
  } else if (name.includes('работ') || name.includes('progress') || name.includes('doing')) {
    return { 
      bg: 'bg-orange-50', 
      text: 'text-orange-700', 
      border: 'border-orange-500',
      badge: 'bg-orange-100 text-orange-700'
    };
  } else if (name.includes('проверк') || name.includes('review') || name.includes('test')) {
    return { 
      bg: 'bg-red-50', 
      text: 'text-red-700', 
      border: 'border-red-500',
      badge: 'bg-red-100 text-red-700'
    };
  } else if (name.includes('готово') || name.includes('done') || name.includes('complete') || name.includes('finished')) {
    return { 
      bg: 'bg-emerald-50', 
      text: 'text-emerald-700', 
      border: 'border-emerald-500',
      badge: 'bg-emerald-100 text-emerald-700'
    };
  }
  
  // Default gray color
  return { 
    bg: 'bg-gray-50', 
    text: 'text-gray-700', 
    border: 'border-gray-500',
    badge: 'bg-gray-100 text-gray-700'
  };
};

// Memoized TaskCard with custom comparison for performance
const TaskCard = React.memo(({ task, index, onClick, columnColor, availableLabels = [], availablePriorities = [] }: { task: any, index: number, onClick: (task: any) => void, columnColor: { bg: string; text: string; border: string; badge: string }, availableLabels?: any[], availablePriorities?: any[] }) => {
  // Preload avatar image for better perceived performance
  // const avatarSrc = task.assignee?.avatar;
  
  // Extract task number from ID (show last 4-6 chars) or use task.number if available
  const taskNumber = task.number || (task.id ? `#${task.id.toString().slice(-4)}` : '#0000');
  
  // Get priority color from priorityId
  const priorityColor = React.useMemo(() => {
    if (task.priorityId) {
      const priority = availablePriorities.find((p: any) => p.id === task.priorityId);
      if (priority?.color) {
        return priority.color;
      }
    }
    // Fallback to old priority string-based color
    if (task.priority?.toLowerCase() === "критический" || task.priority?.toLowerCase() === "critical") return "bg-rose-600";
    if (task.priority?.toLowerCase() === "высокий" || task.priority?.toLowerCase() === "high") return "bg-rose-500";
    if (task.priority?.toLowerCase() === "средний" || task.priority?.toLowerCase() === "medium") return "bg-orange-500";
    if (task.priority?.toLowerCase() === "низкий" || task.priority?.toLowerCase() === "low") return "bg-blue-500";
    return "bg-slate-400";
  }, [task.priorityId, task.priority, availablePriorities]);
  
  return (
    <Draggable key={task.id} draggableId={task.id.toString()} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          onClick={() => onClick(task)}
          className={cn(
            "bg-card border border-border/50 p-3 rounded-xl shadow-sm hover:shadow-md hover:border-primary/30 transition-[box-shadow,border-color,background-color] group/task relative overflow-hidden font-sans",
            snapshot.isDragging ? "shadow-xl ring-2 ring-primary/20 rotate-1 z-50" : ""
          )}
        >
          {/* Bottom border indicator for priority */}
          <div className={cn(
            "absolute inset-x-0 bottom-0 h-1.5 rounded-b-xl",
            priorityColor
          )} />
          
          {/* Header with Task Number and Creator Date */}
          <div className="flex items-center justify-between mb-1.5">
            <div className="text-xs text-foreground font-mono">{taskNumber}</div>
            {task.creator && (
              <div className="text-[10px] text-foreground font-medium">
                {task.creator.date.split(' ')[0]}
              </div>
            )}
          </div>

          <h4 className="text-sm font-normal mb-2 leading-snug text-foreground/90 line-clamp-2">{task.title}</h4>

          {/* Labels */}
          {task.tags && task.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-2">
              {task.tags.map((tagName: string) => {
                const labelInfo = availableLabels.find((l: any) => l.name === tagName);
                return (
                  <Badge
                    key={tagName}
                    variant="secondary"
                    className={cn(
                      "px-1.5 py-0 text-[9px] font-bold border-none rounded-md pointer-events-none text-foreground",
                      labelInfo?.color ? labelInfo.color.replace('bg-', 'bg-').replace('500', '500/10') : "bg-primary/10"
                    )}
                  >
                    {tagName}
                  </Badge>
                );
              })}
            </div>
          )}

          <div className="flex items-center">
            {task.assignee ? (
              <span className="text-xs font-medium text-foreground truncate max-w-[150px]">
                {task.assignee.name}
              </span>
            ) : (
              <span className="text-xs text-foreground">
                Не назначен
              </span>
            )}
          </div>
        </div>
      )}
    </Draggable>
  );
}, (prevProps, nextProps) => {
  // Always re-render to ensure updates show immediately
  return false;
});

TaskCard.displayName = 'TaskCard';

// Memoized Kanban Column component
interface KanbanColumnProps {
  column: string;
  columnId: string;
  columnIndex: number;
  tasks: any[];
  allColumns: { id: string; name: string }[];
  onCreateTask: (column: string) => void;
  onTaskClick: (task: any) => void;
  onEditColumn: (columnId: string, newName: string) => void;
  onDeleteColumn: (columnId: string, targetColumnId: string) => void;
  availableLabels?: any[];
  availablePriorities?: any[];
}

const KanbanColumn = React.memo(({ 
  column, 
  columnId,
  columnIndex,
  tasks, 
  allColumns,
  onCreateTask, 
  onTaskClick, 
  onEditColumn,
  onDeleteColumn,
  availableLabels = [], 
  availablePriorities = [] 
}: KanbanColumnProps) => {
  const columnColor = getColumnColor(column);
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(column);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  
  // Get left column (previous column)
  const leftColumn = columnIndex > 0 ? allColumns[columnIndex - 1] : null;
  
  const handleEditSubmit = () => {
    if (editName.trim() && editName !== column && columnId && onEditColumn) {
      onEditColumn(columnId, editName.trim());
    }
    setIsEditing(false);
  };

  const handleDelete = () => {
    if (leftColumn && columnId && onDeleteColumn) {
      onDeleteColumn(columnId, leftColumn.id);
    }
    setShowDeleteDialog(false);
  };
  
  return (
    <div className="w-80 shrink-0 flex flex-col gap-4">
      {/* Column Header with color */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2 group/col-title w-full">
            {isEditing ? (
              <Input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                onBlur={handleEditSubmit}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleEditSubmit();
                  if (e.key === 'Escape') {
                    setEditName(column);
                    setIsEditing(false);
                  }
                }}
                autoFocus
                className="h-7 text-sm font-bold"
              />
            ) : (
              <h3 
                className={cn("font-bold text-sm truncate max-w-[150px] cursor-pointer hover:opacity-70", columnColor.text)}
                onClick={() => setIsEditing(true)}
              >
                {column}
              </h3>
            )}
            <Badge className={cn("rounded-full px-2 py-0 h-5 text-[10px] font-bold shrink-0 border-0", columnColor.badge)}>
              {tasks.length}
            </Badge>
            
            <div className="flex items-center ml-auto">
              <Button 
                variant="ghost" 
                size="icon" 
                className="w-6 h-6 text-muted-foreground/50 hover:text-primary hover:bg-primary/10 transition-colors"
                onClick={() => onCreateTask(column)}
              >
                <Plus className="w-3.5 h-3.5" />
              </Button>
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="w-6 h-6 text-muted-foreground/50 hover:text-foreground hover:bg-secondary transition-colors"
                  >
                    <MoreVertical className="w-3.5 h-3.5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-40">
                  <DropdownMenuItem onClick={() => setIsEditing(true)}>
                    <Pencil className="w-4 h-4 mr-2" />
                    Редактировать
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={() => setShowDeleteDialog(true)}
                    disabled={!leftColumn}
                    className="text-destructive focus:text-destructive"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Удалить
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
        {/* Colored underline for column header */}
        <div className={cn("h-0.5 w-full rounded-full", columnColor.border.replace('border-', 'bg-'))} />
      </div>
      
      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Удалить колонку?</AlertDialogTitle>
            <AlertDialogDescription>
              <span className="block mb-2">
                Вы уверены, что хотите удалить колонку <strong>"{column}"</strong>?
              </span>
              {leftColumn ? (
                <span className="block text-destructive">
                  Все задачи ({tasks.length}) из этой колонки будут перемещены в колонку <strong>"{leftColumn.name}"</strong>.
                </span>
              ) : (
                <span className="block text-destructive">
                  Это первая колонка, удаление невозможно.
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Отмена</AlertDialogCancel>
            {leftColumn && (
              <AlertDialogAction 
                onClick={handleDelete}
                className="bg-destructive hover:bg-destructive/90"
              >
                Удалить
              </AlertDialogAction>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Droppable droppableId={columnId} type="task">
        {(taskProvided, snapshot) => (
          <div
            {...taskProvided.droppableProps}
            ref={taskProvided.innerRef}
            className={cn(
              "flex flex-col gap-3 min-h-[150px] rounded-xl p-1",
              snapshot.isDraggingOver ? "bg-primary/5 ring-1 ring-primary/20" : ""
            )}
          >
            {tasks.map((task: any, index: number) => (
              <TaskCard 
                key={task.id} 
                task={task} 
                index={index} 
                onClick={onTaskClick}
                columnColor={columnColor}
                availableLabels={availableLabels}
                availablePriorities={availablePriorities}
              />
            ))}
            {taskProvided.placeholder}
          </div>
        )}
      </Droppable>
    </div>
  );
}, (prevProps, nextProps) => {
  // Always re-render when tasks change to ensure priority/number/dueDate updates show immediately
  return false;
});

KanbanColumn.displayName = 'KanbanColumn';

// Memoized Project Item component
interface ProjectItemProps {
  project: any;
  isActive: boolean;
  isCollapsed: boolean;
  onSelect: (projectId: string) => void;
  onToggleCollapse: (projectId: string, e: React.MouseEvent) => void;
  onEdit?: (project: any) => void;
  onDelete?: (projectId: string) => void;
}

const ProjectItem = React.memo(({ 
  project, 
  isActive, 
  isCollapsed, 
  onSelect, 
  onToggleCollapse,
  onEdit,
  onDelete
}: ProjectItemProps) => {
  return (
    <div className="space-y-1">
      <div
        onClick={() => onSelect(project.id)}
        className={cn(
          "w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-all group/project relative cursor-pointer",
          isActive
            ? "bg-primary/10 text-primary"
            : "text-muted-foreground hover:bg-secondary/50 hover:text-foreground"
        )}
      >
        <div 
          className="flex flex-col flex-1 min-w-0"
          onClick={(e) => {
            if (isActive) {
              onToggleCollapse(project.id, e);
            }
          }}
        >
          <div className="flex items-center gap-2">
            <ChevronRight className={cn(
              "w-3.5 h-3.5 shrink-0 transition-transform duration-200 opacity-50",
              !isCollapsed && "rotate-90"
            )} />
            <div className={cn(
              "w-2 h-2 rounded-full shrink-0 shadow-[0_0_8px_rgba(0,0,0,0.1)]",
              project.priority === "Высокий" || project.priority === "Критический" ? "bg-rose-500 shadow-rose-500/40" :
              project.priority === "Средний" ? "bg-amber-500 shadow-amber-500/40" :
              "bg-emerald-500 shadow-emerald-500/40"
            )} />
            <span className="truncate text-left">{project.name}</span>
          </div>
          
          <div className="mt-1.5 ml-5.5 px-2">
            <div className="flex items-center justify-between text-[10px] text-foreground mb-1">
              <span>Прогресс</span>
              <span>{project.progress || 0}%</span>
            </div>
            <div className="h-1 w-full bg-secondary rounded-full overflow-hidden">
              <div 
                className="h-full bg-primary transition-all duration-500" 
                style={{ width: `${project.progress || 0}%` }}
              />
            </div>
          </div>
        </div>
        
        {(onEdit || onDelete) && (
          <div className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover/project:opacity-100 transition-opacity">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button 
                  type="button"
                  className="p-1 rounded hover:bg-secondary/70 transition-colors"
                  onClick={(e) => e.stopPropagation()}
                >
                  <MoreVertical className="w-4 h-4 text-muted-foreground" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-40">
                {onEdit && (
                  <DropdownMenuItem onClick={() => onEdit(project)}>
                    <Pencil className="w-4 h-4 mr-2" />
                    Редактировать
                  </DropdownMenuItem>
                )}
                {onDelete && (
                  <DropdownMenuItem 
                    onClick={() => onDelete(project.id)}
                    className="text-destructive focus:text-destructive"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Удалить
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}
      </div>
    </div>
  );
}, (prevProps, nextProps) => {
  return (
    prevProps.project.id === nextProps.project.id &&
    prevProps.project.name === nextProps.project.name &&
    prevProps.project.progress === nextProps.project.progress &&
    prevProps.isActive === nextProps.isActive &&
    prevProps.isCollapsed === nextProps.isCollapsed
  );
});

ProjectItem.displayName = 'ProjectItem';

export default function Projects() {
  const { data: user } = useQuery<any>({ queryKey: ["/api/user"] });
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const [activeBoardId, setActiveBoardId] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [isCreateProjectOpen, setIsCreateProjectOpen] = useState(false);
  const [isCreateBoardOpen, setIsCreateBoardOpen] = useState(false);
  const [isCreateWorkspaceOpen, setIsCreateWorkspaceOpen] = useState(false);
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<string | null>(null);
  const [isWorkspaceDropdownOpen, setIsWorkspaceDropdownOpen] = useState(false);
  const [newProject, setNewProject] = useState({ name: "", color: "bg-blue-500", priority: "Средний" });
  const [newBoardName, setNewBoardName] = useState("");
  const [newWorkspaceName, setNewWorkspaceName] = useState("");
  const [editingColumn, setEditingColumn] = useState<{ originalName: string, currentName: string } | null>(null);
  const [collapsedProjects, setCollapsedProjects] = useState<Record<string, boolean>>({});
  const [showAllTasks, setShowAllTasks] = useState(false);
  const [editingProject, setEditingProject] = useState<any>(null);
  const [isEditProjectOpen, setIsEditProjectOpen] = useState(false);
  const [deletingProjectId, setDeletingProjectId] = useState<string | null>(null);
  
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
  const [statusFilterOpen, setStatusFilterOpen] = useState(false);
  const [assigneeFilterOpen, setAssigneeFilterOpen] = useState(false);
  const [priorityFilterOpen, setPriorityFilterOpen] = useState(false);
  const [labelsFilterOpen, setLabelsFilterOpen] = useState(false);

  // Queries with optimized caching
  const { data: projects = [], isLoading: isLoadingProjects } = useQuery<any[]>({
    queryKey: ["/api/projects", selectedWorkspaceId],
    queryFn: async () => {
      const url = selectedWorkspaceId 
        ? `/api/projects?workspaceId=${selectedWorkspaceId}` 
        : "/api/projects";
      const res = await apiRequest("GET", url);
      return res.json();
    },
    staleTime: 1000 * 60 * 10, // 10 minutes - projects change rarely
    gcTime: 1000 * 60 * 30, // Keep in cache for 30 minutes
    placeholderData: [], // Use empty array while loading to prevent flicker
  });

  const { data: workspaces = [] } = useQuery<any[]>({
    queryKey: ["/api/workspaces"],
    staleTime: 1000 * 60 * 10,
  });

  const { data: availableLabels = [] } = useQuery<any[]>({
    queryKey: ["/api/labels"],
    staleTime: 1000 * 60 * 60, // 1 hour
  });

  const { data: availablePriorities = [] } = useQuery<any[]>({
    queryKey: ["/api/priorities"],
    staleTime: 1000 * 60 * 60, // 1 hour
  });

  const { data: users = [] } = useQuery<any[]>({
    queryKey: ["/api/users"],
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  // All tasks and columns for "All Tasks" view
  const { data: allTasksData } = useQuery<any[]>({
    queryKey: ["/api/tasks/all"],
    staleTime: 1000 * 60 * 1, // 1 minute
    enabled: showAllTasks,
  });

  // Handle both array response and object with tasks property
  const allTasks = Array.isArray(allTasksData) ? allTasksData : (allTasksData?.tasks || []);

  const { data: allColumns = [] } = useQuery<any[]>({
    queryKey: ["/api/board-columns/all"],
    staleTime: 1000 * 60 * 1, // 1 minute
    enabled: showAllTasks,
  });

  // Filter projects based on debounced search query
  const filteredProjects = useMemo(() => {
    if (!debouncedProjectSearch.trim()) return projects;
    const query = debouncedProjectSearch.toLowerCase();
    return projects.filter(project => 
      project.name?.toLowerCase().includes(query) ||
      project.description?.toLowerCase().includes(query)
    );
  }, [projects, debouncedProjectSearch]);

  const activeProject = useMemo(() => 
    projects.find(p => p.id === activeProjectId) || projects[0],
    [projects, activeProjectId]
  );

  const { data: boards = [], isLoading: isLoadingBoards } = useQuery<any[]>({
    queryKey: ["/api/projects", activeProject?.id, "boards"],
    enabled: !!activeProject?.id,
    staleTime: 1000 * 60 * 10, // 10 minutes
    gcTime: 1000 * 60 * 30,
    placeholderData: [],
  });

  // Get all boards for project filtering
  const { data: allBoards = [] } = useQuery<any[]>({
    queryKey: ["/api/boards"],
    staleTime: 1000 * 60 * 10, // 10 minutes
  });

  const activeBoard = useMemo(() => 
    boards.find(b => b.id === activeBoardId) || boards[0],
    [boards, activeBoardId]
  );

  // Auto-select first board when activeProject changes
  useEffect(() => {
    if (boards.length > 0 && !activeBoardId) {
      setActiveBoardId(boards[0].id);
    }
  }, [boards, activeBoardId]);

  // Mutations
  const createProjectMutation = useMutation({
    mutationFn: async (project: any) => {
      const res = await apiRequest("POST", "/api/projects", project);
      return res.json();
    },
    onMutate: async (newProjectData) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ["/api/projects"] });
      await queryClient.cancelQueries({ queryKey: ["/api/projects", selectedWorkspaceId] });
      
      // Snapshot previous values
      const previousProjects = queryClient.getQueryData(["/api/projects", selectedWorkspaceId]);
      const previousProjectsAll = queryClient.getQueryData(["/api/projects"]);
      
      const tempProject = {
        id: `temp-${Date.now()}`,
        name: newProjectData.name,
        color: newProjectData.color || "#3b82f6",
        priority: newProjectData.priority?.toLowerCase() || "medium",
        status: "active",
        boardCount: 0,
        taskCount: 0,
        progress: 100,
        createdAt: new Date().toISOString(),
        ownerId: "current-user",
        workspaceId: selectedWorkspaceId,
      };
      
      // Optimistically update both query keys
      queryClient.setQueryData(["/api/projects", selectedWorkspaceId], (old: any[] = []) => [...(old || []), tempProject]);
      queryClient.setQueryData(["/api/projects"], (old: any[] = []) => [...(old || []), tempProject]);
      
      return { previousProjects, previousProjectsAll };
    },
    onSuccess: (data) => {
      // Replace temp project with real data in both query keys
      queryClient.setQueryData(["/api/projects", selectedWorkspaceId], (old: any[] = []) => 
        (old || []).map((p: any) => p.id?.startsWith("temp-") ? data : p)
      );
      queryClient.setQueryData(["/api/projects"], (old: any[] = []) => 
        (old || []).map((p: any) => p.id?.startsWith("temp-") ? data : p)
      );
      setIsCreateProjectOpen(false);
      setNewProject({ name: "", color: "bg-blue-500", priority: "Средний" });
      setActiveProjectId(data.id);
      toast.success("Проект успешно создан");
    },
    onError: (error: any, variables: any, context: any) => {
      // Rollback on error
      if (context?.previousProjects) {
        queryClient.setQueryData(["/api/projects", selectedWorkspaceId], context.previousProjects);
      }
      if (context?.previousProjectsAll) {
        queryClient.setQueryData(["/api/projects"], context.previousProjectsAll);
      }
      toast.error("Не удалось создать проект");
    },
    onSettled: () => {
      // Refetch to ensure consistency
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      queryClient.invalidateQueries({ queryKey: ["/api/projects", selectedWorkspaceId] });
    }
  });

  const createWorkspaceMutation = useMutation({
    mutationFn: async (workspace: { name: string; description?: string; color?: string }) => {
      const res = await apiRequest("POST", "/api/workspaces", workspace);
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/workspaces"] });
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      setIsCreateWorkspaceOpen(false);
      setNewWorkspaceName("");
      setSelectedWorkspaceId(data.id);
      toast.success("Пространство создано");
    }
  });

  const updateProjectMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string, data: any }) => {
      const res = await apiRequest("PATCH", `/api/projects/${id}`, data);
      return res.json();
    },
    onMutate: async ({ id, data }) => {
      await queryClient.cancelQueries({ queryKey: ["/api/projects"] });
      const previousProjects = queryClient.getQueryData(["/api/projects"]);
      
      // Optimistic update
      queryClient.setQueryData(["/api/projects"], (old: any[] = []) => 
        (old || []).map((p: any) => p.id === id ? { ...p, ...data } : p)
      );
      queryClient.setQueryData(["/api/projects", selectedWorkspaceId], (old: any[] = []) => 
        (old || []).map((p: any) => p.id === id ? { ...p, ...data } : p)
      );
      
      return { previousProjects };
    },
    onError: (error, variables, context) => {
      if (context?.previousProjects) {
        queryClient.setQueryData(["/api/projects"], context.previousProjects);
      }
      toast.error("Не удалось обновить проект");
    },
    onSuccess: () => {
      toast.success("Проект успешно обновлен");
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
    }
  });

  const deleteProjectMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("DELETE", `/api/projects/${id}`);
      if (!res.ok) throw new Error("Failed to delete");
    },
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ["/api/projects"] });
      const previousProjects = queryClient.getQueryData(["/api/projects"]);
      
      // Optimistic delete
      queryClient.setQueryData(["/api/projects"], (old: any[] = []) => 
        (old || []).filter((p: any) => p.id !== id)
      );
      queryClient.setQueryData(["/api/projects", selectedWorkspaceId], (old: any[] = []) => 
        (old || []).filter((p: any) => p.id !== id)
      );
      
      return { previousProjects };
    },
    onError: (error, variables, context) => {
      if (context?.previousProjects) {
        queryClient.setQueryData(["/api/projects"], context.previousProjects);
      }
      toast.error("Не удалось удалить проект");
    },
    onSuccess: () => {
      setActiveProjectId(null);
      toast.success("Проект удален");
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
    }
  });

  const createBoardMutation = useMutation({
    mutationFn: async ({ projectId, name }: { projectId: string, name: string }) => {
      const res = await apiRequest("POST", `/api/projects/${projectId}/boards`, { name });
      return res.json();
    },
    onMutate: async ({ name }) => {
      // Мгновенно закрываем окно и очищаем форму
      setIsCreateBoardOpen(false);
      const currentBoardName = newBoardName;
      setNewBoardName("");

      // Отменяем текущие запросы
      await queryClient.cancelQueries({ queryKey: ["/api/projects", activeProject?.id, "boards"] });

      // Сохраняем предыдущее состояние
      const previousBoards = queryClient.getQueryData<any[]>(["/api/projects", activeProject?.id, "boards"]);

      // Оптимистично добавляем новую доску с валидным UUID
      if (previousBoards) {
        const optimisticBoard = {
          id: crypto.randomUUID(),
          name: name,
          projectId: activeProject?.id,
          createdAt: new Date().toISOString()
        };
        queryClient.setQueryData(["/api/projects", activeProject?.id, "boards"], [...previousBoards, optimisticBoard]);
      }

      return { previousBoards, currentBoardName };
    },
    onError: (err, variables, context) => {
      // Откатываем при ошибке
      if (context?.previousBoards) {
        queryClient.setQueryData(["/api/projects", activeProject?.id, "boards"], context.previousBoards);
      }
      if (context?.currentBoardName) {
        setNewBoardName(context.currentBoardName);
        setIsCreateBoardOpen(true);
      }
      toast.error("Не удалось создать доску");
    },
    onSuccess: (data) => {
      setActiveBoardId(data.id);
      toast.success("Доска успешно создана");
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", activeProject?.id, "boards"] });
    }
  });

  const updateBoardMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string, data: any }) => {
      const res = await apiRequest("PATCH", `/api/boards/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", activeProject?.id, "boards"] });
      setEditingBoard(null);
      toast.success("Доска успешно обновлена");
    }
  });

  const deleteBoardMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/boards/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", activeProject?.id, "boards"] });
      toast.success("Доска удалена");
    }
  });

  // Column mutations
  const updateColumnMutation = useMutation({
    mutationFn: async ({ id, name }: { id: string; name: string }) => {
      await apiRequest("PATCH", `/api/board-columns/${id}`, { name });
    },
    onSuccess: (_, { id, name }) => {
      queryClient.setQueryData(["/api/boards", activeBoard?.id, "full"], (oldData: any) => {
        if (!oldData) return oldData;
        return {
          ...oldData,
          columns: oldData.columns.map((col: any) => 
            col.id === id ? { ...col, name } : col
          )
        };
      });
      toast.success("Колонка обновлена");
    }
  });

  const deleteColumnMutation = useMutation({
    mutationFn: async ({ columnId, targetColumnId }: { columnId: string; targetColumnId: string }) => {
      await apiRequest("DELETE", `/api/board-columns/${columnId}?targetColumnId=${targetColumnId}`);
    },
    onSuccess: (_, { columnId, targetColumnId }) => {
      queryClient.setQueryData(["/api/boards", activeBoard?.id, "full"], (oldData: any) => {
        if (!oldData) return oldData;
        return {
          ...oldData,
          columns: oldData.columns.filter((col: any) => col.id !== columnId),
          tasks: targetColumnId 
            ? oldData.tasks.map((task: any) => 
                task.columnId === columnId ? { ...task, columnId: targetColumnId } : task
              )
            : oldData.tasks
        };
      });
      toast.success("Колонка удалена");
    }
  });

  const handleEditColumn = (columnId: string, newName: string) => {
    updateColumnMutation.mutate({ id: columnId, name: newName });
  };

  const handleDeleteColumn = (columnId: string, targetColumnId: string) => {
    deleteColumnMutation.mutate({ columnId, targetColumnId });
  };

  // Create column mutation
  const createColumnMutation = useMutation({
    mutationFn: async ({ boardId, name }: { boardId: string; name: string }) => {
      console.log("[Frontend] Creating column:", { boardId, name });
      const res = await apiRequest("POST", `/api/boards/${boardId}/columns`, { name });
      console.log("[Frontend] Column created response:", res);
      return res.json();
    },
    onSuccess: (data) => {
      console.log("[Frontend] Column created successfully:", data);
      queryClient.setQueryData(["/api/boards", activeBoard?.id, "full"], (oldData: any) => {
        if (!oldData) return oldData;
        return {
          ...oldData,
          columns: [...oldData.columns, data]
        };
      });
      toast.success("Колонка создана");
      setNewColumnName("");
      setIsCreateColumnOpen(false);
    },
    onError: (error) => {
      console.error("[Frontend] Error creating column:", error);
      toast.error("Не удалось создать колонку");
    }
  });

  const handleCreateColumn = () => {
    console.log("[Frontend] handleCreateColumn called", { newColumnName, activeBoard });
    if (!newColumnName.trim() || !activeBoard) {
      console.log("[Frontend] Validation failed - missing name or board");
      return;
    }
    console.log("[Frontend] Calling mutation with:", {
      boardId: activeBoard.id,
      name: newColumnName.trim()
    });
    createColumnMutation.mutate({
      boardId: activeBoard.id,
      name: newColumnName.trim()
    });
  };

  const handleCreateProject = useCallback(() => {
    if (!newProject.name) return;
    createProjectMutation.mutate({
      ...newProject,
      workspaceId: selectedWorkspaceId
    });
  }, [newProject, selectedWorkspaceId, createProjectMutation]);

  const handleEditProject = useCallback((project: any) => {
    setEditingProject(project);
    setIsEditProjectOpen(true);
  }, []);

  const handleDeleteProject = useCallback((projectId: string) => {
    setDeletingProjectId(projectId);
  }, []);

  const confirmDeleteProject = useCallback(() => {
    if (deletingProjectId) {
      deleteProjectMutation.mutate(deletingProjectId);
      setDeletingProjectId(null);
    }
  }, [deletingProjectId, deleteProjectMutation]);

  const handleUpdateProject = useCallback(() => {
    if (!editingProject || !editingProject.name) return;
    updateProjectMutation.mutate({
      id: editingProject.id,
      data: {
        name: editingProject.name,
        color: editingProject.color,
        priority: editingProject.priority
      }
    });
    setIsEditProjectOpen(false);
    setEditingProject(null);
  }, [editingProject, updateProjectMutation]);

  const [editingBoard, setEditingBoard] = useState<{ id: string, currentName: string } | null>(null);

  const handleRenameBoard = (id: string, newName: string) => {
    if (!newName) {
      setEditingBoard(null);
      return;
    }
    updateBoardMutation.mutate({ id, data: { name: newName } });
  };

  const handleDeleteBoard = (id: string) => {
    if (boards.length <= 1) {
      toast.error("Нельзя удалить последнюю доску");
      return;
    }
    deleteBoardMutation.mutate(id);
  };

  const handleCreateBoard = () => {
    if (!newBoardName || !activeProject) return;
    createBoardMutation.mutate({ projectId: activeProject.id, name: newBoardName });
  };

  const DEFAULT_KANBAN_DATA = {
    "В планах": [],
    "В работе": [],
    "На проверке": [],
    "Готово": [],
  };

  const [isCreateTaskOpen, setIsCreateTaskOpen] = useState(false);
  const [newTask, setNewTask] = useState({ title: "", description: "", priority: "medium", type: "task" });

  // Column creation state
  const [isCreateColumnOpen, setIsCreateColumnOpen] = useState(false);
  const [newColumnName, setNewColumnName] = useState("");

  const { data: boardData, isLoading: isLoadingBoard } = useQuery<{ columns: any[], tasks: any[] }>({
    queryKey: ["/api/boards", activeBoard?.id, "full"],
    queryFn: async () => {
      console.log("[Frontend] Fetching board data for:", activeBoard?.id);
      const res = await apiRequest("GET", `/api/boards/${activeBoard?.id}/full`);
      const data = await res.json();
      console.log("[Frontend] Board data received:", { columns: data.columns?.length, tasks: data.tasks?.length });
      console.log("[Frontend] Tasks from server:", data.tasks?.map((t: any) => ({ id: t.id, title: t.title, columnId: t.columnId })));
      return data;
    },
    enabled: !!activeBoard?.id,
    refetchOnWindowFocus: true
  });

  // Deduplicate columns by name for "All Tasks" view
  const uniqueColumns = useMemo(() => {
    if (!showAllTasks) return [];
    const seen = new Set<string>();
    return allColumns.filter((col: any) => {
      if (seen.has(col.name)) return false;
      seen.add(col.name);
      return true;
    });
  }, [allColumns, showAllTasks]);

  const columns = showAllTasks ? uniqueColumns : (boardData?.columns || []);
  const tasks = showAllTasks ? allTasks : (boardData?.tasks || []);
  const isLoadingColumns = showAllTasks ? false : isLoadingBoard;
  const isLoadingTasks = showAllTasks ? false : isLoadingBoard;

  const createTaskMutation = useMutation({
    mutationFn: async (task: any) => {
      console.log("[Frontend] Creating task:", task);
      // Подготавливаем данные для отправки, включая информацию об исполнителе для корректного отображения
      const taskData = {
        ...task,
        assignee: user ? { 
          name: user.firstName ? `${user.firstName} ${user.lastName || ''}` : user.username,
          avatar: user.avatar 
        } : undefined
      };
      console.log("[Frontend] Sending task data:", taskData);
      const res = await apiRequest("POST", `/api/boards/${activeBoard?.id}/tasks`, taskData);
      const createdTask = await res.json();
      console.log("[Frontend] Task created response:", createdTask);
      return createdTask;
    },
    onMutate: async (newTaskData) => {
      // Мгновенно закрываем окно и очищаем форму
      setIsCreateTaskOpen(false);
      const currentNewTask = { ...newTask }; // Сохраняем текущее состояние для возможного отката
      setNewTask({ title: "", description: "", priority: "medium", type: "task" });

      // Отменяем текущие запросы, чтобы они не перезаписали наш оптимистичный апдейт
      await queryClient.cancelQueries({ queryKey: ["/api/boards", activeBoard?.id, "full"] });

      // Сохраняем предыдущее состояние для отката при ошибке
      const previousBoardData = queryClient.getQueryData<{ columns: any[], tasks: any[] }>(["/api/boards", activeBoard?.id, "full"]);

      // Оптимистично обновляем кэш
      if (previousBoardData) {
        const optimisticTask = {
          ...newTaskData,
          id: `temp-${Date.now()}`, // Временный ID
          createdAt: new Date().toISOString(),
          order: previousBoardData.tasks.filter(t => t.columnId === newTaskData.columnId).length,
          // Добавляем полную информацию об исполнителе для немедленного отображения
          assignee: newTaskData.assigneeId ? {
            id: newTaskData.assigneeId,
            name: user ? (user.firstName ? `${user.firstName} ${user.lastName || ''}` : user.username) : 'Пользователь',
            avatar: user?.avatar
          } : null
        };

        queryClient.setQueryData(["/api/boards", activeBoard?.id, "full"], {
          ...previousBoardData,
          tasks: [...previousBoardData.tasks, optimisticTask]
        });
      }

      return { previousBoardData, currentNewTask };
    },
    onError: (err, newTaskData, context) => {
      // Откатываем изменения при ошибке
      if (context?.previousBoardData) {
        queryClient.setQueryData(["/api/boards", activeBoard?.id, "full"], context.previousBoardData);
      }
      // Возвращаем данные в форму, если произошла ошибка
      if (context?.currentNewTask) {
        setNewTask(context.currentNewTask);
        setIsCreateTaskOpen(true);
      }
      toast.error("Не удалось создать задачу");
    },
    onSuccess: (data) => {
      console.log("[Frontend] Task created successfully:", data);
      toast.success("Задача успешно создана");
    },
    onSettled: () => {
      console.log("[Frontend] Invalidating queries for board:", activeBoard?.id);
      // Синхронизируем данные с сервером
      queryClient.invalidateQueries({ queryKey: ["/api/boards", activeBoard?.id, "full"] });
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
    }
  });

  const updateTaskMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string, data: any }) => {
      // Если это временный ID (начинается с temp-), не отправляем запрос на сервер,
      // так как задача еще создается. Реальный PATCH уйдет после синхронизации.
      if (id.startsWith("temp-")) {
        return null;
      }
      const res = await apiRequest("PATCH", `/api/tasks/${id}`, data);
      return res.json();
    },
    onMutate: async ({ id, data }) => {
      await queryClient.cancelQueries({ queryKey: ["/api/boards", activeBoard?.id, "full"] });
      const previousData = queryClient.getQueryData<{ columns: any[], tasks: any[] }>(["/api/boards", activeBoard?.id, "full"]);

      if (previousData) {
        queryClient.setQueryData(["/api/boards", activeBoard?.id, "full"], (old: any) => {
          if (!old) return old;
          
          const oldTasks = old.tasks || [];
          // 1. Находим задачу, которую перемещаем
          const movedTask = oldTasks.find((t: any) => t.id === id);
          if (!movedTask) return old;

          // 2. Создаем копию списка без этой задачи
          const otherTasks = oldTasks.filter((t: any) => t.id !== id);
          
          // 3. Обновляем данные перемещаемой задачи (новая колонка и временный порядок)
          const updatedMovedTask = { ...movedTask, ...data };
          
          // Also update selectedTask if this is the task being moved
          if (selectedTask?.id === id) {
            setSelectedTask((prev: any) => prev ? { ...prev, ...data } : prev);
          }
          
          // 4. Получаем задачи в целевой колонке
          const targetColTasks = otherTasks
            .filter((t: any) => t.columnId === (data.columnId || movedTask.columnId))
            .sort((a: any, b: any) => (a.order || 0) - (b.order || 0));
          
          // 5. Вставляем задачу на новую позицию
          targetColTasks.splice(data.order ?? 0, 0, updatedMovedTask);
          
          // 6. Пересчитываем order для всех задач в целевой колонке
          const updatedTargetColTasks = targetColTasks.map((t: any, idx: number) => ({ ...t, order: idx }));
          
          // 7. Объединяем обратно со всеми остальными задачами
          const finalTasks = [
            ...otherTasks.filter((t: any) => t.columnId !== (data.columnId || movedTask.columnId)),
            ...updatedTargetColTasks
          ];
          
          return { ...old, tasks: finalTasks };
        });
      }

      return { previousData };
    },
    onError: (err, variables, context) => {
      // Игнорируем ошибку для временных ID, так как мы сами отменили запрос
      if (variables.id.startsWith("temp-")) return;
      
      if (context?.previousData) {
        queryClient.setQueryData(["/api/boards", activeBoard?.id, "full"], context.previousData);
      }
      toast.error("Не удалось переместить задачу");
    },
    onSettled: (data, error, variables) => {
      // Не инвалидируем, если это была временная задача, чтобы не мешать процессу создания
      if (variables.id.startsWith("temp-")) return;

      // Инвалидируем без принудительного рефетча, чтобы не мерцало
      queryClient.invalidateQueries({ 
        queryKey: ["/api/boards", activeBoard?.id, "full"],
        refetchType: 'none' 
      });
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
    }
  });

  // Filtered tasks based on active filters
  const filteredTasks = useMemo(() => {
    if (!tasks.length) return [];
    
    return tasks.filter(task => {
      // Search filter
      if (taskFilters.search) {
        const searchLower = taskFilters.search.toLowerCase();
        const matchesSearch = 
          task.title?.toLowerCase().includes(searchLower) ||
          task.description?.toLowerCase().includes(searchLower) ||
          task.number?.toLowerCase().includes(searchLower);
        if (!matchesSearch) return false;
      }
      
      // Project filter - check boardId against selected projects' boards
      if (taskFilters.projects.length > 0) {
        // Get boards for selected projects
        const selectedProjectBoards = allBoards
          .filter((b: any) => taskFilters.projects.includes(b.projectId))
          .map((b: any) => b.id);
        if (!task.boardId || !selectedProjectBoards.includes(task.boardId)) return false;
      }
      
      // Status filter
      if (taskFilters.status.length > 0) {
        if (!taskFilters.status.includes(task.status)) return false;
      }
      
      // Assignee filter
      if (taskFilters.assignee.length > 0) {
        if (!task.assigneeId || !taskFilters.assignee.includes(task.assigneeId)) return false;
      }
      
      // Priority filter
      if (taskFilters.priority.length > 0) {
        if (!task.priorityId || !taskFilters.priority.includes(task.priorityId)) return false;
      }
      
      // Labels filter
      if (taskFilters.labels.length > 0) {
        if (!task.tags || !task.tags.some((tag: string) => taskFilters.labels.includes(tag))) return false;
      }
      
      // Date range filter
      if (taskFilters.dateFrom || taskFilters.dateTo) {
        const taskDate = task.createdAt ? new Date(task.createdAt) : null;
        if (!taskDate) return false;
        
        if (taskFilters.dateFrom) {
          const fromStart = new Date(taskFilters.dateFrom);
          fromStart.setHours(0, 0, 0, 0);
          if (taskDate < fromStart) return false;
        }
        
        if (taskFilters.dateTo) {
          const toEnd = new Date(taskFilters.dateTo);
          toEnd.setHours(23, 59, 59, 999);
          if (taskDate > toEnd) return false;
        }
      }
      
      return true;
    });
  }, [tasks, taskFilters, allBoards]);

  // Create a map of column name to column ID for "All Tasks" view
  const columnNameToId = useMemo(() => {
    if (!showAllTasks) return {};
    const map: Record<string, string> = {};
    uniqueColumns.forEach(col => {
      map[col.name] = col.id;
    });
    return map;
  }, [uniqueColumns, showAllTasks]);

  const kanbanData = useMemo(() => {
    if (!columns.length) return {};
    
    const data: Record<string, any[]> = {};
    columns.forEach(col => {
      if (showAllTasks) {
        // For "All Tasks" view, group by column name instead of columnId
        const columnTasks = filteredTasks.filter(t => {
          const taskColumnName = allColumns.find((c: any) => c.id === t.columnId)?.name;
          return taskColumnName === col.name;
        });
        data[col.id] = columnTasks.sort((a, b) => (a.order || 0) - (b.order || 0));
      } else {
        const columnTasks = filteredTasks.filter(t => t.columnId === col.id);
        data[col.id] = columnTasks.sort((a, b) => (a.order || 0) - (b.order || 0));
      }
    });
    return data;
  }, [columns, filteredTasks, showAllTasks, allColumns]);

  // Update active filters count
  useEffect(() => {
    const count = 
      taskFilters.status.length +
      taskFilters.assignee.length +
      taskFilters.priority.length +
      taskFilters.labels.length +
      taskFilters.projects.length +
      (taskFilters.search ? 1 : 0) +
      (taskFilters.dateFrom ? 1 : 0) +
      (taskFilters.dateTo ? 1 : 0);
    setActiveFiltersCount(count);
  }, [taskFilters]);

  const [selectedTask, setSelectedTask] = useState<any>(null);

  const handleTaskClick = useCallback((task: any) => {
    setSelectedTask(task);
    setModalOpen(true);
  }, []);

  const handleCreateTask = useCallback((columnName?: string) => {
    if (!activeBoard) return;
    
    // Если передано название колонки, находим её ID
    if (columnName) {
      const column = columns.find(c => c.name === columnName);
      if (column) {
        setNewTask(prev => ({ 
          ...prev, 
          columnId: column.id, 
          status: columnName,
          assigneeId: user?.id 
        }));
      }
    } else {
      // По умолчанию первая колонка
      setNewTask(prev => ({ 
        ...prev, 
        columnId: columns[0]?.id, 
        status: columns[0]?.name || "В планах",
        assigneeId: user?.id
      }));
    }
    
    setIsCreateTaskOpen(true);
  }, [activeBoard, columns, user?.id]);

  const submitCreateTask = useCallback(() => {
    if (!newTask.title.trim() || !activeBoard) return;
    createTaskMutation.mutate(newTask);
  }, [newTask, activeBoard, createTaskMutation]);

  const onTaskUpdate = useCallback((updatedTask: any) => {
    console.log("[Frontend] onTaskUpdate called with:", updatedTask);
    
    // Обновляем локальный кэш, чтобы UI сразу отобразил изменения.
    if (activeBoard?.id) {
      queryClient.setQueryData(["/api/boards", activeBoard.id, "full"], (old: any) => {
        if (!old) return old;
        console.log("[Frontend] Updating board cache, old tasks count:", old.tasks?.length);
        
        // Update flat tasks array
        let newTasks = old.tasks;
        if (Array.isArray(newTasks)) {
          newTasks = newTasks.map((t: any) => t.id === updatedTask.id ? { ...t, ...updatedTask } : t);
        }
        
        // Check updated task in cache
        const updatedInCache = newTasks.find((t: any) => t.id === updatedTask.id);
        console.log("[Frontend] Updated task in cache:", updatedInCache);
        
        // Force change detection by creating new array reference
        newTasks = [...newTasks];
        
        console.log("[Frontend] Updated tasks count:", newTasks?.length);
        return {
          ...old,
          tasks: newTasks
        };
      });
    }
    
    // Also update allTasks cache if in "All Tasks" view
    queryClient.setQueryData(["/api/tasks/all"], (old: any) => {
      if (!old || !Array.isArray(old)) return old;
      return old.map((t: any) => t.id === updatedTask.id ? { ...t, ...updatedTask } : t);
    });
    
    // Обновляем selectedTask, чтобы модальное окно отображало актуальные данные
    setSelectedTask((prev: any) => {
      if (prev && prev.id === updatedTask.id) {
        return { ...prev, ...updatedTask };
      }
      return prev;
    });
  }, [activeBoard?.id]);

  const toggleProjectCollapse = useCallback((projectId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setCollapsedProjects(prev => ({ ...prev, [projectId]: !prev[projectId] }));
  }, []);

  const onDragEnd = (result: DropResult) => {
    const { destination, source, draggableId, type } = result;

    if (!destination) return;

    if (
      destination.droppableId === source.droppableId &&
      destination.index === source.index
    ) {
      return;
    }

    if (type === "task") {
      // Find the target column by ID (droppableId is now column ID)
      const targetColumn = columns.find(col => col.id === destination.droppableId);
      if (!targetColumn) return;

      // Also find the source column to check if status changed
      const sourceColumn = columns.find(col => col.id === source.droppableId);
      
      // Prepare update data - include status if column changed
      const updateData: any = {
        columnId: targetColumn.id,
        order: destination.index
      };
      
      // If column changed, also update status to match new column name
      if (source.droppableId !== destination.droppableId && targetColumn.name) {
        updateData.status = targetColumn.name;
      }

      // Optimistically update the UI or just call the mutation
      updateTaskMutation.mutate({
        id: draggableId,
        data: updateData
      });
    }
  };

  if (isLoadingProjects && projects.length === 0) {
    return (
      <Layout className="overflow-hidden">
        <div className="flex items-center justify-center h-full">
          <Loader2 className="w-8 h-8 animate-spin" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout className="overflow-hidden">
      <div className="flex h-[calc(100vh-4rem)] overflow-hidden">
        {/* Secondary Projects Sidebar */}
        <div className="w-72 bg-card border-r border-border flex flex-col">
          <div className="p-4 border-b border-border flex items-center justify-between relative">
            <DropdownMenu open={isWorkspaceDropdownOpen} onOpenChange={setIsWorkspaceDropdownOpen}>
              <DropdownMenuTrigger asChild>
                <button 
                  type="button"
                  className="flex items-center gap-2 hover:bg-secondary rounded-md px-1 -ml-1 transition-colors"
                >
                  <h2 className="font-semibold text-lg text-foreground">
                    {selectedWorkspaceId 
                      ? workspaces.find((w: any) => w.id === selectedWorkspaceId)?.name || "Проекты"
                      : "Проекты"
                    }
                  </h2>
                  <ChevronDown className="w-4 h-4 text-muted-foreground" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-56">
                <DropdownMenuItem 
                  onClick={() => {
                    setSelectedWorkspaceId(null);
                    setIsWorkspaceDropdownOpen(false);
                  }}
                  className={cn(!selectedWorkspaceId && "bg-accent")}
                >
                  <Folder className="w-4 h-4 mr-2" />
                  Все проекты
                  {selectedWorkspaceId === null && <Check className="w-4 h-4 ml-auto" />}
                </DropdownMenuItem>
                {workspaces.map((workspace: any) => (
                  <DropdownMenuItem 
                    key={workspace.id}
                    onClick={() => {
                      setSelectedWorkspaceId(workspace.id);
                      setIsWorkspaceDropdownOpen(false);
                    }}
                    className={cn(selectedWorkspaceId === workspace.id && "bg-accent")}
                  >
                    <div className="w-3 h-3 rounded-full mr-2" style={{ backgroundColor: workspace.color || '#3b82f6' }} />
                    {workspace.name}
                    {selectedWorkspaceId === workspace.id && <Check className="w-4 h-4 ml-auto" />}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <div className="p-3 space-y-2">
            <Button
              variant={showAllTasks ? "default" : "secondary"}
              size="sm"
              className="w-full justify-start gap-2 font-medium"
              onClick={() => {
                if (!showAllTasks) {
                  setActiveProjectId(null);
                  setActiveBoardId(null);
                }
                setShowAllTasks(!showAllTasks);
              }}
            >
              <LayoutGrid className="w-4 h-4" />
              Все задачи
            </Button>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <Input 
                placeholder="Найти проект..." 
                className="h-9 pl-9 bg-secondary/50 border-none text-xs"
                value={projectSearchQuery}
                onChange={(e) => setProjectSearchQuery(e.target.value)}
              />
            </div>
          </div>

          <ScrollArea className="flex-1">
            <div className="px-2 space-y-1 py-2">
              {isLoadingProjects && filteredProjects.length === 0 ? (
                <ProjectListLoading />
              ) : filteredProjects.length === 0 ? (
                <div className="p-4 text-center text-xs text-foreground">
                  {debouncedProjectSearch ? "Проекты не найдены" : "Нет проектов"}
                </div>
                ) : (
                filteredProjects.map((project: any) => (
                <div key={project.id} className="space-y-1">
                  <ProjectItem
                    project={project}
                    isActive={activeProject?.id === project.id}
                    isCollapsed={!!collapsedProjects[project.id]}
                    onSelect={(projectId) => {
                      setShowAllTasks(false);
                      setActiveProjectId(projectId);
                      setActiveBoardId(null);
                    }}
                    onToggleCollapse={toggleProjectCollapse}
                    onEdit={handleEditProject}
                    onDelete={handleDeleteProject}
                  />
                  
                  {activeProject?.id === project.id && !collapsedProjects[project.id] && (
                    <div className="ml-4 pl-3 border-l border-border/60 space-y-1 mt-1">
                      {isLoadingBoards ? (
                        <div className="p-2">
                          <SectionLoadingSpinner text="Загрузка досок..." />
                        </div>
                      ) : (
                        boards.map((board: any) => (
                          <div key={board.id} className="group/board relative">
                            <div
                              onClick={() => setActiveBoardId(board.id)}
                              onMouseEnter={() => {
                                // Предзагрузка данных доски при наведении
                                queryClient.prefetchQuery({
                                  queryKey: ["/api/boards", board.id, "full"],
                                  queryFn: async () => {
                                    const res = await apiRequest("GET", `/api/boards/${board.id}/full`);
                                    return res.json();
                                  },
                                  staleTime: 1000 * 60 * 5,
                                });
                              }}
                              className={cn(
                                "w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-[13px] transition-colors text-left pr-8 cursor-pointer",
                                activeBoard?.id === board.id
                                  ? "bg-secondary text-foreground font-medium"
                                  : "text-foreground hover:bg-secondary/30 hover:text-foreground"
                              )}
                            >
                              <Hash className="w-3.5 h-3.5 shrink-0 opacity-50" />
                              <span className="truncate">{board.name}</span>
                            </div>
                            
                            <div className="absolute right-1 top-1/2 -translate-y-1/2 flex items-center gap-0.5 opacity-0 group-hover/board:opacity-100 transition-opacity">
                              <Dialog open={editingBoard?.id === board.id} onOpenChange={(open) => !open && setEditingBoard(null)}>
                                <DialogTrigger asChild>
                                  <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    className="h-6 w-6 text-muted-foreground hover:text-foreground"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setEditingBoard({ id: board.id, currentName: board.name });
                                    }}
                                  >
                                    <Pencil className="w-3 h-3" />
                                  </Button>
                                </DialogTrigger>
                                <DialogContent>
                                  <DialogHeader>
                                    <DialogTitle>Переименовать доску</DialogTitle>
                                    <DialogDescription>Введите новое название для этой доски.</DialogDescription>
                                  </DialogHeader>
                                  <div className="py-4">
                                    <Input 
                                      value={editingBoard?.currentName || ""} 
                                      onChange={(e) => setEditingBoard(prev => prev ? { ...prev, currentName: e.target.value } : null)}
                                      autoFocus
                                    />
                                  </div>
                                  <DialogFooter>
                                    <Button variant="outline" onClick={() => setEditingBoard(null)}>Отмена</Button>
                                    <Button onClick={() => handleRenameBoard(board.id, editingBoard?.currentName || "")} disabled={updateBoardMutation.isPending}>
                                      {updateBoardMutation.isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                                      Сохранить
                                    </Button>
                                  </DialogFooter>
                                </DialogContent>
                              </Dialog>

                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-6 w-6 text-muted-foreground hover:text-destructive"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteBoard(board.id);
                                }}
                                disabled={deleteBoardMutation.isPending}
                              >
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            </div>
                          </div>
                        ))
                      )}
                      
                      <Dialog open={isCreateBoardOpen} onOpenChange={setIsCreateBoardOpen}>
                        <DialogTrigger asChild>
                          <button className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-[13px] text-primary/70 hover:text-primary hover:bg-primary/5 transition-colors text-left mt-1">
                            <Plus className="w-3.5 h-3.5 shrink-0" />
                            <span>Добавить доску</span>
                          </button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Создать новую доску</DialogTitle>
                            <DialogDescription>Укажите название для новой доски в этом проекте.</DialogDescription>
                          </DialogHeader>
                          <div className="py-4">
                            <Input 
                              placeholder="Название доски" 
                              value={newBoardName}
                              onChange={(e) => setNewBoardName(e.target.value)}
                              onKeyDown={(e) => e.key === "Enter" && handleCreateBoard()}
                            />
                          </div>
                          <DialogFooter>
                            <Button variant="outline" onClick={() => setIsCreateBoardOpen(false)}>Отмена</Button>
                            <Button onClick={handleCreateBoard} disabled={!newBoardName.trim() || createBoardMutation.isPending}>
                              {createBoardMutation.isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                              Создать
                            </Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                    </div>
                  )}
                </div>
              ))
              )}
            </div>
          </ScrollArea>
        </div>

        {/* Kanban Board View */}
        <div className="flex-1 flex flex-col min-w-0 bg-secondary/20">
          {/* Board Header */}
          <div className="h-16 px-6 border-b border-border bg-card flex items-center justify-between">
            {showAllTasks ? (
              <div className="flex items-center gap-3 overflow-hidden">
                <LayoutGrid className="w-5 h-5 text-primary" />
                <h1 className="text-xl font-bold truncate text-foreground">Все задачи</h1>
                <Badge variant="secondary" className="text-xs">
                  {tasks.length} задач
                </Badge>
              </div>
            ) : activeProject ? (
              <div className="flex items-center gap-3 overflow-hidden">
                <div className={cn(
                  "w-3 h-3 rounded-full shadow-sm",
                  activeProject.priority === "Высокий" || activeProject.priority === "Критический" ? "bg-rose-500" :
                  activeProject.priority === "Средний" ? "bg-amber-500" : "bg-emerald-500"
                )} />
                <h1 className="text-xl font-bold truncate text-foreground">{activeProject.name}</h1>
                {activeBoard && (
                  <>
                    <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
                    <Badge variant="outline" className="text-xs font-semibold px-2 py-0.5 whitespace-nowrap uppercase tracking-wider text-foreground">
                      {activeBoard.name}
                    </Badge>
                  </>
                )}
              </div>
            ) : (
              <div className="text-foreground italic px-6">Выберите проект</div>
            )}
            
            <div className="flex items-center gap-2">
              <Dialog open={isFilterOpen} onOpenChange={setIsFilterOpen}>
                <DialogTrigger asChild>
                  <Button variant="ghost" size="sm" className="gap-2 text-foreground relative">
                    <Filter className="w-4 h-4" />
                    <span className="hidden sm:inline">Фильтр</span>
                    {activeFiltersCount > 0 && (
                      <Badge className="absolute -top-1 -right-1 h-4 w-4 p-0 text-[10px] flex items-center justify-center bg-primary text-primary-foreground">
                        {activeFiltersCount}
                      </Badge>
                    )}
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[500px]">
                  <DialogHeader>
                    <DialogTitle>Фильтры</DialogTitle>
                    <DialogDescription>Отфильтруйте задачи по различным параметрам</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto">
                    {/* Search filter */}
                    <div className="space-y-2">
                      <Label>Поиск</Label>
                      <Input
                        placeholder="Поиск по названию, описанию или номеру..."
                        value={taskFilters.search}
                        onChange={(e) => setTaskFilters(prev => ({ ...prev, search: e.target.value }))}
                      />
                    </div>

                    {/* Filters in grid */}
                    <div className="grid grid-cols-2 gap-3">
                      {/* Project filter */}
                      <Popover open={projectFilterOpen} onOpenChange={setProjectFilterOpen}>
                        <PopoverTrigger asChild>
                          <Button variant="outline" className="justify-between w-full">
                            <span>Проект</span>
                            {taskFilters.projects.length > 0 && (
                              <Badge variant="secondary" className="ml-2">{taskFilters.projects.length}</Badge>
                            )}
                            <ChevronDown className="ml-2 h-4 w-4 opacity-50" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-64 p-2" align="start">
                          <div className="space-y-1 max-h-48 overflow-y-auto">
                            {projects.length === 0 ? (
                              <span className="text-xs text-muted-foreground p-2">Нет проектов</span>
                            ) : (
                              projects.map((project: any) => (
                                <label key={project.id} className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-accent cursor-pointer">
                                  <Checkbox
                                    checked={taskFilters.projects.includes(project.id)}
                                    onCheckedChange={(checked) => {
                                      setTaskFilters(prev => ({
                                        ...prev,
                                        projects: checked
                                          ? [...prev.projects, project.id]
                                          : prev.projects.filter(id => id !== project.id)
                                      }));
                                    }}
                                  />
                                  <span className="text-sm">{project.name}</span>
                                </label>
                              ))
                            )}
                          </div>
                        </PopoverContent>
                      </Popover>

                      {/* Status filter */}
                      <Popover open={statusFilterOpen} onOpenChange={setStatusFilterOpen}>
                        <PopoverTrigger asChild>
                          <Button variant="outline" className="justify-between w-full">
                            <span>Статус</span>
                            {taskFilters.status.length > 0 && (
                              <Badge variant="secondary" className="ml-2">{taskFilters.status.length}</Badge>
                            )}
                            <ChevronDown className="ml-2 h-4 w-4 opacity-50" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-64 p-2" align="start">
                          <div className="space-y-1">
                            {columns.map((col: any) => (
                              <label key={col.id} className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-accent cursor-pointer">
                                <Checkbox
                                  checked={taskFilters.status.includes(col.name)}
                                  onCheckedChange={(checked) => {
                                    setTaskFilters(prev => ({
                                      ...prev,
                                      status: checked
                                        ? [...prev.status, col.name]
                                        : prev.status.filter(s => s !== col.name)
                                    }));
                                  }}
                                />
                                <span className="text-sm">{col.name}</span>
                              </label>
                            ))}
                          </div>
                        </PopoverContent>
                      </Popover>

                      {/* Assignee filter */}
                      <Popover open={assigneeFilterOpen} onOpenChange={setAssigneeFilterOpen}>
                        <PopoverTrigger asChild>
                          <Button variant="outline" className="justify-between w-full">
                            <span>Исполнитель</span>
                            {taskFilters.assignee.length > 0 && (
                              <Badge variant="secondary" className="ml-2">{taskFilters.assignee.length}</Badge>
                            )}
                            <ChevronDown className="ml-2 h-4 w-4 opacity-50" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-64 p-2" align="start">
                          <div className="space-y-1 max-h-48 overflow-y-auto">
                            {users.map((user: any) => (
                              <label key={user.id} className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-accent cursor-pointer">
                                <Checkbox
                                  checked={taskFilters.assignee.includes(user.id)}
                                  onCheckedChange={(checked) => {
                                    setTaskFilters(prev => ({
                                      ...prev,
                                      assignee: checked
                                        ? [...prev.assignee, user.id]
                                        : prev.assignee.filter(id => id !== user.id)
                                    }));
                                  }}
                                />
                                <span className="text-sm">
                                  {user.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : user.username}
                                </span>
                              </label>
                            ))}
                          </div>
                        </PopoverContent>
                      </Popover>

                      {/* Priority filter */}
                      <Popover open={priorityFilterOpen} onOpenChange={setPriorityFilterOpen}>
                        <PopoverTrigger asChild>
                          <Button variant="outline" className="justify-between w-full">
                            <span>Приоритет</span>
                            {taskFilters.priority.length > 0 && (
                              <Badge variant="secondary" className="ml-2">{taskFilters.priority.length}</Badge>
                            )}
                            <ChevronDown className="ml-2 h-4 w-4 opacity-50" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-64 p-2" align="start">
                          <div className="space-y-1">
                            {availablePriorities.map((priority: any) => (
                              <label key={priority.id} className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-accent cursor-pointer">
                                <Checkbox
                                  checked={taskFilters.priority.includes(priority.id)}
                                  onCheckedChange={(checked) => {
                                    setTaskFilters(prev => ({
                                      ...prev,
                                      priority: checked
                                        ? [...prev.priority, priority.id]
                                        : prev.priority.filter(id => id !== priority.id)
                                    }));
                                  }}
                                />
                                <div className={cn("w-2 h-2 rounded-full", priority.color)} />
                                <span className="text-sm">{priority.name}</span>
                              </label>
                            ))}
                          </div>
                        </PopoverContent>
                      </Popover>

                      {/* Labels filter */}
                      <Popover open={labelsFilterOpen} onOpenChange={setLabelsFilterOpen}>
                        <PopoverTrigger asChild>
                          <Button variant="outline" className="justify-between w-full">
                            <span>Метки</span>
                            {taskFilters.labels.length > 0 && (
                              <Badge variant="secondary" className="ml-2">{taskFilters.labels.length}</Badge>
                            )}
                            <ChevronDown className="ml-2 h-4 w-4 opacity-50" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-64 p-2" align="start">
                          <div className="space-y-1 max-h-48 overflow-y-auto">
                            {availableLabels.map((label: any) => (
                              <label key={label.id} className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-accent cursor-pointer">
                                <Checkbox
                                  checked={taskFilters.labels.includes(label.name)}
                                  onCheckedChange={(checked) => {
                                    setTaskFilters(prev => ({
                                      ...prev,
                                      labels: checked
                                        ? [...prev.labels, label.name]
                                        : prev.labels.filter(l => l !== label.name)
                                    }));
                                  }}
                                />
                                <div className={cn("w-2 h-2 rounded-full", label.color)} />
                                <span className="text-sm">{label.name}</span>
                              </label>
                            ))}
                          </div>
                        </PopoverContent>
                      </Popover>
                    </div>

                    {/* Date filters */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs">Дата от</Label>
                        <Input
                          type="date"
                          value={taskFilters.dateFrom ? taskFilters.dateFrom.toISOString().split('T')[0] : ''}
                          onChange={(e) => setTaskFilters(prev => ({ 
                            ...prev, 
                            dateFrom: e.target.value ? new Date(e.target.value) : undefined 
                          }))}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Дата до</Label>
                        <Input
                          type="date"
                          value={taskFilters.dateTo ? taskFilters.dateTo.toISOString().split('T')[0] : ''}
                          onChange={(e) => setTaskFilters(prev => ({ 
                            ...prev, 
                            dateTo: e.target.value ? new Date(e.target.value) : undefined 
                          }))}
                        />
                      </div>
                    </div>
                  </div>

                  <DialogFooter className="gap-2">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setTaskFilters({
                          status: [],
                          assignee: [],
                          priority: [],
                          labels: [],
                          search: "",
                          dateFrom: undefined,
                          dateTo: undefined,
                          projects: []
                        });
                      }}
                    >
                      Сбросить
                    </Button>
                    <Button onClick={() => setIsFilterOpen(false)}>
                      Применить
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
              <Separator orientation="vertical" className="h-6 mx-2" />
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button 
                    className="shadow-lg shadow-primary/20" 
                    size="icon"
                    disabled={!activeBoard}
                  >
                    <Plus className="w-5 h-5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem onClick={() => handleCreateTask()}>
                    <Plus className="w-4 h-4 mr-2" />
                    Создать задачу
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setIsCreateColumnOpen(true)}>
                    <Columns className="w-4 h-4 mr-2" />
                    Создать колонку
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <Dialog open={isCreateTaskOpen} onOpenChange={setIsCreateTaskOpen}>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Создать новую задачу</DialogTitle>
                      <DialogDescription>Введите название задачи для добавления на доску.</DialogDescription>
                    </DialogHeader>
                   <div className="space-y-4 py-4">
                     <div className="space-y-2">
                       <Label htmlFor="task-title">Название задачи</Label>
                       <Input 
                         id="task-title" 
                         placeholder="Что нужно сделать?" 
                         value={newTask.title}
                         onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                         onKeyDown={(e) => {
                           if (e.key === 'Enter' && newTask.title.trim()) {
                             submitCreateTask();
                           }
                         }}
                       />
                     </div>
                   </div>
                   <DialogFooter>
                     <Button variant="outline" onClick={() => setIsCreateTaskOpen(false)}>Отмена</Button>
                     <Button onClick={submitCreateTask} disabled={createTaskMutation.isPending || !newTask.title.trim()}>
                       {createTaskMutation.isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                       Создать задачу
                     </Button>
                   </DialogFooter>
                  </DialogContent>
                </Dialog>
                <Dialog open={isCreateWorkspaceOpen} onOpenChange={setIsCreateWorkspaceOpen}>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Создать пространство</DialogTitle>
                      <DialogDescription>Пространство поможет группировать проекты.</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label htmlFor="workspace-name">Название</Label>
                        <Input 
                          id="workspace-name" 
                          placeholder="Например: Рабочие проекты" 
                          value={newWorkspaceName}
                          onChange={(e) => setNewWorkspaceName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && newWorkspaceName.trim()) {
                              createWorkspaceMutation.mutate({ name: newWorkspaceName.trim() });
                            }
                          }}
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setIsCreateWorkspaceOpen(false)}>Отмена</Button>
                      <Button onClick={() => createWorkspaceMutation.mutate({ name: newWorkspaceName.trim() })} disabled={createWorkspaceMutation.isPending || !newWorkspaceName.trim()}>
                        {createWorkspaceMutation.isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                        Создать
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
                
                {/* Edit Project Dialog */}
                <Dialog open={isEditProjectOpen} onOpenChange={setIsEditProjectOpen}>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Редактировать проект</DialogTitle>
                      <DialogDescription>Измените название и параметры проекта.</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label htmlFor="edit-project-name">Название</Label>
                        <Input 
                          id="edit-project-name" 
                          placeholder="Название проекта" 
                          value={editingProject?.name || ""}
                          onChange={(e) => setEditingProject((prev: any) => prev ? { ...prev, name: e.target.value } : null)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Приоритет</Label>
                        <Select 
                          value={editingProject?.priority || "Средний"}
                          onValueChange={(value) => setEditingProject((prev: any) => prev ? { ...prev, priority: value } : null)}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Низкий">Низкий</SelectItem>
                            <SelectItem value="Средний">Средний</SelectItem>
                            <SelectItem value="Высокий">Высокий</SelectItem>
                            <SelectItem value="Критический">Критический</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => { setIsEditProjectOpen(false); setEditingProject(null); }}>Отмена</Button>
                      <Button onClick={handleUpdateProject} disabled={updateProjectMutation.isPending || !editingProject?.name?.trim()}>
                        {updateProjectMutation.isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                        Сохранить
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
                
                {/* Delete Project Confirmation Dialog */}
                <AlertDialog open={!!deletingProjectId} onOpenChange={(open) => !open && setDeletingProjectId(null)}>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Удалить проект?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Вы уверены, что хотите удалить проект? Это действие нельзя отменить.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Отмена</AlertDialogCancel>
                      <AlertDialogAction 
                        onClick={confirmDeleteProject}
                        className="bg-destructive hover:bg-destructive/90"
                        disabled={deleteProjectMutation.isPending}
                      >
                        {deleteProjectMutation.isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                        Удалить
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
            </div>
          </div>

          {/* Kanban Columns */}
          <DragDropContext onDragEnd={onDragEnd}>
            <div className="flex-1 overflow-auto custom-scrollbar">
              {isLoadingBoard && !boardData ? (
                <KanbanLoading />
              ) : activeBoard ? (
                <Droppable droppableId="board" direction="horizontal" type="column">
                  {(provided) => (
                    <div 
                      {...provided.droppableProps}
                      ref={provided.innerRef}
                      className="flex gap-6 items-start h-full px-6 pb-6"
                    >
                      {columns.map((columnData: any, index: number) => {
                        const columnTasks = kanbanData[columnData.id] || [];
                        return (
                          <KanbanColumn
                            key={columnData.id}
                            column={columnData.name}
                            columnId={columnData.id}
                            columnIndex={index}
                            tasks={columnTasks}
                            allColumns={columns.map((c: any) => ({ id: c.id, name: c.name }))}
                            onCreateTask={handleCreateTask}
                            onTaskClick={handleTaskClick}
                            onEditColumn={handleEditColumn}
                            onDeleteColumn={handleDeleteColumn}
                            availableLabels={availableLabels}
                            availablePriorities={availablePriorities}
                          />
                        );
                      })}
                      
                      {/* Add Column Button */}
                      {!showAllTasks && (
                        <div className="w-80 shrink-0">
                          <Dialog open={isCreateColumnOpen} onOpenChange={setIsCreateColumnOpen}>
                            <DialogTrigger asChild>
                              <button className="w-full h-12 border-2 border-dashed border-border rounded-xl flex items-center justify-center gap-2 text-muted-foreground hover:text-foreground hover:border-primary/50 hover:bg-primary/5 transition-all group">
                                <Plus className="w-5 h-5" />
                                <span className="font-medium">Добавить колонку</span>
                              </button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>Создать новую колонку</DialogTitle>
                                <DialogDescription>Укажите название для новой колонки на доске.</DialogDescription>
                              </DialogHeader>
                              <div className="space-y-4 py-4">
                                <div className="space-y-2">
                                  <Label htmlFor="column-name">Название колонки</Label>
                                  <Input
                                    id="column-name"
                                    placeholder="Например: В тестировании"
                                    value={newColumnName}
                                    onChange={(e) => setNewColumnName(e.target.value)}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter' && newColumnName.trim()) {
                                        handleCreateColumn();
                                      }
                                    }}
                                  />
                                </div>
                              </div>
                              <DialogFooter>
                                <Button variant="outline" onClick={() => setIsCreateColumnOpen(false)}>Отмена</Button>
                                <Button onClick={handleCreateColumn} disabled={createColumnMutation.isPending || !newColumnName.trim()}>
                                  {createColumnMutation.isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                                  Создать колонку
                                </Button>
                              </DialogFooter>
                            </DialogContent>
                          </Dialog>
                        </div>
                      )}
                      
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              ) : (
                <div className="flex flex-col items-center justify-center h-[60vh] text-center">
                  <div className="w-16 h-16 bg-secondary/30 rounded-full flex items-center justify-center mb-4">
                     <Hash className="w-8 h-8 text-foreground/50" />
                  </div>
                  <h3 className="text-lg font-semibold mb-1">Доска не выбрана</h3>
                   <p className="text-sm text-foreground max-w-xs">
                    Выберите проект и доску в левом меню, чтобы начать работу над задачами.
                  </p>
                </div>
              )}
            </div>
          </DragDropContext>
        </div>
      </div>

      {/* Task Details Modal */}
      {modalOpen && (
        <TaskDetailsModal
          task={selectedTask}
          open={modalOpen}
          onOpenChange={setModalOpen}
          onUpdate={onTaskUpdate}
        />
      )}
    </Layout>
  );
}
