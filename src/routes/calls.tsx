import { configureEcho, useEcho, useEchoPublic } from "@laravel/echo-react";
import ky from "ky";
import { useEffect, useRef, useState } from "react";

// const APP_URL = "https://pregnant-speech-humanity-diabetes.trycloudflare.com";
const APP_URL = "http://localhost";
const BROADCAST_URL =
  "interval-democratic-compatibility-marketing.trycloudflare.com";

function diffStrings(a, b) {
  let diffs = [];
  let max = Math.max(a.length, b.length);

  for (let i = 0; i < max; i++) {
    if (a[i] !== b[i]) {
      diffs.push({ index: i, a: a[i] || "", b: b[i] || "" });
    }
  }

  return diffs;
}

configureEcho({
  broadcaster: "reverb",
  key: "uohzyrztajtu1bmmk0oq", // любой ключ, можно фиктивный
  wsHost: "localhost",
  wsPort: 8080,
  forceTLS: false,
  enabledTransports: ["ws"],
  authEndpoint: "http://localhost/broadcasting/auth",
  // wsHost: BROADCAST_URL,
  // wsPort: 443,
  // forceTLS: true,
  // enabledTransports: ["ws", "wss"],
});

const servers = {
  iceServers: [
    {
      urls: ["stun:stun1.l.google.com:19302", "stun:stun2.l.google.com:19302"],
    },
  ],
  iceCandidatePoolSize: 10,
};

export default function VoiceChat({ room = "demo" }) {
  const peerConnection = useRef<RTCPeerConnection>(null);
  const localStream = useRef<MediaStream>(null);
  const remoteStream = useRef<MediaStream>(null);

  const localVideo = useRef<HTMLVideoElement>(null);
  const remoteVideo = useRef<HTMLVideoElement>(null);

  const [webcamStarted, setWebcamStarted] = useState(false);
  const [callId, setCallId] = useState("");

  useEffect(() => {
    // peerConnection.current = new RTCPeerConnection(servers);
    peerConnection.current = new RTCPeerConnection();
  }, []);

  useEchoPublic(
    `call.${callId}`,
    ".call-joined",
    (event) => {
      if (!peerConnection.current.currentRemoteDescription && event.call.answer) {
        const answerDescription = new RTCSessionDescription({
          type: event.call.answer.type,
          sdp: `${event.call.answer.sdp}\r\n`,
        });
        peerConnection.current.setRemoteDescription(answerDescription);
      }
    },
    [callId]
  );

  useEchoPublic(
    `call.${callId}`,
    ".candidate-added",
    (event) => {
      const candidate = new RTCIceCandidate(event.candidate.candidate_data);
      peerConnection.current.addIceCandidate(candidate);
    },
    [callId]
  );

  const startWebcam = async () => {
    localStream.current = await navigator.mediaDevices.getUserMedia({
      video: true,
      audio: true,
    });
    remoteStream.current = new MediaStream();

    localStream.current.getTracks().forEach((track) => {
      peerConnection.current.addTrack(track, localStream.current);
    });

    peerConnection.current.ontrack = (event) => {
      event.streams[0].getTracks().forEach((track) => {
        remoteStream.current.addTrack(track);
      });
    };

    localVideo.current.srcObject = localStream.current;
    remoteVideo.current.srcObject = remoteStream.current;

    setWebcamStarted(true);
  };

  const call = async () => {
    const offerDescription = await peerConnection.current.createOffer();
    await peerConnection.current.setLocalDescription(offerDescription);

    const offer = {
      type: offerDescription.type,
      sdp: offerDescription.sdp,
    };

    const call = await ky
      .post(`${APP_URL}/api/call`, {
        json: {
          offer,
        },
      })
      .json();

    setCallId(call.id);

    peerConnection.current.onicecandidate = async (event) => {
      event.candidate &&
        (await ky.post(`${APP_URL}/api/call/${call.id}/candidate`, {
          json: {
            type: "offer",
            candidate_data: event.candidate.toJSON(),
          },
        }));
    };

    // hangupButton.disabled = false;
  };

  const answer = async () => {
    const call = await ky.get(`${APP_URL}/api/call/${callId}`).json();

    peerConnection.current.onicecandidate = async (event) => {
      event.candidate &&
        (await ky.post(`${APP_URL}/api/call/${call.id}/candidate`, {
          json: {
            type: "answer",
            candidate_data: event.candidate.toJSON(),
          },
        }));
    };

    const offerDescription = new RTCSessionDescription({
      ...call.offer,
      sdp: `${call.offer.sdp}\r\n`,
    });
    await peerConnection.current.setRemoteDescription(offerDescription);

    const answerDescription = await peerConnection.current.createAnswer();
    await peerConnection.current.setLocalDescription(answerDescription);

    const answer = {
      type: answerDescription.type,
      sdp: answerDescription.sdp,
    };

    await ky
      .post(`${APP_URL}/api/call/${call.id}/join`, {
        json: {
          answer,
        },
      })
      .json();

    // offerCandidates.onSnapshot((snapshot) => {
    //   snapshot.docChanges().forEach((change) => {
    //     console.log(change);
    //     if (change.type === 'added') {
    //       let data = change.doc.data();
    //       pc.addIceCandidate(new RTCIceCandidate(data));
    //     }
    //   });
    // });
  };

  return (
    <section className="bg-black">
      <h2>1. Start your Webcam</h2>

      <div>
        <div>
          <h3>Local Stream</h3>
          <video ref={localVideo} autoPlay playsInline></video>
        </div>

        <div>
          <h3>Remote Stream</h3>
          <video ref={remoteVideo} autoPlay playsInline></video>
        </div>
      </div>

      <button onClick={startWebcam} disabled={webcamStarted}>
        Start Webcam
      </button>

      <h2>2. Start new Call</h2>
      <button onClick={call} disabled={!webcamStarted}>
        Create a call (offer)
      </button>

      <h2>3. Join a Call</h2>
      <p>Answer the call from a different app</p>

      <input
        type="text"
        value={callId}
        onChange={(e) => setCallId(e.target.value)}
      />
      <button onClick={answer} disabled={!webcamStarted}>
        Answer
      </button>

      <h2>4. Hang up</h2>
      <button disabled={!callId}>Hangup</button>
    </section>
  );
}
