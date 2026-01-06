import { Layout } from "@/components/layout/Layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Settings, Users, Shield, Bell, CreditCard, Puzzle } from "lucide-react";
import { RolesManagement } from "@/components/settings/RolesManagement";

export default function SettingsPage() {
  const sections = [
    { id: "general", label: "Общие", icon: Settings, description: "Настройки проекта и основные параметры" },
    { id: "team", label: "Команда", icon: Users, description: "Управление участниками и приглашениями" },
    { id: "roles", label: "Роли", icon: Shield, description: "Настройка прав доступа и уровней разрешений" },
    { id: "notifications", label: "Уведомления", icon: Bell, description: "Настройка системных оповещений" },
    { id: "billing", label: "Оплата", icon: CreditCard, description: "Тарифный план и финансовые документы" },
    { id: "integrations", label: "Интеграции", icon: Puzzle, description: "Подключение внешних сервисов и API" },
  ];

  return (
    <Layout>
      <div className="p-8 max-w-6xl mx-auto space-y-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight mb-2">Управление проектом</h1>
          <p className="text-muted-foreground">
            Центральный узел для всех административных настроек и конфигураций
          </p>
        </div>

        <Tabs defaultValue="general" className="space-y-6">
          <TabsList className="bg-muted/50 p-1 rounded-xl w-full justify-start overflow-x-auto">
            {sections.map((section) => (
              <TabsTrigger 
                key={section.id} 
                value={section.id}
                className="gap-2 px-4 py-2 rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm"
              >
                <section.icon className="w-4 h-4" />
                {section.label}
              </TabsTrigger>
            ))}
          </TabsList>

          {sections.map((section) => (
            <TabsContent key={section.id} value={section.id} className="focus-visible:outline-none">
              {section.id === "roles" ? (
                <RolesManagement />
              ) : (
                <Card className="border-sidebar-border/50 shadow-sm">
                  <CardHeader>
                    <div className="flex items-center gap-3 mb-1">
                      <div className="p-2 rounded-lg bg-primary/10 text-primary">
                        <section.icon className="w-5 h-5" />
                      </div>
                      <div>
                        <CardTitle>{section.label}</CardTitle>
                        <CardDescription>{section.description}</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="p-12 border-2 border-dashed rounded-xl flex flex-col items-center justify-center text-center space-y-4">
                      <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center text-muted-foreground">
                        <section.icon className="w-6 h-6" />
                      </div>
                      <div className="max-w-xs">
                        <p className="font-medium">Раздел {section.label} находится в разработке</p>
                        <p className="text-sm text-muted-foreground mt-1">
                          Скоро здесь появятся расширенные инструменты управления вашим проектом.
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </Layout>
  );
}
