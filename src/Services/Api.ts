import { io, Socket } from "socket.io-client";

/*
  Single entry point for every call to the Python service (`/service`).

  All requests use relative URLs: in development Vite proxies `/api` and
  `/socket.io` to the service (see `vite.config.js`), so the same code works
  both when the web app runs locally and when it runs inside Docker.
*/

const API_PREFIX = "/api";

async function post(path: string, body?: unknown): Promise<Response> {
  const hasBody = body !== undefined;
  const response = await fetch(`${API_PREFIX}${path}`, {
    method: "POST",
    headers: hasBody ? { "Content-Type": "application/json" } : undefined,
    body: hasBody ? JSON.stringify(body) : undefined,
  });
  if (!response.ok) {
    throw new Error(`[api] POST ${path} failed with status ${response.status}`);
  }
  return response;
}

export const Api = {
  /** Starts the camera-based gesture recognition on the service. */
  enableCamera: () => post("/camera/enable"),

  /** Stops the camera-based gesture recognition on the service. */
  disableCamera: () => post("/camera/disable"),

  /** Persists the serialized study set on the service (best effort). */
  autosaveStudySet: (content: string) =>
    post("/studyset/autosave", { content }),

  /**
   * Opens the Socket.IO channel the service uses to push gesture
   * notifications (`notification` events).
   */
  connectNotifications: (): Socket => io({ path: "/socket.io" }),
};
