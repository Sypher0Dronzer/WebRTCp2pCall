import React, { useEffect, useRef, useState } from "react";
import { userStore } from "./store/userStore";
import { useNavigate, useParams } from "react-router";

const configuration = {
  iceServers: [
    {
      urls: "stun:stun.l.google.com:19302",
    },
  ],
};
const ChatRoom = () => {
  const navigate = useNavigate();
  const { username, socket } = userStore();
  const { roomId } = useParams();
  let pcRef = useRef(null),
    streamRef = useRef(null);
  const localVideoRef = useRef(null);
  const localAudioRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const remoteAudioRef = useRef(null);
  const [remoteName, setRemoteName] = useState("");

  const getMyCam = async () => {
    try {
      streamRef.current = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: true,
      });

      // ----------------------------Method 1 --------------------------
      // const tracks = stream.getTracks()
      // let audioTrack = tracks[0]
      // let videoTrack = tracks[1]
      //  videoTrack= new MediaStream([videoTrack])
      //  audioTrack= new MediaStream([audioTrack])

      // ----------------------------Method 2 --------------------------
      let videoTrack = streamRef.current.getVideoTracks(); //returns an array of obj type MediaStreamTrack
      let audioTrack = streamRef.current.getAudioTracks(); //returns an array of obj type MediaStreamTrack
      videoTrack = new MediaStream(videoTrack);
      audioTrack = new MediaStream(audioTrack);

      localVideoRef.current.srcObject = videoTrack;
      localAudioRef.current.srcObject = audioTrack;

      const allTracks = streamRef.current.getTracks();
      pcRef.current = new RTCPeerConnection(configuration);
      allTracks.forEach((track) =>
        pcRef.current.addTrack(track, streamRef.current)
      );

      // ----------- the first 3 are essential for the streaming with webrtc
      pcRef.current.onicecandidate = handleICECandidateEvent;
      pcRef.current.ontrack = handleTrackEvent; //This handler for the track event is called by the local WebRTC layer when a track is added to the connection.
      pcRef.current.onnegotiationneeded = handleNegotiationNeededEvent;

      //-------------- The rest aren't strictly required but can be useful
      // pcRef.current.onremovetrack = handleRemoveTrackEvent;
      pcRef.current.oniceconnectionstatechange =
        handleICEConnectionStateChangeEvent;
      // pcRef.current.onicegatheringstatechange = handleICEGatheringStateChangeEvent;
      // pcRef.current.onsignalingstatechange = handleSignalingStateChangeEvent;
    } catch (err) {
      console.log(err);
    }
  };

  async function handleNegotiationNeededEvent() {
    // This function is called whenever the WebRTC infrastructure needs you to start the session negotiation process anew. Its job is to create and send an offer, to the callee, asking it to connect with us. See Starting negotiation to see how we handle this.
    // console.log("event triggered ", e);

    socket.emit("newUser", { name: username, roomId });

    const offer = await pcRef.current.createOffer();
    // If the connection hasn't yet achieved the "stable" state,
    // return to the caller. Another negotiationneeded event
    // will be fired when the state stabilizes.

    if (pcRef.current.signalingState != "stable") {
      console.log("     -- The connection isn't stable yet; postponing...");
      return;
    }

    await pcRef.current.setLocalDescription(offer);
    // console.log("offer created & set to local description");

    // Send the offer to the remote peer.
    socket.emit("send-offer", {
      name: username,
      roomId,
      offer: pcRef.current.localDescription,
    });
  }

  function handleTrackEvent(e) {
    if (e.track.kind == "video")
      remoteVideoRef.current.srcObject = new MediaStream([e.track]);
    else remoteAudioRef.current.srcObject = new MediaStream([e.track]);
  }

  function handleICECandidateEvent(e) {
    if (e.candidate)
      socket.emit("new-ice-candidate", { candidate: e.candidate, roomId });
  }

  function handleICEConnectionStateChangeEvent() {
    switch (pcRef.current.iceConnectionState) {
      case "closed":
      case "failed":
      case "disconnected":
        closeVideoCall();
        break;
    }
  }

  function closeVideoCall() {
    if (pcRef.current) {
      pcRef.current.ontrack = null;
      pcRef.current.onicecandidate = null;
      pcRef.current.oniceconnectionstatechange = null;
      pcRef.current.onsignalingstatechange = null;
      pcRef.current.onicegatheringstatechange = null;
      pcRef.current.onnotificationneeded = null;
      pcRef.current.getTransceivers().forEach((transceiver) => {
        transceiver.stop();
      });

      if (localVideoRef.current.srcObject) {
        // localVideoRef.pause();
        localVideoRef.current.srcObject.getTracks().forEach((track) => {
          track.stop();
        });
      }

      // Close the peer connection

      pcRef.current.close();
      pcRef.current = null;
      streamRef.current = null;
    }
    socket.emit("peer-left");
    setRemoteName("");
    navigate("/");
  }

  useEffect(() => {
    if (localVideoRef) {
      getMyCam();
    }

    return () => {
      closeVideoCall();
    };
  }, [localVideoRef]);

  // clean up for socket
  useEffect(() => {
    if (!socket) return;

    const handleReceiveOffer = async ({ offer, from, name }) => {
      setRemoteName(name);
      if (!pcRef.current) return;
      await pcRef.current.setRemoteDescription(
        new RTCSessionDescription(offer)
      );
      const answer = await pcRef.current.createAnswer();
      await pcRef.current.setLocalDescription(answer);
      socket.emit("send-answer", { to: from, answer, name:username });
    };

    const handleReceiveAnswer = ({ answer,name }) => {
      setRemoteName(name)
      if (!pcRef.current) return;
      pcRef.current.setRemoteDescription(new RTCSessionDescription(answer));
    };

    const handleNewICECandidate = ({ candidate }) => {
      if (!pcRef.current) return;
      pcRef.current.addIceCandidate(new RTCIceCandidate(candidate));
    };
    const handleRoomFull = ({ message }) => {
      alert(message); // or show in UI
      navigate("/"); // send them back to home or lobby
    };

    socket.on("receive-offer", handleReceiveOffer);
    socket.on("receive-answer", handleReceiveAnswer);
    socket.on("receive-new-ice-candidate", handleNewICECandidate);
    socket.on("room-full", handleRoomFull);

    return () => {
      socket.off("receive-offer", handleReceiveOffer);
      socket.off("receive-answer", handleReceiveAnswer);
      socket.off("receive-new-ice-candidate", handleNewICECandidate);
      socket.off("room-full", handleRoomFull);
    };
  }, [socket]);

  return (
    <div className="bg-black min-h-screen text-white py-6 px-4 flex flex-col justify-between ">
      <h1 className="text-center font-semibold text-4xl mb-4">
        Welcome to Room {roomId}
      </h1>
      <div className="flex flex-wrap justify-center gap-4 items-center">
        <div className="rounded-lg overflow-hidden ">
          <p className="text-xl text-white text-center mb-3">
            {username} (You)
          </p>
          <video autoPlay height={400} width={400} ref={localVideoRef}></video>
          <audio  ref={localAudioRef}></audio>
        </div>

        <div className="rounded-lg overflow-hidden ">
          {remoteAudioRef && (
            <p className="text-xl text-white text-center mb-3">{remoteName} </p>
          )}

          <video autoPlay height={400} width={400} ref={remoteVideoRef}></video>
          <audio autoPlay  ref={remoteAudioRef}></audio>
        </div>
      </div>

      <div className="flex justify-center">
        <button
          onClick={closeVideoCall}
          className="py-2 px-4 bg-red-600 border border-white/40 hover:bg-red-800 text-white/80 hover;text-white/60 font-semibold  rounded-full cursor-pointer"
        >
          End Call
        </button>
      </div>
    </div>
  );
};

export default ChatRoom;
