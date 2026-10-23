
// This section imports Express and the database connection.
const express=require('express');
const router=express.Router();
const db=require('../db');

// This section fetches ratings with reviewer, reviewed user, and item names.
router.get('/',async(req,res)=>{
    try{
        const [ratings]=await db.execute(`
            SELECT r.id,r.reviewer_id,r.user_id,r.item_id,r.rating,r.comment,
                   reviewer.name AS reviewer_name,
                   reviewed.name AS reviewed_name,
                   i.name AS item_name
            FROM ratings r
            JOIN users reviewer ON r.reviewer_id=reviewer.id
            JOIN users reviewed ON r.user_id=reviewed.id
            LEFT JOIN items i ON r.item_id=i.id
            ORDER BY r.id DESC
        `);

        res.json(ratings);
    }catch(err){
        console.error('Fetch ratings error:',err.message);
        res.status(500).json({message:'Could not fetch ratings'});
    }
});

// This section submits a rating for a community member.
router.post('/',async(req,res)=>{
    try{
        const {reviewer_id,user_id,item_id=null,rating,comment=''}=req.body;

        if(!reviewer_id||!user_id||!Number.isInteger(Number(rating))||
           Number(rating)<1||Number(rating)>5){
            return res.status(400).json({
                message:'Valid users and a rating from 1 to 5 are required'
            });
        }

        if(Number(reviewer_id)===Number(user_id)){
            return res.status(400).json({
                message:'You cannot rate yourself'
            });
        }

        const [users]=await db.execute(
            'SELECT id FROM users WHERE id IN (?,?)',
            [reviewer_id,user_id]
        );

        if(users.length!==2){
            return res.status(400).json({message:'User not found'});
        }

        // This section saves the submitted rating and feedback with item.
        const [result]=await db.execute(
            `INSERT INTO ratings (reviewer_id,user_id,item_id,rating,comment)
             VALUES (?,?,?,?,?)`,
            [reviewer_id,user_id,item_id||null,Number(rating),comment.trim()]
        );

        res.status(201).json({
            message:'Rating submitted successfully!',
            id:result.insertId,
            ratingId:result.insertId
        });
    }catch(err){
        console.error('Submit rating error:',err.message);
        res.status(500).json({message:'Could not submit rating'});
    }
});

// This section exports the rating routes.
module.exports=router;
