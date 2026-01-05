import { useState } from "react";
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search, Phone, Video, Info, Paperclip, Smile, Send, Clock, Plus, Users, Check, FolderPlus, Folder, LogOut, User } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { useLocation } from "wouter";
import { ScheduleCallDialog, ScheduledCall } from "@/components/call/ScheduleCallDialog";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
  DialogDescription,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface Contact {
  id: number;
  name: string;
  lastMsg: string;
  time: string;
  unread: number;
  avatar: string | null;
  group: boolean;
  online?: boolean;
  members?: string[];
  owner?: string;
  description?: string;
}

interface ChatFolder {
  id: string;
  name: string;
  chatIds: number[];
}

const initialContacts: Contact[] = [
  { 
    id: 1, 
    name: "Команда дизайна", 
    lastMsg: "Выглядит хорошо!", 
    time: "10:42", 
    unread: 2, 
    avatar: null, 
    group: true, 
    members: ["Юлия Дарицкая", "Я", "Елена Сидорова"],
    owner: "Юлия Дарицкая",
    description: "Обсуждение UI/UX паттернов, дизайн-системы и новых макетов для TeamSync."
  },
  { id: 2, name: "Юлия Дарицкая", lastMsg: "Можешь посмотреть PR?", time: "09:30", unread: 0, avatar: "https://github.com/shadcn.png", online: true },
  { 
    id: 3, 
    name: "Маркетинг", 
    lastMsg: "Новая кампания в прямом эфире 🚀", 
    time: "Вчера", 
    unread: 5, 
    avatar: null, 
    group: true, 
    members: ["Я", "Дарья Козлова"],
    owner: "Дарья Козлова",
    description: "Планирование рекламных кампаний и анализ метрик."
  },
  { id: 4, name: "Майк Росс", lastMsg: "Сервер не работает...", time: "Вчера", unread: 0, avatar: null, online: false },
  { id: 5, name: "Сара Миллер", lastMsg: "Спасибо за помощь!", time: "Пн", unread: 0, avatar: null, online: true },
];

const teamMembers = [
  { id: "1", name: "Юлия Дарицкая", position: "Product Manager" },
  { id: "2", name: "Александр Петров", position: "Senior Frontend Developer" },
  { id: "3", name: "Елена Сидорова", position: "UI/UX Designer" },
  { id: "4", name: "Максим Иванов", position: "Backend Lead" },
  { id: "5", name: "Дарья Козлова", position: "Marketing Specialist" },
];

