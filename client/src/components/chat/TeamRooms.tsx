import { useState, useEffect, useRef, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Users, 
  Video, 
  Clock, 
  Mic, 
  MicOff, 
  VideoOff, 
  PhoneOff, 
  Settings2, 
  Share2, 
  LayoutGrid, 
  List, 
  Loader2, 
  Lock,
  Volume2,
  VolumeX,
  Monitor,
  MonitorOff,
  MoreVertical,
  UserX,
  X,
  ChevronRight,
  ChevronLeft,
  MonitorSpeaker,
  UserPlus
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useNotifications } from "@/hooks/use-notifications";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useSocket } from "@/hooks/use-socket";
import { cn } from "@/lib/utils";
import type { Socket } from "socket.io-client";
import { Device, types as mediasoupTypes } from 'mediasoup-client';

interface TeamRoom {
  id: string;
  name: string;
  description: string | null;
  slug: string;
  inviteCode: string;
  accessType: "open" | "closed";
  color: string;
  createdBy: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface CallParticipant {
  id: string;
  roomId: string;
  userId: string;
  isMicOn: boolean;
  isVideoOn: boolean;
  isSpeaking: boolean;
  joinedAt: string;
  user?: {
    id: string;
    username: string;
    firstName: string | null;
    lastName: string | null;
    avatar: string | null;
  };
}

interface CallSettings {
  id: string;
  userId: string;
  preferredMic: string | null;
  preferredCamera: string | null;
  preferredSpeaker: string | null;
  micVolume: number;
  speakerVolume: number;
  videoQuality: 'low' | 'medium' | 'high';
  noiseSuppression: boolean;
}

interface MediaDevice {
  deviceId: string;
  label: string;
  kind: 'audioinput' | 'audiooutput' | 'videoinput';
}

export function TeamRooms({ autoJoinRoomId }: { autoJoinRoomId?: string }) {
  const { notify } = useNotifications();
  const queryClient = useQueryClient();
  const socket = useSocket();
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [activeRoom, setActiveRoom] = useState<TeamRoom | null>(null);
  const [isJoined, setIsJoined] = useState(false);
  const [isMicOn, setIsMicOn] = useState(true);
  const [isVideoOn, setIsVideoOn] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isSpeakerOn, setIsSpeakerOn] = useState(true);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [participants, setParticipants] = useState<CallParticipant[]>([]);
  const [showParticipantsPanel, setShowParticipantsPanel] = useState(false);
  const [showSettingsDialog, setShowSettingsDialog] = useState(false);
  const [mediaDevices, setMediaDevices] = useState<MediaDevice[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);

  // Guest invitation state
  const [guestInvitation, setGuestInvitation] = useState<{
    token: string;
    roomId: string;
    roomName: string;
    valid: boolean;
    message?: string;
  } | null>(null);
  const [guestSession, setGuestSession] = useState<{
    id: string;
    roomId: string;
    expiresAt: string;
  } | null>(null);
  const [showGuestInviteDialog, setShowGuestInviteDialog] = useState(false);
  const [isAcceptingInvite, setIsAcceptingInvite] = useState(false);

  // Device fingerprint helper
  const getDeviceFingerprint = (): string => {
    const fingerprint = localStorage.getItem('deviceFingerprint');
    if (fingerprint) return fingerprint;
    
    const newFingerprint = `${navigator.userAgent}-${navigator.language}-${screen.width}x${screen.height}-${new Date().getTimezoneOffset()}`;
    localStorage.setItem('deviceFingerprint', newFingerprint);
    return newFingerprint;
  };

  // Check for guest invitation in URL
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const inviteToken = urlParams.get('invite');
    
