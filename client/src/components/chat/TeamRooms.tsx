import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Users, Video, PhoneCall, Clock, ShieldCheck, MessageSquare } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";

const departments = [
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
  return (
    <div className="p-6 space-y-6 animate-in fade-in duration-500 h-full">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Командные залы</h2>
        <p className="text-muted-foreground mt-1">
          Постоянные виртуальные комнаты отделов для мгновенных встреч.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 pb-20">
        {departments.map((dept) => (
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
                  <div className="text-[10px] text-muted-foreground font-medium italic italic">
                    Зал пуст
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <Button 
                  size="sm" 
                  className="gap-2 font-bold shadow-lg shadow-primary/10"
                  onClick={() => toast.success(`Вход в зал: ${dept.name}`)}
                >
                  <Video className="w-3.5 h-3.5" />
                  Войти
                </Button>
                <Button 
                  size="sm" 
                  variant="outline" 
                  className="gap-2 font-bold border-border/60"
                  onClick={() => toast.success(`Уведомление отправлено команде ${dept.name}`)}
                >
                  <PhoneCall className="w-3.5 h-3.5" />
                  Позвать
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}

        {/* Add New Room Card */}
        <Card className="border-2 border-dashed border-border/40 bg-transparent hover:bg-secondary/20 transition-all cursor-pointer flex flex-col items-center justify-center p-6 text-center space-y-3 group">
          <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary transition-colors">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <p className="font-bold text-sm">Создать новый зал</p>
            <p className="text-xs text-muted-foreground mt-1">Для временных или новых рабочих групп</p>
          </div>
        </Card>
      </div>

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
