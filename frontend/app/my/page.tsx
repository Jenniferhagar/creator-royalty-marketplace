"use client";

import React, { useEffect, useState } from "react";
import { ethers } from "ethers";
import CreatorNFT from "../../constants/abi/CreatorNFT.json";
import { NFT_ADDRESS } from "../../constants/index.js";

// helper to turn ipfs:// into an http gateway URL
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

export default function Page() {
    const [nfts, setNfts] = useState<NFT[]>([]);
    const [status, setStatus] = useState<string>("");

    useEffect(() => {
        (async () => {
            try {
                setStatus("Connecting wallet…");

                const { ethereum } = window as any;
                if (!ethereum) {
                    setStatus("❌ MetaMask not found.");
                    return;
                }

                const provider = new ethers.providers.Web3Provider(ethereum, "any");
                await provider.send("eth_requestAccounts", []);
                const signer = provider.getSigner();
                const owner = await signer.getAddress();

                // Contract (read-only is fine)
                const contract = new ethers.Contract(
                    NFT_ADDRESS,
                    (CreatorNFT as any).abi ?? (CreatorNFT as any),
                    provider
                );

                setStatus("Reading your mints…");

                // 🔎 Instead of tokenOfOwnerByIndex, scan Transfer(to = owner) logs
                const filter = contract.filters.Transfer(null, owner);
                const toBlock = await provider.getBlockNumber();
                // start from block 0 on local chains; adjust as needed in prod
                const logs = await contract.queryFilter(filter, 0, toBlock);

                const tokenIds = [...new Set(logs.map((l) => (l.args as any).tokenId.toString()))];

                setStatus(tokenIds.length ? "Fetching metadata…" : "No NFTs found for this wallet.");

                const out: NFT[] = [];
                for (const tid of tokenIds) {
                    let tokenURI = "";
                    try {
                        tokenURI = await (contract as any).tokenURI(tid);
                    } catch {
                        // if tokenURI is missing, skip
                        continue;
                    }

                    let meta: any = {};
                    try {
                        const res = await fetch(ipfsToHttp(tokenURI));
                        meta = await res.json();
                    } catch {
                        // keep going even if metadata fetch fails
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
                setStatus(out.length ? "" : "No NFTs found for this wallet.");
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
                        className="rounded-2xl overflow-hidden bg-zinc-900/60 border border-white/10"
                    >
                        {/* image (if present) */}
                        {nft.image ? (
                            <img
                                src={ipfsToHttp(nft.image)}
                                alt={nft.name || `NFT #${nft.tokenId}`}
                                className="w-full h-56 object-cover"
                            />
                        ) : (
                            <div className="h-56 w-full bg-zinc-800 flex items-center justify-center text-zinc-400">
                                No Image
                            </div>
                        )}

                        <div className="p-4">
                            <h2 className="font-semibold">{nft.name || `NFT #${nft.tokenId}`}</h2>
                            {nft.description && (
                                <p className="text-sm text-zinc-400">{nft.description}</p>
                            )}

                            {/* NEW: show media link if exists */}
                            {!!nft.animation_url && (
                                <a
                                    href={ipfsToHttp(nft.animation_url)}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-fuchsia-400 underline text-sm block mt-2"
                                >
                                    ▶ View Media
                                </a>
                            )}

                            <p className="text-xs text-zinc-500 break-all mt-3">
                                {nft.tokenURI}
                            </p>
                        </div>
                    </div>
                ))}
            </div>
        </main>
    );
}
