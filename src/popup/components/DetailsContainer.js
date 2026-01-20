import React, { Component } from "react";
import browser from "webextension-polyfill";
import browserInfo from "browser-info";
import openUrl from "../actions/openUrl";
import { sendOpenMessage } from "../actions/controlSessions";
import PlusIcon from "../icons/plus.svg";
import CollapseIcon from "../icons/collapse.svg";
import EditIcon from "../icons/edit.svg";
import WindowMenuItems from "./WindowMenuItems";
import WindowIcon from "../icons/window.svg";
import WindowIncognitoChromeIcon from "../icons/window_incognito_chrome.svg";
import WindowIncognitoFirefoxIcon from "../icons/window_incognito_firefox.svg";

import "../styles/DetailsContainer.scss";
import Highlighter from "react-highlight-words";

const getTabSearchText = tab => {
  const title = (tab.title || "").toLowerCase();
  const urlText = (tab.url || "").toLowerCase();
  let host = "";
  if (tab.url) {
    try {
      host = new URL(tab.url).hostname.toLowerCase();
    } catch (e) {
      host = "";
    }
  }
  return `${title} ${urlText} ${host}`;
};

const matchesTabSearch = (tab, searchWords) => {
  if (!searchWords || searchWords.length === 0) return true;
  const haystack = getTabSearchText(tab);
  return searchWords.every(word => haystack.includes(word));
};

const FavIcon = props => (
  <img
    className="favIcon"
    src={props.favIconUrl || "/icons/favicon.png"}
    onError={e => {
      const target = e.target;
      setTimeout(() => (target.src = "/icons/favicon.png"), 0);
    }}
  />
);

const RemoveButton = props => (
  <button
    className="removeButton"
    onClick={props.handleClick}
    title={browser.i18n.getMessage("remove")}
  >
    <PlusIcon />
  </button>
);

const EditButton = props => (
  <button
    className="editButton"
    onClick={props.handleClick}
    title={browser.i18n.getMessage("editWindowLabel")}
  >
    <EditIcon />
  </button>
);

const TabContainer = props => {
  const {
    tab,
    windowId,
    allTabsNumber,
    searchWords,
    handleRemoveTab,
    handleTabSelect,
    handleTabToggle,
    orderedTabIds,
    isSelected
  } = props;
  const handleRemoveClick = () => {
    handleRemoveTab(windowId, tab.id);
  };

  const handleMouseUp = e => {
    if (e.button !== 0 && e.button !== 1) return;
    if (e.shiftKey || e.ctrlKey || e.metaKey) {
      handleTabSelect(windowId, tab.id, e, orderedTabIds);
      return;
    }
    if (e.button === 0) openUrl(tab.url, tab.title, true);
    else if (e.button === 1) openUrl(tab.url, tab.title, false);
  };

  return (
    <div className={`tabContainer ${isSelected ? "isSelected" : ""}`}>
      <input
        className="tabCheckbox"
        type="checkbox"
        checked={isSelected}
        onChange={() => handleTabToggle(windowId, tab.id)}
        title={browser.i18n.getMessage("selectLabel") || ""}
      />
      <button className="tabButton" onMouseUp={handleMouseUp} title={`${tab.title}\n${tab.url}`}>
        <FavIcon favIconUrl={tab.favIconUrl} />
        <span className="tabTitle">
          <Highlighter
            searchWords={searchWords}
            textToHighlight={tab.title || ""}
            autoEscape={true}
          />
        </span>
      </button>
      <div className="buttonsContainer">
        {allTabsNumber > 1 && <RemoveButton handleClick={handleRemoveClick} />}
      </div>
    </div>
  );
};

class WindowContainer extends Component {
  constructor(props) {
    super(props);
    this.state = { isCollapsed: false };
  }

  getTabsNumberText = () => {
    const tabLabel = browser.i18n.getMessage("tabLabel");
    const tabsLabel = browser.i18n.getMessage("tabsLabel");
    const tabsNumber = Object.keys(this.props.tabs).length;
    const tabsNumberText = `${tabsNumber} ${tabsNumber > 1 ? tabsLabel : tabLabel}`;
    return tabsNumberText;
  };

  handleRemoveClick = () => {
    const { windowId, handleRemoveWindow } = this.props;
    handleRemoveWindow(windowId);
  };

  handleOpenClick = () => {
    const { sessionId, windowId } = this.props;
    sendOpenMessage(sessionId, "openInNewWindow", windowId);
  };

