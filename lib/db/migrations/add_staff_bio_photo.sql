-- Migration: add bio and photo_url to staff_members
ALTER TABLE staff_members
  ADD COLUMN IF NOT EXISTS bio TEXT,
  ADD COLUMN IF NOT EXISTS photo_url TEXT;
