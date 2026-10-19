
// This section imports Express and the database connection.
const express=require('express');
const router=express.Router();
const db=require('../db');

// This section returns all shared items with their owner's name.
router.get('/',async(req,res)=>{
    try{
        const {search='',category='',status=''}=req.query;

        let sql=`
            SELECT
                i.id,
                i.user_id,
                i.name,
                i.category,
                i.description,
                i.status,
                u.name AS owner_name
            FROM items i
            JOIN users u ON i.user_id=u.id
            WHERE 1=1
        `;

        const values=[];

        if(search){
            sql+=' AND i.name LIKE ?';
            values.push('%'+search+'%');
        }

        if(category){
            sql+=' AND i.category=?';
            values.push(category);
        }

        if(status){
            sql+=' AND i.status=?';
            values.push(status);
        }

        sql+=' ORDER BY i.id DESC';

        const [items]=await db.execute(sql,values);
        res.json(items);
    }catch(err){
        console.error('Fetch items error:',err.message);
        res.status(500).json({
            message:'Could not fetch items'
        });
    }
});

// This section publishes an item under its owner's account.
router.post('/',async(req,res)=>{
    try{
        const {user_id,name,category,description=''}=req.body;

        if(!user_id||!name?.trim()||!category){
            return res.status(400).json({
                message:'Owner, item name and category are required'
            });
        }

        const [users]=await db.execute(
            'SELECT id FROM users WHERE id=?',
            [user_id]
        );

        if(users.length===0){
            return res.status(400).json({
                message:'Owner account not found'
            });
        }

        await db.execute(
            `INSERT INTO items
            (user_id,name,category,description,status)
            VALUES (?,?,?,?, 'Available')`,
            [user_id,name.trim(),category,description]
        );

        res.status(201).json({
            message:'Item shared successfully!'
        });
    }catch(err){
        console.error('Add item error:',err.message);
        res.status(500).json({
            message:'Could not publish item'
        });
    }
});

// This section exports the item routes.
module.exports=router;
