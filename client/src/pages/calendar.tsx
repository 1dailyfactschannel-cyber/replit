import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Calendar as CalendarUI } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { useState, useMemo } from "react";
import { ChevronLeft, ChevronRight, Clock, MapPin, Video, Mic, Plus, Users as UsersIcon, X, PhoneCall } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface CalendarEvent {
  id: string;
  date: Date;
  title: string;
  time: string;
  type: 'work' | 'social' | 'external' | 'video' | 'audio';
  contact?: string;
  description?: string;
  meetingUrl?: string;
}

const initialEvents: CalendarEvent[] = [
  { id: "1", date: new Date(), title: "Ревью дизайна", time: "10:00", type: "work", description: "Обсуждение новых макетов для мобильного приложения" },
  { id: "2", date: new Date(), title: "Обеденный перерыв команды", time: "12:30", type: "social" },
  { id: "3", date: new Date(new Date().setDate(new Date().getDate() + 1)), title: "Планирование спринта", time: "11:00", type: "work" },
  { id: "4", date: new Date(new Date().setDate(new Date().getDate() + 2)), title: "Звонок с клиентом", time: "15:00", type: "external" },
  { id: "5", date: new Date(new Date().setDate(new Date().getDate() + 1)), title: "Встреча с Юлией Дарицкой", time: "14:00", type: "video", contact: "Юлия Дарицкая", meetingUrl: "https://zoom.us/j/123456789" },
  { id: "6", date: new Date(new Date().setDate(new Date().getDate() + 2)), title: "Ревью кода - Майк Росс", time: "15:30", type: "audio", contact: "Майк Росс", meetingUrl: "https://meet.google.com/abc-defg-hij" },
];

