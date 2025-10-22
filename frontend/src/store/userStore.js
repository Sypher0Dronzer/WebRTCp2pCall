import { io } from "socket.io-client";
import { create } from "zustand";

let BASE_URL ;
// console.log(location.hostname);
if (
  location.hostname == "localhost" ||
  location.hostname == "172.22.158.49" ||
  location.hostname == "192.168.137.1" // do add your ipv4 link here for testing
) {
  BASE_URL = "http://192.168.137.1:5000";
} else {
  BASE_URL = "https://webrtcp2pcall.onrender.com/"; // this is the deployed link of onrender - you may leave it empty or add a dummy link until u deploy it 
}
export const userStore = create((set) => ({
  username: "Soham",
  setUsername: (newname) => set({ username: newname }),
  socket: io(BASE_URL, { path: "/socket.io/" }),
}));
