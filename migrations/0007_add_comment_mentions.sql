-- Migration: Add comment mentions table with full functionality
-- Created: 2026-02-19

-- Create comment mentions table
CREATE TABLE IF NOT EXISTS comment_mentions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    comment_id UUID NOT NULL REFERENCES comments(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    mentioned_name TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS comment_mentions_comment_id_idx ON comment_mentions(comment_id);
CREATE INDEX IF NOT EXISTS comment_mentions_user_id_idx ON comment_mentions(user_id);

-- Add comment to table
COMMENT ON TABLE comment_mentions IS 'Tracks user mentions in task comments';

-- Function to parse mentions from comment content and create notifications
CREATE OR REPLACE FUNCTION parse_comment_mentions()
RETURNS TRIGGER AS $$
DECLARE
    mention_text TEXT;
    mention_user RECORD;
    full_name TEXT;
    task_title TEXT;
    project_name TEXT;
    notification_link TEXT;
BEGIN
    -- Find all @mentions in the comment content
    FOR mention_text IN 
        SELECT regexp_matches(NEW.content, '@([^\s]+(?:\s[^\s]+)*)', 'g')
    LOOP
        -- Remove @ symbol and get the name
        full_name := substring(mention_text from 2);
        
        -- Find user by full name (first_name + last_name) or username
        FOR mention_user IN 
            SELECT u.id, u.username, u.first_name, u.last_name
            FROM users u
            WHERE (u.first_name || ' ' || COALESCE(u.last_name, '')) = full_name
               OR u.username = full_name
               OR u.first_name = full_name
            LIMIT 1
        LOOP
            -- Only create mention if user exists and it's not the author
            IF mention_user.id IS NOT NULL AND mention_user.id != NEW.author_id THEN
                -- Insert into comment_mentions
                INSERT INTO comment_mentions (comment_id, user_id, mentioned_name)
                VALUES (NEW.id, mention_user.id, full_name)
                ON CONFLICT DO NOTHING;
                
                -- Get task info for notification
                SELECT t.title, p.name, b.project_id
                INTO task_title, project_name, project_id
                FROM tasks t
                JOIN boards b ON t.board_id = b.id
                JOIN projects p ON b.project_id = p.id
                WHERE t.id = NEW.task_id
                LIMIT 1;
                
                -- Create notification link
                notification_link := '/projects?project=' || project_id || '&task=' || NEW.task_id;
                
                -- Create notification for mentioned user
                INSERT INTO notifications (
                    user_id,
                    sender_id,
                    type,
                    title,
                    message,
                    link
                ) VALUES (
                    mention_user.id,
                    NEW.author_id,
                    'mention',
                    'Вас упомянули в комментарии',
                    COALESCE(task_title, 'Задача') || ' в проекте ' || COALESCE(project_name, ''),
                    notification_link
                );
            END IF;
        END LOOP;
    END LOOP;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to parse mentions after comment insert
DROP TRIGGER IF EXISTS parse_mentions_on_comment ON comments;
CREATE TRIGGER parse_mentions_on_comment
    AFTER INSERT ON comments
    FOR EACH ROW
    EXECUTE FUNCTION parse_comment_mentions();

-- Function to update mentions when comment is updated
CREATE OR REPLACE FUNCTION update_comment_mentions()
RETURNS TRIGGER AS $$
DECLARE
    mention_text TEXT;
    mention_user RECORD;
    full_name TEXT;
    task_title TEXT;
    project_name TEXT;
    notification_link TEXT;
    project_id UUID;
BEGIN
    -- Delete old mentions for this comment
    DELETE FROM comment_mentions WHERE comment_id = NEW.id;
    
    -- Find all @mentions in the updated comment content
    FOR mention_text IN 
        SELECT regexp_matches(NEW.content, '@([^\s]+(?:\s[^\s]+)*)', 'g')
    LOOP
        -- Remove @ symbol and get the name
        full_name := substring(mention_text from 2);
        
        -- Find user by full name (first_name + last_name) or username
        FOR mention_user IN 
            SELECT u.id, u.username, u.first_name, u.last_name
            FROM users u
            WHERE (u.first_name || ' ' || COALESCE(u.last_name, '')) = full_name
               OR u.username = full_name
               OR u.first_name = full_name
            LIMIT 1
        LOOP
            -- Only create mention if user exists and it's not the author
            IF mention_user.id IS NOT NULL AND mention_user.id != NEW.author_id THEN
                -- Insert into comment_mentions
                INSERT INTO comment_mentions (comment_id, user_id, mentioned_name)
                VALUES (NEW.id, mention_user.id, full_name)
                ON CONFLICT DO NOTHING;
                
                -- Get task info for notification
                SELECT t.title, p.name, b.project_id
                INTO task_title, project_name, project_id
                FROM tasks t
                JOIN boards b ON t.board_id = b.id
                JOIN projects p ON b.project_id = p.id
                WHERE t.id = NEW.task_id
                LIMIT 1;
                
                -- Create notification link
                notification_link := '/projects?project=' || project_id || '&task=' || NEW.task_id;
                
                -- Create notification for mentioned user (only if not exists)
                INSERT INTO notifications (
                    user_id,
                    sender_id,
                    type,
                    title,
                    message,
                    link
                ) VALUES (
                    mention_user.id,
                    NEW.author_id,
                    'mention',
                    'Вас упомянули в комментарии',
                    COALESCE(task_title, 'Задача') || ' в проекте ' || COALESCE(project_name, ''),
                    notification_link
                )
                ON CONFLICT DO NOTHING;
            END IF;
        END LOOP;
    END LOOP;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to update mentions after comment update
DROP TRIGGER IF EXISTS update_mentions_on_comment ON comments;
CREATE TRIGGER update_mentions_on_comment
    AFTER UPDATE ON comments
    FOR EACH ROW
    WHEN (OLD.content IS DISTINCT FROM NEW.content)
    EXECUTE FUNCTION update_comment_mentions();

-- Add comments to functions
COMMENT ON FUNCTION parse_comment_mentions() IS 'Parses @mentions from comment content and creates notifications';
COMMENT ON FUNCTION update_comment_mentions() IS 'Updates @mentions when comment content is modified';
