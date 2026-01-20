import log from "loglevel";
import Sessions from "./sessions.js";
import { saveSession } from "./save.js";

const logDir = "background/import";

export default async function importSessions(importedSessions) {
  log.log(logDir, "import()", importedSessions);

  // Import if the same session does not exist
  for (let importedSession of importedSessions) {
    const currentSessions = await Sessions.search("date", importedSession.date);

    const isSameSession = session =>
      session.id == importedSession.id && session.lastEditedTime >= importedSession.lastEditedTime;
    const existsSameSession = currentSessions.some(isSameSession);
    if (existsSameSession) continue;

    importedSession.lastEditedTime = Date.now();
    saveSession(importedSession);
  }
}
