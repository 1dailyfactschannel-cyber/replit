import React, { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Mic, MicOff, Video, VideoOff, Phone, X } from "lucide-react";
import { Socket } from "socket.io-client";
import Peer from "simple-peer";
import { cn } from "@/lib/utils";
import { apiRequest } from "@/lib/queryClient";

interface CallOverlayProps {
  socket: Socket;
  currentUser: { id: string; username: string; avatar?: string | null };
  activeCall: {
    isReceiving: boolean;
    from: string;
    name: string;
    signal: any;
    type: 'audio' | 'video';
    chatId: string;
    callId?: string;
  } | null;
  outboundCall: {
    to: string;
    name: string;
    type: 'audio' | 'video';
    chatId: string;
  } | null;
  onClose: () => void;
}

export function CallOverlay({ socket, currentUser, activeCall, outboundCall, onClose }: CallOverlayProps) {
  const [callAccepted, setCallAccepted] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [isMicMuted, setIsMicMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [callId, setCallId] = useState<string | null>(activeCall?.callId || null);
  const startTimeRef = useRef<number>(Date.now());
  
  const myVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const connectionRef = useRef<Peer.Instance | null>(null);

  const isVideo = (activeCall?.type === 'video') || (outboundCall?.type === 'video');
  const otherPartyName = activeCall?.name || outboundCall?.name || "Собеседник";

  useEffect(() => {
    // Get user media
    navigator.mediaDevices.getUserMedia({ 
      video: isVideo, 
      audio: true 
    }).then((currentStream) => {
      setStream(currentStream);
      if (myVideoRef.current) {
        myVideoRef.current.srcObject = currentStream;
      }

      if (outboundCall) {
        callUser(currentStream);
      }
    }).catch(err => {
      console.error("Failed to get local stream", err);
    });

    // Socket listeners for call events
    socket.on("call-answered", (data: { signal: any }) => {
      setCallAccepted(true);
      startTimeRef.current = Date.now();
      if (connectionRef.current) {
        connectionRef.current.signal(data.signal);
      }
      // Update call status to active in DB
      if (callId) {
        apiRequest("PATCH", `/api/calls/${callId}`, { status: 'active' });
      }
    });

    socket.on("call-rejected", () => {
      cleanup();
      onClose();
    });

    socket.on("call-ended", () => {
      cleanup();
      onClose();
    });

    return () => {
      cleanup();
      socket.off("call-answered");
      socket.off("call-rejected");
      socket.off("call-ended");
    };
  }, [callId]);

  const cleanup = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
    }
    if (connectionRef.current) {
      connectionRef.current.destroy();
    }
  };

  const callUser = async (currentStream: MediaStream) => {
    if (!outboundCall) return;

    try {
      // Create call record in DB
      const res = await apiRequest("POST", "/api/calls", {
        chatId: outboundCall.chatId,
        receiverId: outboundCall.to,
        type: outboundCall.type,
        status: 'missed' // Initial status
      });
      const newCall = await res.json();
      setCallId(newCall.id);

      const peer = new Peer({
        initiator: true,
        trickle: false,
        stream: currentStream,
      });

      peer.on("signal", (data) => {
        socket.emit("call-user", {
          to: outboundCall.to,
          from: currentUser.id,
          name: currentUser.username,
          signal: data,
          type: outboundCall.type,
          chatId: outboundCall.chatId,
          callId: newCall.id
        });
      });

      peer.on("stream", (remoteStream) => {
        setRemoteStream(remoteStream);
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = remoteStream;
        }
      });

      connectionRef.current = peer;
    } catch (error) {
      console.error("Error creating call record:", error);
    }
  };

  const answerCall = async () => {
    if (!activeCall || !stream) return;
    
    setCallAccepted(true);
    startTimeRef.current = Date.now();

    const peer = new Peer({
      initiator: false,
      trickle: false,
      stream: stream,
    });

    peer.on("signal", (data) => {
      socket.emit("answer-call", { to: activeCall.from, signal: data });
    });

    peer.on("stream", (remoteStream) => {
      setRemoteStream(remoteStream);
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = remoteStream;
      }
    });

    peer.signal(activeCall.signal);
    connectionRef.current = peer;

    // Update call status to active in DB
    if (activeCall.callId) {
      await apiRequest("PATCH", `/api/calls/${activeCall.callId}`, { status: 'active' });
    }
  };

  const rejectCall = async () => {
    if (activeCall) {
      socket.emit("reject-call", { to: activeCall.from });
      // Update call status to rejected in DB
      if (activeCall.callId) {
        await apiRequest("PATCH", `/api/calls/${activeCall.callId}`, { status: 'rejected' });
      }
    }
    onClose();
  };

  const endCall = async () => {
    const to = activeCall?.from || outboundCall?.to;
    if (to) {
      socket.emit("end-call", { to });
    }

    // Update call record with duration and status
    if (callId) {
      const duration = callAccepted ? Math.floor((Date.now() - startTimeRef.current) / 1000) : 0;
      await apiRequest("PATCH", `/api/calls/${callId}`, { 
        status: callAccepted ? 'completed' : 'missed',
        duration 
      });
    }

    onClose();
  };

  const toggleMic = () => {
    if (stream) {
      const audioTrack = stream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMicMuted(!audioTrack.enabled);
      }
    }
  };

  const toggleVideo = () => {
    if (stream) {
      const videoTrack = stream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoOff(!videoTrack.enabled);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md animate-in fade-in duration-300">
      <div className="w-full max-w-4xl aspect-video bg-slate-900 rounded-3xl overflow-hidden shadow-2xl flex flex-col relative border border-white/10">
        
        {/* Video Area */}
        <div className="flex-1 relative bg-slate-950 flex items-center justify-center">
          {callAccepted ? (
            <>
              {/* Remote Video */}
              <div className="w-full h-full flex items-center justify-center">
                {isVideo ? (
                  <video playsInline ref={remoteVideoRef} autoPlay className="w-full h-full object-cover" />
                ) : (
                  <div className="flex flex-col items-center">
                    <Avatar className="w-32 h-32 mb-4">
                      <AvatarFallback className="text-4xl bg-primary/20 text-primary">
                        {otherPartyName.substring(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <h2 className="text-2xl font-bold text-white">{otherPartyName}</h2>
                    <p className="text-emerald-400 animate-pulse">Звонок идет...</p>
                  </div>
                )}
              </div>
              
              {/* Local Video Preview */}
              {isVideo && (
                <div className="absolute bottom-6 right-6 w-48 aspect-video bg-black rounded-xl border-2 border-white/20 overflow-hidden shadow-xl z-20">
                  <video playsInline muted ref={myVideoRef} autoPlay className="w-full h-full object-cover" />
                  {isVideoOff && (
                    <div className="absolute inset-0 flex items-center justify-center bg-slate-900">
                      <VideoOff className="w-8 h-8 text-white/40" />
                    </div>
                  )}
                </div>
              )}
            </>
          ) : (
            /* Incoming / Outgoing Call State */
            <div className="flex flex-col items-center gap-6 animate-in zoom-in duration-500">
              <div className="relative">
                <div className="absolute inset-0 bg-primary/20 rounded-full animate-ping" />
                <Avatar className="w-32 h-32 relative border-4 border-white/10">
                  <AvatarFallback className="text-4xl bg-primary/20 text-primary font-bold">
                    {otherPartyName.substring(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              </div>
              
              <div className="text-center">
                <h2 className="text-3xl font-bold text-white mb-2">{otherPartyName}</h2>
                <p className="text-slate-400 text-lg">
                  {activeCall ? `Входящий ${isVideo ? 'видео' : 'аудио'} звонок...` : `Вызов (${isVideo ? 'видео' : 'аудио'})...`}
                </p>
              </div>

              {activeCall && (
                <div className="flex gap-8 mt-4">
                  <Button 
                    onClick={answerCall}
                    className="w-16 h-16 rounded-full bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg shadow-emerald-500/20"
                  >
                    <Phone className="w-8 h-8" />
                  </Button>
                  <Button 
                    onClick={rejectCall}
                    className="w-16 h-16 rounded-full bg-rose-500 hover:bg-rose-600 text-white shadow-lg shadow-rose-500/20"
                  >
                    <X className="w-8 h-8" />
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Controls Bar */}
        {(callAccepted || outboundCall) && (
          <div className="h-24 bg-slate-900/90 border-t border-white/10 flex items-center justify-center gap-6 px-8">
            <Button
              variant="outline"
              size="icon"
              className={cn(
                "w-12 h-12 rounded-full transition-all",
                isMicMuted ? "bg-rose-500/20 border-rose-500 text-rose-500 hover:bg-rose-500/30" : "bg-white/5 border-white/10 hover:bg-white/10"
              )}
              onClick={toggleMic}
            >
              {isMicMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
            </Button>

            {isVideo && (
              <Button
                variant="outline"
                size="icon"
                className={cn(
                  "w-12 h-12 rounded-full transition-all",
                  isVideoOff ? "bg-rose-500/20 border-rose-500 text-rose-500 hover:bg-rose-500/30" : "bg-white/5 border-white/10 hover:bg-white/10"
                )}
                onClick={toggleVideo}
              >
                {isVideoOff ? <VideoOff className="w-5 h-5" /> : <Video className="w-5 h-5" />}
              </Button>
            )}

            <Button
              onClick={endCall}
              className="w-16 h-12 rounded-2xl bg-rose-500 hover:bg-rose-600 text-white flex gap-2 items-center px-6 shadow-lg shadow-rose-500/20"
            >
              <Phone className="w-5 h-5 rotate-[135deg]" />
              <span className="font-bold">Завершить</span>
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
