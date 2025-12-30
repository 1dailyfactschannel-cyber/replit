import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  Phone,
  Monitor,
  MoreVertical,
  MessageSquare,
} from "lucide-react";

interface CallInterfaceProps {
  contactName: string;
  contactImage?: string;
  isVideo?: boolean;
  onEndCall?: () => void;
}

export function CallInterface({
  contactName,
  contactImage,
  isVideo = true,
  onEndCall,
}: CallInterfaceProps) {
  const [isMicMuted, setIsMicMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [duration, setDuration] = useState("00:45");

  return (
    <div className="h-full w-full bg-black rounded-xl overflow-hidden flex flex-col relative">
      {/* Video/Screen Share Area */}
      <div className="flex-1 bg-gradient-to-b from-slate-900 to-black flex items-center justify-center relative overflow-hidden">
        {/* Remote Video/Screen */}
        <div className="w-full h-full bg-black flex items-center justify-center relative">
          {isScreenSharing ? (
            <div className="w-full h-full bg-slate-800 flex flex-col items-center justify-center">
              <Monitor className="w-20 h-20 text-slate-500 mb-4" />
              <p className="text-slate-400 font-medium">Демонстрация экрана {contactName}</p>
            </div>
          ) : isVideo ? (
            <div className="w-full h-full bg-slate-800 flex flex-col items-center justify-center">
              <div className="w-24 h-24 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center mb-6 shadow-lg">
                <span className="text-2xl text-white font-bold">
                  {contactName.substring(0, 1)}
                </span>
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">{contactName}</h2>
              <p className="text-slate-400">Видео звонок</p>
            </div>
          ) : (
            <div className="flex flex-col items-center">
              <div className="w-32 h-32 rounded-full bg-gradient-to-br from-orange-500 to-pink-500 flex items-center justify-center mb-8 shadow-lg animate-pulse">
                <span className="text-4xl text-white font-bold">
                  {contactName.substring(0, 1)}
                </span>
              </div>
              <h2 className="text-3xl font-bold text-white mb-2">{contactName}</h2>
              <p className="text-slate-400">Аудио звонок</p>
            </div>
          )}

          {/* Duration */}
          <div className="absolute top-6 left-6 bg-black/60 backdrop-blur-sm px-4 py-2 rounded-full">
            <p className="text-white font-mono font-semibold">{duration}</p>
          </div>

          {/* Local Video Preview */}
          {isVideo && !isVideoOff && (
            <div className="absolute bottom-6 right-6 w-32 h-24 bg-slate-700 rounded-lg border-2 border-slate-600 overflow-hidden shadow-lg">
              <div className="w-full h-full bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center">
                <Mic className="w-8 h-8 text-white" />
              </div>
              <div className="absolute bottom-2 right-2 text-[10px] text-white bg-black/70 px-2 py-1 rounded">
                Вы
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Controls Bar */}
      <div className="bg-gradient-to-t from-black to-black/80 backdrop-blur-md px-6 py-6 border-t border-slate-700">
        <div className="flex items-center justify-between max-w-md mx-auto w-full">
          {/* Mic Control */}
          <Button
            size="lg"
            className={`rounded-full w-14 h-14 ${
              isMicMuted
                ? "bg-rose-500 hover:bg-rose-600"
                : "bg-slate-700 hover:bg-slate-600"
            }`}
            onClick={() => setIsMicMuted(!isMicMuted)}
            data-testid="button-toggle-mic"
          >
            {isMicMuted ? (
              <MicOff className="w-6 h-6" />
            ) : (
              <Mic className="w-6 h-6" />
            )}
          </Button>

          {/* Video Control */}
          {isVideo && (
            <Button
              size="lg"
              className={`rounded-full w-14 h-14 ${
                isVideoOff
                  ? "bg-rose-500 hover:bg-rose-600"
                  : "bg-slate-700 hover:bg-slate-600"
              }`}
              onClick={() => setIsVideoOff(!isVideoOff)}
              data-testid="button-toggle-video"
            >
              {isVideoOff ? (
                <VideoOff className="w-6 h-6" />
              ) : (
                <Video className="w-6 h-6" />
              )}
            </Button>
          )}

          {/* Screen Share */}
          <Button
            size="lg"
            className={`rounded-full w-14 h-14 ${
              isScreenSharing
                ? "bg-blue-600 hover:bg-blue-700"
                : "bg-slate-700 hover:bg-slate-600"
            }`}
            onClick={() => setIsScreenSharing(!isScreenSharing)}
            data-testid="button-toggle-screen-share"
          >
            <Monitor className="w-6 h-6" />
          </Button>

          {/* End Call */}
          <Button
            size="lg"
            className="rounded-full w-14 h-14 bg-rose-600 hover:bg-rose-700"
            onClick={onEndCall}
            data-testid="button-end-call"
          >
            <Phone className="w-6 h-6 rotate-45" />
          </Button>
        </div>

        {/* Status Text */}
        <div className="flex gap-3 mt-6 justify-center text-sm text-slate-400">
          {isMicMuted && (
            <div className="flex items-center gap-1 bg-slate-900/50 px-3 py-1.5 rounded-full">
              <MicOff className="w-3.5 h-3.5" />
              <span>Микрофон отключен</span>
            </div>
          )}
          {isVideoOff && isVideo && (
            <div className="flex items-center gap-1 bg-slate-900/50 px-3 py-1.5 rounded-full">
              <VideoOff className="w-3.5 h-3.5" />
              <span>Камера отключена</span>
            </div>
          )}
          {isScreenSharing && (
            <div className="flex items-center gap-1 bg-blue-900/50 px-3 py-1.5 rounded-full text-blue-300">
              <Monitor className="w-3.5 h-3.5" />
              <span>Демонстрация экрана</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
