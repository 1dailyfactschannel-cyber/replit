import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Users, Video, PhoneCall, Clock, ShieldCheck, MessageSquare, Mic, MicOff, VideoOff, PhoneOff, Settings2, Share2, Plus } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

const INITIAL_DEPARTMENTS = [
  {
    id: "marketing",
    name: "Маркетинг",
    description: "Обсуждение рекламных кампаний и стратегий продвижения",
    members: 12,
    activeNow: 3,
    color: "bg-purple-500",
    participants: [
      { name: "Анна К.", avatar: "https://i.pravatar.cc/150?u=anna" },
      { name: "Дмитрий С.", avatar: "https://i.pravatar.cc/150?u=dima" },
      { name: "Елена В.", avatar: "https://i.pravatar.cc/150?u=elena" }
    ]
  },
  {
    id: "dev",
    name: "Разработка",
    description: "Технические летучки, ревью архитектуры и планирование спринтов",
    members: 24,
    activeNow: 5,
    color: "bg-blue-500",
    participants: [
      { name: "Иван П.", avatar: "https://i.pravatar.cc/150?u=ivan" },
      { name: "Сергей М.", avatar: "https://i.pravatar.cc/150?u=sergey" },
      { name: "Марина Л.", avatar: "https://i.pravatar.cc/150?u=marina" },
      { name: "Алексей Б.", avatar: "https://i.pravatar.cc/150?u=alex" },
      { name: "Ольга Н.", avatar: "https://i.pravatar.cc/150?u=olga" }
    ]
  },
  {
    id: "sales",
    name: "Продажи",
    description: "Переговоры с клиентами, разбор кейсов и отчетность",
    members: 18,
    activeNow: 0,
    color: "bg-emerald-500",
    participants: []
  },
  {
    id: "hr",
    name: "HR и Культура",
    description: "Собеседования, онбординг и внутренние мероприятия",
    members: 8,
    activeNow: 2,
    color: "bg-rose-500",
    participants: [
      { name: "Татьяна Р.", avatar: "https://i.pravatar.cc/150?u=tanya" },
      { name: "Николай К.", avatar: "https://i.pravatar.cc/150?u=kolya" }
    ]
  }
];

