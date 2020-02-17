var fs = require('fs')
var https = require('https')
const mysql = require('mysql')
const express = require('express');
const app = express();
//inicializa el servoidor
//settieng
app.set('port', process.env.PORT || 3000);
const mensajero = mysql.createConnection({
  host: '74.208.166.96',
  user: 'asys',
  password: '1nt3gr4*2019',
  port: 5543,
  database: 'simulador'
});
const options = {
  key:  fs.readFileSync('key.pem'),
  cert: fs.readFileSync('cert.pem')
};

const server = https.createServer(options, app);
//websocket
const SocketIO = require('socket.io');
const io = SocketIO(server);
server.listen(app.get('port'), () => { console.log("server port",app.get('port')) });

var roomAbiertas = [ ];
var usuariosActivos = [ ];

//coneccion a la base de datos
mensajero.connect(function(error){
    if(error){
       throw error;
    }else{
       console.log('Conexion correcta.');
    }
  });
    
io.on('connection', (socket) => {
    var item = {},
        _id_doom = "",
        _user = "",
        _username = "";

    socket.on('new message', (data) => {
      // we tell the client to execute 'new message'
      socket.to('chat-'+data.id_room).emit('new message', {//socket.broadcast.emit('new message', {//
        username: data.username,
        message:  data.message, 
        id_room:  data.id_room, 
        user:     data.user, 
      });
      var sql = "INSERT INTO comunicacionDtRoomMensajes (mensaje,state, id_comunicacionCtRoom, id_users_envio) VALUES ?";
      var values = [
        [data.message, 'A',data.id_room,data.user]
      ];
      mensajero.query(sql, [values], function (err, result) {
        if (err){
          console.log(err);
         
        } 
      });

    });
  
    // when the client emits 'add user', this listens and executes
    socket.on('add user', (data) => {
      socket.join('chat-'+data.id_room, () => {
        _id_doom  = data.id_room;
        _user     = data.id_origen;
        _username = data.username;
  
      let id_room = data.id_room;
      let participantes = 0//addRoom(data.id_room)
     
          io.in('chat-'+data.id_room).clients((error, clients) => {
            if (error)   
              console.log(err);

            participantes = clients.length
            if(clients.length > 0){
              var sql =  " SELECT * FROM( SELECT comunicacionDtRoomMensajes.id_users_envio AS 'user', "
                  sql += "    comunicacionDtRoomMensajes.id_comunicacionCtRoom AS 'id_room',";
                  sql += "    users.name AS 'username',"; 
                  sql += "    comunicacionDtRoomMensajes.mensaje AS 'message',";
                  sql += "    comunicacionDtRoomMensajes.created_at AS 'DATE'" 
                  sql += " FROM comunicacionDtRoomMensajes "; 
                  sql += " INNER JOIN users ON users.id =  comunicacionDtRoomMensajes.id_users_envio ";
                  sql += " WHERE comunicacionDtRoomMensajes.id_comunicacionCtRoom = ? AND comunicacionDtRoomMensajes.state = 'A' Order By comunicacionDtRoomMensajes.created_at DESC LIMIT 10 ";   
                  sql += " ) sub ORDER BY DATE ASC;"
              mensajero.query(sql, [id_room], function (err, result) {
                if (err){
                 
                  console.log(err)
                } 
                socket.emit('login', {
                  username: data.username,
                  id_origen: data.id_origen,
                  id_room:  id_room,
                  resultados: result
                });
              });
              if(clients.length > 1){
                io.to('chat-'+data.id_room).emit('user joined', {
                  username: data.username,
                  id_origen: data.id_origen,
                  id_room:  id_room
                });
              }
            }
          });
  
       });
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
  
  });
  