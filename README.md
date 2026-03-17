# PLayAuction - IPL Auction Application

A comprehensive real-time IPL Auction application built with React, Node.js, Express, and Socket.io. This platform allows users to experience a simulated IPL auction with real-time bidding, AI evaluations, and performance tracking.

## 🚀 Features

- **Real-time Bidding**: Synchronized bidding system using Socket.io for a seamless auction experience.
- **AI-Powered Evaluation**: Advanced AI scoring and recommendations to help teams build the best squad.
- **Squad Management**: Track your team's budget, player count, and squad balance in real-time.
- **3D Stadium Experience**: Immersive 3D visualization of the auction stadium.
- **Live Leaderboard**: Real-time ranks and AI-driven team evaluations.

## 🛠️ Tech Stack

- **Frontend**: React, Vite, Framer Motion, Tailwind CSS, Lucide React, Socket.io-client.
- **Backend**: Node.js, Express, MongoDB (Mongoose), Socket.io, Google Generative AI (Gemini).
- **Other**: UUID, JWT for authentication, dotenv for configuration.

## ⚙️ Prerequisites

- Node.js (Latest LTS version recommended)
- MongoDB (Running locally or a cloud instance)
- Gemini API Key (for AI features)

## 📂 Project Structure

```text
auctiononline/
├── client/          # Frontend React application
├── server/          # Backend Express server
├── package-lock.json
└── README.md
```

## 🛠️ Setup Instructions

### 1. Clone the repository
```bash
git clone <your-repo-url>
cd auctiononline
```

### 2. Backend Setup
1. Navigate to the server directory:
   ```bash
   cd server
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create a `.env` file in the `server` directory and add the following:
   ```env
   PORT=5000
   MONGODB_URI=your_mongodb_uri
   GEMINI_API_KEY=your_gemini_api_key
   JWT_SECRET=your_jwt_secret
   ```
4. Start the server (development):
   ```bash
   npm run dev
   ```

### 3. Frontend Setup
1. Navigate to the client directory:
   ```bash
   cd ../client
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create a `.env` file in the `client` directory:
   ```env
   VITE_API_URL=http://localhost:5000
   ```
4. Start the frontend:
   ```bash
   npm run dev
   ```

## 📄 License

This project is licensed under the ISC License.
