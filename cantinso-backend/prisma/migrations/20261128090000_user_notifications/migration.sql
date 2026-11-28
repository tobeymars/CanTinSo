CREATE TABLE "user_notifications" (
 "id" UUID NOT NULL,
 "recipient_id" UUID NOT NULL,
 "event_key" TEXT NOT NULL,
 "kind" TEXT NOT NULL,
 "title" TEXT NOT NULL,
 "body" TEXT NOT NULL,
 "target_path" TEXT NOT NULL,
 "school_id" UUID,
 "kitchen_id" UUID,
 "read_at" TIMESTAMP(3),
 "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT "user_notifications_pkey" PRIMARY KEY ("id"),
 CONSTRAINT "user_notifications_recipient_id_fkey" FOREIGN KEY ("recipient_id" ) REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "user_notifications_event_key_key" ON "user_notifications"("event_key");
CREATE INDEX "user_notifications_recipient_id_read_at_created_at_idx" ON "user_notifications"("recipient_id","read_at","created_at");
