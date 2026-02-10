ALTER TABLE "qr_codes" ADD COLUMN "content" varchar(255) NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "qr_code_idx" ON "qr_codes" USING btree ("content");