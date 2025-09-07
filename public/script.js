const socket = io();
const localVideo = document.getElementById("localVideo");
const remoteVideo = document.getElementById("remoteVideo");

const findBtn = document.getElementById("findBtn");
const skipBtn = document.getElementById("skipBtn");
const muteBtn = document.getElementById("muteBtn");
const camBtn = document.getElementById("camBtn");
const endBtn = document.getElementById("endBtn");

const chatBox = document.getElementById("chatBox");
const messages = document.getElementById("messages");
const msgField = document.getElementById("msgField");
const sendBtn = document.getElementById("sendBtn");

let localStream;
let peer;
let partnerId;
let audioEnabled = true;
let videoEnabled = true;

async function init() {
  localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
  localVideo.srcObject = localStream;
}
init();

// Create peer connection
function createPeer() {
  const p = new RTCPeerConnection();
  p.ontrack = (event) => { remoteVideo.srcObject = event.streams[0]; };
  p.onicecandidate = (event) => {
    if (event.candidate) socket.emit("candidate", { to: partnerId, candidate: event.candidate });
  };
  return p;
}

// Find partner
findBtn.onclick = () => {
  socket.emit("findPartner");
  findBtn.style.display = "none";
};

// Partner found → send offer
socket.on("partnerFound", async (id) => {
  partnerId = id;
  peer = createPeer();
  localStream.getTracks().forEach(track => peer.addTrack(track, localStream));

  const offer = await peer.createOffer();
  await peer.setLocalDescription(offer);
  socket.emit("offer", { to: partnerId, offer });

  showControls();
});

// Answer incoming offer
socket.on("offer", async (data) => {
  partnerId = data.from;
  peer = createPeer();
  localStream.getTracks().forEach(track => peer.addTrack(track, localStream));

  await peer.setRemoteDescription(new RTCSessionDescription(data.offer));
  const answer = await peer.createAnswer();
  await peer.setLocalDescription(answer);

  socket.emit("answer", { to: partnerId, answer });
  showControls();
});

// Handle answer
socket.on("answer", async (data) => {
  await peer.setRemoteDescription(new RTCSessionDescription(data.answer));
});

// Handle ICE candidates
socket.on("candidate", async (data) => {
  try {
    await peer.addIceCandidate(new RTCIceCandidate(data.candidate));
  } catch (err) {
    console.error("Candidate error:", err);
  }
});

// --- Buttons ---
skipBtn.onclick = () => {
  endCall();
  socket.emit("findPartner");
};
muteBtn.onclick = () => {
  audioEnabled = !audioEnabled;
  localStream.getAudioTracks()[0].enabled = audioEnabled;
  muteBtn.textContent = audioEnabled ? "Mute" : "Unmute";
};
camBtn.onclick = () => {
  videoEnabled = !videoEnabled;
  localStream.getVideoTracks()[0].enabled = videoEnabled;
  camBtn.textContent = videoEnabled ? "Turn Camera Off" : "Turn Camera On";
};
endBtn.onclick = () => {
  endCall();
  findBtn.style.display = "inline-block";
};

// --- Chat ---
sendBtn.onclick = sendMessage;
msgField.addEventListener("keypress", (e) => {
  if (e.key === "Enter") sendMessage();
});

function sendMessage() {
  const text = msgField.value.trim();
  if (text && partnerId) {
    addMessage(text, "me");
    socket.emit("chat", { to: partnerId, text });
    msgField.value = "";
  }
}

socket.on("chat", (data) => {
  addMessage(data.text, "partner");
});

function addMessage(text, who) {
  const div = document.createElement("div");
  div.classList.add("msg", who);
  div.textContent = text;
  messages.appendChild(div);
  messages.scrollTop = messages.scrollHeight;
}

// --- Helpers ---
function endCall() {
  if (peer) {
    peer.close();
    peer = null;
  }
  remoteVideo.srcObject = null;
  hideControls();
}

function showControls() {
  skipBtn.style.display = "inline-block";
  muteBtn.style.display = "inline-block";
  camBtn.style.display = "inline-block";
  endBtn.style.display = "inline-block";
  chatBox.style.display = "flex";
}
function hideControls() {
  skipBtn.style.display = "none";
  muteBtn.style.display = "none";
  camBtn.style.display = "none";
  endBtn.style.display = "none";
  chatBox.style.display = "none";
}
