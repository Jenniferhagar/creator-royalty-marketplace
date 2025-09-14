"use client";
import React, { useEffect, useState } from "react";
import { ethers } from "ethers";
import CreatorNFT from "../../constants/abi/CreatorNFT.json";
import Marketplace from "../../constants/abi/Marketplace.json" assert { type: "json" };
import { MARKET_ADDRESS, NFT_ADDRESS } from "../../constants";

const MARKET_ABI: any = Array.isArray(Marketplace) ? Marketplace : (Marketplace as any).abi;

function ipfsToHttp(uri?: string) {
    if (!uri) return "";
    return uri.startsWith("ipfs://")
        ? `https://ipfs.io/ipfs/${uri.replace("ipfs://", "")}`
        : uri;
}

export default function MarketplacePage() {
    const [account, setAccount] = useState<string | null>(null);
    const [listings, setListings] = useState<any[]>([]);
    const [status, setStatus] = useState<string>("");
    const [tokenId, setTokenId] = useState("");
    const [price, setPrice] = useState("");

    useEffect(() => {
        (async () => {
            try {
                if (!(window as any).ethereum) {
                    setStatus("❌ No wallet found.");
                    return;
                }
                const provider = new ethers.providers.Web3Provider((window as any).ethereum, "any");
                await provider.ready;

                const accounts = await provider.listAccounts();
                if (accounts.length > 0) setAccount(accounts[0]);

                await loadListings(provider);
            } catch (err: any) {
                console.error(err);
                setStatus(`❌ Error loading: ${err.message || String(err)}`);
            }
        })();
    }, []);

    const loadListings = async (provider: ethers.providers.Web3Provider) => {
        const market = new ethers.Contract(MARKET_ADDRESS, MARKET_ABI, provider);
        const nft = new ethers.Contract(NFT_ADDRESS, CreatorNFT, provider);

        const nextId = await market.nextId();
        const out: any[] = [];

        for (let i = 1; i < Number(nextId); i++) {
            const l = await market.listings(i);
            if (l.active) {
                let meta: any = {};
                try {
                    const tokenURI = await nft.tokenURI(l.tokenId);
                    const res = await fetch(ipfsToHttp(tokenURI));
                    console.log("TokenURI:", tokenURI);
                    meta = await res.json();
                    console.log("Metadata JSON:", meta);

                } catch { }
                out.push({
                    id: i,
                    tokenId: l.tokenId.toString(),
                    seller: l.seller,
                    price: ethers.utils.formatEther(l.price),
                    name: meta?.name,
                    image: meta?.image,
                    audio: meta?.animation_url || meta?.audio,
                });
            }
        }
        setListings(out);
    };

    const handleList = async () => {
        try {
            if (!tokenId || !price) {
                setStatus("❌ Please enter both Token ID and price.");
                return;
            }

            const provider = new ethers.providers.Web3Provider((window as any).ethereum, "any");
            const signer = provider.getSigner();
            const market = new ethers.Contract(MARKET_ADDRESS, MARKET_ABI, signer);
            const nft = new ethers.Contract(NFT_ADDRESS, CreatorNFT, signer);

            const approveTx = await nft.approve(MARKET_ADDRESS, tokenId);
            await approveTx.wait();

            const tx = await market.listItem(
                NFT_ADDRESS,
                tokenId,
                ethers.utils.parseEther(price)
            );
            await tx.wait();

            setStatus("✅ NFT listed successfully!");
            setTokenId("");
            setPrice("");

            await loadListings(provider);
        } catch (err: any) {
            console.error(err);
            setStatus(`❌ Listing failed: ${err.message || String(err)}`);
        }
    };

    return (
        <main className="mx-auto max-w-6xl px-4 py-24">
            <h1 className="text-3xl md:text-4xl font-extrabold">Marketplace</h1>
            <p className="mt-3 text-zinc-300">Browse and buy music NFTs.</p>

            <div className="mt-6 p-4 border rounded-xl bg-zinc-900">
                <h2 className="text-lg font-semibold mb-2">List an NFT</h2>
                <input
                    type="text"
                    placeholder="Token ID"
                    value={tokenId}
                    onChange={(e) => setTokenId(e.target.value)}
                    className="mb-2 w-full p-2 rounded bg-zinc-800"
                />
                <input
                    type="text"
                    placeholder="Price in ETH"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    className="mb-2 w-full p-2 rounded bg-zinc-800"
                />
                <button
                    onClick={handleList}
                    className="px-4 py-2 rounded bg-purple-600 hover:bg-purple-700"
                >
                    List NFT
                </button>
                {status && <p className="mt-2 text-sm text-zinc-400">{status}</p>}
            </div>

            <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                {listings.map((l) => (
                    <div
                        key={l.id}
                        className="rounded-2xl border border-white/10 bg-white/5 p-4"
                    >
                        {l.image ? (
                            <img
                                src={ipfsToHttp(l.image)}
                                alt={l.name || `NFT #${l.id}`}
                                className="h-40 w-full object-cover rounded-xl"
                            />
                        ) : (
                            <div className="h-40 w-full rounded-xl bg-zinc-800 flex items-center justify-center text-zinc-400">
                                No Image
                            </div>
                        )}

                        {l.audio && (
                            <audio controls src={ipfsToHttp(l.audio)} className="mt-3 w-full" />
                        )}

                        <div className="mt-4 flex items-center justify-between">
                            <div>
                                <div className="font-semibold">{l.name || `NFT #${l.id}`}</div>
                                <div className="text-sm text-zinc-400">
                                    Seller: {l.seller.slice(0, 6)}...{l.seller.slice(-4)}
                                </div>
                            </div>
                            <div className="text-sm font-medium">{l.price} ETH</div>
                        </div>
                    </div>
                ))}
            </div>
        </main>
    );
}
