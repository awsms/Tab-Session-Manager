import React, { Component } from "react";
import browser from "webextension-polyfill";
import moment from "moment";
import { getSettings } from "src/settings/settings";
import { sendOpenMessage } from "../actions/controlSessions";
import generateWindowsInfo from "../actions/generateWindowsInfo";
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

  handleRemoveClick = () => {
    this.props.removeSession(this.props.session.id);
  };

  handleDetailSearchChange = e => {
    this.setState({ detailSearchWord: e.target.value });
  };

  getDetailSearchWords = () => {
    const value = this.state.detailSearchWord.trim().toLowerCase();
    if (!value) return [];
    return value.split(/\s+/);
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
    const selectedTabsCount = Object.values(this.state.selectedTabsByWindow).reduce(
      (count, tabs) => count + Object.keys(tabs || {}).length,
      0
    );

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
                <span>{browser.i18n.getMessage("remove")}</span>
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
