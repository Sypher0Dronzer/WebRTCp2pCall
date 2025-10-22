
---

# WebRTC P2P Video Call

A simple peer-to-peer (P2P) video calling application using WebRTC, built with a separate frontend and backend.

## 🚀 Features

* Peer-to-peer video calling
* WebRTC-based connection
* Lightweight frontend and backend setup
* Local development ready

---

## 📦 Getting Started

Follow these steps to run the project locally.

### 1. Clone the Repository

```bash
git clone https://github.com/Sypher0Dronzer/WebRTCp2pCall
cd WebRTCp2pCall
```

---

### 2. Setup Frontend

```bash
cd frontend
npm install
npm run dev
```

The frontend will start on [http://localhost:5173](http://localhost:5173) (default Vite port).

---

### 3. Setup Backend

```bash
cd ../backend
npm install
```

Create a `.env` file inside the `backend` directory with the following content:

```env
ENVIROMENT=local
PORT=5000
```

Then run the backend:

```bash
npm run dev
```

The backend server will start on [http://localhost:5000](http://localhost:5000)

---

## ✅ You’re Good to Go!

Once both servers are running, open the frontend URL in your browser and start making peer-to-peer video calls.

---

## 🛠️ Tech Stack

* **Frontend:** Vite + React (or your preferred stack)
* **Backend:** Node.js + Express
* **P2P:** WebRTC

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).

---
