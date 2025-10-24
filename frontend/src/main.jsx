import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router";
import App from "./App";
import ChatRoom from "./ChatRoom";
import './index.css'
import CanvasTest from "./CanvasTest";

const root = document.getElementById("root");

ReactDOM.createRoot(root).render(
  <BrowserRouter>
    <Routes>
      <Route path="/" element={<App />} />
      {/* <Route path="/" element={<CanvasTest />} /> */}
      <Route path="/:roomId" element={<ChatRoom />} />
    </Routes>
  </BrowserRouter>,
);
