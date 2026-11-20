CREATE TABLE "kitchen_legal_documents" (
"id" UUID NOT NULL,
"kitchen_id" UUID NOT NULL,
"title" TEXT NOT NULL,
"category" TEXT NOT NULL,
"applicability" TEXT NOT NULL DEFAULT 'conditional',
"status" TEXT NOT NULL DEFAULT 'missing',
"document_number" TEXT,
"issuer" TEXT,
"issued_at" DATE,
"expires_at" DATE,
"public_summary" TEXT NOT NULL DEFAULT '',
"note" TEXT NOT NULL DEFAULT '',
"created_by_id" UUID NOT NULL,
"updated_by_id" UUID NOT NULL,
"created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
"updated_at" TIMESTAMP(3) NOT NULL,
CONSTRAINT "kitchen_legal_documents_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "kitchen_legal_attachments" (
"id" UUID NOT NULL,
"document_id" UUID NOT NULL,
"name" TEXT NOT NULL,
"mime_type" TEXT NOT NULL,
"size" INTEGER NOT NULL,
"data" BYTEA NOT NULL,
"created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
CONSTRAINT "kitchen_legal_attachments_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "kitchen_legal_events" (
"id" UUID NOT NULL,
"document_id" UUID NOT NULL,
"actor_id" UUID NOT NULL,
"action" TEXT NOT NULL,
"details" JSONB,
"created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
CONSTRAINT "kitchen_legal_events_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "kitchen_legal_documents_kitchen_id_category_idx" ON "kitchen_legal_documents"("kitchen_id","category");
CREATE INDEX "kitchen_legal_documents_expires_at_idx" ON "kitchen_legal_documents"("expires_at");
CREATE INDEX "kitchen_legal_attachments_document_id_idx" ON "kitchen_legal_attachments"("document_id");
CREATE INDEX "kitchen_legal_events_document_id_created_at_idx" ON "kitchen_legal_events"("document_id","created_at");
ALTER TABLE "kitchen_legal_documents" ADD CONSTRAINT "kitchen_legal_documents_kitchen_id_fkey" FOREIGN KEY ("kitchen_id") REFERENCES "kitchens"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "kitchen_legal_attachments" ADD CONSTRAINT "kitchen_legal_attachments_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "kitchen_legal_documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "kitchen_legal_events" ADD CONSTRAINT "kitchen_legal_events_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "kitchen_legal_documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;
