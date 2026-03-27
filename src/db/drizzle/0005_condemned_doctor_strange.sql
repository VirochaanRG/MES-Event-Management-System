CREATE SEQUENCE "public"."shared_form_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1;--> statement-breakpoint
ALTER TABLE "form" ALTER COLUMN "id" SET DATA TYPE integer;--> statement-breakpoint
ALTER TABLE "form" ALTER COLUMN "id" SET DEFAULT nextval('shared_form_id_seq');--> statement-breakpoint
ALTER TABLE "form_conditions" ALTER COLUMN "form_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "form_conditions" ALTER COLUMN "dependent_form_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "modular_forms" ALTER COLUMN "id" SET DATA TYPE integer;--> statement-breakpoint
ALTER TABLE "modular_forms" ALTER COLUMN "id" SET DEFAULT nextval('shared_form_id_seq');--> statement-breakpoint
ALTER TABLE "form_conditions" ADD COLUMN "mod_form_id" integer;--> statement-breakpoint
ALTER TABLE "form_conditions" ADD COLUMN "dependent_mod_form_id" integer;--> statement-breakpoint
ALTER TABLE "form_conditions" ADD CONSTRAINT "form_conditions_mod_form_id_modular_forms_id_fk" FOREIGN KEY ("mod_form_id") REFERENCES "public"."modular_forms"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "form_conditions" ADD CONSTRAINT "form_conditions_dependent_mod_form_id_modular_forms_id_fk" FOREIGN KEY ("dependent_mod_form_id") REFERENCES "public"."modular_forms"("id") ON DELETE cascade ON UPDATE no action;