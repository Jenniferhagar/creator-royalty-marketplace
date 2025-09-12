"use client";
import React, { useState } from "react";
import { ethers } from "ethers";
import CreatorNFT from "../../constants/abi/CreatorNFT.json";
import { NFT_ADDRESS } from "../../constants/index.js";


export default function CreatePage() {
    const [name, setName] = useState("");
    const [imageFile, setImageFile] = useState<File | null>(null);   // required
    const [mediaFile, setMediaFile] = useState<File | null>(null);   // optional (audio OR video)
    const [uri, setUri] = useState("");                              // optional override
    const [status, setStatus] = useState("");

    async function handleMint(e: React.FormEvent) {
        e.preventDefault();
        setStatus("Minting…");

        try {
            // 1) If the user didn’t provide a Metadata URI, build one by uploading to /api/ipfs
            let tokenURI = uri.trim();

            if (!tokenURI) {
                if (!imageFile) {
                    setStatus("❌ Please choose a cover image first.");
                    return;
                }

                setStatus("Uploading to IPFS…");

                const form = new FormData();
                form.append("title", name || "Untitled");
                form.append("description", name ? `NFT: ${name}` : "");
                form.append("file", imageFile);               // required image
                if (mediaFile) form.append("media", mediaFile); // optional audio OR video

                const res = await fetch("/api/ipfs", { method: "POST", body: form });
                const txt = await res.text();
                console.log("Raw response from /api/ipfs:", txt);

                let data;
                try {
                    data = JSON.parse(txt);
                } catch {
                    throw new Error("Server did not return JSON. See console log above.");
                }


                if (!res.ok) {
                    throw new Error(data?.error || "Upload failed");
                }

                tokenURI = data.tokenURI; // ipfs://...
                setUri(tokenURI);         // show it in the field (optional)
            }

            // 2) Mint on-chain
            setStatus("Connecting wallet…");
            const { ethereum } = window as any;
            if (!ethereum) {
                setStatus("❌ MetaMask not found.");
                return;
            }
            const provider = new ethers.providers.Web3Provider(ethereum, "any");
            await provider.send("eth_requestAccounts", []);
            const signer = provider.getSigner();
            const from = await signer.getAddress();

            const contract = new ethers.Contract(
                NFT_ADDRESS,
                (CreatorNFT as any).abi ?? (CreatorNFT as any),
                signer
            );


            setStatus("Sending transaction…");
            const tx = await (contract as any).mintNFT(from, tokenURI);
            const receipt = await tx.wait();

            // Try to pull tokenId from Transfer event (nice-to-have)
            let tokenId: string | null = null;
            for (const log of receipt.logs) {
                try {
                    const parsed = contract.interface.parseLog(log);
                    if (parsed.name === "Transfer") {
                        tokenId = parsed.args.tokenId.toString();
                        break;
                    }
                } catch { }
            }

            setStatus(
                tokenId
                    ? `✅ NFT #${tokenId} minted! Tx: ${tx.hash}`
                    : `✅ NFT minted! Tx: ${tx.hash}`
            );
        } catch (err: any) {
            console.error(err);
            setStatus(`❌ Error: ${err?.message || String(err)}`);
        }
    }

    return (
        <main className="mx-auto max-w-3xl px-4 py-16">
            <h1 className="text-4xl font-bold mb-8">Create NFT</h1>

            <form onSubmit={handleMint} className="space-y-6">
                {/* Name */}
                <div>
                    <label className="block text-sm mb-1">Name (optional)</label>
                    <input
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full px-3 py-2 rounded-md bg-zinc-900 border border-zinc-700 focus:outline-none focus:ring-2 focus:ring-fuchsia-500"
                        placeholder="e.g., 2 of Cups"
                    />
                </div>

                {/* Cover image (required) */}
                <div>
                    <label className="block text-sm mb-1">Cover Image (required)</label>
                    <input
                        type="file"
                        accept="image/*"
                        onChange={(e) =>
                            setImageFile((e.target as HTMLInputElement).files?.[0] || null)
                        }
                        className="w-full px-3 py-2 rounded-md bg-zinc-900 border border-zinc-700 focus:outline-none focus:ring-2 focus:ring-fuchsia-500"
                        required
                    />
                </div>

                {/* Unified media (audio OR video, optional) */}
                <div>
                    <label className="block text-sm mb-1">Audio or Video (optional)</label>
                    <input
                        type="file"
                        accept="audio/*,video/*"
                        onChange={(e) =>
                            setMediaFile((e.target as HTMLInputElement).files?.[0] || null)
                        }
                        className="w-full px-3 py-2 rounded-md bg-zinc-900 border border-zinc-700 focus:outline-none focus:ring-2 focus:ring-fuchsia-500"
                    />
                    <p className="mt-1 text-xs text-zinc-400">
                        Attach one media file (MP3 or MP4 recommended). This becomes
                        <code className="ml-1">animation_url</code>.
                    </p>
                </div>

                {/* Metadata URI (optional override) */}
                <div>
                    <label className="block text-sm mb-1">Metadata URI</label>
                    <input
                        value={uri}
                        onChange={(e) => setUri(e.target.value)}
                        className="w-full px-3 py-2 rounded-md bg-zinc-900 border border-zinc-700 focus:outline-none focus:ring-2 focus:ring-fuchsia-500"
                        placeholder="ipfs://… (leave blank to auto-generate)"
                    />
                </div>

                <button
                    type="submit"
                    className="w-full rounded-xl px-4 py-2 bg-fuchsia-500 hover:bg-fuchsia-400 text-black font-semibold transition"
                >
                    Mint NFT
                </button>
            </form>

            {status && <p className="mt-4 text-sm text-zinc-300">{status}</p>}
        </main>
    );
}
