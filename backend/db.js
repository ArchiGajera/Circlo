/* Connect Circlo to MySQL. */
const mysql=require('mysql2/promise');

const isProduction=process.env.NODE_ENV==='production';

if(isProduction&&(!process.env.DB_HOST||!process.env.DB_USER||!process.env.DB_PASSWORD||!process.env.DB_NAME)){
    throw new Error('Missing production database environment variables');
}

const db=mysql.createPool({
    host:process.env.DB_HOST||(isProduction?undefined:'localhost'),
    port:Number(process.env.DB_PORT)||3306,
    user:process.env.DB_USER||(isProduction?undefined:'root'),
    password:process.env.DB_PASSWORD??(isProduction?undefined:''),
    database:process.env.DB_NAME||(isProduction?undefined:'circlo'),
    waitForConnections:true,
    connectionLimit:10,
    queueLimit:0
});

module.exports=db;
