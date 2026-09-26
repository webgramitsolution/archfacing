-- Video is now a link, not an upload — YouTube or Dailymotion.
--
-- PDF §7.10.2 specified MP4 upload (20 MB), but taking a link in its place
-- is better: no storage is consumed on the server, the bandwidth cost is
-- borne by YouTube/Dailymotion, and 20 MB would barely hold one minute
-- of video.
--
-- The Media table is still empty, so there is no need to preserve the old
-- VIDEO / YOUTUBE_LINK values.

CREATE TYPE "VideoHost" AS ENUM ('YOUTUBE', 'DAILYMOTION');

BEGIN;
CREATE TYPE "MediaType_new" AS ENUM ('IMAGE', 'VIDEO_LINK', 'PDF', 'PPT', 'DOCUMENT');
ALTER TABLE "Media" ALTER COLUMN "type" TYPE "MediaType_new"
  USING (
    CASE "type"::text
      WHEN 'VIDEO' THEN 'VIDEO_LINK'
      WHEN 'YOUTUBE_LINK' THEN 'VIDEO_LINK'
      ELSE "type"::text
    END
  )::"MediaType_new";
ALTER TYPE "MediaType" RENAME TO "MediaType_old";
ALTER TYPE "MediaType_new" RENAME TO "MediaType";
DROP TYPE "public"."MediaType_old";
COMMIT;

ALTER TABLE "Media"
  ADD COLUMN "embedUrl"   TEXT,
  ADD COLUMN "storageKey" TEXT,
  ADD COLUMN "videoHost"  "VideoHost",
  ADD COLUMN "videoId"    TEXT,
  ALTER COLUMN "sizeBytes" SET DEFAULT 0;
