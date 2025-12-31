import React from "./core/React.js";
import ReactDoM  from "./core/ReactDom.js";
import App from "./App.jsx";

ReactDoM.createRoot(document.getElementById("root")).render(<App></App>);

// import ReactDoM from "react-dom/client";
// import App from "./App.jsx";
// ReactDoM.createRoot(document.getElementById("root")).render(<App />);