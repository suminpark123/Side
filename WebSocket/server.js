const express = require('express');
const app = express();
var admin = require("firebase-admin");

// firebase 관련 정보 로드
var serviceAccount = require("./websocketpro-fc8e3-firebase-adminsdk-c5076-b56d3a8dbf.json");
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

// Firestore 초기화
const db = admin.firestore();

// index.html 파일을 클라이언트에게 전송
app.use("/", function (req, res) {
  res.sendFile(__dirname + '/index.html');
});

// 서버 시작
const server = app.listen(8080);

// Socket.IO 서버 설정
const io = require('socket.io')(server);

// 연결된 클라이언트를 저장하는 Set 생성
const clients = new Set();

// 클라이언트가 연결되었을 때
io.on('connection', function (socket) {
  let username = null; // 사용자의 이름을 추적

  // Set에 연결된 클라이언트 추가
  clients.add(socket);

  // 새로운 클라이언트에게 환영 메시지 전송
  socket.emit('message', '웹소켓 채팅 시작');

  socket.on('register', async function (data) {
    // 등록 요청에서 사용자가 원하는 이름 가져오기
    const { username: desiredUsername } = data;

    // 원하는 이름이 이미 사용 중인지 확인
    const querySnapshot = await db.collection('users').where('username', '==', desiredUsername).get();
    if (!querySnapshot.empty) {
      // 이름이 사용 중이면 클라이언트에게 오류 메시지 전송
      socket.emit('registration-error', '이미 사용 중인 이름입니다.');
      return;
    }

    // Firestore에 원하는 이름으로 새로운 사용자 문서 생성
    const newUserRef = db.collection('users').doc();
    await newUserRef.set({
      id: newUserRef.id,
      username: desiredUsername
    });

    // 현재 소켓에 사용자 이름 설정하고 클라이언트에게 성공 메시지 전송
    username = desiredUsername;
    socket.emit('registration-success', { username });
  });

  // 클라이언트에서 채팅 메시지를 받았을 때
  socket.on('chat-message', function (data) {
    if (username) {
      // 사용자가 등록했을 경우 사용자 이름과 함께 채팅 메시지를 브로드캐스트
      const message = { username, text: data.text };
      clients.forEach(function each(client) {
        client.emit('chat-message', message);
      });
    } else {
      // 사용자가 등록하지 않았을 경우 클라이언트에게 오류 메시지 전송
      socket.emit('registration-error', '메시지를 전송하기 전에 등록해야합니다.');
    }
  });

  // 클라이언트가 연결을 종료했을 때
  socket.on('disconnect', function () {
    // Set에서 연결을 종료한 클라이언트 제거
    clients.delete(socket);
  });
});
