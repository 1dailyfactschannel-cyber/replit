BEGIN;

-- Create the task_types table
CREATE TABLE IF NOT EXISTS "task_types" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"color" text DEFAULT 'bg-blue-500',
	CONSTRAINT "task_types_name_unique" UNIQUE("name")
);

ALTER TABLE "tasks" ADD COLUMN "task_type_id" uuid;

-- Create default task types
INSERT INTO "task_types" (name, color) VALUES ('Ошибка', 'bg-red-500') ON CONFLICT (name) DO NOTHING;
INSERT INTO "task_types" (name, color) VALUES ('Доработка', 'bg-violet-500') ON CONFLICT (name) DO NOTHING;
INSERT INTO "task_types" (name, color) VALUES ('Эпик', 'bg-orange-500') ON CONFLICT (name) DO NOTHING;

-- Add foreign key constraint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_task_type_id_task_types_id_fk" FOREIGN KEY ("task_type_id") REFERENCES "task_types"("id") ON DELETE SET NULL ON UPDATE no action;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS "tasks_task_type_id_idx" ON "tasks"("task_type_id");

COMMIT;
