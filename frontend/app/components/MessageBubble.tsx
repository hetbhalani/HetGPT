import Image from "next/image";
import { User } from "lucide-react";
import clsx from "clsx";
import { UserAvatar } from "./UserAvatar";

import ReactMarkdown from 'react-markdown';
import { CodeBlock } from "./CodeBlock";

interface MessageBubbleProps {
    role: "user" | "assistant";
    content: string;
    userName?: string;
}

export function MessageBubble({ role, content, userName }: MessageBubbleProps) {
    const isUser = role === "user";

    return (
        <div
            className={clsx(
                "flex w-full px-2 sm:px-4 md:px-6 py-3 sm:py-4 animate-fadeIn transition-all duration-300",
                isUser ? "justify-end" : "justify-start ms-1 sm:ms-2"
            )}
        >
            <div className={clsx("flex items-start gap-2 sm:gap-3 md:gap-4 max-w-[92%] sm:max-w-[85%]", isUser && "flex-row-reverse")}>
                {/* Avatar */}
                <div className="flex shrink-0 flex-col relative items-end">
                    <div
                        className={clsx(
                            "chat-avatar flex h-6 w-6 sm:h-8 sm:w-8 items-center justify-center rounded-sm overflow-hidden shadow-sm",
                            isUser ? "bg-transparent" : "bg-transparent"
                        )}
                    >
                        {isUser ? (
                            userName ? (
                                <UserAvatar name={userName} size="md" />
                            ) : (
                                <div className="flex h-6 w-6 sm:h-8 sm:w-8 items-center justify-center rounded-full bg-purple-500 text-white shadow-md">
                                    <User className="h-4 w-4 sm:h-5 sm:w-5" />
                                </div>
                            )
                        ) : (
                            <Image
                                src="/alien.png"
                                alt="HetGPT"
                                width={32}
                                height={32}
                                className="object-contain w-6 h-6 sm:w-8 sm:h-8"
                            />
                        )}
                    </div>
                </div>

                <div className={clsx(
                    "relative group max-w-full overflow-hidden",
                    isUser ? "flex justify-end" : "flex"
                )}>
                    <div className={clsx(
                        "chat-message-text inline-block break-words relative z-10 text-[13px] sm:text-sm md:text-[15px] max-w-full",
                        isUser
                            ? "bg-violet-600/20 backdrop-blur-md text-slate-100 rounded-2xl rounded-tr-sm px-3 sm:px-4 py-2.5 sm:py-3 border border-violet-500/20 shadow-sm"
                            : "bg-white/7 backdrop-blur-md text-slate-100 rounded-2xl rounded-tl-sm px-3 sm:px-4 py-2.5 sm:py-3 border border-white/10 shadow-sm w-full"
                    )}>
                        <div className={clsx("markdown-container", isUser ? "text-white/95" : "text-slate-100")}>
                            {/* @ts-ignore */}
                            <ReactMarkdown
                                components={{
                                    code({ node, inline, className, children, ...props }: any) {
                                        const match = /language-(\w+)/.exec(className || '');
                                        const language = match ? match[1] : '';

                                        if (!inline && match) {
                                            return (
                                                <CodeBlock
                                                    language={language}
                                                    value={String(children).replace(/\n$/, '')}
                                                />
                                            );
                                        }

                                        return (
                                            <code className={clsx("bg-white/10 rounded px-1.5 py-0.5 text-sm font-mono break-words whitespace-pre-wrap", className)} {...props}>
                                                {children}
                                            </code>
                                        );
                                    },
                                    // Style other elements to look good
                                    p: ({ children }) => <p className="mb-2 last:mb-0 leading-6 sm:leading-7">{children}</p>,
                                    ul: ({ children }) => <ul className="list-disc pl-3 sm:pl-4 mb-2">{children}</ul>,
                                    ol: ({ children }) => <ol className="list-decimal pl-3 sm:pl-4 mb-2">{children}</ol>,
                                    li: ({ children }) => <li className="mb-1">{children}</li>,
                                    h1: ({ children }) => <h1 className="text-lg font-bold mb-2 mt-4">{children}</h1>,
                                    h2: ({ children }) => <h2 className="text-base font-bold mb-2 mt-3">{children}</h2>,
                                    h3: ({ children }) => <h3 className="text-sm font-bold mb-1 mt-2">{children}</h3>,
                                    a: ({ href, children }) => <a href={href} target="_blank" rel="noopener noreferrer" className="text-violet-300 hover:underline">{children}</a>,
                                }}
                            >
                                {content}
                            </ReactMarkdown>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
