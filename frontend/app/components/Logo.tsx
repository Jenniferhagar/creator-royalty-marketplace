type LogoProps = {
    withText?: boolean;         // show “RoyaltyRiff” next to the mark
    className?: string;         // wrapper classes
    markClass?: string;         // size of the icon
    textClass?: string;         // style for the wordmark
};

export default function Logo({
    withText = true,
    className = "inline-flex items-center gap-2",
    markClass = "h-7 w-7",
    textClass = "text-2xl font-extrabold bg-gradient-to-r from-pink-300 via-rose-300 to-violet-300 bg-clip-text text-transparent tracking-tight"
}: LogoProps) {
    return (
        <span className={className}>
            {/* Icon mark: stylized note + split stroke */}
            <svg viewBox="0 0 64 64" className={markClass} role="img" aria-label="RoyaltyRiff logo">
                <defs>
                    <linearGradient id="rrGrad" x1="0" y1="0" x2="1" y2="1">
                        <stop offset="0%" stopColor="#f472b6" />
                        <stop offset="100%" stopColor="#a78bfa" />
                    </linearGradient>
                </defs>

                {/* note stem + flag */}
                <g fill="none" stroke="url(#rrGrad)" strokeWidth="4" strokeLinecap="round">
                    <line x1="40" y1="14" x2="40" y2="40" />
                    <path d="M40 14 q10 6 16 2 v8 q-10 6 -16 0 Z" fill="url(#rrGrad)" stroke="none" />
                </g>

                {/* note head */}
                <circle cx="24" cy="46" r="10" fill="url(#rrGrad)" />

                {/* subtle “split” stroke to hint royalty split */}
                <path d="M16 38 L32 54" stroke="black" strokeOpacity="0.45" strokeWidth="4" strokeLinecap="round" />
            </svg>

            {withText && <span className={textClass}>RoyaltyRiff</span>}
        </span>
    );
}
