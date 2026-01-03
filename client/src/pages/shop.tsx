import { Layout } from "@/components/layout/Layout";
import { useState } from "react";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Coins, ShoppingBag, CheckCircle2, Search, Filter } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";

interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  image: string;
  category: string;
  stock: number;
}

const products: Product[] = [
  {
    id: "1",
    name: "Худи TeamSync",
    description: "Удобное оверсайз худи с фирменным логотипом. 100% хлопок.",
    price: 3500,
    image: "https://images.unsplash.com/photo-1556821840-3a63f95609a7?q=80&w=400&h=400&auto=format&fit=crop",
    category: "Мерч",
    stock: 12
  },
  {
    id: "2",
    name: "Термокружка",
    description: "Сохраняет тепло до 12 часов. Идеально для офиса.",
    price: 1200,
    image: "https://images.unsplash.com/photo-1517254456976-ee8682099819?q=80&w=400&h=400&auto=format&fit=crop",
    category: "Аксессуары",
    stock: 25
  },
  {
    id: "3",
    name: "Сертификат OZON",
    description: "Номинал 2000 рублей. Придет на почту сразу после одобрения.",
    price: 2000,
    image: "https://images.unsplash.com/photo-1549463591-2439834430ad?q=80&w=400&h=400&auto=format&fit=crop",
    category: "Сертификаты",
    stock: 50
  },
  {
    id: "4",
    name: "Рюкзак для ноутбука",
    description: "Вмещает ноутбук до 16 дюймов. Влагостойкий материал.",
    price: 5000,
    image: "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?q=80&w=400&h=400&auto=format&fit=crop",
    category: "Мерч",
    stock: 5
  },
  {
    id: "5",
    name: "Беспроводная мышь",
    description: "Эргономичный дизайн, тихие клавиши. Подключение по Bluetooth.",
    price: 2500,
    image: "https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?q=80&w=400&h=400&auto=format&fit=crop",
    category: "Техника",
    stock: 8
  },
  {
    id: "6",
    name: "Коврик для йоги",
    description: "Нескользящее покрытие, толщина 6мм. Чехол в комплекте.",
    price: 1800,
    image: "https://images.unsplash.com/photo-1592432676556-382946c8b9cc?q=80&w=400&h=400&auto=format&fit=crop",
    category: "Здоровье",
    stock: 15
  }
];

export default function ShopPage() {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [purchasedIds, setPurchasedIds] = useState<string[]>([]);

  const handleBuy = (product: Product) => {
    toast({
      title: "Заявка отправлена",
      description: `Ваша заявка на "${product.name}" отправлена на одобрение.`,
    });
    setPurchasedIds([...purchasedIds, product.id]);
  };

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    p.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
            <span className="font-bold">1,250 баллов</span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input 
              placeholder="Поиск товаров..." 
              className="pl-9 bg-secondary/30 border-border/50" 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Button variant="outline" className="gap-2 border-border/50">
            <Filter className="w-4 h-4" />
            Категории
          </Button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredProducts.map((product) => (
            <Card key={product.id} className="border-border/50 overflow-hidden flex flex-col group hover:shadow-xl hover:shadow-primary/5 transition-all duration-300">
              <div className="aspect-square overflow-hidden relative">
                <img 
                  src={product.image} 
                  alt={product.name} 
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                />
                <Badge className="absolute top-3 right-3 bg-background/80 backdrop-blur-md text-foreground border-border/50">
                  {product.category}
                </Badge>
              </div>
              <CardHeader className="p-4 pb-2">
                <CardTitle className="text-lg leading-tight">{product.name}</CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-0 flex-1">
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {product.description}
                </p>
                <div className="mt-4 flex items-center justify-between">
                  <div className="flex items-center gap-1.5 font-bold text-lg">
                    <Coins className="w-4 h-4 text-amber-500" />
                    {product.price.toLocaleString()}
                  </div>
                  <span className="text-xs text-muted-foreground">В наличии: {product.stock} шт.</span>
                </div>
              </CardContent>
              <CardFooter className="p-4 pt-0">
                <Button 
                  className="w-full gap-2" 
                  disabled={purchasedIds.includes(product.id)}
                  onClick={() => handleBuy(product)}
                  variant={purchasedIds.includes(product.id) ? "outline" : "default"}
                >
                  {purchasedIds.includes(product.id) ? (
                    <>
                      <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                      Заявка подана
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
          ))}
        </div>
      </div>
    </Layout>
  );
}
