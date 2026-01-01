import React, { Component } from "react";
import CheckIcon from "../icons/check.svg";
import "../styles/InputForm.scss";

export default class InputForm extends Component {
  inputRef = React.createRef();

  handleSubmit = e => {
    e.preventDefault();
    this.props.onSubmit(e.target[0].value);
    e.target[0].value = "";
  };

  focusInput() {
    if (!this.props.isFocus) return;
    this.inputRef.current?.focus();
  }

  componentDidMount() {
    this.focusInput();
  }

  render() {
    return (
      <form className="inputForm" onSubmit={this.handleSubmit} autoComplete="off">
        <input
          type="text"
          ref={this.inputRef}
          spellCheck={false}
          defaultValue={this.props.defaultValue || ""}
          placeholder={this.props.placeholder || ""}
        />
        <button className="submitButton" type="submit">
          <CheckIcon />
        </button>
      </form>
    );
  }
}
