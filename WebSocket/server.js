const express = require('express');
const app = express();
var admin = require("firebase-admin");

// load firebase related information
var serviceAccount = require("./websocketpro-fc8e3-firebase-adminsdk-c5076-b56d3a8dbf.json");
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

// Initialize Firestore
const db = admin.firestore();

// Send the index.html file to the client
app.use("/",function(req,res){
    res.sendFile(__dirname+'/index.html');
});

// start server
const server = app.listen(8080);

// Socket.IO server settings
const io = require('socket.io')(server);

// Create a Set to store connected clients
const clients = new Set();

// when a client connects
io.on('connection', function(socket) {
  let username = null; // keep track of the user's username
  
  // Add the connected clients to the Set
  clients.add(socket);

  // send welcome message to new client
  socket.emit('message', 'start websocket chat');

  socket.on('register', async function(data) {
    // get the user's desired username from the registration request
    const { username: desiredUsername } = data;
    
    // check if the desired username is already taken
    const querySnapshot = await db.collection('users').where('username', '==', desiredUsername).get();
    if (!querySnapshot.empty) {
      // the username is taken, send an error message to the client
      socket.emit('registration-error', 'Username already taken');
      return;
    }
    
    // create a new user document in Firestore with the desired username
    const newUserRef = db.collection('users').doc();
    await newUserRef.set({
      id: newUserRef.id,
      username: desiredUsername
    });
    
    // set the username for the current socket and send a success message to the client
    username = desiredUsername;
    socket.emit('registration-success', { username });
  });
  
  // when receiving chat message from client
  socket.on('chat-message', function(data) {
    if (username) {
      // if the user has registered, broadcast the chat message with their username
      const message = { username, text: data.text };
      clients.forEach(function each(client) {
        client.emit('chat-message', message);
      });
    } else {
      // if the user has not registered, send an error message to the client
      socket.emit('registration-error', 'You must register before sending messages');
    }
  });

  // when the client closes the connection
  socket.on('disconnect', function() {
    // Remove the client that has closed the connection from the Set
    clients.delete(socket);
  });
});
