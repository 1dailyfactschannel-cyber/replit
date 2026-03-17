import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Calendar as CalendarUI } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useState, useMemo, useEffect } from "react";
import { useLocation } from "wouter";
import { 
  ChevronLeft, 
  ChevronRight, 
  Clock, 
  Video, 
  Mic, 
  Plus, 
  Users as UsersIcon, 
  PhoneCall, 
  Info,
  Loader2,
  AlertCircle,
  RefreshCw,
  Trash2,
  Edit,
  Calendar as CalendarIcon,
  LayoutGrid
} from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useYandexCalendar } from "@/hooks/use-yandex-calendar";
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths } from "date-fns";
import { ru } from "date-fns/locale";

interface CalendarEvent {
  id: string;
  date: string;
  title: string;
  time: string;
  type: 'work' | 'social' | 'external' | 'video' | 'audio';
  contact?: string;
  description?: string;
  meetingUrl?: string;
  roomId?: string;
}

interface TeamRoomWithAdmin {
  id: string;
  name: string;
  slug: string;
  isAdmin: boolean;
}

type ViewMode = 'month' | 'day';

// Day View Component
interface DayViewProps {
  date: Date;
  events: CalendarEvent[];
  isLoading: boolean;
  onEventClick: (event: CalendarEvent) => void;
}

