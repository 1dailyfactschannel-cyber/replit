-- Create priorities table
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

-- Add priorityId column to tasks table
ALTER TABLE "tasks" ADD COLUMN IF NOT EXISTS "priority_id" uuid;

-- Update the new priorityId column based on the old priority column
UPDATE "tasks" t SET "priority_id" = (SELECT p.id FROM "priorities" p WHERE p.name = t.priority);

-- Add foreign key constraint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_priority_id_priorities_id_fk" FOREIGN KEY ("priority_id") REFERENCES "public"."priorities"("id") ON DELETE no action ON UPDATE no action;

-- Drop the old priority column
ALTER TABLE "tasks" DROP COLUMN IF EXISTS "priority";

-- Create task_labels table
CREATE TABLE IF NOT EXISTS "task_labels" (
	"task_id" uuid NOT NULL,
	"label_id" uuid NOT NULL,
	CONSTRAINT "task_labels_task_id_label_id_pk" PRIMARY KEY("task_id","label_id")
);

-- Add foreign key constraints for task_labels
ALTER TABLE "task_labels" ADD CONSTRAINT "task_labels_task_id_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "task_labels" ADD CONSTRAINT "task_labels_label_id_labels_id_fk" FOREIGN KEY ("label_id") REFERENCES "public"."labels"("id") ON DELETE cascade ON UPDATE no action;

-- Drop the old tags column
ALTER TABLE "tasks" DROP COLUMN IF EXISTS "tags";
