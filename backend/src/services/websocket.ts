import { WebSocketServer, WebSocket } from "ws";
import { Server } from "http";

interface WSMessage {
  type: string;
  payload: any;
}

class WebSocketService {
  private wss: WebSocketServer | null = null;
  private clients: Set<WebSocket> = new Set();
  private jobSubscriptions: Map<string, Set<WebSocket>> = new Map();

  initialize(server: Server) {
    this.wss = new WebSocketServer({ server, path: "/ws" });

    this.wss.on("connection", (ws: WebSocket) => {
      this.clients.add(ws);

      ws.on("message", (raw: string) => {
        try {
          const msg = JSON.parse(raw.toString());
          if (msg.action === "subscribe_job" && msg.jobId) {
            if (!this.jobSubscriptions.has(msg.jobId)) {
              this.jobSubscriptions.set(msg.jobId, new Set());
            }
            this.jobSubscriptions.get(msg.jobId)!.add(ws);
            ws.send(JSON.stringify({ type: "SUBSCRIBED", jobId: msg.jobId }));
          }
        } catch (e) {
          // ignore malformed client packets
        }
      });

      ws.on("close", () => {
        this.clients.delete(ws);
        for (const [jobId, subs] of this.jobSubscriptions.entries()) {
          subs.delete(ws);
          if (subs.size === 0) {
            this.jobSubscriptions.delete(jobId);
          }
        }
      });

      ws.send(JSON.stringify({ type: "CONNECTED", message: "Connected to GPUChain real-time stream" }));
    });
  }

  broadcast(type: string, payload: any) {
    const message = JSON.stringify({ type, payload });
    for (const client of this.clients) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    }
  }

  sendToJob(jobId: string, type: string, payload: any) {
    const message = JSON.stringify({ type, jobId, payload });
    const subs = this.jobSubscriptions.get(jobId);
    if (subs) {
      for (const client of subs) {
        if (client.readyState === WebSocket.OPEN) {
          client.send(message);
        }
      }
    }
    // Also broadcast to general feed
    this.broadcast(type, { jobId, ...payload });
  }
}

export const wsService = new WebSocketService();
