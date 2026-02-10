import { useState } from "react";
import { CallInterface } from "@/components/call/CallInterface";
import { useLocation } from "wouter";

export default function Call() {
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4">
      <div className="w-full max-w-6xl h-[600px]">
        <CallInterface
          contactName="Юлия Дарицкая"
          contactImage="https://github.com/shadcn.png"
          isVideo={true}
          onEndCall={() => {
            setLocation("/chat");
          }}
        />
      </div>
    </div>
  );
}
