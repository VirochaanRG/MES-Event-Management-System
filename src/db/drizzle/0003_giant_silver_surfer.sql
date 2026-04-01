CREATE TABLE "form_conditions" (
	"id" serial PRIMARY KEY NOT NULL,
	"form_id" integer NOT NULL,
	"condition_type" text NOT NULL,
	"dependent_form_id" integer NOT NULL,
	"dependent_question_id" integer,
	"dependent_answer_idx" integer
);
--> statement-breakpoint
CREATE TABLE "profiles" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"first_name" varchar(100) NOT NULL,
	"last_name" varchar(100) NOT NULL,
	"is_mcmaster_student" boolean DEFAULT false NOT NULL,
	"field_of_study" varchar(255),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "profiles_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
ALTER TABLE "form" ALTER COLUMN "is_public" SET DEFAULT false;--> statement-breakpoint
ALTER TABLE "form" ADD COLUMN "unlock_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "modular_forms" ADD COLUMN "is_public" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "form_conditions" ADD CONSTRAINT "form_conditions_form_id_form_id_fk" FOREIGN KEY ("form_id") REFERENCES "public"."form"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "form_conditions" ADD CONSTRAINT "form_conditions_dependent_form_id_form_id_fk" FOREIGN KEY ("dependent_form_id") REFERENCES "public"."form"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "form_conditions" ADD CONSTRAINT "form_conditions_dependent_question_id_form_questions_id_fk" FOREIGN KEY ("dependent_question_id") REFERENCES "public"."form_questions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;