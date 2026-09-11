-- Phase 4 Slice E: Try-On History
-- Add try_on_history column to settings for storing recently tried-on items

-- Add try_on_history column to settings
ALTER TABLE settings ADD COLUMN IF NOT EXISTS try_on_history JSONB DEFAULT '{}';

-- The structure is:
-- {
--   "items": {
--     "item_id_1": "2025-05-20T12:00:00Z",
--     "item_id_2": "2025-05-19T14:30:00Z"
--   }
-- }
-- Items older than 7 days should be cleaned up client-side when reading
