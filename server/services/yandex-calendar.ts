import { storage } from "../postgres-storage";
import { InsertYandexCalendarIntegration, InsertYandexCalendarEvent, YandexCalendarEvent } from "@shared/schema";
import { rrulestr, RRule } from "rrule";

// Types for Yandex Calendar API responses
interface YandexCalendar {
  id: string;
  name: string;
}

interface YandexEvent {
  id: string;
  etag: string;
  title: string;
  description?: string;
  start: string; // ISO date
  end: string; // ISO date
  recurrence?: string[]; // RRULE strings
  attendees?: { email: string; name?: string; status?: string }[];
  organizer?: { email: string; name?: string };
  color?: string;
  reminders?: { minutes: number; method: string }[];
  location?: string;
  meetingUrl?: string;
  status?: string;
  deleted?: boolean;
}

interface SyncResult {
  added: number;
  updated: number;
  deleted: number;
}

export class YandexCalendarService {
  private clientId: string;
  private clientSecret: string;
  private redirectUri: string;

  constructor() {
    this.clientId = process.env.YANDEX_CLIENT_ID || "";
    this.clientSecret = process.env.YANDEX_CLIENT_SECRET || "";
    this.redirectUri = `${process.env.APP_URL || "http://localhost:3000"}/api/integrations/yandex-calendar/callback`;

    if (!this.clientId || !this.clientSecret) {
      console.warn("⚠️ YANDEX_CLIENT_ID or YANDEX_CLIENT_SECRET not set. Yandex Calendar integration will not work.");
    }
  }

  /**
   * Generate OAuth URL for Yandex authorization
   */
  getAuthUrl(userId: string): string {
    const params = new URLSearchParams({
      client_id: this.clientId,
      response_type: "code",
      redirect_uri: this.redirectUri,
      state: userId,
      scope: "calendar:read",
    });

    return `https://oauth.yandex.ru/authorize?${params.toString()}`;
  }

