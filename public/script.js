const socket = io();

let roomId;
let localStream;
let peerConnection;

const myVideo = document.getElementById("myVideo");
const remoteVideo = document.getElementById("remoteVideo");
const movie = document.getElementById("movie");

const config = {
    iceServers: [
        { urls: "stun:stun.l.google.com:19302" }
    ]
};

async function joinRoom() {
    roomId = document.getElementById("roomInput").value;

    if (!roomId) {
        alert("Enter Room ID");
        return;
    }

    document.getElementById("join-section").style.display = "none";
    document.getElementById("main-section").style.display = "block";
    document.getElementById("roomText").innerText = "Room: " + roomId;

    localStream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true
    });

    myVideo.srcObject = localStream;

    socket.emit("join-room", roomId);
}

// ---------- WebRTC ----------

socket.on("user-joined", async () => {
    createPeer();

    const offer = await peerConnection.createOffer();
    await peerConnection.setLocalDescription(offer);

    socket.emit("offer", offer, roomId);
});

socket.on("offer", async (offer) => {
    createPeer();

    await peerConnection.setRemoteDescription(offer);

    const answer = await peerConnection.createAnswer();
    await peerConnection.setLocalDescription(answer);

    socket.emit("answer", answer, roomId);
});

socket.on("answer", async (answer) => {
    await peerConnection.setRemoteDescription(answer);
});

socket.on("ice-candidate", (candidate) => {
    if (peerConnection) {
        peerConnection.addIceCandidate(candidate);
    }
});

function createPeer() {
    peerConnection = new RTCPeerConnection(config);

    localStream.getTracks().forEach(track => {
        peerConnection.addTrack(track, localStream);
    });

    peerConnection.ontrack = (event) => {
        remoteVideo.srcObject = event.streams[0];
    };

    peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
            socket.emit("ice-candidate", event.candidate, roomId);
        }
    };
}

// ---------- Movie Sync ----------

function playMovie() {
    movie.play();
    socket.emit("play", roomId);
}

function pauseMovie() {
    movie.pause();
    socket.emit("pause", roomId);
}

socket.on("play", () => movie.play());
socket.on("pause", () => movie.pause());
