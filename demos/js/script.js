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
// required settings
//
// ===========================================================
const username = document.getElementById("txt-username").value; // get username
const userid = document.getElementById("txt-userid").value; // get userid
const roomid = document.getElementById("txt-roomid").value; // get roomid

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

const videoContainer = document.getElementById("videos-container");

connection.onstream = (event) => {
  const video = getHTMLMediaElement(event.mediaElement, {
    title: '',
    buttons: [],
    width: "100%",
    showOnMouseEnter: false
  });

  video.id = event.extra.username;
  videoContainer.appendChild(video);
};

connection.onleave = function (event) {
  //   const ul = document.querySelector(".chat-list");
  //   const span = document.createElement("span");
  //   span.innerText = `${event.userid}님이 나가셨습니다`;
  //   ul.appendChild(span);
  document.getElementById(event.userid).remove();
};

enterRoom();
