import { io } from 'socket.io-client'
import { create } from 'zustand'

 let BASE_URL='http://localhost:5000'
 console.log(location.hostname)
if(location.hostname=='localhost' 
  || location.hostname=='172.22.158.49'||
  location.hostname=='192.168.137.1'
) {
// BASE_URL='http://localhost:5000'
    BASE_URL='http://192.168.137.1:5000'

}
else{
    BASE_URL='https://webrtcp2pcall.onrender.com/'
}
export const userStore = create((set) => ({
  username: 'Soham',
  setUsername: (newname) => set({ username: newname }),
  socket: io(BASE_URL,{  path: "/socket.io/"})
}))