export default function CalendarPage() {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [viewDate, setViewDate] = useState<Date>(new Date());
  const [events, setEvents] = useState<CalendarEvent[]>(initialEvents);
  const [isAddEventOpen, setIsAddEventOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  
  // New event form state
  const [newEvent, setNewEvent] = useState<Partial<CalendarEvent>>({
    title: "",
    time: "10:00",
    type: "work",
    description: "",
    meetingUrl: "https://team-sync.call/room-1"
  });

  const calendarDays = useMemo(() => {
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    
    const days = [];
    const prevMonthDays = new Date(year, month, 0).getDate();
    
    // Previous month padding
    for (let i = firstDay - 1; i >= 0; i--) {
      days.push(new Date(year, month - 1, prevMonthDays - i));
    }
    
    // Current month
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(new Date(year, month, i));
    }
    
    // Next month padding
    const remaining = 35 - days.length;
    for (let i = 1; i <= remaining; i++) {
      days.push(new Date(year, month + 1, i));
    }
    
    return days;
  }, [viewDate]);

  const getEventsForDate = (checkDate: Date) => {
    return events.filter(
      (event) =>
        event.date.getDate() === checkDate.getDate() &&
        event.date.getMonth() === checkDate.getMonth() &&
        event.date.getFullYear() === checkDate.getFullYear()
    );
  };

  const handleAddEvent = () => {
    if (newEvent.title && selectedDate) {
      const event: CalendarEvent = {
        id: Math.random().toString(36).substr(2, 9),
        title: newEvent.title,
        time: newEvent.time || "10:00",
        type: newEvent.type as any || "work",
        date: selectedDate,
        description: newEvent.description,
        contact: newEvent.contact,
        meetingUrl: (newEvent.type === 'video' || newEvent.type === 'audio') ? (newEvent.meetingUrl || "https://team-sync.call/" + Math.random().toString(36).substr(2, 5)) : undefined
      };
      setEvents([...events, event]);
      setIsAddEventOpen(false);
      setNewEvent({ title: "", time: "10:00", type: "work", description: "", meetingUrl: "https://team-sync.call/room-1" });
      toast.success("Событие создано");
    }
  };

  const navigateMonth = (direction: number) => {
    setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + direction, 1));
  };

  const currentMonthName = viewDate.toLocaleString('ru-RU', { month: 'long', year: 'numeric' });

  return (
    <Layout>
      <div className="space-y-6 animate-in fade-in duration-500 p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
             <h1 className="text-3xl font-bold tracking-tight text-foreground capitalize">{currentMonthName}</h1>
             <p className="text-muted-foreground mt-1">Управляйте графиком и событиями команды.</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center bg-secondary/30 rounded-lg p-1 border border-border/50">
              <Button variant="ghost" size="icon" onClick={() => navigateMonth(-1)} className="h-8 w-8">
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => { setViewDate(new Date()); setSelectedDate(new Date()); }}
                className="px-3 h-8 text-xs font-semibold"
              >
                Сегодня
              </Button>
              <Button variant="ghost" size="icon" onClick={() => navigateMonth(1)} className="h-8 w-8">
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
            <Button onClick={() => setIsAddEventOpen(true)} className="gap-2 shadow-lg shadow-primary/20">
              <Plus className="w-4 h-4" />
              Создать событие
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
           <Card className="lg:col-span-8 border-border/50 shadow-sm overflow-hidden bg-card/50 backdrop-blur-sm">
             <CardContent className="p-0">
               <div className="grid grid-cols-7 border-b border-border/50 bg-secondary/20">
                  {["Вс", "Пн", "Вт", "Ср", "Чт", "Пт", "Сб"].map(day => (
                    <div key={day} className="py-3 text-center text-xs font-bold text-muted-foreground uppercase tracking-wider border-r border-border/50 last:border-r-0">
                      {day}
                    </div>
                  ))}
               </div>
               <div className="grid grid-cols-7 border-border/50">
                  {calendarDays.map((dayDate, i) => {
                    const dayEvents = getEventsForDate(dayDate);
                    const isCurrentMonth = dayDate.getMonth() === viewDate.getMonth();
                    const isToday = dayDate.toDateString() === new Date().toDateString();
                    const isSelected = selectedDate?.toDateString() === dayDate.toDateString();

                    return (
                      <div
                        key={i}
                        onClick={() => setSelectedDate(dayDate)}
                        className={cn(
                          "border-b border-r border-border/50 p-2 min-h-[120px] hover:bg-secondary/20 transition-all group relative cursor-pointer",
                          !isCurrentMonth && "bg-muted/10 opacity-50",
                          isSelected && "ring-2 ring-primary ring-inset z-10"
                        )}
                      >
                        <div className="flex justify-between items-start mb-2">
                          <span
                            className={cn(
                              "text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full transition-colors",
                              isToday ? "bg-primary text-primary-foreground" : "text-muted-foreground group-hover:text-foreground",
                              !isCurrentMonth && "text-muted-foreground/30"
                            )}
                          >
                            {dayDate.getDate()}
                          </span>
                          {dayEvents.length > 0 && (
                            <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                          )}
                        </div>
                        <div className="space-y-1">
                          {dayEvents.slice(0, 3).map((event) => (
                            <div 
                              key={event.id}
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedEvent(event);
                              }}
                              className={cn(
                                "text-[10px] p-1.5 rounded-md font-medium border-l-2 truncate transition-transform hover:scale-[1.02]",
                                event.type === 'video' ? "bg-purple-500/10 text-purple-600 border-purple-500" :
                                event.type === 'audio' ? "bg-blue-500/10 text-blue-600 border-blue-500" :
                                event.type === 'social' ? "bg-emerald-500/10 text-emerald-600 border-emerald-500" :
                                "bg-primary/10 text-primary border-primary"
                              )}
                            >
                              <div className="flex items-center gap-1">
                                {event.type === 'video' && <Video className="w-2.5 h-2.5" />}
                                {event.type === 'audio' && <Mic className="w-2.5 h-2.5" />}
                                <span className="truncate">{event.title}</span>
                              </div>
                            </div>
                          ))}
                          {dayEvents.length > 3 && (
                            <div className="text-[9px] text-muted-foreground font-bold pl-1">
                              + еще {dayEvents.length - 3}
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
             <Card className="border-border/50 shadow-sm bg-card/50 backdrop-blur-sm">
               <CardContent className="p-4 flex justify-center">
                 <CalendarUI
                    mode="single"
                    selected={selectedDate}
                    onSelect={(d) => {
                      setSelectedDate(d);
                      if (d) setViewDate(d);
                    }}
                    className="rounded-md"
                  />
               </CardContent>
             </Card>

             <Card className="border-border/50 shadow-sm bg-card/50 backdrop-blur-sm">
               <CardHeader className="pb-3 flex flex-row items-center justify-between">
                 <CardTitle className="text-lg">События дня</CardTitle>
                 <Badge variant="outline" className="text-[10px] uppercase font-bold tracking-wider">
                   {selectedDate?.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}
                 </Badge>
               </CardHeader>
               <CardContent className="space-y-4">
                 <ScrollArea className="h-[400px] pr-4">
                   {selectedDate && getEventsForDate(selectedDate).length > 0 ? (
                     <div className="space-y-4">
                       {getEventsForDate(selectedDate).map((event) => (
                         <div 
                           key={event.id} 
                           className="flex flex-col gap-3 group p-3 rounded-xl border border-border/50 hover:bg-secondary/30 transition-all cursor-pointer"
                           onClick={() => setSelectedEvent(event)}
                         >
                            <div className="flex gap-4 items-start">
                              <div className="flex flex-col items-center min-w-[3.5rem] bg-primary/5 rounded-xl p-2 text-center border border-primary/10">
                                <span className="text-[10px] text-primary uppercase font-black">{event.time}</span>
                                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center mt-1">
                                  {event.type === 'video' ? <Video className="w-4 h-4 text-primary" /> : 
                                   event.type === 'audio' ? <Mic className="w-4 h-4 text-primary" /> : 
                                   <Clock className="w-4 h-4 text-primary" />}
                                </div>
                              </div>
                              <div className="space-y-1 flex-1 min-w-0">
                                <h4 className="font-bold text-sm text-foreground leading-tight group-hover:text-primary transition-colors">{event.title}</h4>
                                {event.description && (
                                  <p className="text-xs text-muted-foreground line-clamp-1">{event.description}</p>
                                )}
                                <div className="flex flex-wrap gap-2 mt-2">
                                  <Badge variant="secondary" className="text-[9px] h-4 px-1.5 uppercase font-bold">
                                    {event.type}
                                  </Badge>
                                  {event.contact && (
                                    <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground font-medium">
                                      <Avatar className="w-3.5 h-3.5">
                                        <AvatarFallback className="text-[6px]">{event.contact[0]}</AvatarFallback>
                                      </Avatar>
                                      {event.contact}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                            
                            {(event.type === 'video' || event.type === 'audio' || event.meetingUrl) && (
                              <Button 
                                className="w-full h-8 gap-2 bg-primary/90 hover:bg-primary shadow-sm text-xs font-bold"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toast.success("Подключение к конференции...");
                                  if (event.meetingUrl) window.open(event.meetingUrl, '_blank');
                                }}
                              >
                                <PhoneCall className="w-3.5 h-3.5" />
                                Подключиться к звонку
                              </Button>
                            )}
                         </div>
                       ))}
                     </div>
                   ) : (
                     <div className="flex flex-col items-center justify-center py-20 text-center">
                       <div className="w-12 h-12 rounded-full bg-secondary/50 flex items-center justify-center mb-3">
                         <Clock className="w-6 h-6 text-muted-foreground/50" />
                       </div>
                       <p className="text-sm text-muted-foreground font-medium">Нет событий на этот день</p>
                       <Button 
                        variant="link" 
                        size="sm" 
                        className="mt-1 h-auto p-0 text-primary font-bold"
                        onClick={() => setIsAddEventOpen(true)}
                       >
                         Создать событие
                       </Button>
                     </div>
                   )}
                 </ScrollArea>
               </CardContent>
             </Card>
           </div>
        </div>
      </div>

      {/* Add Event Dialog */}
      <Dialog open={isAddEventOpen} onOpenChange={setIsAddEventOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Новое событие</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="title">Название</Label>
              <Input 
                id="title" 
                placeholder="Напр: Ревью кода" 
                value={newEvent.title}
                onChange={(e) => setNewEvent({...newEvent, title: e.target.value})}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="time">Время</Label>
                <Input 
                  id="time" 
                  type="time" 
                  value={newEvent.time}
                  onChange={(e) => setNewEvent({...newEvent, time: e.target.value})}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="type">Тип</Label>
                <Select 
                  value={newEvent.type} 
                  onValueChange={(val) => setNewEvent({...newEvent, type: val as any})}
                >
                  <SelectTrigger id="type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="work">Работа</SelectItem>
                    <SelectItem value="video">Видеозвонок</SelectItem>
                    <SelectItem value="audio">Аудиозвонок</SelectItem>
                    <SelectItem value="social">Команда</SelectItem>
                    <SelectItem value="external">Клиент</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            {(newEvent.type === 'video' || newEvent.type === 'audio') && (
              <div className="grid gap-2">
                <Label htmlFor="meeting-url">Ссылка на звонок</Label>
                <Input 
                  id="meeting-url" 
                  placeholder="https://..." 
                  value={newEvent.meetingUrl}
                  onChange={(e) => setNewEvent({...newEvent, meetingUrl: e.target.value})}
                />
              </div>
            )}
            <div className="grid gap-2">
              <Label htmlFor="desc">Описание</Label>
              <Input 
                id="desc" 
                placeholder="Краткое описание события" 
                value={newEvent.description}
                onChange={(e) => setNewEvent({...newEvent, description: e.target.value})}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddEventOpen(false)}>Отмена</Button>
            <Button onClick={handleAddEvent} disabled={!newEvent.title}>Создать</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Event Details Dialog */}
      <Dialog open={!!selectedEvent} onOpenChange={() => setSelectedEvent(null)}>
        <DialogContent className="sm:max-w-[425px]">
          {selectedEvent && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-2 mb-2">
                  <Badge className={cn(
                    "uppercase text-[10px] font-bold",
                    selectedEvent.type === 'video' ? "bg-purple-500" :
                    selectedEvent.type === 'audio' ? "bg-blue-500" :
                    selectedEvent.type === 'social' ? "bg-emerald-500" : "bg-primary"
                  )}>
                    {selectedEvent.type}
                  </Badge>
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Clock className="w-3 h-3" /> {selectedEvent.time}
                  </span>
                </div>
                <DialogTitle className="text-xl">{selectedEvent.title}</DialogTitle>
              </DialogHeader>
              <div className="py-4 space-y-4">
                {selectedEvent.description && (
                  <p className="text-sm text-muted-foreground bg-secondary/30 p-3 rounded-lg border border-border/50">
                    {selectedEvent.description}
                  </p>
                )}
                {selectedEvent.contact && (
                  <div className="flex items-center gap-3 p-3 rounded-lg border border-border/50">
                    <Avatar className="w-10 h-10 border-2 border-primary/20">
                      <AvatarFallback>{selectedEvent.contact[0]}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-sm font-bold leading-none">{selectedEvent.contact}</p>
                      <p className="text-xs text-muted-foreground mt-1">Участник встречи</p>
                    </div>
                  </div>
                )}
                <div className="grid grid-cols-1 gap-3">
                  {(selectedEvent.type === 'video' || selectedEvent.type === 'audio' || selectedEvent.meetingUrl) && (
                    <Button 
                      className="gap-2 w-full h-12 text-sm font-bold shadow-lg shadow-primary/20"
                      onClick={() => {
                         toast.success("Подключение...");
                         if (selectedEvent.meetingUrl) window.open(selectedEvent.meetingUrl, '_blank');
                      }}
                    >
                      <PhoneCall className="w-4 h-4" /> Подключиться к звонку
                    </Button>
                  )}
                  <Button variant="outline" className="gap-2">
                    <UsersIcon className="w-4 h-4" /> Участники
                  </Button>
                </div>
              </div>
              <DialogFooter className="flex sm:justify-between items-center">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="text-rose-500 hover:text-rose-600 hover:bg-rose-500/10"
                  onClick={() => {
                    setEvents(events.filter(e => e.id !== selectedEvent.id));
                    setSelectedEvent(null);
                  }}
                >
                  Удалить
                </Button>
                <Button onClick={() => setSelectedEvent(null)}>Закрыть</Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
