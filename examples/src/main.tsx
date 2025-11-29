/* eslint-disable react/react-in-jsx-scope */
import { createRoot } from "react-dom/client";
import App from "./App";
import "./styles.css";
// import Layout from './layout'

createRoot(document.getElementById("root")!).render(
  // <StrictMode>
  <App />
  // </StrictMode>
);
