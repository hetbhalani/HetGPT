"use client";

import { usePathname } from "next/navigation";

export function BackgroundWrapper() {
    const pathname = usePathname();
    const isChatRoute = pathname === '/chat';

    return (
        <div className="fixed inset-0 z-0 pointer-events-none">
            <video
                autoPlay
                loop
                muted
                playsInline
                className="absolute inset-0 w-full h-full object-cover"
                style={{ minWidth: '100%', minHeight: '100%' }}
            >
                <source src="/1222.mp4" type="video/mp4" />
            </video>
            {/* Overlay */}
            <div
                className="absolute inset-0 transition-all duration-700 ease-in-out"
                style={{
                    background: isChatRoute
                        ? 'rgba(3, 7, 18, 0.86)'
                        : 'linear-gradient(to bottom, rgba(15,23,42,0.25) 0%, rgba(3,7,18,0.6) 55%, rgba(3,7,18,0.8) 100%)',
                    backdropFilter: 'blur(18px)',
                }}
            />
        </div>
    );
}
