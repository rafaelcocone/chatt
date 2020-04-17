// Load module
var mysql = require('mysql');
// Initialize pool
var dbConnectionInfo =    mysql.createPool({
    //connectionLimit : 10,
    host: '74.208.166.96',
    user: 'asys',
    password: '1nt3gr4*2019',
    port: 5543,
    database: 'simulador',
    debug    :  false
});    
//create mysql connection pool
var dbconnection = mysql.createPool(
  dbConnectionInfo
);

// Attempt to catch disconnects 
dbconnection.on('connection', function (connection) {
  console.log('DB Connection established');

  connection.on('error', function (err) {
    console.error(new Date(), 'MySQL error', err.code);
  });
  connection.on('close', function (err) {
    console.error(new Date(), 'MySQL close', err);
  });

});


module.exports = dbconnection;


