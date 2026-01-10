import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import {
  Clock,
  User,
  Tag,
  MessageSquare,
  History,
  Plus,
  Trash2,
  CheckCircle2,
  Circle,
  MoreVertical,
  Calendar as CalendarIcon,
  Flag,
  Send,
  Paperclip,
  Loader2,
  FileIcon,
  X,
  Download,
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import { toast } from "sonner";

export interface Task {
  id: number;
  title: string;
  description: string;
  status: string;
  priority: "Низкий" | "Средний" | "Высокий" | "Критический";
  type: string;
  assignee: { name: string; avatar?: string };
  creator: { name: string; date: string };
  dueDate: string;
  labels: string[];
  subtasks: { id: number; title: string; completed: boolean }[];
  comments: { id: number; author: { name: string; avatar: string }; text: string; date: string }[];
  history: { id: number; action: string; user: string; date: string }[];
}

interface TaskDetailsModalProps {
  task: Task | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate?: (task: Task) => void;
}

export function TaskDetailsModal({
  task,
  open,
  onOpenChange,
  onUpdate,
}: TaskDetailsModalProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [attachments, setAttachments] = useState<{ name: string; size: string; type: string }[]>([]);
  const [newTitle, setNewTitle] = useState("");
  const [localSubtasks, setLocalSubtasks] = useState<{ id: number; title: string; completed: boolean }[]>(task?.subtasks || []);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState("");
  const [localComments, setLocalComments] = useState<{ id: number; author: { name: string; avatar: string }; text: string; date: string }[]>(task?.comments || []);
  const [newComment, setNewComment] = useState("");
  const [commentAttachments, setCommentAttachments] = useState<{ name: string; size: string; type: string }[]>([]);

  React.useEffect(() => {
    if (task) {
      setLocalSubtasks(task.subtasks || []);
      setLocalComments(task.comments || []);
    }
  }, [task]);

  const handleAddComment = () => {
    if (!newComment.trim()) return;
    const comment = {
      id: Date.now(),
      author: { name: "Вы", avatar: "https://github.com/shadcn.png" },
      text: newComment,
      date: "Только что",
      attachments: commentAttachments
    };
    const updatedComments = [comment, ...localComments];
    setLocalComments(updatedComments);
    setNewComment("");
    setCommentAttachments([]);
    if (task && onUpdate) {
      onUpdate({ ...task, comments: updatedComments });
    }
  };

  const handleCommentFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const newAttachments = Array.from(files).map(file => ({
      name: file.name,
      size: (file.size / 1024).toFixed(1) + " KB",
      type: file.type
    }));

    setCommentAttachments(prev => [...prev, ...newAttachments]);
  };

  const removeCommentAttachment = (index: number) => {
    setCommentAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const deleteComment = (id: number) => {
    const updatedComments = localComments.filter(c => c.id !== id);
    setLocalComments(updatedComments);
    if (task && onUpdate) {
      onUpdate({ ...task, comments: updatedComments });
    }
  };

  const handleAddSubtask = () => {
    if (!newSubtaskTitle.trim()) return;
    const newSub = {
      id: Date.now(),
      title: newSubtaskTitle,
      completed: false
    };
    const updatedSubtasks = [...localSubtasks, newSub];
    setLocalSubtasks(updatedSubtasks);
    setNewSubtaskTitle("");
    if (task && onUpdate) {
      onUpdate({ ...task, subtasks: updatedSubtasks });
    }
  };

  const toggleSubtask = (id: number) => {
    const updatedSubtasks = localSubtasks.map(sub => 
      sub.id === id ? { ...sub, completed: !sub.completed } : sub
    );
    setLocalSubtasks(updatedSubtasks);
    if (task && onUpdate) {
      onUpdate({ ...task, subtasks: updatedSubtasks });
    }
  };

  const deleteSubtask = (id: number) => {
    const updatedSubtasks = localSubtasks.filter(sub => sub.id !== id);
    setLocalSubtasks(updatedSubtasks);
    if (task && onUpdate) {
      onUpdate({ ...task, subtasks: updatedSubtasks });
    }
  };

  const handleDownloadFile = (fileName: string) => {
    // В реальном приложении здесь был бы URL файла
    const blob = new Blob(["Mock file content"], { type: "text/plain" });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", fileName);
    document.body.appendChild(link);
    link.click();
    link.parentNode?.removeChild(link);
    window.URL.revokeObjectURL(url);
    toast.success(`Файл ${fileName} начал скачиваться`);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setUploadProgress(0);

    const interval = setInterval(() => {
      setUploadProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setIsUploading(false);
          setAttachments([...attachments, { name: file.name, size: `${(file.size / 1024).toFixed(1)} KB`, type: file.type }]);
          return 100;
        }
        return prev + 10;
      });
    }, 200);
  };

  const removeAttachment = (index: number) => {
    setAttachments(attachments.filter((_, i) => i !== index));
  };

  if (!task) {
    if (!open) return null;
    // Show empty form for new task
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md flex flex-col p-0 gap-0 overflow-hidden">
          <DialogHeader className="p-6 border-b border-border bg-card">
            <DialogTitle className="text-xl font-bold leading-tight">
              Новая задача
            </DialogTitle>
          </DialogHeader>
          <div className="p-6 space-y-6">
            <div className="space-y-2">
              <Label htmlFor="title">Название задачи</Label>
              <Input 
                id="title" 
                placeholder="Введите название..." 
                className="h-12 text-lg font-semibold"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter className="p-6 border-t bg-card">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Отмена</Button>
            <Button onClick={() => {
              if (newTitle.trim()) {
                onUpdate?.({
                  id: Date.now(),
                  title: newTitle,
                  description: "",
                  status: "В планах",
                  priority: "Средний",
                  type: "Задача",
                  assignee: { name: "Я" },
                  creator: { name: "Я", date: new Date().toLocaleDateString('ru-RU') },
                  dueDate: "Не установлен",
                  labels: [],
                  subtasks: [],
                  comments: [],
                  history: []
                });
                setNewTitle("");
                onOpenChange(false);
              }
            }}>Создать задачу</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl h-[90vh] flex flex-col p-0 gap-0 overflow-hidden">
        <DialogHeader className="p-6 border-b border-border bg-card">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-[10px] uppercase font-bold tracking-wider">
                TS-{task.id}
              </Badge>
              <span className="text-muted-foreground text-xs">•</span>
              <span className="text-muted-foreground text-xs">{task.type}</span>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreVertical className="w-4 h-4" />
              </Button>
            </div>
          </div>
          <DialogTitle className="text-2xl font-bold leading-tight">
            {task.title}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col lg:flex-row">
          {/* Main Content Area */}
          <div className="flex-1 overflow-y-auto p-6 border-r border-border">
            <div className="space-y-8">
              {/* Description Section */}
              <div className="space-y-3">
                <Label className="text-sm font-semibold text-foreground/70 uppercase tracking-wide">
                  Описание
                </Label>
                <RichTextEditor 
                  content={task.description} 
                  onChange={(content) => {
                    console.log('Description updated:', content);
                  }}
                  placeholder="Добавьте детальное описание задачи..."
                />
              </div>

              {/* Attachments Section */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-semibold text-foreground/70 uppercase tracking-wide flex items-center gap-2">
                    <Paperclip className="w-4 h-4" />
                    Вложения
                  </Label>
                  <div className="relative">
                    <input
                      type="file"
                      id="file-upload"
                      className="hidden"
                      onChange={handleFileUpload}
                      disabled={isUploading}
                    />
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-7 text-xs gap-1"
                      asChild
                    >
                      <label htmlFor="file-upload" className="cursor-pointer">
                        <Plus className="w-3 h-3" /> Добавить файл
                      </label>
                    </Button>
                  </div>
                </div>

                {/* Upload Progress */}
                {isUploading && (
                  <div className="p-3 rounded-lg border border-border/40 bg-secondary/10 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <Loader2 className="w-3 h-3 animate-spin text-primary" />
                        <span className="text-muted-foreground italic">Загрузка файла...</span>
                      </div>
                      <span className="font-medium">{uploadProgress}%</span>
                    </div>
                    <Progress value={uploadProgress} className="h-1.5" />
                  </div>
                )}

                {/* Attachments List */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {attachments.map((file, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-3 p-3 rounded-lg border border-border/40 hover:bg-secondary/20 transition-colors group relative"
                    >
                      <div className="w-8 h-8 rounded bg-primary/10 flex items-center justify-center shrink-0">
                        <FileIcon className="w-4 h-4 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate pr-6">{file.name}</p>
                        <p className="text-[10px] text-muted-foreground">{file.size}</p>
                      </div>
                      <div className="flex items-center gap-1 absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-7 w-7 text-muted-foreground hover:text-primary"
                          onClick={() => handleDownloadFile(file.name)}
                          title="Скачать"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-7 w-7 text-destructive"
                          onClick={() => removeAttachment(idx)}
                          title="Удалить"
                        >
                          <X className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Subtasks Section */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-semibold text-foreground/70 uppercase tracking-wide">
                    Подзадачи
                  </Label>
                  <div className="flex items-center gap-2">
                    <Input 
                      placeholder="Добавить подзадачу..." 
                      className="h-7 text-xs w-48"
                      value={newSubtaskTitle}
                      onChange={(e) => setNewSubtaskTitle(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleAddSubtask()}
                    />
                    <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={handleAddSubtask}>
                      <Plus className="w-3 h-3" /> Добавить
                    </Button>
                  </div>
                </div>
                <div className="space-y-2">
                  {localSubtasks.map((sub) => (
                    <div
                      key={sub.id}
                      className="flex items-center gap-3 p-3 rounded-lg border border-border/40 hover:bg-secondary/20 transition-colors group"
                    >
                      <button onClick={() => toggleSubtask(sub.id)}>
                        {sub.completed ? (
                          <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
                        ) : (
                          <Circle className="w-4 h-4 text-muted-foreground shrink-0" />
                        )}
                      </button>
                      <span className={cn("text-sm flex-1", sub.completed && "line-through text-muted-foreground")}>
                        {sub.title}
                      </span>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity text-destructive"
                        onClick={() => deleteSubtask(sub.id)}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  ))}
                </div>
                {localSubtasks.length > 0 && (
                  <div className="space-y-1">
                    <div className="flex justify-between text-[10px] text-muted-foreground font-medium uppercase tracking-wider">
                      <span>Прогресс</span>
                      <span>{Math.round((localSubtasks.filter(s => s.completed).length / localSubtasks.length) * 100)}%</span>
                    </div>
                    <Progress value={(localSubtasks.filter(s => s.completed).length / localSubtasks.length) * 100} className="h-1" />
                  </div>
                )}
              </div>

              {/* Activity Section (Comments & History) */}
              <div className="space-y-4 pt-4">
                <Tabs defaultValue="comments" className="w-full">
                  <TabsList className="bg-secondary/50 p-1 w-full justify-start border-none h-11">
                    <TabsTrigger value="comments" className="gap-2 px-6 h-9">
                      <MessageSquare className="w-4 h-4" />
                      Комментарии
                    </TabsTrigger>
                    <TabsTrigger value="history" className="gap-2 px-6 h-9">
                      <History className="w-4 h-4" />
                      История
                    </TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="comments" className="pt-4 space-y-6 mt-0">
                    <div className="flex gap-4">
                      <Avatar className="w-8 h-8 shrink-0">
                        <AvatarImage src="https://github.com/shadcn.png" />
                        <AvatarFallback>ВЫ</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 space-y-2">
                        <Textarea 
                          placeholder="Напишите комментарий..." 
                          className="min-h-[100px] text-sm bg-secondary/30 border-none focus-visible:ring-1 focus-visible:ring-primary/30"
                          value={newComment}
                          onChange={(e) => setNewComment(e.target.value)}
                        />
                        
                        {commentAttachments.length > 0 && (
                          <div className="flex flex-wrap gap-2 py-2">
                            {commentAttachments.map((file, idx) => (
                              <Badge key={idx} variant="secondary" className="gap-1 px-2 py-1">
                                <FileIcon className="w-3 h-3" />
                                <span className="max-w-[100px] truncate">{file.name}</span>
                                <button onClick={() => removeCommentAttachment(idx)} className="hover:text-destructive">
                                  <X className="w-3 h-3" />
                                </button>
                              </Badge>
                            ))}
                          </div>
                        )}

                        <div className="flex justify-between items-center">
                          <div className="flex items-center gap-1">
                            <input
                              type="file"
                              id="comment-file-input"
                              className="hidden"
                              multiple
                              onChange={handleCommentFileUpload}
                            />
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-8 w-8 text-muted-foreground hover:text-foreground"
                              asChild
                            >
                              <label htmlFor="comment-file-input" className="cursor-pointer">
                                <Paperclip className="w-4 h-4" />
                              </label>
                            </Button>
                          </div>
                          <Button size="sm" className="h-8" onClick={handleAddComment} disabled={!newComment.trim() && commentAttachments.length === 0}>
                            Отправить
                          </Button>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-6">
                      {localComments.map((comment: any) => (
                        <div key={comment.id} className="flex gap-4 group">
                          <Avatar className="w-8 h-8 shrink-0">
                            <AvatarImage src={comment.author?.avatar} />
                            <AvatarFallback>{comment.author?.name ? comment.author.name[0] : "ВЫ"}</AvatarFallback>
                          </Avatar>
                          <div className="flex-1 space-y-1">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-semibold">{comment.author?.name || "Вы"}</span>
                                <span className="text-[10px] text-muted-foreground uppercase tracking-wider">{comment.date}</span>
                              </div>
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity text-destructive"
                                onClick={() => deleteComment(comment.id)}
                              >
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            </div>
                            <div className="space-y-2 leading-relaxed bg-secondary/20 p-3 rounded-lg border border-border/40">
                              <div className="text-sm text-foreground/80">{comment.text}</div>
                              {comment.attachments && comment.attachments.length > 0 && (
                                <div className="flex flex-wrap gap-2 mt-2 pt-2 border-t border-border/20">
                                  {comment.attachments.map((file: any, idx: number) => (
                                    <div key={idx} className="flex items-center gap-2 p-1.5 rounded bg-background/50 border border-border/30 text-[10px] font-medium group/file">
                                      <FileIcon className="w-3 h-3 text-primary" />
                                      <span className="truncate max-w-[120px]">{file.name}</span>
                                      <span className="text-muted-foreground">({file.size})</span>
                                      <Button 
                                        variant="ghost" 
                                        size="icon" 
                                        className="h-5 w-5 ml-1 opacity-0 group-hover/file:opacity-100 transition-opacity"
                                        onClick={() => handleDownloadFile(file.name)}
                                        title="Скачать"
                                      >
                                        <Download className="w-3 h-3" />
                                      </Button>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </TabsContent>

                  <TabsContent value="history" className="pt-4 space-y-4 mt-0">
                    {task.history.map((h) => (
                      <div key={h.id} className="flex gap-3 text-sm">
                        <div className="w-2 h-2 rounded-full bg-primary mt-1.5 shrink-0" />
                        <div className="flex-1">
                          <p className="text-foreground/80">
                            <span className="font-semibold">{h.user}</span> {h.action}
                          </p>
                          <span className="text-[10px] text-muted-foreground">{h.date}</span>
                        </div>
                      </div>
                    ))}
                  </TabsContent>
                </Tabs>
              </div>
            </div>
          </div>

          {/* Sidebar Attributes Area */}
          <div className="w-full lg:w-72 bg-secondary/5 p-6 overflow-y-auto">
            <div className="space-y-6">
              {/* Status */}
              <div className="space-y-2">
                <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Статус</Label>
                <Select defaultValue={task.status}>
                  <SelectTrigger className="w-full h-10 border-none bg-secondary/50">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="В планах">В планах</SelectItem>
                    <SelectItem value="В работе">В работе</SelectItem>
                    <SelectItem value="На проверке">На проверке</SelectItem>
                    <SelectItem value="Готово">Готово</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Assignee */}
              <div className="space-y-2">
                <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Исполнитель</Label>
                <div className="flex items-center gap-3 p-2 rounded-lg bg-secondary/50 group cursor-pointer hover:bg-secondary/70 transition-colors">
                  <Avatar className="w-8 h-8">
                    <AvatarImage src={task.assignee.avatar} />
                    <AvatarFallback>{task.assignee.name.substring(0, 2).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <span className="text-sm font-medium truncate">{task.assignee.name}</span>
                </div>
              </div>

              {/* Priority */}
              <div className="space-y-2">
                <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Приоритет</Label>
                <Select defaultValue={task.priority}>
                  <SelectTrigger className="w-full h-10 border-none bg-secondary/50">
                    <div className="flex items-center gap-2">
                      <Flag className={cn("w-4 h-4", 
                        task.priority === "Критический" ? "text-rose-600" :
                        task.priority === "Высокий" ? "text-rose-400" :
                        task.priority === "Средний" ? "text-amber-500" : "text-emerald-500"
                      )} />
                      <SelectValue />
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Низкий">Низкий</SelectItem>
                    <SelectItem value="Средний">Средний</SelectItem>
                    <SelectItem value="Высокий">Высокий</SelectItem>
                    <SelectItem value="Критический">Критический</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Deadline */}
              <div className="space-y-2">
                <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Дедлайн</Label>
                <Button variant="ghost" className="w-full justify-start h-10 bg-secondary/50 border-none px-3 font-normal">
                  <CalendarIcon className="w-4 h-4 mr-2 text-muted-foreground" />
                  {task.dueDate}
                </Button>
              </div>

              {/* Labels */}
              <div className="space-y-2">
                <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Метки</Label>
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {task.labels.map((label) => (
                    <Badge key={label} variant="secondary" className="px-2 py-0.5 text-[10px] bg-primary/10 text-primary border-none">
                      {label}
                    </Badge>
                  ))}
                  <Button variant="ghost" size="icon" className="h-6 w-6 rounded-full bg-secondary/50">
                    <Plus className="w-3 h-3" />
                  </Button>
                </div>
              </div>

              <Separator />

              {/* Creation Info */}
              <div className="space-y-4 pt-2">
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Создано</span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium">{task.creator.name}</span>
                    <span className="text-[10px] text-muted-foreground">{task.creator.date}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function cn(...classes: any[]) {
  return classes.filter(Boolean).join(" ");
}
