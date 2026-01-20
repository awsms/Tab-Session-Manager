import React, { Component } from "react";
import browser from "webextension-polyfill";
import moment from "moment";
import { getSettings } from "src/settings/settings";
import { sendOpenMessage, sendSessionUpdateMessage } from "../actions/controlSessions";
import generateWindowsInfo from "../actions/generateWindowsInfo";
import { deleteTab } from "../../common/editSessions.js";
import NameContainer from "./NameContainer";
import TagsContainer from "./TagsContainer";
import DetailsContainer from "./DetailsContainer";
import SessionMenuItems from "./SessionMenuItems";
import OpenMenuItems from "./OpenMenuItems";
import MenuIcon from "../icons/menu.svg";
import NewWindowIcon from "../icons/newWindow.svg";
import DeleteIcon from "../icons/delete.svg";
import "../styles/SessionDetailsArea.scss";

const getOpenButtonTitle = () => {
  const defaultBehavior = getSettings("openButtonBehavior");
  switch (defaultBehavior) {
    case "openInNewWindow":
      return browser.i18n.getMessage("openInNewWindowLabel");
    case "openInCurrentWindow":
      return browser.i18n.getMessage("openInCurrentWindowLabel");
    case "addToCurrentWindow":
      return browser.i18n.getMessage("addToCurrentWindowLabel");
    default:
      return "";
  }
};

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

export default class SessionDetailsArea extends Component {
  constructor(props) {
    super(props);
    this.state = {
      detailSearchWord: "",
      selectedTabsByWindow: {},
      lastSelectedTab: null
    };
  }

  componentDidUpdate(prevProps) {
    if (prevProps.session.id !== this.props.session.id) {
      this.setState({ detailSearchWord: "", selectedTabsByWindow: {}, lastSelectedTab: null });
    }
  }

  handleMenuClick = e => {
    const rect = e.target.getBoundingClientRect();
    const { x, y } = { x: e.pageX || rect.x, y: e.pageY || rect.y };
    this.props.openMenu(
      x,
      y,
      <SessionMenuItems session={this.props.session} isTracking={this.props.isTracking} />
    );
  };

  handleOpenClick = () => {
    const defaultBehavior = getSettings("openButtonBehavior");
    const selectedSession = this.getSelectedSession();
    if (selectedSession) {
      browser.runtime.sendMessage({
        message: "open",
        session: selectedSession,
        property: defaultBehavior
      });
      this.setState({ selectedTabsByWindow: {}, lastSelectedTab: null });
      return;
    }
    sendOpenMessage(this.props.session.id, defaultBehavior);
  };

  handleOpenRightClick = e => {
    const rect = e.target.getBoundingClientRect();
    const { x, y } = { x: e.pageX || rect.x, y: e.pageY || rect.y };
    this.props.openMenu(x, y, <OpenMenuItems session={this.props.session} />);
    e.preventDefault();
  };

  handleRemoveClick = async () => {
    const { session, removeSession } = this.props;
    const selectedTabsCount = this.getSelectedTabsCount();
    if (selectedTabsCount === 0) {
      removeSession(session.id);
      return;
    }
    if (selectedTabsCount >= session.tabsNumber) {
      removeSession(session.id);
      this.setState({ selectedTabsByWindow: {}, lastSelectedTab: null });
      return;
    }

    let editedSession = session;
    const selectedTabsByWindow = this.state.selectedTabsByWindow;
    for (const windowId of Object.keys(selectedTabsByWindow)) {
      const selectedTabIds = Object.keys(selectedTabsByWindow[windowId] || {});
      if (selectedTabIds.length === 0) continue;
      const selectedTabs = selectedTabIds
        .map(tabId => session.windows?.[windowId]?.[tabId])
        .filter(Boolean)
        .sort((a, b) => b.index - a.index);
      for (const tab of selectedTabs) {
        try {
          editedSession = await Promise.resolve(deleteTab(editedSession, windowId, tab.id));
        } catch (e) {
          removeSession(session.id);
          return;
        }
      }
    }

    await sendSessionUpdateMessage(editedSession);
    this.setState({ selectedTabsByWindow: {}, lastSelectedTab: null });
  };

  handleDetailSearchChange = e => {
    this.setState({ detailSearchWord: e.target.value });
  };

  getDetailSearchWords = () => {
    const value = this.state.detailSearchWord.trim().toLowerCase();
    if (!value) return [];
    return value.split(/\s+/);
  };

  getSelectedTabsCount = () => {
    return Object.values(this.state.selectedTabsByWindow).reduce(
      (count, tabs) => count + Object.keys(tabs || {}).length,
      0
    );
  };

