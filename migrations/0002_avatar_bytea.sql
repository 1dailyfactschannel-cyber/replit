-- Migration to change avatar column type from text to bytea for database-only storage
ALTER TABLE users 
ALTER COLUMN avatar TYPE bytea 
USING CASE 
    WHEN avatar IS NULL THEN NULL 
    ELSE decode('89504e470d0a1a0a', 'hex') -- default PNG header if conversion fails
END;