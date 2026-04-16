import React from "react";
import browser from "webextension-polyfill";
import queryString from "query-string";
import { useLocation } from "react-router-dom";
import OptionsContainer from "./OptionContainer";
import manifest from "src/manifest.json";

export default () => {
  const location = useLocation();
  const query = queryString.parse(location.search || "");

  const extensionVersion = manifest.version;

  return (
    <div>
      <p className="contentTitle">{browser.i18n.getMessage("informationLabel")}</p>
      <hr />
      <OptionsContainer
        title={"extName"}
        captions={[""]}
        type={"none"}
        updated={query.action === "updated"}
        extraCaption={
          <p className="caption">
            <a href="https://github.com/awsms/Tab-Session-Manager/releases" target="_blank">
              Version {extensionVersion}
            </a>
          </p>
        }
      />

      <OptionsContainer
        title={"licenseLabel"}
        captions={["Mozilla Public License, Version. 2.0"]}
        useRawCaptions={true}
        type={"none"}
      />
      <hr />
      <OptionsContainer
        title={""}
        captions={[""]}
        type={"none"}
        extraCaption={
          <div>
            <p>
              <a
                href="https://addons.mozilla.org/firefox/addon/tab-session-manager/?src=optionpage"
                target="_blank"
              >
                {browser.i18n.getMessage("firefoxLabel")}
              </a>
              <span>　</span>
              <a
                href="https://chrome.google.com/webstore/detail/tab-session-manager/iaiomicjabeggjcfkbimgmglanimpnae"
                target="_blank"
              >
                {browser.i18n.getMessage("chromeLabel")}
              </a>
              <span>　</span>
              <a
                href="https://microsoftedge.microsoft.com/addons/detail/tab-session-manager/jkjjclfiflhpjangefhgfjhgfbhajadk"
                target="_blank"
              >
                {browser.i18n.getMessage("edgeLabel")}
              </a>
              <span>　</span>
              <a href="https://github.com/awsms/Tab-Session-Manager" target="_blank">
                GitHub
              </a>
              <span>　</span>
              <a href="https://tab-session-manager.sienori.com/privacy-policy" target="_blank">
                {browser.i18n.getMessage("privacyPolicyLabel")}
              </a>
            </p>
          </div>
        }
      />
    </div>
  );
};
