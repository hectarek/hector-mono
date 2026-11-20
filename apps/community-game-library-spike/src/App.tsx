import { env } from "virtual:solid-env/client";
import { Title } from "@solidjs/meta";
import { Loading } from "solid-js";
import { Router } from "./router";
import "./App.css";

export default function App() {
  return (
    <Router>
      {(props) => (
        <>
          <Title>{env.VITE_APP_NAME}</Title>
          <header class="shell-header">
            <a class="app-name" href="/">
              Game Library
            </a>
            <a class="back" href="/account">
              You
            </a>
          </header>
          <Loading
            fallback={
              <main class="page">
                <p class="empty">Loading…</p>
              </main>
            }
          >
            {props.children}
          </Loading>
        </>
      )}
    </Router>
  );
}
