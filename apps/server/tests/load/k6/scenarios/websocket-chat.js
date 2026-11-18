import ws from 'k6/ws';
import { check } from 'k6';
import { Trend, Counter } from 'k6/metrics';
import { BASE_URL } from '../config.js';

// Custom WebSocket Performance Metrics
export const wsConnectDuration = new Trend('ws_connect_duration', true);
export const wsMessageRoundtrip = new Trend('ws_message_roundtrip', true);
export const wsSessionsActive = new Counter('ws_sessions_active');
export const wsErrors = new Counter('ws_errors');
export const wsMessagesSent = new Counter('ws_messages_sent');
export const wsMessagesReceived = new Counter('ws_messages_received');

/**
 * Executes a realistic Socket.IO WebSocket session.
 * 
 * Flow:
 * 1. Connects to `/socket.io/?EIO=4&transport=websocket&token=...`
 * 2. Receives Socket.IO handshake packet ('0{...}')
 * 3. Sends client confirmation packet ('40')
 * 4. Responds to Engine.IO ping ('2') with pong ('3')
 * 5. Sends chat message with unique clientMessageId
 * 6. Measures message delivery roundtrip latency
 * 7. Sustains connection for the configured session duration
 */
export function runWebSocketChat(token = null, durationSeconds = 2, msgBurstCount = 1, conversationId = null) {
  const wsUrl = BASE_URL.replace(/^http/, 'ws') + `/socket.io/?EIO=4&transport=websocket` + (token ? `&token=${token}&context=admin` : '');
  const startConnect = Date.now();

  const res = ws.connect(wsUrl, { headers: { 'User-Agent': 'k6-load-tester' } }, function (socket) {
    wsConnectDuration.add(Date.now() - startConnect);
    wsSessionsActive.add(1);

    let clientMsgId = null;
    let sendTimestamp = 0;

    socket.on('open', () => {
      // Socket.IO protocol initial handshake packet
      socket.send('40');
    });

    socket.on('message', (data) => {
      // 1. Engine.IO Heartbeat: Ping ('2') -> Reply with Pong ('3')
      if (data === '2') {
        socket.send('3');
        return;
      }

      // 2. Incoming Socket.IO message or ack
      if (typeof data === 'string' && data.startsWith('42')) {
        wsMessagesReceived.add(1);

        // Check if this is the acknowledgment of our sent message
        if (clientMsgId && data.includes(clientMsgId) && sendTimestamp > 0) {
          wsMessageRoundtrip.add(Date.now() - sendTimestamp);
          sendTimestamp = 0;
        }
      }
    });

    // Schedule periodic messages during the session
    if (conversationId) {
      for (let i = 0; i < msgBurstCount; i++) {
        socket.setTimeout(() => {
          clientMsgId = `k6-${__VU}-${__ITER}-${Date.now()}`;
          sendTimestamp = Date.now();

          // Socket.IO event 'message.send'
          const payload = JSON.stringify([
            'message.send',
            {
              conversationId,
              content: `Load benchmark ping #${i + 1} from VU ${__VU}`,
              clientMessageId: clientMsgId,
            },
          ]);

          socket.send('42' + payload);
          wsMessagesSent.add(1);
        }, (i + 1) * 1500);
      }
    }

    // Hold connection alive for specified duration then close cleanly
    socket.setTimeout(() => {
      socket.close();
    }, durationSeconds * 1000);

    socket.on('error', (e) => {
      wsErrors.add(1);
    });

    socket.on('close', () => {
      wsSessionsActive.add(-1);
    });
  });

  check(res, {
    'WebSocket connection succeeded': (r) => r && r.status === 101,
  });
}
