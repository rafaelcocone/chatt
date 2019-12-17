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
  key: fs.readFileSync('key.pem'),
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
    var item = {};

    socket.on('new message', (data) => {
      // we tell the client to execute 'new message'
      //socket.join(data.id_room);
      socket.to(data.id_room).emit('new message', {//socket.broadcast.emit('new message', {//
        username: data.username,
        message:  data.message, 
        id_room:  data.id_room, 
        user:     data.user, 
      });console.log(data);
      var sql = "INSERT INTO comunicacionDtRoomMensajes (mensaje,state, id_comunicacionCtRoom, id_users_envio) VALUES ?";
      var values = [
        [data.message, 'A',data.id_room,data.user]
      ];
      mensajero.query(sql, [values], function (err, result) {
        if (err){
          console.log(err)
          throw err;
        } 
        //console.log("Number of records inserted: " + result.affectedRows);
      });

    });
  
    // when the client emits 'add user', this listens and executes
    socket.on('add user', (data) => {
      socket.join(data.id_room);
      let participantes = 0//addRoom(data.id_room)
     io.in(data.id_room).clients((error, clients) => {
      if (error) throw error
      participantes = clients.length
      //console.log(clients) // => [Anw2LatarvGVVXEIAAAD]
      //console.log(clients.length)
    });
      
      socket.in(data.id_room).emit('user joined', {
        username: socket.username,
        id_origen: data.id_origen,
        id_room:  data.id_room,
        numUsers: participantes
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
  
  });
  