import { io } from 'socket.io-client'
import { create } from 'zustand'

export const userStore = create((set) => ({
  username: 'Soham',
  setUsername: (newname) => set({ username: newname }),
  socket: io("http://192.168.137.1:5000")
}))

