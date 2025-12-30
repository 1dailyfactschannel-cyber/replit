import { Layout } from "@/components/layout/Layout";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { MoreHorizontal, Calendar, ArrowUpDown, Filter } from "lucide-react";

const tasks = [
  { id: "TASK-872", title: "Create new design system tokens", status: "In Progress", priority: "High", assignee: "Sarah", due: "Tomorrow" },
  { id: "TASK-873", title: "Fix navigation bug on mobile", status: "Todo", priority: "Medium", assignee: "Mike", due: "Wed, Jan 12" },
  { id: "TASK-874", title: "Update dependency packages", status: "Done", priority: "Low", assignee: "Alex", due: "Yesterday" },
  { id: "TASK-875", title: "Write documentation for API", status: "In Progress", priority: "Medium", assignee: "Sarah", due: "Fri, Jan 14" },
  { id: "TASK-876", title: "Refactor auth middleware", status: "Todo", priority: "High", assignee: "Mike", due: "Next Week" },
  { id: "TASK-877", title: "User testing session results", status: "Done", priority: "High", assignee: "Jane", due: "Last Week" },
  { id: "TASK-878", title: "Optimize image assets", status: "Todo", priority: "Low", assignee: "Alex", due: "Next Month" },
];

export default function Tasks() {
  return (
    <Layout>
      <div className="space-y-6 animate-in fade-in duration-500">
        <div className="flex items-center justify-between">
           <div>
             <h1 className="text-3xl font-bold tracking-tight text-foreground">My Tasks</h1>
             <p className="text-muted-foreground mt-1">Manage your personal workload.</p>
           </div>
           <div className="flex gap-2">
              <Button variant="outline" className="gap-2"><Filter className="w-4 h-4" /> Filter</Button>
              <Button>New Task</Button>
           </div>
        </div>

        <div className="rounded-xl border border-border/50 shadow-sm bg-card overflow-hidden">
          <Table>
            <TableHeader className="bg-secondary/30">
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-[50px]"><Checkbox /></TableHead>
                <TableHead className="w-[100px]">ID</TableHead>
                <TableHead>Title</TableHead>
                <TableHead className="w-[140px]">Status</TableHead>
                <TableHead className="w-[120px]">Priority</TableHead>
                <TableHead className="w-[150px]">Assignee</TableHead>
                <TableHead className="w-[150px]">
                  <div className="flex items-center gap-1 cursor-pointer hover:text-foreground">
                    Due Date <ArrowUpDown className="w-3 h-3" />
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
                      task.status === "Done" ? "border-emerald-200 text-emerald-700 bg-emerald-50" :
                      task.status === "In Progress" ? "border-blue-200 text-blue-700 bg-blue-50" :
                      "border-slate-200 text-slate-700 bg-slate-50"
                    }>
                      {task.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${
                        task.priority === "High" ? "bg-rose-500" :
                        task.priority === "Medium" ? "bg-amber-500" : "bg-emerald-500"
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
