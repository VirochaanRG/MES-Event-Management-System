CREATE TABLE "form_questions" (
	"id" serial PRIMARY KEY NOT NULL,
	"form_id" integer NOT NULL,
	"question_type" varchar(100) NOT NULL,
	"question_title" text,
	"options_category" text,
	"qorder" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "form_questions" ADD CONSTRAINT "form_questions_form_id_form_id_fk" FOREIGN KEY ("form_id") REFERENCES "public"."form"("id") ON DELETE cascade ON UPDATE no action;