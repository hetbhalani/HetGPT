import Image from "next/image";

export function Navbar() {
    return (
        <nav className="fixed top-0 left-0 right-0 z-50 bg-background/60 backdrop-blur-md border-b border-border/50">
            <div className="flex items-center gap-3 px-6 py-3">
                <Image
                    src="/alien.png"
                    alt="HetGPT Logo"
                    width={32}
                    height={32}
                    className="object-contain"
                />
                <span className="text-xl font-semibold tracking-tight">HetGPT</span>
            </div>
        </nav>
    );
}