function DayView({ date, events, isLoading, onEventClick }: DayViewProps) {
  // Generate time slots from 00:00 to 23:00
  const timeSlots = Array.from({ length: 24 }, (_, i) => {
    const hour = i.toString().padStart(2, '0');
    return `${hour}:00`;
  });

  // Sort events by time
  const sortedEvents = [...events].sort((a, b) => {
    return a.time.localeCompare(b.time);
  });

  // Calculate event position based on time
  const getEventPosition = (time: string) => {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
  };

  // Group events by hour and calculate column positions
  const getEventLayout = () => {
    // Group events by hour
    const eventsByHour: Record<string, typeof events> = {};
    sortedEvents.forEach(event => {
      const hour = event.time.split(':')[0];
      if (!eventsByHour[hour]) {
        eventsByHour[hour] = [];
      }
      eventsByHour[hour].push(event);
    });

    // Calculate column for each event
    return sortedEvents.map(event => {
      const hour = event.time.split(':')[0];
      const hourEvents = eventsByHour[hour];
      const columnIndex = hourEvents.indexOf(event);
      const totalColumns = hourEvents.length;
      
      return {
        event,
        columnIndex,
        totalColumns,
        hour
      };
    });
  };

  const eventLayouts = getEventLayout();

  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-8 w-48" />
        <div className="space-y-2">
          {Array(5).fill(0).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-280px)] overflow-auto">
      {/* Day Header */}
      <div className="sticky top-0 bg-card/95 backdrop-blur z-20 p-4 border-b border-border/50">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold capitalize">
              {format(date, "EEEE, d MMMM yyyy", { locale: ru })}
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              {events.length} {events.length === 1 ? 'событие' : events.length < 5 ? 'события' : 'событий'}
            </p>
          </div>
        </div>
      </div>

      {/* Timeline */}
      <div className="relative min-h-[1440px]">
        {/* Time slots */}
        <div className="absolute left-0 top-0 w-16 h-full border-r border-border/30">
          {timeSlots.map((time, index) => (
            <div
              key={time}
              className="h-[60px] flex items-start justify-end pr-2 text-xs text-muted-foreground border-b border-border/20"
              style={{ marginTop: index === 0 ? 0 : 0 }}
            >
              <span className="-mt-2">{time}</span>
            </div>
          ))}
        </div>

        {/* Grid lines */}
        <div className="ml-16">
          {timeSlots.map((time) => (
            <div
              key={time}
              className="h-[60px] border-b border-border/20 relative"
            >
              {/* Half-hour marker */}
              <div className="absolute top-[30px] left-0 right-0 border-t border-border/10" />
            </div>
          ))}

          {/* Events */}
          {eventLayouts.map((layout) => {
            const event = layout.event;
            const startMinutes = getEventPosition(event.time);
            const top = (startMinutes / 1440) * 1440;
            const duration = 60; // Default 1 hour duration
            const height = (duration / 1440) * 1440;

            // Calculate horizontal position based on column
            const leftPercent = layout.totalColumns > 1 
              ? (layout.columnIndex / layout.totalColumns) * 100 
              : 2;
            const widthPercent = layout.totalColumns > 1 
              ? (1 / layout.totalColumns) * 100 - 1 
              : 96;

            return (
              <div
                key={event.id}
                onClick={() => onEventClick(event)}
                className={cn(
                  "absolute rounded-lg p-2 cursor-pointer transition-all hover:shadow-md border-l-4",
                  "hover:scale-[1.02] hover:z-10",
                  event.type === 'video' ? "bg-purple-500/10 border-purple-500 hover:bg-purple-500/20" :
                  event.type === 'audio' ? "bg-blue-500/10 border-blue-500 hover:bg-blue-500/20" :
                  event.type === 'social' ? "bg-emerald-500/10 border-emerald-500 hover:bg-emerald-500/20" :
                  "bg-primary/10 border-primary hover:bg-primary/20"
                )}
                style={{
                  top: `${top}px`,
                  height: `${Math.max(height, 40)}px`,
                  minHeight: '40px',
                  left: `${leftPercent}%`,
                  width: `${widthPercent}%`
                }}
              >
                <div className="flex items-start gap-1.5 h-full overflow-hidden">
                  <div className="flex-shrink-0 mt-0.5">
                    {event.type === 'video' && <Video className="w-3 h-3 text-purple-600" />}
                    {event.type === 'audio' && <Mic className="w-3 h-3 text-blue-600" />}
                    {event.type === 'work' && <Clock className="w-3 h-3 text-primary" />}
                    {event.type === 'social' && <UsersIcon className="w-3 h-3 text-emerald-600" />}
                    {event.type === 'external' && <PhoneCall className="w-3 h-3 text-primary" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-xs truncate">{event.title}</p>
                    <p className="text-[10px] text-muted-foreground">{event.time}</p>
                    {event.contact && (
                      <p className="text-[10px] text-muted-foreground truncate mt-0.5">
                        с {event.contact}
                      </p>
                    )}
                    {event.description && (
                      <p className="text-[10px] text-muted-foreground line-clamp-1 mt-0.5">
                        {event.description}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            );
          })}

          {/* Current time indicator */}
          {isSameDay(date, new Date()) && (
            <CurrentTimeIndicator />
          )}
        </div>
      </div>

      {/* Empty state */}
      {sortedEvents.length === 0 && !isLoading && (
        <div className="flex flex-col items-center justify-center h-64 ml-16">
          <Clock className="w-12 h-12 text-muted-foreground/30 mb-3" />
          <p className="text-muted-foreground">Нет событий на этот день</p>
        </div>
      )}
    </div>
  );
}

// Current time indicator component
function CurrentTimeIndicator() {
  const [position, setPosition] = useState(() => {
    const now = new Date();
    const minutes = now.getHours() * 60 + now.getMinutes();
    return (minutes / 1440) * 1440;
  });

  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      const minutes = now.getHours() * 60 + now.getMinutes();
      setPosition((minutes / 1440) * 1440);
    }, 60000); // Update every minute

    return () => clearInterval(interval);
  }, []);

  return (
    <div
      className="absolute left-0 right-0 flex items-center z-30 pointer-events-none"
      style={{ top: `${position}px` }}
    >
      <div className="w-2 h-2 rounded-full bg-red-500 -ml-1" />
      <div className="flex-1 h-0.5 bg-red-500" />
    </div>
  );
}

