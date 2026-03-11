import { useEffect, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";

export function useSocket() {
  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    // Get user ID from API or context
    const initSocket = async () => {
      try {
        const res = await fetch("/api/user");
        if (res.ok) {
          const user = await res.json();
          
          const socket = io({
            query: { userId: user.id },
            transports: ["websocket"],
          });

          socket.on("connect", () => {
            setIsConnected(true);
          });

          socket.on("disconnect", () => {
            setIsConnected(false);
          });

          socketRef.current = socket;
        }
      } catch (error) {
        console.error("Error initializing socket:", error);
      }
    };

    initSocket();

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, []);

  return socketRef.current;
}
