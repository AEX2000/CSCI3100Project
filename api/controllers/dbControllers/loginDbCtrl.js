const mysql = require('mysql2')

const pool = mysql.createPool({
    host: 'localhost',
    user: 'CSCI3100Project',
    password: 'smgg',
    database: 'gobang',
    port: '3306',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
})

// Given the user name, this function will return te user's password
async function getUserInformation(username){
    return new Promise((resolve,reject) => {
        pool.getConnection((err,connection)=>{
            if(err){
                console.log("DATABASE CONNECTION ERROR:",err);
                reject(err);
            }
            else{
                connection.query('SELECT password FROM user WHERE Username= ? ;',[username],(err,results)=>{
                    if(err){
                        console.log("DATABASE QUERY ERROR:",err);
                        reject(err);
                    }else{
                        resolve(results);
                    }
                });
            }
        });
    });
}

function modifyUserScore(username,operation){
    
}

module.exports = getUserInformation;