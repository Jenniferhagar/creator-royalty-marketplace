"use client";

import React, { useEffect, useState } from "react";
import { ethers } from "ethers";
import CreatorNFT from "../../constants/abi/CreatorNFT.json";
import Marketplace from "../../constants/abi/Marketplace.json" assert { type: "json" };
import { MARKET_ADDRESS, NFT_ADDRESS } from "../../constants";

// normalize Marketplace ABI (array or artifact object)
const MARKET_ABI: any = Array.isArray(Marketplace)
    ? Marketplace
    : (Marketplace as any).abi;

// ipfs:// → gateway URL
function ipfsToHttp(uri?: string) {
    if (!uri) return "";
    return uri.startsWith("ipfs://")
        ? `https://ipfs.io/ipfs/${uri.replace("ipfs://", "")}`
        : uri;
}

type Listing = {
    id: string;
    tokenId: string;
    seller: string;
    price: string;
    name?: string;
    description?: string;
    image?: string;
    animation_url?: string;
};

export default function MarketplacePage() {
    const [listings, setListings] = useState<Listing[]>([]);
    const [status, setStatus] = useState<string>("");
    const [tokenId, setTokenId] = useState("");
    const [price, setPrice] = useState("");
    const [account, setAccount] = useState<string | null>(null);

    // load active listings
    async function loadListings(provider: ethers.providers.Web3Provider) {
        try {
            const market = new ethers.Contract(MARKET_ADDRESS, MARKET_ABI, provider);
            const nft = new ethers.Contract(NFT_ADDRESS, CreatorNFT, provider);

            const next = await market.nextListingId();
            const out: Listing[] = [];

            for (let i = 1; i <= Number(next); i++) {
                const l = await market.listings(i);
                if (!l.active) continue;
                let meta: any = {};
                try {
                    const tokenURI = await nft.tokenURI(l.tokenId);
                    const res = await fetch(ipfsToHttp(tokenURI));
                    meta = await res.json();
                } catch (err) {
                    console.warn("Metadata fetch failed:", err);
                }

                out.push({
                    id: i.toString(),
                    tokenId: l.tokenId.toString(),
                    seller: l.seller,
                    price: ethers.utils.formatEther(l.price),
                    name: meta?.name,
                    description: meta?.description,
                    image: meta?.image,
                    animation_url: meta?.animation_url,
                });
            }


            setListings(out);
        } catch (err) {
            console.error("Failed to load listings:", err);
        }
    }

    // connect wallet & load listings once
    useEffect(() => {
        (async () => {
            try {
                if (!(window as any).ethereum) {
                    setStatus("❌ No wallet found.");
                    return;
                }

                const provider = new ethers.providers.Web3Provider(
                    (window as any).ethereum,
                    "any"
                );
                await provider.send("eth_requestAccounts", []);
                const accounts = await provider.listAccounts();
                if (accounts.length > 0) setAccount(accounts[0]);
                const market = new ethers.Contract(MARKET_ADDRESS, MARKET_ABI, provider);
                const next = await market.nextListingId();
                console.log("nextListingId from contract:", next.toString());



                await loadListings(provider);
            } catch (err: any) {
                console.error(err);
                setStatus(`❌ Error: ${err.message || String(err)}`);
            }
        })();
    }, []);

    // list new NFT
    const handleList = async () => {
        try {
            if (!tokenId || !price) {
                setStatus("⚠️ Token ID and price required.");
                return;
            }

            const provider = new ethers.providers.Web3Provider((window as any).ethereum);
            const signer = provider.getSigner();

            const market = new ethers.Contract(MARKET_ADDRESS, MARKET_ABI, signer);
            const nft = new ethers.Contract(NFT_ADDRESS, CreatorNFT, signer);

            // Step 1: Approve marketplace
            const approveTx = await nft.approve(MARKET_ADDRESS, tokenId);
            await approveTx.wait();

            // Step 2: List NFT
            const tx = await market.listItem(
                NFT_ADDRESS,
                tokenId,
                ethers.utils.parseEther(price)
            );
            await tx.wait();

            setStatus("✅ NFT listed successfully!");
            setTokenId("");
            setPrice("");

            // Refresh listings
            const next = await market.nextListingId();
            const out: any[] = [];
            for (let i = 1; i <= Number(next); i++) {
                const l = await market.listings(i);
                if (l.active) {
                    let meta: any = {};
                    try {
                        const tokenURI = await nft.tokenURI(l.tokenId);
                        const res = await fetch(ipfsToHttp(tokenURI));
                        meta = await res.json();
                    } catch { /* ignore */ }

                    out.push({
                        id: i,
                        tokenId: l.tokenId.toString(),
                        seller: l.seller,
                        price: ethers.utils.formatEther(l.price),
                        name: meta?.name,
                        image: meta?.image,
                        animation_url: meta?.animation_url,
                    });
                }
            }
            setListings(out);

        } catch (err: any) {
            let reason = "❌ Listing failed.";
            const raw = err?.reason || err?.message || JSON.stringify(err);

            if (raw.includes("ALREADY_LISTED")) {
                reason = "❌ Already listed.";
            } else if (raw.includes("PRICE_ZERO")) {
                reason = "❌ Price must be greater than zero.";
            } else if (raw.includes("NOT_OWNER")) {
                reason = "❌ You don’t own this token.";
            } else if (raw.includes("NOT_APPROVED")) {
                reason = "❌ Approve the NFT to the marketplace first.";
            } else {
                reason = `❌ ${raw}`;
            }

            setStatus(reason);
        }
    };


    return (
        <main className="mx-auto max-w-6xl px-4 py-12">
            <h1 className="text-3xl md:text-4xl font-bold">Marketplace</h1>
            <p className="mt-3 text-zinc-300">Browse and buy music NFTs.</p>

            {/* list form */}
            <div className="mt-6 p-4 border rounded-xl bg-zinc-900">
                <h2 className="text-lg font-semibold mb-2">List an NFT</h2>
                <input
                    type="text"
                    placeholder="Token ID"
                    value={tokenId}
                    onChange={(e) => setTokenId(e.target.value)}
                    className="mb-2 w-full p-2 rounded bg-zinc-800 text-white"
                />
                <input
                    type="text"
                    placeholder="Price in ETH"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    className="mb-2 w-full p-2 rounded bg-zinc-800 text-white"
                />
                <button
                    onClick={handleList}
                    className="px-4 py-2 rounded bg-purple-600 hover:bg-purple-700 text-white"
                >
                    List NFT
                </button>
                {status && <p className="mt-2 text-sm text-zinc-400">{status}</p>}
            </div>

            {/* listings grid */}
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

                        <div className="mt-4">
                            <div className="font-semibold">{l.name || `NFT #${l.id}`}</div>
                            <div className="text-sm text-zinc-400 mb-1">
                                Seller: {l.seller.slice(0, 6)}...{l.seller.slice(-4)}
                            </div>
                            <div className="text-sm font-medium mb-2">{l.price} ETH</div>

                            {/* media preview */}
                            {l.animation_url && (
                                <div>
                                    {l.animation_url.endsWith(".mp4") ? (
                                        <video
                                            controls
                                            className="w-full rounded-lg"
                                            src={ipfsToHttp(l.animation_url)}
                                        />
                                    ) : (
                                        <audio
                                            controls
                                            className="w-full"
                                            src={ipfsToHttp(l.animation_url)}
                                        />
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </main>
    );
}