export function TeamRooms() {
  const [rooms, setRooms] = useState(INITIAL_DEPARTMENTS);
  const [activeRoom, setActiveRoom] = useState<typeof INITIAL_DEPARTMENTS[0] | null>(null);
  const [isJoined, setIsJoined] = useState(false);
  const [isMicOn, setIsMicOn] = useState(true);
  const [isVideoOn, setIsVideoOn] = useState(true);
  
  // Create room state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newRoomData, setNewRoomData] = useState({
    name: "",
    description: ""
  });

  const handleJoin = (dept: typeof INITIAL_DEPARTMENTS[0]) => {
    setActiveRoom(dept);
    setIsJoined(true);
    toast.success(`Вы присоединились к залу: ${dept.name}`);
  };

  const handleLeave = () => {
    setIsJoined(false);
    setActiveRoom(null);
    toast.info("Вы вышли из командного зала");
  };

  const handleCreateRoom = () => {
    if (!newRoomData.name) {
      toast.error("Пожалуйста, введите название зала");
      return;
    }

    const newRoom = {
      id: Math.random().toString(36).substr(2, 9),
      name: newRoomData.name,
      description: newRoomData.description || "Новый командный зал",
      members: 1,
      activeNow: 0,
      color: "bg-orange-500",
      participants: []
    };

    setRooms([...rooms, newRoom]);
    setIsCreateModalOpen(false);
    setNewRoomData({ name: "", description: "" });
    toast.success(`Зал "${newRoom.name}" успешно создан!`);
  };

  return (
    <div className="p-6 space-y-6 animate-in fade-in duration-500 h-full relative">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Командные залы</h2>
        <p className="text-muted-foreground mt-1">
          Постоянные виртуальные комнаты отделов для мгновенных встреч.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 pb-20">
        {rooms.map((dept) => (
          <Card key={dept.id} className="border-border/50 bg-card/50 backdrop-blur-sm hover:shadow-md transition-all group overflow-hidden">
            <CardHeader className="pb-3 relative">
              <div className={`absolute top-0 left-0 w-1 h-full ${dept.color}`} />
              <div className="flex justify-between items-start">
                <div className="space-y-1">
                  <CardTitle className="text-lg flex items-center gap-2">
                    {dept.name}
                    {dept.activeNow > 0 && (
                      <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-[10px] h-4">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1 animate-pulse" />
                        Идет встреча
                      </Badge>
                    )}
                  </CardTitle>
                  <CardDescription className="line-clamp-2 text-xs">
                    {dept.description}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <div className="flex items-center gap-1.5 font-medium">
                  <Users className="w-3.5 h-3.5" />
                  {dept.members} участников
                </div>
                <div className="flex items-center gap-1.5 font-medium">
                  <Clock className="w-3.5 h-3.5" />
                  Доступен 24/7
                </div>
              </div>

              <div className="flex -space-x-2 overflow-hidden h-8 items-center">
                {dept.participants.map((p, i) => (
                  <Avatar key={i} className="w-7 h-7 border-2 border-background ring-1 ring-border/30">
                    <AvatarImage src={p.avatar} />
                    <AvatarFallback className="text-[10px]">{p.name[0]}</AvatarFallback>
                  </Avatar>
                ))}
                {dept.activeNow > 0 && (
                  <div className="pl-3 text-[10px] text-muted-foreground font-medium italic">
                    {dept.activeNow} в сети
                  </div>
                )}
                {dept.activeNow === 0 && (
                  <div className="text-[10px] text-muted-foreground font-medium italic">
                    Зал пуст
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <Button 
                  size="sm" 
                  className="gap-2 font-bold shadow-lg shadow-primary/10"
                  onClick={() => handleJoin(dept)}
                >
                  <Video className="w-3.5 h-3.5" />
                  Войти
                </Button>
                <Button 
                  size="sm" 
                  variant="outline" 
                  className="gap-2 font-bold border-border/60 hover:bg-primary/5 hover:text-primary transition-colors"
                  onClick={() => toast.success(`Уведомление отправлено команде ${dept.name}`)}
                >
                  <PhoneCall className="w-3.5 h-3.5" />
                  Позвать
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}

        <Card 
          className="border-2 border-dashed border-border/40 bg-transparent hover:bg-secondary/20 transition-all cursor-pointer flex flex-col items-center justify-center p-6 text-center space-y-3 group"
          onClick={() => setIsCreateModalOpen(true)}
        >
          <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary transition-colors">
            <Plus className="w-6 h-6" />
          </div>
          <div>
            <p className="font-bold text-sm">Создать новый зал</p>
            <p className="text-xs text-muted-foreground mt-1">Для временных или новых рабочих групп</p>
          </div>
        </Card>
      </div>

      {/* Create Room Modal */}
      <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Создать новый зал</DialogTitle>
            <DialogDescription>
              Создайте постоянную виртуальную комнату для вашей команды или проекта.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Название зала</Label>
              <Input 
                id="name" 
                placeholder="Например: Архитектура API" 
                value={newRoomData.name}
                onChange={(e) => setNewRoomData({...newRoomData, name: e.target.value})}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="description">Описание (необязательно)</Label>
              <Textarea 
                id="description" 
                placeholder="О чем будут встречи в этом зале?" 
                value={newRoomData.description}
                onChange={(e) => setNewRoomData({...newRoomData, description: e.target.value})}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateModalOpen(false)}>Отмена</Button>
            <Button onClick={handleCreateRoom} disabled={!newRoomData.name}>Создать зал</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>


      <Dialog open={isJoined} onOpenChange={(open) => !open && handleLeave()}>
        <DialogContent className="max-w-4xl h-[80vh] p-0 overflow-hidden bg-slate-950 border-slate-800 flex flex-col">
          <div className="p-4 border-b border-white/10 flex items-center justify-between bg-slate-900/50 backdrop-blur-md">
            <div className="flex items-center gap-3">
              <div className={`w-2 h-2 rounded-full bg-emerald-500 animate-pulse`} />
              <h3 className="text-white font-bold">{activeRoom?.name}: Видеовстреча</h3>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-white/60 border-white/10 bg-white/5">
                <Users className="w-3 h-3 mr-1" /> {activeRoom?.activeNow ? activeRoom.activeNow + 1 : 1}
              </Badge>
            </div>
          </div>

          <div className="flex-1 p-6 overflow-hidden">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 h-full content-start overflow-y-auto pr-2 no-scrollbar">
              {/* My Camera */}
              <div className="aspect-video bg-slate-800 rounded-xl relative overflow-hidden group shadow-2xl ring-1 ring-white/10">
                {!isVideoOn ? (
                  <div className="absolute inset-0 flex items-center justify-center bg-slate-900">
                    <Avatar className="w-16 h-16 border-2 border-primary">
                      <AvatarFallback className="text-xl">Я</AvatarFallback>
                    </Avatar>
                  </div>
                ) : (
                  <div className="absolute inset-0 bg-slate-700 flex items-center justify-center italic text-white/20 text-xs">
                    Ваша камера (демо)
                  </div>
                )}
                <div className="absolute bottom-3 left-3 flex items-center gap-2">
                  <Badge className="bg-black/40 backdrop-blur-md border-white/10 text-[10px] py-0 px-2 h-5">Вы</Badge>
                  {!isMicOn && <div className="bg-rose-500/80 p-1 rounded-full"><MicOff className="w-3 h-3 text-white" /></div>}
                </div>
              </div>

              {/* Participants */}
              {activeRoom?.participants.map((p, i) => (
                <div key={i} className="aspect-video bg-slate-900 rounded-xl relative overflow-hidden group ring-1 ring-white/10">
                  <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-slate-800 to-slate-900">
                    <Avatar className="w-12 h-12 border-2 border-white/10">
                      <AvatarImage src={p.avatar} />
                      <AvatarFallback>{p.name[0]}</AvatarFallback>
                    </Avatar>
                  </div>
                  <div className="absolute bottom-3 left-3 flex items-center gap-2">
                    <Badge className="bg-black/40 backdrop-blur-md border-white/10 text-[10px] py-0 px-2 h-5">{p.name}</Badge>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="p-6 bg-slate-900/80 backdrop-blur-xl border-t border-white/10 flex items-center justify-center gap-4">
            <Button 
              size="icon" 
              variant={isMicOn ? "secondary" : "destructive"} 
              className="w-12 h-12 rounded-full shadow-lg transition-transform active:scale-95"
              onClick={() => setIsMicOn(!isMicOn)}
            >
              {isMicOn ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
            </Button>
            <Button 
              size="icon" 
              variant={isVideoOn ? "secondary" : "destructive"} 
              className="w-12 h-12 rounded-full shadow-lg transition-transform active:scale-95"
              onClick={() => setIsVideoOn(!isVideoOn)}
            >
              {isVideoOn ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
            </Button>
            <Button size="icon" variant="secondary" className="w-12 h-12 rounded-full shadow-lg transition-transform active:scale-95">
              <Share2 className="w-5 h-5" />
            </Button>
            <Button size="icon" variant="secondary" className="w-12 h-12 rounded-full shadow-lg transition-transform active:scale-95">
              <Settings2 className="w-5 h-5" />
            </Button>
            <Separator orientation="vertical" className="h-8 bg-white/10" />
            <Button 
              variant="destructive" 
              className="px-6 rounded-full font-bold gap-2 h-12 shadow-lg shadow-rose-500/20 transition-transform active:scale-95"
              onClick={handleLeave}
            >
              <PhoneOff className="w-5 h-5" />
              Выйти
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <div className="mt-8 p-4 bg-primary/5 rounded-xl border border-primary/10 flex items-start gap-4 sticky bottom-6 z-10 backdrop-blur-sm">
        <div className="p-2 rounded-lg bg-primary/10 text-primary shrink-0">
          <ShieldCheck className="w-5 h-5" />
        </div>
        <div>
          <h4 className="font-bold text-sm">Безопасность и доступ</h4>
          <p className="text-xs text-muted-foreground mt-1">
            Командные залы доступны только участникам соответствующих отделов. Гости могут присоединиться только по прямому приглашению от модератора зала.
          </p>
        </div>
      </div>
    </div>
  );
}

