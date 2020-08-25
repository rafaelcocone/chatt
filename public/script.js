var $urlIO =  window.location.hostname == "localhost" ? 'https://localhost:3003' : 'https://mrbisne.com:3003' ;
const socket = io($urlIO);
const videoGrid = document.getElementById('video-grid')

//inicialiaza peer
const myPeer = new Peer(undefined, {
  host: '/',
  port: '3005'
})
const myVideo = document.createElement('video')
myVideo.muted = true
//usuario en sesion
const peers = {}

navigator.mediaDevices.getUserMedia({
   video: true,
   audio: true
 }).then(stream => {
   //inicar protocolo de camara y audio
   addVideoStream(myVideo, stream)

   //recsibir respuesta
   myPeer.on('call', call => {
      call.answer(stream)
      const video = document.createElement('video')
      call.on('stream', userVideoStream => {
        addVideoStream(video, userVideoStream)
      })
    })

   //iniciar comuinicacion con otro usuario que se ha conevctado
   socket.on('user-connected', userId => {
      console.log('user-connected: ' + userId );
      connectToNewUser(userId, stream)
    })

 })
//envio de desconeccion
 socket.on('user-disconnected', userId => {
    //desconectar usuario si existe en lista
   if (peers[userId]) peers[userId].close()
 })

 //abrir coneccion y enviarla a 
 myPeer.on('open', id => {
   socket.emit('join-room', ROOM_ID, id)
 })

//conectar a otros usuario
function connectToNewUser(userId, stream) {
   const call = myPeer.call(userId, stream)
   const video = document.createElement('video')
   //escuchar stream de otros usuario
   call.on('stream', userVideoStream => {
      addVideoStream(video, userVideoStream)
    })
   //cuando un usuario se desconecta
   call.on('close', () => {
      video.remove()
    })
    //aggregar usuario a comunication
    peers[userId] = call
}

 //agregar video stream y darle play 
function addVideoStream(video, stream) {
   video.srcObject = stream
   video.addEventListener('loadedmetadata', () => {
     video.play()
   })
   videoGrid.append(video)
 }
