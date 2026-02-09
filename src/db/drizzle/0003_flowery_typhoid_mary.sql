CREATE TABLE "modular_forms" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "images" (
	"id" serial PRIMARY KEY NOT NULL,
	"image_data" "bytea" NOT NULL,
	"component" varchar(255) NOT NULL,
	"index" integer,
	"file_name" varchar(255),
	"mime_type" varchar(100),
	"file_size" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN "registration_form" json;--> statement-breakpoint
ALTER TABLE "registered_users" ADD COLUMN "details" json;--> statement-breakpoint
ALTER TABLE "form" ADD COLUMN "module_id" integer;--> statement-breakpoint
ALTER TABLE "form" ADD CONSTRAINT "form_module_id_modular_forms_id_fk" FOREIGN KEY ("module_id") REFERENCES "public"."modular_forms"("id") ON DELETE cascade ON UPDATE no action;