import React from "react";
import browser from "webextension-polyfill";
import { HashRouter } from "react-router-dom";
import { initSettings, getSettings } from "../../settings/settings";
import SideBar from "./SideBar";
import ContentsArea from "./ContentsArea";
import ScrollToTop from "./ScrollToTop";
import "../styles/OptionsPage.scss";

const setupTheme = async () => {
  await initSettings();
  document.body.dataset.theme = getSettings("theme");

  browser.storage.local.onChanged.addListener(changes => {
    if (changes.Settings.newValue.theme === changes.Settings.oldValue.theme) return;
    document.body.dataset.theme = changes.Settings.newValue.theme;
  });
};

const normalizeHash = () => {
  const { hash } = window.location;
  if (hash.length > 1 && !hash.startsWith("#/")) {
    window.location.hash = `#/${hash.slice(1)}`;
  }
};

export default () => {
  normalizeHash();
  setupTheme();
  return (
    <HashRouter>
      <ScrollToTop>
        <div className="optionsPage">
          <SideBar />
          <ContentsArea />
        </div>
      </ScrollToTop>
    </HashRouter>
  );
};
