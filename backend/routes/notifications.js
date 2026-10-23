/**
 * In-app notifications management and overdue borrowing verification.
 */
const express = require('express');
const router = express.Router();
const db = require('../db');

/**
 * Checks for approved borrowing requests past their return deadline,
 * transactionally creating notifications for both borrower and owner without duplicates.
 */
async function checkAndCreateOverdueNotifications(database) {
    try {
        const [overdue] = await database.execute(`
            SELECT
                br.id AS request_id,
                br.item_id,
                br.borrower_id,
                br.due_at,
                i.name AS item_name,
                i.user_id AS owner_id,
                owner.name AS owner_name,
                borrower.name AS borrower_name
            FROM borrow_requests br
            JOIN items i ON br.item_id = i.id
            JOIN users owner ON i.user_id = owner.id
            JOIN users borrower ON br.borrower_id = borrower.id
            WHERE br.status = 'Approved'
              AND br.due_at IS NOT NULL
              AND br.due_at < NOW()
        `);

        for (const req of overdue) {
            const dueDateStr = new Date(req.due_at).toLocaleDateString(undefined, {
                month: 'short',
                day: 'numeric',
                year: 'numeric'
            });

            // 1. Borrower notification
            const borrowerMsg = `Overdue alert: "${req.item_name}" borrowed from ${req.owner_name} was due on ${dueDateStr}. Please return it to the owner.`;
            await database.execute(
                `INSERT IGNORE INTO notifications (user_id, request_id, type, message)
                 VALUES (?, ?, 'overdue_borrower', ?)`,
                [req.borrower_id, req.request_id, borrowerMsg]
            );

            // 2. Owner notification
            const ownerMsg = `Overdue alert: Your item "${req.item_name}" borrowed by ${req.borrower_name} was due on ${dueDateStr} and has not yet been returned.`;
            await database.execute(
                `INSERT IGNORE INTO notifications (user_id, request_id, type, message)
                 VALUES (?, ?, 'overdue_owner', ?)`,
                [req.owner_id, req.request_id, ownerMsg]
            );
        }

        return overdue.length;
    } catch (err) {
        console.error('Check overdue notifications error:', err.message);
        return 0;
    }
}

// GET /api/notifications?user_id=1
router.get('/', async (req, res) => {
    try {
        const userId = Number(req.query.user_id);
        if (!userId) {
            return res.status(400).json({ message: 'User ID is required' });
        }

        // Recheck overdue status to ensure fresh state
        await checkAndCreateOverdueNotifications(db);

        const [notifications] = await db.execute(
            `SELECT id, user_id, request_id, type, message, is_read, created_at
             FROM notifications
             WHERE user_id = ?
             ORDER BY is_read ASC, created_at DESC
             LIMIT 20`,
            [userId]
        );

        res.json(notifications);
    } catch (err) {
        console.error('Fetch notifications error:', err.message);
        res.status(500).json({ message: 'Could not fetch notifications' });
    }
});

// PUT /api/notifications/:id/read
router.put('/:id/read', async (req, res) => {
    try {
        await db.execute(
            'UPDATE notifications SET is_read = TRUE WHERE id = ?',
            [req.params.id]
        );
        res.json({ message: 'Notification marked as read' });
    } catch (err) {
        console.error('Mark notification read error:', err.message);
        res.status(500).json({ message: 'Could not update notification' });
    }
});

// PUT /api/notifications/read-all
router.put('/read-all', async (req, res) => {
    try {
        const { user_id } = req.body;
        if (!user_id) {
            return res.status(400).json({ message: 'User ID is required' });
        }

        await db.execute(
            'UPDATE notifications SET is_read = TRUE WHERE user_id = ?',
            [user_id]
        );
        res.json({ message: 'All notifications marked as read' });
    } catch (err) {
        console.error('Mark all read error:', err.message);
        res.status(500).json({ message: 'Could not update notifications' });
    }
});

// GET /api/notifications/check-overdue (for manual check or Vercel cron)
router.get('/check-overdue', async (req, res) => {
    try {
        const count = await checkAndCreateOverdueNotifications(db);
        res.json({
            message: `Overdue check completed. Found ${count} overdue request(s).`,
            overdueCount: count
        });
    } catch (err) {
        res.status(500).json({ message: 'Overdue check failed' });
    }
});

module.exports = {
    router,
    checkAndCreateOverdueNotifications
};