  handleEditClick = e => {
    const { sessionId, windowId } = this.props;
    const rect = e.target.getBoundingClientRect();
    const { x, y } = { x: e.pageX || rect.x, y: e.pageY || rect.y };
    this.props.openMenu(x, y, <WindowMenuItems sessionId={sessionId} windowId={windowId} />);
    e.preventDefault();
  };

  toggleCollapsed = () => {
    const isCollapsed = !this.state.isCollapsed;
    this.setState({ isCollapsed: isCollapsed });
  };

  render() {
    const {
      windowTitle,
      windowId,
      tabs,
      windowsNumber,
      allTabsNumber,
      searchWords,
      handleRemoveTab,
      handleTabSelect,
      handleTabToggle,
      selectedTabsByWindow
    } = this.props;
    const sortedTabs = Object.values(tabs).sort((a, b) => a.index - b.index);
    const orderedTabIds = sortedTabs.map(tab => tab.id);
    const isIncognito = Object.values(tabs)[0].incognito;

    return (
      <div className={`windowContainer ${this.state.isCollapsed ? "isCollapsed" : ""}`}>
        <div className="windowInfo" onContextMenu={this.handleEditClick}>
          <div className="leftWrapper">
            <button className="collapseButton" onClick={this.toggleCollapsed}>
              <CollapseIcon />
            </button>
            <div className="windowIcon">
              {isIncognito ? (
                browserInfo().name === "Chrome" ? (
                  <WindowIncognitoChromeIcon />
                ) : (
                  <WindowIncognitoFirefoxIcon />
                )
              ) : (
                <WindowIcon />
              )}
            </div>
            <button
              className="windowTitle"
              onClick={this.handleOpenClick}
              title={browser.i18n.getMessage("openInNewWindowLabel")}
            >
              {windowTitle ||
                Object.values(tabs).find(tab => tab.active)?.title ||
                browser.i18n.getMessage("windowLabel")}
            </button>
            <span className="tabsNumber">{this.getTabsNumberText()}</span>
          </div>
          <div className="buttonsContainer">
            <EditButton handleClick={this.handleEditClick} />
            {windowsNumber > 1 && <RemoveButton handleClick={this.handleRemoveClick} />}
          </div>
        </div>
        <div className="tabs">
          {Object.values(sortedTabs).map(tab => (
            <TabContainer
              tab={tab}
              windowId={windowId}
              allTabsNumber={allTabsNumber}
              searchWords={searchWords}
              handleRemoveTab={handleRemoveTab}
              handleTabSelect={handleTabSelect}
              handleTabToggle={handleTabToggle}
              orderedTabIds={orderedTabIds}
              isSelected={!!(selectedTabsByWindow?.[windowId]?.[tab.id])}
              key={tab.id}
            />
          ))}
        </div>
      </div>
    );
  }
}

export default props => {
  const {
    session,
    searchWords,
    filterWords,
    removeWindow,
    removeTab,
    openMenu,
    selectedTabsByWindow,
    handleTabSelect,
    handleTabToggle
  } = props;
  const activeFilterWords = (filterWords || []).filter(Boolean);

  if (!session.windows) return null;

  const handleRemoveWindow = windowId => {
    removeWindow(session, windowId);
  };

  const handleRemoveTab = (windowId, tabId) => {
    removeTab(session, windowId, tabId);
  };

  return (
    <div className="detailsContainer scrollbar">
      {Object.keys(session.windows).map(windowId => {
        const tabs = session.windows[windowId];
        const tabList = Object.values(tabs);
        const filteredTabList = activeFilterWords.length === 0
          ? tabList
          : tabList.filter(tab => matchesTabSearch(tab, activeFilterWords));
        if (filteredTabList.length === 0) return null;
        const filteredTabs = filteredTabList.reduce((acc, tab) => {
          acc[tab.id] = tab;
          return acc;
        }, {});
        return (
          <WindowContainer
            tabs={filteredTabs}
            windowTitle={session?.windowsInfo?.[windowId]?.title}
            windowId={windowId}
            sessionId={session.id}
            windowsNumber={session.windowsNumber}
            allTabsNumber={session.tabsNumber}
            searchWords={searchWords}
            handleRemoveWindow={handleRemoveWindow}
            handleRemoveTab={handleRemoveTab}
            openMenu={openMenu}
            selectedTabsByWindow={selectedTabsByWindow}
            handleTabSelect={handleTabSelect}
            handleTabToggle={handleTabToggle}
            key={`${session.id}${windowId}`}
          />
        );
      })}
    </div>
  );
};
