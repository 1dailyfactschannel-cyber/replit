import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useState } from "react";
import { ChevronLeft, ChevronRight, Clock, MapPin } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const events = [
  { date: new Date(), title: "Ревью дизайна", time: "10:00", type: "work" },
  { date: new Date(), title: "Обеденный перерыв команды", time: "12:30", type: "social" },
  { date: new Date(new Date().setDate(new Date().getDate() + 1)), title: "Планирование спринта", time: "11:00", type: "work" },
  { date: new Date(new Date().setDate(new Date().getDate() + 2)), title: "Звонок с клиентом", time: "15:00", type: "external" },
];

export default function CalendarPage() {
  const [date, setDate] = useState<Date | undefined>(new Date());

  return (
    <Layout>
      <div className="space-y-6 animate-in fade-in duration-500">
        <div className="flex items-center justify-between">
          <div>
             <h1 className="text-3xl font-bold tracking-tight text-foreground">Календарь</h1>
             <p className="text-muted-foreground mt-1">Управляйте графиком и событиями команды.</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="icon"><ChevronLeft className="w-4 h-4" /></Button>
            <Button variant="outline">Сегодня</Button>
            <Button variant="outline" size="icon"><ChevronRight className="w-4 h-4" /></Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
           <Card className="lg:col-span-8 border-border/50 shadow-sm">
             <CardContent className="p-0">
               {/* Just a visual representation of a big calendar since standard calendar component is small */}
               <div className="grid grid-cols-7 border-b border-border">
                  {["Вс", "Пн", "Вт", "Ср", "Чт", "Пт", "Сб"].map(day => (
                    <div key={day} className="py-3 text-center text-sm font-medium text-muted-foreground border-r border-border last:border-r-0">
                      {day}
                    </div>
                  ))}
               </div>
               <div className="grid grid-cols-7 grid-rows-5 h-[600px]">
                  {Array.from({ length: 35 }).map((_, i) => (
                    <div key={i} className="border-b border-r border-border p-2 min-h-[100px] hover:bg-secondary/20 transition-colors group relative">
                       <span className="text-sm text-muted-foreground block mb-2">{i + 1 > 31 ? i - 30 : i + 1}</span>
                       {i === 4 && (
                         <div className="bg-primary/10 text-primary text-xs p-1.5 rounded mb-1 font-medium border-l-2 border-primary cursor-pointer hover:bg-primary/20 truncate">
                           Ревью дизайна
                         </div>
                       )}
                       {i === 4 && (
                         <div className="bg-orange-500/10 text-orange-600 text-xs p-1.5 rounded mb-1 font-medium border-l-2 border-orange-500 cursor-pointer hover:bg-orange-500/20 truncate">
                           Обеденный перерыв
                         </div>
                       )}
                       {i === 12 && (
                         <div className="bg-purple-500/10 text-purple-600 text-xs p-1.5 rounded mb-1 font-medium border-l-2 border-purple-500 cursor-pointer hover:bg-purple-500/20 truncate">
                           Планирование
                         </div>
                       )}
                    </div>
                  ))}
               </div>
             </CardContent>
           </Card>

           <div className="lg:col-span-4 space-y-6">
             <Card className="border-border/50 shadow-sm">
               <CardContent className="p-4 flex justify-center">
                 <Calendar
                    mode="single"
                    selected={date}
                    onSelect={setDate}
                    className="rounded-md border shadow-none"
                  />
               </CardContent>
             </Card>

             <Card className="border-border/50 shadow-sm">
               <CardHeader>
                 <CardTitle className="text-lg">Предстоящие события</CardTitle>
               </CardHeader>
               <CardContent className="space-y-4">
                 {events.map((event, i) => (
                   <div key={i} className="flex gap-4 items-start">
                      <div className="flex flex-col items-center min-w-[3rem] bg-secondary rounded-lg p-2 text-center">
                        <span className="text-xs text-muted-foreground uppercase font-bold">{event.date.toLocaleString('ru-RU', { month: 'short' })}</span>
                        <span className="text-lg font-bold text-foreground">{event.date.getDate()}</span>
                      </div>
                      <div className="space-y-1">
                        <h4 className="font-semibold text-sm">{event.title}</h4>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                           <Clock className="w-3.5 h-3.5" /> {event.time}
                        </div>
                        <div className="flex -space-x-2 pt-1">
                           <Avatar className="w-6 h-6 border-2 border-background"><AvatarFallback className="text-[10px]">А</AvatarFallback></Avatar>
                           <Avatar className="w-6 h-6 border-2 border-background"><AvatarFallback className="text-[10px]">Б</AvatarFallback></Avatar>
                        </div>
                      </div>
                   </div>
                 ))}
               </CardContent>
             </Card>
           </div>
        </div>
      </div>
    </Layout>
  );
}
