import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useState } from "react";
import { ChevronLeft, ChevronRight, Clock, MapPin, Video, Mic } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

const scheduledCalls = [
  { date: new Date(new Date().setDate(new Date().getDate() + 1)), title: "Встреча с Юлией Дарицкой", time: "14:00", type: "video", contact: "Юлия Дарицкая" },
  { date: new Date(new Date().setDate(new Date().getDate() + 2)), title: "Ревью кода - Майк Росс", time: "15:30", type: "audio", contact: "Майк Росс" },
  { date: new Date(new Date().setDate(new Date().getDate() + 3)), title: "Планирование проекта", time: "11:00", type: "video", contact: "Сара Миллер" },
];

const events = [
  { date: new Date(), title: "Ревью дизайна", time: "10:00", type: "work" },
  { date: new Date(), title: "Обеденный перерыв команды", time: "12:30", type: "social" },
  { date: new Date(new Date().setDate(new Date().getDate() + 1)), title: "Планирование спринта", time: "11:00", type: "work" },
  { date: new Date(new Date().setDate(new Date().getDate() + 2)), title: "Звонок с клиентом", time: "15:00", type: "external" },
  ...scheduledCalls,
];

export default function CalendarPage() {
  const [date, setDate] = useState<Date | undefined>(new Date());

  const getEventsForDate = (checkDate: Date) => {
    return events.filter(
      (event) =>
        event.date.getDate() === checkDate.getDate() &&
        event.date.getMonth() === checkDate.getMonth() &&
        event.date.getFullYear() === checkDate.getFullYear()
    );
  };

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
               <div className="grid grid-cols-7 border-b border-border">
                  {["Вс", "Пн", "Вт", "Ср", "Чт", "Пт", "Сб"].map(day => (
                    <div key={day} className="py-3 text-center text-sm font-medium text-muted-foreground border-r border-border last:border-r-0">
                      {day}
                    </div>
                  ))}
               </div>
               <div className="grid grid-cols-7 grid-rows-5 h-[600px]">
                  {Array.from({ length: 35 }).map((_, i) => {
                    const dayDate = new Date(new Date().getFullYear(), new Date().getMonth(), i + 1 - new Date(new Date().getFullYear(), new Date().getMonth(), 1).getDay());
                    const dayEvents = getEventsForDate(dayDate);
                    const isCurrentMonth = dayDate.getMonth() === new Date().getMonth();

                    return (
                      <div
                        key={i}
                        className={`border-b border-r border-border p-2 min-h-[100px] hover:bg-secondary/20 transition-colors group relative ${
                          !isCurrentMonth ? "bg-muted/30" : ""
                        }`}
                      >
                        <span
                          className={`text-sm block mb-1 font-medium ${
                            !isCurrentMonth ? "text-muted-foreground/50" : "text-muted-foreground"
                          }`}
                        >
                          {dayDate.getDate()}
                        </span>
                        <div className="space-y-1">
                          {dayEvents.slice(0, 2).map((event, idx) => (
                            <div key={idx}>
                              {event.type === "call" || "video" in event || "audio" in event ? (
                                <div
                                  className={`text-[10px] p-1 rounded mb-0.5 font-medium border-l-2 cursor-pointer hover:opacity-80 ${
                                    (event as any).type === "video"
                                      ? "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300 border-purple-500"
                                      : (event as any).type === "audio"
                                      ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 border-blue-500"
                                      : "bg-primary/10 text-primary border-primary"
                                  }`}
                                  title={event.title}
                                >
                                  <div className="flex items-center gap-1 truncate">
                                    {(event as any).type === "video" && <Video className="w-2.5 h-2.5 flex-shrink-0" />}
                                    {(event as any).type === "audio" && <Mic className="w-2.5 h-2.5 flex-shrink-0" />}
                                    <span className="truncate">{event.title}</span>
                                  </div>
                                </div>
                              ) : (
                                <div className="bg-primary/10 text-primary text-[10px] p-1 rounded mb-0.5 font-medium border-l-2 border-primary cursor-pointer hover:bg-primary/20 truncate">
                                  {event.title}
                                </div>
                              )}
                            </div>
                          ))}
                          {dayEvents.length > 2 && (
                            <div className="text-[10px] text-muted-foreground font-medium px-1">
                              +{dayEvents.length - 2} еще
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
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
                 {events.slice(0, 6).map((event, i) => (
                   <div key={i} className="flex gap-4 items-start group">
                      <div className="flex flex-col items-center min-w-[3rem] bg-secondary rounded-lg p-2 text-center">
                        <span className="text-xs text-muted-foreground uppercase font-bold">{event.date.toLocaleString('ru-RU', { month: 'short' })}</span>
                        <span className="text-lg font-bold text-foreground">{event.date.getDate()}</span>
                      </div>
                      <div className="space-y-1 flex-1">
                        <div className="flex items-center justify-between">
                          <h4 className="font-semibold text-sm">{event.title}</h4>
                          {("type" in event && event.type === "video") && (
                            <Badge className="bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 h-5 px-1.5 text-[10px] flex items-center gap-1">
                              <Video className="w-2.5 h-2.5" /> Видео
                            </Badge>
                          )}
                          {("type" in event && event.type === "audio") && (
                            <Badge className="bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 h-5 px-1.5 text-[10px] flex items-center gap-1">
                              <Mic className="w-2.5 h-2.5" /> Аудио
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                           <Clock className="w-3.5 h-3.5" /> {event.time}
                        </div>
                        {("contact" in event) && (
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                             <Avatar className="w-4 h-4">
                               <AvatarFallback className="text-[8px]">{(event as any).contact.substring(0,1)}</AvatarFallback>
                             </Avatar>
                             {(event as any).contact}
                          </div>
                        )}
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
