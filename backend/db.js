// This section connects the backend to the MySQL database.
const mysql=require('mysql2/promise');

// This section creates a connection pool.
const db=mysql.createPool({
    host:'localhost',
    user:'root',
    password:'',
    database:'circlo'
});

// This section exports the database connection.
module.exports=db;
