import { storage } from "../postgres-storage";
import { yandexCalendarEvents, yandexCalendarIntegrations, users, calendarEvents } from "@shared/schema";
import { eq, and, lte, gte, isNull, not } from "drizzle-orm";
import { getIO } from "../socket";
import { format } from "date-fns";
import { ru } from "date-fns/locale";

// Email service stub - replace with actual implementation
const emailService = {
  send: async (options: any) => {
    console.log(`📧 Email notification: ${options.subject}`);
  }
};

interface Reminder {
  minutes: number;
  method: string;
}

export class YandexNotificationService {
  /**
   * Check and send reminders for upcoming events
   * Should be called every minute
   */
  async checkReminders(): Promise<void> {
    const now = new Date();
    const nextMinute = new Date(now.getTime() + 60000);

    try {
      // Get all active integrations
      const integrations = await storage.db
        .select()
        .from(yandexCalendarIntegrations)
        .where(eq(yandexCalendarIntegrations.syncEnabled, true));

      for (const integration of integrations) {
        // Get events with reminders that haven't been sent yet
        const events = await storage.db
          .select()
          .from(yandexCalendarEvents)
          .where(
            and(
              eq(yandexCalendarEvents.integrationId, integration.id),
              eq(yandexCalendarEvents.deleted, false),
              gte(yandexCalendarEvents.startDate, now),
              lte(yandexCalendarEvents.startDate, new Date(now.getTime() + 24 * 60 * 60 * 1000)) // Next 24 hours
            )
          );

        for (const event of events) {
          const reminders: Reminder[] = (event.reminders as Reminder[]) || [];
          
          for (const reminder of reminders) {
            const reminderTime = new Date(event.startDate.getTime() - reminder.minutes * 60000);
            
            // Check if it's time to send reminder and it hasn't been sent
            if (reminderTime <= nextMinute && reminderTime > now) {
              const alreadySent = await storage.isNotificationSent(
                event.id,
                reminder.minutes
              );
              
              if (!alreadySent) {
                await this.sendReminder(event, reminder, integration.userId);
              }
            }
          }
        }
      }
    } catch (error) {
      console.error("Error checking reminders:", error);
    }
  }

  /**
   * Send reminder to user
   */
  private async sendReminder(
    event: any,
    reminder: Reminder,
    userId: string
  ): Promise<void> {
    try {
      // Get user details
      const user = await storage.getUser(userId);
      if (!user) {
        console.error(`User ${userId} not found for reminder`);
        return;
      }

      // Prepare message
      const timeUntil = reminder.minutes < 60 
        ? `${reminder.minutes} минут` 
        : `${Math.floor(reminder.minutes / 60)} часов`;
      
      const eventTime = format(event.startDate, "HH:mm", { locale: ru });
      const eventDate = format(event.startDate, "d MMMM", { locale: ru });

      const notificationData = {
        title: "Напоминание о встрече",
        body: `${event.title} начнется в ${eventTime} (${timeUntil})`,
        icon: "/yandex-calendar-icon.png",
        tag: `yandex-reminder-${event.id}`,
        requireInteraction: true,
        data: {
          eventId: event.id,
          meetingUrl: event.meetingUrl,
          type: "yandex-reminder",
          roomId: event.roomId || null
        }
      };

      // 1. Send push notification via WebSocket to user
      const io = getIO();
      io.to(`user:${userId}`).emit("calendar:reminder", notificationData);

      // 2. If event has roomId, also send to chat room
      if (event.roomId) {
        const systemMessage = {
          id: crypto.randomUUID(),
          chatId: event.roomId,
          senderId: userId,
          content: `🔔 Напоминание: ${event.title}\n${eventTime} • Через ${timeUntil}`,
          type: 'system_reminder',
          eventId: event.id,
          createdAt: new Date().toISOString(),
          metadata: {
            eventId: event.id,
            eventTitle: event.title,
            eventTime,
            eventDate,
            timeUntil,
            meetingUrl: event.meetingUrl
          }
        };
        
        // Save to DB
        await storage.createMessage({
          chatId: event.roomId,
          senderId: userId,
          content: systemMessage.content,
          attachments: JSON.stringify([]),
          isRead: false,
          type: 'system_reminder',
          metadata: JSON.stringify(systemMessage.metadata)
        } as any);
        
        // Send to chat room
        io.to(`chat:${event.roomId}`).emit("calendar:reminder", notificationData);
        io.to(`chat:${event.roomId}`).emit("new-message", systemMessage);
      }

      // 3. Send sound notification
      io.to(`user:${userId}`).emit("notification:sound", { type: "reminder" });

      // 4. Send email notification
      await emailService.send({
        to: user.email,
        subject: `Напоминание: ${event.title}`,
        template: "calendar-reminder",
        data: {
          eventTitle: event.title,
          eventTime,
          eventDate,
          timeUntil,
          eventLocation: event.location,
          meetingUrl: event.meetingUrl,
          userName: user.firstName || user.username
        }
      });

      // 5. Mark as sent
      await storage.markNotificationSent(
        event.id,
        userId,
        "reminder",
        reminder.minutes
      );

      console.log(`✅ Reminder sent to ${user.email} for event: ${event.title}`);
    } catch (error) {
      console.error("Error sending reminder:", error);
    }
  }

