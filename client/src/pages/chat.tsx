import { useState } from "react";
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search, Phone, Video, Info, Paperclip, Smile, Send, Clock } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { useLocation } from "wouter";
import { ScheduleCallDialog, ScheduledCall } from "@/components/call/ScheduleCallDialog";
import { Badge } from "@/components/ui/badge";

const contacts = [
  { id: 1, name: "Команда дизайна", lastMsg: "Выглядит хорошо!", time: "10:42", unread: 2, avatar: null, group: true },
  { id: 2, name: "Юлия Дарицкая", lastMsg: "Можешь посмотреть PR?", time: "09:30", unread: 0, avatar: "https://github.com/shadcn.png", online: true },
  { id: 3, name: "Маркетинг", lastMsg: "Новая кампания в прямом эфире 🚀", time: "Вчера", unread: 5, avatar: null, group: true },
  { id: 4, name: "Майк Росс", lastMsg: "Сервер не работает...", time: "Вчера", unread: 0, avatar: null, online: false },
  { id: 5, name: "Сара Миллер", lastMsg: "Спасибо за помощь!", time: "Пн", unread: 0, avatar: null, online: true },
];

const messages = [
  { id: 1, sender: "Юлия Дарицкая", content: "Привет команда, как идёт новый дизайн?", time: "10:30", me: false },
  { id: 2, sender: "Я", content: "Почти готово! Заканчиваю переменные тёмного режима.", time: "10:32", me: true },
  { id: 3, sender: "Юлия Дарицкая", content: "Отлично! Можем ли мы запланировать ревью позже?", time: "10:33", me: false },
  { id: 4, sender: "Я", content: "Конечно, как насчёт 14:00?", time: "10:35", me: true },
  { id: 5, sender: "Юлия Дарицкая", content: "Для меня подходит. Сейчас отправлю приглашение.", time: "10:36", me: false },
  { id: 6, sender: "Я", content: "👍", time: "10:36", me: true },
];

