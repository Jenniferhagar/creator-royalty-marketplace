"use client";
import Link from "next/link";
import ConnectWallet from "./ConnectWallet";

export default function NavBar() {
    return (
        <header className="sticky top-0 z-20 bg-transparent">
            <nav className="mx-auto max-w-6xl px-4 py-4 flex items-center justify-between">
                {/* LOGO (emoji + wordmark) */}
                <Link
                    href="/"
                    className="inline-flex items-center gap-1 rounded-full px-3 py-1
                    bg-zinc-200 text-black hover:bg-zinc-300
                    border-18 border-black transition focus:outline-none focus:ring-2 focus:ring-black/30"

                >
                    <span aria-hidden className="text-lg">🎵</span>
                    <span className="text-xl font-extrabold bg-gradient-to-r from-pink-300 via-rose-300 to-violet-300 bg-clip-text text-transparent tracking-tight">
                        RoyaltyRiff
                    </span>
                </Link>

                {/* NAV BUTTONS + WALLET (lighter fill, emojis kept) */}
                <div className="flex items-center gap-3 text-sm">
                    <Link
                        href="/create"
                        className="inline-flex items-center gap-1 rounded-full px-3 py-1
                        bg-zinc-200 text-black hover:bg-zinc-300
                        border-2 border-black transition focus:outline-none focus:ring-2 focus:ring-black/30"

                    >
                        <span>🎙️</span><span>Create NFT</span>
                    </Link>

                    <Link
                        href="/my"
                        className="inline-flex items-center gap-1 rounded-full px-3 py-1
                        bg-zinc-200 text-black hover:bg-zinc-300
                        border-2 border-black transition focus:outline-none focus:ring-2 focus:ring-black/30"

                    >
                        <span>🎧</span><span>My NFTs</span>
                    </Link>

                    <Link
                        href="/marketplace"
                        className="inline-flex items-center gap-1 rounded-full px-3 py-1
                        bg-zinc-200 text-black hover:bg-zinc-300
                        border border-zinc-300 transition"
                    >
                        <span>🎶</span><span>Marketplace</span>
                    </Link>

                    {/* Wallet button back */}
                    <div className="ml-2 shrink-0">
                        <ConnectWallet />
                    </div>
                </div>
            </nav>
        </header>
    );
}
