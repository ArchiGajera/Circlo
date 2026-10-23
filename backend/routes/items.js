
// This section imports Express, the database connection and storage upload utilities.
const express=require('express');
const router=express.Router();
const db=require('../db');
const {upload,saveUploadedImage}=require('../storage');

// This section returns all shared items with their owner's name and image.
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
                i.image_url,
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

// Middleware to handle multer file upload and handle validation errors cleanly.
function handleUpload(req,res,next){
    upload.single('image')(req,res,(err)=>{
        if(err){
            if(err.code==='LIMIT_FILE_SIZE'){
                return res.status(400).json({
                    message:'File is too large. Maximum allowed size is 5 MB.'
                });
            }
            return res.status(400).json({
                message:err.message||'Image upload failed'
            });
        }
        next();
    });
}

// This section publishes an item under its owner's account, optionally with an image.
router.post('/',handleUpload,async(req,res)=>{
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

        let imageUrl=null;
        if(req.file){
            imageUrl=await saveUploadedImage(req.file);
        }

        const [result]=await db.execute(
            `INSERT INTO items
            (user_id,name,category,description,status,image_url)
            VALUES (?,?,?,?, 'Available', ?)`,
            [user_id,name.trim(),category,description,imageUrl]
        );

        res.status(201).json({
            message:'Item shared successfully!',
            itemId:result.insertId,
            image_url:imageUrl
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
