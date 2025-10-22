const express = require("express");
const { createServer } = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const path = require("path");
const app = express();
const httpServer = createServer(app);
require("dotenv").config();
const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:5000",
  "http://localhost:5174",
  "http://192.168.137.1:5173",
];
app.use(
  cors({
    origin: allowedOrigins, // Replace with your frontend's origin
    credentials: true, // Allow cookies to be sent
  })
);

// for deployment
if (process.env.ENVIROMENT !== "local") {
  app.use(express.static(path.join(__dirname, "../frontend/dist")));

  app.get("/{*any}", (req, res) => {
    res.sendFile(path.join(__dirname, "../frontend", "dist", "index.html"));
  });
}
let rooms = new Map();
const io = new Server(httpServer, {
  cors: {
    origin: allowedOrigins,
  },
});

io.on("connection", (socket) => {
  // console.log("user connected with socket id ", socket.id);

  // add the new user to room
  socket.on("newUser", ({ name, roomId }) => {
    const clientsInRoom = io.sockets.adapter.rooms.get(roomId);
    const numClients = clientsInRoom ? clientsInRoom.size : 0;

    if (numClients >= 2 && !rooms.has(socket.id)) {
      socket.emit("room-full", {
        message: "User is on another call or room is full.",
      });
      return; // Don't join room
    }
    rooms.set(socket.id, roomId);
    // console.log(rooms);
    socket.join(roomId);
  });

  //recrive the offer from one user and send it to other users of the same room
  socket.on("send-offer", ({ name, roomId, offer }) => {
    // if (roomParticipants.length < 2) return;
    socket.to(roomId).emit("receive-offer", { name, offer, from: socket.id });
  });

  socket.on("send-answer", ({ to, answer, name }) => {
    socket.to(to).emit("receive-answer", { answer, to, name });
  });
  socket.on("new-ice-candidate", ({ candidate, roomId }) => {
    socket.to(roomId).emit("receive-new-ice-candidate", { candidate });
  });

  socket.on("screen-share-started", ({ roomId, from: username }) => {
    socket.to(roomId).emit("screen-share-started", { from: username });
  });

  socket.on("screen-share-stopped", ({ roomId, from: username }) => {
    socket.to(roomId).emit("screen-share-stopped", { from: username });
  });

  socket.on("peer-left", () => {
    if (!rooms.has(socket.id)) return;
    let roomId = rooms.get(socket.id);
    socket.leave(roomId);
    rooms.delete(socket.id);
    // console.log("after deleting ", rooms);
  });
  socket.on("video-toggled", ({ roomId, from, enabled }) => {
    socket.to(roomId).emit("video-toggled", {
      from,
      enabled,
    });
  });

  socket.on("audio-toggled", ({ roomId, from, enabled }) => {
    socket.to(roomId).emit("audio-toggled", {
      from,
      enabled,
    });
  });


  socket.on("disconnect", () => {
    // console.log(socket.id, "disconnected");
    if (!rooms.has(socket.id)) return;
    let roomId = rooms.get(socket.id);

    socket.leave(roomId);
    rooms.delete(socket.id);
    // console.log("after deleting ", rooms);
  });
});

httpServer.listen(process.env.PORT || 100000, (e) => {
  console.log("Localhost running on port", process.env.PORT);
});
