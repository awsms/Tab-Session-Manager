import React, { Component } from "react";
import browser from "webextension-polyfill";
import { getSettings } from "src/settings/settings";
import PlusIcon from "../icons/plus.svg";
import "../styles/Menu.scss";

export default class Menu extends Component {
  constructor(props) {
    super(props);
    this.state = {
      position: { x: 0, y: 0 }
    };
    this.menuRef = React.createRef();
  }

  calcPosition = () => {
    const menu = this.menuRef.current;
    if (!menu) return { x: 0, y: 0 };
    const menuWidth = menu.offsetWidth;
    const menuHeight = menu.offsetHeight;
    const { x, y } = this.props.menu;
    const popupWidth = document.body.offsetWidth;
    const popupHeight = document.body.offsetHeight;

    let position = { x: x, y: y };
    const isRightOver = position.x + menuWidth > popupWidth;
    const isDownOver = position.y + menuHeight > popupHeight;
    if (isRightOver) position.x = x - menuWidth;
    if (isDownOver) position.y = y - menuHeight;

    if (position.x < 0) position.x = 0;
    if (position.y < 0) position.y = 0;

    return position;
  };

  focusMenu = () => {
    const menu = this.menuRef.current;
    if (!menu) return;
    menu.querySelector("button").focus();
  };

  loopFocus = e => {
    const isNextFocus = e.key === "Tab" && !e.shiftKey;
    const isPrevFocus = e.key === "Tab" && e.shiftKey;
    if (!isNextFocus && !isPrevFocus) return;

    const menu = this.menuRef.current;
    if (!menu) return;
    const buttons = menu.querySelectorAll("button");
    const firstButton = buttons[0];
    const lastButton = buttons[buttons.length - 1];

    if (isNextFocus && document.activeElement == lastButton) {
      e.preventDefault();
      firstButton.focus();
    } else if (isPrevFocus && document.activeElement == firstButton) {
      e.preventDefault();
      lastButton.focus();
    }
  };

  componentDidUpdate() {
    if (this.shouldUpdate && this.props.menu.isOpen) {
      const position = this.calcPosition();
      this.setState({
        position: position
      });
      this.shouldUpdate = false;
      this.focusMenu();
    } else if (!this.props.menu.isOpen) {
      this.shouldUpdate = true;
    }
  }

  render() {
    const { menu } = this.props;
    return (
      menu.isOpen && (
        <div
          id="menu"
          ref={this.menuRef}
          style={{ left: this.state.position.x, top: this.state.position.y }}
          role="dialog"
          onKeyDown={this.loopFocus}
        >
          {menu.items}
          <button className="closeMenuButton" title={browser.i18n.getMessage("closeMenuLabel")}>
            <PlusIcon />
          </button>
        </div>
      )
    );
  }
}