    if (inviteToken && !currentUser) {
      verifyGuestInvitation(inviteToken);
    }
  }, [currentUser]);

  // Verify guest invitation
  const verifyGuestInvitation = async (token: string) => {
    try {
      const res = await fetch(`/api/guest-invitations/${token}/verify`);
      const data = await res.json();
      
      if (data.valid) {
        // Get room name
        const roomRes = await fetch(`/api/team-rooms/${data.invitation.roomId}`);
        const room = await roomRes.json();
        
        setGuestInvitation({
          token,
          roomId: data.invitation.roomId,
          roomName: room.name || 'Team Room',
          valid: true
        });
        setShowGuestInviteDialog(true);
      } else {
        setGuestInvitation({
          token,
          roomId: '',
          roomName: '',
          valid: false,
          message: data.message
        });
        toast.error(data.message || 'Invalid invitation');
      }
    } catch (error) {
      console.error('Error verifying invitation:', error);
      toast.error('Failed to verify invitation');
    }
  };

  // Accept guest invitation
  const acceptGuestInvitation = async () => {
    if (!guestInvitation) return;
    
    setIsAcceptingInvite(true);
    try {
      const deviceFingerprint = getDeviceFingerprint();
      const res = await fetch(`/api/guest-invitations/${guestInvitation.token}/use`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deviceFingerprint })
      });
      
      const data = await res.json();
      
      if (data.success) {
        // Store session in localStorage
        localStorage.setItem('guestSession', JSON.stringify({
          id: data.sessionId,
          roomId: data.roomId,
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
        }));
        
        setGuestSession({
          id: data.sessionId,
          roomId: data.roomId,
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
        });
        
        setShowGuestInviteDialog(false);
        toast.success(`You are now a guest in ${data.roomName}`);
        
        // Clear URL parameter
        const url = new URL(window.location.href);
        url.searchParams.delete('invite');
        window.history.replaceState({}, '', url);
        
        // Redirect to room
        window.location.href = `/team?room=${data.roomId}`;
      } else {
        toast.error(data.message || 'Failed to accept invitation');
      }
    } catch (error) {
      console.error('Error accepting invitation:', error);
      toast.error('Failed to accept invitation');
    } finally {
      setIsAcceptingInvite(false);
    }
  };

  // Check for existing guest session on mount
  useEffect(() => {
    const storedSession = localStorage.getItem('guestSession');
    if (storedSession) {
      try {
        const session = JSON.parse(storedSession);
        if (new Date(session.expiresAt) > new Date()) {
          verifyGuestSession(session);
        } else {
          localStorage.removeItem('guestSession');
        }
      } catch {
        localStorage.removeItem('guestSession');
      }
    }
  }, []);

  // Verify guest session
  const verifyGuestSession = async (session: { id: string; roomId: string; expiresAt: string }) => {
    try {
      const deviceFingerprint = getDeviceFingerprint();
      const res = await fetch(`/api/guest-sessions/${session.id}/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deviceFingerprint })
      });
      
      const data = await res.json();
      
      if (data.valid) {
        setGuestSession(session);
      } else {
        localStorage.removeItem('guestSession');
      }
    } catch (error) {
      console.error('Error verifying session:', error);
      localStorage.removeItem('guestSession');
    }
  };

  // Leave guest session
  const leaveGuestSession = async () => {
    if (!guestSession) return;
    
    try {
      await fetch(`/api/guest-sessions/${guestSession.id}`, { method: 'DELETE' });
      localStorage.removeItem('guestSession');
      setGuestSession(null);
      toast.success('You have left the room');
    } catch (error) {
      console.error('Error leaving session:', error);
    }
  };

  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const microphoneStreamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  // Mediasoup refs
  const mediasoupRef = useRef<{
    device: Device | null;
    sendTransport: any;
    recvTransport: any;
    recvTransports: Map<string, any>;
    producers: Map<string, any>;
    consumers: Map<string, any>;
    localStream: MediaStream | null;
    screenShareStream: MediaStream | null;
    transportParams: any;
  }>({
    device: null,
    sendTransport: null,
    recvTransport: null,
    recvTransports: new Map(),
    producers: new Map(),
    consumers: new Map(),
    localStream: null,
    screenShareStream: null,
    transportParams: null
  });

  // Video element refs
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const activeSpeakerVideoRef = useRef<HTMLVideoElement>(null);
  const videoRefs = useRef<Map<string, React.RefObject<HTMLVideoElement>>>(new Map());
  const [activeSpeaker, setActiveSpeaker] = useState<CallParticipant | null>(null);

  const { data: rooms = [], isLoading: roomsLoading } = useQuery<TeamRoom[]>({
    queryKey: ["/api/team-rooms"],
  });

  // Auto-join room when autoJoinRoomId prop is provided
  useEffect(() => {
    if (!autoJoinRoomId || roomsLoading) return;
    if (!rooms.length) return;
    if (!socket || !currentUser || isJoined) return;
    
    const room = rooms.find(r => r.id === autoJoinRoomId);
    if (room) {
      handleJoin(room);
    }
  }, [autoJoinRoomId, rooms, roomsLoading, socket, currentUser, isJoined]);

  // ==================================
  // Mediasoup Initialization
  // ==================================
  
  const getIceServers = () => {
    const turnServer = process.env.TURN_SERVER || 'localhost';
    const turnPort = process.env.TURN_PORT || '3478';
    
    // STUN servers (public, always available)
    const iceServers: { urls: string; username?: string; credential?: string }[] = [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
      { urls: 'stun:stun2.l.google.com:19302' }
    ];
    
    // Add TURN only if credentials are provided
    if (process.env.TURN_USERNAME && process.env.TURN_PASSWORD) {
      iceServers.push({
        urls: `turn:${turnServer}:${turnPort}`,
        username: process.env.TURN_USERNAME,
        credential: process.env.TURN_PASSWORD
      });
    }
    
    return iceServers;
  };

  const initMediasoup = async (): Promise<boolean> => {
    try {
      const device = new Device();
      mediasoupRef.current.device = device;
      
      // We need to get router rtpCapabilities from server
      // This will be sent when transport is created
      return true;
    } catch (error: any) {
      console.error('Failed to initialize mediasoup:', error);
      toast.error('Не удалось инициализировать видеозвонок');
      return false;
    }
  };

  const getMediaStream = async (): Promise<MediaStream | null> => {
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    
    try {
      // Try to get both video and audio
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: isMobile ? 320 : 640 },
          height: { ideal: isMobile ? 240 : 480 },
          frameRate: { ideal: 30 },
          facingMode: isMobile ? 'user' : undefined
        },
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });
      
      console.log('[Media] Got stream with video+audio');
      mediasoupRef.current.localStream = stream;
      
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }
      
      return stream;
    } catch (error: any) {
      console.warn('[Media] Failed to get video+audio, trying audio only:', error.name);
      
      // Try audio only
      try {
        const audioStream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true
          }
        });
        
        console.log('[Media] Got audio-only stream');
        mediasoupRef.current.localStream = audioStream;
        return audioStream;
      } catch (audioError: any) {
        console.warn('[Media] Failed to get audio:', audioError.name);
        
        // Try video only
        try {
          const videoStream = await navigator.mediaDevices.getUserMedia({
            video: {
              width: { ideal: isMobile ? 320 : 640 },
              height: { ideal: isMobile ? 240 : 480 },
              frameRate: { ideal: 30 },
              facingMode: isMobile ? 'user' : undefined
            }
          });
          
          console.log('[Media] Got video-only stream');
          mediasoupRef.current.localStream = videoStream;
          
          if (localVideoRef.current) {
            localVideoRef.current.srcObject = videoStream;
          }
          
          return videoStream;
        } catch (videoError: any) {
          console.warn('[Media] Failed to get video:', videoError.name);
          // No devices available
          return null;
        }
      }
    }
  };

  const checkBrowserSupport = (): boolean => {
    const isSupported = !!(
      navigator.mediaDevices &&
      typeof navigator.mediaDevices.getUserMedia === 'function' &&
      window.RTCPeerConnection
    );
    
    if (!isSupported) {
      toast.error('Ваш браузер не поддерживает видеозвонки. Пожалуйста, используйте Chrome 90+, Firefox 88+ или Safari 14+');
      return false;
    }
    
    return true;
  };

  // ==================================
  // Mediasoup Signaling
  // ==================================

  const joinMediasoupRoom = async (roomId: string, userId: string) => {
    if (!socket) return;
    
    socket.emit('mediasoup:join', { roomId, userId });
    
    return new Promise<void>((resolve, reject) => {
      socket.once('mediasoup:transport-created', async (data: any) => {
        try {
          if (!mediasoupRef.current.device) {
            reject(new Error('Device not initialized'));
            return;
          }

          console.log('[Mediasoup] Received transport data:', data);
          console.log('[Mediasoup] RTP Capabilities:', data.rtpCapabilities);

          // Load device with router RTP capabilities
          if (data.rtpCapabilities) {
            console.log('[Mediasoup] Loading device with RTP capabilities...');
            await mediasoupRef.current.device.load({ routerRtpCapabilities: data.rtpCapabilities });
            console.log('[Mediasoup] Device loaded successfully');
          } else {
            console.warn('[Mediasoup] No RTP capabilities received from server!');
          }

          // Use existing local stream if available (from handleJoin)
          const stream = mediasoupRef.current.localStream;
          
          console.log('[Mediasoup] Creating send transport...');
          const transport = mediasoupRef.current.device.createSendTransport({
            id: data.id,
            iceParameters: data.iceParameters,
            iceCandidates: data.iceCandidates,
            dtlsParameters: data.dtlsParameters,
            iceServers: getIceServers()
          });
          console.log('[Mediasoup] Send transport created');

          transport.on('connect', ({ dtlsParameters }: any) => {
            console.log('[Mediasoup] Transport connect event, socket connected:', socket.connected);
            if (socket.connected) {
              socket.emit('mediasoup:connect-transport', {
                userId,
                dtlsParameters
              });
            } else {
              console.error('[Mediasoup] Socket not connected!');
            }
          });

          transport.on('produce', async (parameters: any) => {
            console.log('[Mediasoup] Transport produce event:', parameters.kind, 'socket connected:', socket.connected);
            if (socket.connected) {
              socket.emit('mediasoup:produce', {
                userId,
                kind: parameters.kind,
                rtpParameters: parameters.rtpParameters
              });
            } else {
              console.error('[Mediasoup] Socket not connected for produce!');
            }
          });

          mediasoupRef.current.sendTransport = transport;
          mediasoupRef.current.transportParams = {
            id: data.id,
            iceParameters: data.iceParameters,
            iceCandidates: data.iceCandidates,
            dtlsParameters: data.dtlsParameters
          };

          if (stream) {
            const videoTrack = stream.getVideoTracks()[0];
            const audioTrack = stream.getAudioTracks()[0];

            console.log('[Mediasoup] Stream available. Video:', !!videoTrack, 'Audio:', !!audioTrack);

            // Produce tracks without waiting (handled asynchronously)
            if (videoTrack) {
              console.log('[Mediasoup] Producing video track...');
              transport.produce({ track: videoTrack })
                .then(() => console.log('[Mediasoup] Video track produced'))
                .catch(e => console.error('[Mediasoup] produce video error:', e));
            }
            if (audioTrack) {
              console.log('[Mediasoup] Producing audio track...');
              transport.produce({ track: audioTrack })
                .then(() => console.log('[Mediasoup] Audio track produced'))
                .catch(e => console.error('[Mediasoup] produce audio error:', e));
            }
          } else {
            console.log('[Mediasoup] No local stream, joining as listener only');
          }

          console.log('[Mediasoup] Joining completed, resolving...');
          resolve();
        } catch (error) {
          console.error('[Mediasoup] Error in joinMediasoupRoom:', error);
          reject(error);
        }
      });

      // Don't use timeout - let it resolve naturally
    });
  };

  // Listen for new producers from other participants
  useEffect(() => {
    if (!socket || !isJoined) return;

    const handleNewProducer = (data: { producerId: string; userId: string; kind: string }) => {
      // Subscribe to new producer
      socket.emit('mediasoup:consume', {
        userId: currentUser.id,
        producerId: data.producerId,
        roomId: activeRoom?.id
      });
    };

    socket.on('mediasoup:new-producer', handleNewProducer);

    return () => {
      socket.off('mediasoup:new-producer', handleNewProducer);
    };
  }, [socket, isJoined, currentUser]);

  // Handle incoming consumer creation
  useEffect(() => {
    if (!socket || !isJoined) return;

    const handleConsumerCreated = async (data: any) => {
      if (mediasoupRef.current.device) {
        try {
          // Create recv transport if not already created
          if (!mediasoupRef.current.recvTransport && mediasoupRef.current.transportParams) {
            mediasoupRef.current.recvTransport = await mediasoupRef.current.device.createRecvTransport({
              id: mediasoupRef.current.transportParams.id,
              iceParameters: mediasoupRef.current.transportParams.iceParameters,
              iceCandidates: mediasoupRef.current.transportParams.iceCandidates,
              dtlsParameters: mediasoupRef.current.transportParams.dtlsParameters,
              iceServers: getIceServers()
            });
            
            mediasoupRef.current.recvTransport.on('connect', ({ dtlsParameters }: any) => {
              socket.emit('mediasoup:connect-transport', {
                userId: currentUser.id,
                dtlsParameters
              });
            });
          }

          if (!mediasoupRef.current.recvTransport) {
            throw new Error('Recv transport not created');
          }

          const consumer = await mediasoupRef.current.recvTransport.consume({
            id: data.id,
            producerId: data.producerId,
            kind: data.kind,
            rtpParameters: data.rtpParameters
          });

          // Display remote video
          const videoRef = videoRefs.current.get(data.producerId);
          if (videoRef?.current && consumer.kind === 'video') {
            videoRef.current.srcObject = new MediaStream([consumer.track]);
          }
        } catch (error: any) {
          console.error('Failed to create consumer:', error);
        }
      }
    };

    socket.on('mediasoup:consumer-created', handleConsumerCreated);

    return () => {
      socket.off('mediasoup:consumer-created', handleConsumerCreated);
    };
  }, [socket, isJoined, currentUser]);

  const { data: callSettings } = useQuery<CallSettings>({
    queryKey: ["/api/call-settings"],
    enabled: isJoined,
  });

  const { data: participantsData = [] } = useQuery<CallParticipant[]>({
    queryKey: ["/api/team-rooms", activeRoom?.id, "participants"],
    enabled: !!activeRoom && isJoined,
    refetchInterval: isJoined ? 5000 : false,
  });

  // Update active speaker based on participants
  useEffect(() => {
    const speakingParticipant = participants.find(p => p.isSpeaking);
    setActiveSpeaker(speakingParticipant || null);
  }, [participants]);

  const updateSettingsMutation = useMutation({
    mutationFn: async (settings: Partial<CallSettings>) => {
      const res = await apiRequest("POST", "/api/call-settings", settings);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/call-settings"] });
      toast.success("Настройки сохранены");
    },
  });

  const kickParticipantMutation = useMutation({
    mutationFn: async (userId: string) => {
      if (!activeRoom) return;
      await apiRequest("POST", `/api/calls/${activeRoom.id}/kick`, { userId });
    },
    onSuccess: () => {
      toast.success("Участник исключен");
      queryClient.invalidateQueries({ queryKey: ["/api/team-rooms", activeRoom?.id, "participants"] });
    },
    onError: () => {
      toast.error("Не удалось исключить участника");
    },
  });

  // Get current user
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const res = await fetch("/api/user");
        if (res.ok) {
          const user = await res.json();
          setCurrentUser(user);
        }
      } catch (error) {
        console.error("Error fetching user:", error);
      }
    };
    fetchUser();
  }, []);

  // Socket event handlers
  useEffect(() => {
    if (!socket || !isJoined || !activeRoom) return;

    const handleParticipantJoined = (data: any) => {
      setParticipants((prev) => {
        const exists = prev.find((p) => p.userId === data.userId);
        if (exists) return prev;
        return [...prev, data];
      });
    };

    const handleParticipantLeft = (data: { userId: string }) => {
      setParticipants((prev) => prev.filter((p) => p.userId !== data.userId));
    };

    const handleParticipantUpdated = (data: { userId: string; isMicOn?: boolean; isVideoOn?: boolean; isSpeaking?: boolean }) => {
      setParticipants((prev) =>
        prev.map((p) =>
          p.userId === data.userId
            ? { ...p, ...data }
            : p
        )
      );
    };

    const handleKicked = () => {
      setIsJoined(false);
      setActiveRoom(null);
      setParticipants([]);
      toast.error("Вы были исключены из звонка");
    };

    const handleExistingParticipants = (data: CallParticipant[]) => {
      setParticipants(data);
    };

    socket.on("call:participant-joined", handleParticipantJoined);
    socket.on("call:participant-left", handleParticipantLeft);
    socket.on("call:participant-updated", handleParticipantUpdated);
    socket.on("call:kicked", handleKicked);
    socket.on("call:existing-participants", handleExistingParticipants);

    return () => {
      socket.off("call:participant-joined", handleParticipantJoined);
      socket.off("call:participant-left", handleParticipantLeft);
      socket.off("call:participant-updated", handleParticipantUpdated);
      socket.off("call:kicked", handleKicked);
      socket.off("call:existing-participants", handleExistingParticipants);
    };
  }, [socket, isJoined, activeRoom]);

  // Update participants when data changes
  useEffect(() => {
    if (participantsData.length > 0) {
      setParticipants(participantsData);
    }
  }, [participantsData]);

  // Audio level detection for "speaking" indicator
  useEffect(() => {
    if (!isMicOn || !isJoined || !activeRoom) {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      return;
    }

    const detectAudioLevel = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        microphoneStreamRef.current = stream;
        
        audioContextRef.current = new AudioContext();
        analyserRef.current = audioContextRef.current.createAnalyser();
        const source = audioContextRef.current.createMediaStreamSource(stream);
        source.connect(analyserRef.current);
        
        analyserRef.current.fftSize = 256;
        const bufferLength = analyserRef.current.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);

        const checkLevel = () => {
          if (!analyserRef.current) return;
          
          analyserRef.current.getByteFrequencyData(dataArray);
          const average = dataArray.reduce((a, b) => a + b) / bufferLength;
          
          // Threshold for speaking (adjust as needed)
          const speaking = average > 20;
          
          // Update local state for animation
          setIsSpeaking(speaking);
          
          // Emit speaking status
          if (socket && activeRoom && currentUser) {
            socket.emit("call:speaking", {
              roomId: activeRoom.id,
              userId: currentUser.id,
              isSpeaking: speaking
            });
          }

          animationFrameRef.current = requestAnimationFrame(checkLevel);
        };

        checkLevel();
      } catch (error) {
        console.error("Error accessing microphone:", error);
      }
    };

    detectAudioLevel();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (microphoneStreamRef.current) {
        microphoneStreamRef.current.getTracks().forEach(track => track.stop());
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, [isMicOn, isJoined, activeRoom, socket, currentUser]);

  // Get media devices for settings
  useEffect(() => {
    if (!showSettingsDialog) return;

    const getDevices = async () => {
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        setMediaDevices(devices.map(d => ({
          deviceId: d.deviceId,
          label: d.label || (d.kind === 'audioinput' ? 'Микрофон' : d.kind === 'videoinput' ? 'Камера' : 'Динамики'),
          kind: d.kind as 'audioinput' | 'audiooutput' | 'videoinput'
        })));
      } catch (error) {
        console.error("Error getting media devices:", error);
      }
    };

    getDevices();
  }, [showSettingsDialog]);

  const handleJoin = async (room: TeamRoom) => {
    setActiveRoom(room);
    setIsJoined(true);
    setShowParticipantsPanel(true);
    
    // Check browser support
    if (!checkBrowserSupport()) {
      setIsJoined(false);
      setActiveRoom(null);
      return;
    }
    
    // Initialize mediasoup and get media stream
    await initMediasoup();
    const stream = await getMediaStream();
    
    // If no media devices, show notification but stay in room
    if (!stream) {
      toast.warning('Камера или микрофон не найдены. Вы присоединились без видео.');
    }
    
    // Join via socket
    if (socket && currentUser) {
      socket.emit("call:join", {
        roomId: room.id,
        userId: currentUser.id,
        user: currentUser
      });
      
      // Join mediasoup room
      try {
        await joinMediasoupRoom(room.id, currentUser.id);
      } catch (error: any) {
        console.error('Failed to join mediasoup room:', error);
        toast.error('Не удалось присоединиться к видеозвонку');
      }
    }
    
    notify(`Вы присоединились к залу: ${room.name}`, {
      body: `Встреча в зале ${room.name} началась`,
      icon: "/replit.svg"
    });
  };

  const handleLeave = () => {
    if (activeRoom && currentUser && socket) {
      socket.emit("call:leave", {
        roomId: activeRoom.id,
        userId: currentUser.id
      });
    }
    
    // Cleanup mediasoup resources
    if (mediasoupRef.current.localStream) {
      mediasoupRef.current.localStream.getTracks().forEach(track => track.stop());
      mediasoupRef.current.localStream = null;
    }
    
    // Cleanup screen share stream
    if (mediasoupRef.current.screenShareStream) {
      mediasoupRef.current.screenShareStream.getTracks().forEach(track => track.stop());
      mediasoupRef.current.screenShareStream = null;
    }
    
    setIsScreenSharing(false);
    
    mediasoupRef.current.sendTransport = null;
    mediasoupRef.current.recvTransports.clear();
    mediasoupRef.current.producers.clear();
    mediasoupRef.current.consumers.clear();
    
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = null;
    }
    
    videoRefs.current.forEach(ref => {
      if (ref.current) {
        ref.current.srcObject = null;
      }
    });
    
    setIsJoined(false);
    setActiveRoom(null);
    setParticipants([]);
    setShowParticipantsPanel(false);
    setIsSpeaking(false);
    setIsMicOn(true);
    setIsVideoOn(true);
    setActiveSpeaker(null);
    notify("Вы вышли из командного зала", { internalOnly: true });
  };

  const toggleMic = () => {
    const newState = !isMicOn;
    
    if (!mediasoupRef.current.localStream) {
      toast.error('Микрофон недоступен. Попробуйте перезайти в звонок.');
      return;
    }
    
    const audioTrack = mediasoupRef.current.localStream.getAudioTracks()[0];
    if (audioTrack) {
      audioTrack.enabled = newState;
      setIsMicOn(newState);
      
      if (socket && activeRoom && currentUser) {
        socket.emit("call:toggle-mic", {
          roomId: activeRoom.id,
          userId: currentUser.id,
          isOn: newState
        });
      }
    }
  };

  const toggleVideo = () => {
    const newState = !isVideoOn;
    
    const stream = mediasoupRef.current.localStream;
    const videoTrack = stream?.getVideoTracks()[0];
    
    if (videoTrack) {
      // Если есть видео трек - переключаем
      videoTrack.enabled = newState;
      setIsVideoOn(newState);
      
      if (socket && activeRoom && currentUser) {
        socket.emit("call:toggle-video", {
          roomId: activeRoom.id,
          userId: currentUser.id,
          isOn: newState
        });
      }
    } else {
      // Если нет видео - просто переключаем состояние UI
      setIsVideoOn(newState);
      toast.info(newState ? 'Включите камеру в настройках устройства' : 'Камера выключена');
    }
  };

  const switchCamera = async (deviceId: string) => {
    if (!mediasoupRef.current.localStream) {
      toast.error('Камера недоступна.');
      return;
    }
    
    try {
      // Get new video stream
      const newStream = await navigator.mediaDevices.getUserMedia({
        video: { deviceId: { exact: deviceId } },
        audio: false
      });
      
      const newVideoTrack = newStream.getVideoTracks()[0];
      
      // Stop old video track
      const oldVideoTrack = mediasoupRef.current.localStream.getVideoTracks()[0];
      if (oldVideoTrack) {
        oldVideoTrack.stop();
        mediasoupRef.current.localStream.removeTrack(oldVideoTrack);
      }
      
      // Add new track to local stream
      mediasoupRef.current.localStream.addTrack(newVideoTrack);
      
      // Update local video element
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = mediasoupRef.current.localStream;
      }
      
      // Update mediasoup producer
      const producers = Array.from(mediasoupRef.current.sendTransport?.producers || []);
      const videoProducer = producers.find((p: any) => p.kind === 'video');
      
      // Simple-peer doesn't support replaceTrack, so we need to restart the call
      // This is a simplified implementation
      if (videoProducer && (videoProducer as any).replaceTrack) {
        await (videoProducer as any).replaceTrack({ track: newVideoTrack });
      } else {
        console.warn('replaceTrack not available on producer - camera switch may require reconnection');
        // For now, just update the local stream
      }
      
      // Save preference
      localStorage.setItem('preferredCamera', deviceId);
      await apiRequest("PUT", `/api/call-settings`, { preferredCamera: deviceId });
      
      toast.success('Камера изменена');
    } catch (error: any) {
      console.error('Failed to switch camera:', error);
      toast.error('Не удалось переключить камеру');
    }
  };

  const toggleScreenShare = async () => {
    const sendTransport = mediasoupRef.current.sendTransport;
    
    if (isScreenSharing) {
      // Остановить демонстрацию экрана
      console.log('[ScreenShare] Stopping screen share');
      if (mediasoupRef.current.screenShareStream) {
        mediasoupRef.current.screenShareStream.getTracks().forEach(track => track.stop());
        mediasoupRef.current.screenShareStream = null;
      }
      
      // Вернуть показ камеры
      if (localVideoRef.current && mediasoupRef.current.localStream) {
        localVideoRef.current.srcObject = mediasoupRef.current.localStream;
      }
      
      setIsScreenSharing(false);
      toast.info('Демонстрация экрана остановлена');
    } else {
      // Начать демонстрацию экрана
      try {
        console.log('[ScreenShare] Starting screen share...');
        const screenStream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
          audio: false
        } as any);
        
        console.log('[ScreenShare] Got screen stream, tracks:', screenStream.getVideoTracks().length);
        mediasoupRef.current.screenShareStream = screenStream;
        setIsScreenSharing(true);
        toast.success('Демонстрация экрана началась');
        
        // Показать экран в local video
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = screenStream;
        }
        
        // Отправить screen track в Mediasoup
        const screenTrack = screenStream.getVideoTracks()[0];
        console.log('[ScreenShare] Screen track:', screenTrack);
        
        if (sendTransport) {
          console.log('[ScreenShare] Producing screen track...');
          sendTransport.produce({ track: screenTrack, kind: 'video' })
            .then(() => console.log('[ScreenShare] Screen track produced'))
            .catch((e: Error) => console.error('[ScreenShare] Produce error:', e));
        } else {
          console.warn('[ScreenShare] No send transport!');
        }
        
        // При закрытии окна демонстрации - остановить
        screenTrack.onended = () => {
          console.log('[ScreenShare] Screen share ended by user');
          toggleScreenShare();
        };
      } catch (error: any) {
        console.error('[ScreenShare] Error:', error);
        if (error.name !== 'AbortError') {
          toast.error('Не удалось начать демонстрацию экрана');
        }
      }
    }
  };

  const getFullInviteLink = (room: TeamRoom) => {
    return `https://m4portal.ru/room/${room.slug}-${room.inviteCode}`;
  };

  const isCreator = activeRoom?.createdBy === currentUser?.id;
  const isAdmin = participants.find(p => p.userId === currentUser?.id && (isCreator || false)); // TODO: check admin status

  if (roomsLoading) {
    return (
      <div className="p-6 space-y-6 h-full flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 animate-in fade-in duration-500 h-full relative">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Командные залы</h2>
          <p className="text-muted-foreground mt-1 text-sm">
            Постоянные виртуальные комнаты отделов для мгновенных встреч.
          </p>
        </div>
        <div className="flex items-center bg-secondary/30 p-1 rounded-lg border border-border/50">
          <Button 
            variant="ghost" 
            size="icon" 
            className={`h-8 w-8 rounded-md transition-all ${viewMode === "grid" ? "bg-background shadow-sm text-primary" : "text-muted-foreground"}`}
            onClick={() => setViewMode("grid")}
          >
            <LayoutGrid className="w-4 h-4" />
          </Button>
          <Button 
            variant="ghost" 
            size="icon" 
            className={`h-8 w-8 rounded-md transition-all ${viewMode === "list" ? "bg-background shadow-sm text-primary" : "text-muted-foreground"}`}
            onClick={() => setViewMode("list")}
          >
            <List className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {rooms.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
          <Video className="w-12 h-12 mb-4 opacity-30" />
          <p className="text-lg font-medium">Нет доступных залов</p>
          <p className="text-sm">Залы создаются в разделе "Управление → Звонки"</p>
        </div>
      ) : (
        <div className={viewMode === "grid" 
          ? "grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 pb-20" 
          : "flex flex-col gap-3 pb-20"
        }>
          {rooms.map((room) => (
            viewMode === "grid" ? (
              <Card key={room.id} className="border-border/50 bg-card/50 backdrop-blur-sm hover:shadow-md transition-all group overflow-hidden">
                <CardHeader className="pb-3 relative">
                  <div 
                    className="absolute top-0 left-0 w-1 h-full" 
                    style={{ backgroundColor: room.color }}
                  />
                  <div className="flex justify-between items-start">
                    <div className="space-y-1">
                      <CardTitle className="text-lg flex items-center gap-2">
                        {room.name}
                        {room.accessType === "closed" && (
                          <Lock className="w-3.5 h-3.5 text-muted-foreground" />
                        )}
                      </CardTitle>
                      <CardDescription className="line-clamp-2 text-xs">
                        {room.description || "Нет описания"}
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <div className="flex items-center gap-1.5 font-medium">
                      <Users className="w-3.5 h-3.5" />
                      1 участник
                    </div>
                    <div className="flex items-center gap-1.5 font-medium">
                      <Clock className="w-3.5 h-3.5" />
                      Доступен 24/7
                    </div>
                  </div>

                  <Button 
                    className="w-full gap-2"
                    onClick={() => handleJoin(room)}
                  >
                    <Video className="w-4 h-4" />
                    Присоединиться
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div 
                key={room.id}
                className="flex items-center gap-4 p-4 rounded-lg border border-border/50 bg-card/50 hover:bg-accent/50 transition-colors"
              >
                <div 
                  className="w-3 h-3 rounded-full flex-shrink-0"
                  style={{ backgroundColor: room.color }}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h4 className="font-medium truncate">{room.name}</h4>
                    {room.accessType === "closed" && (
                      <Lock className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground truncate">
                    {room.description || "Нет описания"}
                  </p>
                </div>
                <div className="flex items-center gap-3 text-xs text-muted-foreground flex-shrink-0">
                  <div className="flex items-center gap-1">
                    <Users className="w-3.5 h-3.5" />
                    1
                  </div>
                  <Button 
                    size="sm"
                    onClick={() => handleJoin(room)}
                  >
                    <Video className="w-4 h-4 mr-1" />
                    Войти
                  </Button>
                </div>
              </div>
            )
          ))}
        </div>
      )}

      {/* Active Call Overlay */}
      {isJoined && activeRoom && (
        <Dialog open={isJoined} onOpenChange={(open) => !open && handleLeave()}>
          <DialogContent 
            className="max-w-6xl h-[85vh] p-0 overflow-hidden" 
            aria-describedby="video-call-description"
          >
            <DialogHeader className="sr-only">
              <DialogTitle>Видеозвонок: {activeRoom.name}</DialogTitle>
              <p id="video-call-description">Видеозвонок в командном зале {activeRoom.name}</p>
            </DialogHeader>
            
            <div className="flex h-full">
              {/* Main Content */}
              <div className="flex-1 flex flex-col bg-slate-900 text-white">
                {/* Header */}
                <div className="h-14 px-4 flex items-center justify-between border-b border-slate-700 bg-slate-800/50">
                  <div className="flex items-center gap-3">
                    <div 
                      className="w-9 h-9 rounded-lg flex items-center justify-center"
                      style={{ backgroundColor: activeRoom.color }}
                    >
                      <Video className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-sm">{activeRoom.name}</h3>
                      <p className="text-xs text-slate-400">
                        {participants.length + 1} участников
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="text-white hover:text-white hover:bg-white/10 h-9 w-9"
                      onClick={() => setShowParticipantsPanel(!showParticipantsPanel)}
                    >
                      <Users className="w-5 h-5" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="text-white hover:text-white hover:bg-white/10 h-9 w-9"
                      onClick={() => setShowSettingsDialog(true)}
                    >
                      <Settings2 className="w-5 h-5" />
                    </Button>
                  </div>
                </div>

                {/* Main Video Area */}
                <div className="flex-1 flex items-center justify-center bg-slate-950 relative">
                  {/* Active speaker or room placeholder */}
                  {activeSpeaker ? (
                    <video 
                      ref={activeSpeakerVideoRef}
                      autoPlay 
                      playsInline
                      className="w-full h-full object-contain"
                    />
                  ) : (
                    <div className="text-center space-y-4">
                      <div 
                        className="w-24 h-24 rounded-full flex items-center justify-center mx-auto"
                        style={{ backgroundColor: activeRoom.color }}
                      >
                        <Video className="w-10 h-10 text-white" />
                      </div>
                      <div>
                        <p className="text-lg font-medium">{activeRoom.name}</p>
                        <p className="text-sm text-slate-400">Ожидание участников...</p>
                      </div>
                    </div>
                  )}

                  {/* Self View */}
                  <div className="absolute bottom-4 right-4 w-48 h-36 bg-slate-800 rounded-lg border border-slate-700 flex items-center justify-center overflow-hidden">
                    {(isVideoOn || isScreenSharing) ? (
                      <video 
                        ref={localVideoRef}
                        autoPlay 
                        muted 
                        playsInline
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="text-center text-slate-500">
                        <VideoOff className="w-8 h-8 mx-auto mb-2" />
                        <p className="text-xs">Камера выключена</p>
                      </div>
                    )}
                    {/* Name tag */}
                    <div className="absolute bottom-1 left-1 px-1.5 py-0.5 bg-black/50 rounded text-white text-xs">
                      Вы
                    </div>
                  </div>
                </div>

                {/* Controls */}
                <div className="h-20 px-4 border-t border-slate-700 bg-slate-800/50 flex items-center justify-center gap-4">
                  <Button
                    variant={isMicOn ? "outline" : "destructive"}
                    size="icon"
                    className={cn(
                      "h-12 w-12 rounded-full text-black dark:text-white border-slate-600 relative overflow-hidden transition-all duration-200",
                      isMicOn && isSpeaking && "ring-2 ring-green-400 ring-offset-2 ring-offset-slate-800 animate-pulse"
                    )}
                    onClick={toggleMic}
                  >
                    {isMicOn ? (
                      <Mic className={cn(
                        "w-5 h-5 transition-transform duration-200",
                        isSpeaking && "scale-110"
                      )} />
                    ) : (
                      <MicOff className="w-5 h-5" />
                    )}
                    {isMicOn && isSpeaking && (
                      <span className="absolute inset-0 rounded-full bg-green-400/20 animate-ping" />
                    )}
                  </Button>

                  <Button
                    variant={isVideoOn ? "outline" : "destructive"}
                    size="icon"
                    className="h-12 w-12 rounded-full text-black dark:text-white border-slate-600"
                    onClick={toggleVideo}
                  >
                    {isVideoOn ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
                  </Button>

                  <Button
                    variant={isScreenSharing ? "default" : "outline"}
                    size="icon"
                    className={isScreenSharing ? "h-12 w-12 rounded-full bg-green-600 hover:bg-green-700" : "h-12 w-12 rounded-full text-black dark:text-white border-slate-600"}
                    onClick={toggleScreenShare}
                  >
                    {isScreenSharing ? <MonitorOff className="w-5 h-5" /> : <Monitor className="w-5 h-5" />}
                  </Button>

                  <Button
                    variant="destructive"
                    size="icon"
                    className="h-12 w-12 rounded-full"
                    onClick={handleLeave}
                  >
                    <PhoneOff className="w-5 h-5" />
                  </Button>

                  <Button
                    variant="outline"
                    size="icon"
                    className="h-12 w-12 rounded-full text-black dark:text-white border-slate-600"
                    onClick={() => {
                      navigator.clipboard.writeText(getFullInviteLink(activeRoom));
                      toast.success("Ссылка скопирована");
                    }}
                  >
                    <Share2 className="w-5 h-5" />
                  </Button>
                </div>
              </div>

              {/* Participants Panel */}
              {showParticipantsPanel && (
                <div className="w-72 bg-slate-800 border-l border-slate-700 flex flex-col">
                  <div className="h-14 px-4 flex items-center justify-between border-b border-slate-700">
                    <h3 className="font-semibold text-sm text-white">
                      Участники ({participants.length + 1})
                    </h3>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8 text-slate-400 hover:text-white"
                      onClick={() => setShowParticipantsPanel(false)}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                  
                  <ScrollArea className="flex-1 p-2">
                    {/* Current User */}
                    <div 
                      className={cn(
                        "flex items-center gap-3 p-2 rounded-lg hover:bg-slate-700/50 transition-all duration-300",
                        isSpeaking && "bg-green-500/20 ring-2 ring-green-400 shadow-[0_0_15px_rgba(74,222,128,0.3)]"
                      )}
                    >
                      <div className="relative">
                        <Avatar className={cn(
                          "w-9 h-9 transition-transform duration-300",
                          isSpeaking && "scale-110"
                        )}>
                          <AvatarImage src={currentUser?.avatar || undefined} />
                          <AvatarFallback className={cn(
                            "text-white text-xs transition-colors duration-300",
                            isSpeaking ? "bg-green-500" : "bg-primary"
                          )}>
                            {currentUser?.firstName?.[0]}{currentUser?.lastName?.[0]}
                          </AvatarFallback>
                        </Avatar>
                        {isMicOn && (
                          <div className={cn(
                            "absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-slate-800 transition-all duration-300",
                            isSpeaking ? "bg-green-400 animate-pulse scale-125" : "bg-green-500"
                          )} />
                        )}
                        {isSpeaking && (
                          <div className="absolute inset-0 rounded-full bg-green-400/30 animate-ping" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-white truncate">
                          {currentUser?.firstName} {currentUser?.lastName} (Вы)
                        </p>
                        <p className={cn(
                          "text-xs transition-colors duration-300",
                          isSpeaking ? "text-green-400 font-medium" : "text-slate-400"
                        )}>
                          {isSpeaking ? 'Говорите...' : isMicOn ? 'Микрофон включен' : 'Микрофон выключен'}
                        </p>
                      </div>
                      <div className="flex items-center gap-1">
                        {!isMicOn && <MicOff className="w-4 h-4 text-slate-500" />}
                        {!isVideoOn && <VideoOff className="w-4 h-4 text-slate-500" />}
                        {isSpeaking && (
                          <div className="flex gap-0.5">
                            <span className="w-1 h-4 bg-green-400 rounded-full animate-[bounce_1s_infinite_0ms]" />
                            <span className="w-1 h-4 bg-green-400 rounded-full animate-[bounce_1s_infinite_150ms]" />
                            <span className="w-1 h-4 bg-green-400 rounded-full animate-[bounce_1s_infinite_300ms]" />
                          </div>
                        )}
                      </div>
                    </div>

                    <Separator className="my-2 bg-slate-700" />

                    {/* Other Participants */}
                    {participants
                      .filter((participant) => participant.userId !== currentUser?.id)
                      .map((participant) => (
                      <div 
                        key={participant.id} 
                        className={cn(
                          "flex items-center gap-3 p-2 rounded-lg hover:bg-slate-700/50 transition-all duration-300",
                          participant.isSpeaking && "bg-green-500/20 ring-2 ring-green-400 shadow-[0_0_15px_rgba(74,222,128,0.3)]"
                        )}
                      >
                        <div className="relative">
                          <Avatar className={cn(
                            "w-9 h-9 transition-transform duration-300",
                            participant.isSpeaking && "scale-110"
                          )}>
                            <AvatarImage src={participant.user?.avatar || undefined} />
                            <AvatarFallback className={cn(
                              "text-white text-xs transition-colors duration-300",
                              participant.isSpeaking ? "bg-green-500" : "bg-slate-600"
                            )}>
                              {participant.user?.firstName?.[0]}{participant.user?.lastName?.[0]}
                            </AvatarFallback>
                          </Avatar>
                          {participant.isSpeaking && (
                            <>
                              <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-400 rounded-full border-2 border-slate-800 animate-pulse scale-125" />
                              <div className="absolute inset-0 rounded-full bg-green-400/30 animate-ping" />
                            </>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-white truncate">
                            {participant.user?.firstName} {participant.user?.lastName}
                          </p>
                          <p className={cn(
                            "text-xs transition-colors duration-300",
                            participant.isSpeaking ? "text-green-400 font-medium" : "text-slate-400"
                          )}>
                            {participant.isSpeaking ? 'Говорит...' : participant.isMicOn ? 'В сети' : 'Микрофон выключен'}
                          </p>
                        </div>
                        <div className="flex items-center gap-1">
                          {!participant.isMicOn && <MicOff className="w-4 h-4 text-slate-500" />}
                          {!participant.isVideoOn && <VideoOff className="w-4 h-4 text-slate-500" />}
                          
                          {/* Speaking indicator bars */}
                          {participant.isSpeaking && (
                            <div className="flex gap-0.5">
                              <span className="w-1 h-4 bg-green-400 rounded-full animate-[bounce_1s_infinite_0ms]" />
                              <span className="w-1 h-4 bg-green-400 rounded-full animate-[bounce_1s_infinite_150ms]" />
                              <span className="w-1 h-4 bg-green-400 rounded-full animate-[bounce_1s_infinite_300ms]" />
                            </div>
                          )}
                          
                          {/* Admin controls */}
                          {(isCreator || isAdmin) && participant.userId !== activeRoom?.createdBy && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-slate-400 hover:text-red-400"
                              onClick={() => kickParticipantMutation.mutate(participant.userId)}
                              disabled={kickParticipantMutation.isPending}
                            >
                              <UserX className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}

                    {participants.length === 0 && (
                      <div className="text-center py-8 text-slate-500">
                        <Users className="w-8 h-8 mx-auto mb-2 opacity-50" />
                        <p className="text-xs">Нет других участников</p>
                      </div>
                    )}
                  </ScrollArea>

                  {/* Invite Button */}
                  <div className="p-3 border-t border-slate-700">
                    <Button
                      variant="outline"
                      className="w-full text-black dark:text-white border-slate-600"
                      onClick={() => {
                        navigator.clipboard.writeText(getFullInviteLink(activeRoom));
                        toast.success("Ссылка приглашения скопирована");
                      }}
                    >
                      <Share2 className="w-4 h-4 mr-2" />
                      Пригласить
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Settings Dialog */}
      <Dialog open={showSettingsDialog} onOpenChange={setShowSettingsDialog}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>Настройки звонка</DialogTitle>
            <DialogDescription>
              Настройте устройства и параметры звонка
            </DialogDescription>
          </DialogHeader>
          
          <Tabs defaultValue="devices" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="devices">Устройства</TabsTrigger>
              <TabsTrigger value="video">Видео и звук</TabsTrigger>
            </TabsList>
            
            <TabsContent value="devices" className="space-y-4 mt-4">
              {/* Microphone */}
              <div className="space-y-2">
                <Label>Микрофон</Label>
                <Select
                  value={callSettings?.preferredMic || 'default'}
                  onValueChange={(value) => {
                    updateSettingsMutation.mutate({ preferredMic: value });
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Выберите микрофон" />
                  </SelectTrigger>
                  <SelectContent>
                    {mediaDevices
                      .filter(d => d.kind === 'audioinput')
                      .map(device => (
                        <SelectItem key={device.deviceId} value={device.deviceId}>
                          {device.label}
                        </SelectItem>
                      ))}
                    {mediaDevices.filter(d => d.kind === 'audioinput').length === 0 && (
                      <SelectItem value="default">Микрофон по умолчанию</SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>

              {/* Camera */}
              <div className="space-y-2">
                <Label>Камера</Label>
                <Select
                  value={callSettings?.preferredCamera || 'default'}
                  onValueChange={async (value) => {
                    updateSettingsMutation.mutate({ preferredCamera: value });
                    if (value !== 'default' && isVideoOn) {
                      await switchCamera(value);
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Выберите камеру" />
                  </SelectTrigger>
                  <SelectContent>
                    {mediaDevices
                      .filter(d => d.kind === 'videoinput')
                      .map(device => (
                        <SelectItem key={device.deviceId} value={device.deviceId}>
                          {device.label}
                        </SelectItem>
                      ))}
                    {mediaDevices.filter(d => d.kind === 'videoinput').length === 0 && (
                      <SelectItem value="default">Камера по умолчанию</SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>

              {/* Speaker */}
              <div className="space-y-2">
                <Label>Динамики</Label>
                <Select
                  value={callSettings?.preferredSpeaker || 'default'}
                  onValueChange={(value) => {
                    updateSettingsMutation.mutate({ preferredSpeaker: value });
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Выберите динамики" />
                  </SelectTrigger>
                  <SelectContent>
                    {mediaDevices
                      .filter(d => d.kind === 'audiooutput')
                      .map(device => (
                        <SelectItem key={device.deviceId} value={device.deviceId}>
                          {device.label}
                        </SelectItem>
                      ))}
                    {mediaDevices.filter(d => d.kind === 'audiooutput').length === 0 && (
                      <SelectItem value="default">Динамики по умолчанию</SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>

              {/* Volume Sliders */}
              <div className="space-y-4 pt-2">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <Label className="text-sm">Громкость микрофона</Label>
                    <span className="text-sm text-muted-foreground">{callSettings?.micVolume || 100}%</span>
                  </div>
                  <Slider
                    value={[callSettings?.micVolume || 100]}
                    onValueChange={([value]) => {
                      updateSettingsMutation.mutate({ micVolume: value });
                    }}
                    max={100}
                    step={5}
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between">
                    <Label className="text-sm">Громкость динамиков</Label>
                    <span className="text-sm text-muted-foreground">{callSettings?.speakerVolume || 100}%</span>
                  </div>
                  <Slider
                    value={[callSettings?.speakerVolume || 100]}
                    onValueChange={([value]) => {
                      updateSettingsMutation.mutate({ speakerVolume: value });
                    }}
                    max={100}
                    step={5}
                  />
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="video" className="space-y-4 mt-4">
              {/* Video Quality */}
              <div className="space-y-2">
                <Label>Качество видео</Label>
                <Select
                  value={callSettings?.videoQuality || 'medium'}
                  onValueChange={(value: 'low' | 'medium' | 'high') => {
                    updateSettingsMutation.mutate({ videoQuality: value });
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Выберите качество" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Низкое (360p)</SelectItem>
                    <SelectItem value="medium">Среднее (720p)</SelectItem>
                    <SelectItem value="high">Высокое (1080p)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Noise Suppression */}
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Шумоподавление</Label>
                  <p className="text-xs text-muted-foreground">
                    Автоматически удаляет фоновый шум
                  </p>
                </div>
                <Switch
                  checked={callSettings?.noiseSuppression ?? true}
                  onCheckedChange={(checked) => {
                    updateSettingsMutation.mutate({ noiseSuppression: checked });
                  }}
                />
              </div>
            </TabsContent>
          </Tabs>

          <DialogFooter>
            <Button onClick={() => setShowSettingsDialog(false)}>
              Готово
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Guest Invite Dialog */}
      <Dialog open={showGuestInviteDialog} onOpenChange={setShowGuestInviteDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <UserPlus className="h-6 w-6 text-primary" />
              </div>
              <div>
                <DialogTitle>Guest Invitation</DialogTitle>
                <DialogDescription>
                  You've been invited to join a team room
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          
          <div className="py-4">
            <div className="bg-muted/50 rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Room:</span>
                <span className="font-medium">{guestInvitation?.roomName}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Access:</span>
                <Badge variant="secondary">Guest (View only)</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Duration:</span>
                <span className="text-sm">Until you leave</span>
              </div>
            </div>
            
            <p className="text-sm text-muted-foreground mt-4">
              As a guest, you can view the room and its participants, but you cannot post messages or control shared content.
            </p>
          </div>
          
          <DialogFooter className="gap-2 sm:gap-0">
            <Button 
              variant="outline" 
              onClick={() => {
                setShowGuestInviteDialog(false);
                const url = new URL(window.location.href);
                url.searchParams.delete('invite');
                window.history.replaceState({}, '', url);
              }}
            >
              Decline
            </Button>
            <Button 
              onClick={acceptGuestInvitation}
              disabled={isAcceptingInvite}
            >
              {isAcceptingInvite ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Accepting...
                </>
              ) : (
                <>
                  <UserPlus className="mr-2 h-4 w-4" />
                  Accept Invitation
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Guest Banner */}
      {guestSession && !showGuestInviteDialog && (
        <div className="fixed bottom-4 right-4 z-50 bg-card border shadow-lg rounded-lg p-3 flex items-center gap-3 max-w-sm">
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="bg-primary/10 text-primary">
              Guest
            </Badge>
            <span className="text-sm font-medium">Viewing as guest</span>
          </div>
          <Button 
            variant="ghost" 
            size="sm"
            onClick={leaveGuestSession}
            className="text-muted-foreground hover:text-destructive"
          >
            Leave
          </Button>
        </div>
      )}
    </div>
  );
}
