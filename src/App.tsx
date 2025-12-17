// src/App.tsx
import { Routes, Route } from "react-router-dom";

import LandingPage from "./pages/Landing/LandingPage";
import HomePage from "./pages/Home/HomePage";
import Profile from "./pages/Profile/Profile";
import GameDetails from "./pages/Game/GameDetails";

import { AuthProvider } from "./context/AuthContext";
import Login from "./pages/Auth/Login";
import Register from "./pages/Auth/Register";
import Settings from "./pages/Settings/Settings";

function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/stats" element={<HomePage />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/profile/:username" element={<Profile />} />
        <Route path="/game/:gameId" element={<GameDetails />} />
        <Route path="/settings" element={<Settings />} />
      </Routes>
    </AuthProvider>
  );
}

export default App;
