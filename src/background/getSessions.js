import log from "loglevel";
import Sessions from "./sessions";

const logDir = "background/getSessions";

export default async (id = null, needKeys = null) => {
  log.log(logDir, "getSessions()", id, needKeys);
  let sessions;
  if (id == null) {
    sessions = await Sessions.getAll(needKeys).catch(e => {
      log.error(logDir, "getSessions()", e);
    });
  } else {
    sessions = await Sessions.get(id).catch(e => {
      log.error(logDir, "getSessions()", e);
    });
  }

  // When the requested session does not exist
  // If id is specified, return undefined; otherwise return []
  return sessions;
};
