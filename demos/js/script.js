// ===========================================================
//
// config socket connection
//
// ===========================================================
const connection = new RTCMultiConnection();

connection.socketURL = "/"; // same domain

connection.session = {
  audio: true,
  video: true,
  data: true,
};

connection.sdpConstraints.mandatory = {
  OfferToReceiveAudio: true,
  OfferToReceiveVideo: true,
};

// ===========================================================
//
// chat
//
// ===========================================================
connection.onmessage = (event) => {
  appendDIV(event.data);
};

const chatContainer = document.querySelector(".chat-output");
const btnSendChat = document.getElementById("btn-send-chat");
const chatText = document.getElementById("txt-chat");

function appendDIV(event) {
  const div = document.createElement("div");
  div.innerHTML = event.data || event;
  chatContainer.appendChild(div);
  chatContainer.parentElement.scrollTop = chatContainer.scrollHeight;
}

// ===========================================================
//
// required settings
//
// ===========================================================
// get userid
let userid = document.getElementById("txt-userid");
userid.value = connection.token();

// get roomid
let roomid = document.getElementById("txt-roomid");
roomid.value = (Math.random() * 1000).toString().replace(".", "");

// enter the room
document.getElementById("btn-open-or-join-room").onclick = function () {
  this.disabled = true;
  userid.disabled = true;
  roomid.disabled = true;

  connection.userid = userid.value;
  connection.openOrJoin(roomid.value || "predefiend-roomid");
};

// ===========================================================
//
// Speech To Text
//
// ===========================================================
const btnStt = document.getElementById("btn-stt");

const SpeechRecognition =
  window.SpeechRecognition || window.webkitSpeechRecognition;

if (typeof SpeechRecognition === "undefined") {
  btnStt.remove();
  alert("음성인식을 지원하지 않는 브라우저입니다.");
} else {
  let isSttRecognizing = false; // 현재 인식 중인지 확인
  let isSttErrorOccured = false; // 에러로 인한 stop 인지 확인

  const recognition = new SpeechRecognition();

  recognition.continuous = false;
  recognition.interimResults = true;
  recognition.lang = "ko-KR";

  // result, start, error, end 이벤트 등록
  recognition.addEventListener("result", (event) => {
    for (const res of event.results) {
      if (res.isFinal) {
        const _roomid = roomid.value;
        const time = new Date()
          .toTimeString()
          .replace(/.*(\d{2}:\d{2}:\d{2}).*/, "$1");
        const _userid = userid.value;
        const contents = res[0].transcript;

        // send chat to socket
        const text = `[${time}] ${_userid}: ${contents}`;
        connection.send(text);
        appendDIV(text);

        // post chat to server
        const data = {
          roomid: _roomid,
          time: time,
          userid: _userid,
          contents: res[0].transcript,
        };
        fetch("/api/chat", {
          method: "POST",
          headers: {
            "Content-Type": "application/json;charset=utf-8",
          },
          body: JSON.stringify(data),
        }).then((response) => {
          console.log(response.status + " " + response.statusText);
        });
      }
    }
  });
  recognition.addEventListener("start", (event) => {
    isSttRecognizing = true;
    btnStt.textContent = "음성인식 멈추기";
  });
  recognition.addEventListener("error", (event) => {
    if (event.error == "no-speech") {
      // No speech was detected.
      isSttErrorOccured = false;
    } else {
      isSttErrorOccured = true;
      alert(
        "알 수 없는 오류로 음성인식이 자동 중지되었습니다.\n재시작을 원하시면 '음성인식 시작하기' 버튼을 눌러주세요!"
      );
    }
  });
  recognition.addEventListener("end", (event) => {
    console.log("stop speech recognition...");
    // error 또는 stop 이벤트 발생시 end 이벤트 자동 호출
    isSttRecognizing = false;
    if (isSttErrorOccured) {
      // no-speech 외의 에러 발생으로 인한 end 이벤트일 경우
      btnStt.textContent = "음성인식 시작하기";
      isSttErrorOccured = false;
      return;
    }
    recognition.start();
  });

  // button eventlistener
  btnStt.addEventListener("click", () => {
    if (isSttRecognizing) {
      isSttErrorOccured = true;
      recognition.stop();
    } else {
      recognition.start();
    }
  });
}

// ===========================================================
//
// optional settings
//
// ===========================================================
const localVideoContainer = document.getElementById("local-videos-container");
const remoteVideoContainer = document.getElementById("remote-videos-container");

btnSendChat.addEventListener("click", () => {
  const time = new Date()
    .toTimeString()
    .replace(/.*(\d{2}:\d{2}:\d{2}).*/, "$1");
  const _userid = userid.value;
  const contents = chatText.value;

  // send chat to socket
  const text = `[${time}] ${_userid}: ${contents}`;
  connection.send(text);
  appendDIV(text);

  chatText.value = "";
});

connection.onstream = (event) => {
  const video = event.mediaElement;

  if (event.type === "local") {
    localVideoContainer.appendChild(video);
  }
  if (event.type === "remote") {
    remoteVideoContainer.appendChild(video);
  }

  // activate stt button
  btnStt.style.display = "inline";
  btnSendChat.style.display = "inline";
};
