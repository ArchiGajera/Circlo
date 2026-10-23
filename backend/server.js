/* This section imports the required packages. */
const express=require('express');
const cors=require('cors');
const path=require('path');
const db=require('./db');

/* This section imports all API routes. */
const users=require('./routes/users');
const items=require('./routes/items');
const requests=require('./routes/requests');
const ratings=require('./routes/ratings');
const {router:notifications,checkAndCreateOverdueNotifications}=require('./routes/notifications');

const DEFAULT_BORROW_DAYS = parseInt(process.env.DEFAULT_BORROW_DAYS || '7', 10);

/* This section initializes the Express application. */
const app=express();
app.use(cors());
app.use(express.json());

// This section serves the frontend files and uploaded item images.
app.use(express.static(path.join(__dirname,'../frontend')));
app.use('/uploads',express.static(path.join(__dirname,'uploads')));

/* This section connects the API routes. */
app.use('/api/users',users);
app.use('/api/items',items);
app.use('/api/requests',requests);
app.use('/api/ratings',ratings);
app.use('/api/notifications',notifications);

/* This section provides health and Vercel cron endpoints. */
app.get('/api/health',(req,res)=>{
    res.json({message:'Circlo server is running!'});
});

app.get('/api/cron/check-overdue',async(req,res)=>{
    try{
        const count=await checkAndCreateOverdueNotifications(db);
        res.json({status:'ok',overdueCount:count});
    }catch(err){
        res.status(500).json({status:'error',message:err.message});
    }
});

/* This section automatically approves eligible pending requests. */
async function autoApproveRequests(){
    let connection;

    try{
        connection=await db.getConnection();

        const [pending]=await connection.execute(`
            SELECT id
            FROM borrow_requests
            WHERE status='Pending'
            AND created_at<=NOW()-INTERVAL 15 MINUTE
        `);

        for(const request of pending){
            await connection.beginTransaction();

            try{
                const [rows]=await connection.execute(
                    'SELECT * FROM borrow_requests WHERE id=? FOR UPDATE',
                    [request.id]
                );

                if(rows.length===0||rows[0].status!=='Pending'){
                    await connection.rollback();
                    continue;
                }

                const [items]=await connection.execute(
                    'SELECT * FROM items WHERE id=? FOR UPDATE',
                    [rows[0].item_id]
                );

                if(items.length===0||items[0].status!=='Available'){
                    await connection.execute(
                        "UPDATE borrow_requests SET status='Rejected' WHERE id=?",
                        [request.id]
                    );
                }else{
                    await connection.execute(
                        "UPDATE items SET status='Borrowed' WHERE id=?",
                        [rows[0].item_id]
                    );

                    await connection.execute(
                        `UPDATE borrow_requests
                         SET status='Approved', approved_at=NOW(), due_at=DATE_ADD(NOW(), INTERVAL ? DAY)
                         WHERE id=?`,
                        [DEFAULT_BORROW_DAYS, request.id]
                    );
                }

                await connection.commit();
            }catch(err){
                await connection.rollback();
                throw err;
            }
        }
    }catch(err){
        console.error('Auto-approval error:',err.message);
    }finally{
        if(connection) connection.release();
    }
}

/* This section runs background maintenance: auto-approval and overdue notifications. */
function runPeriodicTasks(){
    autoApproveRequests();
    checkAndCreateOverdueNotifications(db);
}

runPeriodicTasks();
setInterval(runPeriodicTasks,30000);

/* This section checks pending requests every 30 seconds. */
autoApproveRequests();
setInterval(autoApproveRequests,30000);

module.exports=app;