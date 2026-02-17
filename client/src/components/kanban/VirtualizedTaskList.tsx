import React, { useCallback } from 'react';
import { List } from 'react-window';
import { cn } from '@/lib/utils';

import { Draggable } from '@hello-pangea/dnd';

interface VirtualizedTaskListProps {
  tasks: any[];
  onTaskClick: (task: any) => void;
  columnId: string;
}

const TASK_ITEM_HEIGHT = 90; // Height of each task card

const TaskItem = React.memo(({ 
  task, 
  index, 
  onClick, 
  style 
}: { 
  task: any; 
  index: number; 
  onClick: (task: any) => void;
  style: React.CSSProperties;
}) => {
  return (
    <Draggable key={task.id} draggableId={task.id.toString()} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          style={{
            ...style,
            ...provided.draggableProps.style,
          }}
          onClick={() => onClick(task)}
          className={cn(
            "bg-card border border-border/50 p-4 rounded-xl shadow-sm hover:shadow-md hover:border-primary/30 transition-[box-shadow,border-color,background-color] group/task relative overflow-hidden font-sans mx-1 mb-3",
            snapshot.isDragging ? "shadow-xl ring-2 ring-primary/20 rotate-1 z-50" : ""
          )}
        >
          {/* Bottom border indicator for priority */}
          <div className={cn(
            "absolute inset-x-0 bottom-0 h-1.5 rounded-b-xl",
            (task.priority?.toLowerCase() === "критический" || task.priority?.toLowerCase() === "critical") ? "bg-rose-600" :
            (task.priority?.toLowerCase() === "высокий" || task.priority?.toLowerCase() === "high") ? "bg-rose-500" :
            (task.priority?.toLowerCase() === "средний" || task.priority?.toLowerCase() === "medium") ? "bg-orange-500" :
            (task.priority?.toLowerCase() === "низкий" || task.priority?.toLowerCase() === "low") ? "bg-blue-500" :
            "bg-slate-400"
          )} />
          
          <h4 className="text-sm font-semibold mb-3 leading-snug text-foreground/90 line-clamp-2">{task.title}</h4>
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              {task.assignee ? (
                <span className="text-xs font-medium text-muted-foreground truncate max-w-[150px]">
                  {task.assignee.name}
                </span>
              ) : (
                <span className="text-xs text-muted-foreground/50">
                  Не назначен
                </span>
              )}
            </div>
            {task.creator && (
              <div className="text-[10px] text-muted-foreground font-medium">
                {task.creator.date?.split(' ')[0]}
              </div>
            )}
          </div>
        </div>
      )}
    </Draggable>
  );
});

TaskItem.displayName = 'TaskItem';

export const VirtualizedTaskList = React.memo(function VirtualizedTaskList({ 
  tasks, 
  onTaskClick, 
  columnId 
}: VirtualizedTaskListProps) {
  const itemCount = tasks.length;
  
  // Row renderer function
  const Row = React.useCallback(function Row({ index, style, tasks, onTaskClick }: any) {
    const task = tasks?.[index];
    if (!task) return null;
    
    return (
      <TaskItem
        task={task}
        index={index}
        onClick={onTaskClick}
        style={{
          ...style,
          height: TASK_ITEM_HEIGHT - 12,
        }}
      />
    );
  }, []);
  
  // Memoize row data to prevent unnecessary re-renders
  const rowData = React.useMemo(() => ({
    tasks,
    onTaskClick
  }), [tasks, onTaskClick]);

  // If few tasks, render normally without virtualization
  if (itemCount <= 10) {
    return (
      <div className="flex flex-col gap-3">
        {tasks.map((task, index) => (
          <TaskItem
            key={task.id}
            task={task}
            index={index}
            onClick={onTaskClick}
            style={{}}
          />
        ))}
      </div>
    );
  }

  return (
    <List
      style={{ height: 600, width: "100%" }}
      rowCount={itemCount}
      rowHeight={TASK_ITEM_HEIGHT}
      className="scrollbar-thin"
      rowProps={rowData}
      rowComponent={Row}
    />
  );
});
