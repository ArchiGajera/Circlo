
// This section imports Express, the database connection and overdue notifications checker.
const express=require('express');
const router=express.Router();
const db=require('../db');
const {checkAndCreateOverdueNotifications}=require('./notifications');

// Configurable default borrowing period in days (defaults to 7 days)
const DEFAULT_BORROW_DAYS = parseInt(process.env.DEFAULT_BORROW_DAYS || '7', 10);

// This section creates a borrow request.
router.post('/',async(req,res)=>{
    try{
        const {item_id,borrower_id}=req.body;

        if(!item_id||!borrower_id){
            return res.status(400).json({
                message:'Item and borrower are required'
            });
        }

        const [items]=await db.execute(
            'SELECT * FROM items WHERE id=?',
            [item_id]
        );

        if(items.length===0){
            return res.status(404).json({
                message:'Item not found'
            });
        }

        if(items[0].status!=='Available'){
            return res.status(400).json({
                message:'Item is not available'
            });
        }

        if(Number(items[0].user_id)===Number(borrower_id)){
            return res.status(400).json({
                message:'You cannot borrow your own item'
            });
        }

        const [existing]=await db.execute(
            `SELECT id FROM borrow_requests
             WHERE item_id=? AND borrower_id=?
             AND status IN ('Pending','Approved')`,
            [item_id,borrower_id]
        );

        if(existing.length>0){
            return res.status(409).json({
                message:'You already have an active request'
            });
        }

        await db.execute(
            `INSERT INTO borrow_requests
            (item_id,borrower_id,status)
            VALUES (?,?,'Pending')`,
            [item_id,borrower_id]
        );

        res.status(201).json({
            message:'Borrow request sent successfully!'
        });
    }catch(err){
        console.error('Create request error:',err.message);
        res.status(500).json({
            message:'Could not create request'
        });
    }
});

// This section returns requests with item, owner and borrower names, due date, and overdue status.
router.get('/',async(req,res)=>{
    try{
        // Recheck overdue requests to keep notifications synchronized
        await checkAndCreateOverdueNotifications(db);

        const [requests]=await db.execute(`
            SELECT
                br.id,
                br.item_id,
                br.borrower_id,
                br.status,
                br.created_at,
                br.approved_at,
                br.due_at,
                CASE
                    WHEN br.status = 'Approved' AND br.due_at IS NOT NULL AND br.due_at < NOW() THEN 1
                    ELSE 0
                END AS is_overdue,
                i.name AS item_name,
                i.image_url,
                i.user_id AS owner_id,
                i.status AS item_status,
                owner.name AS owner_name,
                borrower.name AS borrower_name
            FROM borrow_requests br
            JOIN items i ON br.item_id=i.id
            JOIN users owner ON i.user_id=owner.id
            JOIN users borrower ON br.borrower_id=borrower.id
            ORDER BY br.created_at DESC
        `);

        res.json(requests);
    }catch(err){
        console.error('Fetch requests error:',err.message);
        res.status(500).json({
            message:'Could not fetch requests'
        });
    }
});

// This section approves or rejects a pending request.
router.put('/:id',async(req,res)=>{
    let connection;

    try{
        const {status}=req.body;

        if(!['Approved','Rejected'].includes(status)){
            return res.status(400).json({
                message:'Invalid request status'
            });
        }

        connection=await db.getConnection();
        await connection.beginTransaction();

        const [rows]=await connection.execute(
            'SELECT * FROM borrow_requests WHERE id=? FOR UPDATE',
            [req.params.id]
        );

        if(rows.length===0||rows[0].status!=='Pending'){
            await connection.rollback();
            return res.status(400).json({
                message:'Request not found or already processed'
            });
        }

        const [items]=await connection.execute(
            'SELECT * FROM items WHERE id=? FOR UPDATE',
            [rows[0].item_id]
        );

        if(items.length===0){
            await connection.rollback();
            return res.status(404).json({
                message:'Item not found'
            });
        }

        if(status==='Approved'){
            if(items[0].status!=='Available'){
                await connection.rollback();
                return res.status(400).json({
                    message:'Item is no longer available'
                });
            }

            await connection.execute(
                'UPDATE items SET status=? WHERE id=?',
                ['Borrowed',rows[0].item_id]
            );

            // Set approved timestamp and due date transactionally
            await connection.execute(
                `UPDATE borrow_requests
                 SET status='Approved', approved_at=NOW(), due_at=DATE_ADD(NOW(), INTERVAL ? DAY)
                 WHERE id=?`,
                [DEFAULT_BORROW_DAYS, req.params.id]
            );
        } else {
            // Rejected requests do not receive an approval or return deadline
            await connection.execute(
                'UPDATE borrow_requests SET status=? WHERE id=?',
                [status,req.params.id]
            );
        }

        await connection.commit();

        res.json({
            message:'Request '+status.toLowerCase()+' successfully'
        });
    }catch(err){
        if(connection){
            try{await connection.rollback();}catch(e){}
        }

        console.error('Update request error:',err.message);
        res.status(500).json({
            message:'Could not update request'
        });
    }finally{
        if(connection) connection.release();
    }
});

// This section returns an item after borrowing.
router.put('/:id/return',async(req,res)=>{
    let connection;

    try{
        connection=await db.getConnection();
        await connection.beginTransaction();

        const [rows]=await connection.execute(
            'SELECT * FROM borrow_requests WHERE id=? FOR UPDATE',
            [req.params.id]
        );

        if(rows.length===0||rows[0].status!=='Approved'){
            await connection.rollback();
            return res.status(400).json({
                message:'No active borrow request found'
            });
        }

        const [items]=await connection.execute(
            'SELECT * FROM items WHERE id=? FOR UPDATE',
            [rows[0].item_id]
        );

        if(items.length===0){
            await connection.rollback();
            return res.status(404).json({
                message:'Item not found'
            });
        }

        await connection.execute(
            'UPDATE borrow_requests SET status=? WHERE id=?',
            ['Returned',req.params.id]
        );

        await connection.execute(
            'UPDATE items SET status=? WHERE id=?',
            ['Available',rows[0].item_id]
        );

        await connection.commit();

        res.json({
            message:'Item returned successfully'
        });
    }catch(err){
        if(connection){
            try{await connection.rollback();}catch(e){}
        }

        console.error('Return item error:',err.message);
        res.status(500).json({
            message:'Could not return item'
        });
    }finally{
        if(connection) connection.release();
    }
});

// This section exports the request routes.
module.exports=router;
