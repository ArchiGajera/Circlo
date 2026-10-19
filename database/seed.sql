
-- This section selects the Circlo database.
USE circlo;

-- This section creates demo accounts for sample item owners.
INSERT INTO users (name,email,password)
VALUES
('Demo User','demo@circlo.com','demo123'),
('Community Member','member@circlo.com','member123')
ON DUPLICATE KEY UPDATE name=VALUES(name);

-- This section adds sample items only when they do not already exist.
INSERT INTO items (user_id,name,category,description,status)
SELECT u.id,s.name,s.category,s.description,'Available'
FROM users u
JOIN (
    SELECT 'Library Book Set' AS name,'Books' AS category,
           'A collection of novels and study books.' AS description
    UNION ALL
    SELECT 'Wireless Headphones','Electronics',
           'Wireless headphones for study and music.'
    UNION ALL
    SELECT 'Football','Sports',
           'A football available for weekend games.'
    UNION ALL
    SELECT 'Digital Camera','Electronics',
           'A digital camera for trips and events.'
    UNION ALL
    SELECT 'Power Drill','Home',
           'A useful drill for small home projects.'
    UNION ALL
    SELECT 'Yoga Mat','Sports',
           'A comfortable mat for yoga and exercise.'
    UNION ALL
    SELECT 'Scientific Calculator','Books',
           'A calculator for college mathematics.'
    UNION ALL
    SELECT 'Table Lamp','Home',
           'A desk lamp suitable for studying.'
) s
WHERE u.email='demo@circlo.com'
AND NOT EXISTS (
    SELECT 1 FROM items i
    WHERE i.user_id=u.id AND i.name=s.name
);
