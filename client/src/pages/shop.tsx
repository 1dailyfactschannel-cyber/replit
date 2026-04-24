import { Layout } from "@/components/layout/Layout";
import { useState } from "react";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Coins, ShoppingBag, Search, Filter, Minus, Plus, Loader2, Package } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { cn } from "@/lib/utils";

interface ShopItem {
  id: string;
  name: string;
  description: string | null;
  cost: number;
  image: string | null;
  category: string | null;
  stock: number | null;
  isActive: boolean | null;
}

interface UserPoints {
  balance: number;
  totalEarned: number;
  totalSpent: number;
}

export default function ShopPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [quantities, setQuantities] = useState<Record<string, number>>({});

  const { data: items, isLoading: itemsLoading } = useQuery<ShopItem[]>({
    queryKey: ["/api/shop/items"],
    staleTime: 1000 * 60,
  });

  const { data: userPoints, isLoading: pointsLoading } = useQuery<UserPoints>({
    queryKey: ["/api/users/me/points"],
    staleTime: 1000 * 30,
  });

  const purchaseMutation = useMutation({
    mutationFn: async ({ itemId, quantity }: { itemId: string; quantity: number }) => {
      const res = await apiRequest("POST", "/api/shop/purchase", { itemId, quantity });
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Заявка отправлена", description: "Ваша заявка на покупку отправлена на рассмотрение." });
      queryClient.invalidateQueries({ queryKey: ["/api/users/me/points"] });
      queryClient.invalidateQueries({ queryKey: ["/api/shop/purchases"] });
    },
    onError: (error: any) => {
      toast({
        title: "Ошибка",
        description: error.message || "Не удалось оформить заявку",
        variant: "destructive",
      });
    },
  });

  const handleBuy = (item: ShopItem) => {
    const qty = quantities[item.id] || 1;
    if (userPoints && userPoints.balance < item.cost * qty) {
      toast({
        title: "Недостаточно баллов",
        description: `У вас ${userPoints.balance} баллов, а нужно ${item.cost * qty}.`,
        variant: "destructive",
      });
      return;
    }
    purchaseMutation.mutate({ itemId: item.id, quantity: qty });
  };

  const updateQuantity = (id: string, delta: number, max: number) => {
    setQuantities(prev => {
      const current = prev[id] || 1;
      const next = Math.max(1, Math.min(max, current + delta));
      return { ...prev, [id]: next };
    });
  };

  const categories: string[] = Array.from(new Set(items?.map(i => i.category).filter((c): c is string => !!c) || []));

  const filteredItems = items?.filter(item => {
    if (!item.isActive) return false;
    const matchesSearch =
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.category?.toLowerCase() || "").includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory ? item.category === selectedCategory : true;
    return matchesSearch && matchesCategory;
  }) || [];

  const isLoading = itemsLoading || pointsLoading;

  return (
    <Layout>
      <div className="p-6 space-y-8 animate-in fade-in duration-500">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Магазин мерча</h1>
            <p className="text-muted-foreground mt-1">Тратьте заработанные баллы на крутые призы.</p>
          </div>
          <div className="flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full border border-primary/20">
            <Coins className="w-5 h-5 text-amber-500" />
            <span className="font-bold">
              {pointsLoading ? "..." : `${userPoints?.balance ?? 0} баллов`}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-4 flex-wrap">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Поиск товаров..."
              className="pl-9 bg-secondary/30 border-border/50"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          {categories.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap">
              <Button
                variant={selectedCategory === null ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedCategory(null)}
                className="text-xs"
              >
                Все
              </Button>
              {categories.map(cat => (
                <Button
                  key={cat}
                  variant={selectedCategory === cat ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedCategory(cat === selectedCategory ? null : cat)}
                  className="text-xs"
                >
                  {cat}
                </Button>
              ))}
            </div>
          )}
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center">
              <Package className="w-8 h-8 text-muted-foreground opacity-40" />
            </div>
            <div>
              <h3 className="font-medium text-muted-foreground">Товары не найдены</h3>
              <p className="text-sm text-muted-foreground mt-1">
                {items && items.length > 0
                  ? "Попробуйте изменить параметры поиска"
                  : "В магазине пока нет товаров. Загляните позже!"}
              </p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredItems.map((item) => {
              const qty = quantities[item.id] || 1;
              const totalCost = item.cost * qty;
              const canAfford = (userPoints?.balance ?? 0) >= totalCost;
              const inStock = (item.stock || 0) > 0;
              const disabled = purchaseMutation.isPending || !inStock || !canAfford;

              return (
                <Card key={item.id} className="border-border/50 overflow-hidden flex flex-col group hover:shadow-xl hover:shadow-primary/5 transition-all duration-300">
                  <div className="aspect-square overflow-hidden relative bg-muted/30">
                    {item.image ? (
                      <img
                        src={item.image}
                        alt={item.name}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Package className="w-12 h-12 text-muted-foreground/30" />
                      </div>
                    )}
                    {item.category && (
                      <Badge className="absolute top-3 right-3 bg-background/80 backdrop-blur-md text-foreground border-border/50">
                        {item.category}
                      </Badge>
                    )}
                  </div>
                  <CardHeader className="p-4 pb-2">
                    <CardTitle className="text-lg leading-tight">{item.name}</CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 pt-0 flex-1">
                    {item.description && (
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {item.description}
                      </p>
                    )}
                    <div className="mt-4 space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 font-bold text-lg">
                          <Coins className="w-4 h-4 text-amber-500" />
                          {totalCost.toLocaleString()}
                        </div>
                        <span className="text-xs text-muted-foreground">
                          В наличии: {item.stock ?? 0} шт.
                        </span>
                      </div>

                      <div className="flex items-center justify-between bg-secondary/30 rounded-lg p-1 border border-border/50">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => updateQuantity(item.id, -1, item.stock || 1)}
                          disabled={qty <= 1}
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </Button>
                        <span className="text-sm font-bold w-8 text-center">
                          {qty}
                        </span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => updateQuantity(item.id, 1, item.stock || 1)}
                          disabled={qty >= (item.stock || 1)}
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter className="p-4 pt-0">
                    <Button
                      className="w-full gap-2"
                      onClick={() => handleBuy(item)}
                      disabled={disabled}
                      variant={inStock && canAfford ? "default" : "outline"}
                    >
                      {purchaseMutation.isPending ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : !inStock ? (
                        <>
                          <Package className="w-4 h-4" />
                          Нет в наличии
                        </>
                      ) : !canAfford ? (
                        <>
                          <Coins className="w-4 h-4" />
                          Недостаточно баллов
                        </>
                      ) : (
                        <>
                          <ShoppingBag className="w-4 h-4" />
                          Купить
                        </>
                      )}
                    </Button>
                  </CardFooter>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </Layout>
  );
}
