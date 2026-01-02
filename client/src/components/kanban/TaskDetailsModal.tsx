import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
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
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import { Progress } from "@/components/ui/progress";
import { FileIcon, X, Paperclip, Loader2 } from "lucide-react";

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
  comments: { id: number; user: string; content: string; time: string }[];
  history: { id: number; action: string; user: string; time: string }[];
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

  if (!task) return null;

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
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-7 w-7 absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity text-destructive"
                        onClick={() => removeAttachment(idx)}
                      >
                        <X className="w-3.5 h-3.5" />
                      </Button>
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
                  <Button variant="ghost" size="sm" className="h-7 text-xs gap-1">
                    <Plus className="w-3 h-3" /> Добавить
                  </Button>
                </div>
                <div className="space-y-2">
                  {task.subtasks.map((sub) => (
                    <div
                      key={sub.id}
                      className="flex items-center gap-3 p-3 rounded-lg border border-border/40 hover:bg-secondary/20 transition-colors group"
                    >
                      {sub.completed ? (
                        <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
                      ) : (
                        <Circle className="w-4 h-4 text-muted-foreground shrink-0" />
                      )}
                      <span className={cn("text-sm flex-1", sub.completed && "line-through text-muted-foreground")}>
                        {sub.title}
                      </span>
                      <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity text-destructive">
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  ))}
                </div>
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
                  
                  <TabsContent value="comments" className="pt-4 space-y-6">
                    <div className="flex gap-3 items-center">
                      <Avatar className="w-8 h-8 shrink-0">
                        <AvatarFallback>JD</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 flex gap-2 items-center bg-secondary/30 rounded-xl px-2 border border-border/50 focus-within:ring-2 ring-primary/20 transition-all">
                        <Input 
                          placeholder="Напишите комментарий..." 
                          className="border-0 bg-transparent focus-visible:ring-0 shadow-none h-10 text-sm flex-1" 
                        />
                        <div className="flex items-center gap-1 shrink-0">
                          <input
                            type="file"
                            id="comment-file-upload"
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                console.log('Uploading file for comment:', file.name);
                              }
                            }}
                          />
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground shrink-0" asChild title="Прикрепить файл">
                            <label htmlFor="comment-file-upload" className="cursor-pointer">
                              <Paperclip className="w-4 h-4" />
                            </label>
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground shrink-0" title="Добавить">
                            <Plus className="w-4 h-4" />
                          </Button>
                          <Button size="sm" className="h-8 w-8 p-0" title="Отправить">
                            <Send className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </div>
                    </div>
                    
                    <div className="space-y-6">
                      {task.comments.map((comment) => (
                        <div key={comment.id} className="flex gap-3">
                          <Avatar className="w-8 h-8">
                            <AvatarFallback>{comment.user.substring(0, 2).toUpperCase()}</AvatarFallback>
                          </Avatar>
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-semibold">{comment.user}</span>
                              <span className="text-[10px] text-muted-foreground">{comment.time}</span>
                            </div>
                            <p className="text-sm text-foreground/80 leading-snug">
                              {comment.content}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="history" className="pt-4 space-y-4">
                    {task.history.map((h) => (
                      <div key={h.id} className="flex gap-3 text-sm">
                        <div className="w-2 h-2 rounded-full bg-primary mt-1.5 shrink-0" />
                        <div className="flex-1">
                          <p className="text-foreground/80">
                            <span className="font-semibold">{h.user}</span> {h.action}
                          </p>
                          <span className="text-[10px] text-muted-foreground">{h.time}</span>
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
