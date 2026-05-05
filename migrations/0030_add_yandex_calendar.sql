-- Migration: Add Yandex Calendar tables
-- Created: $(date)

-- Yandex Calendar Integrations table
CREATE TABLE IF NOT EXISTS yandex_calendar_integrations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    access_token TEXT NOT NULL,
    refresh_token TEXT,
    token_expires_at TIMESTAMP,
    calendar_id TEXT NOT NULL,
    calendar_name TEXT,
    sync_enabled BOOLEAN DEFAULT true,
    last_sync_at TIMESTAMP,
    last_sync_token TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS yandex_cal_user_id_idx ON yandex_calendar_integrations(user_id);

-- Yandex Calendar Events table
CREATE TABLE IF NOT EXISTS yandex_calendar_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    integration_id UUID NOT NULL REFERENCES yandex_calendar_integrations(id) ON DELETE CASCADE,
    yandex_event_id TEXT NOT NULL,
    yandex_etag TEXT,
    title TEXT NOT NULL,
    description TEXT,
    start_date TIMESTAMP NOT NULL,
    end_date TIMESTAMP NOT NULL,
    recurrence_rule TEXT,
    recurrence_id TEXT,
    is_recurring BOOLEAN DEFAULT false,
    attendees JSONB DEFAULT '[]'::jsonb,
    organizer_email TEXT,
    color TEXT,
    reminders JSONB DEFAULT '[]'::jsonb,
    location TEXT,
    meeting_url TEXT,
    status TEXT DEFAULT 'confirmed',
    last_synced_at TIMESTAMP DEFAULT NOW(),
    deleted BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS yandex_events_yandex_id_idx ON yandex_calendar_events(yandex_event_id);
CREATE INDEX IF NOT EXISTS yandex_events_start_date_idx ON yandex_calendar_events(start_date);
CREATE INDEX IF NOT EXISTS yandex_events_integration_idx ON yandex_calendar_events(integration_id);
CREATE INDEX IF NOT EXISTS yandex_events_attendees_idx ON yandex_calendar_events USING gin(attendees);

-- Yandex Calendar Notifications table
CREATE TABLE IF NOT EXISTS yandex_calendar_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES yandex_calendar_events(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    notification_type TEXT NOT NULL,
    reminder_minutes INTEGER,
    sent_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS yandex_notif_event_id_idx ON yandex_calendar_notifications(event_id);
CREATE INDEX IF NOT EXISTS yandex_notif_user_id_idx ON yandex_calendar_notifications(user_id);

-- Add comment
COMMENT ON TABLE yandex_calendar_integrations IS 'Yandex Calendar OAuth integrations per user';
COMMENT ON TABLE yandex_calendar_events IS 'Events synced from Yandex Calendar';
COMMENT ON TABLE yandex_calendar_notifications IS 'Tracking for sent notifications';
