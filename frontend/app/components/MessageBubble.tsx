import Image from "next/image";
import { User } from "lucide-react";
import clsx from "clsx";
import { UserAvatar } from "./UserAvatar";

interface MessageBubbleProps {
    role: "user" | "assistant";
    content: string;
    userName?: string;
}

export function MessageBubble({ role, content, userName }: MessageBubbleProps) {
    const isUser = role === "user";

    // Very small markdown-to-plain-text normalizer so headings / bold / lists
    // don't show raw markdown characters in the chat UI.
    const normalizedContent = content
        // Remove leading markdown heading hashes
        .replace(/^#{1,6}\s*/gm, "")
        // Turn bold / strong into plain text
        .replace(/\*\*(.*?)\*\*/g, "$1")
        // Simple bullets / numbered lists → "• "
        .replace(/^\s*[-*]\s*/gm, "• ")
        .replace(/^\s*\d+\.\s*/gm, "• ")
        // Inline code backticks → plain text
        .replace(/`([^`]*)`/g, "$1");

    return (
        <div
            className={clsx(
                "flex w-full px-4 md:px-6 py-4 animate-fadeIn transition-all duration-300",
                isUser ? "justify-end" : "justify-start"
            )}
        >
            <div className={clsx("flex items-start gap-3 md:gap-4 max-w-[85%]", isUser && "flex-row-reverse")}>
                {/* Avatar */}
                <div className="flex shrink-0 flex-col relative items-end">
                    <div
                        className={clsx(
                            "flex h-8 w-8 items-center justify-center rounded-sm overflow-hidden shadow-sm",
                            isUser ? "bg-transparent" : "bg-transparent"
                        )}
                    >
                        {isUser ? (
                            userName ? (
                                <UserAvatar name={userName} size="md" />
                            ) : (
                                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 text-white shadow-md">
                                    <User className="h-5 w-5" />
                                </div>
                            )
                        ) : (
                            <Image
                                src="/alien.png"
                                alt="HetGPT"
                                width={32}
                                height={32}
                                className="object-contain"
                            />
                        )}
                    </div>
                </div>

                {/* Content */}
                <div className={clsx(
                    "relative group",
                    isUser ? "flex justify-end" : "flex"
                )}>
                    <div className={clsx(
                        "inline-flex break-words leading-7 relative z-10 text-sm md:text-[15px]",
                        isUser
                            ? "bg-violet-500 text-white rounded-2xl rounded-tr-sm px-3 md:px-4 py-2 shadow-lg shadow-violet-500/15"
                            : "bg-slate-900/80 backdrop-blur-xl text-slate-100 rounded-2xl rounded-tl-sm px-3 md:px-4 py-2.5 border border-white/10 shadow-[0_16px_36px_rgba(0,0,0,0.9)]"
                    )}>
                        <p className={clsx(
                            "whitespace-pre-wrap m-0 text-left",
                            isUser ? "text-white/95 font-medium" : "text-slate-100"
                        )}>
                            {normalizedContent}
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
