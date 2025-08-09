-- CreateTable
CREATE TABLE "public"."Friend" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "title" TEXT,
    "phoneNumber" TEXT,
    "email" TEXT NOT NULL,
    "xUsername" TEXT,
    "instagramUsername" TEXT,

    CONSTRAINT "Friend_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Friend_email_key" ON "public"."Friend"("email");
