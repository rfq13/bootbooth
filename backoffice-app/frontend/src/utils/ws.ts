type EventType = 'SESSION_APPROVED' | 'SESSION_REJECTED' | 'SESSION_EXPIRED' | 'SESSION_OVERRIDE'
export type WSMessage = { type: EventType; session_id: string; payload?: unknown }
type Handler = (msg: WSMessage) => void
const wsUrl = import.meta.env.VITE_WS_URL || ''
const sseUrl = import.meta.env.VITE_SSE_URL || ''
export function connect(onMessage: Handler) {
  if (sseUrl) {
    const es = new EventSource(sseUrl)
    es.onmessage = e => { try { onMessage(JSON.parse(e.data)) } catch {} }
    return { close() { es.close() } } as unknown as WebSocket
  }
  if (wsUrl) {
    let ws = new WebSocket(wsUrl)
    ws.onmessage = e => { try { onMessage(JSON.parse(e.data)) } catch {} }
    ws.onclose = () => { setTimeout(() => { ws = connect(onMessage) as unknown as WebSocket }, 1000) }
    return ws
  }
  console.error('Realtime not configured: set VITE_SSE_URL or VITE_WS_URL')
  return { close() {} } as unknown as WebSocket
}