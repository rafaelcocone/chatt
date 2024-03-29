'use strict'


var fs = require('fs'),
    puerto = 3002,
    publicDir   = `${__dirname}/public`,
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
        
        /*key:  fs.readFileSync('_.mrbisne.com_private_key.key'),
        cert: fs.readFileSync('mrbisne.com_ssl_certificate.cer')*/
      };
var sockets = [];
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
app
    .get('/',(req, res) => {
        res.sendFile(`${publicDir}/client.html`)
    })
    .get('/streaming',(req, res) => {
        res.sendFile(`${publicDir}/server.html`)
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

       socket.emit('add-users', {
            users: sockets
        });

        socket.broadcast.emit('add-users', {
            users: [socket.id]
        });

        socket.on('make-offer', function (data) {
            socket.to(data.to).emit('offer-made', {
                offer: data.offer,
                socket: socket.id
            });
        });

        socket.on('make-answer', function (data) {
            socket.to(data.to).emit('answer-made', {
                socket: socket.id,
                answer: data.answer
            });
        });

        socket.on('disconnect', function () {
            sockets.splice(sockets.indexOf(socket.id), 1);
            io.emit('remove-user', socket.id);
        });

        sockets.push(socket.id);


        socket.on('streaming', (image) => {
            io.emit('playstream', image)
            
        })
  

  

    
    });
    
    /**************************************** */
    /**************************************** */
  })
  .catch( (err) => {
    console.log('Db:')
    console.log(err)} )