import { useState, useRef, useEffect } from "react";
import { Layout } from "@/components/layout/Layout";
import { useNotifications } from "@/hooks/use-notifications";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search, Phone, Video, Info, Paperclip, Smile, Send, Clock, Plus, Users, Check, FolderPlus, Folder, LogOut, User, Settings, Camera, UserMinus, ShieldAlert, X, MessageSquare, MoreVertical } from "lucide-react";
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
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { TeamRooms } from "@/components/chat/TeamRooms";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import type { Chat, Message, User as DBUser } from "@shared/schema";

interface Contact extends Chat {
  lastMessage?: Message;
  participants: DBUser[];
  unread?: number;
  time?: string;
  online?: boolean;
}

interface ChatFolder {
  id: string;
  name: string;
  chatIds: string[];
}

export default function ChatPage() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { notify, requestPermission } = useNotifications();
  
  const { data: currentUser } = useQuery<DBUser>({
    queryKey: ["/api/user"],
  });

  const { data: chats = [], isLoading: chatsLoading } = useQuery<Contact[]>({
    queryKey: ["/api/chats"],
  });

  const { data: allUsers = [] } = useQuery<DBUser>({
    queryKey: ["/api/users"],
  });

  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  
  const activeChat = chats.find(c => c.id === activeChatId) || chats[0];

  const { data: messages = [], isLoading: messagesLoading } = useQuery<Message[]>({
    queryKey: ["/api/chats", activeChatId, "messages"],
    enabled: !!activeChatId,
  });

  useEffect(() => {
    if (chats.length > 0 && !activeChatId) {
      setActiveChatId(chats[0].id);
    }
  }, [chats, activeChatId]);

  useEffect(() => {
    requestPermission();
  }, [requestPermission]);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [messageInput, setMessageInput] = useState("");
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [scheduledCalls, setScheduledCalls] = useState<ScheduledCall[]>([]);
  
  const [isCreateGroupOpen, setIsCreateGroupOpen] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);

  const [isCreateFolderOpen, setIsCreateFolderOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [selectedChatIdsForFolder, setSelectedChatIdsForFolder] = useState<string[]>([]);
  const [folders, setFolders] = useState<ChatFolder[]>([]);
  const [activeFolderId, setActiveFolderId] = useState<string | null>(null);

  const [isInfoOpen, setIsInfoOpen] = useState(false);
  
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editAvatar, setEditAvatar] = useState<string | null>(null);

  // Auto scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo(0, scrollRef.current.scrollHeight);
    }
  }, [messages]);

  const sendMessageMutation = useMutation({
    mutationFn: async (content: string) => {
      if (!activeChatId) return;
      return apiRequest("POST", `/api/chats/${activeChatId}/messages`, { content });
    },
    onSuccess: () => {
      setMessageInput("");
      queryClient.invalidateQueries({ queryKey: ["/api/chats", activeChatId, "messages"] });
      queryClient.invalidateQueries({ queryKey: ["/api/chats"] });
    }
  });

  const createChatMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest("POST", "/api/chats", data);
    },
    onSuccess: (newChat) => {
      queryClient.invalidateQueries({ queryKey: ["/api/chats"] });
      setIsCreateGroupOpen(false);
      setNewGroupName("");
      setSelectedMembers([]);
      setActiveChatId(newChat.id);
      toast.success("Чат создан");
    }
  });

  const handleSendMessage = () => {
    if (!messageInput.trim() || sendMessageMutation.isPending) return;
    sendMessageMutation.mutate(messageInput);
  };

  const handleCreateGroup = () => {
    if (!newGroupName.trim()) {
      toast.error("Введите название группы");
      return;
    }
    
    createChatMutation.mutate({
      name: newGroupName.trim(),
      type: "group",
      participantIds: selectedMembers,
      description: "Групповой чат"
    });
  };

  const handleScheduleCall = (callData: ScheduledCall) => {
    setScheduledCalls([...scheduledCalls, callData]);
  };

  const handleCreateFolder = () => {
    if (!newFolderName.trim()) {
      toast.error("Введите название папки");
      return;
    }
    const newFolder: ChatFolder = {
      id: Date.now().toString(),
      name: newFolderName.trim(),
      chatIds: selectedChatIdsForFolder
    };
    setFolders([...folders, newFolder]);
    setActiveFolderId(newFolder.id);
    setNewFolderName("");
    setSelectedChatIdsForFolder([]);
    setIsCreateFolderOpen(false);
    toast.success(`Папка "${newFolderName}" создана`);
  };

  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setEditAvatar(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const toggleMember = (memberId: string) => {
    setSelectedMembers(prev => 
      prev.includes(memberId) ? prev.filter(id => id !== memberId) : [...prev, memberId]
    );
  };

  const toggleChatForFolder = (chatId: string) => {
    setSelectedChatIdsForFolder(prev => 
      prev.includes(chatId) ? prev.filter(id => id !== chatId) : [...prev, chatId]
    );
  };

  const filteredContacts = activeFolderId 
    ? chats.filter(c => folders.find(f => f.id === activeFolderId)?.chatIds.includes(c.id))
    : chats;

  const getChatName = (chat: Contact) => {
    if (chat.type === "group") return chat.name;
    const otherParticipant = chat.participants.find(p => p.id !== currentUser?.id);
    return otherParticipant?.username || "Чат";
  };

  const getChatAvatar = (chat: Contact) => {
    if (chat.type === "group") return chat.avatar;
    const otherParticipant = chat.participants.find(p => p.id !== currentUser?.id);
    return otherParticipant?.avatar;
  };

  const formatTime = (dateStr?: string | Date | null) => {
    if (!dateStr) return "";
    const date = new Date(dateStr);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <Layout>
      <Tabs defaultValue="chats" className="h-[calc(100vh-8rem)] flex flex-col">
        <div className="px-6 py-2 border-b border-border/50 bg-card/50 backdrop-blur-sm shrink-0">
          <TabsList className="bg-muted/50 p-1 rounded-xl">
            <TabsTrigger value="chats" className="gap-2 px-6 rounded-lg">
              <MessageSquare className="w-4 h-4" />
              Чаты
            </TabsTrigger>
            <TabsTrigger value="rooms" className="gap-2 px-6 rounded-lg">
              <Video className="w-4 h-4" />
              Командные залы
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="chats" className="flex-1 m-0 focus-visible:outline-none overflow-hidden relative">
          <div className="absolute inset-0 rounded-xl border border-border/50 shadow-sm bg-card overflow-hidden flex animate-in fade-in duration-500 m-6">
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
                                {chats.map((contact) => (
                                  <div 
                                    key={contact.id} 
                                    className="flex items-center justify-between p-2 rounded-lg hover:bg-secondary/50 transition-colors cursor-pointer group"
                                    onClick={() => toggleChatForFolder(contact.id)}
                                  >
                                    <div className="flex items-center gap-3">
                                      <Avatar className={cn("h-8 w-8", contact.type === "group" && "rounded-lg")}>
                                        <AvatarFallback className="text-[10px]">{getChatName(contact).substring(0,2).toUpperCase()}</AvatarFallback>
                                      </Avatar>
                                      <span className="text-sm font-medium">{getChatName(contact)}</span>
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
                          <Button onClick={handleCreateFolder} disabled={!newFolderName.trim()}>
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
                                {allUsers.filter(u => u.id !== currentUser?.id).map((member) => (
                                  <div 
                                    key={member.id} 
                                    className="flex items-center justify-between p-2 rounded-lg hover:bg-secondary/50 transition-colors cursor-pointer group"
                                    onClick={() => toggleMember(member.id)}
                                  >
                                    <div className="flex items-center gap-3">
                                      <Avatar className="h-8 w-8">
                                        <AvatarImage src={member.avatar || undefined} />
                                        <AvatarFallback className="text-[10px]">{member.username.substring(0,2).toUpperCase()}</AvatarFallback>
                                      </Avatar>
                                      <div className="flex flex-col">
                                        <span className="text-sm font-medium">{member.username}</span>
                                        <span className="text-[10px] text-muted-foreground">{member.email}</span>
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
                          <Button onClick={handleCreateGroup} disabled={!newGroupName.trim()}>
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
                {chatsLoading ? (
                  <div className="p-8 text-center text-muted-foreground">Загрузка чатов...</div>
                ) : filteredContacts.map(contact => (
                  <div 
                    key={contact.id} 
                    onClick={() => setActiveChatId(contact.id)}
                    className={cn(
                      "flex gap-3 p-4 cursor-pointer transition-all border-b border-border/40 last:border-0 relative",
                      activeChatId === contact.id ? "bg-primary/5" : "hover:bg-secondary/50"
                    )}
                  >
                      {activeChatId === contact.id && (
                        <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary" />
                      )}
                      <div className="relative">
                        <Avatar className={cn(contact.type === "group" && "rounded-lg")}>
                          <AvatarImage src={getChatAvatar(contact) || undefined} />
                          <AvatarFallback className={cn(contact.type === "group" ? "bg-indigo-500/10 text-indigo-600 font-bold" : "bg-secondary text-muted-foreground")}>
                            {contact.type === "group" ? <Users className="w-4 h-4" /> : getChatName(contact).substring(0,2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        {contact.online && (
                          <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 border-2 border-background rounded-full shadow-sm" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-baseline mb-1">
                          <h4 className={cn("text-sm truncate", activeChatId === contact.id ? "font-bold text-foreground" : "font-medium text-foreground/80")}>
                            {getChatName(contact)}
                          </h4>
                          <span className="text-[10px] text-muted-foreground whitespace-nowrap">{formatTime(contact.lastMessage?.createdAt || contact.updatedAt)}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <p className="text-xs text-muted-foreground truncate max-w-[140px] leading-relaxed">
                            {contact.lastMessage?.content || "Нет сообщений"}
                          </p>
                          {contact.unread && contact.unread > 0 && (
                            <span className="bg-primary text-primary-foreground text-[10px] font-bold h-5 min-w-[1.25rem] px-1 rounded-full flex items-center justify-center shadow-sm shadow-primary/20">
                              {contact.unread}
                            </span>
                          )}
                        </div>
                      </div>
                  </div>
                ))}
                {!chatsLoading && filteredContacts.length === 0 && (
                  <div className="p-8 text-center">
                    <p className="text-xs text-muted-foreground italic">Пока нет чатов</p>
                  </div>
                )}
              </ScrollArea>
            </div>

            {/* Chat Area */}
            <div className="flex-1 flex flex-col bg-secondary/10 relative overflow-hidden">
              {activeChat ? (
                <>
                  {/* Header */}
                  <div className="h-16 px-6 border-b border-border flex items-center justify-between bg-card/80 backdrop-blur-md sticky top-0 z-10">
                      <div className="flex items-center gap-3">
                        <Avatar className={cn(activeChat.type === "group" && "rounded-lg")}>
                          <AvatarImage src={getChatAvatar(activeChat) || undefined} />
                          <AvatarFallback className={cn(activeChat.type === "group" ? "bg-indigo-500/10 text-indigo-600 font-bold" : "bg-secondary")}>
                            {activeChat.type === "group" ? <Users className="w-5 h-5" /> : getChatName(activeChat).substring(0,2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <h3 className="font-bold text-sm leading-none mb-1.5">{getChatName(activeChat)}</h3>
                          {activeChat.type === "group" ? (
                            <span className="text-[11px] text-muted-foreground font-medium flex items-center gap-1">
                              <Users className="w-3 h-3" /> {activeChat.participants.length} участников
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
                        
                        <Dialog open={isInfoOpen} onOpenChange={(open) => {
                          setIsInfoOpen(open);
                          if (open) {
                            setEditName(getChatName(activeChat));
                            setEditDescription(activeChat.description || "");
                            setEditAvatar(getChatAvatar(activeChat) || null);
                          }
                        }}>
                          <DialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-9 w-9 hover:bg-secondary rounded-lg">
                              <Info className="w-4 h-4 text-muted-foreground" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="sm:max-w-[425px]">
                            <Tabs defaultValue="info" className="w-full">
                              <TabsList className="grid w-full grid-cols-2">
                                <TabsTrigger value="info">Информация</TabsTrigger>
                                <TabsTrigger value="settings" disabled={activeChat.type !== "group"}>Управление</TabsTrigger>
                              </TabsList>
                              
                              <TabsContent value="info">
                                <DialogHeader>
                                  <DialogTitle>Информация о {activeChat.type === "group" ? "группе" : "собеседнике"}</DialogTitle>
                                </DialogHeader>
                                <div className="py-6 flex flex-col items-center">
                                   <Avatar className={cn("w-24 h-24 mb-4 shadow-lg", activeChat.type === "group" && "rounded-2xl")}>
                                     <AvatarImage src={getChatAvatar(activeChat) || undefined} />
                                     <AvatarFallback className="text-2xl bg-primary/10 text-primary font-bold">
                                       {getChatName(activeChat).substring(0,2).toUpperCase()}
                                     </AvatarFallback>
                                   </Avatar>
                                   <h2 className="text-xl font-bold mb-1">{getChatName(activeChat)}</h2>
                                   <p className="text-sm text-muted-foreground mb-6 text-center px-4 italic">
                                     {activeChat.type === "group" ? activeChat.description : "Личный чат для приватного общения."}
                                   </p>
                                   
                                   <div className="w-full space-y-4">
                                      {activeChat.type === "group" && (
                                        <div className="space-y-2">
                                           <Label className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest px-1">Участники ({activeChat.participants.length})</Label>
                                           <div className="grid grid-cols-1 gap-1 max-h-[160px] overflow-y-auto pr-2 no-scrollbar">
                                              {activeChat.participants.map((member, i) => (
                                                 <div key={i} className="flex items-center justify-between p-2 rounded-lg hover:bg-secondary/20 transition-colors group/member">
                                                    <div className="flex items-center gap-3">
                                                       <Avatar className="w-6 h-6">
                                                          <AvatarImage src={member.avatar || undefined} />
                                                          <AvatarFallback className="text-[8px]">{member.username.substring(0,2).toUpperCase()}</AvatarFallback>
                                                       </Avatar>
                                                       <span className="text-xs font-medium">{member.username}</span>
                                                    </div>
                                                 </div>
                                              ))}
                                           </div>
                                        </div>
                                      )}

                                      {activeChat.type !== "group" && (
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
                              </TabsContent>
                              
                              <TabsContent value="settings">
                                <DialogHeader>
                                  <DialogTitle>Настройки группы</DialogTitle>
                                  <DialogDescription>Измените визуальные и текстовые параметры группы.</DialogDescription>
                                </DialogHeader>
                                <div className="space-y-6 py-6">
                                   <div className="flex flex-col items-center gap-4">
                                      <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                                         <Avatar className="w-24 h-24 rounded-2xl shadow-lg border-2 border-primary/20 transition-all group-hover:opacity-80">
                                           <AvatarImage src={editAvatar || undefined} />
                                           <AvatarFallback className="text-2xl bg-primary/10 text-primary font-bold">
                                             {editName.substring(0,2).toUpperCase()}
                                           </AvatarFallback>
                                         </Avatar>
                                         <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/20 rounded-2xl">
                                            <Camera className="w-8 h-8 text-white" />
                                         </div>
                                         <input 
                                           type="file" 
                                           ref={fileInputRef} 
                                           className="hidden" 
                                           accept="image/*"
                                           onChange={handleAvatarUpload}
                                         />
                                      </div>
                                   </div>
                                   <div className="space-y-4">
                                      <div className="space-y-2">
                                        <Label htmlFor="edit-name">Название группы</Label>
                                        <Input 
                                          id="edit-name" 
                                          value={editName}
                                          onChange={(e) => setEditName(e.target.value)}
                                          className="bg-secondary/30 border-none h-10"
                                        />
                                      </div>
                                      <div className="space-y-2">
                                        <Label htmlFor="edit-desc">Описание</Label>
                                        <Textarea 
                                          id="edit-desc"
                                          value={editDescription}
                                          onChange={(e) => setEditDescription(e.target.value)}
                                          className="bg-secondary/30 border-none resize-none min-h-[100px]"
                                        />
                                      </div>
                                   </div>
                                </div>
                                <DialogFooter>
                                  <Button variant="outline" onClick={() => setIsInfoOpen(false)}>Отмена</Button>
                                  <Button>Сохранить изменения</Button>
                                </DialogFooter>
                              </TabsContent>
                            </Tabs>
                          </DialogContent>
                        </Dialog>
                      </div>
                  </div>

                  {/* Messages Area */}
                  <ScrollArea className="flex-1 p-6" ref={scrollRef}>
                      <div className="space-y-6 max-w-4xl mx-auto">
                        {messagesLoading ? (
                          <div className="text-center text-muted-foreground">Загрузка сообщений...</div>
                        ) : messages.map((msg, i) => {
                          const sender = activeChat.participants.find(p => p.id === msg.senderId);
                          const isMe = msg.senderId === currentUser?.id;
                          
                          return (
                            <div key={msg.id} className={cn("flex flex-col max-w-[80%]", isMe ? "ml-auto items-end" : "items-start")}>
                              <div className="flex items-center gap-2 mb-1.5">
                                {!isMe && <span className="text-[10px] font-bold text-muted-foreground">{sender?.username}</span>}
                                <span className="text-[9px] font-medium text-muted-foreground/50">{formatTime(msg.createdAt)}</span>
                              </div>
                              <div className={cn(
                                "px-4 py-2.5 rounded-2xl text-sm shadow-sm transition-all hover:shadow-md",
                                isMe ? "bg-primary text-primary-foreground rounded-tr-none" : "bg-card text-foreground border border-border/50 rounded-tl-none"
                              )}>
                                {msg.content}
                              </div>
                            </div>
                          );
                        })}
                        {messages.length === 0 && !messagesLoading && (
                          <div className="text-center text-muted-foreground py-8">Нет сообщений. Напишите первым!</div>
                        )}
                      </div>
                  </ScrollArea>

                  {/* Input Area */}
                  <div className="p-4 border-t border-border bg-card/80 backdrop-blur-md shrink-0">
                      <div className="flex items-center gap-2 max-w-4xl mx-auto bg-secondary/30 p-2 rounded-2xl border border-border/50 focus-within:bg-background focus-within:ring-2 focus-within:ring-primary/20 transition-all">
                        <div className="flex gap-1">
                          <input 
                            type="file" 
                            ref={fileInputRef} 
                            className="hidden" 
                            onChange={(e) => toast.success(`Файл "${e.target.files?.[0]?.name}" прикреплен`)}
                          />
                          <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl hover:bg-secondary" onClick={() => fileInputRef.current?.click()}>
                            <Paperclip className="w-4 h-4 text-muted-foreground" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl hover:bg-secondary">
                            <Smile className="w-4 h-4 text-muted-foreground" />
                          </Button>
                        </div>
                        <Input 
                          placeholder="Напишите сообщение..." 
                          className="border-none bg-transparent h-9 focus-visible:ring-0 text-sm"
                          value={messageInput}
                          onChange={(e) => setMessageInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") handleSendMessage();
                          }}
                        />
                        <Button 
                          size="icon" 
                          className="h-9 w-9 rounded-xl shadow-lg shadow-primary/20 bg-primary hover:bg-primary/90"
                          onClick={handleSendMessage}
                          disabled={!messageInput.trim() || sendMessageMutation.isPending}
                        >
                          <Send className="w-4 h-4" />
                        </Button>
                      </div>
                  </div>
                </>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground gap-4">
                  <MessageSquare className="w-12 h-12 opacity-20" />
                  <p>Выберите чат для начала общения</p>
                </div>
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="rooms" className="flex-1 m-0 focus-visible:outline-none overflow-y-auto">
          <TeamRooms />
        </TabsContent>
      </Tabs>

      <ScheduleCallDialog 
        open={scheduleOpen} 
        onOpenChange={setScheduleOpen} 
        contactName={activeChat?.name || "Участник"}
        onSchedule={handleScheduleCall}
      />
    </Layout>
  );
}