  getVisibleTabIdsByWindow = filterWords => {
    const { session } = this.props;
    if (!session?.windows) return {};
    const visibleTabsByWindow = {};
    for (const windowId of Object.keys(session.windows)) {
      const tabs = Object.values(session.windows[windowId]);
      const filteredTabs = filterWords.length === 0
        ? tabs
        : tabs.filter(tab => matchesTabSearch(tab, filterWords));
      if (filteredTabs.length > 0) {
        visibleTabsByWindow[windowId] = filteredTabs.map(tab => tab.id);
      }
    }
    return visibleTabsByWindow;
  };

  handleSelectAllToggle = filterWords => {
    const visibleTabsByWindow = this.getVisibleTabIdsByWindow(filterWords);
    this.setState(prevState => {
      const selectedTabsByWindow = { ...prevState.selectedTabsByWindow };
      let allVisibleSelected = true;
      for (const windowId of Object.keys(visibleTabsByWindow)) {
        for (const tabId of visibleTabsByWindow[windowId]) {
          if (!selectedTabsByWindow?.[windowId]?.[tabId]) {
            allVisibleSelected = false;
            break;
          }
        }
        if (!allVisibleSelected) break;
      }

      if (allVisibleSelected) {
        for (const windowId of Object.keys(visibleTabsByWindow)) {
          const windowSelection = { ...(selectedTabsByWindow[windowId] || {}) };
          for (const tabId of visibleTabsByWindow[windowId]) {
            delete windowSelection[tabId];
          }
          selectedTabsByWindow[windowId] = windowSelection;
        }
      } else {
        for (const windowId of Object.keys(visibleTabsByWindow)) {
          const windowSelection = { ...(selectedTabsByWindow[windowId] || {}) };
          for (const tabId of visibleTabsByWindow[windowId]) {
            windowSelection[tabId] = true;
          }
          selectedTabsByWindow[windowId] = windowSelection;
        }
      }

      return { selectedTabsByWindow };
    });
  };

  getSelectedSession = () => {
    const { session } = this.props;
    const { selectedTabsByWindow } = this.state;
    if (!session?.windows) return null;
    const selectedWindowIds = Object.keys(selectedTabsByWindow).filter(
      windowId => Object.keys(selectedTabsByWindow[windowId] || {}).length > 0
    );
    if (selectedWindowIds.length === 0) return null;

    const selectedSession = {
      ...session,
      windows: {},
      windowsInfo: {},
      tabsNumber: 0,
      windowsNumber: 0
    };

    for (const windowId of selectedWindowIds) {
      const windowTabs = session.windows[windowId];
      if (!windowTabs) continue;
      const selectedTabIds = Object.keys(selectedTabsByWindow[windowId] || {});
      const selectedTabs = selectedTabIds
        .map(tabId => windowTabs[tabId])
        .filter(Boolean)
        .map(tab => ({ ...tab }));
      if (selectedTabs.length === 0) continue;
      selectedTabs.sort((a, b) => a.index - b.index);
      if (!selectedTabs.some(tab => tab.active)) {
        selectedTabs[0].active = true;
      }
      selectedSession.windows[windowId] = {};
      selectedTabs.forEach(tab => {
        selectedSession.windows[windowId][tab.id] = tab;
      });
      if (session.windowsInfo && session.windowsInfo[windowId]) {
        selectedSession.windowsInfo[windowId] = session.windowsInfo[windowId];
      }
      selectedSession.tabsNumber += selectedTabs.length;
      selectedSession.windowsNumber += 1;
    }

    if (selectedSession.tabsNumber === 0) return null;
    return selectedSession;
  };

  handleTabSelect = (windowId, tabId, event, orderedTabIds) => {
    const isToggle = event.ctrlKey || event.metaKey;
    const isRange = event.shiftKey;
    this.setState(prevState => {
      const selectedTabsByWindow = { ...prevState.selectedTabsByWindow };
      const windowSelection = { ...(selectedTabsByWindow[windowId] || {}) };

      if (isRange && prevState.lastSelectedTab?.windowId === windowId) {
        const start = orderedTabIds.indexOf(prevState.lastSelectedTab.tabId);
        const end = orderedTabIds.indexOf(tabId);
        if (start !== -1 && end !== -1) {
          const [from, to] = start < end ? [start, end] : [end, start];
          for (let i = from; i <= to; i++) {
            windowSelection[orderedTabIds[i]] = true;
          }
        } else {
          windowSelection[tabId] = true;
        }
      } else if (isToggle) {
        if (windowSelection[tabId]) delete windowSelection[tabId];
        else windowSelection[tabId] = true;
      } else {
        windowSelection[tabId] = true;
      }

      selectedTabsByWindow[windowId] = windowSelection;
      return {
        selectedTabsByWindow,
        lastSelectedTab: { windowId, tabId }
      };
    });
  };

  handleTabToggle = (windowId, tabId) => {
    this.setState(prevState => {
      const selectedTabsByWindow = { ...prevState.selectedTabsByWindow };
      const windowSelection = { ...(selectedTabsByWindow[windowId] || {}) };
      if (windowSelection[tabId]) delete windowSelection[tabId];
      else windowSelection[tabId] = true;
      selectedTabsByWindow[windowId] = windowSelection;
      return {
        selectedTabsByWindow,
        lastSelectedTab: { windowId, tabId }
      };
    });
  };

