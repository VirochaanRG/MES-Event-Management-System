CREATE TABLE "event_forms" (
	"id" serial PRIMARY KEY NOT NULL,
	"event_id" integer NOT NULL,
	"form_id" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "event_form_unique" UNIQUE("event_id","form_id")
);
--> statement-breakpoint
ALTER TABLE "event_forms" ADD CONSTRAINT "event_forms_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_forms" ADD CONSTRAINT "event_forms_form_id_form_id_fk" FOREIGN KEY ("form_id") REFERENCES "public"."form"("id") ON DELETE cascade ON UPDATE no action;