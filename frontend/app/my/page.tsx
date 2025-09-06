"use client";

import { useEffect, useState } from "react";
import { ethers } from "ethers";

// ⬇️ Use the EXACT CreatorNFT address from your latest local deploy.
// From your screenshot it was:
const CREATOR_NFT_ADDRESS = "0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9";
// If your terminal shows a different 42-char 0x… for CreatorNFT, paste it here.

const nftAbi = [
    "function balanceOf(address) view returns (uint256)",
    "function tokenOfOwnerByIndex(address owner, uint256 index) view returns (uint256)",
    "function tokenURI(uint256 tokenId) view returns (string)",
    "event Transfer(address indexed from,address indexed to,uint256 indexed tokenId)"
];

function ipfsToHttp(uri: string) {
    if (!uri) return uri as any;
    return uri.startsWith("ipfs://") ? "https://ipfs.io/ipfs/" + uri.slice(7) : uri;
}

type NftItem = { tokenId: string; name?: string; image?: string; rawURI?: string };

export default function MyNFTsPage() {
    const [account, setAccount] = useState<string | null>(null);
    const [items, setItems] = useState<NftItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [err, setErr] = useState<string | null>(null);

    useEffect(() => {
        (async () => {
            try {
                // Connect to MetaMask on localhost and avoid ENS issues
                const provider = new ethers.providers.Web3Provider((window as any).ethereum, "any");
                await provider.send("eth_requestAccounts", []);
                await provider.getNetwork(); // important for localhost
                const signer = provider.getSigner();
                const [addr] = await provider.listAccounts();
                setAccount(addr ?? null);

                const nft = new ethers.Contract(CREATOR_NFT_ADDRESS, nftAbi, signer);

                setLoading(true);
                setErr(null);

                // Try ERC721Enumerable first
                let ids: string[] = [];
                try {
                    const bal = await nft.balanceOf(addr);
                    const n = Number(bal);
                    const tmp: string[] = [];
                    for (let i = 0; i < n; i++) {
                        const id = await nft.tokenOfOwnerByIndex(addr, i);
                        tmp.push(id.toString());
                    }
                    ids = tmp;
                } catch {
                    // Fallback via Transfer events (works if not enumerable)
                    const toEv = await nft.queryFilter(nft.filters.Transfer(null, addr), 0, "latest");
                    const fromEv = await nft.queryFilter(nft.filters.Transfer(addr, null), 0, "latest");
                    const have = new Set<string>();
                    for (const e of toEv) have.add(e.args?.tokenId.toString());
                    for (const e of fromEv) have.delete(e.args?.tokenId.toString());
                    ids = Array.from(have);
                }

                // Fetch metadata (best-effort)
                const out: NftItem[] = [];
                for (const id of ids) {
                    try {
                        const rawURI: string = await nft.tokenURI(id);
                        const url = ipfsToHttp(rawURI);
                        let name: string | undefined;
                        let image: string | undefined;

                        if (url?.startsWith("http")) {
                            const res = await fetch(url);
                            const meta = await res.json().catch(() => null as any);
                            name = meta?.name;
                            image = ipfsToHttp(meta?.image ?? meta?.image_url ?? "");
                        }

                        out.push({ tokenId: id, name, image, rawURI });
                    } catch {
                        out.push({ tokenId: id });
                    }
                }

                out.sort((a, b) => Number(a.tokenId) - Number(b.tokenId));
                setItems(out);
            } catch (e: any) {
                setErr(e?.message ?? "Failed to load NFTs");
            } finally {
                setLoading(false);
            }
        })();
    }, []);

    return (
        <main className="mx-auto max-w-6xl px-4 py-24">
            <h1 className="text-3xl md:text-4xl font-extrabold">My NFTs</h1>

            {account && (
                <p className="mt-2 text-zinc-300">
                    Connected: <span className="font-mono">{account.slice(0, 6)}…{account.slice(-4)}</span>
                </p>
            )}

            {loading && <p className="mt-8 text-zinc-300">Loading your tokens…</p>}
            {err && <p className="mt-8 text-rose-300">Error: {err}</p>}

            {!loading && !err && (
                <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                    {items.length === 0 && (
                        <div className="col-span-full text-zinc-300">No NFTs found for this wallet.</div>
                    )}

                    {items.map((it) => (
                        <div key={it.tokenId} className="rounded-2xl border border-white/10 bg-white/5 overflow-hidden">
                            <div className="h-48 flex items-center justify-center bg-black/20">
                                {it.image ? (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img
                                        src={it.image}
                                        alt={it.name ?? `Token #${it.tokenId}`}
                                        className="h-full w-full object-cover"
                                    />
                                ) : (
                                    <div className="text-sm text-zinc-400">Token #{it.tokenId}</div>
                                )}
                            </div>
                            <div className="p-4">
                                <div className="font-semibold">{it.name ?? `Token #${it.tokenId}`}</div>
                                {it.rawURI && (
                                    <a
                                        className="mt-2 inline-block text-xs text-zinc-300 underline hover:text-white"
                                        href={ipfsToHttp(it.rawURI)}
                                        target="_blank"
                                        rel="noreferrer"
                                    >
                                        metadata
                                    </a>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </main>
    );
}