  shouldComponentUpdate = (nextProps, nextState) => {
    const isChangeSession = this.props.session.id !== nextProps.session.id;
    const isUpdateSession = this.props.session.lastEditedTime !== nextProps.session.lastEditedTime;
    const isLoadedSession =
      this.props.session.hasOwnProperty("windows") !== nextProps.session.hasOwnProperty("windows");
    const isChangedTagList = this.props.tagList !== nextProps.tagList;
    const isChangedTracking = this.props.isTracking !== nextProps.isTracking;
    const isDetailSearchChanged = this.state.detailSearchWord !== nextState.detailSearchWord;
    const isSelectionChanged = this.state.selectedTabsByWindow !== nextState.selectedTabsByWindow;
    return isChangeSession || isUpdateSession || isLoadedSession || isChangedTagList || isChangedTracking || isDetailSearchChanged || isSelectionChanged;
  };

  render() {
    const { session, searchWords, isTracking, removeWindow, removeTab, openModal, closeModal, tagList, openMenu } = this.props;
    const detailSearchWords = this.getDetailSearchWords();
    const highlightWords = detailSearchWords.length > 0 ? detailSearchWords : searchWords;
    const selectedTabsCount = this.getSelectedTabsCount();
    const visibleTabsByWindow = this.getVisibleTabIdsByWindow(detailSearchWords);
    const visibleTabsCount = Object.values(visibleTabsByWindow).reduce(
      (count, tabs) => count + tabs.length,
      0
    );
    const visibleSelectedCount = Object.keys(visibleTabsByWindow).reduce((count, windowId) => {
      const selected = this.state.selectedTabsByWindow?.[windowId] || {};
      return count + visibleTabsByWindow[windowId].filter(tabId => selected[tabId]).length;
    }, 0);
    const allVisibleSelected = visibleTabsCount > 0 && visibleSelectedCount === visibleTabsCount;

    if (!session.id)
      return (
        <div id="sessionDetailArea">
          <div className="noSession">
            <p>{browser.i18n.getMessage("noSessionSelectedLabel")}</p>
          </div>
        </div>
      );

    return (
      <div id="sessionDetailArea">
        <div className="sessionHeader">
          <div className="lineContainer">
            <NameContainer
              sessionId={session.id}
              sessionName={session.name}
              openModal={openModal}
              closeModal={closeModal}
            />
            <button
              className="menuButton"
              onClick={this.handleMenuClick}
              title={browser.i18n.getMessage("menuLabel")}
            >
              <MenuIcon />
            </button>
          </div>
          <div className="lineContainer">
            <TagsContainer
              sessionId={session.id}
              tags={session.tag}
              tagList={tagList}
              isTracking={isTracking}
              openModal={openModal}
              closeModal={closeModal}
            />
            <span className="date">{moment(session.date).format(getSettings("dateFormat"))}</span>
          </div>

          <div className="lineContainer">
            <span className="windowsInfo">
              {generateWindowsInfo(session.windowsNumber, session.tabsNumber)}
            </span>

            <div className="buttonsContainer">
              <button
                className="open"
                onClick={this.handleOpenClick}
                onContextMenu={this.handleOpenRightClick}
                title={getOpenButtonTitle()}
              >
                <NewWindowIcon />
                <span>
                  {selectedTabsCount > 0
                    ? `${browser.i18n.getMessage("open")} (${selectedTabsCount})`
                    : browser.i18n.getMessage("open")}
                </span>
              </button>
              <button className="remove" onClick={this.handleRemoveClick}>
                <DeleteIcon />
                <span>
                  {selectedTabsCount > 0
                    ? `${browser.i18n.getMessage("remove")} (${selectedTabsCount})`
                    : browser.i18n.getMessage("remove")}
                </span>
              </button>
            </div>
          </div>
          <div className="detailsSearch inputForm">
            <input
              type="text"
              value={this.state.detailSearchWord}
              onChange={this.handleDetailSearchChange}
              placeholder={browser.i18n.getMessage("search")}
              title={browser.i18n.getMessage("search")}
            />
            <button
              className="selectAllButton"
              onClick={() => this.handleSelectAllToggle(detailSearchWords)}
              disabled={visibleTabsCount === 0}
            >
              {allVisibleSelected ? "Clear" : "Select all"}
            </button>
          </div>
        </div>
        <DetailsContainer
          session={session}
          searchWords={highlightWords}
          filterWords={detailSearchWords}
          removeWindow={removeWindow}
          removeTab={removeTab}
          openMenu={openMenu}
          selectedTabsByWindow={this.state.selectedTabsByWindow}
          handleTabSelect={this.handleTabSelect}
          handleTabToggle={this.handleTabToggle}
        />
      </div>
    );
  }
}
