import { useState, useRef, useEffect, useMemo } from "react";
import { Virtuoso } from "react-virtuoso";
import { Layout } from "@/components/layout/Layout";
import { useNotifications } from "@/hooks/use-notifications";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search, Phone, Video, Info, Paperclip, Smile, Send, Check, Camera, X, MessageSquare, MoreVertical, Edit, Trash, Plus, FolderPlus, UserPlus, Folder, Users, Clock } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { io, Socket } from "socket.io-client";
import { CallOverlay } from "@/components/call/CallOverlay";

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
  const [, ] = useLocation();
  const queryClient = useQueryClient();
  const { notify, requestPermission } = useNotifications();
  const socketRef = useRef<Socket | null>(null);
  const [typingUsers, setTypingUsers] = useState<Record<string, string[]>>({});
  
  const { data: currentUser } = useQuery<DBUser>({
    queryKey: ["/api/user"],
  });

  const { data: chats = [], isLoading: chatsLoading } = useQuery<Contact[]>({
    queryKey: ["/api/chats"],
  });

  const { data: allUsers = [] } = useQuery<DBUser[]>({
    queryKey: ["/api/users"],
  });

  const { data: folders = [] } = useQuery<ChatFolder[]>({
    queryKey: ["/api/chat-folders"],
  });

  const { data: calls = [], isLoading: callsLoading } = useQuery<any[]>({
    queryKey: ["/api/calls"],
  });

  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  
  const activeChat = chats.find(c => c.id === activeChatId) || chats[0];

  const { data: messages = [], isLoading: messagesLoading } = useQuery<Message[]>({
    queryKey: ["/api/chats", activeChatId, "messages"],
    enabled: !!activeChatId,
  });

  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");

  const updateMessageMutation = useMutation({
    mutationFn: async ({ id, content }: { id: string, content: string }) => {
      const res = await apiRequest("PATCH", `/api/messages/${id}`, { content });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/chats", activeChatId, "messages"] });
      setEditingMessageId(null);
      setEditContent("");
      toast.success("Сообщение обновлено");
    }
  });

  const deleteMessageMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/messages/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/chats", activeChatId, "messages"] });
      toast.success("Сообщение удалено");
    }
  });

  const markReadMutation = useMutation({
    mutationFn: async (chatId: string) => {
      await apiRequest("POST", `/api/chats/${chatId}/read`);
    }
  });

  const sendMessageMutation = useMutation({
    mutationFn: async (data: { chatId: string, content: string, attachments?: any[] }) => {
      const res = await apiRequest("POST", `/api/chats/${data.chatId}/messages`, { content: data.content, attachments: data.attachments });
      return res.json();
    },
    onMutate: async (newMessage) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ["/api/chats", activeChatId, "messages"] });
      
      // Snapshot previous value
      const previousMessages = queryClient.getQueryData([ "/api/chats", activeChatId, "messages" ]);
      
      // Optimistically add new message
      const optimisticMessage = {
        id: `temp-${Date.now()}`,
        chatId: newMessage.chatId,
        senderId: currentUser?.id,
        content: newMessage.content,
        attachments: newMessage.attachments || [],
        createdAt: new Date().toISOString(),
        sender: {
          id: currentUser?.id,
          username: currentUser?.username,
          firstName: currentUser?.firstName,
          lastName: currentUser?.lastName,
          avatar: currentUser?.avatar
        }
      };
      
      queryClient.setQueryData([ "/api/chats", activeChatId, "messages" ], (old: any[]) => {
        return old ? [...old, optimisticMessage] : [optimisticMessage];
      });
      
      return { previousMessages };
    },
    onError: (err, newMessage, context) => {
      // Rollback on error
      queryClient.setQueryData([ "/api/chats", activeChatId, "messages" ], context?.previousMessages);
      toast.error("Не удалось отправить сообщение");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/chats", activeChatId, "messages"] });
      setMessageInput("");
      setAttachments([]);
    }
  });

  const updateChatMutation = useMutation({
    mutationFn: async ({ id, ...data }: { id: string, name?: string, description?: string, avatar?: string | null, participantIds?: string[] }) => {
      const res = await apiRequest("PATCH", `/api/chats/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/chats"] });
      setIsInfoOpen(false);
      toast.success("Настройки чата обновлены");
    }
  });

  const deleteFolderMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/chat-folders/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/chat-folders"] });
      toast.success("Папка удалена");
    }
  });

  const deleteChatMutation = useMutation({
    mutationFn: async (chatId: string) => {
      await apiRequest("DELETE", `/api/chats/${chatId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/chats"] });
      toast.success("Чат удалён");
    }
  });

  // Socket.io initialization
  useEffect(() => {
    if (currentUser && !socketRef.current) {
      console.log("Initializing socket for user:", currentUser.id);
      const socket = io({
        query: { userId: currentUser.id }
      });
      socketRef.current = socket;

      socket.on("connect", () => {
        console.log("Socket connected with ID:", socket.id);
      });

      socket.on("connect_error", (error) => {
        console.error("Socket connection error:", error);
      });

      socket.on("new-message", (message: Message) => {
        // Skip if this message was just sent by us (already added via optimistic update)
        queryClient.setQueryData(["/api/chats", message.chatId, "messages"], (old: Message[] = []) => {
          // Check if message already exists by ID or by content+sender+time (for optimistic updates)
          if (old.some(m => m.id === message.id)) return old;
          
          // Check for optimistic duplicate (same content, same sender, recent)
          const isDuplicate = old.some(m => 
            m.id?.startsWith('temp-') && 
            m.content === message.content && 
            m.senderId === message.senderId
          );
          
          if (isDuplicate) return old;
          return [...old, message];
        });
        
        // Update chat list for last message
        queryClient.invalidateQueries({ queryKey: ["/api/chats"] });
        
        // Notify if not active chat
        // We use a ref-like check for activeChatId to avoid dependency cycle
        // But since this is inside useEffect, we can't easily get the latest activeChatId without adding it to deps
        // or using a ref for activeChatId.
      });

      socket.on("message-updated", () => {
        queryClient.invalidateQueries({ queryKey: ["/api/chats"] });
        // We'll invalidate messages in the join-chat effect or via another mechanism
      });

      socket.on("message-deleted", ({ messageId, chatId }: { messageId: string, chatId: string }) => {
        queryClient.setQueryData(["/api/chats", chatId, "messages"], (old: Message[] = []) => {
          return old.filter(m => m.id !== messageId);
        });
        queryClient.invalidateQueries({ queryKey: ["/api/chats"] });
      });

      socket.on("messages-read", () => {
        queryClient.invalidateQueries({ queryKey: ["/api/chats"] });
      });

      socket.on("chat-update", () => {
        queryClient.invalidateQueries({ queryKey: ["/api/chats"] });
      });

      socket.on("push-notification", (data: { title: string, body: string, url: string }) => {
        notify(data.title, {
          body: data.body,
          data: data.url
        });
      });

      socket.on("user-typing", (data: { chatId: string, username: string }) => {
        setTypingUsers(prev => {
          const current = prev[data.chatId] || [];
          if (current.includes(data.username)) return prev;
          return { ...prev, [data.chatId]: [...current, data.username] };
        });

        setTimeout(() => {
          setTypingUsers(prev => {
            const current = prev[data.chatId] || [];
            return { ...prev, [data.chatId]: current.filter(u => u !== data.username) };
          });
        }, 3000);
      });

      socket.on("call-made", (data: { from: string, name: string, signal: any, type: 'audio' | 'video', chatId: string, callId?: string }) => {
        console.log("INCOMING CALL RECEIVED!", data);
        setActiveCall({
          isReceiving: true,
          from: data.from,
          name: data.name,
          signal: data.signal,
          type: data.type,
          chatId: data.chatId,
          callId: data.callId
        });
      });

      socket.on("call-answered", (data) => {
        console.log("CALL ANSWERED by recipient:", data);
      });

      socket.on("call-rejected", () => {
        console.log("CALL REJECTED by recipient");
      });

      return () => {
        console.log("Disconnecting socket");
        socket.disconnect();
        socketRef.current = null;
      };
    }
  }, [currentUser, queryClient, notify]);

  // Handle active chat specific socket events
  useEffect(() => {
    if (!socketRef.current || !activeChatId) return;

    const socket = socketRef.current;
    socket.emit("join-chat", activeChatId);

    const handleNewMessage = (message: Message) => {
      if (message.chatId === activeChatId) {
        markReadMutation.mutate(message.chatId);
      } else {
        notify("Новое сообщение", { body: message.content });
      }
    };

    const handleMessageUpdated = () => {
      queryClient.invalidateQueries({ queryKey: ["/api/chats", activeChatId, "messages"] });
    };

    const handleMessagesRead = () => {
      queryClient.invalidateQueries({ queryKey: ["/api/chats", activeChatId, "messages"] });
    };

    socket.on("new-message", handleNewMessage);
    socket.on("message-updated", handleMessageUpdated);
    socket.on("messages-read", handleMessagesRead);

    return () => {
      socket.emit("leave-chat", activeChatId);
      socket.off("new-message", handleNewMessage);
      socket.off("message-updated", handleMessageUpdated);
      socket.off("messages-read", handleMessagesRead);
    };
  }, [activeChatId, queryClient, notify]);

  useEffect(() => {
    if (chats.length > 0 && !activeChatId) {
      setActiveChatId(chats[0].id);
    }
  }, [chats, activeChatId]);

  useEffect(() => {
    requestPermission();
  }, [requestPermission]);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [messageInput, setMessageInput] = useState("");
  const [uploading, setUploading] = useState(false);
  const [attachments, setAttachments] = useState<{ url: string, name: string, type: string, size: number }[]>([]);
  
  // Reset message input when switching chats
  useEffect(() => {
    setMessageInput("");
    setAttachments([]);
  }, [activeChatId]);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  
  const [isCreateGroupOpen, setIsCreateGroupOpen] = useState(false);
  const [isCreateChatOpen, setIsCreateChatOpen] = useState(false);
  const [isCreateFolderOpen, setIsCreateFolderOpen] = useState(false);
  const [isInfoOpen, setIsInfoOpen] = useState(false);
  
  const [newGroupName, setNewGroupName] = useState("");
  const [newFolderName, setNewFolderName] = useState("");
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [selectedChatIdsForFolder, setSelectedChatIdsForFolder] = useState<string[]>([]);
  const [activeFolderId, setActiveFolderId] = useState<string | null>(null);
  
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editAvatar, setEditAvatar] = useState<string | null>(null);
  const [selectedGroupParticipants, setSelectedGroupParticipants] = useState<string[]>([]);
  
  const [activeCall, setActiveCall] = useState<any>(null);
  const [outboundCall, setOutboundCall] = useState<any>(null);
  
  const [searchQuery, setSearchQuery] = useState("");
  const [messageSearchQuery, setMessageSearchQuery] = useState("");
  const [selectedImage, setSelectedImage] = useState<{ url: string; name: string } | null>(null);

  const getChatName = (chat: Contact | undefined) => {
    if (!chat) return "Чат";
    if (chat.type === "group") return chat.name || "Группа";
    const otherParticipant = chat.participants?.find(p => p && p.id !== currentUser?.id);
    return otherParticipant?.username || "Чат";
  };

  const getChatAvatar = (chat: Contact | undefined) => {
    if (!chat) return undefined;
    if (chat.type === "group") return chat.avatar || undefined;
    const otherParticipant = chat.participants?.find(p => p && p.id !== currentUser?.id);
    return otherParticipant?.avatar || undefined;
  };

  const formatTime = (dateStr?: string | Date | null) => {
    if (!dateStr) return "";
    const date = new Date(dateStr);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const handleCreateDirectChat = async (userId: string) => {
    try {
      const res = await apiRequest("POST", "/api/chats", {
        type: "direct",
        participantIds: [currentUser?.id, userId]
      });
      const chat = await res.json();
      queryClient.invalidateQueries({ queryKey: ["/api/chats"] });
      setActiveChatId(chat.id);
      setIsCreateChatOpen(false);
    } catch (err) {
      toast.error("Ошибка при создании чата");
    }
  };

  const handleCreateGroup = async () => {
    if (!newGroupName.trim()) return;
    try {
      const res = await apiRequest("POST", "/api/chats", {
        type: "group",
        name: newGroupName,
        participantIds: [currentUser?.id, ...selectedMembers]
      });
      const chat = await res.json();
      queryClient.invalidateQueries({ queryKey: ["/api/chats"] });
      setActiveChatId(chat.id);
      setIsCreateGroupOpen(false);
      setNewGroupName("");
      setSelectedMembers([]);
      toast.success("Группа создана");
    } catch (err) {
      toast.error("Ошибка при создании группы");
    }
  };

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return;
    try {
      await apiRequest("POST", "/api/chat-folders", {
        name: newFolderName,
        chatIds: selectedChatIdsForFolder
      });
      queryClient.invalidateQueries({ queryKey: ["/api/chat-folders"] });
      setIsCreateFolderOpen(false);
      setNewFolderName("");
      setSelectedChatIdsForFolder([]);
      toast.success("Папка создана");
    } catch (err) {
      toast.error("Ошибка при создании папки");
    }
  };

  const toggleChatForFolder = (chatId: string) => {
    setSelectedChatIdsForFolder(prev => 
      prev.includes(chatId) ? prev.filter(id => id !== chatId) : [...prev, chatId]
    );
  };

  const toggleMember = (userId: string) => {
    setSelectedMembers(prev => 
      prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
    );
  };

  const handleSendMessage = () => {
    if (!activeChatId || (!messageInput.trim() && attachments.length === 0)) return;
    
    // If editing, update the message
    if (editingMessageId) {
      updateMessageMutation.mutate({
        id: editingMessageId,
        content: messageInput
      }, {
        onSuccess: () => {
          setEditingMessageId(null);
          setMessageInput("");
        }
      });
      return;
    }
    
    // Otherwise, send new message
    sendMessageMutation.mutate({
      chatId: activeChatId,
      content: messageInput,
      attachments: attachments.length > 0 ? attachments : undefined
    });
  };

  const handleTyping = () => {
    if (!socketRef.current || !activeChatId || !currentUser) return;
    socketRef.current.emit("typing", {
      chatId: activeChatId,
      username: currentUser.username
    });
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, isAvatar = false) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      
      if (isAvatar) {
        setEditAvatar(data.url);
      } else {
        setAttachments(prev => [...prev, {
          url: data.url,
          name: file.name,
          type: file.type,
          size: file.size
        }]);
      }
    } catch (err) {
      toast.error("Ошибка при загрузке файла");
    } finally {
      setUploading(false);
    }
  };

  const handleSaveEdit = () => {
    if (!activeChat) return;
    updateChatMutation.mutate({
      id: activeChat.id,
      name: editName,
      description: editDescription,
      avatar: editAvatar,
      participantIds: selectedGroupParticipants
    });
  };

  const startCall = (type: 'audio' | 'video') => {
    if (!activeChat || !currentUser) return;
    
    const callData = {
      from: currentUser.id,
      name: currentUser.username,
      type,
      chatId: activeChat.id,
      to: activeChat.type === 'direct' 
        ? activeChat.participants.find(p => p.id !== currentUser.id)?.id 
        : undefined
    };
    
    setOutboundCall(callData);
  };

  const handleScheduleCall = async (callData: any) => {
    try {
      await apiRequest("POST", "/api/calls/schedule", {
        ...callData,
        chatId: activeChatId
      });
      toast.success("Звонок запланирован");
    } catch (err) {
      toast.error("Ошибка при планировании звонка");
    }
  };

  const filteredContacts = chats.filter(chat => {
    const name = getChatName(chat).toLowerCase();
    const inActiveFolder = !activeFolderId || folders.find(f => f.id === activeFolderId)?.chatIds.includes(chat.id);
    return name.includes(searchQuery.toLowerCase()) && inActiveFolder;
  });

  const filteredMessages = messages.filter(msg => 
    msg.content.toLowerCase().includes(messageSearchQuery.toLowerCase())
  );

  return (
    <Layout>
      <Tabs defaultValue="chats" className="h-[calc(100vh-8rem)] flex flex-col">
        <div className="px-6 py-2 border-b border-border/50 bg-card/50 backdrop-blur-sm shrink-0">
          <TabsList className="bg-muted/50 p-1 rounded-xl">
            <TabsTrigger value="chats" className="gap-2 px-6 rounded-lg">
              <MessageSquare className="w-4 h-4" />
              Чаты
            </TabsTrigger>
            <TabsTrigger value="calls" className="gap-2 px-6 rounded-lg">
              <Phone className="w-4 h-4" />
              Звонки
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
                    <Dialog open={isCreateChatOpen} onOpenChange={(open) => { setIsCreateChatOpen(open); if (!open) setSearchQuery(""); }}>
                      <DialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg hover:bg-primary/10 hover:text-primary transition-colors" title="Начать чат">
                          <MessageSquare className="w-4 h-4 text-foreground" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="sm:max-w-[425px]">
                        <DialogHeader>
                          <DialogTitle>Начать чат</DialogTitle>
                          <DialogDescription>Выберите пользователя, чтобы начать общение.</DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                          <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <Input 
                              placeholder="Поиск пользователей..." 
                              className="pl-9 bg-secondary/30"
                              value={searchQuery}
                              onChange={(e) => setSearchQuery(e.target.value)}
                            />
                          </div>
                          <ScrollArea className="h-[300px] pr-4">
                            <div className="space-y-2">
                              {allUsers
                                .filter(u => {
                                  if (u.id === currentUser?.id) return false;
                                  const query = searchQuery.toLowerCase();
                                  const fullName = `${u.firstName || ''} ${u.lastName || ''}`.trim().toLowerCase();
                                  return u.username.toLowerCase().includes(query) || 
                                         fullName.includes(query) || 
                                         (u.email && u.email.toLowerCase().includes(query)) ||
                                         (u.firstName && u.firstName.toLowerCase().includes(query)) ||
                                         (u.lastName && u.lastName.toLowerCase().includes(query));
                                })
                                .map((user) => (
                                  <div 
                                    key={user.id} 
                                    className="flex items-center justify-between p-3 rounded-xl hover:bg-secondary/50 transition-all cursor-pointer group border border-transparent hover:border-border/50"
                                    onClick={() => handleCreateDirectChat(user.id)}
                                  >
                                    <div className="flex items-center gap-3">
                                      <Avatar className="h-10 w-10 ring-2 ring-transparent group-hover:ring-primary/20 transition-all">
                                        <AvatarImage src={user.avatar || undefined} />
                                        <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold">
                                          {user.username.substring(0,2).toUpperCase()}
                                        </AvatarFallback>
                                      </Avatar>
                                      <div className="flex flex-col">
                                        <span className="text-sm font-semibold text-foreground/90">
                                          {user.firstName && user.lastName ? `${user.firstName} ${user.lastName}` : user.username}
                                        </span>
                                        <span className="text-[10px] text-muted-foreground">{user.email || 'Пользователь TeamSync'}</span>
                                      </div>
                                    </div>
                                    <Button size="sm" variant="ghost" className="opacity-0 group-hover:opacity-100 transition-opacity rounded-full h-8 w-8 p-0">
                                      <Plus className="w-4 h-4 text-primary" />
                                    </Button>
                                  </div>
                                ))}
                                {allUsers.filter(u => {
                                  if (u.id === currentUser?.id) return false;
                                  const query = searchQuery.toLowerCase();
                                  const fullName = `${u.firstName || ''} ${u.lastName || ''}`.trim().toLowerCase();
                                  return u.username.toLowerCase().includes(query) || 
                                         fullName.includes(query) || 
                                         (u.email && u.email.toLowerCase().includes(query)) ||
                                         (u.firstName && u.firstName.toLowerCase().includes(query)) ||
                                         (u.lastName && u.lastName.toLowerCase().includes(query));
                                }).length === 0 && searchQuery && (
                                  <div className="text-center py-8 text-muted-foreground">
                                    <p className="text-sm">Пользователи не найдены</p>
                                    <p className="text-xs mt-1">Попробуйте изменить запрос</p>
                                  </div>
                                )}
                            </div>
                          </ScrollArea>
                        </div>
                      </DialogContent>
                    </Dialog>

                    <Dialog open={isCreateFolderOpen} onOpenChange={setIsCreateFolderOpen}>
                      <DialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg hover:bg-primary/10 hover:text-primary transition-colors" title="Создать папку">
                          <FolderPlus className="w-4 h-4 text-foreground" />
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
                                {chats.map((contact) => {
                                  const contactName = getChatName(contact);
                                  return (
                                    <div 
                                      key={contact.id} 
                                      className="flex items-center justify-between p-2 rounded-lg hover:bg-secondary/50 transition-colors cursor-pointer group"
                                      onClick={() => toggleChatForFolder(contact.id)}
                                    >
                                      <div className="flex items-center gap-3">
                                        <Avatar className={cn("h-8 w-8", contact.type === "group" && "rounded-lg")}>
                                          <AvatarFallback className="text-[10px]">{contactName.substring(0,2).toUpperCase()}</AvatarFallback>
                                        </Avatar>
                                        <span className="text-sm font-medium">{contactName}</span>
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
                                  );
                                })}
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

                    <Dialog open={isCreateChatOpen} onOpenChange={setIsCreateChatOpen}>
                      <DialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg hover:bg-primary/10 hover:text-primary transition-colors" title="Начать чат">
                          <UserPlus className="w-4 h-4 text-foreground" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="sm:max-w-[425px]">
                        <DialogHeader>
                          <DialogTitle>Начать новый чат</DialogTitle>
                          <DialogDescription>Выберите пользователя, чтобы начать диалог.</DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                          <ScrollArea className="h-[300px] pr-4">
                            <div className="space-y-2">
                              {allUsers.filter(u => u.id !== currentUser?.id).map((user) => (
                                <div 
                                  key={user.id} 
                                  className="flex items-center gap-3 p-3 rounded-xl hover:bg-secondary/50 transition-colors cursor-pointer group"
                                  onClick={() => handleCreateDirectChat(user.id)}
                                >
                                  <Avatar className="h-10 w-10">
                                    <AvatarImage src={user.avatar || undefined} />
                                    <AvatarFallback>{user.username.substring(0,2).toUpperCase()}</AvatarFallback>
                                  </Avatar>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-semibold truncate group-hover:text-primary transition-colors">{user.username}</p>
                                    <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                                  </div>
                                  <Send className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                                </div>
                              ))}
                            </div>
                          </ScrollArea>
                        </div>
                      </DialogContent>
                    </Dialog>

                    <Dialog open={isCreateGroupOpen} onOpenChange={setIsCreateGroupOpen}>
                      <DialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg hover:bg-primary/10 hover:text-primary transition-colors" title="Создать группу">
                          <Plus className="w-4 h-4 text-foreground" />
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

                <div className="relative mb-4">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input 
                    placeholder="Поиск чатов..." 
                    className="pl-9 h-9 rounded-xl bg-secondary/30 border-none focus-visible:ring-1 focus-visible:ring-primary/20"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
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
                      <DropdownMenu key={folder.id}>
                        <DropdownMenuTrigger asChild>
                          <Button 
                            variant={activeFolderId === folder.id ? "default" : "secondary"} 
                            size="sm" 
                            className="h-7 text-[10px] uppercase tracking-wider font-bold px-3 rounded-full shrink-0 flex items-center gap-1.5"
                            onClick={() => setActiveFolderId(folder.id)}
                          >
                            <Folder className="w-3 h-3" />
                            {folder.name}
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start">
                          <DropdownMenuItem 
                            className="text-destructive focus:text-destructive"
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteFolderMutation.mutate(folder.id);
                            }}
                          >
                            <Trash className="w-4 h-4 mr-2" />
                            Удалить папку
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
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
                ) : filteredContacts.map(contact => {
                  const contactName = getChatName(contact);
                  return (
                  <div 
                    key={contact.id} 
                    onClick={() => setActiveChatId(contact.id)}
                    className={cn(
                      "flex gap-3 p-4 cursor-pointer transition-all border-b border-border/40 last:border-0 relative group",
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
                            {contact.type === "group" ? <Users className="w-4 h-4" /> : contactName.substring(0,2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        {contact.online && (
                          <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 border-2 border-background rounded-full shadow-sm" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-baseline mb-1">
                          <h4 className={cn("text-sm truncate", activeChatId === contact.id ? "font-bold text-foreground" : "font-medium text-foreground/80")}>
                            {contactName}
                          </h4>
                          <span className="text-[10px] text-muted-foreground whitespace-nowrap">{formatTime(contact.lastMessage?.createdAt || contact.updatedAt)}</span>
                        </div>
                      <div className="flex justify-between items-center">
                          <p className="text-xs text-muted-foreground truncate max-w-[140px] leading-relaxed">
                            {contact.lastMessage?.content || "Нет сообщений"}
                          </p>
                          <div className="flex items-center gap-1">
                            {contact.unread && contact.unread > 0 && (
                              <span className="bg-primary text-primary-foreground text-[10px] font-bold h-5 min-w-[1.25rem] px-1 rounded-full flex items-center justify-center shadow-sm shadow-primary/20">
                                {contact.unread}
                              </span>
                            )}
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity hover:text-rose-500"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (confirm("Вы уверены, что хотите удалить этот чат?")) {
                                  deleteChatMutation.mutate(contact.id);
                                }
                              }}
                            >
                              <X className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>
                      </div>
                  </div>
                  );
                })}
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
                        <div className="relative mr-2">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground" />
                          <Input 
                            placeholder="Поиск..." 
                            className="pl-8 h-8 w-32 text-[10px] rounded-lg bg-secondary/30 border-none focus-visible:ring-1 focus-visible:ring-primary/20"
                            value={messageSearchQuery}
                            onChange={(e) => setMessageSearchQuery(e.target.value)}
                          />
                        </div>
                        <Button variant="ghost" size="icon" className="h-9 w-9 hover:bg-secondary rounded-lg" onClick={() => startCall('audio')} title="Аудио звонок">
                          <Phone className="w-4 h-4 text-muted-foreground" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-9 w-9 hover:bg-secondary rounded-lg" onClick={() => startCall('video')} title="Видео звонок">
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
                            setSelectedGroupParticipants(activeChat.participants.map((p: any) => p.id));
                          }
                        }}>
                          <DialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-9 w-9 hover:bg-secondary rounded-lg">
                              <Info className="w-4 h-4 text-muted-foreground" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="sm:max-w-[425px]">
                            <DialogHeader className="sr-only">
                              <DialogTitle>Информация и настройки чата</DialogTitle>
                              <DialogDescription>Управление настройками и просмотр информации о текущем чате.</DialogDescription>
                            </DialogHeader>
                            <Tabs defaultValue="info" className="w-full">
                              <TabsList className="grid w-full grid-cols-2">
                                <TabsTrigger value="info">Информация</TabsTrigger>
                                <TabsTrigger value="settings" disabled={activeChat.type !== "group"}>Управление</TabsTrigger>
                              </TabsList>
                              
                              <TabsContent value="info">
                                <DialogHeader>
                                  <DialogTitle>Информация о {activeChat.type === "group" ? "группе" : "собеседнике"}</DialogTitle>
                                  <DialogDescription>Просмотрите детальную информацию о чате и его участниках.</DialogDescription>
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
                                      <div className="relative group cursor-pointer" onClick={() => avatarInputRef.current?.click()}>
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
                                           ref={avatarInputRef} 
                                           className="hidden" 
                                           accept="image/*"
                                           onChange={(e) => handleFileUpload(e, true)}
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
                                      <div className="space-y-2">
                                        <Label>Участники</Label>
                                        <ScrollArea className="h-[200px] rounded-xl border border-border/50 p-2">
                                          <div className="space-y-1">
                                            {allUsers.map((user) => (
                                              <div 
                                                key={user.id} 
                                                className="flex items-center justify-between p-2 rounded-lg hover:bg-secondary/50 cursor-pointer transition-colors"
                                                onClick={() => {
                                                  setSelectedGroupParticipants(prev => 
                                                    prev.includes(user.id) ? prev.filter(id => id !== user.id) : [...prev, user.id]
                                                  );
                                                }}
                                              >
                                                <div className="flex items-center gap-2">
                                                  <Avatar className="w-6 h-6">
                                                    <AvatarImage src={user.avatar || undefined} />
                                                    <AvatarFallback>{user.username.substring(0,2).toUpperCase()}</AvatarFallback>
                                                  </Avatar>
                                                  <span className="text-xs">{user.username}</span>
                                                </div>
                                                <div className={cn(
                                                  "w-4 h-4 rounded-full border flex items-center justify-center transition-all",
                                                  selectedGroupParticipants.includes(user.id) ? "bg-primary border-primary text-primary-foreground" : "border-muted-foreground/30"
                                                )}>
                                                  {selectedGroupParticipants.includes(user.id) && <Check className="w-2.5 h-2.5" />}
                                                </div>
                                              </div>
                                            ))}
                                          </div>
                                        </ScrollArea>
                                      </div>
                                   </div>
                                </div>
                                <DialogFooter>
                                  <Button variant="outline" onClick={() => setIsInfoOpen(false)}>Отмена</Button>
                                  <Button onClick={handleSaveEdit} disabled={updateChatMutation.isPending}>Сохранить изменения</Button>
                                </DialogFooter>
                              </TabsContent>
                            </Tabs>
                          </DialogContent>
                        </Dialog>
                      </div>
                  </div>

                  {/* Messages Area */}
                  <div className="flex-1 relative overflow-hidden">
                    {messagesLoading ? (
                      <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">Загрузка сообщений...</div>
                    ) : (
                      <Virtuoso
                        style={{ height: "100%" }}
                        data={filteredMessages}
                        initialTopMostItemIndex={Math.max(0, filteredMessages.length - 1)}
                        followOutput="smooth"
                        itemContent={(index, msg) => {
                          const sender = activeChat.participants.find(p => p.id === msg.senderId);
                          const isMe = msg.senderId === currentUser?.id;
                          
                          return (
                            <div className="px-6 py-2">
                              <div key={msg.id} className={cn(
                                "flex flex-col gap-1 mb-4 animate-in fade-in slide-in-from-bottom-2 duration-300 group",
                                isMe ? "ml-auto items-end" : "items-start"
                              )}>
                                <div className="flex items-center gap-2 px-1">
                                  {!isMe && <span className="text-[10px] font-bold text-muted-foreground">{sender?.username}</span>}
                                  <span className="text-[10px] text-muted-foreground opacity-50">
                                    {formatTime(msg.createdAt)}
                                  </span>
                                  {isMe && (
                                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                      <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                          <Button variant="ghost" size="icon" className="h-4 w-4 rounded-full">
                                            <MoreVertical className="w-3 h-3" />
                                          </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                          <DropdownMenuItem onClick={() => {
                                            setEditingMessageId(msg.id);
                                            setMessageInput(msg.content);
                                          }}>
                                            <Edit className="w-3 h-3 mr-2" />
                                            Изменить
                                          </DropdownMenuItem>
                                          <DropdownMenuItem 
                                            className="text-destructive"
                                            onClick={() => deleteMessageMutation.mutate(msg.id)}
                                          >
                                            <Trash className="w-3 h-3 mr-2" />
                                            Удалить
                                          </DropdownMenuItem>
                                        </DropdownMenuContent>
                                      </DropdownMenu>
                                    </div>
                                  )}
                                </div>
                                <div className={cn(
                                  "max-w-[80%] px-4 py-2.5 rounded-2xl text-sm shadow-sm transition-all hover:shadow-md relative",
                                  isMe ? "bg-primary text-primary-foreground rounded-tr-none" : "bg-card text-foreground border border-border/50 rounded-tl-none"
                                )}>
                                  <>
                                    {msg.content}
                                    {isMe && editingMessageId !== msg.id && (
                                      <div className="absolute bottom-1 right-2 flex gap-0.5">
                                        <Check className={cn("w-3 h-3", (msg as any).isRead ? "text-blue-400" : "opacity-30")} />
                                        {(msg as any).isRead && <Check className="w-3 h-3 -ml-2 text-blue-400" />}
                                      </div>
                                    )}
                                  </>
                                  
                                  {Array.isArray(msg.attachments) && msg.attachments.length > 0 && (
                                    <div className="mt-2 space-y-1">
                                      {(msg.attachments as any[]).map((file: any, idx: number) => {
                                        const isImage = file.type?.startsWith('image/') || /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(file.name || file.url);
                                        
                                        if (isImage) {
                                          return (
                                            <div 
                                              key={idx}
                                              className="cursor-pointer rounded-lg overflow-hidden max-w-[200px]"
                                              onClick={() => setSelectedImage({ url: file.url, name: file.name })}
                                            >
                                              <img 
                                                src={file.url} 
                                                alt={file.name}
                                                className="w-full h-auto max-h-[150px] object-cover hover:opacity-90 transition-opacity"
                                              />
                                            </div>
                                          );
                                        }
                                        
                                        return (
                                          <a 
                                            key={idx} 
                                            href={file.url} 
                                            target="_blank" 
                                            rel="noopener noreferrer"
                                            className={cn(
                                              "flex items-center gap-2 p-2 rounded-lg text-[10px] hover:bg-black/5 transition-colors",
                                              isMe ? "bg-white/10" : "bg-secondary/50"
                                            )}
                                          >
                                            <Paperclip className="w-3 h-3 shrink-0" />
                                            <span className="truncate">{file.name}</span>
                                            <span className="opacity-50 shrink-0">({(file.size / 1024).toFixed(1)} KB)</span>
                                          </a>
                                        );
                                      })}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        }}
                      />
                    )}
                    {messages.length === 0 && !messagesLoading && (
                      <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">Нет сообщений. Напишите первым!</div>
                    )}
                  </div>

                  {/* Input Area */}
                  <div className="p-4 border-t border-border bg-card/80 backdrop-blur-md shrink-0">
                      {activeChatId && typingUsers[activeChatId]?.length > 0 && (
                        <div className="max-w-4xl mx-auto mb-2 px-2 text-[10px] text-muted-foreground animate-pulse flex items-center gap-2">
                          <div className="flex gap-1">
                            <span className="w-1 h-1 bg-muted-foreground rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                            <span className="w-1 h-1 bg-muted-foreground rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                            <span className="w-1 h-1 bg-muted-foreground rounded-full animate-bounce"></span>
                          </div>
                          {typingUsers[activeChatId].join(", ")} {typingUsers[activeChatId].length === 1 ? "печатает..." : "печатают..."}
                        </div>
                      )}
                      <div className="flex items-center gap-2 max-w-4xl mx-auto bg-secondary/30 p-2 rounded-2xl border border-border/50 focus-within:bg-background focus-within:ring-2 focus-within:ring-primary/20 transition-all">
                        <div className="flex gap-1">
                          <input 
                            type="file" 
                            ref={fileInputRef} 
                            className="hidden" 
                            onChange={handleFileUpload}
                          />
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-9 w-9 rounded-xl hover:bg-secondary" 
                            onClick={() => fileInputRef.current?.click()}
                            disabled={uploading}
                          >
                            <Paperclip className={cn("w-4 h-4 text-muted-foreground", uploading && "animate-pulse")} />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl hover:bg-secondary">
                            <Smile className="w-4 h-4 text-muted-foreground" />
                          </Button>
                        </div>
                        <div className="flex items-center gap-2 flex-1">
                          {editingMessageId && (
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="text-xs text-muted-foreground hover:text-destructive h-8"
                              onClick={() => {
                                setEditingMessageId(null);
                                setMessageInput("");
                              }}
                            >
                              Отмена
                            </Button>
                          )}
                          <Input 
                            placeholder={editingMessageId ? "Редактирование сообщения..." : "Напишите сообщение..."} 
                            className="border-none bg-transparent h-9 focus-visible:ring-0 text-sm"
                            value={messageInput}
                            onChange={(e) => {
                              setMessageInput(e.target.value);
                              handleTyping();
                            }}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") handleSendMessage();
                            }}
                          />
                        </div>
                        <Button 
                          size="icon" 
                          className="h-9 w-9 rounded-xl shadow-lg shadow-primary/20 bg-primary hover:bg-primary/90"
                          onClick={handleSendMessage}
                          disabled={(!messageInput.trim() && attachments.length === 0) || sendMessageMutation.isPending || uploading}
                        >
                          <Send className="w-4 h-4" />
                        </Button>
                      </div>
                      
                      {attachments.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-2 max-w-4xl mx-auto">
                          {attachments.map((file, idx) => (
                            <div key={idx} className="flex items-center gap-2 bg-primary/10 text-primary text-[10px] px-2 py-1 rounded-lg border border-primary/20 group relative">
                              <span className="truncate max-w-[100px]">{file.name}</span>
                              <button 
                                onClick={() => setAttachments(prev => prev.filter((_, i) => i !== idx))}
                                className="hover:text-destructive transition-colors"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
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

        <TabsContent value="calls" className="flex-1 m-0 focus-visible:outline-none overflow-hidden relative">
          <div className="absolute inset-0 rounded-xl border border-border/50 shadow-sm bg-card overflow-hidden flex flex-col animate-in fade-in duration-500 m-6">
            <div className="p-6 border-b border-border bg-card/50">
              <h2 className="text-xl font-bold">История звонков</h2>
              <p className="text-sm text-muted-foreground">Список ваших последних аудио и видео вызовов</p>
            </div>
            <ScrollArea className="flex-1">
              <div className="p-6">
                {callsLoading ? (
                  <div className="flex items-center justify-center py-12 text-muted-foreground">Загрузка истории...</div>
                ) : calls.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-20 text-muted-foreground bg-secondary/10 rounded-2xl border-2 border-dashed border-border/50">
                    <Phone className="w-12 h-12 mb-4 opacity-20" />
                    <p className="font-medium">История звонков пуста</p>
                    <p className="text-xs">Ваши будущие звонки появятся здесь</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {calls.map((call) => {
                      const isOutgoing = call.callerId === currentUser?.id;
                      const otherUser = isOutgoing 
                        ? allUsers.find(u => u.id === call.receiverId)
                        : allUsers.find(u => u.id === call.callerId);
                      
                      return (
                        <div key={call.id} className="flex items-center justify-between p-4 rounded-xl bg-secondary/20 hover:bg-secondary/30 transition-all border border-transparent hover:border-border/50 group">
                          <div className="flex items-center gap-4">
                            <div className={cn(
                              "w-10 h-10 rounded-full flex items-center justify-center shadow-sm",
                              call.status === 'missed' ? "bg-rose-500/10 text-rose-500" : "bg-emerald-500/10 text-emerald-500"
                            )}>
                              {call.type === 'video' ? <Video className="w-5 h-5" /> : <Phone className="w-5 h-5" />}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-sm">
                                  {otherUser 
                                    ? (otherUser.firstName && otherUser.lastName ? `${otherUser.firstName} ${otherUser.lastName}` : otherUser.username)
                                    : "Пользователь"}
                                </span>
                                <Badge variant="outline" className="text-[10px] h-4 px-1 bg-background/50">
                                  {isOutgoing ? "Исходящий" : "Входящий"}
                                </Badge>
                              </div>
                              <div className="flex items-center gap-2 text-[10px] text-muted-foreground mt-0.5">
                                <span>{new Date(call.startedAt!).toLocaleString()}</span>
                                {call.duration && (
                                  <>
                                    <span className="w-1 h-1 bg-muted-foreground/30 rounded-full" />
                                    <span>{Math.floor(call.duration / 60)}м {call.duration % 60}с</span>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-4">
                            <span className={cn(
                              "text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md",
                              call.status === 'completed' ? "text-emerald-500 bg-emerald-500/10" :
                              call.status === 'missed' ? "text-rose-500 bg-rose-500/10" :
                              call.status === 'rejected' ? "text-slate-500 bg-slate-500/10" : "text-amber-500 bg-amber-500/10"
                            )}>
                              {call.status === 'completed' ? "Завершен" :
                               call.status === 'missed' ? "Пропущен" :
                               call.status === 'rejected' ? "Отклонен" : "Занят"}
                            </span>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-8 w-8 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={() => {
                                setActiveChatId(call.chatId);
                                // switch to chats tab
                                const chatsTrigger = document.querySelector('[value="chats"]') as HTMLButtonElement;
                                chatsTrigger?.click();
                              }}
                            >
                              <MessageSquare className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </ScrollArea>
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

      {(activeCall || outboundCall) && currentUser && socketRef.current && (
        <CallOverlay 
          socket={socketRef.current}
          currentUser={currentUser}
          activeCall={activeCall}
          outboundCall={outboundCall}
          onClose={() => {
            setActiveCall(null);
            setOutboundCall(null);
          }}
        />
      )}

      {/* Image Viewer Modal */}
      <Dialog open={!!selectedImage} onOpenChange={() => setSelectedImage(null)}>
        <DialogContent className="max-w-[90vw] max-h-[90vh] p-0 bg-transparent border-none overflow-hidden">
          <div className="relative flex items-center justify-center min-h-[50vh]">
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-2 right-2 z-10 bg-black/50 hover:bg-black/70 text-white rounded-full h-10 w-10"
              onClick={() => setSelectedImage(null)}
            >
              <X className="w-5 h-5" />
            </Button>
            {selectedImage && (
              <>
                <img 
                  src={selectedImage.url} 
                  alt={selectedImage.name}
                  className="max-w-full max-h-[85vh] object-contain"
                />
                <div className="absolute bottom-2 left-1/2 -translate-x-1/2 bg-black/60 text-white text-xs px-3 py-1 rounded-full">
                  {selectedImage.name}
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
