import browser from "webextension-polyfill";
import log from "loglevel";

const logDir = "background/lazyRestore";
const STORAGE_KEY = "lazyRestoreMap";
const DISCARD_DELAY_MS = 300;
const BACKSTOP_DELAY_MS = 1500;

let isInitialized = false;
let isLoaded = false;
let restoreMap = new Map();

const serializeMap = () => {
  const obj = {};
  for (const [key, value] of restoreMap.entries()) obj[key] = value;
  return obj;
};

const ensureLoaded = async () => {
  if (isLoaded) return;
  const stored = await browser.storage.session.get(STORAGE_KEY).catch(() => ({}));
  const raw = stored?.[STORAGE_KEY] || {};
  restoreMap = new Map(
    Object.entries(raw).map(([key, value]) => [parseInt(key, 10), value])
  );
  isLoaded = true;
};

const persist = async () => {
  await browser.storage.session.set({ [STORAGE_KEY]: serializeMap() }).catch(() => { });
};

export const registerLazyRestoreTab = async (tabId, entry) => {
  await ensureLoaded();
  restoreMap.set(tabId, entry);
  await persist();
};

export const removeLazyRestoreTab = async tabId => {
  await ensureLoaded();
  if (!restoreMap.has(tabId)) return;
  restoreMap.delete(tabId);
  await persist();
};

const scheduleDiscard = async (tabId, entry) => {
  if (entry.discardScheduledAt) return;
  entry.discardScheduledAt = Date.now();
  restoreMap.set(tabId, entry);
  await persist();
  setTimeout(async () => {
    try {
      await browser.tabs.discard(tabId);
      entry.discardState = "discarded";
    } catch (e) {
      entry.discardState = "failed";
      log.warn(logDir, "discard failed", tabId, e);
    }
    restoreMap.set(tabId, entry);
    persist();
  }, DISCARD_DELAY_MS);
};

const isMeaningfulUrl = url => url && url !== "about:blank";

const shouldDiscardNow = (entry, tab, changeInfo) => {
  if (!entry.targetUrl) return false;
  if (tab.active) return false;
  if (tab.discarded) return false;
  const hasAssociation =
    tab.pendingUrl === entry.targetUrl ||
    changeInfo.url === entry.targetUrl ||
    tab.url === entry.targetUrl;
  if (hasAssociation) return true;
  if (isMeaningfulUrl(tab.pendingUrl) || isMeaningfulUrl(tab.url)) return true;
  if (changeInfo.status === "loading" && isMeaningfulUrl(changeInfo.url)) return true;
  if (Date.now() - entry.createdAt < BACKSTOP_DELAY_MS) return false;
  return isMeaningfulUrl(tab.pendingUrl) || isMeaningfulUrl(tab.url);
};

const handleTabUpdated = async (tabId, changeInfo, tab) => {
  await ensureLoaded();
  const entry = restoreMap.get(tabId);
  if (!entry) return;
  if (shouldDiscardNow(entry, tab, changeInfo)) {
    scheduleDiscard(tabId, entry);
  }
};

const handleTabActivated = async activeInfo => {
  await ensureLoaded();
  const entry = restoreMap.get(activeInfo.tabId);
  if (!entry) return;
  const tab = await browser.tabs.get(activeInfo.tabId).catch(() => null);
  if (!tab) return;
  if (!tab.url || tab.url === "about:blank") {
    await browser.tabs.update(activeInfo.tabId, { url: entry.targetUrl }).catch(() => { });
  }
  restoreMap.delete(activeInfo.tabId);
  persist();
};

const handleTabRemoved = async tabId => {
  await ensureLoaded();
  if (!restoreMap.has(tabId)) return;
  restoreMap.delete(tabId);
  persist();
};

export const initLazyRestoreListeners = () => {
  if (isInitialized) return;
  isInitialized = true;
  browser.tabs.onUpdated.addListener(handleTabUpdated);
  browser.tabs.onActivated.addListener(handleTabActivated);
  browser.tabs.onRemoved.addListener(handleTabRemoved);
};
