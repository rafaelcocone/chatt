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

//qur para busauqda de contactos
function allContactos(id_user) {
  let sql = 'SELECT  DISTINCT  users.id AS "id", users.name AS "name", users.avatar AS avatar, gruposintegrantes.id AS "id_integrante", IFNULL(comunicacionCtRoom.id, "0" ) AS "id_room" '
  sql += ' FROM users '
  sql += '  INNER JOIN gruposintegrantes 	ON users.id = gruposintegrantes.id_users' 
  sql += '  INNER JOIN grupos 				ON grupos.id = gruposintegrantes.id_grupos'
  sql += '  LEFT JOIN comunicacionRlRoomContactos ON comunicacionRlRoomContactos.id_gruposintegrantes  = gruposintegrantes.id'
  sql += '  LEFT JOIN  comunicacionCtRoom    	ON comunicacionRlRoomContactos.id_comunicacionCtRoom  = comunicacionCtRoom.id '
  sql += ' WHERE grupos.id_users_creador  != users.id'
  sql += ' AND grupos.tipo = "S" AND gruposintegrantes.state = "A" AND grupos.state = "A" AND grupos.id_users_creador = '+ id_user+' ORDER BY users.id '
  return sql;   
}
function  infoUsuario(id_user){
  let sql = 'SELECT  DISTINCT  users.id AS "id", users.name AS "name", users.avatar AS avatar'
  sql += ' FROM users '
  sql += '  WHERE users.id = '+id_user+' LIMIT 1' 
  return sql;
}

///coneccion de socket
io.on('connection', (socket) => {
 
  //var addedUser = false;
  socket.on('user connenct', (data) => {
    let arrayCopy = [ ] 
    socket.id_user = data.id_user
    //busqueda de constactos de usuario
    let sql = allContactos(data.id_user)
    mensajero.query(sql, function (err, result, fields) {
        if (err){
          console.log(err)
          throw err;
        } else{
          arrayCopy = JSON.parse(JSON.stringify(result ));
          //determinar clientes de la room de notificaciones
          io.in('user-'+data.id_user).clients((error, clients) => {
            if (error){ 
              
              throw error } 
            else{
              //verificar si el usuario esta activo
              let existe = usuariosActivos.find(contacto => {
                if(contacto.id_user ==  data.id_user) 
                  return true
              })
              if(existe == undefined){
                let item = {}
                item.id_user = data.id_user
                item.contacto = [ ]
                arrayCopy.forEach(function (currentValue) {
                  let sioRoom = io.sockets.adapter.rooms['user-'+currentValue.id]
                  if( sioRoom ) { 
                    if(usuariosActivos.length > 0){
                    //verificar si el usuario constacto esta activo
                    let elemento = usuariosActivos.find((element, index) => {
                      let existe = element.contacto.find(contacto => contacto ==  data.id_user)
                      if(existe == undefined){
                        if (element.id_user ==  currentValue.id){
                          element.contacto.push(data.id_user)
                          //enviar simbolo de activo para los contactos
                          socket.to('user-'+currentValue.id).emit('ingresoUsuario', {
                            id_user: data.id_user
                          })
                          return true;
                        }
                      }
                    })
                    }
                    item.contacto.push(currentValue.id)
                  }   
                });
                //enviar simbolo de usuarios activo al usuario
                usuariosActivos.push(item)
                console.log(usuariosActivos)
                socket.emit('logNotificacion', {
                  usuarios: item.contacto
                });
              }
            }
          });
        }
    });       
    
    socket.join('user-'+data.id_user)
    

    
    /*io.in('user-'+data.id_user).clients((error, clients) => {
      if (error) throw error
      console.log(io.sockets.adapter.rooms)
      console.log(clients.length)
      console.log(clients)
    });

    /*
    socket.in(data.id_room).emit('user joined', {
      username: socket.username,
      id_origen: data.id_origen,
      id_room:  data.id_room,
      numUsers: usuariosActivos.length
    });
    */
  });

  socket.on('setNotificacion', (data) => {
    let arrayCopy = [ ]
    //busqueda de constactos de usuario
    let sql = allContactos(data.id_user)
    mensajero.query(sql, function (err, result, fields) {
      if (err){
        throw err;
      } else{
        io.in('user-'+data.id_user).clients((error, clients) => {
          if (error){ throw error } 
          else{
            socket.to('user-'+data.id_user).emit('getNotificacion', {
              username: socket.username
            });
          }
        });
      }
    })
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
    var indice, indiceContacto, removed, buscaContacto
    //buscar el array de usuario desconectado
    let existe = usuariosActivos.find( (contacto,index) => {
      if(contacto.id_user ==  socket.id_user){
        indice = index
        return true
      } 
    })
    if(existe != undefined){
      // ciclo para cada contacto de usuario desconectado
      existe.contacto.forEach( (currentValue) => {  
        let value = currentValue
        let indiceContacto
        //mandar a usuarios contactos mensaje
        socket.to('user-'+currentValue).emit('salidaUsuario', { 
          id_user: socket.id_user
        })  
        //buscar a usuario desconectdo de otras listas de contactos
        let listaContacto = usuariosActivos.find( (contact,indice) => { 
          if(contact.id_user ==  value){
            return true
          } 
        })
        //quitar a usuario desconectdo de otras listas de contactos
        let busquedaElemento = (element) => element > socket.id_user;
        indiceContacto  = listaContacto.contacto.findIndex(busquedaElemento) 
        removed         = listaContacto.contacto.splice(indiceContacto, 1)
      })
      removed = usuariosActivos.splice(indice, 1)
      console.log(usuariosActivos)
    }
  });
});