const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static("public"));

let waitingUser = null;

io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  // When user wants to find a partner
  socket.on("findPartner", () => {
    if (waitingUser) {
      // Pair current user with waiting user
      io.to(socket.id).emit("partnerFound", waitingUser);
      io.to(waitingUser).emit("partnerFound", socket.id);
      waitingUser = null;
    } else {
      waitingUser = socket.id; // put this user in waiting pool
    }
    // Handle chat
socket.on("chat", (data) => {
  io.to(data.to).emit("chat", { from: socket.id, text: data.text });
});

  });

  // Signaling
  socket.on("offer", (data) => io.to(data.to).emit("offer", { from: socket.id, offer: data.offer }));
  socket.on("answer", (data) => io.to(data.to).emit("answer", { from: socket.id, answer: data.answer }));
  socket.on("candidate", (data) => io.to(data.to).emit("candidate", { from: socket.id, candidate: data.candidate }));

  // Handle disconnect
  socket.on("disconnect", () => {
    if (waitingUser === socket.id) waitingUser = null;
    console.log("User disconnected:", socket.id);
  });
});

server.listen(3000, () => console.log("Server running at http://localhost:3000"));
