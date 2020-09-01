'use strict'

var fs = require('fs'),
    puerto = 3003,
    publicDir   = `${__dirname}/public`,
    https = require('https');
const { v4: uuidV4 } = require('uuid')
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
        key:  fs.readFileSync('_.mrbisne.com_private_key.key'),
        cert: fs.readFileSync('mrbisne.com_ssl_certificate.cer')
      };
var sockets = [];

app.set('view engine', 'ejs')
app.use(express.static('public'))


app.get('/', (req, res) => {
  res.redirect(`/${uuidV4()}`)
})

app.get('/:room', (req, res) => {
  res.render('room', { roomId: req.params.room })
}) 

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
    io.on('connection', socket => {
      socket.on('join-room', (roomId, userId) => {
          console.log('coneccion a room '+ roomId, userId);
          socket.join(roomId)
          socket.to(roomId).broadcast.emit('user-connected', userId)
        
          socket.on('message', (message) => {
            //send message to the same room
            io.to(roomId).emit('createMessage', message)
          }); 

          socket.on('disconnect', () => {
            console.log('desconeccion: '+userId)
            socket.to(roomId).broadcast.emit('user-disconnected', userId)
          })
      })
    })
    
    /**************************************** */
    /**************************************** */
  })
  .catch( (err) => {
    console.log('Db:')
    console.log(err)} )