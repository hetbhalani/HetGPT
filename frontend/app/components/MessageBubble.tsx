import Image from "next/image";
import { User } from "lucide-react";
import { clsx } from "clsx";

interface MessageBubbleProps {
    role: "user" | "assistant";
    content: string;
}

export function MessageBubble({ role, content }: MessageBubbleProps) {
    const isUser = role === "user";

    return (
        <div
            className={clsx(
                "flex w-full p-4 md:p-6 animate-fadeIn",
                isUser ? "justify-end" : "justify-start"
            )}
        >
            <div className={clsx("flex gap-4 md:gap-6", isUser && "flex-row-reverse")}>
                {/* Avatar */}
                <div className="flex shrink-0 flex-col relative items-end">
                    <div
                        className={clsx(
                            "flex h-8 w-8 items-center justify-center rounded-sm overflow-hidden",
                            isUser ? "bg-accent text-accent-foreground rounded-full" : "bg-transparent"
                        )}
                    >
                        {isUser ? (
                            <User className="h-5 w-5" />
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
                    "relative",
                    isUser ? "flex justify-end" : "flex-1"
                )}>
                    <div className={clsx(
                        "prose prose-invert max-w-none break-words leading-7",
                        isUser ? "bg-muted/40 rounded-2xl px-4 py-2.5 inline-block max-w-fit" : ""
                    )}>
                        <p className="whitespace-pre-wrap m-0">{content}</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
