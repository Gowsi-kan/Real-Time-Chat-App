/* eslint-disable @typescript-eslint/no-unused-vars */
"use client";

import { client } from "@/lib/client";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useUsername } from "@/hooks/use-username";
import { format } from "date-fns";
import { useRealtime } from "@/lib/realtime-client";

function formatTimeRemaining(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
}

const Page = () => {
  const params = useParams();
  const roomId = params.roomId as string;
  const router = useRouter();

  const { username } = useUsername();

  const [copyStatus, setCopyStatus] = useState("COPY");
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const [message, setMessage] = useState("");
  const messageRef = useRef<HTMLInputElement>(null);

  const { data: ttlData } = useQuery({
    queryKey: ["ttl", roomId],
    queryFn: async () => {
      const response = await client.room.ttl.get({
        query: {
          roomId,
        },
      });

      return response.data;
    },
  });

  useEffect(() => {
    const main = () => {
      if (ttlData?.ttl !== undefined) {
        setTimeRemaining(ttlData.ttl);
      }
    };

    main();
  }, [ttlData?.ttl]);

  useEffect(() => {
    if (timeRemaining === null || timeRemaining < 0) return;

    if (timeRemaining === 0) {
      router.push("/?destroyed=true");
      return;
    }

    const interval = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev === null || prev <= 1) {
          clearInterval(interval);
          return 0;
        }

        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [timeRemaining, router]);

  const { data: messages, refetch } = useQuery({
    queryKey: ["messages", roomId],
    queryFn: async () => {
      const response = await client.messages.get({
        query: {
          roomId,
        },
      });

      return response.data;
    },
  });

  const { mutate: sendMessage, isPending } = useMutation({
    mutationFn: async ({ text }: { text: string }) => {
      await client.messages.post(
        {
          sender: username,
          text,
        },
        {
          query: {
            roomId,
          },
        }
      );
    },
  });

  const { mutate: destroyRoom } = useMutation({
    mutationFn: async () => {
      await client.room.delete(null, {
        query: {
          roomId,
        },
      });
    },
  });

  useRealtime({
    channels: [roomId],
    events: ["chat.message", "chat.destroy"],
    onData: (event) => {
      if (event.event === "chat.message") {
        refetch();
      }

      if (event.event === "chat.destroy") {
        router.push("/?destroyed=true");
      }
    },
  });

  const copyLink = () => {
    const url = window.location.href;
    navigator.clipboard.writeText(url);
    setCopyStatus("COPIED");
    setTimeout(() => {
      setCopyStatus("COPY");
    }, 2000);
  };

  return (
    <>
      <main className="flex flex-col h-screen max-h-screen overflow-hidden">
        <header className="border-b border-zinc-800 p-4 flex items-center justify-between bg-zinc-900/50">
          <div className="flex items-center gap-4">
            <div className="flex flex-col">
              <span className="text-x text-zinc-500 uppercase">Room ID</span>
              <div className="flex items-center gap-2">
                <span className="font-bold text-green-500">{roomId}</span>
                <button
                  className="text-zinc-400 text-[10px] bg-zinc-800 hover:bg-zinc-800 hover:text-zinc-200 transition-colors px-2 py-0.5 rounded"
                  onClick={copyLink}
                >
                  {copyStatus}
                </button>
              </div>
            </div>

            <div className="h-8 w-px bg-zinc-800" />

            <div className="flex flex-col">
              <span className="text-xs text-zinc-500 uppercase">
                Self-Destruct
              </span>
              <span
                className={`text-sm font-bold flex items-center gap-2 ${
                  timeRemaining !== null && timeRemaining < 60
                    ? "text-red-500"
                    : "text-amber-500"
                }`}
              >
                {timeRemaining !== null
                  ? formatTimeRemaining(timeRemaining)
                  : "--:--"}
              </span>
            </div>
          </div>

          <button
            onClick={() => destroyRoom()}
            className="text-xs bg-zinc-800 hover:bg-red-600 px-3 py-1.5 rounded text-zinc-400 hover:text-white font-bold transition-all group  flex items-center gap-2 disabled:opacity-50"
          >
            <span className="group-hover:animate-pulse">
              {/* bomb emoji */}
              💣
            </span>
            DESTROW NOW
          </button>
        </header>

        {/* MESSAGE */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin">
          {messages?.messages.length === 0 && (
            <div className="flex items-center justify-center h-full">
              <p className="text-zinc-600 text-sm font-mono">
                No messages yet, start the converation.
              </p>
            </div>
          )}
          {messages?.messages.map((message) => (
            <div key={message.id} className="flex flex-col items-start">
              <div className="max-w-[80%] group">
                <div className="flex items-baseline gap-3 mb-1">
                  <span
                    className={`text-xs font-bold ${
                      message.sender === username
                        ? "text-green-500"
                        : "text-blue-500"
                    }`}
                  >
                    {message.sender === username ? "YOU" : message.sender}
                  </span>

                  <span className="text-[10px] text-zinc-600">
                    {format(message.timestamp, "HH:mm:ss a")}
                  </span>
                </div>

                <p className="text-sm text-zinc-300 leading-relaxed break-all">
                  {message.text}
                </p>
              </div>
            </div>
          ))}
        </div>

        <div className="p-4 border-t border-zinc-800 bg-zinc-900/50">
          <div className="flex gap-4">
            <div className="flex-1 relative group">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-green-500 animate-pulse">
                {">"}
              </span>
              <input
                autoFocus
                type="text"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && message.trim() !== "") {
                    sendMessage({ text: message });
                    messageRef.current?.focus();
                    setMessage("");
                  }
                }}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Type your message here..."
                className="w-full bg-black border border-zinc-800 focus:border-zinc-700 focus:outline-none transition-colors text-zinc-100 placeholder:text-zinc-700 py-3 pl-8 pr-4 text-sm"
              />
            </div>

            <button
              onClick={() => {
                sendMessage({ text: message });
                messageRef.current?.focus();
                setMessage("");
              }}
              disabled={!message.trim() || isPending}
              className="text-sm bg-zinc-800 px-6 py-1.5 text-zinc-400 hover:text-zinc-200 font-bold transition-all group  flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              SEND
            </button>
          </div>
        </div>
      </main>
    </>
  );
};

export default Page;
