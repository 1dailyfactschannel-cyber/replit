import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search, Phone, Video, Info, Paperclip, Smile, Send } from "lucide-react";
import { Separator } from "@/components/ui/separator";

const contacts = [
  { id: 1, name: "Design Team", lastMsg: "Looks good to me!", time: "10:42 AM", unread: 2, avatar: null, group: true },
  { id: 2, name: "Jane Doe", lastMsg: "Can you review the PR?", time: "09:30 AM", unread: 0, avatar: "https://github.com/shadcn.png", online: true },
  { id: 3, name: "Marketing", lastMsg: "New campaign is live 🚀", time: "Yesterday", unread: 5, avatar: null, group: true },
  { id: 4, name: "Mike Ross", lastMsg: "Server is down...", time: "Yesterday", unread: 0, avatar: null, online: false },
  { id: 5, name: "Sarah Miller", lastMsg: "Thanks for the help!", time: "Mon", unread: 0, avatar: null, online: true },
];

const messages = [
  { id: 1, sender: "Jane Doe", content: "Hey team, how is the new design coming along?", time: "10:30 AM", me: false },
  { id: 2, sender: "Me", content: "Almost done! Just finishing up the dark mode variables.", time: "10:32 AM", me: true },
  { id: 3, sender: "Jane Doe", content: "Great! Can we schedule a review later?", time: "10:33 AM", me: false },
  { id: 4, sender: "Me", content: "Sure, how about 2 PM?", time: "10:35 AM", me: true },
  { id: 5, sender: "Jane Doe", content: "Works for me. Sending the invite now.", time: "10:36 AM", me: false },
  { id: 6, sender: "Me", content: "👍", time: "10:36 AM", me: true },
];

export default function Chat() {
  return (
    <Layout>
      <div className="h-[calc(100vh-8rem)] rounded-xl border border-border/50 shadow-sm bg-card overflow-hidden flex animate-in fade-in duration-500">
        
        {/* Sidebar List */}
        <div className="w-80 border-r border-border bg-card flex flex-col">
          <div className="p-4 border-b border-border">
            <h2 className="font-semibold mb-4">Messages</h2>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Search..." className="pl-9 bg-secondary/50 border-none" />
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
                  <AvatarFallback>JD</AvatarFallback>
                </Avatar>
                <div>
                   <h3 className="font-semibold text-sm">Jane Doe</h3>
                   <span className="flex items-center gap-1.5 text-xs text-emerald-500">
                     <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Online
                   </span>
                </div>
              </div>
              <div className="flex items-center gap-1">
                 <Button variant="ghost" size="icon"><Phone className="w-5 h-5 text-muted-foreground" /></Button>
                 <Button variant="ghost" size="icon"><Video className="w-5 h-5 text-muted-foreground" /></Button>
                 <Separator orientation="vertical" className="h-6 mx-2" />
                 <Button variant="ghost" size="icon"><Info className="w-5 h-5 text-muted-foreground" /></Button>
              </div>
           </div>

           {/* Messages */}
           <ScrollArea className="flex-1 p-6">
              <div className="space-y-4">
                 {messages.map(msg => (
                    <div key={msg.id} className={`flex ${msg.me ? 'justify-end' : 'justify-start'}`}>
                       {!msg.me && (
                         <Avatar className="w-8 h-8 mr-2 mt-1">
                           <AvatarImage src="https://github.com/shadcn.png" />
                           <AvatarFallback>JD</AvatarFallback>
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
                   placeholder="Type a message..." 
                   className="border-0 bg-transparent focus-visible:ring-0 shadow-none py-6" 
                 />
                 <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground shrink-0"><Smile className="w-5 h-5" /></Button>
                 <Button size="icon" className="shrink-0 rounded-lg shadow-sm"><Send className="w-4 h-4" /></Button>
              </div>
           </div>
        </div>

      </div>
    </Layout>
  );
}
