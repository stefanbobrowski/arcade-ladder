-- Migration 002: add username_changed_at column for rate-limiting username changes
-- Run once against existing databases:
--   gcloud sql connect arcade-ladder-db --user=arcadeladder_user --database=arcadeladder --project=arcade-ladder
--   \i 002_username_changed_at.sql

ALTER TABLE users ADD COLUMN IF NOT EXISTS username_changed_at TIMESTAMPTZ;
