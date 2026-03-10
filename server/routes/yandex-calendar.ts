import { Router } from "express";
import { storage } from "../postgres-storage";
import { yandexCalendarService } from "../services/yandex-calendar";
import { getIO } from "../socket";

const router = Router();

/**
 * Get OAuth URL for Yandex Calendar
 */
router.get("/integrations/yandex-calendar/auth", async (req, res) => {
  try {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Не авторизован" });
    
    if (!yandexCalendarService.isConfigured()) {
      return res.status(503).json({ 
        message: "Интеграция с Яндекс Календарем не настроена администратором. Обратитесь к администратору системы." 
      });
    }
    
    const userId = req.user!.id;
    const authUrl = yandexCalendarService.getAuthUrl(userId);
    res.json({ authUrl });
  } catch (error: any) {
    console.error("Error generating Yandex auth URL:", error);
    res.status(500).json({ message: "Failed to generate auth URL" });
  }
});

/**
 * OAuth callback from Yandex
 */
router.get("/integrations/yandex-calendar/callback", async (req, res) => {
  try {
    const { code, state, error } = req.query;

    if (error) {
      console.error("Yandex OAuth error:", error);
      return res.redirect("/management?tab=integrations&yandex=error");
    }

    if (!code || !state) {
      return res.redirect("/management?tab=integrations&yandex=error");
    }

    await yandexCalendarService.handleCallback(code as string, state as string);
    
    res.redirect("/management?tab=integrations&yandex=connected");
  } catch (error: any) {
    console.error("Error handling Yandex callback:", error);
    res.redirect("/management?tab=integrations&yandex=error");
  }
});

/**
 * Get integration status
 */
router.get("/integrations/yandex-calendar/status", async (req, res) => {
  try {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Не авторизован" });
    console.log("[YandexCalendar] Getting status for user:", req.user?.id);
    const userId = req.user!.id;
    const integration = await storage.getYandexCalendarIntegrationByUser(userId);
    console.log("[YandexCalendar] Integration found:", integration ? "yes" : "no");
    
    res.json({
      connected: !!integration,
      lastSync: integration?.lastSyncAt,
      calendarName: integration?.calendarName,
      syncEnabled: integration?.syncEnabled,
    });
  } catch (error: any) {
    console.error("[YandexCalendar] Error getting status:", error);
    res.status(500).json({ message: "Failed to get status" });
  }
});

/**
 * Disconnect integration
 */
router.delete("/integrations/yandex-calendar", async (req, res) => {
  try {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Не авторизован" });
    const userId = req.user!.id;
    const integration = await storage.getYandexCalendarIntegrationByUser(userId);
    
    if (integration) {
      await storage.deleteYandexCalendarIntegration(integration.id);
    }
    
    res.json({ success: true });
  } catch (error: any) {
    console.error("Error disconnecting Yandex calendar:", error);
    res.status(500).json({ message: "Failed to disconnect" });
  }
});

/**
 * Manual sync trigger
 */
router.post("/integrations/yandex-calendar/sync", async (req, res) => {
  try {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Не авторизован" });
    const userId = req.user!.id;
    const integration = await storage.getYandexCalendarIntegrationByUser(userId);
    
    if (!integration) {
      return res.status(404).json({ message: "Integration not found" });
    }

    const result = await yandexCalendarService.syncUserCalendar(integration.id);
    
    // Notify user about sync via WebSocket
    const io = getIO();
    io.to(`user:${userId}`).emit("calendar:yandex:sync", {
      added: result.added,
      updated: result.updated,
      deleted: result.deleted,
    });
    
    res.json({
      success: true,
      added: result.added,
      updated: result.updated,
      deleted: result.deleted,
    });
  } catch (error: any) {
    console.error("Error syncing Yandex calendar:", error);
    res.status(500).json({ message: "Failed to sync" });
  }
});

/**
 * Get events for calendar
 */
router.get("/calendar/yandex-events", async (req, res) => {
  try {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Не авторизован" });
    const userId = req.user!.id;
    const { from, to } = req.query;

    if (!from || !to) {
      return res.status(400).json({ message: "from and to parameters are required" });
    }

    const events = await yandexCalendarService.getEventsForUser(
      userId,
      new Date(from as string),
      new Date(to as string)
    );

    res.json({ events });
  } catch (error: any) {
    console.error("Error getting Yandex events:", error);
    res.status(500).json({ message: "Failed to get events" });
  }
});

export default router;
