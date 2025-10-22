import React, { useState } from "react";
import { useNavigate } from "react-router";
import { userStore } from "./store/userStore";
const App = () => {
  // const [name, setName] = useState("Soham");
  const { username, setUsername } = userStore();
  const [room, setRoom] = useState("1");
  const navigator = useNavigate();
  function handleJoinRoom(e) {
    e.preventDefault();
    navigator(`/${room}`);
  }

  return (
    <div className="h-screen bg-black/90 text-white flex justify-center items-center">
      <form
        action=""
        className="flex flex-col space-y-3"
        onSubmit={handleJoinRoom}
      >
        <div className="">
          <p className="inline">Enter your name</p>
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="bg-white/80 ml-4 text-black"
            type="text"
          />
        </div>

        <div className="">
          <p className="inline">Room ID</p>
          <input
            value={room}
            onChange={(e) => setRoom(e.target.value)}
            className="bg-white/80 ml-4 text-black"
            type="text"
          />
        </div>

        <button
          onClick={handleJoinRoom}
          className="bg-black rounded-full py-2 px-3 border border-white/50"
        >
          Join
        </button>
      </form>
    </div>
  );
};

export default App;
