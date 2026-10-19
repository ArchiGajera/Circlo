
// This section imports Express, database and password tools.
const express=require('express');
const router=express.Router();
const db=require('../db');
const bcrypt=require('bcryptjs');

// This section registers a new user and returns the generated ID.
router.post('/register',async(req,res)=>{
    try{
        const {name,email,password}=req.body;

        if(!name?.trim()||!email?.trim()||!password){
            return res.status(400).json({message:'All fields are required'});
        }

        if(password.length<6){
            return res.status(400).json({message:'Password must be at least 6 characters'});
        }

        const [existing]=await db.execute(
            'SELECT id FROM users WHERE email=?',
            [email.trim().toLowerCase()]
        );

        if(existing.length){
            return res.status(409).json({message:'Email already registered'});
        }

        const hashedPassword=await bcrypt.hash(password,10);

        const [result]=await db.execute(
            'INSERT INTO users (name,email,password) VALUES (?,?,?)',
            [name.trim(),email.trim().toLowerCase(),hashedPassword]
        );

        res.status(201).json({
            message:'Registration successful!',
            user:{
                id:result.insertId,
                name:name.trim(),
                email:email.trim().toLowerCase()
            }
        });
    }catch(err){
        console.error('Registration error:', err);
        if(err.code==='ER_DUP_ENTRY'){
            return res.status(409).json({message:'Email already registered'});
        }
        if(err.code==='ECONNREFUSED'||err.code==='PROTOCOL_CONNECTION_LOST'){
            return res.status(503).json({message:'Database is unavailable. Please check that MySQL is running.'});
        }
        res.status(500).json({message:'Registration failed: '+(err.message||'Server error')});
    }
});

// This section logs in a registered user.
router.post('/login',async(req,res)=>{
    try{
        const {email,password}=req.body;

        if(!email||!password){
            return res.status(400).json({message:'Email and password are required'});
        }

        const [users]=await db.execute(
            'SELECT * FROM users WHERE email=?',
            [email.trim().toLowerCase()]
        );

        if(!users.length){
            return res.status(401).json({message:'Invalid email or password'});
        }

        const user=users[0];
        const valid=await bcrypt.compare(password,user.password);

        if(!valid){
            return res.status(401).json({message:'Invalid email or password'});
        }

        res.json({
            message:'Login successful!',
            user:{
                id:user.id,
                name:user.name,
                email:user.email
            }
        });
    }catch(err){
        console.error('Login error:', err);
        if(err.code==='ECONNREFUSED'||err.code==='PROTOCOL_CONNECTION_LOST'){
            return res.status(503).json({message:'Database is unavailable. Please check that MySQL is running.'});
        }
        res.status(500).json({message:'Login failed'});
    }
});

// This section returns registered users without their passwords.
router.get('/',async(req,res)=>{
    try{
        const [users]=await db.execute(
            'SELECT id,name,email FROM users'
        );
        res.json(users);
    }catch(err){
        console.error('Fetch users error:', err);
        res.status(500).json({message:'Could not fetch users'});
    }
});

// This section exports the user routes.
module.exports=router;
