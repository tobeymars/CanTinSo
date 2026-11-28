ALTER TABLE "suppliers" ADD COLUMN "note" TEXT;
CREATE TABLE "supplier_documents" (
 "id" UUID NOT NULL, "supplier_id" UUID NOT NULL, "category" TEXT NOT NULL, "receipt_id" UUID,
 "filename" TEXT NOT NULL, "mime_type" TEXT NOT NULL, "size" INTEGER NOT NULL,
 "data" BYTEA NOT NULL, "document_number" TEXT, "issuer" TEXT,
 "issued_at" DATE, "expires_at" DATE, "uploaded_by_id" UUID NOT NULL,
 "is_archived" BOOLEAN NOT NULL DEFAULT FALSE, "archived_by_id" UUID, "archived_at" TIMESTAMP(3),
 "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT "supplier_documents_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "supplier_documents_supplier_id_is_archived_idx" ON "supplier_documents"("supplier_id","is_archived");
ALTER TABLE "supplier_documents" ADD CONSTRAINT "supplier_documents_supplier_id_fkey"
 FOREIGN KEY ("supplier_id") REFERENCES "suppliers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE INDEX "supplier_documents_receipt_id_idx" ON "supplier_documents"("receipt_id");
ALTER TABLE "supplier_documents" ADD CONSTRAINT "supplier_documents_receipt_id_fkey" FOREIGN KEY ("receipt_id") REFERENCES "purchase_receipts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
