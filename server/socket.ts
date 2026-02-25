import { Server as HttpServer } from "http";
import { Server as SocketIOServer } from "socket.io";
import { log } from "./index";

export function setupWebSockets(httpServer: HttpServer) {
  // Security: Restrict CORS to specific origins
  const allowedOrigins = process.env.ALLOWED_ORIGINS 
    ? process.env.ALLOWED_ORIGINS.split(',') 
    : ['http://localhost:3005', 'http://localhost:3000'];
  
  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: allowedOrigins,
      methods: ["GET", "POST"],
      credentials: true
    },
    pingInterval: 25000,
    pingTimeout: 10000,
  });

  log("WebSockets setup complete", "socket.io");

  io.on("connection", (socket) => {
    const userId = socket.handshake.query.userId as string;
    log(`New socket connection: ${socket.id}, userId from query: ${userId}`, "socket.io");
    
    if (userId) {
      socket.join(`user:${userId}`);
      log(`Socket ${socket.id} joined room user:${userId}`, "socket.io");
    } else {
      log(`Socket ${socket.id} connected without userId`, "socket.io");
    }

    socket.on("join-chat", (chatId: string) => {
      socket.join(`chat:${chatId}`);
      log(`Socket ${socket.id} joined chat room chat:${chatId}`, "socket.io");
    });

    socket.on("leave-chat", (chatId: string) => {
      socket.leave(`chat:${chatId}`);
      log(`Socket ${socket.id} left chat room chat:${chatId}`, "socket.io");
    });

    // Typing events with debounce/batching to reduce server load
    const typingTimeouts = new Map<string, NodeJS.Timeout>();
    
    socket.on("typing", (data: { chatId: string, userId: string, username: string }) => {
      const key = `${data.chatId}:${data.userId}`;
      
      // Clear existing timeout
      if (typingTimeouts.has(key)) {
        clearTimeout(typingTimeouts.get(key));
      }
      
      // Emit typing event
      socket.to(`chat:${data.chatId}`).emit("user-typing", data);
      
      // Set timeout to emit "stopped-typing" after 2 seconds
      const timeout = setTimeout(() => {
        socket.to(`chat:${data.chatId}`).emit("user-stopped-typing", {
          chatId: data.chatId,
          userId: data.userId
        });
        typingTimeouts.delete(key);
      }, 2000);
      
      typingTimeouts.set(key, timeout);
    });
    
    socket.on("stop-typing", (data: { chatId: string, userId: string }) => {
      const key = `${data.chatId}:${data.userId}`;
      
      if (typingTimeouts.has(key)) {
        clearTimeout(typingTimeouts.get(key));
        typingTimeouts.delete(key);
      }
      
      socket.to(`chat:${data.chatId}`).emit("user-stopped-typing", data);
    });

    // Call signaling events
    socket.on("call-user", (data: { to: string, from: string, name: string, signal: any, type: 'audio' | 'video', chatId: string, callId?: string }) => {
      log(`Call request from ${data.from} to user:${data.to} (socket ${socket.id})`, "socket.io");
      const roomName = `user:${data.to}`;
      const rooms = io.sockets.adapter.rooms;
      const targetRoom = rooms.get(roomName);
      
      if (targetRoom) {
        log(`Emitting call-made to room ${roomName} (${targetRoom.size} sockets)`, "socket.io");
        socket.to(roomName).emit("call-made", {
          signal: data.signal,
          from: data.from,
          name: data.name,
          type: data.type,
          chatId: data.chatId,
          callId: data.callId
        });
      } else {
        log(`Target room ${roomName} is empty! User ${data.to} is offline or not connected.`, "socket.io");
      }
    });

    socket.on("answer-call", (data: { to: string, signal: any }) => {
      log(`Answer from ${socket.id} (user ${userId}) to user:${data.to}`, "socket.io");
      socket.to(`user:${data.to}`).emit("call-answered", {
        signal: data.signal,
        from: userId || socket.id
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
