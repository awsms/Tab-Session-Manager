import browser from "webextension-polyfill";
import moment from "moment";
import log from "loglevel";
import getSessions from "./getSessions";
import { getSettings } from "../settings/settings";
import { init } from "./background";

const logDir = "background/export";

export default async function exportSessions(id = null, folderName = "", isBackup = false) {
  log.log(logDir, "exportSessions()", id, folderName, isBackup);
  let sessions = await getSessions(id);
  if (sessions == undefined) return;
  if (!Array.isArray(sessions)) sessions = [sessions];

  // Split sessions to avoid message size limits and performance issues
  const sessionsStringSize = JSON.stringify(sessions).length;
  const MAX_FILE_SIZE = 32 * 1024 * 1024;
  const chunkSize = Math.ceil(sessionsStringSize / MAX_FILE_SIZE);
  const chunkSessions = [];
  for (let i = 0; i < chunkSize; i++) {
    chunkSessions.push(
      sessions.slice((i * sessions.length) / chunkSize, ((i + 1) * sessions.length) / chunkSize)
    );
  }

  for (const [index, chunkSession] of chunkSessions.entries()) {
    const downloadUrl = await createObjectURL(chunkSession);
    const replacedFolderName = replaceFolderName(folderName);
    const fileName = generateFileName(chunkSession, isBackup);

    const downloadId = await browser.downloads
      .download({
        url: downloadUrl,
        filename: `${replacedFolderName}${fileName}${index > 0 ? "_" + index : ""}.json`,
        conflictAction: isBackup ? "overwrite" : "uniquify",
        saveAs: !isBackup
      })
      .catch(e => {
        log.warn(logDir, "exportSessions()", e);
        revokeObjectURL(downloadUrl);
      });

    if (downloadId) recordDownloadUrl(downloadId, downloadUrl, isBackup);
  }
}

function generateFileName(sessions, isBackup) {
  let fileName;
  if (sessions.length == 1) {
    const tagsText = sessions[0].tag.map(tag => `#${tag}`).join(" ");
    const dateText = moment(sessions[0].date).format(getSettings("dateFormat"));
    if (isBackup) fileName = `${dateText} - ${sessions[0].name} ${tagsText} - [${sessions[0].id}]`;
    else fileName = `${sessions[0].name} ${tagsText} - ${dateText}`;
  } else {
    const sessionLabel = browser.i18n.getMessage("sessionLabel");
    const sessionsLabel = browser.i18n.getMessage("sessionsLabel");
    const sessionsCount = `${sessions.length} ${sessions.length === 1 ? sessionLabel : sessionsLabel}`;
    fileName = `${sessionsCount} - ${moment().format(getSettings("dateFormat"))}`;
  }

  const pattern = /\\|\/|\:|\?|\.|"|<|>|\|/g;
  fileName = fileName.replace(pattern, "-").replace(/^( )+/, "");
  return fileName;
}

function replaceFolderName(folderName) {
  const specialChars = /\:|\?|\.|"|<|>|\|/g; // Unusable special characters
  const backSlash = /\\/g; // Single backslash
  const spaces = /\s\s+/g; // Consecutive spaces
  const slashs = /\/\/+/g; // Consecutive slashes
  const sandwich = /(\s\/|\/\s)+(\s|\/)?/g; // Alternating slash and space pattern
  const beginningEnd = /^(\s|\/)+|(\s|\/)+$/g; // Leading/trailing spaces or slashes

  folderName = folderName
    .replace(specialChars, "-")
    .replace(backSlash, "\/")
    .replace(spaces, " ")
    .replace(slashs, "\/")
    .replace(sandwich, "\/")
    .replace(beginningEnd, "");

  if (folderName !== "") folderName += "\/";
  return folderName;
}

// Assume the service worker will not stop between backup start and download completion
let downloadRecords = {};

export const handleDownloadsChanged = async status => {
  await init();
  const downloadUrl = downloadRecords[status.id]?.downloadUrl;
  if (!downloadUrl) return;

  if (status.state?.current === "complete") await revokeDownloadUrl(status.id);
  if (status?.error?.current === "FILE_FAILED") {
    log.error(logDir, "handleDownloadsChanged()", "failed", status, downloadRecords[status.id]);
    await revokeDownloadUrl(status.id);
  }
};

const recordDownloadUrl = (downloadId, downloadUrl, isBackup) => {
  downloadRecords[downloadId] = { downloadUrl, isBackup };
};

const revokeDownloadUrl = async downloadId => {
  const { downloadUrl, isBackup } = downloadRecords[downloadId];
  if (isBackup) browser.downloads.erase({ id: downloadId });
  revokeObjectURL(downloadUrl);
  delete downloadRecords[downloadId];
};

const revokeObjectURL = downloadUrl => {
  if (URL?.revokeObjectURL) {
    URL.revokeObjectURL(downloadUrl);
  } else {
    browser.runtime.sendMessage({
      message: "offscreen_revokeObjectUrl",
      downloadUrl: downloadUrl
    });
  }
};

const createObjectURL = async sessions => {
  if (URL?.createObjectURL) {
    return URL.createObjectURL(
      new Blob([JSON.stringify(sessions, null, "  ")], {
        type: "application/json"
      })
    );
  } else {
    // Chrome service workers cannot use URL.createObjectURL, so generate via offscreen
    const existingContexts = await browser.runtime.getContexts({
      contextTypes: ["OFFSCREEN_DOCUMENT"],
      documentUrls: [browser.runtime.getURL("offscreen/index.html")]
    });
    if (existingContexts == 0) {
      await browser.offscreen.createDocument({
        url: "offscreen/index.html",
        reasons: ["BLOBS"],
        justification: "Use URL.createObjectURL"
      });
    }

    return await browser.runtime.sendMessage({
      message: "offscreen_createObjectUrl",
      sessions: sessions
    });
  }
};
