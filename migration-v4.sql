-- Enable full replica identity on the messages table so Supabase real-time
-- DELETE events include the old row (payload.old.id) and the client can
-- remove the correct message from state without needing to re-fetch.
ALTER TABLE messages REPLICA IDENTITY FULL;
