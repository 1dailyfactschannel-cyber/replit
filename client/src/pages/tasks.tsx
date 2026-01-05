import { Layout } from "@/components/layout/Layout";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { MoreHorizontal, Calendar, ArrowUpDown, Filter } from "lucide-react";
import { useState } from "react";
import { TaskDetailsModal, Task } from "@/components/kanban/TaskDetailsModal";

// Mock tasks that look like real project tasks
const initialTasks: Task[] = [
  { 
    id: 872, 
    title: "Создать новые токены дизайн-системы", 
    status: "В работе", 
    priority: "Высокий", 
    type: "Дизайн",
    assignee: { name: "Сара Миллер" },
    creator: { name: "Юлия Дарицкая", date: "10 янв 2026" },
    dueDate: "Завтра",
    description: "Необходимо обновить цветовую палитру и шрифтовые пары в соответствии с новым брендингом.",
    labels: ["Дизайн", "Брендинг"],
    subtasks: [
      { id: 1, title: "Выбрать палитру", completed: true },
      { id: 2, title: "Настроить переменные", completed: false }
    ],
    comments: [
      { id: 1, user: "Юлия", content: "Жду макеты к среде", time: "2 часа назад" }
    ],
    history: [
      { id: 1, action: "создал задачу", user: "Юлия", time: "Вчера" }
    ]
  },
  { 
    id: 873, 
    title: "Исправить баг навигации на мобильных", 
    status: "В планах", 
    priority: "Средний", 
    type: "Разработка",
    assignee: { name: "Майк Росс" },
    creator: { name: "Александр Петров", date: "11 янв 2026" },
    dueDate: "Ср, 12 янв",
    description: "Меню не закрывается при клике на пункт на устройствах iOS.",
    labels: ["Баг", "Мобайл"],
    subtasks: [],
    comments: [],
    history: []
  },
  { 
    id: 874, 
    title: "Обновить зависимости", 
    status: "Готово", 
    priority: "Низкий", 
    type: "Техдолг",
    assignee: { name: "Алексей Иванов" },
    creator: { name: "Максим Иванов", date: "09 янв 2026" },
    dueDate: "Вчера",
    description: "Обновление React и сопутствующих библиотек до последних версий.",
    labels: ["Maintenance"],
    subtasks: [],
    comments: [],
    history: []
  },
  { 
    id: 875, 
    title: "Написать документацию API", 
    status: "В работе", 
    priority: "Средний", 
    type: "Документация",
    assignee: { name: "Сара Миллер" },
    creator: { name: "Максим Иванов", date: "12 янв 2026" },
    dueDate: "Пт, 14 янв",
    description: "Описать все эндпоинты модуля Общение.",
    labels: ["Документация"],
    subtasks: [],
    comments: [],
    history: []
  }
];

export default function Tasks() {
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleTaskClick = (task: Task) => {
    setSelectedTask(task);
    setIsModalOpen(true);
  };

  return (
    <Layout>
      <div className="space-y-6 animate-in fade-in duration-500 p-6">
        <div className="flex items-center justify-between">
           <div>
             <h1 className="text-3xl font-bold tracking-tight text-foreground">Мои задачи</h1>
             <p className="text-muted-foreground mt-1">Управляйте всеми задачами из ваших проектов в одном месте.</p>
           </div>
           <div className="flex gap-2">
              <Button variant="outline" className="gap-2"><Filter className="w-4 h-4" /> Фильтр</Button>
              <Button>Новая задача</Button>
           </div>
        </div>

        <div className="rounded-xl border border-border/50 shadow-sm bg-card overflow-hidden">
          <Table>
            <TableHeader className="bg-secondary/30">
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-[50px] px-6"><Checkbox /></TableHead>
                <TableHead className="w-[100px]">ID</TableHead>
                <TableHead>Название</TableHead>
                <TableHead className="w-[140px]">Статус</TableHead>
                <TableHead className="w-[120px]">Приоритет</TableHead>
                <TableHead className="w-[180px]">Исполнитель</TableHead>
                <TableHead className="w-[150px]">
                  <div className="flex items-center gap-1 cursor-pointer hover:text-foreground">
                    Срок <ArrowUpDown className="w-3 h-3" />
                  </div>
                </TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {initialTasks.map((task) => (
                <TableRow 
                  key={task.id} 
                  className="group cursor-pointer hover:bg-secondary/20 transition-colors"
                  onClick={() => handleTaskClick(task)}
                >
                  <TableCell className="px-6" onClick={(e) => e.stopPropagation()}>
                    <Checkbox />
                  </TableCell>
                  <TableCell className="font-mono text-[10px] text-muted-foreground">TS-{task.id}</TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-bold text-sm text-foreground group-hover:text-primary transition-colors">{task.title}</span>
                      <span className="text-[10px] text-muted-foreground uppercase tracking-wider">{task.type}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={
                      task.status === "Готово" ? "border-emerald-500/30 text-emerald-600 bg-emerald-500/5 font-bold" :
                      task.status === "В работе" ? "border-blue-500/30 text-blue-600 bg-blue-500/5 font-bold" :
                      "border-slate-500/30 text-slate-600 bg-slate-500/5 font-bold"
                    }>
                      {task.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className={`w-1.5 h-1.5 rounded-full ${
                        task.priority === "Высокий" ? "bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.4)]" :
                        task.priority === "Средний" ? "bg-amber-500" : "bg-emerald-500"
                      }`} />
                      <span className="text-xs font-medium">{task.priority}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Avatar className="w-6 h-6 border border-border/50">
                        <AvatarFallback className="text-[8px] bg-primary/10 text-primary font-bold">
                          {task.assignee.name.split(' ').map(n => n[0]).join('')}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-xs font-medium text-foreground/80">{task.assignee.name}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground font-medium">
                     <div className="flex items-center gap-2">
                       <Calendar className="w-3.5 h-3.5" /> {task.dueDate}
                     </div>
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity">
                      <MoreHorizontal className="w-4 h-4 text-muted-foreground" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      <TaskDetailsModal 
        task={selectedTask}
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
      />
    </Layout>
  );
}
