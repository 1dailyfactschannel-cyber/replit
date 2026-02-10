import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Plus, MoreHorizontal, MessageSquare, Paperclip, Calendar as CalendarIcon } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const columns = [
  {
    id: "todo",
    title: "К выполнению",
    tasks: [
      { id: 1, title: "Исследовать конкурентов", tag: "Стратегия", priority: "high", comments: 2, attach: 0 },
      { id: 2, title: "Составить пользовательские истории", tag: "Продукт", priority: "medium", comments: 0, attach: 1 },
      { id: 3, title: "Обновить README", tag: "Документы", priority: "low", comments: 1, attach: 0 },
    ]
  },
  {
    id: "in-progress",
    title: "В процессе",
    tasks: [
      { id: 4, title: "Настройка дизайн-системы", tag: "Дизайн", priority: "high", comments: 5, attach: 3, image: "https://images.unsplash.com/photo-1542744173-8e7e53415bb0?auto=format&fit=crop&q=80&w=600" },
      { id: 5, title: "Поток аутентификации", tag: "Backend", priority: "high", comments: 3, attach: 0 },
    ]
  },
  {
    id: "review",
    title: "На проверке",
    tasks: [
      { id: 6, title: "Копия лэндинг-страницы", tag: "Маркетинг", priority: "medium", comments: 8, attach: 2 },
    ]
  },
  {
    id: "done",
    title: "Готово",
    tasks: [
      { id: 7, title: "Инициализация проекта", tag: "DevOps", priority: "medium", comments: 0, attach: 0 },
      { id: 8, title: "Первый коммит", tag: "DevOps", priority: "low", comments: 0, attach: 0 },
    ]
  }
];

export default function Kanban() {
  return (
    <Layout>
      <div className="h-full flex flex-col animate-in fade-in duration-500">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">Проект Альфа</h1>
            <div className="flex items-center gap-4 mt-2">
              <div className="flex -space-x-2">
                 {[1,2,3].map(i => (
                   <Avatar key={i} className="w-8 h-8 border-2 border-background">
                     <AvatarFallback className="text-xs">У{i}</AvatarFallback>
                   </Avatar>
                 ))}
                 <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-xs font-medium border-2 border-background text-muted-foreground">+2</div>
              </div>
              <div className="h-4 w-[1px] bg-border" />
              <p className="text-sm text-muted-foreground">Обновлено 2 часа назад</p>
            </div>
          </div>
          <div className="flex gap-3">
             <Button variant="outline">Фильтр</Button>
             <Button className="shadow-lg shadow-primary/20 gap-2">
               <Plus className="w-4 h-4" /> Новая задача
             </Button>
          </div>
        </div>

        <div className="flex-1 overflow-x-auto">
          <div className="flex gap-6 min-w-[1000px] h-full pb-4">
            {columns.map(col => (
              <div key={col.id} className="w-80 flex flex-col gap-4">
                <div className="flex items-center justify-between px-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-sm text-foreground">{col.title}</h3>
                    <span className="text-xs text-muted-foreground bg-secondary px-2 py-0.5 rounded-full">{col.tasks.length}</span>
                  </div>
                  <Button variant="ghost" size="icon" className="h-6 w-6">
                    <Plus className="w-4 h-4 text-muted-foreground" />
                  </Button>
                </div>

                <ScrollArea className="flex-1">
                  <div className="flex flex-col gap-3 pb-4">
                    {col.tasks.map(task => (
                      <div key={task.id} className="bg-card border border-border/50 rounded-xl p-4 shadow-sm hover:shadow-md transition-all cursor-pointer group">
                        {task.image && (
                          <div className="mb-3 rounded-lg overflow-hidden h-32 w-full">
                            <img src={task.image} alt="Task cover" className="w-full h-full object-cover" />
                          </div>
                        )}
                        <div className="flex justify-between items-start mb-2">
                          <Badge variant="secondary" className={cn(
                            "rounded-md text-[10px] font-medium px-1.5 py-0.5 pointer-events-none",
                            task.tag === 'Дизайн' ? "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300" :
                            task.tag === 'Backend' ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300" :
                            task.tag === 'Стратегия' ? "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300" :
                            "bg-secondary text-secondary-foreground"
                          )}>
                            {task.tag}
                          </Badge>
                          <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity -mr-2 -mt-2">
                            <MoreHorizontal className="w-4 h-4 text-muted-foreground" />
                          </Button>
                        </div>
                        <h4 className="font-medium text-sm text-foreground leading-snug mb-3">{task.title}</h4>
                        
                        <div className="flex items-center justify-between pt-2 border-t border-border/40">
                          <div className="flex items-center gap-3">
                             {task.comments > 0 && (
                               <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                 <MessageSquare className="w-3.5 h-3.5" />
                                 {task.comments}
                               </div>
                             )}
                             {task.attach > 0 && (
                               <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                 <Paperclip className="w-3.5 h-3.5" />
                                 {task.attach}
                               </div>
                             )}
                          </div>
                          
                          <div className={cn(
                            "w-2 h-2 rounded-full",
                            task.priority === 'high' ? "bg-rose-500" :
                            task.priority === 'medium' ? "bg-amber-500" :
                            "bg-emerald-500"
                          )} />
                        </div>
                      </div>
                    ))}
                    <Button variant="ghost" className="w-full justify-start text-muted-foreground hover:text-foreground text-sm border border-dashed border-border hover:bg-secondary/50">
                      <Plus className="w-4 h-4 mr-2" /> Добавить задачу
                    </Button>
                  </div>
                </ScrollArea>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Layout>
  );
}
