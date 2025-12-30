import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Calendar, Clock, Video, Mic, Bell } from "lucide-react";

interface ScheduleCallDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contactName: string;
  onSchedule?: (data: ScheduledCall) => void;
}

export interface ScheduledCall {
  contactName: string;
  date: string;
  time: string;
  type: "audio" | "video";
  reminder: boolean;
  reminderMinutes: number;
  description?: string;
}

export function ScheduleCallDialog({
  open,
  onOpenChange,
  contactName,
  onSchedule,
}: ScheduleCallDialogProps) {
  const [date, setDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [time, setTime] = useState("14:00");
  const [type, setType] = useState<"audio" | "video">("video");
  const [reminder, setReminder] = useState(true);
  const [reminderMinutes, setReminderMinutes] = useState(15);
  const [description, setDescription] = useState("");

  const handleSchedule = () => {
    onSchedule?.({
      contactName,
      date,
      time,
      type,
      reminder,
      reminderMinutes,
      description,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Запланировать звонок</DialogTitle>
          <DialogDescription>
            Организуйте звонок с {contactName}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          {/* Date Input */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2 font-medium">
              <Calendar className="w-4 h-4" />
              Дата
            </Label>
            <Input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="bg-secondary/50"
              data-testid="input-call-date"
            />
          </div>

          {/* Time Input */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2 font-medium">
              <Clock className="w-4 h-4" />
              Время
            </Label>
            <Input
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className="bg-secondary/50"
              data-testid="input-call-time"
            />
          </div>

          {/* Call Type */}
          <div className="space-y-3">
            <Label className="font-medium">Тип звонка</Label>
            <RadioGroup value={type} onValueChange={(v) => setType(v as "audio" | "video")}>
              <div className="flex items-center gap-3 p-3 rounded-lg border border-border/50 hover:bg-secondary/30 cursor-pointer transition-colors">
                <RadioGroupItem value="video" id="video" />
                <Label htmlFor="video" className="flex-1 cursor-pointer flex items-center gap-2 font-normal">
                  <Video className="w-4 h-4 text-primary" />
                  Видео звонок
                </Label>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-lg border border-border/50 hover:bg-secondary/30 cursor-pointer transition-colors">
                <RadioGroupItem value="audio" id="audio" />
                <Label htmlFor="audio" className="flex-1 cursor-pointer flex items-center gap-2 font-normal">
                  <Mic className="w-4 h-4 text-blue-500" />
                  Аудио звонок
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Reminder */}
          <div className="space-y-3 border-t border-border pt-4">
            <div className="flex items-center gap-3">
              <Checkbox
                id="reminder"
                checked={reminder}
                onCheckedChange={(checked) => setReminder(checked as boolean)}
                data-testid="checkbox-call-reminder"
              />
              <Label htmlFor="reminder" className="font-medium cursor-pointer flex items-center gap-2">
                <Bell className="w-4 h-4" />
                Напомнить за
              </Label>
            </div>

            {reminder && (
              <div className="ml-6 flex items-center gap-2">
                <Input
                  type="number"
                  min="1"
                  max="120"
                  value={reminderMinutes}
                  onChange={(e) => setReminderMinutes(Number(e.target.value))}
                  className="w-20 bg-secondary/50"
                  data-testid="input-reminder-minutes"
                />
                <span className="text-sm text-muted-foreground">минут до звонка</span>
              </div>
            )}
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label className="font-medium">Описание (опционально)</Label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Добавьте комментарий, тему звонка или повестку дня..."
              className="w-full p-3 rounded-lg border border-border/50 bg-secondary/30 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none h-20"
              data-testid="textarea-call-description"
            />
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            data-testid="button-cancel-schedule"
          >
            Отмена
          </Button>
          <Button
            onClick={handleSchedule}
            className="shadow-lg shadow-primary/20"
            data-testid="button-confirm-schedule"
          >
            Добавить в календарь
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
