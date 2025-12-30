import { Layout } from "@/components/layout/Layout";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { MoreHorizontal, Calendar, ArrowUpDown, Filter } from "lucide-react";

const tasks = [
  { id: "TASK-872", title: "Создать новые токены дизайн-системы", status: "В процессе", priority: "Высокий", assignee: "Сара", due: "Завтра" },
  { id: "TASK-873", title: "Исправить баг навигации на мобильных", status: "К выполнению", priority: "Средний", assignee: "Майк", due: "Ср, 12 янв" },
  { id: "TASK-874", title: "Обновить зависимости", status: "Готово", priority: "Низкий", assignee: "Алексей", due: "Вчера" },
  { id: "TASK-875", title: "Написать документацию API", status: "В процессе", priority: "Средний", assignee: "Сара", due: "Пт, 14 янв" },
  { id: "TASK-876", title: "Рефакторинг middleware аутентификации", status: "К выполнению", priority: "Высокий", assignee: "Майк", due: "На следующей неделе" },
  { id: "TASK-877", title: "Результаты сеанса пользовательского тестирования", status: "Готово", priority: "Высокий", assignee: "Юлия", due: "На прошлой неделе" },
  { id: "TASK-878", title: "Оптимизировать изображения", status: "К выполнению", priority: "Низкий", assignee: "Алексей", due: "В следующем месяце" },
];

export default function Tasks() {
  return (
    <Layout>
      <div className="space-y-6 animate-in fade-in duration-500">
        <div className="flex items-center justify-between">
           <div>
             <h1 className="text-3xl font-bold tracking-tight text-foreground">Мои задачи</h1>
             <p className="text-muted-foreground mt-1">Управляйте своей рабочей нагрузкой.</p>
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
                <TableHead className="w-[50px]"><Checkbox /></TableHead>
                <TableHead className="w-[100px]">ID</TableHead>
                <TableHead>Название</TableHead>
                <TableHead className="w-[140px]">Статус</TableHead>
                <TableHead className="w-[120px]">Приоритет</TableHead>
                <TableHead className="w-[150px]">Исполнитель</TableHead>
                <TableHead className="w-[150px]">
                  <div className="flex items-center gap-1 cursor-pointer hover:text-foreground">
                    Срок <ArrowUpDown className="w-3 h-3" />
                  </div>
                </TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tasks.map((task) => (
                <TableRow key={task.id} className="group">
                  <TableCell><Checkbox /></TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">{task.id}</TableCell>
                  <TableCell>
                    <span className="font-medium text-sm">{task.title}</span>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={
                      task.status === "Готово" ? "border-emerald-200 text-emerald-700 bg-emerald-50" :
                      task.status === "В процессе" ? "border-blue-200 text-blue-700 bg-blue-50" :
                      "border-slate-200 text-slate-700 bg-slate-50"
                    }>
                      {task.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${
                        task.priority === "Высокий" ? "bg-rose-500" :
                        task.priority === "Средний" ? "bg-amber-500" : "bg-emerald-500"
                      }`} />
                      <span className="text-sm">{task.priority}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Avatar className="w-6 h-6">
                        <AvatarFallback className="text-[10px] bg-primary/10 text-primary">{task.assignee[0]}</AvatarFallback>
                      </Avatar>
                      <span className="text-sm text-muted-foreground">{task.assignee}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                     <div className="flex items-center gap-2">
                       <Calendar className="w-3.5 h-3.5" /> {task.due}
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
    </Layout>
  );
}
