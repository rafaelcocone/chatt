const path = require('path');
const mysql = require('mysql')
const express = require('express');
const app = express();
var nombre = "";
var conexionesActivas  = 0;
const mensajero = mysql.createConnection({
  host: '74.208.166.96',
  user: 'asys',
  password: '1nt3gr4*2019',
  port: 5543,
  database: 'simulador'
});

var roomAbiertas = [ ];
var usuariosActivos = [ ];

app.get('/name/:name', function(req, res){
  //res.send('name: ' + req.query.name);
  nombre =  req.params.name;
});

//inicializa el servoidor
//settieng
app.set('port', process.env.PORT || 3000);

//static files
//app.use(express.static(path.join( __dirname,'public')));
const server  = app.listen(app.get('port'), () => {
    console.log("server port",app.get('port'));
});

//websocket
const SocketIO = require('socket.io');
const io = SocketIO(server);

var numUsers = 0;

function addRoom(id_room){
  let participantes = 0;
  if(roomAbiertas.length > 0) {
    roomAbiertas.forEach(function(room) {
      if(room.id_room == id_room){
        room.partcipantes ++;
        participantes = room.partcipantes;
        return;     
      }
    });  
  }console.log( participantes);
  if(participantes == 0){
    let item = {id_room: id_room, partcipantes: 1 }
    roomAbiertas.push(item);
    participantes++
  }    
  return participantes
}

//coneccion a la base de datos
mensajero.connect(function(error){
  if(error){
     throw error;
  }else{
     console.log('Conexion correcta.');
  }
});

io.on('connection', (socket) => {
  //var addedUser = false;
  var item = {};
  // when the client emits 'new message', this listens and executes
  /*socket.on('user connenct', (data) => {
    socket.join('user-'+data.id_user);
    let sql='SELECT  DISTINCT  users.id AS "id" , users.name AS "name", users.avatar AS avatar, gruposintegrantes.id AS "id_integrante" , IFNULL(comunicacionCtRoom.id, "0" ) AS "id_room" '
		'FROM users' 
			'INNER JOIN gruposintegrantes 	ON users.id = gruposintegrantes.id_users' 
			'INNER JOIN grupos 				ON grupos.id = gruposintegrantes.id_grupos'
			'LEFT JOIN comunicacionRlRoomContactos ON comunicacionRlRoomContactos.id_gruposintegrantes  = gruposintegrantes.id'
			'LEFT JOIN  comunicacionCtRoom    	ON comunicacionRlRoomContactos.id_comunicacionCtRoom  = comunicacionCtRoom.id' 
		'WHERE grupos.id_users_creador  != users.id'
      'AND grupos.tipo = "S" AND gruposintegrantes.state = "A" AND grupos.state = "A" AND grupos.id_users_creador = '+data.id_user
      
    con.query(sql, function (err, result, fields) {
      if (err) throw err;
      else{
       

      


      console.log(result);
      }
    });

    usuariosActivos.push( data.id_user)






    /*socket.to(data.grupos).emit('typing', {
     username: socket.username
   });*/
  //});



  socket.on('new message', (data) => {
    // we tell the client to execute 'new message'
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
    /*var query = mensajero.query('INSERT INTO personaje(nombre, apellido, biografia) VALUES(?, ?, ?)', ['Homero', 'Simpson', 'Esposo de Marge y padre de Bart, Lisa y Maggie.'], function(error, result){
      if(error){
         throw error;
      }
    });
    */
  });

  // when the client emits 'add user', this listens and executes
  socket.on('add user', (data) => {
    socket.join(data.id_room);
    let participantes = addRoom(data.id_room)
    
      // when the client emits 'typing', we broadcast it to others
  
    



    // we store the username in the socket session for this client
    //socket.username = data.username;   
    
    //io.in(data.id_room).emit('login', { // 
   /* socket.emit('login', {
      id_room:  data.id_room,
      numUsers: participantes
    });*/
    // echo globally (all clients) that a person has connected
    

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

  // when the user disconnects.. perform this
 /* socket.on('disconnect', () => {
    if (addedUser) {
      --numUsers;

      // echo globally that this client has left
      socket.broadcast.emit('user left', {
        username: socket.username,
        numUsers: numUsers
      });
    }
  });*/
});