  /**
   * Notify user about event changes (new, updated, deleted)
   */
  async notifyEventChange(
    userId: string,
    type: "new_event" | "event_changed" | "event_deleted",
    event: any
  ): Promise<void> {
    try {
      const messages = {
        new_event: `Новое событие: ${event.title}`,
        event_changed: `Событие обновлено: ${event.title}`,
        event_deleted: `Событие удалено: ${event.title}`
      };

      const io = getIO();
      
      // Send WebSocket notification
      io.to(`user:${userId}`).emit("calendar:yandex:event", {
        type,
        event: {
          id: event.id,
          title: event.title,
          startDate: event.startDate,
          message: messages[type]
        }
      });

      // Send toast notification
      io.to(`user:${userId}`).emit("notification:toast", {
        type: type === "new_event" ? "info" : type === "event_changed" ? "warning" : "error",
        message: messages[type]
      });

      // Play sound for new events
      if (type === "new_event") {
        io.to(`user:${userId}`).emit("notification:sound", { type: "calendar_update" });
      }

      // Mark notification as sent
      await storage.markNotificationSent(
        event.id,
        userId,
        type
      );

    } catch (error) {
      console.error("Error sending event change notification:", error);
    }
  }

  /**
   * Check and send reminders for internal calendar events
   * Should be called every minute
   */
  async checkInternalReminders(): Promise<void> {
    const now = new Date();
    const nextMinute = new Date(now.getTime() + 60000);

    try {
      // Get all events with reminders enabled
      const events = await storage.db
        .select()
        .from(calendarEvents)
        .where(
          and(
            eq(calendarEvents.reminder, true),
            gte(calendarEvents.date, now),
            lte(calendarEvents.date, new Date(now.getTime() + 24 * 60 * 60 * 1000))
          )
        );

      for (const event of events) {
        if (!event.reminderMinutes) continue;
        
        const eventDateTime = new Date(event.date);
        const [hours, minutes] = event.time.split(':').map(Number);
        eventDateTime.setHours(hours, minutes, 0, 0);
        
        const reminderTime = new Date(eventDateTime.getTime() - event.reminderMinutes * 60000);
        
        // Check if it's time to send reminder and it hasn't been sent
        if (reminderTime <= nextMinute && reminderTime > now) {
          const alreadySent = await storage.isInternalNotificationSent(
            event.id,
            event.userId,
            "reminder",
            event.reminderMinutes
          );
          
          if (!alreadySent) {
            await this.sendInternalReminder(event);
          }
        }
      }
    } catch (error) {
      console.error("Error checking internal reminders:", error);
    }
  }

  /**
   * Send reminder for internal calendar event
   */
  private async sendInternalReminder(event: any): Promise<void> {
    try {
      const user = await storage.getUser(event.userId);
      if (!user) {
        console.error(`User ${event.userId} not found for reminder`);
        return;
      }

      const timeUntil = event.reminderMinutes < 60 
        ? `${event.reminderMinutes} минут` 
        : `${Math.floor(event.reminderMinutes / 60)} часов`;

      const notificationData = {
        title: "Напоминание о встрече",
        body: `${event.title} начнется в ${event.time} (${timeUntil})`,
        icon: "/calendar-icon.png",
        tag: `internal-reminder-${event.id}`,
        requireInteraction: true,
        data: {
          eventId: event.id,
          meetingUrl: event.meetingUrl,
          type: "internal-reminder",
          roomId: event.roomId || null
        }
      };

      const io = getIO();

      // 1. Send push notification to user
      io.to(`user:${event.userId}`).emit("calendar:reminder", notificationData);

      // 2. If event has roomId, also send to chat room as system message
      if (event.roomId) {
        const systemMessage = {
          id: crypto.randomUUID(),
          chatId: event.roomId,
          senderId: event.userId,
          content: `🔔 Напоминание: ${event.title}\n${event.time} • Через ${timeUntil}`,
          type: 'system_reminder',
          eventId: event.id,
          createdAt: new Date().toISOString(),
          metadata: {
            eventId: event.id,
            eventTitle: event.title,
            eventTime: event.time,
            eventDate: format(event.date, "d MMMM", { locale: ru }),
            timeUntil,
            meetingUrl: event.meetingUrl
          }
        };
        
        // Save to DB
        await storage.createMessage({
          chatId: event.roomId,
          senderId: event.userId,
          content: systemMessage.content,
          attachments: JSON.stringify([]),
          isRead: false,
          type: 'system_reminder',
          metadata: JSON.stringify(systemMessage.metadata)
        } as any);
        
        // Send to chat room
        io.to(`chat:${event.roomId}`).emit("calendar:reminder", notificationData);
        io.to(`chat:${event.roomId}`).emit("new-message", systemMessage);
      }

      // 3. Send sound notification
      io.to(`user:${event.userId}`).emit("notification:sound", { type: "reminder" });

      // 4. Mark as sent
      await storage.markNotificationSent(
        event.id,
        event.userId,
        "reminder",
        event.reminderMinutes
      );

      console.log(`✅ Internal reminder sent to user ${event.userId} for event: ${event.title}`);
    } catch (error) {
      console.error("Error sending internal reminder:", error);
    }
  }

  /**
   * Schedule periodic tasks
   */
  startPeriodicTasks(): void {
    // Check reminders every minute
    setInterval(() => {
      this.checkReminders().catch(error => {
        console.error("Error in reminder check interval:", error);
      });
      this.checkInternalReminders().catch(error => {
        console.error("Error in internal reminder check interval:", error);
      });
    }, 60000);

    console.log("✅ Yandex Calendar notification service started");
  }
}

// Export singleton instance
export const yandexNotificationService = new YandexNotificationService();
