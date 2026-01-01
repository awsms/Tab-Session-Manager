import React from "react";
import { Route, Routes } from "react-router-dom";
import browserInfo from "browser-info";
import SettingsPage from "./SettingsPage";
import SessionsPage from "./SessionsPage";
import KeyboardShortcutsPage from "./KeyboardShortcutsPage";
import InformationPage from "./InformationPage";
import "../styles/ContentsArea.scss";

const isValidShortcuts = browserInfo().name == "Firefox" && browserInfo().version >= 60;

export default () => (
  <div className="contentsArea">
    <Routes>
      <Route path="/settings" element={<SettingsPage />} />
      <Route path="/sessions" element={<SessionsPage />} />
      {isValidShortcuts && <Route path="/shortcuts" element={<KeyboardShortcutsPage />} />}
      <Route path="/information" element={<InformationPage />} />
      <Route path="*" element={<SettingsPage />} />
    </Routes>
  </div>
);
