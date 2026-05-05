CREATE TABLE IF NOT EXISTS "priorities" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"color" text DEFAULT 'bg-gray-500',
	"level" integer NOT NULL,
	CONSTRAINT "priorities_name_unique" UNIQUE("name")
);

-- Seed the priorities table
INSERT INTO "priorities" (name, color, level) VALUES
('Critical', 'bg-red-500', 10),
('High', 'bg-orange-500', 7),
('Medium', 'bg-yellow-500', 5),
('Low', 'bg-blue-500', 2),
('Trivial', 'bg-gray-500', 0)
ON CONFLICT (name) DO NOTHING;

-- Add priorityId column to tasks table if it doesn't exist
DO $$ BEGIN
  IF NOT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name='tasks' AND column_name='priority_id') THEN
    ALTER TABLE "tasks" ADD COLUMN "priority_id" uuid;
  END IF;
END $$;

-- Update the new priorityId column based on the old priority column
DO $$ BEGIN
  IF EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name='tasks' AND column_name='priority') THEN
    UPDATE "tasks" t SET "priority_id" = (SELECT p.id FROM "priorities" p WHERE p.name = t.priority);
  END IF;
END $$;

-- Add foreign key constraint if it doesn't exist
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'tasks_priority_id_priorities_id_fk') THEN
    ALTER TABLE "tasks" ADD CONSTRAINT "tasks_priority_id_priorities_id_fk" FOREIGN KEY ("priority_id") REFERENCES "public"."priorities"("id") ON DELETE no action ON UPDATE no action;
  END IF;
END $$;

-- Drop the old priority column if it exists
DO $$ BEGIN
  IF EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name='tasks' AND column_name='priority') THEN
    ALTER TABLE "tasks" DROP COLUMN "priority";
  END IF;
END $$;

-- Create task_labels table if it doesn't exist
CREATE TABLE IF NOT EXISTS "task_labels" (
	"task_id" uuid NOT NULL,
	"label_id" uuid NOT NULL,
	CONSTRAINT "task_labels_task_id_label_id_pk" PRIMARY KEY("task_id","label_id")
);

-- Add foreign key constraints for task_labels if they don't exist
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'task_labels_task_id_tasks_id_fk') THEN
    ALTER TABLE "task_labels" ADD CONSTRAINT "task_labels_task_id_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE cascade ON UPDATE no action;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'task_labels_label_id_labels_id_fk') THEN
    ALTER TABLE "task_labels" ADD CONSTRAINT "task_labels_label_id_labels_id_fk" FOREIGN KEY ("label_id") REFERENCES "public"."labels"("id") ON DELETE cascade ON UPDATE no action;
  END IF;
END $$;

-- Migrate data from tasks.tags to task_labels
DO $$ 
DECLARE
    task_row record;
    tag_name text;
    label_id_var uuid;
BEGIN
    IF EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name='tasks' AND column_name='tags') THEN
        FOR task_row IN SELECT id, tags FROM tasks WHERE jsonb_typeof(tags) = 'array' AND jsonb_array_length(tags) > 0 LOOP
            FOR tag_name IN SELECT jsonb_array_elements_text(task_row.tags) LOOP
                -- Find the label id for the given tag name
                SELECT id INTO label_id_var FROM labels WHERE name = tag_name;

                -- If the label exists, insert into the junction table
                IF label_id_var IS NOT NULL THEN
                    INSERT INTO task_labels (task_id, label_id) VALUES (task_row.id, label_id_var)
                    ON CONFLICT (task_id, label_id) DO NOTHING;
                END IF;
            END LOOP;
        END LOOP;
    END IF;
END;
$$;

-- Drop the old tags column if it exists
DO $$ BEGIN
  IF EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name='tasks' AND column_name='tags') THEN
    ALTER TABLE "tasks" DROP COLUMN "tags";
  END IF;
END $$;
