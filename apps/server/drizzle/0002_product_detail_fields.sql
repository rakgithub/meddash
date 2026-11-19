ALTER TABLE "products" ADD COLUMN "sku" text;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "pzn" text;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "pack_size" text;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "dosage_form" text;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "active_ingredients" text[] DEFAULT '{}'::text[] NOT NULL;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "usage_instructions" text;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "warnings" text;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "requires_prescription" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "stock_quantity" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "manufacturer" text;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_sku_unique" UNIQUE("sku");