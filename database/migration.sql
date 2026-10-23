-- Circlo Database Migration
-- Adds return deadline columns to borrow_requests, image_url to items, and notifications table.

USE circlo;

-- 1. Add image_url to items table if not present
SET @col_exists = 0;
SELECT COUNT(*) INTO @col_exists
FROM information_schema.COLUMNS
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME = 'items'
  AND COLUMN_NAME = 'image_url';

SET @stmt = IF(@col_exists = 0,
    'ALTER TABLE items ADD COLUMN image_url TEXT DEFAULT NULL AFTER status',
    'SELECT "image_url column already exists in items"'
);
PREPARE stmt FROM @stmt;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 2. Add approved_at and due_at to borrow_requests table if not present
SET @col_exists = 0;
SELECT COUNT(*) INTO @col_exists
FROM information_schema.COLUMNS
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME = 'borrow_requests'
  AND COLUMN_NAME = 'approved_at';

SET @stmt = IF(@col_exists = 0,
    'ALTER TABLE borrow_requests ADD COLUMN approved_at DATETIME DEFAULT NULL AFTER created_at',
    'SELECT "approved_at column already exists in borrow_requests"'
);
PREPARE stmt FROM @stmt;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @col_exists = 0;
SELECT COUNT(*) INTO @col_exists
FROM information_schema.COLUMNS
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME = 'borrow_requests'
  AND COLUMN_NAME = 'due_at';

SET @stmt = IF(@col_exists = 0,
    'ALTER TABLE borrow_requests ADD COLUMN due_at DATETIME DEFAULT NULL AFTER approved_at',
    'SELECT "due_at column already exists in borrow_requests"'
);
PREPARE stmt FROM @stmt;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 3. Backfill any existing Approved requests with default 7-day borrowing deadline
UPDATE borrow_requests
SET approved_at = created_at,
    due_at = DATE_ADD(created_at, INTERVAL 7 DAY)
WHERE status = 'Approved'
  AND approved_at IS NULL;

-- 4. Create notifications table for in-app overdue notifications
CREATE TABLE IF NOT EXISTS notifications (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    request_id INT NOT NULL,
    type VARCHAR(50) NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY unique_user_request_type (user_id, request_id, type),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (request_id) REFERENCES borrow_requests(id) ON DELETE CASCADE
);
