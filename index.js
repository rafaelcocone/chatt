const path = require('path');
const express = require('express');
const app = express();
var nombre = "";
var conexionesActivas  = 0;
var  mensajesGuardados = [{
    id:         1,
    message: "Bienvenido al grupo privado de chat con socket.io",
    username:   "bot de comunicación"
}];

app.get('/name/:name', function(req, res){
  //res.send('name: ' + req.query.name);
  nombre =  req.params.name;
});

//inicializa el servoidor
//settieng
app.set('port', process.env.PORT || 3000);

//static files
app.use(express.static(path.join( __dirname,'public')));

const server  = app.listen(app.get('port'), () => {
    console.log("serve port",app.get('port'));
});


//websocket
const SocketIO = require('socket.io');
const io = SocketIO(server);

var numUsers = 0;

io.on('connection', (socket) => {
  var addedUser = false;

  // when the client emits 'new message', this listens and executes
  socket.on('new message', (data) => {
    // we tell the client to execute 'new message'
    socket.to(data.grupos).emit('new message', {//socket.broadcast.emit('new message', {//
      username: socket.username,
      message: data.message //message: data
    });
  });

  // when the client emits 'add user', this listens and executes
  socket.on('add user', (data) => {
    if (addedUser) return;

    // we store the username in the socket session for this client
    socket.username = data.username;
    ++numUsers;
    addedUser = true;
   
    socket.join(data.grupos);
    io.in(data.grupos).emit('login', { // socket.emit('login', {
      numUsers: numUsers
    });
    // echo globally (all clients) that a person has connected
    socket.to(data.grupos).emit('user joined', {
      username: socket.username,
      numUsers: numUsers
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
  socket.on('disconnect', () => {
    if (addedUser) {
      --numUsers;

      // echo globally that this client has left
      socket.broadcast.emit('user left', {
        username: socket.username,
        numUsers: numUsers
      });
    }
  });
});
