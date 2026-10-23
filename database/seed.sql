
-- This section selects the Circlo database.
USE circlo;

-- This section creates demo accounts for sample item owners.
INSERT INTO users (name,email,password)
VALUES
('circlo_owner','demo@circlo.com','demo123'),
('Community Member','member@circlo.com','member123')
ON DUPLICATE KEY UPDATE name=VALUES(name);

-- This section adds sample items only when they do not already exist.
INSERT INTO items (user_id,name,category,description,status,image_url)
SELECT u.id,s.name,s.category,s.description,'Available',s.image_url
FROM users u
JOIN (
    SELECT 'Library Book Set' AS name,'Books' AS category,
           'A collection of novels and study books.' AS description,
           'https://images.unsplash.com/photo-1512820790803-83ca734da794?w=600&auto=format&fit=crop&q=80' AS image_url
    UNION ALL
    SELECT 'Wireless Headphones','Electronics',
           'Wireless headphones for study and music.',
           'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600&auto=format&fit=crop&q=80'
    UNION ALL
    SELECT 'Football','Sports',
           'A football available for weekend games.',
           'https://images.unsplash.com/photo-1579952363873-27f3bade9f55?w=600&auto=format&fit=crop&q=80'
    UNION ALL
    SELECT 'Digital Camera','Electronics',
           'A digital camera for trips and events.',
           'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=600&auto=format&fit=crop&q=80'
    UNION ALL
    SELECT 'Power Drill','Home',
           'A useful drill for small home projects.',
           'https://images.unsplash.com/photo-1504148455328-c376907d081c?w=600&auto=format&fit=crop&q=80'
    UNION ALL
    SELECT 'Yoga Mat','Sports',
           'A comfortable mat for yoga and exercise.',
           'https://images.unsplash.com/photo-1601925260368-ae2f83cf8b7f?w=600&auto=format&fit=crop&q=80'
    UNION ALL
    SELECT 'Scientific Calculator','Books',
           'A calculator for college mathematics.',
           'https://images.unsplash.com/photo-1594980596870-8aa52a78d8cd?w=600&auto=format&fit=crop&q=80'
    UNION ALL
    SELECT 'Table Lamp','Home',
           'A desk lamp suitable for studying.',
           'https://images.unsplash.com/photo-1507473885765-e6ed057f782c?w=600&auto=format&fit=crop&q=80'
) s
WHERE u.email='demo@circlo.com'
AND NOT EXISTS (
    SELECT 1 FROM items i
    WHERE i.user_id=u.id AND i.name=s.name
);
