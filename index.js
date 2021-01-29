'use strict'

var fs = require('fs'),
    puerto = 3000,
    https = require('https');
const mysql = require('mysql'),
      express = require('express'),
      app = express(),
      mensajero = mysql.createConnection({
        host: '74.208.166.96',
        user: 'asys',
        password: '1nt3gr4*2019',
        port: 5543,
        database: 'simula20',
        queueLimit: 0,
        waitForConnection: true
      }),
      options = {
        key:  fs.readFileSync('key.pem'),
        cert: fs.readFileSync('cert.pem')
      };
//inicializa el servoidor
//settieng
app.set('port', process.env.PORT || puerto);
//websocket
const server = https.createServer(options, app),
      SocketIO = require('socket.io');
const  io = SocketIO(server);
server.listen(app.get('port'), () => { console.log("server port",app.get('port')) });

var promise = new Promise(function (resolve, reject){
    //coneccion a la base de datos
    mensajero.connect(function(err){
      return (err) ? reject ( new Error('Error en la coneccion de la base de datos notifer') ) :resolve (mensajero)
    });
})


promise
  .then( (resolve, reject) => {
    console.log('Conexion DB correcta.')
    /*************************************** */

    io.on('connection', (socket) => {
        var item = {},
            _id_doom = "",
            _user = "",
            _username = "";

        // when the client emits 'add user', this listens and executes
        socket.on('add user', (data) => {        
            _id_doom  = data.id_room;
            _user     = data.id_origen;
            _username = data.username;
            let resultados = [];
        
            let id_room = data.id_room;
            let participantes = 0//addRoom(data.id_room)

            socket.join('chat-'+data.id_room)
            io.in('chat-'+data.id_room).clients((error, clients) => {
                if (error)  {
                  console.log('Error: connection cliente: '.data.id_room);
                  console.log(err);
                } else{
                  
                  participantes = clients.length
                  resultados = []
                  //console.log(participantes)
                  if(clients.length > 0){
                    var sql =  " SELECT * FROM( SELECT comunicacionDtRoomMensajes.id_users_envio AS 'user', "
                        sql += "    comunicacionDtRoomMensajes.id_comunicacionCtRoom AS 'id_room',";
                        sql += "    users.name AS 'username',"; 
                        sql += "    comunicacionDtRoomMensajes.mensaje AS 'message',";
                        sql += "     DATE_FORMAT(comunicacionDtRoomMensajes.created_at,  '%H %i  %W %M %e %Y') AS 'fecha',"; 
                        sql += "    comunicacionDtRoomMensajes.created_at AS 'DATE'" 
                        sql += " FROM comunicacionDtRoomMensajes "; 
                        sql += " INNER JOIN users ON users.id =  comunicacionDtRoomMensajes.id_users_envio ";
                        sql += " WHERE comunicacionDtRoomMensajes.id_comunicacionCtRoom = ? AND comunicacionDtRoomMensajes.state = 'A' Order By comunicacionDtRoomMensajes.created_at DESC LIMIT 10 ";   
                        sql += " ) sub ORDER BY DATE ASC;"
                      resolve.query(sql, [id_room], function (err, result) {
                      if (err){
                        
                        console.log(err)
                      } else{
                     
                        socket.emit('login', {
                          username: data.username,
                          id_origen: data.id_origen,
                          id_room:  id_room,
                          resultados: result
                        });
                      }
                    });
  
                    if(clients.length > 1){
                      io.to('chat-'+data.id_room).emit('user joined', {
                        username: data.username,
                        id_origen: data.id_origen,
                        id_room:  id_room
                      });
                    }
                  }
                }
                
              });
          
            // when the client emits 'typing', we broadcast it to others
            socket.on('typing', (data) => {
              socket.to(data.grupos).emit('typing', {
                username: socket.username
              });
            });
        
            // when the client emits 'stop typing', we broadcast it to others
            socket.on('stop typing', (data) => {
              socket.to(data.grupos).emit('stop typing', {
                  username: socket.username
              });
            });
        
            socket.on('disconnect', (reason) => {  
              socket.to('chat-'+_id_doom).emit('user left', {
                  username: _username,
                  id_origen:_user,
                  id_room:  _id_doom
              });
            });


        })

    });
    /**************************************** */
    /**************************************** */
  })
  .catch( (err) => {
    console.log('Db:')
    console.log(err)} )



    /**/