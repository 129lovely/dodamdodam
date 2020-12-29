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

const btnSendChat = document.getElementById("btn-send-chat");
const chatText = document.getElementById("txt-chat");

function appendDIV(event) {
  const data = event.data || event;

  const ul = document.querySelector(".chat-list");

  const li = document.createElement("li");

  if (event.userid != userid) {
    const divThum = document.createElement("div");
    divThum.classList.add("thum");
    const img = document.createElement("img");
    img.src = "/demos/images/ex1.jpg"; // 서버에서 넘어온 데이터 src로 할당
    divThum.appendChild(img);
    li.appendChild(divThum);
  }

  const spanName = document.createElement("span");
  spanName.innerText = data.username;
  li.appendChild(spanName);

  const divChatContainer = document.createElement("div");
  divChatContainer.classList.add("chat-container");
  const p = document.createElement("p");
  p.innerText = data.contents;
  const span = document.createElement("span");
  span.classList.add("current-time");
  span.textContent = getDate();
  divChatContainer.appendChild(p);

  if (event.userid == userid) {
    li.classList.add("my-message");
    divChatContainer.prepend(span);
  } else {
    divChatContainer.appendChild(span);
  }

  li.appendChild(divChatContainer);
  ul.appendChild(li);

  //   const div = document.createElement("div");
  //   div.innerHTML = event.data || event;
  //   chatContainer.appendChild(div);
  ul.parentElement.scrollTop = ul.scrollHeight;
}

// ===========================================================
//
// required settings
//
// ===========================================================
const username = document.getElementById("txt-username").value; // get username
const userid = document.getElementById("txt-userid").value; // get userid
const roomid = document.getElementById("txt-roomid").innerText; // get roomid

// enter the room
function enterRoom() {
  connection.userid = userid;
  connection.extra.username = username;
  connection.openOrJoin(roomid);
}

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
        // send chat to socket
        const data = {
          roomid: roomid,
          time: new Date()
            .toTimeString()
            .replace(/.*(\d{2}:\d{2}:\d{2}).*/, "$1"),
          userid: userid,
          username: username,
          contents: res[0].transcript,
        };
        connection.send(data);
        appendDIV(data);

        sendChatAjax(data);
      }
    }
  });
  recognition.addEventListener("start", (event) => {
    isSttRecognizing = true;
    btnStt.innerHTML =
      '<i class="fas fa-microphone-slash"></i> 음성인식 멈추기';
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
      btnStt.innerHTML = '<i class="fas fa-microphone"></i> 음성인식 시작하기';
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
      this.blur();
    } else {
      recognition.start();
      this.blur();
    }
  });
}

// ===========================================================
//
// optional settings
//
// ===========================================================
const videoContainer = document.getElementById("videos-container");

function chatTextEventListener() {
  if (chatText.value.trim() == "") {
    alert("내용을 입력해주세요");
    return;
  }
  // send chat to socket
  const data = {
    roomid: roomid,
    time: new Date().toTimeString().replace(/.*(\d{2}:\d{2}:\d{2}).*/, "$1"),
    userid: userid,
    username: username,
    contents: chatText.value,
  };
  connection.send(data);
  appendDIV(data);
  sendChatAjax(data);

  chatText.value = "";
}

chatText.addEventListener("keypress", (event) => {
  if (event.code == "Enter") {
    chatTextEventListener();
  }
});

btnSendChat.addEventListener("click", chatTextEventListener);

// post chat to server
function sendChatAjax(data) {
  fetch("/chat", {
    method: "POST",
    headers: {
      "Content-Type": "application/json;charset=utf-8",
    },
    body: JSON.stringify(data),
  }).then((response) => {
    console.log(response.status + " " + response.statusText);
  });
}

const getDate = () => {
  const date = new Date();
  const hours = date.getHours();
  const minutes = date.getMinutes();
  return `${checkMorningOrAfternoon(hours)} ${hours}:${minutes}`;
};

const checkMorningOrAfternoon = (hours) => {
  if (hours >= 12 && hours < 24) {
    return "오후";
  } else {
    return "오전";
  }
};

const btnExit = document.getElementById("btn-exit");
btnExit.addEventListener("click", () => {
  // disconnect with all users
  connection.getAllParticipants().forEach(function (pid) {
    connection.disconnectWith(pid);
  });

  // stop all local cameras
  connection.attachStreams.forEach(function (localStream) {
    localStream.stop();
  });

  // close socket.io connection
  connection.closeSocket();

  // 리포트 페이지로 이동
  location.href = `/report?roomid=${roomid}`;
});

connection.onstream = (event) => {
  const video = getHTMLMediaElement(event.mediaElement, {
    title: event.extra.username,
    buttons: [],
    width: "50%",
    showOnMouseEnter: true,
  });

  video.id = event.userid;
  videoContainer.appendChild(video);

  // activate stt & chat button
  btnStt.disabled = false;
  btnSendChat.disabled = false;

  // 인원수 변경
  const total_num = connection.getAllParticipants().length + 1;
  document.getElementById("total-num").textContent = total_num;
};

connection.onleave = function (event) {
  //   const ul = document.querySelector(".chat-list");
  //   const span = document.createElement("span");
  //   span.innerText = `${event.userid}님이 나가셨습니다`;
  //   ul.appendChild(span);
  document.getElementById(event.userid).remove();
};

alert(
  "---------------- 주의 ----------------\n1. 발화 내용을 자동 기록하려면 <음성인식 시작하기> 버튼을 눌러주세요.\n2. <회의실 나가기> 버튼을 눌러야만 회의록 요약 파일을 다운로드 받을 수 있습니다.\n3. 아직 BETA 서비스 단계라 회의 시간이 너무 짧거나 및 발화 문장 수가 너무 적으면 회의록 요약본 출력에 실패할 수 있습니다."
);
enterRoom();
