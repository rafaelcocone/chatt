var $urlIO =  window.location.hostname == "localhost" ? 'https://localhost:4000' : 'https://mrbisne.com:4000' ;
const socket = io($urlIO);
const videoGrid = document.getElementById('video-grid')
let $sendMensage = $('#chat_message')
let $id_room = undefined;

const myVideo = document.createElement('video')
myVideo.muted = true
//usuario en sesion
const peers = {}
let myVideoStream 

// Esta funcion se ejecuta antes de cerrar el navegador destruyendo la conexion del usuario en el servidor de PeerJS
window.onunload = window.onbeforeunload = function(e) {
  if (!!myPeer && !myPeer.destroyed) {
    myPeer.destroy();
  }
};

//inicialiaza peer
const myPeer = new Peer(undefined, {
  host: 'www.mrbisne.com',
 secure:true, 
 port: '3005',
 debug: 3,
 config: {'iceServers':[
                {'url': 'turn:mrbisne.com', username: 'mrtest', credential: 'mrpass' }
         ]}
})

var peerConnection = window.RTCPeerConnection ||
  window.mozRTCPeerConnection ||
  window.webkitRTCPeerConnection ||
  window.msRTCPeerConnection;

var sessionDescription = window.RTCSessionDescription ||
           window.mozRTCSessionDescription ||
           window.webkitRTCSessionDescription ||
           window.msRTCSessionDescription;


navigator.getUserMedia  = navigator.getUserMedia ||
                        navigator.webkitGetUserMedia ||
                        navigator.mozGetUserMedia ||
                        navigator.msGetUserMedia;

var constraints = { audio: true, video: {
                          width: { min: 240, ideal: 480, max: 720 },
                          height: { min: 144, ideal: 240, max: 480 },
                          frameRate: { ideal: 10, max: 10 } 
                        } }

navigator.mediaDevices.getUserMedia(
  constraints
 ).then(stream => {
   //inicar protocolo de camara y audio
   myVideoStream = stream
   addVideoStream(myVideo, stream)

    //recibir reespuesta de otros usuarios
    myPeer.on('call', call => {
      call.answer(stream)
      const video = document.createElement('video')
      call.on('stream', userVideoStream => {
        addVideoStream(video, userVideoStream)
      })
    })

    //detectar coneccion de nuevo usuaio
    socket.on('user-connected', (userId) => {
        connectToNewUser(userId, stream)
    })

    //evento de enviar mesajes
    $('#chat_message').keydown( (e)  => {
      if(e.which == 13 && $sendMensage.val().length !== 0 ){
          socket.emit('message', $sendMensage.val());
          $sendMensage.val('');
      }
    })

     ///resibir mensajes de otros usuario por chat
    socket.on('createMessage', message => {
      $('.chat__messages_list').append(
          $('<li/>')
              .addClass('chat__message')
              .append(`<b>user:</b> ${message}`)
      )
      scrollToBottom();
    })

 })
//envio de desconeccion
 socket.on('user-disconnected', userId => {
    //desconectar usuario si existe en lista
   if (peers[userId]){
      console.log('usuario restantes')
      console.log(peers)
      peers[userId].close()
      /*if( $id_room === userId){
        socket.emit('areyouhere', userId );
      }*/
        
   } 
 })



/*************************************************************/
//conectar a room
myPeer.on('open', id => {
  $id_room = id
  console.log('me: ')
  console.log(id)
  //id es mi propio id de coneccion
   socket.emit('join-room', ROOM_ID, id)
})

/************************************************************** */
// Este evento se ejecuta cuando ocurra un error al conectarse al servidor de PeerJS
myPeer.on("error", function(err) {
  let errorDet = 'descripcion de error=> '
  switch (err.type) {
    case "browser-incompatible":
      console.log(
        errorDet+"browser-incompatible: The client's browser does not support some or all WebRTC features that you are trying to use."
      );
      break;
    case "disconnected":
      console.log(
        errorDet+"disconnected: You've already disconnected this peer from the server and can no longer make any new connections on it."
      );
      break;
    case "invalid-id":
      console.log(
        errorDet+"invalid-id: The ID passed into the Peer constructor contains illegal characters."
      );
      break;
    case "invalid-key":
      console.log(
        errorDet+"invalid-key: The API key passed into the Peer constructor contains illegal characters or is not in the system (cloud server only)."
      );
      break;
    case "network":
      console.log(
        errorDet+"network: Lost or cannot establish a connection to the signalling server."
      );
      break;
    case "peer-unavailable":
      console.log(
        errorDet+"peer-unavailable: The peer you're trying to connect to does not exist."
      );
      $(".text-header small").html("Desconectado");
      break;
    case "ssl-unavailable":
      console.log(
        errorDet+"ssl-unavailable: PeerJS is being used securely, but the cloud server does not support SSL. Use a custom PeerServer."
      );
      break;
    case "server-error":
      console.log(errorDet+"server-error: Unable to reach the server.");
      break;
    case "socket-error":
      console.log(errorDet+"socket-error: An error from the underlying socket.");
      break;
    case "socket-closed":
      console.log(
        errorDet+"socket-closed: The underlying socket closed unexpectedly."
      );
      break;
    case "unavailable-id":
      console.log(
        errorDet+"unavailable-id: The ID passed into the Peer constructor is already taken."
      );
      break;
    case "webrtc":
      console.log(errorDet+"webrtc: Native WebRTC errors.");
      break;
    default:
      console.log(errorDet+"An unexpected error has ocurred");
      break;
  }
});


/*******************************************************************/ 
//conectar a otros usuario
function connectToNewUser(userId, stream) {
  const call = myPeer.call(userId, stream)
  const video = document.createElement('video')
  //iniciar stream
  call.on('stream', userVideoStream => {
    
    addVideoStream(video, userVideoStream)
  })
  //cerrar coneccion
  call.on('close', () => {
    console.log('desconectado:');
    console.log(peers)
    video.remove()
        
    //areyouhere
  })
    //aggregar usuario a comunication
    peers[userId] = call
    console.log('usuario en room')
    console.log(peers)
}

 //agregar video stream y darle play 
function addVideoStream(video, stream) {
   video.srcObject = stream
   video.addEventListener('loadedmetadata', () => {
     video.play()
   })
   videoGrid.append(video)
 }


/************************************************************************* */
//panel de control

//mute a un video
const muteUnmute = () => {
  const enabled = myVideoStream.getAudioTracks()[0].enabled;
  if (enabled) {
    myVideoStream.getAudioTracks()[0].enabled = false;
  } else {
    myVideoStream.getAudioTracks()[0].enabled = true;
  }
  $('.main__mute_button').toggle();
}

//activar y ddeactivar video
const playStop = () => {
  let enabled = myVideoStream.getVideoTracks()[0].enabled;
  if (enabled) {
    myVideoStream.getVideoTracks()[0].enabled = false;
  } else {
    myVideoStream.getVideoTracks()[0].enabled = true;
  }
  $('.main__video_button').toggle();
}

/********************************************************************** */
//funciones y enevtos de chat

// moverse al fondo del chat chando aparece un mensage
const scrollToBottom = () => {
  var d = $('.main__chat_window');
  d.scrollTop(d.prop("scrollHeight"));
}

document.getElementById('main__controles_salir')
    .addEventListener('click', (e) => {
      window.open($urlIO+"/profile",'_self')    
  });