'use strict'

var fs = require('fs'),
    puerto = 3001,
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
        key:  fs.readFileSync('_.mrbisne.com_private_key.key'),
        cert: fs.readFileSync('mrbisne.com_ssl_certificate.cer')
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
   ///coneccion de socket
    io.on('connection', (socket) => {
      var item = {},
        _id_doom = "",
        _id_user = "",
        _username = "";
      
        function sendMensaje(datos,id_notifer){
          socket.join('user-'+datos.id_destino, () => {
            socket.to('user-'+datos.id_destino).emit('notifer notificaMessage', {
              username: datos.origenName,  //nombre del origen
              id_user:  datos.id_destino,  //destino
              id_origen:  datos.id_origen,  //origen
              message:  datos.message,      //mensage
              autosave: datos.autosave,     //autosave
              tipo: datos.tipo,              //tipo notiticacion
              id_notifer: id_notifer.toString()        //id de notificacion
            });
          }); 
        }

        function  getAllNotificaiones(id){
          let resultados = [ ],
              total = 0;
          var sql =  " SELECT * FROM( SELECT DISTINCT comunicacionTrNotificacion.id AS 'id', "
              sql += "    users.avatar AS 'avatar', ";
              sql += "    comunicacionTrNotificacion.id_origen AS 'id_origen', ";
              sql += "    users.name AS 'username',"; 
              sql += "    comunicacionTrNotificacion.mensaje AS 'message',";
              sql += "     DATE_FORMAT(comunicacionTrNotificacion.created_at,  '%H %i  %W %M %e %Y') AS 'fecha',";

              sql += "    comunicacionTrNotificacion.created_at AS 'DATE',"
              sql += "    comunicacionTrNotificacion.visto      AS 'visto' "
              sql += " FROM comunicacionTrNotificacion ";
              sql += " INNER JOIN users ON users.id =  comunicacionTrNotificacion.id_origen ";
              sql += " WHERE comunicacionTrNotificacion.id_userLector = ?  AND  comunicacionTrNotificacion.visto = '0' "
              sql += " Order By  comunicacionTrNotificacion.created_at DESC  LIMIT 10";   
              sql += " ) sub ORDER BY DATE DESC;"
          resolve.query(sql, [id], function (err, result) {
            if (err){
              console.log(err)
            } 
            else{
              socket.emit('notifer getAllNotificaion', {
                id_user:    id,
                resultados: result
              })
            }              
          });

        }

      socket.on('notifer connenct', async (data) => {
        socket.join('user-'+data.id_user, () => {
          _id_user     = data.id_user
          _username    = data.username

          socket.broadcast.emit('logNotificacion', {
            username: _username,
            id_user:   _id_user  //usuario que entra en session
          });
          getAllNotificaiones( _id_user);
        });
      });

      socket.on('notifer message', (data) => {
        let id_notifer = 0;
        let datos = data;
        var sql = "INSERT INTO comunicacionTrNotificacion (id_comunicacionCtTipoNotificacion, id_userLector, visto, id_origen, mensaje) VALUES ?";
        var values = [
          [data.tipo, data.id_destino, '0', data.id_origen, data.message]
        ];
        if(data.autosave == 1){
          resolve.query(sql, [values], function (err, result) {
            if (err){
              console.log(err);
            } else
              sendMensaje(datos,result.insertId) 
          });
        }else 
          sendMensaje(datos,id_notifer)  
      });

      socket.on('notifer inicioChat', (data) => {
        
        socket.join('user-'+data.id_destino, () => {
          socket.to('user-'+data.id_destino).emit('notifer notificaChat', {
            id_room:      data.id_room,
            origenName:   data.origenName,
            id_destino:   data.id_origen,
            id_origen:    data.id_destino
          });
        }); 
        
      });
      
      socket.on('notifer confirmaMessage', (data) => {
        let datos = data, id_notifer = data.id_userLector;
        var sql = "UPDATE comunicacionTrNotificacion SET visto = '1' WHERE  id_userLector = ?" ;
        var values = [
          [data.id_userLector]
        ];
        
        resolve.query(sql, [values], function (err, result) {
          if (err){
            console.log(err);
          } 
        });
        
      });

      socket.on('notifer logConfirma', (data) => {
        io.to('user-'+data.id_user).emit('notifer getLogConfirma', {
          username: data.username,
          id_user:  data.id_user, 
          id_origen: data.id_origen
        });
      });

      socket.on('disconnect', (reason) => {  
        socket.broadcast.emit('notifer salida', {
          username: _username,
          id_user:  _id_user
        })
        
      });

    });
    
    /**************************************** */
  })
  .catch( (err) => {})
