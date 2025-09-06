export default function Page() {
    const items = [
        { id: 1, name: "Untitled Track #1", price: "0.05 ETH", royalty: "5%" },
        { id: 2, name: "Midnight Loop", price: "0.08 ETH", royalty: "7.5%" },
        { id: 3, name: "Violet Echo", price: "0.03 ETH", royalty: "5%" },
        { id: 4, name: "Neon Chorus", price: "0.06 ETH", royalty: "10%" },
        { id: 5, name: "Soft Riff", price: "0.02 ETH", royalty: "5%" },
        { id: 6, name: "Golden Hook", price: "0.09 ETH", royalty: "7%" },
    ];

    return (
        <main className="mx-auto max-w-6xl px-4 py-24">
            <h1 className="text-3xl md:text-4xl font-extrabold">Marketplace</h1>
            <p className="mt-3 text-zinc-300">
                Browse and buy music NFTs. (Listings hook-up comes next.)
            </p>

            <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                {items.map((it) => (
                    <div key={it.id} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                        {/* placeholder cover */}
                        <div className="h-40 rounded-xl bg-gradient-to-br from-pink-300/30 via-rose-300/20 to-violet-300/30" />

                        <div className="mt-4 flex items-center justify-between">
                            <div>
                                <div className="font-semibold">{it.name}</div>
                                <div className="text-sm text-zinc-400">Royalty {it.royalty}</div>
                            </div>
                            <div className="text-sm font-medium">{it.price}</div>
                        </div>

                        <button
                            disabled
                            className="mt-4 w-full rounded-full px-4 py-2 border border-white/10 bg-white/5 text-zinc-200 opacity-60 cursor-not-allowed"
                            title="Coming soon"
                        >
                            Buy (soon)
                        </button>
                    </div>
                ))}
            </div>
        </main>
    );
}
