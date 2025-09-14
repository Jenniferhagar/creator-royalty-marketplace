"use client";

import React, { useEffect, useState } from "react";
import { ethers } from "ethers";
import CreatorNFT from "../../constants/abi/CreatorNFT.json";
import { NFT_ADDRESS } from "../../constants/index.js";

// convert ipfs:// → gateway URL
function ipfsToHttp(uri?: string) {
    if (!uri) return "";
    return uri.startsWith("ipfs://")
        ? `https://ipfs.io/ipfs/${uri.replace("ipfs://", "")}`
        : uri;
}

type NFT = {
    tokenId: string;
    tokenURI: string;
    name?: string;
    description?: string;
    image?: string;
    animation_url?: string;
};

export default function MyNFTsPage() {
    const [nfts, setNfts] = useState<NFT[]>([]);
    const [status, setStatus] = useState<string>("");

    useEffect(() => {
        (async () => {
            try {
                setStatus("🔗 Connecting wallet…");

                const { ethereum } = window as any;
                if (!ethereum) {
                    setStatus("❌ MetaMask not found.");
                    return;
                }

                const provider = new ethers.providers.Web3Provider(ethereum, "any");
                await provider.send("eth_requestAccounts", []);
                const signer = provider.getSigner();
                const owner = await signer.getAddress();

                // contract instance
                const contract = new ethers.Contract(
                    NFT_ADDRESS,
                    (CreatorNFT as any).abi ?? (CreatorNFT as any),
                    provider
                );

                setStatus("📦 Reading your NFTs…");

                // query Transfer logs to detect owned tokenIds
                const filter = contract.filters.Transfer(null, owner);
                const toBlock = await provider.getBlockNumber();
                const logs = await contract.queryFilter(filter, 0, toBlock);

                const tokenIds = [
                    ...new Set(logs.map((l) => (l.args as any).tokenId.toString())),
                ];

                if (!tokenIds.length) {
                    setStatus("You don’t own any NFTs yet.");
                    return;
                }

                setStatus("📑 Fetching metadata…");

                const out: NFT[] = [];
                for (const tid of tokenIds) {
                    let tokenURI = "";
                    try {
                        tokenURI = await (contract as any).tokenURI(tid);
                    } catch {
                        continue;
                    }

                    let meta: any = {};
                    try {
                        const res = await fetch(ipfsToHttp(tokenURI));
                        meta = await res.json();
                    } catch {
                        // ignore fetch errors
                    }

                    out.push({
                        tokenId: tid,
                        tokenURI,
                        name: meta?.name,
                        description: meta?.description,
                        image: meta?.image,
                        animation_url: meta?.animation_url,
                    });
                }

                setNfts(out);
                setStatus("");
            } catch (err: any) {
                console.error(err);
                setStatus(`❌ Error: ${err?.message || String(err)}`);
            }
        })();
    }, []);

    return (
        <main className="mx-auto max-w-6xl px-4 py-12">
            <h1 className="text-3xl md:text-4xl font-bold mb-6">🎵 My NFTs</h1>

            {status && <p className="mb-4 text-sm text-zinc-300">{status}</p>}

            <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                {nfts.map((nft) => (
                    <div
                        key={nft.tokenId}
                        className="rounded-2xl overflow-hidden bg-zinc-900/60 border border-white/10 p-4"
                    >
                        {nft.image ? (
                            <img
                                src={ipfsToHttp(nft.image)}
                                alt={nft.name || `NFT #${nft.tokenId}`}
                                className="w-full h-64 object-contain rounded-xl bg-black"
                            />
                        ) : (

                            <div className="h-48 w-full bg-zinc-800 flex items-center justify-center text-zinc-400 rounded-lg">
                                No Image
                            </div>
                        )}

                        <div className="mt-4">
                            <h2 className="font-semibold">{nft.name || `NFT #${nft.tokenId}`}</h2>
                            <p className="text-xs text-zinc-400">Token #{nft.tokenId}</p>
                            {nft.description && (
                                <p className="text-sm text-zinc-400 mt-1">{nft.description}</p>
                            )}

                            {/* audio / video playback */}
                            {nft.animation_url && (
                                <div className="mt-3">
                                    {nft.animation_url.endsWith(".mp4") ? (
                                        <video
                                            controls
                                            className="w-full rounded-lg"
                                            src={ipfsToHttp(nft.animation_url)}
                                        />
                                    ) : (
                                        <audio
                                            controls
                                            className="w-full"
                                            src={ipfsToHttp(nft.animation_url)}
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
