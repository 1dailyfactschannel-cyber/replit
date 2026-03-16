-- Migration: Make calls.receiver_id nullable for group calls
-- Created: 2026-03-11

-- Alter calls table to make receiver_id nullable
ALTER TABLE calls ALTER COLUMN receiver_id DROP NOT NULL;
