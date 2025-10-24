import React, { useEffect, useRef, useState } from "react";
import { userStore } from "./store/userStore";
import { useNavigate, useParams } from "react-router";
import CanvasTest from "./CanvasTest";

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
  // const localAudioRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const remoteAudioRef = useRef(null);
  const localScreenShareRef = useRef(null);
  const remoteScreenShareRef = useRef(null);
  const [localScreenShare, setLocalScreenShare] = useState(false);
  const [remoteScreenShare, setRemoteScreenShare] = useState(false);
  const [remoteName, setRemoteName] = useState("");
  const [remoteConnected, setRemoteConnected] = useState(false);
  const screenTrackRef = useRef(null);
  const [hasVideo, setHasVideo] = useState(false);
  const [hasAudio, setHasAudio] = useState(false);
  const [remoteHasVideo, setRemoteHasVideo] = useState(false); // to show if remote video is on or off
  const [remoteHasAudio, setRemoteHasAudio] = useState(false); // to show if remote audio is on or off

  const [remoteAudioStream, setRemoteAudioStream] = useState(null);
  const expectedScreenShareTrackIds = useRef(new Set());

  const createPeerConnection = () => {
    pcRef.current = new RTCPeerConnection(configuration);

    // ----------- the first 3 are essential for the streaming with webrtc
    pcRef.current.onicecandidate = handleICECandidateEvent;
    pcRef.current.ontrack = handleTrackEvent; //This handler for the track event is called by the local WebRTC layer when a track is added to the connection.
    pcRef.current.onnegotiationneeded = handleNegotiationNeededEvent;

    pcRef.current.oniceconnectionstatechange =
      handleICEConnectionStateChangeEvent;
    //-------------- The rest aren't strictly required but can be useful
    // pcRef.current.onremovetrack = handleRemoveTrackEvent;
    // pcRef.current.onicegatheringstatechange = handleICEGatheringStateChangeEvent;
    // pcRef.current.onsignalingstatechange = handleSignalingStateChangeEvent;
  };

  const getUserMediaSafe = async () => {
    let stream = new MediaStream();

    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        // audio: true,
        video: true,
      });

      stream = mediaStream;
      stream.addTrack(mediaStream.getVideoTracks()[0],mediaStream);
    } catch (err) {
      console.warn("User denied camera", err);
    }


      // Try to get only audio if video was denied
      try {
        const audioOnly = await navigator.mediaDevices.getUserMedia({
          audio: true,
        });
        stream.addTrack(audioOnly.getAudioTracks()[0],audioOnly);
      } catch (err2) {
        console.warn("User also denied audio:", err2);
        // no mic, no cam — fallback to empty stream
      }

    return stream;
  };

  const attachLocalMedia = (stream) => {
    if (!stream) return;

    streamRef.current = stream;

    // ----------------------------Method 1 --------------------------
    // const tracks = stream.getTracks()
    // let audioTrack = tracks[0]
    // let videoTrack = tracks[1]
    //  videoTrack= new MediaStream([videoTrack])
    //  audioTrack= new MediaStream([audioTrack])

    // ----------------------------Method 2 --------------------------
    let videoTracks = stream.getVideoTracks(); //returns an array of obj type MediaStreamTrack
    let audioTracks = stream.getAudioTracks(); //returns an array of obj type MediaStreamTrack

    setHasVideo(videoTracks.length > 0);
    setHasAudio(audioTracks.length > 0);

    if (videoTracks.length > 0) {
      const videoStream = new MediaStream(videoTracks);
      localVideoRef.current.srcObject = videoStream;
    }

    // if (audioTracks.length > 0) {
    //   const audioStream = new MediaStream(audioTracks);
    //   localAudioRef.current.srcObject = audioStream;
    // }

    // add all tracks to peer connection
    stream
      .getTracks()
      .forEach((track) => pcRef.current.addTrack(track, stream));
  };

  const initializeMediaAndConnection = async () => {
    createPeerConnection();
    const stream = await getUserMediaSafe();
    attachLocalMedia(stream);

    // Only manually trigger if NO tracks were added
    // (meaning both video and audio were denied)
    const senders = pcRef.current.getSenders();
    const hasAnyTracks = senders.some((sender) => sender.track !== null);

    if (!hasAnyTracks && pcRef.current.signalingState === "stable") {
      handleNegotiationNeededEvent();
    }
  };

  async function handleNegotiationNeededEvent() {
    // This function is called whenever the WebRTC infrastructure needs you to start the session negotiation process anew. Its job is to create and send an offer, to the callee, asking it to connect with us. See Starting negotiation to see how we handle this.
    // console.log("event triggered ");

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
    // console.log(
    //   "handle track triggered :",
    //   e.track.kind,
    //   " track ID:",
    //   e.track.id
    // );
    // if (e.track.kind == "video") {

    //    if (!remoteVideoRef.current.srcObject ) {
    //     setRemoteHasVideo(true);
    //     remoteVideoRef.current.srcObject = new MediaStream([e.track]);
    //   }
    //   else {
    //     remoteScreenShareRef.current.srcObject = new MediaStream([e.track]);
    //   }
    // }

    if (e.track.kind === "video") {
      // Check if this track ID is a screen share
      if (expectedScreenShareTrackIds.current.has(e.track.id)) {
        // console.log("This is a screen share track!");
        remoteScreenShareRef.current.srcObject = new MediaStream([e.track]);
        expectedScreenShareTrackIds.current.delete(e.track.id); // Clean up
      } else {
        // This is regular camera video
        // console.log("This is a camera track");
        remoteVideoRef.current.srcObject = new MediaStream([e.track]);
        setRemoteHasVideo(true);
        // if (!remoteVideoRef.current.srcObject) {
        // }
      }
    }

    // else it is audio
    else if (e.track.kind === "audio") {
      setRemoteHasAudio(true);
      const newStream = new MediaStream([e.track]);
      remoteAudioRef.current.srcObject = newStream;

      // capture stream for visualizer (after element has attached)
      setTimeout(() => {
        try {
          const captured =
            remoteAudioRef.current?.captureStream?.() ||
            remoteAudioRef.current?.mozCaptureStream?.();
          if (captured) setRemoteAudioStream(captured);
        } catch (err) {
          console.warn("Audio visualization not supported:", err);
        }
      }, 500); // short delay to ensure <audio> has begun playback
    }
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
      // Reset connection to allow new peer to join
      resetForNewConnection();
            setRemoteConnected(false);
        socket.emit("peer-left");

        break;
    }
  }
  const resetForNewConnection = () => {
  // Close old peer connection if exists
  if (pcRef.current) {
    pcRef.current.ontrack = null;
    pcRef.current.onicecandidate = null;
    pcRef.current.oniceconnectionstatechange = null;
    pcRef.current.onnegotiationneeded = null;
    
    pcRef.current.close();
    pcRef.current = null;
  }
  
  // Reset remote states
  setRemoteConnected(false);
  setRemoteName("");
  setRemoteHasVideo(false);
  setRemoteHasAudio(false);
  setRemoteScreenShare(false);
  setRemoteAudioStream(null);
  expectedScreenShareTrackIds.current.clear();
  
  // Clear remote video/audio refs
  if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
  if (remoteAudioRef.current) remoteAudioRef.current.srcObject = null;
  if (remoteScreenShareRef.current) remoteScreenShareRef.current.srcObject = null;
  
  // Re-initialize peer connection with local media
  initializeMediaAndConnection();
};

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
      expectedScreenShareTrackIds.current.clear(); // Clear all expected IDs

      // Close the peer connection

      pcRef.current.close();
      pcRef.current = null;
      streamRef.current = null;
    }
    socket.emit("peer-left");
    setRemoteName("");
    navigate("/");
  }

  const endScreenShare = () => {
    const track = screenTrackRef.current;
    if (!track) return;

    // Stop the track — this will also trigger 'ended' event if still active
    track.stop();
    screenTrackRef.current = null;

    // Remove the video from your UI
    if (localScreenShareRef.current) {
      localScreenShareRef.current.srcObject = null;
    }
    setLocalScreenShare(false);

    // Optionally remove track from peer connection
    const sender = pcRef.current?.getSenders()?.find((s) => s.track === track);
    if (sender) pcRef.current.removeTrack(sender);
    // Notify remote peer
    socket.emit("screen-share-stopped", { roomId, from: username });
  };

  const toggleVideo = async () => {
    if (!streamRef.current) return;

    const videoTrack = streamRef.current.getVideoTracks()[0];

    // If no video track exists (was denied initially), request permission
    if (!videoTrack) {
      alert("Please allow camera access to enable video");

      // try {
      //   const newStream = await navigator.mediaDevices.getUserMedia({
      //     video: true,
      //   });
      //   const newVideoTrack = newStream.getVideoTracks()[0];

      //   // Add to streamRef
      //   streamRef.current.addTrack(newVideoTrack);

      //   // Display locally
      //   const videoStream = new MediaStream([newVideoTrack]);
      //   localVideoRef.current.srcObject = videoStream;

      //   // Add to peer connection
      //   pcRef.current.addTrack(newVideoTrack, streamRef.current);

      //   setHasVideo(true);
      //   socket.emit("video-toggled", {
      //     roomId,
      //     from: username,
      //     enabled: true,
      //   });
      // } catch (err) {
      //   console.error("Video permission denied:", err);
      //   alert("Please allow camera access to enable video");
      // }
      return;
    }

    // If track exists, just toggle it
    videoTrack.enabled = !videoTrack.enabled;
    setHasVideo(videoTrack.enabled);
    if (!videoTrack.enabled) {
      videoTrack.stop();
    } else {
      try {
        const newStream = await navigator.mediaDevices.getUserMedia({
          video: true,
        });
        const newVideoTrack = newStream.getVideoTracks()[0];

        // Add to streamRef
        streamRef.current.addTrack(newVideoTrack, newStream);

        // Display locally
        const videoStream = new MediaStream([newVideoTrack]);
        localVideoRef.current.srcObject = videoStream;

        // Add to peer connection
        pcRef.current.addTrack(newVideoTrack, streamRef.current);

        setHasVideo(true);
        socket.emit("video-toggled", {
          roomId,
          from: username,
          enabled: true,
        });
      } catch (err) {
        console.error("Video permission denied:", err);
        alert("Please allow camera access to enable video");
      }

      return;
    }

    socket.emit("video-toggled", {
      roomId,
      from: username,
      enabled: videoTrack.enabled,
    });
  };

  const toggleAudio = async () => {
    if (!streamRef.current) return;

    const audioTrack = streamRef.current.getAudioTracks()[0];
    // If no audio track exists (was denied initially), request permission
    if (!audioTrack) {
      try {
        const newStream = await navigator.mediaDevices.getUserMedia({
          audio: true,
        });
        const newAudioTrack = newStream.getAudioTracks()[0];

        // Add to streamRef
        streamRef.current.addTrack(newAudioTrack);

        // Display locally
        // const audioStream = new MediaStream([newAudioTrack]);
        // localAudioRef.current.srcObject = audioStream;

        // Add to peer connection
        pcRef.current.addTrack(newAudioTrack, streamRef.current);

        setHasAudio(true);
        socket.emit("audio-toggled", {
          roomId,
          from: username,
          enabled: true,
        });
      } catch (err) {
        console.error("Audio permission denied:", err);
        alert("Please allow microphone access to enable audio");
      }
      return;
    }
    audioTrack.enabled = !audioTrack.enabled;
    setHasAudio(audioTrack.enabled);

    // Notify remote peer
    socket.emit("audio-toggled", {
      roomId,
      from: username,
      enabled: audioTrack.enabled,
    });
  };

  const shareScreen = async () => {
    try {
      const screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: false,
      });

      const screenTrack = screenStream.getVideoTracks()[0];
      localScreenShareRef.current.srcObject = screenStream;
      screenTrackRef.current = screenTrack; // store it globally
      // Add track to peer connection

      const sender = pcRef.current.addTrack(screenTrack, screenStream);

      // Get the track ID that will be sent to remote
      // The sender.track.id is what the remote peer will receive
      const trackId = sender.track.id;

      socket.emit("screen-share-started", {
        roomId,
        from: username,
        trackId: trackId,
      });
      //  await new Promise(resolve => setTimeout(resolve, 1000));

      // let sender = pcRef.current.addTrack(screenTrack, screenStream);
      // this way we directly have the sender screenshare reference which we can delete using removeTrack

      // Notify remote peer that screen share started

      // Handle when user stops sharing

      screenTrack.addEventListener("ended", () => {
        endScreenShare();
      });
      // screenTrack.addEventListener("ended", () => {
      //   // Remove this track from peer connection
      //   // const sender = pcRef.current
      //   //   .getSenders()
      //   //   .find((s) => s.track === screenTrack);

      //   if (sender) {
      //     pcRef.current.removeTrack(sender);
      //   }
      //   localScreenShareRef.current.srcObject = null;
      //   setLocalScreenShare(false);

      //   // Notify remote peer
      //   socket.emit("screen-share-stopped", { roomId, from: username });
      // });
    } catch (err) {
      console.error("Error sharing screen:", err);
    }
  };

  useEffect(() => {
    initializeMediaAndConnection();
    return () => closeVideoCall();
  }, []);

  // clean up for socket
  useEffect(() => {
    if (!socket) return;

    const handleReceiveOffer = async ({ offer, from, name }) => {
      setRemoteConnected(true);
      setRemoteName(name);

      if (!pcRef.current) return;
      await pcRef.current.setRemoteDescription(
        new RTCSessionDescription(offer)
      );
      const answer = await pcRef.current.createAnswer();
      await pcRef.current.setLocalDescription(answer);
      socket.emit("send-answer", { to: from, answer, name: username });
    };

    const handleReceiveAnswer = ({ answer, name }) => {
      setRemoteConnected(true);

      setRemoteName(name);
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

    socket.on("video-toggled", ({ from, enabled }) => {
      console.log(`${from} toggled video: ${enabled}`);
      setRemoteHasVideo(enabled);
    });

    socket.on("audio-toggled", ({ from, enabled }) => {
      console.log(`${from} toggled audio: ${enabled}`);
      setRemoteHasAudio(enabled);
    });

    // when remote starts sharing
    socket.on("screen-share-started", ({ from, trackId }) => {
      console.log(`${from} started screen sharing, trackId: ${trackId}`);
      if (trackId) {
        expectedScreenShareTrackIds.current.add(trackId);
      }
      // we put a check incase there is the remote video of user missing

      console.log(`${from} started screen sharing`);

      setRemoteScreenShare(true);
    });

    // when remote stops sharing
    socket.on("screen-share-stopped", ({ from }) => {
      console.log(`${from} stopped screen sharing`);
      setRemoteScreenShare(false);
      expectedScreenShareTrackIds.current.clear(); // Clear all expected IDs
      if (remoteScreenShareRef.current)
        remoteScreenShareRef.current.srcObject = null;
    });

    socket.on("receive-offer", handleReceiveOffer);
    socket.on("receive-answer", handleReceiveAnswer);
    socket.on("receive-new-ice-candidate", handleNewICECandidate);
    socket.on("room-full", handleRoomFull);

    return () => {
      socket.off("receive-offer", handleReceiveOffer);
      socket.off("receive-answer", handleReceiveAnswer);
      socket.off("receive-new-ice-candidate", handleNewICECandidate);
      socket.off("room-full", handleRoomFull);
      socket.off("screen-share-started");
      socket.off("screen-share-stopped");
      socket.off("video-toggled");
      socket.off("audio-toggled");
    };
  }, [socket, username, navigate]);

  return (
    <div className="bg-black min-h-screen text-white py-6 px-4 flex flex-col justify-between ">
      <h1 className="text-center font-semibold text-4xl mb-4">
        Welcome to Room {roomId}
      </h1>
      <div className="flex flex-wrap justify-center gap-4 items-center">
        {/* ------------------------------local ---------------------- */}
        <div className="overflow-hidden  ">
          <p className="text-xl text-white text-center mb-3">
            {username} (You)
          </p>

          <div className="relative">
            {/* Always render video element */}
            <video
              autoPlay
              muted
              height={400}
              width={400}
              ref={localVideoRef}
              className={`${
                !hasVideo ? "opacity-0" : "opacity-100"
              } transition-opacity rounded-lg `}
            ></video>

            {/* Overlay fallback text */}
            {!hasVideo && (
              <div className="absolute rounded-2xl font-bold inset-0 flex items-center justify-center bg-green-800 text-gray-300 text-2xl">
                <div className="rounded-full size-22 bg-green-600 border border-dashed flex justify-center items-center">
                  <p>{username[0]}</p>
                </div>
              </div>
            )}

            {/* Audio placeholder */}
            {/* <audio muted autoPlay ref={localAudioRef}></audio> */}
            {!hasAudio && (
              <div className="absolute bottom-2 right-2 rounded-2xl px-2 py-1 bg-white text-black/90">
                <p className="text-center font-semibold text-sm">
                  Mic is off 🎙️
                </p>
              </div>
            )}
          </div>
        </div>

        {/* ------------------------------remote video ----------------------- */}
        {remoteConnected && (
          <div className="rounded-lg overflow-hidden r">
            <p className="text-xl text-white text-center mb-3">{remoteName}</p>

            <div className="relative ">
              <video
                autoPlay
                height={400}
                width={400}
                muted
                ref={remoteVideoRef}
                className={`${
                  !remoteHasVideo ? "opacity-0" : "opacity-100"
                } transition-opacity rounded-lg`}
              ></video>

              {!remoteHasVideo && !remoteHasAudio && (
                <div className="absolute rounded-2xl font-bold inset-0 flex items-center justify-center bg-green-800 text-gray-300 text-2xl">
                  <div className="rounded-full size-22 bg-green-600 border border-dashed flex justify-center items-center">
                    <p>{remoteName[0]}</p>
                  </div>
                </div>
              )}
              {!remoteHasVideo && remoteHasAudio && remoteAudioStream && (
                <div className="absolute rounded-2xl  inset-0 border border-white/70">
                  <div className="relative h-full">
                    <div className="rounded-full overflow-hidden absolute top-1/2 -translate-1/2 left-1/2 size-22 bg-green-600 border border-dashed text-gray-300 text-2xl font-bold flex justify-center items-center">
                      <p>{remoteName[0]}</p>
                    </div>
                    <CanvasTest externalStream={remoteAudioStream} />
                  </div>
                </div>
              )}

              <audio autoPlay ref={remoteAudioRef}></audio>
              {!remoteHasAudio && (
                <div className="absolute bottom-2 right-2 rounded-2xl px-2 py-1 bg-white text-black/90">
                  <p className="text-center font-semibold text-sm">
                    Mic is off 🎙️
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* { remoteAudioStream && (
                <div className="mt-6 size-[400px] bg-blue-400">
                  <CanvasTest externalStream={remoteAudioStream} />
                </div>
              )} */}

        {/* ------------------------------Screen Sharing --------------------- */}
        {localScreenShare && (
          <div className="rounded-lg overflow-hidden">
            <p className="text-xl text-white text-center mb-3">
              You are presenting
            </p>
            <video
              autoPlay
              height={400}
              muted
              width={400}
              ref={localScreenShareRef}
            ></video>
          </div>
        )}

        {remoteScreenShare && (
          <div className="rounded-lg overflow-hidden">
            <p className="text-xl text-white text-center mb-3">
              {remoteName} is presenting
            </p>
            <video
              autoPlay
              muted
              height={400}
              width={400}
              ref={remoteScreenShareRef}
            ></video>
          </div>
        )}
      </div>
      {/* ------------------------------Buttons ----------------------- */}
      <div className="flex justify-center gap-4">
        <button
          onClick={closeVideoCall}
          className="py-2 px-4 bg-red-600 border border-white/40 hover:bg-red-800 text-white/80 hover;text-white/60 font-semibold  rounded-full cursor-pointer"
        >
          End Call
        </button>
        <button
          onClick={() => {
            if (!remoteConnected) {
              alert(
                "Wait for another user to join before sharing your screen!"
              );
              return;
            }
            if (!localScreenShare) {
              setLocalScreenShare(true);
              shareScreen();
            } else {
              endScreenShare(); // manually trigger stop + cleanup
              setLocalScreenShare(false);
            }
          }}
          className="py-2 px-4 bg-blue-600 hover:bg-blue-800 text-white font-semibold rounded-full cursor-pointer mr-4"
        >
          {localScreenShare ? "End Screen Share" : "Share Screen"}
        </button>

        <button
          onClick={toggleVideo}
          className="py-2 px-4 bg-gray-600 hover:bg-gray-800 text-white font-semibold rounded-full cursor-pointer"
        >
          {hasVideo ? "Turn Off Video" : "Turn On Video"}
        </button>

        <button
          onClick={toggleAudio}
          className="py-2 px-4 bg-gray-600 hover:bg-gray-800 text-white font-semibold rounded-full cursor-pointer"
        >
          {hasAudio ? "Mute" : "Unmute"}
        </button>
      </div>
    </div>
  );
};

export default ChatRoom;
