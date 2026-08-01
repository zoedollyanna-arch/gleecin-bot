/**
 * In-process bridge between the website and the Discord bot.
 *
 * unified-server.js runs the Express app and the bot client in one process, so
 * the website can hand events straight to the bot instead of the bot polling
 * the database for changes.
 *
 * Emitting is deliberately fire-and-forget: a web request must never fail or
 * slow down because Discord is unreachable.
 */

import { EventEmitter } from 'node:events';

export const bridge = new EventEmitter();

// Each web request that emits adds no listeners, but be explicit rather than
// tripping the default max-listener warning if subscribers grow.
bridge.setMaxListeners(20);

export const BRIDGE_EVENTS = {
  SUPPORT_TICKET_CREATED: 'support-ticket:created'
};

/** Emit without ever throwing into the caller's request path. */
export function emitBridge(event, payload) {
  try {
    bridge.emit(event, payload);
  } catch (error) {
    console.error('[BRIDGE] Listener threw:', error.message);
  }
}
