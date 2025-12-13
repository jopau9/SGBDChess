// src/App.tsx
import { Routes, Route } from "react-router-dom";

import LandingPage from "./pages/Landing/LandingPage";
import HomePage from "./pages/Home/HomePage";
import Profile from "./pages/Profile/Profile";
import GameDetails from "./pages/Game/GameDetails";

function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/stats" element={<HomePage />} />
      <Route path="/profile/:username" element={<Profile />} />
      <Route path="/game/:gameId" element={<GameDetails />} />
    </Routes>
  );
}

export default App;
