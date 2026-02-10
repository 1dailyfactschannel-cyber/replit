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

    socket.on("disconnect", () => {
      log(`Socket ${socket.id} disconnected`, "socket.io");
    });
  });

  return io;
}
