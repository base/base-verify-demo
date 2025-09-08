-- CreateTable
CREATE TABLE "verified_users" (
    "id" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "base_verify_token" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "verified_users_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "verified_users_address_key" ON "verified_users"("address");

-- CreateIndex
CREATE UNIQUE INDEX "verified_users_base_verify_token_key" ON "verified_users"("base_verify_token");
