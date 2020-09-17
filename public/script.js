var $urlIO =  window.location.hostname == "localhost" ? 'https://localhost:3003' : 'https://mrbisne.com:3003' ;
const socket = io($urlIO);
const videoGrid = document.getElementById('video-grid')
let $sendMensage = $('#chat_message')

//inicialiaza peer
const myPeer = new Peer(undefined, {
  host: 'www.mrbisne.com',
 secure:true, 
 port: '3005',
 debug: 3,
 config: {'iceServers':[
                {'url': 'turn:mrbisne.com', username: 'mrtest', credential: 'mrpass' },
         ]}
})

const myVideo = document.createElement('video')
myVideo.muted = true
//usuario en sesion
const peers = {}
let myVideoStream 

navigator.mediaDevices.getUserMedia({
   video: true,
   audio: true
 }).then(stream => {
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
   } 
 })



/*************************************************************/
//conectar a room
myPeer.on('open', id => {
  //id es mi propio id de coneccion
   socket.emit('join-room', ROOM_ID, id)
})

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
    video.remove()
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
    setUnmuteButton();
  } else {
    setMuteButton();
    myVideoStream.getAudioTracks()[0].enabled = true;
  }
}

const setMuteButton = () => {
  const html = `
    <i class="fas fa-microphone"></i>
    <span>Mute</span>
  `
  document.querySelector('.main__mute_button').innerHTML = html;
}

const setUnmuteButton = () => {
  const html = `
    <i class="tranmition_unmute fas fa-microphone-slash"></i>
    <span>Unmute</span>
  `
  document.querySelector('.main__mute_button').innerHTML = html;
} 

//activar y ddeactivar video
const playStop = () => {
  let enabled = myVideoStream.getVideoTracks()[0].enabled;
  if (enabled) {
    myVideoStream.getVideoTracks()[0].enabled = false;
    setPlayVideo()
  } else {
    setStopVideo()
    myVideoStream.getVideoTracks()[0].enabled = true;
  }
}

const setStopVideo = () => {
  const html = `
    <i class="fas fa-video"></i>
    <span>Stop Video</span>
  `
  document.querySelector('.main__video_button').innerHTML = html;
}

const setPlayVideo = () => {
  const html = `
  <i class="tranmition_stop  fas fa-video-slash"></i>
    <span>Play Video</span>
  `
  document.querySelector('.main__video_button').innerHTML = html;
}


/********************************************************************** */
//funciones y enevtos de chat

// moverse al fondo del chat chando aparece un mensage
const scrollToBottom = () => {
  var d = $('.main__chat_window');
  d.scrollTop(d.prop("scrollHeight"));
}