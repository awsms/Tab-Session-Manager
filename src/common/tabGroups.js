import browser from "webextension-polyfill";
import browserInfo from "browser-info";
import log from "loglevel";
import { setSettings } from "../settings/settings";

const logDir = "common/tabGroups";

export const isEnabledTabGroups =
  (browserInfo().name == "Chrome" && browserInfo().version >= 89) ||
  (browserInfo().name == "Firefox" && browserInfo().version >= 139);

export const queryTabGroups = async (queryInfo = {}) => {
  try {
    const tabGroups = await browser.tabGroups.query(queryInfo);
    log.log(logDir, "queryTabGroups", tabGroups);
    return tabGroups;
  } catch (e) {
    log.error(logDir, "queryTabGroups", e);
    return [];
  }
};

export const updateTabGroups = async (groupId, updateProperties) => {
  log.log(logDir, "updateTabGroups");
  const { title, color, collapsed } = updateProperties;
  await browser.tabGroups.update(groupId, {
    title,
    color,
    collapsed
  });
};

export const handleSaveTabGroupsChange = async (id, checked) => {
  // NOTE: Chrome requires the tabGroups permission
  // The tabGroups permission is optional in Chrome to avoid update warnings
  if (checked && browserInfo().name === "Chrome") {
    const isGranted = await browser.permissions.request({ permissions: ["tabGroups"] });
    log.log(logDir, "handleSaveTabGroupsChange", isGranted);
    if (!isGranted) {
      setSettings(id, false);
      return;
    }
  }
  setSettings(id, checked);
};
