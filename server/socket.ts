import { Server as HttpServer } from "http";
import { Server as SocketIOServer } from "socket.io";
import { log } from "./index";

export function setupWebSockets(httpServer: HttpServer) {
  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
    },
    pingInterval: 10000,
    pingTimeout: 5000,
  });

  log("WebSockets setup complete", "socket.io");

  io.on("connection", (socket) => {
    const userId = socket.handshake.query.userId as string;
    
    if (userId) {
      socket.join(`user:${userId}`);
      log(`User ${userId} connected and joined room user:${userId}`, "socket.io");
    }

    socket.on("join-chat", (chatId: string) => {
      socket.join(`chat:${chatId}`);
      log(`Socket ${socket.id} joined chat room chat:${chatId}`, "socket.io");
    });

    socket.on("leave-chat", (chatId: string) => {
      socket.leave(`chat:${chatId}`);
      log(`Socket ${socket.id} left chat room chat:${chatId}`, "socket.io");
    });

    socket.on("typing", (data: { chatId: string, userId: string, username: string }) => {
      socket.to(`chat:${data.chatId}`).emit("user-typing", data);
    });

    // Call signaling events
    socket.on("call-user", (data: { to: string, from: string, name: string, signal: any, type: 'audio' | 'video', chatId: string, callId?: string }) => {
      log(`Call from ${data.from} to user:${data.to}`, "socket.io");
      socket.to(`user:${data.to}`).emit("call-made", {
        signal: data.signal,
        from: data.from,
        name: data.name,
        type: data.type,
        chatId: data.chatId,
        callId: data.callId
      });
    });

    socket.on("answer-call", (data: { to: string, signal: any }) => {
      log(`Answer from ${socket.id} to user:${data.to}`, "socket.io");
      socket.to(`user:${data.to}`).emit("call-answered", {
        signal: data.signal,
        from: socket.id
      });
    });

    socket.on("reject-call", (data: { to: string }) => {
      socket.to(`user:${data.to}`).emit("call-rejected");
    });

    socket.on("end-call", (data: { to: string }) => {
      socket.to(`user:${data.to}`).emit("call-ended");
    });

    socket.on("ice-candidate", (data: { to: string, candidate: any }) => {
      socket.to(`user:${data.to}`).emit("ice-candidate", data.candidate);
    });

    socket.on("disconnect", () => {
      log(`Socket ${socket.id} disconnected`, "socket.io");
    });
  });

  return io;
}
