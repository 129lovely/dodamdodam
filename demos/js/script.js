// ===========================================================
//
// socket connection configuration
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
  appendDIV(`${event.userid}> ${event.data}`);
};

const chatContainer = document.querySelector(".chat-output");

function appendDIV(event) {
  const div = document.createElement("div");
  div.innerHTML = event.data || event;
  chatContainer.appendChild(div);
}

// ===========================================================
//
// Speech To Text
//
// ===========================================================
let isSttRecognizing = false;
let isSttErrorOccured = true;
const btnStt = document.getElementById("btn-stt");

const SpeechRecognition =
  window.SpeechRecognition || window.webkitSpeechRecognition;
if (typeof SpeechRecognition === "undefined") {
  btnSpeechToText.remove();
  alert("음성인식을 지원하지 않는 브라우저입니다.");
} else {
  let isSttRecognizing = false;
  const recognition = new SpeechRecognition();

  recognition.continuous = false;
  recognition.interimResults = false;

  recognition.addEventListener("result", (event) => {
    for (const res of event.results) {
      if (res.isFinal) {
        const time = new Date()
          .toTimeString()
          .replace(/.*(\d{2}:\d{2}:\d{2}).*/, "$1");
        const text = `[${time}] ${userid.value}: ${res[0].transcript}`;
        connection.send(text);
        appendDIV(text);
      }
    }
  });

  recognition.addEventListener("start", () => {
    btnStt.textContent = "음성인식 멈추기";
    isSttRecognizing = true;
  });

  recognition.addEventListener("error", (event) => {
    if (event.error == "no-speech") {
      // No speech was detected.
    } else if (event.error == "aborted") {
      // Speech input was aborted in some manner, perhaps by some user-agent-specific behavior like a button the user can press to cancel speech input.
    } else {
      // Etc.
      alert(
        "알 수 없는 오류로 음성인식이 자동 중지되었습니다.\n재시작을 원하시면 '음성인식 시작하기' 버튼을 눌러주세요!"
      );
    }

    isSttErrorOccured = true;
    btnStt.textContent = "음성인식 시작하기";
  });

  recognition.addEventListener("stop", () => {
    console.log("stop");
  });

  // error 또는 stop 이벤트 발생시 end 이벤트 자동 호출
  recognition.addEventListener("end", (event) => {
    isSttRecognizing = false;
    if (isSttErrorOccured) {
      btnStt.textContent = "음성인식 시작하기";
      return;
    }
    recognition.start();
  });

  btnStt.addEventListener("click", () => {
    // todo : 이쪽 코드 괜찮으려나???? 다시 생각해보자
    isSttErrorOccured = !isSttErrorOccured;

    isSttRecognizing ? recognition.stop() : recognition.start();

    isSttRecognizing = !isSttRecognizing;
  });
}

// userid 가져오기
let userid = document.getElementById("txt-userid");
userid.value = connection.token();

// roomid 가져오기
let roomid = document.getElementById("txt-roomid");
roomid.value = (Math.random() * 1000).toString().replace(".", "");
//   roomid.value = connection.token(); // 토큰으로 room id 생성

// btn 누르면 입장하기
document.getElementById("btn-open-or-join-room").onclick = () => {
  this.disabled = true;

  // roomid 로 입장
  connection.userid = userid.value;
  connection.openOrJoin(roomid.value || "predefiend-roomid");
};

// 여기서부터 옵션
const localVideoContainer = document.getElementById("local-videos-container");
const remoteVideoContainer = document.getElementById("remote-videos-container");

connection.onstream = (event) => {
  const video = event.mediaElement;

  if (event.type === "local") {
    localVideoContainer.appendChild(video);
  }
  if (event.type === "remote") {
    remoteVideoContainer.appendChild(video);
  }
};