export default function Chat() {
  const [, setLocation] = useLocation();
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [scheduledCalls, setScheduledCalls] = useState<ScheduledCall[]>([]);

  const handleScheduleCall = (callData: ScheduledCall) => {
    setScheduledCalls([...scheduledCalls, callData]);
    // In a real app, this would also update the calendar
  };

  return (
    <Layout>
      <div className="h-[calc(100vh-8rem)] rounded-xl border border-border/50 shadow-sm bg-card overflow-hidden flex animate-in fade-in duration-500">
        
        {/* Sidebar List */}
        <div className="w-80 border-r border-border bg-card flex flex-col">
          <div className="p-4 border-b border-border">
            <h2 className="font-semibold mb-4">Сообщения</h2>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Поиск..." className="pl-9 bg-secondary/50 border-none" />
            </div>
          </div>
          <ScrollArea className="flex-1">
             {contacts.map(contact => (
               <div key={contact.id} className="flex gap-3 p-4 hover:bg-secondary/50 cursor-pointer transition-colors border-b border-border/40 last:border-0">
                  <div className="relative">
                    <Avatar>
                      <AvatarImage src={contact.avatar || undefined} />
                      <AvatarFallback className={contact.group ? "bg-primary/10 text-primary" : ""}>
                        {contact.name.substring(0,2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    {contact.online && (
                      <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 border-2 border-background rounded-full" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-baseline mb-1">
                       <h4 className="font-medium text-sm truncate">{contact.name}</h4>
                       <span className="text-[10px] text-muted-foreground">{contact.time}</span>
                    </div>
                    <div className="flex justify-between items-center">
                       <p className="text-xs text-muted-foreground truncate max-w-[140px]">{contact.lastMsg}</p>
                       {contact.unread > 0 && (
                         <span className="bg-primary text-primary-foreground text-[10px] font-bold h-5 min-w-[1.25rem] px-1 rounded-full flex items-center justify-center">
                           {contact.unread}
                         </span>
                       )}
                    </div>
                  </div>
               </div>
             ))}
          </ScrollArea>
        </div>

        {/* Chat Area */}
        <div className="flex-1 flex flex-col bg-secondary/10">
           {/* Header */}
           <div className="h-16 px-6 border-b border-border flex items-center justify-between bg-card">
              <div className="flex items-center gap-3">
                <Avatar>
                  <AvatarImage src="https://github.com/shadcn.png" />
                  <AvatarFallback>ЮД</AvatarFallback>
                </Avatar>
                <div>
                   <h3 className="font-semibold text-sm">Юлия Дарицкая</h3>
                   <span className="flex items-center gap-1.5 text-xs text-emerald-500">
                     <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> В сети
                   </span>
                </div>
              </div>
              <div className="flex items-center gap-1">
                 <Button 
                   variant="ghost" 
                   size="icon"
                   className="hover:bg-secondary"
                   onClick={() => setLocation("/call")}
                   data-testid="button-start-audio-call"
                   title="Аудио звонок"
                 >
                   <Phone className="w-5 h-5 text-muted-foreground" />
                 </Button>
                 <Button 
                   variant="ghost" 
                   size="icon"
                   className="hover:bg-secondary"
                   onClick={() => setLocation("/call")}
                   data-testid="button-start-video-call"
                   title="Видео звонок"
                 >
                   <Video className="w-5 h-5 text-muted-foreground" />
                 </Button>
                 <Button 
                   variant="ghost" 
                   size="icon"
                   className="hover:bg-secondary"
                   onClick={() => setScheduleOpen(true)}
                   data-testid="button-schedule-call"
                   title="Запланировать звонок"
                 >
                   <Clock className="w-5 h-5 text-muted-foreground" />
                 </Button>
                 <Separator orientation="vertical" className="h-6 mx-2" />
                 <Button 
                   variant="ghost" 
                   size="icon"
                   className="hover:bg-secondary"
                   data-testid="button-call-info"
                 >
                   <Info className="w-5 h-5 text-muted-foreground" />
                 </Button>
              </div>
           </div>

           {/* Scheduled Calls Info */}
           {scheduledCalls.length > 0 && (
             <div className="bg-blue-50 dark:bg-blue-950/30 border-b border-blue-200 dark:border-blue-900 px-6 py-3">
               <p className="text-sm font-medium text-blue-900 dark:text-blue-300 mb-2">Запланированные звонки:</p>
               <div className="flex flex-wrap gap-2">
                 {scheduledCalls.map((call, i) => (
                   <Badge key={i} variant="secondary" className="bg-blue-100 dark:bg-blue-900/50 text-blue-900 dark:text-blue-300 flex items-center gap-1">
                     <Clock className="w-3 h-3" />
                     {call.date} в {call.time} ({call.type === 'video' ? 'видео' : 'аудио'})
                   </Badge>
                 ))}
               </div>
             </div>
           )}

           {/* Messages */}
           <ScrollArea className="flex-1 p-6">
              <div className="space-y-4">
                 {messages.map(msg => (
                    <div key={msg.id} className={`flex ${msg.me ? 'justify-end' : 'justify-start'}`}>
                       {!msg.me && (
                         <Avatar className="w-8 h-8 mr-2 mt-1">
                           <AvatarImage src="https://github.com/shadcn.png" />
                           <AvatarFallback>ЮД</AvatarFallback>
                         </Avatar>
                       )}
                       <div className={`max-w-[70%] rounded-2xl px-4 py-3 shadow-sm ${
                         msg.me 
                           ? 'bg-primary text-primary-foreground rounded-br-none' 
                           : 'bg-card border border-border rounded-bl-none'
                       }`}>
                          <p className="text-sm">{msg.content}</p>
                          <span className={`text-[10px] block text-right mt-1 ${msg.me ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
                            {msg.time}
                          </span>
                       </div>
                    </div>
                 ))}
              </div>
           </ScrollArea>

           {/* Input */}
           <div className="p-4 bg-card border-t border-border">
              <div className="flex gap-2 items-center bg-secondary/30 rounded-xl px-2 border border-border/50 focus-within:ring-2 ring-primary/20 transition-all">
                 <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground shrink-0"><Paperclip className="w-5 h-5" /></Button>
                 <Input 
                   placeholder="Напишите сообщение..." 
                   className="border-0 bg-transparent focus-visible:ring-0 shadow-none py-6" 
                 />
                 <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground shrink-0"><Smile className="w-5 h-5" /></Button>
                 <Button size="icon" className="shrink-0 rounded-lg shadow-sm"><Send className="w-4 h-4" /></Button>
              </div>
           </div>
        </div>

        {/* Schedule Call Dialog */}
        <ScheduleCallDialog
          open={scheduleOpen}
          onOpenChange={setScheduleOpen}
          contactName="Юлия Дарицкая"
          onSchedule={handleScheduleCall}
        />
      </div>
    </Layout>
  );
}