export default function CalendarPage() {
  const [location, setLocation] = useLocation();
  const queryClient = useQueryClient();
  
  // Initialize Yandex Calendar WebSocket listeners
  useYandexCalendar();
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [viewDate, setViewDate] = useState<Date>(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>('month');
  const [isAddEventOpen, setIsAddEventOpen] = useState(false);
  const [isEditEventOpen, setIsEditEventOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
   
  // Form state
  const [eventForm, setEventForm] = useState<Partial<CalendarEvent>>({
    title: "",
    time: "10:00",
    type: "work",
    description: "",
    meetingUrl: "",
    contact: "",
    roomId: ""
  });

  // Fetch team rooms for selection
  const { data: teamRooms = [] } = useQuery<TeamRoomWithAdmin[]>({
    queryKey: ["/api/team-rooms/with-admin-status"],
    staleTime: 60000,
  });

  // Calculate date range for the current view
  const dateRange = useMemo(() => {
    const start = startOfWeek(startOfMonth(viewDate), { weekStartsOn: 1 });
    const end = endOfWeek(endOfMonth(viewDate), { weekStartsOn: 1 });
    return { start, end };
  }, [viewDate]);

  // Fetch events
  const { data: events = [], isLoading, error, refetch } = useQuery<CalendarEvent[]>({
    queryKey: ["/api/calendar/events", dateRange.start.toISOString(), dateRange.end.toISOString()],
    queryFn: async () => {
      const res = await apiRequest(
        "GET", 
        `/api/calendar/events?startDate=${dateRange.start.toISOString()}&endDate=${dateRange.end.toISOString()}`
      );
      return res.json();
    },
  });

  // Handle eventId from URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const eventId = params.get('eventId');
    if (eventId && events.length > 0) {
      const event = events.find(e => e.id === eventId);
      if (event) {
        setSelectedEvent(event);
        setLocation('/calendar', { replace: true });
      }
    }
  }, [events, setLocation]);

  // Fetch Yandex Calendar events
  const { data: yandexEvents = [] } = useQuery<any[]>({
    queryKey: ["/api/calendar/yandex-events", dateRange.start.toISOString(), dateRange.end.toISOString()],
    queryFn: async () => {
      const res = await apiRequest(
        "GET",
        `/api/calendar/yandex-events?from=${dateRange.start.toISOString()}&to=${dateRange.end.toISOString()}`
      );
      const data = await res.json();
      return data.events || [];
    },
  });

  // Create event mutation
  const createMutation = useMutation({
    mutationFn: async (eventData: Partial<CalendarEvent>) => {
      const res = await apiRequest("POST", "/api/calendar/events", {
        ...eventData,
        date: selectedDate?.toISOString()
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/calendar/events"] });
      toast.success("Событие создано");
      setIsAddEventOpen(false);
      resetForm();
    },
    onError: () => {
      toast.error("Не удалось создать событие");
    }
  });

  // Update event mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<CalendarEvent> }) => {
      const res = await apiRequest("PATCH", `/api/calendar/events/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/calendar/events"] });
      toast.success("Событие обновлено");
      setIsEditEventOpen(false);
      setSelectedEvent(null);
      resetForm();
    },
    onError: () => {
      toast.error("Не удалось обновить событие");
    }
  });

  // Delete event mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/calendar/events/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/calendar/events"] });
      toast.success("Событие удалено");
      setSelectedEvent(null);
    },
    onError: () => {
      toast.error("Не удалось удалить событие");
    }
  });

  const resetForm = () => {
    setEventForm({
      title: "",
      time: "10:00",
      type: "work",
      description: "",
      meetingUrl: "",
      contact: ""
    });
  };

  const handleAddEvent = () => {
    if (!eventForm.title) {
      toast.error("Введите название события");
      return;
    }
    createMutation.mutate(eventForm);
  };

  const handleUpdateEvent = () => {
    if (!selectedEvent || !eventForm.title) return;
    updateMutation.mutate({ id: selectedEvent.id, data: eventForm });
  };

  const handleDeleteEvent = () => {
    if (!selectedEvent) return;
    deleteMutation.mutate(selectedEvent.id);
  };

  const openEditDialog = (event: CalendarEvent) => {
    setEventForm({
      title: event.title,
      time: event.time,
      type: event.type,
      description: event.description || "",
      meetingUrl: event.meetingUrl || "",
      contact: event.contact || ""
    });
    setIsEditEventOpen(true);
  };

  const calendarDays = useMemo(() => {
    const start = startOfWeek(startOfMonth(viewDate), { weekStartsOn: 1 });
    const end = endOfWeek(endOfMonth(viewDate), { weekStartsOn: 1 });
    return eachDayOfInterval({ start, end });
  }, [viewDate]);

  const getEventsForDate = (checkDate: Date) => {
    const localEvents = events.filter((event) => {
      const eventDate = new Date(event.date);
      return isSameDay(eventDate, checkDate);
    });

    const yandexEventsForDate = yandexEvents.filter((event) => {
      const eventDate = new Date(event.startDate);
      return isSameDay(eventDate, checkDate);
    }).map((event) => ({
      ...event,
      id: event.id,
      date: event.startDate,
      time: format(new Date(event.startDate), 'HH:mm'),
      type: 'work' as const,
      title: event.title,
      description: event.description,
      meetingUrl: event.meetingUrl,
      contact: event.attendees?.[0]?.name || event.organizerEmail,
      source: 'yandex' as const,
      color: event.color || '#FC3F1D',
      isReadOnly: true
    }));

    const allEvents = [...localEvents, ...yandexEventsForDate];
    return allEvents.sort((a, b) => a.time.localeCompare(b.time));
  };

  const navigateMonth = (direction: number) => {
    setViewDate(direction > 0 ? addMonths(viewDate, 1) : subMonths(viewDate, 1));
  };

  const navigateDay = (direction: number) => {
    const newDate = new Date(viewDate);
    newDate.setDate(newDate.getDate() + direction);
    setViewDate(newDate);
    setSelectedDate(newDate);
  };

  const currentMonthName = format(viewDate, "LLLL yyyy", { locale: ru });
  const currentDayName = format(viewDate, "EEEE, d MMMM", { locale: ru });

  if (error) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
          <AlertCircle className="w-16 h-16 text-destructive" />
          <h2 className="text-xl font-semibold">Ошибка загрузки данных</h2>
          <p className="text-muted-foreground">Не удалось загрузить события календаря</p>
          <Button onClick={() => refetch()} variant="outline">
            <RefreshCw className="w-4 h-4 mr-2" />
            Повторить
          </Button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6 animate-in fade-in duration-500 p-6">
         {/* Header */}
         <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
           <div>
              <h1 className="text-3xl font-bold tracking-tight text-foreground capitalize">
                {viewMode === 'month' ? currentMonthName : currentDayName}
              </h1>
              <p className="text-muted-foreground mt-1">Управляйте графиком и событиями команды.</p>
           </div>
           <div className="flex items-center gap-3 flex-wrap">
              {/* View Mode Toggle */}
              <div className="flex items-center bg-muted rounded-lg p-1 border border-border">
                <Button 
                  variant={viewMode === 'month' ? 'secondary' : 'ghost'} 
                  size="sm" 
                  onClick={() => setViewMode('month')}
                  className="h-8 gap-2 text-foreground hover:text-foreground"
                >
                  <LayoutGrid className="w-4 h-4" />
                  Месяц
                </Button>
                <Button 
                  variant={viewMode === 'day' ? 'secondary' : 'ghost'} 
                  size="sm" 
                  onClick={() => setViewMode('day')}
                  className="h-8 gap-2 text-foreground hover:text-foreground"
                >
                  <CalendarIcon className="w-4 h-4" />
                  День
                </Button>
              </div>
             
              {/* Navigation */}
              <div className="flex items-center bg-muted rounded-lg p-1 border border-border">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={() => viewMode === 'month' ? navigateMonth(-1) : navigateDay(-1)} 
                  className="h-8 w-8 text-foreground hover:text-foreground"
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => { setViewDate(new Date()); setSelectedDate(new Date()); }}
                  className="px-3 h-8 text-xs font-semibold text-foreground hover:text-foreground"
                >
                  Сегодня
                </Button>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={() => viewMode === 'month' ? navigateMonth(1) : navigateDay(1)} 
                  className="h-8 w-8 text-foreground hover:text-foreground"
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
             
             <Button 
               onClick={() => {
                 resetForm();
                 setIsAddEventOpen(true);
               }} 
               className="gap-2 shadow-lg shadow-primary/20"
               disabled={createMutation.isPending}
             >
               {createMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
               Создать событие
             </Button>
           </div>
         </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
           {/* Main Content - Month or Day View */}
           <Card className="lg:col-span-8 border-border/50 shadow-sm overflow-hidden bg-card/50 backdrop-blur-sm">
             <CardContent className="p-0">
               {viewMode === 'month' ? (
                 <>
               <div className="grid grid-cols-7 border-b border-border/50 bg-secondary/20">
                  {["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"].map(day => (
                    <div key={day} className="py-3 text-center text-xs font-bold text-muted-foreground uppercase tracking-wider border-r border-border/50 last:border-r-0">
                      {day}
                    </div>
                  ))}
               </div>
               <div className="grid grid-cols-7 border-border/50">
                  {isLoading ? (
                    // Loading skeleton
                    Array(35).fill(0).map((_, i) => (
                      <div key={i} className="border-b border-r border-border/50 p-2 min-h-[120px]">
                        <Skeleton className="h-6 w-6 rounded-full mb-2" />
                        <Skeleton className="h-4 w-full mb-1" />
                        <Skeleton className="h-4 w-2/3" />
                      </div>
                    ))
                  ) : (
                    calendarDays.map((dayDate, i) => {
                      const dayEvents = getEventsForDate(dayDate);
                      const isCurrentMonth = isSameMonth(dayDate, viewDate);
                      const isToday = isSameDay(dayDate, new Date());
                      const isSelected = selectedDate && isSameDay(dayDate, selectedDate);

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
                              {format(dayDate, "d")}
                            </span>
                            {dayEvents.length > 0 && (
                              <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                            )}
                          </div>
                          <div className="space-y-1">
                            {dayEvents.slice(0, 3).map((event: any) => (
                              <div 
                                key={event.id}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedEvent(event);
                                }}
                                className={cn(
                                  "text-[10px] p-1.5 rounded-md font-medium border-l-2 truncate transition-transform hover:scale-[1.02]",
                                  event.source === 'yandex' ? "" :
                                  event.type === 'video' ? "bg-purple-500/10 text-purple-600 border-purple-500" :
                                  event.type === 'audio' ? "bg-blue-500/10 text-blue-600 border-blue-500" :
                                  event.type === 'social' ? "bg-emerald-500/10 text-emerald-600 border-emerald-500" :
                                  "bg-primary/10 text-primary border-primary"
                                )}
                                style={event.source === 'yandex' ? {
                                  backgroundColor: `${event.color}15`,
                                  borderLeftColor: event.color,
                                  color: event.color
                                } : undefined}
                              >
                                <div className="flex items-center gap-1">
                                  {event.source === 'yandex' ? (
                                    <span className="text-[8px] font-bold opacity-70">Я</span>
                                  ) : (
                                    <>
                                      {event.type === 'video' && <Video className="w-2.5 h-2.5" />}
                                      {event.type === 'audio' && <Mic className="w-2.5 h-2.5" />}
                                    </>
                                  )}
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
                    })
                   )}
                </div>
                 </>
               ) : (
                 // Day View
                 <DayView 
                   date={viewDate}
                   events={getEventsForDate(viewDate)}
                   isLoading={isLoading}
                   onEventClick={setSelectedEvent}
                 />
               )}
             </CardContent>
           </Card>

           {/* Sidebar */}
           <div className="lg:col-span-4 space-y-6">
             <Card className="border-border/50 shadow-sm bg-card/50 backdrop-blur-sm">
               <CardHeader className="pb-3 flex flex-row items-center justify-between">
                 <CardTitle className="text-lg">События дня</CardTitle>
                 <Badge variant="outline" className="text-[10px] uppercase font-bold tracking-wider">
                   {selectedDate ? format(selectedDate, "d MMM", { locale: ru }) : "—"}
                 </Badge>
               </CardHeader>
                <CardContent className="space-y-4">
                  <ScrollArea className="h-[500px] pr-4">
                   {isLoading ? (
                     <div className="space-y-4">
                       {Array(3).fill(0).map((_, i) => (
                         <div key={i} className="flex gap-4">
                           <Skeleton className="w-14 h-14 rounded-xl" />
                           <div className="flex-1 space-y-2">
                             <Skeleton className="h-4 w-full" />
                             <Skeleton className="h-3 w-2/3" />
                           </div>
                         </div>
                       ))}
                     </div>
                   ) : selectedDate && getEventsForDate(selectedDate).length > 0 ? (
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
                                    {event.type === 'work' ? 'Работа' :
                                     event.type === 'video' ? 'Видео' :
                                     event.type === 'audio' ? 'Аудио' :
                                     event.type === 'social' ? 'Команда' : 'Клиент'}
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
                            
                            {(event.type === 'video' || event.type === 'audio' || event.meetingUrl || event.roomId) && (
                              <Button 
                                className="w-full h-8 gap-2 bg-primary/90 hover:bg-primary shadow-sm text-xs font-bold"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toast.success("Подключение к конференции...");
                                  if (event.roomId) {
                                    // Navigate to chat with auto-join
                                    window.location.href = `/chat?room=${event.roomId}&autoJoin=true`;
                                  } else if (event.meetingUrl) {
                                    window.open(event.meetingUrl, '_blank');
                                  }
                                }}
                              >
                                <PhoneCall className="w-3.5 h-3.5" />
                                Подключиться
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
                        onClick={() => {
                          resetForm();
                          setIsAddEventOpen(true);
                        }}
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
            <DialogDescription>Добавьте новое событие в ваш календарь.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="title">Название</Label>
              <Input 
                id="title" 
                placeholder="Напр: Ревью кода" 
                value={eventForm.title}
                onChange={(e) => setEventForm({...eventForm, title: e.target.value})}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="time">Время</Label>
                <Input 
                  id="time" 
                  type="time" 
                  value={eventForm.time}
                  onChange={(e) => setEventForm({...eventForm, time: e.target.value})}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="type">Тип</Label>
                <Select 
                  value={eventForm.type} 
                  onValueChange={(val) => setEventForm({...eventForm, type: val as any})}
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
            
            {/* Room Selection */}
            <div className="grid gap-2">
              <Label htmlFor="room">Командный зал</Label>
              <Select 
                value={eventForm.roomId || ""} 
                onValueChange={(val) => setEventForm({...eventForm, roomId: val || undefined})}
              >
                <SelectTrigger id="room">
                  <SelectValue placeholder="Выберите зал (опционально)" />
                </SelectTrigger>
                <SelectContent>
                  {teamRooms.map((room) => (
                    <SelectItem key={room.id} value={room.id}>
                      <div className="flex items-center gap-2">
                        <span>{room.name}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="contact">Контакт (опционально)</Label>
              <Input 
                id="contact" 
                placeholder="Имя участника" 
                value={eventForm.contact}
                onChange={(e) => setEventForm({...eventForm, contact: e.target.value})}
              />
            </div>
            {(eventForm.type === 'video' || eventForm.type === 'audio') && (
              <div className="grid gap-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="meeting-url">Ссылка на звонок</Label>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="w-4 h-4 text-muted-foreground cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Укажите ссылку на конференцию (Zoom, Google Meet и т.д.)</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <Input 
                  id="meeting-url" 
                  placeholder="https://..." 
                  value={eventForm.meetingUrl}
                  onChange={(e) => setEventForm({...eventForm, meetingUrl: e.target.value})}
                  className="font-mono text-xs"
                />
              </div>
            )}
            <div className="grid gap-2">
              <Label htmlFor="desc">Описание</Label>
              <Input 
                id="desc" 
                placeholder="Краткое описание события" 
                value={eventForm.description}
                onChange={(e) => setEventForm({...eventForm, description: e.target.value})}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddEventOpen(false)}>Отмена</Button>
            <Button 
              onClick={handleAddEvent} 
              disabled={!eventForm.title || createMutation.isPending}
            >
              {createMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Создать
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Event Details/Edit Dialog */}
      <Dialog open={!!selectedEvent && !isEditEventOpen} onOpenChange={() => setSelectedEvent(null)}>
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
                    {selectedEvent.type === 'work' ? 'Работа' :
                     selectedEvent.type === 'video' ? 'Видео' :
                     selectedEvent.type === 'audio' ? 'Аудио' :
                     selectedEvent.type === 'social' ? 'Команда' : 'Клиент'}
                  </Badge>
                </div>
                <DialogTitle className="text-xl">{selectedEvent.title}</DialogTitle>
              </DialogHeader>
              <div className="py-4 space-y-4">
                {/* Date and Time */}
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <CalendarIcon className="w-4 h-4" />
                  <span>{selectedEvent.date ? format(new Date(selectedEvent.date), "d MMMM yyyy", { locale: ru }) : ''}</span>
                  <Clock className="w-4 h-4 ml-2" />
                  <span>{selectedEvent.time}</span>
                </div>

                {/* Room */}
                {selectedEvent.roomId && (
                  <div className="flex items-center gap-2 text-sm bg-secondary/30 p-3 rounded-lg border border-border/50">
                    <UsersIcon className="w-4 h-4 text-primary" />
                    <span>Командный зал</span>
                  </div>
                )}

                {/* Meeting URL */}
                {selectedEvent.meetingUrl && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span className="text-xs">Ссылка: {selectedEvent.meetingUrl}</span>
                  </div>
                )}

                {/* Description */}
                {selectedEvent.description && (
                  <p className="text-sm text-muted-foreground bg-secondary/30 p-3 rounded-lg border border-border/50">
                    {selectedEvent.description}
                  </p>
                )}
                
                {/* Contact */}
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
                  {(selectedEvent.type === 'video' || selectedEvent.type === 'audio' || selectedEvent.meetingUrl || selectedEvent.roomId) && (
                    <Button 
                      className="gap-2 w-full h-12 text-sm font-bold shadow-lg shadow-primary/20"
                      onClick={() => {
                         toast.success("Подключение...");
                         if (selectedEvent.roomId) {
                           window.location.href = `/chat?room=${selectedEvent.roomId}&autoJoin=true`;
                         } else if (selectedEvent.meetingUrl) {
                           window.open(selectedEvent.meetingUrl, '_blank');
                         }
                      }}
                    >
                      <PhoneCall className="w-4 h-4" /> Подключиться к звонку
                    </Button>
                  )}
                  <Button 
                    variant="outline" 
                    className="gap-2"
                    onClick={() => openEditDialog(selectedEvent)}
                  >
                    <Edit className="w-4 h-4" /> Редактировать
                  </Button>
                </div>
              </div>
              <DialogFooter className="flex sm:justify-between items-center">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="text-rose-500 hover:text-rose-600 hover:bg-rose-500/10"
                  onClick={handleDeleteEvent}
                  disabled={deleteMutation.isPending}
                >
                  {deleteMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4 mr-1" />}
                  Удалить
                </Button>
                <Button onClick={() => setSelectedEvent(null)}>Закрыть</Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Event Dialog */}
      <Dialog open={isEditEventOpen} onOpenChange={setIsEditEventOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Редактировать событие</DialogTitle>
            <DialogDescription>Измените детали события.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-title">Название</Label>
              <Input 
                id="edit-title" 
                placeholder="Название события" 
                value={eventForm.title}
                onChange={(e) => setEventForm({...eventForm, title: e.target.value})}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="edit-time">Время</Label>
                <Input 
                  id="edit-time" 
                  type="time" 
                  value={eventForm.time}
                  onChange={(e) => setEventForm({...eventForm, time: e.target.value})}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-type">Тип</Label>
                <Select 
                  value={eventForm.type} 
                  onValueChange={(val) => setEventForm({...eventForm, type: val as any})}
                >
                  <SelectTrigger id="edit-type">
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
            <div className="grid gap-2">
              <Label htmlFor="edit-contact">Контакт</Label>
              <Input 
                id="edit-contact" 
                placeholder="Имя участника" 
                value={eventForm.contact}
                onChange={(e) => setEventForm({...eventForm, contact: e.target.value})}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-meeting-url">Ссылка на звонок</Label>
              <Input 
                id="edit-meeting-url" 
                placeholder="https://..." 
                value={eventForm.meetingUrl}
                onChange={(e) => setEventForm({...eventForm, meetingUrl: e.target.value})}
                className="font-mono text-xs"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-desc">Описание</Label>
              <Input 
                id="edit-desc" 
                placeholder="Описание события" 
                value={eventForm.description}
                onChange={(e) => setEventForm({...eventForm, description: e.target.value})}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditEventOpen(false)}>Отмена</Button>
            <Button 
              onClick={handleUpdateEvent} 
              disabled={!eventForm.title || updateMutation.isPending}
            >
              {updateMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Сохранить
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
