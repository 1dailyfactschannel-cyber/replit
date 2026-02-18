BEGIN;

-- Create the priorities table
CREATE TABLE IF NOT EXISTS "priorities" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"color" text DEFAULT 'bg-blue-500',
	"level" integer DEFAULT 1 NOT NULL,
	CONSTRAINT "priorities_name_unique" UNIQUE("name")
);

ALTER TABLE "projects" ADD COLUMN "priority_id" uuid;
ALTER TABLE "tasks" ADD COLUMN "priority_id" uuid;

-- Create default priorities
INSERT INTO "priorities" (name, color, level) VALUES ('Низкий', 'bg-emerald-500', 1) ON CONFLICT (name) DO NOTHING;
INSERT INTO "priorities" (name, color, level) VALUES ('Средний', 'bg-amber-500', 2) ON CONFLICT (name) DO NOTHING;
INSERT INTO "priorities" (name, color, level) VALUES ('Высокий', 'bg-rose-400', 3) ON CONFLICT (name) DO NOTHING;
INSERT INTO "priorities" (name, color, level) VALUES ('Критический', 'bg-rose-600', 4) ON CONFLICT (name) DO NOTHING;

-- Update existing projects with the new priorityId
UPDATE projects p SET priority_id = pr.id FROM priorities pr WHERE lower(p.priority) = lower(pr.name);

-- Update existing tasks with the new priorityId
UPDATE tasks t SET priority_id = pr.id FROM priorities pr WHERE lower(t.priority) = lower(pr.name);

-- Add foreign key constraints
ALTER TABLE "projects" ADD CONSTRAINT "projects_priority_id_priorities_id_fk" FOREIGN KEY ("priority_id") REFERENCES "priorities"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_priority_id_priorities_id_fk" FOREIGN KEY ("priority_id") REFERENCES "priorities"("id") ON DELETE no action ON UPDATE no action;

-- Drop the old priority columns
ALTER TABLE "projects" DROP COLUMN "priority";
ALTER TABLE "tasks" DROP COLUMN "priority";

COMMIT;