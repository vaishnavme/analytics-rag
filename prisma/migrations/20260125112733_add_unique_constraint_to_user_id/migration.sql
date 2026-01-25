/*
  Warnings:

  - A unique constraint covering the columns `[user_id]` on the table `user_embeddings` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "user_embeddings_user_id_key" ON "user_embeddings"("user_id");
