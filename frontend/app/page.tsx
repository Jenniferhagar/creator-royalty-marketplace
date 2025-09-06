import Link from "next/link";

export default function Home() {
    return (
        <main className="relative mx-auto max-w-6xl px-4 py-24">
            <div className="text-center">
                <p className="text-sm uppercase tracking-widest text-zinc-400">Welcome to</p>
                <h1
                    className="mt-2 text-6xl md:text-7xl font-extrabold tracking-tight
             bg-[linear-gradient(90deg,#f472b6_0%,#fb7185_22%,#f0abfc_45%,#c084fc_62%,#a78bfa_80%,#60a5fa_100%)]
             bg-clip-text text-transparent"
                >
                    RoyaltyRiff
                </h1>


                <p className="mt-4 text-zinc-300">Secure your music now—before someone else does.</p>

                {/* hero buttons, centered */}
                <div className="mt-8 flex flex-wrap justify-center gap-3">
                    <Link
                        href="/create"
                        className="rounded-full px-5 py-2.5 border border-pink-200/50 bg-pink-300/20 hover:bg-pink-300/30 transition"
                    >
                        Create NFT
                    </Link>
                    <Link
                        href="/my"
                        className="rounded-full px-5 py-2.5 border border-violet-200/50 bg-violet-300/20 hover:bg-violet-300/30 transition"
                    >
                        My NFTs
                    </Link>
                    <Link
                        href="/marketplace"
                        className="rounded-full px-5 py-2.5 border border-white/10 bg-white/5 hover:bg-white/10 transition"
                    >
                        Marketplace
                    </Link>
                </div>
            </div>
        </main>
    );
}
