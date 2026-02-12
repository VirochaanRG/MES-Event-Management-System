CREATE TABLE "form_conditions" (
	"id" serial PRIMARY KEY NOT NULL,
	"form_id" integer NOT NULL,
	"condition_type" text NOT NULL,
	"question_id" integer NOT NULL,
	"required_options" json
);
--> statement-breakpoint
ALTER TABLE "form" ALTER COLUMN "is_public" SET DEFAULT false;--> statement-breakpoint
ALTER TABLE "modular_forms" ADD COLUMN "is_public" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "form_conditions" ADD CONSTRAINT "form_conditions_form_id_form_id_fk" FOREIGN KEY ("form_id") REFERENCES "public"."form"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "form_conditions" ADD CONSTRAINT "form_conditions_question_id_form_questions_id_fk" FOREIGN KEY ("question_id") REFERENCES "public"."form_questions"("id") ON DELETE cascade ON UPDATE no action;