const initialMessages = [
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
  const [contacts, setContacts] = useState<Contact[]>(initialContacts);
  const [activeChat, setActiveChat] = useState<Contact>(initialContacts[0]);
  
  const [isCreateGroupOpen, setIsCreateGroupOpen] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);

  const [isCreateFolderOpen, setIsCreateFolderOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [selectedChatIdsForFolder, setSelectedChatIdsForFolder] = useState<number[]>([]);
  const [folders, setFolders] = useState<ChatFolder[]>([]);
  const [activeFolderId, setActiveFolderId] = useState<string | null>(null);

  const [isInfoOpen, setIsInfoOpen] = useState(false);

  const handleScheduleCall = (callData: ScheduledCall) => {
    setScheduledCalls([...scheduledCalls, callData]);
  };

  const handleCreateGroup = () => {
    if (!newGroupName || selectedMembers.length === 0) return;
    const newGroup: Contact = {
      id: Date.now(),
      name: newGroupName,
      lastMsg: "Группа создана",
      time: "Только что",
      unread: 0,
      avatar: null,
      group: true,
      members: ["Я", ...selectedMembers.map(id => teamMembers.find(m => m.id === id)?.name || "")],
      owner: "Я",
      description: "Новая группа для обсуждения рабочих вопросов."
    };
    setContacts([newGroup, ...contacts]);
    setActiveChat(newGroup);
    setNewGroupName("");
    setSelectedMembers([]);
    setIsCreateGroupOpen(false);
  };

  const handleCreateFolder = () => {
    if (!newFolderName || selectedChatIdsForFolder.length === 0) return;
    const newFolder: ChatFolder = {
      id: Date.now().toString(),
      name: newFolderName,
      chatIds: selectedChatIdsForFolder
    };
    setFolders([...folders, newFolder]);
    setActiveFolderId(newFolder.id);
    setNewFolderName("");
    setSelectedChatIdsForFolder([]);
    setIsCreateFolderOpen(false);
  };

  const handleLeaveGroup = (groupId: number) => {
    setContacts(prev => prev.filter(c => c.id !== groupId));
    if (activeChat.id === groupId) {
      setActiveChat(contacts.find(c => c.id !== groupId) || contacts[0]);
    }
    setIsInfoOpen(false);
  };

  const toggleMember = (memberId: string) => {
    setSelectedMembers(prev => 
      prev.includes(memberId) ? prev.filter(id => id !== memberId) : [...prev, memberId]
    );
  };

  const toggleChatForFolder = (chatId: number) => {
    setSelectedChatIdsForFolder(prev => 
      prev.includes(chatId) ? prev.filter(id => id !== chatId) : [...prev, chatId]
    );
  };

  const filteredContacts = activeFolderId 
    ? contacts.filter(c => folders.find(f => f.id === activeFolderId)?.chatIds.includes(c.id))
    : contacts;

  return (
    <Layout>
      <div className="h-[calc(100vh-8rem)] rounded-xl border border-border/50 shadow-sm bg-card overflow-hidden flex animate-in fade-in duration-500">
        
        {/* Sidebar List */}
        <div className="w-80 border-r border-border bg-card flex flex-col">
          <div className="p-4 border-b border-border">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-lg">Общение</h2>
              <div className="flex gap-1">
                <Dialog open={isCreateFolderOpen} onOpenChange={setIsCreateFolderOpen}>
                  <DialogTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg hover:bg-primary/10 hover:text-primary transition-colors" title="Создать папку">
                      <FolderPlus className="w-4 h-4" />
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                      <DialogTitle>Создать папку для чатов</DialogTitle>
                      <DialogDescription>Сгруппируйте важные диалоги для быстрого доступа.</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label htmlFor="folder-name">Название папки</Label>
                        <Input 
                          id="folder-name" 
                          placeholder="Напр: Важное" 
                          value={newFolderName}
                          onChange={(e) => setNewFolderName(e.target.value)}
                          className="bg-secondary/30"
                        />
                      </div>
                      <div className="space-y-3">
                        <Label>Выберите чаты</Label>
                        <ScrollArea className="h-[200px] pr-4">
                          <div className="space-y-2">
                            {contacts.map((contact) => (
                              <div 
                                key={contact.id} 
                                className="flex items-center justify-between p-2 rounded-lg hover:bg-secondary/50 transition-colors cursor-pointer group"
                                onClick={() => toggleChatForFolder(contact.id)}
                              >
                                <div className="flex items-center gap-3">
                                  <Avatar className={cn("h-8 w-8", contact.group && "rounded-lg")}>
                                    <AvatarFallback className="text-[10px]">{contact.name.substring(0,2).toUpperCase()}</AvatarFallback>
                                  </Avatar>
                                  <span className="text-sm font-medium">{contact.name}</span>
                                </div>
                                <div className={cn(
                                  "w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all",
                                  selectedChatIdsForFolder.includes(contact.id) 
                                    ? "bg-primary border-primary text-primary-foreground" 
                                    : "border-muted-foreground/30 group-hover:border-primary/50"
                                )}>
                                  {selectedChatIdsForFolder.includes(contact.id) && <Check className="w-3 h-3" />}
                                </div>
                              </div>
                            ))}
                          </div>
                        </ScrollArea>
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setIsCreateFolderOpen(false)}>Отмена</Button>
                      <Button onClick={handleCreateFolder} disabled={!newFolderName || selectedChatIdsForFolder.length === 0}>
                        Создать папку
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>

                <Dialog open={isCreateGroupOpen} onOpenChange={setIsCreateGroupOpen}>
                  <DialogTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg hover:bg-primary/10 hover:text-primary transition-colors" title="Создать группу">
                      <Plus className="w-4 h-4" />
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                      <DialogTitle>Создать группу</DialogTitle>
                      <DialogDescription>Добавьте участников для совместного обсуждения.</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label htmlFor="group-name">Название группы</Label>
                        <Input 
                          id="group-name" 
                          placeholder="Напр: Проект Альфа" 
                          value={newGroupName}
                          onChange={(e) => setNewGroupName(e.target.value)}
                          className="bg-secondary/30"
                        />
                      </div>
                      <div className="space-y-3">
                        <Label>Выберите участников</Label>
                        <ScrollArea className="h-[200px] pr-4">
                          <div className="space-y-2">
                            {teamMembers.map((member) => (
                              <div 
                                key={member.id} 
                                className="flex items-center justify-between p-2 rounded-lg hover:bg-secondary/50 transition-colors cursor-pointer group"
                                onClick={() => toggleMember(member.id)}
                              >
                                <div className="flex items-center gap-3">
                                  <Avatar className="h-8 w-8">
                                    <AvatarFallback className="text-[10px]">{member.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                                  </Avatar>
                                  <div className="flex flex-col">
                                    <span className="text-sm font-medium">{member.name}</span>
                                    <span className="text-[10px] text-muted-foreground">{member.position}</span>
                                  </div>
                                </div>
                                <div className={cn(
                                  "w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all",
                                  selectedMembers.includes(member.id) 
                                    ? "bg-primary border-primary text-primary-foreground" 
                                    : "border-muted-foreground/30 group-hover:border-primary/50"
                                )}>
                                  {selectedMembers.includes(member.id) && <Check className="w-3 h-3" />}
                                </div>
                              </div>
                            ))}
                          </div>
                        </ScrollArea>
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setIsCreateGroupOpen(false)}>Отмена</Button>
                      <Button onClick={handleCreateGroup} disabled={!newGroupName || selectedMembers.length === 0}>
                        Создать группу
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </div>
            
            {/* Folder Tabs */}
            {folders.length > 0 && (
              <div className="flex gap-2 mb-4 overflow-x-auto pb-1 no-scrollbar">
                <Button 
                  variant={activeFolderId === null ? "default" : "secondary"} 
                  size="sm" 
                  className="h-7 text-[10px] uppercase tracking-wider font-bold px-3 rounded-full shrink-0"
                  onClick={() => setActiveFolderId(null)}
                >
                  Все
                </Button>
                {folders.map(folder => (
                  <Button 
                    key={folder.id}
                    variant={activeFolderId === folder.id ? "default" : "secondary"} 
                    size="sm" 
                    className="h-7 text-[10px] uppercase tracking-wider font-bold px-3 rounded-full shrink-0 flex items-center gap-1.5"
                    onClick={() => setActiveFolderId(folder.id)}
                  >
                    <Folder className="w-3 h-3" />
                    {folder.name}
                  </Button>
                ))}
              </div>
            )}

            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Поиск диалога..." className="pl-9 bg-secondary/50 border-none h-9 text-xs" />
            </div>
          </div>
          <ScrollArea className="flex-1">
             {filteredContacts.map(contact => (
               <div 
                 key={contact.id} 
                 onClick={() => setActiveChat(contact)}
                 className={cn(
                   "flex gap-3 p-4 cursor-pointer transition-all border-b border-border/40 last:border-0 relative",
                   activeChat.id === contact.id ? "bg-primary/5" : "hover:bg-secondary/50"
                 )}
               >
                  {activeChat.id === contact.id && (
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary" />
                  )}
                  <div className="relative">
                    <Avatar className={cn(contact.group && "rounded-lg")}>
                      <AvatarImage src={contact.avatar || undefined} />
                      <AvatarFallback className={cn(contact.group ? "bg-indigo-500/10 text-indigo-600 font-bold" : "bg-secondary text-muted-foreground")}>
                        {contact.group ? <Users className="w-4 h-4" /> : contact.name.substring(0,2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    {contact.online && (
                      <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 border-2 border-background rounded-full shadow-sm" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-baseline mb-1">
                       <h4 className={cn("text-sm truncate", activeChat.id === contact.id ? "font-bold text-foreground" : "font-medium text-foreground/80")}>
                         {contact.name}
                       </h4>
                       <span className="text-[10px] text-muted-foreground whitespace-nowrap">{contact.time}</span>
                    </div>
                    <div className="flex justify-between items-center">
                       <p className="text-xs text-muted-foreground truncate max-w-[140px] leading-relaxed">{contact.lastMsg}</p>
                       {contact.unread > 0 && (
                         <span className="bg-primary text-primary-foreground text-[10px] font-bold h-5 min-w-[1.25rem] px-1 rounded-full flex items-center justify-center shadow-sm shadow-primary/20">
                           {contact.unread}
                         </span>
                       )}
                    </div>
                  </div>
               </div>
             ))}
             {filteredContacts.length === 0 && (
               <div className="p-8 text-center">
                 <p className="text-xs text-muted-foreground italic">В этой папке пока нет чатов</p>
               </div>
             )}
          </ScrollArea>
        </div>

        {/* Chat Area */}
        <div className="flex-1 flex flex-col bg-secondary/10 relative">
           {/* Header */}
           <div className="h-16 px-6 border-b border-border flex items-center justify-between bg-card/80 backdrop-blur-md sticky top-0 z-10">
              <div className="flex items-center gap-3">
                <Avatar className={cn(activeChat.group && "rounded-lg")}>
                  <AvatarImage src={activeChat.avatar || undefined} />
                  <AvatarFallback className={cn(activeChat.group ? "bg-indigo-500/10 text-indigo-600 font-bold" : "bg-secondary")}>
                    {activeChat.group ? <Users className="w-5 h-5" /> : activeChat.name.substring(0,2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div>
                   <h3 className="font-bold text-sm leading-none mb-1.5">{activeChat.name}</h3>
                   {activeChat.group ? (
                     <span className="text-[11px] text-muted-foreground font-medium flex items-center gap-1">
                       <Users className="w-3 h-3" /> {activeChat.members?.length} участников
                     </span>
                   ) : (
                     <span className={cn("flex items-center gap-1.5 text-[11px] font-medium", activeChat.online ? "text-emerald-500" : "text-muted-foreground")}>
                       <span className={cn("w-1.5 h-1.5 rounded-full", activeChat.online ? "bg-emerald-500" : "bg-slate-400")} /> 
                       {activeChat.online ? "В сети" : "Был недавно"}
                     </span>
                   )}
                </div>
              </div>
              <div className="flex items-center gap-1">
                 <Button variant="ghost" size="icon" className="h-9 w-9 hover:bg-secondary rounded-lg" onClick={() => setLocation("/call")} title="Аудио звонок">
                   <Phone className="w-4 h-4 text-muted-foreground" />
                 </Button>
                 <Button variant="ghost" size="icon" className="h-9 w-9 hover:bg-secondary rounded-lg" onClick={() => setLocation("/call")} title="Видео звонок">
                   <Video className="w-4 h-4 text-muted-foreground" />
                 </Button>
                 <Button variant="ghost" size="icon" className="h-9 w-9 hover:bg-secondary rounded-lg" onClick={() => setScheduleOpen(true)} title="Запланировать звонок">
                   <Clock className="w-4 h-4 text-muted-foreground" />
                 </Button>
                 <Separator orientation="vertical" className="h-6 mx-2" />
                 
                 <Dialog open={isInfoOpen} onOpenChange={setIsInfoOpen}>
                   <DialogTrigger asChild>
                     <Button variant="ghost" size="icon" className="h-9 w-9 hover:bg-secondary rounded-lg">
                       <Info className="w-4 h-4 text-muted-foreground" />
                     </Button>
                   </DialogTrigger>
                   <DialogContent className="sm:max-w-[425px]">
                     <DialogHeader>
                       <DialogTitle>Информация о {activeChat.group ? "группе" : "собеседнике"}</DialogTitle>
                     </DialogHeader>
                     <div className="py-6 flex flex-col items-center">
                        <Avatar className={cn("w-24 h-24 mb-4 shadow-lg", activeChat.group && "rounded-2xl")}>
                          <AvatarImage src={activeChat.avatar || undefined} />
                          <AvatarFallback className="text-2xl bg-primary/10 text-primary font-bold">
                            {activeChat.name.substring(0,2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <h2 className="text-xl font-bold mb-1">{activeChat.name}</h2>
                        <p className="text-sm text-muted-foreground mb-6 text-center px-4 italic">
                          {activeChat.group ? activeChat.description : "Личный чат для приватного общения."}
                        </p>
                        
                        <div className="w-full space-y-4">
                           {activeChat.group && (
                             <div className="space-y-2">
                                <Label className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest px-1">Владелец</Label>
                                <div className="flex items-center gap-3 p-3 rounded-xl bg-secondary/30">
                                   <User className="w-4 h-4 text-primary" />
                                   <span className="text-sm font-medium">{activeChat.owner}</span>
                                </div>
                             </div>
                           )}
                           
                           {activeChat.group && (
                             <div className="space-y-2">
                                <Label className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest px-1">Участники ({activeChat.members?.length})</Label>
                                <div className="grid grid-cols-1 gap-1 max-h-[160px] overflow-y-auto pr-2 no-scrollbar">
                                   {activeChat.members?.map((member, i) => (
                                      <div key={i} className="flex items-center gap-3 p-2 rounded-lg hover:bg-secondary/20 transition-colors">
                                         <Avatar className="w-6 h-6">
                                            <AvatarFallback className="text-[8px]">{member.substring(0,2).toUpperCase()}</AvatarFallback>
                                         </Avatar>
                                         <span className="text-xs font-medium">{member}</span>
                                      </div>
                                   ))}
                                </div>
                             </div>
                           )}

                           {!activeChat.group && (
                              <div className="space-y-2">
                                 <Label className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest px-1">Статус</Label>
                                 <div className="flex items-center gap-3 p-3 rounded-xl bg-secondary/30">
                                    <div className={cn("w-2 h-2 rounded-full", activeChat.online ? "bg-emerald-500" : "bg-slate-500")} />
                                    <span className="text-sm font-medium">{activeChat.online ? "В сети" : "Не в сети"}</span>
                                 </div>
                              </div>
                           )}
                        </div>
                     </div>
                     <DialogFooter className="flex-col gap-2 sm:flex-col">
                        {activeChat.group && (
                          <Button variant="destructive" className="w-full gap-2" onClick={() => handleLeaveGroup(activeChat.id)}>
                            <LogOut className="w-4 h-4" /> Выйти из группы
                          </Button>
                        )}
                        <Button variant="secondary" className="w-full" onClick={() => setIsInfoOpen(false)}>Закрыть</Button>
                     </DialogFooter>
                   </DialogContent>
                 </Dialog>
              </div>
           </div>

           {/* Scheduled Calls Info */}
           {scheduledCalls.length > 0 && (
             <div className="bg-primary/5 border-b border-primary/10 px-6 py-2.5 animate-in slide-in-from-top duration-300">
               <div className="flex items-center justify-between">
                 <p className="text-[11px] font-bold text-primary uppercase tracking-wider">Запланированные встречи</p>
                 <span className="text-[10px] text-muted-foreground">{scheduledCalls.length} активно</span>
               </div>
               <div className="flex flex-wrap gap-2 mt-2">
                 {scheduledCalls.map((call, i) => (
                   <Badge key={i} variant="secondary" className="bg-background/80 hover:bg-background border-border/50 text-foreground py-1 flex items-center gap-1.5 text-[10px] font-medium transition-all cursor-default">
                     <div className={cn("w-1.5 h-1.5 rounded-full", call.type === 'video' ? "bg-blue-500" : "bg-amber-500")} />
                     {call.date} • {call.time}
                   </Badge>
                 ))}
               </div>
             </div>
           )}

           {/* Messages */}
           <ScrollArea className="flex-1 p-6">
              <div className="space-y-6 max-w-4xl mx-auto">
                 <div className="flex justify-center">
                    <span className="px-3 py-1 rounded-full bg-secondary/50 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Сегодня</span>
                 </div>
                 {initialMessages.map(msg => (
                    <div key={msg.id} className={`flex gap-3 ${msg.me ? 'flex-row-reverse' : 'flex-row'}`}>
                       {!msg.me && (
                         <Avatar className="w-8 h-8 shrink-0 mt-1 ring-2 ring-background">
                           <AvatarImage src={activeChat.avatar || undefined} />
                           <AvatarFallback className="bg-secondary text-[10px]">{msg.sender.substring(0,2).toUpperCase()}</AvatarFallback>
                         </Avatar>
                       )}
                       <div className={`flex flex-col ${msg.me ? 'items-end' : 'items-start'} max-w-[75%]`}>
                          {!msg.me && activeChat.group && <span className="text-[10px] font-bold text-muted-foreground mb-1 ml-1">{msg.sender}</span>}
                          <div className={cn(
                            "px-4 py-3 shadow-sm text-sm relative",
                            msg.me 
                              ? 'bg-primary text-primary-foreground rounded-2xl rounded-tr-none' 
                              : 'bg-card border border-border/60 rounded-2xl rounded-tl-none'
                          )}>
                             <p className="leading-relaxed">{msg.content}</p>
                             <span className={cn(
                               "text-[9px] block text-right mt-1.5 font-medium",
                               msg.me ? 'text-primary-foreground/60' : 'text-muted-foreground/60'
                             )}>
                               {msg.time}
                             </span>
                          </div>
                       </div>
                    </div>
                 ))}
              </div>
           </ScrollArea>

           {/* Input */}
           <div className="p-6 bg-card border-t border-border/50">
              <div className="max-w-4xl mx-auto flex gap-3 items-end bg-secondary/20 rounded-2xl p-2 border border-border/40 focus-within:ring-2 ring-primary/10 transition-all focus-within:bg-card focus-within:border-primary/20">
                 <div className="flex items-center">
                   <Button variant="ghost" size="icon" className="h-10 w-10 text-muted-foreground hover:text-primary hover:bg-primary/5 rounded-xl transition-all">
                     <Paperclip className="w-5 h-5" />
                   </Button>
                 </div>
                 <Input 
                   placeholder="Напишите сообщение..." 
                   className="border-0 bg-transparent focus-visible:ring-0 shadow-none py-6 text-sm placeholder:text-muted-foreground/60" 
                 />
                 <div className="flex items-center gap-1 pr-1">
                   <Button variant="ghost" size="icon" className="h-10 w-10 text-muted-foreground hover:text-amber-500 hover:bg-amber-500/5 rounded-xl transition-all">
                     <Smile className="w-5 h-5" />
                   </Button>
                   <Button size="icon" className="h-10 w-10 rounded-xl shadow-lg shadow-primary/20 hover:scale-105 active:scale-95 transition-all">
                     <Send className="w-4 h-4" />
                   </Button>
                 </div>
              </div>
           </div>
        </div>

        {/* Schedule Call Dialog */}
        <ScheduleCallDialog
          open={scheduleOpen}
          onOpenChange={setScheduleOpen}
          contactName={activeChat.name}
          onSchedule={handleScheduleCall}
        />
      </div>
    </Layout>
  );
}
