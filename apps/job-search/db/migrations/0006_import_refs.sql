CREATE TABLE "import_refs" (
	"owner_id" uuid NOT NULL,
	"external_ref" text NOT NULL,
	"record_kind" text NOT NULL,
	"record_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "import_refs_owner_id_external_ref_idx" ON "import_refs" USING btree ("owner_id","external_ref");