  /**
   * Handle OAuth callback and exchange code for tokens
   */
  async handleCallback(code: string, userId: string): Promise<void> {
    // Exchange code for tokens
    const tokenResponse = await fetch("https://oauth.yandex.ru/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${Buffer.from(`${this.clientId}:${this.clientSecret}`).toString("base64")}`,
      },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: this.redirectUri,
      }),
    });

    if (!tokenResponse.ok) {
      const error = await tokenResponse.text();
      throw new Error(`Failed to exchange code for tokens: ${error}`);
    }

    const tokens = await tokenResponse.json();

    // Get list of calendars
    const calendars = await this.getCalendars(tokens.access_token);
    
    if (calendars.length === 0) {
      throw new Error("No calendars found in Yandex account");
    }

    // Use the first calendar (usually the default one)
    const primaryCalendar = calendars[0];

    // Delete existing integration if any
    const existing = await storage.getYandexCalendarIntegrationByUser(userId);
    if (existing) {
      await storage.deleteYandexCalendarIntegration(existing.id);
    }

    // Create new integration
    const integrationData: InsertYandexCalendarIntegration = {
      userId,
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      tokenExpiresAt: new Date(Date.now() + tokens.expires_in * 1000),
      calendarId: primaryCalendar.id,
      calendarName: primaryCalendar.name,
      syncEnabled: true,
    };

    await storage.createYandexCalendarIntegration(integrationData);

    // Initial sync
    const integration = await storage.getYandexCalendarIntegrationByUser(userId);
    if (integration) {
      await this.syncUserCalendar(integration.id);
    }
  }

  /**
   * Get list of calendars from Yandex
   */
  async getCalendars(accessToken: string): Promise<YandexCalendar[]> {
    const response = await fetch("https://calendar.yandex.ru/api/calendars", {
      headers: {
        Authorization: `OAuth ${accessToken}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch calendars: ${response.statusText}`);
    }

    const data = await response.json();
    return data.calendars || [];
  }

  /**
   * Refresh access token if expired
   */
  async refreshToken(integrationId: string): Promise<void> {
    const integration = await storage.getYandexCalendarIntegration(integrationId);
    if (!integration || !integration.refreshToken) {
      throw new Error("No refresh token available");
    }

    const response = await fetch("https://oauth.yandex.ru/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${Buffer.from(`${this.clientId}:${this.clientSecret}`).toString("base64")}`,
      },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: integration.refreshToken,
      }),
    });

    if (!response.ok) {
      throw new Error("Failed to refresh token");
    }

    const tokens = await response.json();

    await storage.updateYandexCalendarIntegration(integrationId, {
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token || integration.refreshToken,
      tokenExpiresAt: new Date(Date.now() + tokens.expires_in * 1000),
    });
  }

  /**
   * Fetch events from Yandex Calendar
   */
  async fetchEvents(integrationId: string): Promise<YandexEvent[]> {
    const integration = await storage.getYandexCalendarIntegration(integrationId);
    if (!integration) {
      throw new Error("Integration not found");
    }

    // Check and refresh token if needed
    if (integration.tokenExpiresAt && new Date() > integration.tokenExpiresAt) {
      await this.refreshToken(integrationId);
    }

    // Get updated integration with new token
    const updatedIntegration = await storage.getYandexCalendarIntegration(integrationId);
    if (!updatedIntegration) {
      throw new Error("Integration not found after token refresh");
    }

    // Calculate date range (3 months back, 6 months forward)
    const now = new Date();
    const from = new Date(now.getFullYear(), now.getMonth() - 3, 1);
    const to = new Date(now.getFullYear(), now.getMonth() + 6, 31);

    const response = await fetch(
      `https://calendar.yandex.ru/api/calendars/${integration.calendarId}/events?from=${from.toISOString()}&to=${to.toISOString()}`,
      {
        headers: {
          Authorization: `OAuth ${updatedIntegration.accessToken}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch events: ${response.statusText}`);
    }

    const data = await response.json();
    return data.events || [];
  }

  /**
   * Sync calendar for a specific user
   */
  async syncUserCalendar(integrationId: string): Promise<SyncResult> {
    const integration = await storage.getYandexCalendarIntegration(integrationId);
    if (!integration || !integration.syncEnabled) {
      return { added: 0, updated: 0, deleted: 0 };
    }

    const result: SyncResult = { added: 0, updated: 0, deleted: 0 };

    try {
      const events = await this.fetchEvents(integrationId);

      for (const event of events) {
        const existing = await storage.getYandexEventByYandexId(event.id);

        if (event.deleted) {
          if (existing) {
            await storage.markYandexEventDeleted(existing.id);
            result.deleted++;
          }
        } else if (!existing) {
          // New event
          const eventData: InsertYandexCalendarEvent = {
            integrationId,
            yandexEventId: event.id,
            yandexEtag: event.etag,
            title: event.title,
            description: event.description || null,
            startDate: new Date(event.start),
            endDate: new Date(event.end),
            recurrenceRule: event.recurrence?.[0] || null,
            recurrenceId: null,
            isRecurring: !!event.recurrence && event.recurrence.length > 0,
            attendees: event.attendees || [],
            organizerEmail: event.organizer?.email || null,
            color: event.color || null,
            reminders: event.reminders || [],
            location: event.location || null,
            meetingUrl: event.meetingUrl || null,
            status: event.status || "confirmed",
          };

          await storage.createYandexCalendarEvent(eventData);
          result.added++;
        } else if (existing.yandexEtag !== event.etag) {
          // Updated event
          await storage.updateYandexCalendarEvent(existing.id, {
            title: event.title,
            description: event.description || null,
            startDate: new Date(event.start),
            endDate: new Date(event.end),
            recurrenceRule: event.recurrence?.[0] || null,
            isRecurring: !!event.recurrence && event.recurrence.length > 0,
            attendees: event.attendees || [],
            organizerEmail: event.organizer?.email || null,
            color: event.color || null,
            reminders: event.reminders || [],
            location: event.location || null,
            meetingUrl: event.meetingUrl || null,
            status: event.status || "confirmed",
            yandexEtag: event.etag,
            lastSyncedAt: new Date(),
            deleted: false,
          });
          result.updated++;
        }
      }

      await storage.updateYandexCalendarLastSync(integrationId);

      return result;
    } catch (error) {
      console.error(`Failed to sync calendar ${integrationId}:`, error);
      throw error;
    }
  }

  /**
   * Get events for a specific user (with recurring expansion)
   */
  async getEventsForUser(userId: string, from: Date, to: Date): Promise<any[]> {
    const integration = await storage.getYandexCalendarIntegrationByUser(userId);
    if (!integration || !integration.syncEnabled) {
      return [];
    }

    // Get events from database
    const events = await storage.getYandexEventsByDateRange(integration.id, from, to);

    // Expand recurring events
    const expanded: any[] = [];

    for (const event of events) {
      if (event.isRecurring && event.recurrenceRule) {
        const instances = this.expandRecurringEvent(event, from, to);
        expanded.push(...instances);
      } else {
        expanded.push(this.toDisplayEvent(event));
      }
    }

    return expanded;
  }

  /**
   * Expand recurring event into instances
   */
  private expandRecurringEvent(event: YandexCalendarEvent, from: Date, to: Date): any[] {
    try {
      const rule = rrulestr(event.recurrenceRule!, {
        dtstart: event.startDate,
      });

      const dates = rule.between(from, to, true);
      const duration = event.endDate.getTime() - event.startDate.getTime();

      return dates.map((date, index) => ({
        id: `${event.id}_${index}`,
        title: event.title,
        description: event.description,
        startDate: date,
        endDate: new Date(date.getTime() + duration),
        source: "yandex",
        isReadOnly: true,
        color: event.color || "#FC3F1D",
        location: event.location,
        meetingUrl: event.meetingUrl,
        isRecurring: true,
        originalEventId: event.id,
      }));
    } catch (error) {
      console.error("Failed to expand recurring event:", error);
      // Return single event if expansion fails
      return [this.toDisplayEvent(event)];
    }
  }

  /**
   * Convert database event to display format
   */
  private toDisplayEvent(event: YandexCalendarEvent): any {
    return {
      id: event.id,
      title: event.title,
      description: event.description,
      startDate: event.startDate,
      endDate: event.endDate,
      source: "yandex",
      isReadOnly: true,
      color: event.color || "#FC3F1D",
      location: event.location,
      meetingUrl: event.meetingUrl,
      isRecurring: event.isRecurring,
      attendees: event.attendees,
      organizerEmail: event.organizerEmail,
    };
  }
}

// Export singleton instance
export const yandexCalendarService = new YandexCalendarService();
