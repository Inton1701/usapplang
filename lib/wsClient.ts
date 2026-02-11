// ──────────────────────────────────────────────
// Lightweight WebSocket wrapper
// ──────────────────────────────────────────────
// Features: auto‑reconnect with exponential backoff,
// subscribe/unsubscribe, foreground/background handling.

import type { WSEvent } from '@/types';

type Listener = (event: WSEvent) => void;

const INITIAL_BACKOFF = 1000;
const MAX_BACKOFF = 30_000;

class WSClient {
  private ws: WebSocket | null = null;
  private url: string = '';
  private token: string = '';
  private listeners = new Map<string, Set<Listener>>();
  private backoff = INITIAL_BACKOFF;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private intentionalClose = false;

  /** Connect to the WS server (call once after auth) */
  connect(url: string, token: string) {
    this.url = url;
    this.token = token;
    this.intentionalClose = false;
    this.open();
  }

  private open() {
    if (this.ws?.readyState === WebSocket.OPEN) return;

    this.ws = new WebSocket(`${this.url}?token=${this.token}`);

    this.ws.onopen = () => {
      this.backoff = INITIAL_BACKOFF;
      console.log('[WS] connected');
    };

    this.ws.onmessage = (e) => {
      try {
        const event: WSEvent = JSON.parse(e.data);
        this.emit(event.type, event);
      } catch {
        console.warn('[WS] bad payload', e.data);
      }
    };

    this.ws.onerror = (e) => {
      console.warn('[WS] error', e);
    };

    this.ws.onclose = () => {
      console.log('[WS] closed');
      if (!this.intentionalClose) this.scheduleReconnect();
    };
  }

  private scheduleReconnect() {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.reconnectTimer = setTimeout(() => {
      console.log(`[WS] reconnecting in ${this.backoff}ms …`);
      this.open();
      this.backoff = Math.min(this.backoff * 2, MAX_BACKOFF);
    }, this.backoff);
  }

  /** Subscribe to a specific event type */
  on(type: string, fn: Listener) {
    if (!this.listeners.has(type)) this.listeners.set(type, new Set());
    this.listeners.get(type)!.add(fn);
    return () => this.off(type, fn);
  }

  off(type: string, fn: Listener) {
    this.listeners.get(type)?.delete(fn);
  }

  private emit(type: string, event: WSEvent) {
    this.listeners.get(type)?.forEach((fn) => fn(event));
    // wildcard listeners
    this.listeners.get('*')?.forEach((fn) => fn(event));
  }

  /** Send a JSON message to the server */
  send<T>(type: string, payload: T) {
    if (this.ws?.readyState !== WebSocket.OPEN) {
      console.warn('[WS] not connected, dropping send');
      return;
    }
    this.ws.send(JSON.stringify({ type, payload, timestamp: Date.now() }));
  }

  /** Subscribe to a conversation channel */
  subscribe(conversationId: string) {
    console.log(`[WS] subscribing to conversation: ${conversationId}`);
    this.send('conversation:subscribe', { conversationId });
  }

  /** Unsubscribe from a conversation channel */
  unsubscribe(conversationId: string) {
    console.log(`[WS] unsubscribing from conversation: ${conversationId}`);
    this.send('conversation:unsubscribe', { conversationId });
  }

  /** Cleanly disconnect */
  disconnect() {
    this.intentionalClose = true;
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.ws?.close();
    this.ws = null;
  }

  /** Call on AppState change → "active" */
  onForeground() {
    if (this.ws?.readyState !== WebSocket.OPEN && !this.intentionalClose) {
      this.open();
    }
  }

  /** Call on AppState change → "background" */
  onBackground() {
    // keep alive — OS will close it eventually
  }
}

export const wsClient = new WSClient();
