import React from "react";
import ReactDOM from "react-dom";
import { Provider } from "react-redux";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Toaster } from "sonner";
import store from "./store/ReduxStore";
import App from "./App";
import { SocketProvider } from "./context/SocketContext";
import { ThemeProvider } from "./context/ThemeContext";

ReactDOM.render(
  <Provider store={store}>
    <ThemeProvider>
      <SocketProvider>
        <BrowserRouter>
          <Routes>
            <Route path="*" element={<App />} />
          </Routes>
          <Toaster position="top-right" richColors />
        </BrowserRouter>
      </SocketProvider>
    </ThemeProvider>
  </Provider>,
  document.getElementById("root")
);
