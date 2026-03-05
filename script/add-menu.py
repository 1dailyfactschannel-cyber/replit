f = open('client/src/components/kanban/TaskDetailsModal.tsx', 'r', encoding='utf-8')
c = f.read()
f.close()

menu_item = 
'              {/* Attachments Menu Item */}
              <button
                type="button"
                onClick={() => setShowAttachments(!showAttachments)}
                className={cn(
                  "flex items-center gap-2.5 p-2 rounded-lg transition-colors group cursor-pointer border border-transparent w-full text-left",
                  showAttachments ? "bg-secondary/25 border-border/20" : "bg-secondary/15 hover:bg-secondary/25 hover:border-border/20"
                )}
              >
                <Paperclip className={cn("w-3.5 h-3.5", showAttachments ? "text-primary" : "text-muted-foreground/60")} />
                <span className={cn("text-[12px] font-bold flex-1", showAttachments ? "text-primary" : "text-foreground/70")}>Вложения</span>
                <span className="text-[10px] font-bold text-muted-foreground/50">{attachments.length}</span>
              </button>

              {/* Priority Section */}'

c = c.replace('{/* Priority Section */}', menu_item)

f = open('client/src/components/kanban/TaskDetailsModal.tsx', 'w', encoding='utf-8')
f.write(c)
f.close()
print('Done')
