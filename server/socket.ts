import { Server as HttpServer } from "http";
import { Server as SocketIOServer } from "socket.io";
import { log } from "./index";
import { getStorage } from "./postgres-storage";
import { mediasoupServer } from "./mediasoup";

const storage = getStorage();

let ioInstance: SocketIOServer | null = null;

export function getIO(): SocketIOServer {
  if (!ioInstance) {
    throw new Error("Socket.io not initialized");
  }
  return ioInstance;
}

export function setupWebSockets(httpServer: HttpServer) {
  const isDev = process.env.NODE_ENV === 'development';
  
  const allowedOrigins = isDev 
    ? ['http://localhost:3005', 'http://localhost:3006', 'http://localhost:3000', 'http://127.0.0.1:3005', 'http://127.0.0.1:3006']
    : (process.env.ALLOWED_ORIGINS 
        ? process.env.ALLOWED_ORIGINS.split(',') 
        : ['http://localhost:3005', 'http://localhost:3000']);
  
  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: allowedOrigins,
      methods: ["GET", "POST"],
      credentials: true
    },
    pingInterval: 25000,
    pingTimeout: 20000,
    allowEIO3: true,
    transports: ['websocket', 'polling'],
  });

  ioInstance = io;
  log("WebSockets setup complete", "socket.io");

  io.on("connect_error", (error) => {
    log(`Socket connection error: ${error.message}`, "socket.io");
  });

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

    // Team Room Call Events
    socket.on("call:join", async (data: { roomId: string, userId: string, user: any }) => {
      socket.join(`call-${data.roomId}`);
      log(`User ${data.userId} joined call room ${data.roomId}`, "socket.io");
      
      try {
        // Save participant to database
        await storage.joinCall({
          roomId: data.roomId,
          userId: data.userId,
          isMicOn: true,
          isVideoOn: true,
          isSpeaking: false
        });
        
        // Get existing participants from database (excluding current user)
        const participants = await storage.getCallParticipantsWithUsers(data.roomId);
        const otherParticipants = participants.filter(p => p.userId !== data.userId);
        
        // Send existing participants to the newly joined user
        socket.emit("call:existing-participants", otherParticipants);
        
        // Notify other participants about the new user
        socket.to(`call-${data.roomId}`).emit("call:participant-joined", {
          userId: data.userId,
          user: data.user,
          isMicOn: true,
          isVideoOn: true,
          isSpeaking: false
        });
      } catch (error: any) {
        log(`Error joining call: ${error.message}`, "socket.io");
      }
    });

    socket.on("call:leave", async (data: { roomId: string, userId: string }) => {
      socket.leave(`call-${data.roomId}`);
      log(`User ${data.userId} left call room ${data.roomId}`, "socket.io");
      
      try {
        // Update database to mark participant as inactive
        await storage.leaveCall(data.roomId, data.userId);
      } catch (error: any) {
        log(`Error leaving call: ${error.message}`, "socket.io");
      }
      
      // Notify other participants
      socket.to(`call-${data.roomId}`).emit("call:participant-left", {
        userId: data.userId
      });
    });

    socket.on("call:toggle-mic", (data: { roomId: string, userId: string, isOn: boolean }) => {
      socket.to(`call-${data.roomId}`).emit("call:participant-updated", {
        userId: data.userId,
        isMicOn: data.isOn
      });
    });

    socket.on("call:toggle-video", (data: { roomId: string, userId: string, isOn: boolean }) => {
      socket.to(`call-${data.roomId}`).emit("call:participant-updated", {
        userId: data.userId,
        isVideoOn: data.isOn
      });
    });

    socket.on("call:speaking", (data: { roomId: string, userId: string, isSpeaking: boolean }) => {
      socket.to(`call-${data.roomId}`).emit("call:participant-updated", {
        userId: data.userId,
        isSpeaking: data.isSpeaking
      });
    });

    // ==================================
    // Mediasoup WebRTC Signaling
    // ==================================

    // Join a call room and create transport
    socket.on("mediasoup:join", async (data: { roomId: string; userId: string }) => {
      log(`User ${data.userId} joining mediasoup room ${data.roomId}`, "mediasoup");
      
      try {
        const transport = await mediasoupServer.createWebRtcTransport(data.roomId, data.userId);
        const router = mediasoupServer.getRouter(data.roomId);
        
        log(`Router for room ${data.roomId}: ${router ? 'found' : 'not found'}`, "mediasoup");
        if (router) {
          log(`Router RTP capabilities: ${JSON.stringify(router.rtpCapabilities)}`, "mediasoup");
        }
        
        socket.emit("mediasoup:transport-created", {
          id: transport.id,
          iceParameters: transport.iceParameters,
          iceCandidates: transport.iceCandidates,
          dtlsParameters: transport.dtlsParameters,
          rtpCapabilities: router ? router.rtpCapabilities : null
        });
      } catch (error: any) {
        log(`Error creating transport: ${error.message}`, "mediasoup");
        socket.emit("mediasoup:error", { message: "Failed to create transport" });
      }
    });

    // Connect transport with dtlsParameters
    socket.on("mediasoup:connect-transport", async (data: { userId: string; dtlsParameters: any }) => {
      try {
        const transport = mediasoupServer.getTransport(data.userId);
        if (transport) {
          await transport.connect({ dtlsParameters: data.dtlsParameters });
          log(`Transport connected for user: ${data.userId}`, "mediasoup");
        }
      } catch (error: any) {
        log(`Error connecting transport: ${error.message}`, "mediasoup");
      }
    });

    // Produce (publish) media stream
    socket.on("mediasoup:produce", async (data: { userId: string; kind: 'audio' | 'video'; rtpParameters: any }) => {
      try {
        const producer = await mediasoupServer.createProducer(data.userId, data.kind, data.rtpParameters);
        
        if (producer) {
          socket.emit("mediasoup:producer-id", { id: producer.id });
          
          // Notify other participants in the same room
          const roomId = producer.appData?.roomId || 'unknown';
          socket.to(`room-${roomId}`).emit("mediasoup:new-producer", {
            producerId: producer.id,
            userId: data.userId,
            kind: data.kind
          });
        }
      } catch (error: any) {
        log(`Error producing media: ${error.message}`, "mediasoup");
      }
    });

    // Consume (subscribe to) media stream
    socket.on("mediasoup:consume", async (data: { userId: string; producerId: string; roomId: string }) => {
      try {
        const consumer = await mediasoupServer.createConsumer(data.userId, data.producerId, data.roomId);
        
        if (consumer) {
          socket.emit("mediasoup:consumer-created", {
            id: consumer.id,
            producerId: consumer.producerId,
            kind: consumer.kind,
            rtpParameters: consumer.rtpParameters
          });
        }
      } catch (error: any) {
        log(`Error consuming media: ${error.message}`, "mediasoup");
      }
    });

    // Resume consumer (after pause)
    socket.on("mediasoup:resume-consumer", async (data: { consumerId: string }) => {
      // Implementation would go here
    });

    socket.on("disconnect", async () => {
      log(`Socket ${socket.id} disconnected`, "socket.io");
      
      // Clean up typing timeouts to prevent memory leaks
      typingTimeouts.forEach((timeout, key) => {
        clearTimeout(timeout);
        typingTimeouts.delete(key);
      });
      
      // Clean up mediasoup resources for disconnected user
      // This would require tracking userId by socket.id
    });
  });

  return io;
}
