// src/App.tsx
import { Routes, Route } from "react-router-dom";

import HomePage from "./pages/Home/HomePage";
import Profile from "./pages/Profile/Profile";

function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/player/:username" element={<Profile />} />
    </Routes>
  );
}

export default App;
