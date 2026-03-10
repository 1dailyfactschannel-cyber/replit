import { storage } from "../postgres-storage";
import { yandexCalendarEvents, yandexCalendarIntegrations, users } from "@shared/schema";
import { eq, and, lte, gte, isNull, not } from "drizzle-orm";
import { getIO } from "../socket";
import { format } from "date-fns";
import { ru } from "date-fns/locale";

// Email service stub - replace with actual implementation
const emailService = {
  send: async (options: any) => {
    console.log(`📧 Email would be sent to ${options.to}: ${options.subject}`);
    // TODO: Implement actual email sending
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
          type: "yandex-reminder"
        }
      };

      // 1. Send push notification via WebSocket
      const io = getIO();
      io.to(`user:${userId}`).emit("calendar:reminder", notificationData);

      // 2. Send sound notification
      io.to(`user:${userId}`).emit("notification:sound", { type: "reminder" });

      // 3. Send email notification
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

      // 4. Mark as sent
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
   * Schedule periodic tasks
   */
  startPeriodicTasks(): void {
    // Check reminders every minute
    setInterval(() => {
      this.checkReminders().catch(error => {
        console.error("Error in reminder check interval:", error);
      });
    }, 60000);

    console.log("✅ Yandex Calendar notification service started");
  }
}

// Export singleton instance
export const yandexNotificationService = new YandexNotificationService();
