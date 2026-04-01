ALTER TABLE "profiles" RENAME COLUMN "field_of_study" TO "faculty";--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "program" varchar(150);