# <sub><img src="/src/icons/icon.svg" width=64px height=64px></sub> Tab-Session-Manager

#### Save and restore the state of browser windows and tabs. It also supports automatic saving.

<img src="https://raw.githubusercontent.com/awsms/Tab-Session-Manager/master/other/promotion/screenshots/popup.png" width="640px">

## Download

[<img src="other/promotion/badges/firefox.png" align="left" alt="for Firefox">](https://addons.mozilla.org/firefox/addon/tab-session-manager/)

[<img src="other/promotion/badges/chrome.png" alt="for Chrome" height="60px">](https://chrome.google.com/webstore/detail/tab-session-manager/iaiomicjabeggjcfkbimgmglanimpnae/)

[for Microsoft Edge](https://microsoftedge.microsoft.com/addons/detail/jkjjclfiflhpjangefhgfjhgfbhajadk/)

## Tools

**[Session Compressor](https://tab-session-manager.sienori.com/compressor/index.html)**  
A tool for compressing sessions created by Tab Session Manager

## Translation

You can contribute by translating Tab Session Manager on **[Crowdin](https://crowdin.com/project/tab-session-manager)**.

## Developing

> Required: Node 24.13.0, npm 11.7.0

1. Clone the repository `git clone https://github.com/awsms/Tab-Session-Manager`
2. Create the file `src/credentials.js`

```src/credentials.js
export const clientId = "xxx"
export const clientSecret = "xxx"
```

3. Run `npm install`
4. Run `npm run watch-dev`

### Load the extension in Chrome

1. Open Chrome browser and navigate to `chrome://extensions`
2. Select "Developer Mode" and then click "Load unpacked extension..."
3. From the file browser, choose to `tab-session-manager/dev/chrome`

### Load the extension in Firefox

1. Open Firefox browser and navigate to `about:debugging`
2. Click "Load Temporary Add-on" and from the file browser, choose `tab-session-manager/dev/firefox`

## Privacy Policy

[Privacy Policy](https://tab-session-manager.sienori.com/privacy-policy) of Tab Session Manager
