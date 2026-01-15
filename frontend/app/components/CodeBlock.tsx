import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { Check, Copy } from 'lucide-react';
import { useState } from 'react';

interface CodeBlockProps {
    language: string;
    value: string;
}

export const CodeBlock = ({ language, value }: CodeBlockProps) => {
    const [isCopied, setIsCopied] = useState(false);

    const copyToClipboard = async () => {
        if (!navigator.clipboard) return;
        try {
            await navigator.clipboard.writeText(value);
            setIsCopied(true);
            setTimeout(() => setIsCopied(false), 2000);
        } catch (error) {
            console.error('Failed to copy text: ', error);
        }
    };

    return (
        <div className="relative w-full rounded-lg overflow-hidden border border-white/10 my-3 sm:my-4 bg-[#1e1e1e] shadow-lg">
            {/* Header */}
            <div className="flex items-center justify-between px-3 sm:px-4 py-1.5 sm:py-2 bg-[#2d2d2d] border-b border-white/5">
                <span className="text-[10px] sm:text-xs font-mono text-slate-400 lowercase">{language || 'code'}</span>
                <button
                    onClick={copyToClipboard}
                    className="flex items-center gap-1 sm:gap-1.5 text-[10px] sm:text-xs text-slate-400 hover:text-white transition-colors cursor-pointer"
                    title="Copy to clipboard"
                >
                    {isCopied ? (
                        <>
                            <Check size={12} className="text-gray-400 sm:w-[14px] sm:h-[14px]" />
                            <span className="text-gray-400 font-medium hidden sm:inline">Copied!</span>
                        </>
                    ) : (
                        <>
                            <Copy size={12} className="sm:w-[14px] sm:h-[14px]" />
                            <span className="hidden sm:inline">Copy</span>
                        </>
                    )}
                </button>
            </div>

            {/* Code Area */}
            <div className="text-xs sm:text-sm font-mono overflow-x-auto">
                <SyntaxHighlighter
                    language={language || 'text'}
                    style={vscDarkPlus}
                    customStyle={{
                        margin: 0,
                        padding: '0.75rem',
                        background: 'transparent',
                        fontSize: 'inherit',
                        lineHeight: '1.5'
                    }}
                    wrapLongLines={true}
                >
                    {value}
                </SyntaxHighlighter>
            </div>
        </div>
    );
};
