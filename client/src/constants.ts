/// <reference types="vite/client" />

export const API_URL =
  (import.meta.env as any).VITE_API_URL || "http://localhost:3011";
export const WS_URL =
  (import.meta.env as any).VITE_WS_URL || "ws://localhost:3011";
export const BACKOFFICE_SOCKET_URL =
  (import.meta.env as any).VITE_BACKOFFICE_SOCKET_URL ||
  "http://localhost:8080";
