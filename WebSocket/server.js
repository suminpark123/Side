const express = require('express');
const app = express();

app.use("/",function(req,res){
    res.sendFile(__dirname+'/index.html');
});

app.listen(8080);
// //웹소켓 열기
// const WebSocket = require('ws');

// const socket = new WebSocket.Server({
//     port:8081
// });

// socket.on('connection',(ws,req)=>{
//     ws.on('message',(msg)=>{
//         console.log('유저가 보낸거 :'+msg);
//         ws.send('서버: 응답테스트');
//     })   
// });

const WebSocket = require('ws');
const wss = new WebSocket.Server({ port: 8081 });

// Set to store all connected clients
const clients = new Set();

wss.on('connection', function connection(ws) {
  // Add new client to the set
  clients.add(ws);

  // Send a welcome message to the new client
  ws.send('Welcome to the chat room!');

  ws.on('message', function incoming(message) {
    console.log('Received message:', message);
    // Broadcast message to all clients
    clients.forEach(function each(client) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    });
  });

  ws.on('close', function() {
    // Remove client from the set when the connection is closed
    clients.delete(ws);
  });
});
