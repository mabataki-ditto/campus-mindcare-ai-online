ALTER TABLE `KnowledgeArticle`
  ADD COLUMN `ragIndexStatus` VARCHAR(20) NOT NULL DEFAULT 'PENDING',
  ADD COLUMN `ragIndexedAt` DATETIME(3) NULL,
  ADD COLUMN `ragIndexError` VARCHAR(500) NULL;

CREATE TABLE `KnowledgeChunk` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `articleId` INTEGER NOT NULL,
  `chunkIndex` INTEGER NOT NULL,
  `title` VARCHAR(200) NOT NULL,
  `content` TEXT NOT NULL,
  `contentHash` VARCHAR(64) NOT NULL,
  `vectorId` VARCHAR(100) NOT NULL,
  `status` INTEGER NOT NULL DEFAULT 1,
  `metadata` TEXT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,

  UNIQUE INDEX `KnowledgeChunk_vectorId_key`(`vectorId`),
  INDEX `KnowledgeChunk_articleId_idx`(`articleId`),
  INDEX `KnowledgeChunk_status_idx`(`status`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE INDEX `KnowledgeArticle_ragIndexStatus_idx` ON `KnowledgeArticle`(`ragIndexStatus`);

ALTER TABLE `KnowledgeChunk`
  ADD CONSTRAINT `KnowledgeChunk_articleId_fkey`
  FOREIGN KEY (`articleId`) REFERENCES `KnowledgeArticle`(`id`)
  ON DELETE CASCADE ON UPDATE CASCADE;
