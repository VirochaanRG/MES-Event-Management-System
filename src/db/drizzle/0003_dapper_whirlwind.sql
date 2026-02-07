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
