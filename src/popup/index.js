import React from "react";
import { createRoot } from "react-dom/client";
import PopupPage from "./components/PopupPage";
import "./styles/body.scss";

const root = createRoot(document.getElementById("root"));
root.render(<PopupPage />);
