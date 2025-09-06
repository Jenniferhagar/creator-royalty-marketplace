"use client";
import React, { useState } from "react";
import { ethers } from "ethers";
import CreatorNFT from "../../constants/abi/CreatorNFT.json"; // raw ABI array

// Localhost deploy address (update if you redeploy)
const CREATOR_NFT_ADDRESS = "0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9";

export default function Page() {
    const [name, setName] = useState(""); // optional UI only
    const [uri, setUri] = useState("");
    const [status, setStatus] = useState("");

    async function handleMint(e: React.FormEvent) {
        e.preventDefault();
        setStatus("Minting…");
        try {
            const { ethereum } = window as any;
            if (!ethereum) { setStatus("❌ MetaMask not found."); return; }

            const provider = new ethers.providers.Web3Provider(ethereum, "any");
            await provider.send("eth_requestAccounts", []);
            await provider.getNetwork();

            const signer = provider.getSigner();
            const from = await signer.getAddress();

            const contract = new ethers.Contract(
                CREATOR_NFT_ADDRESS,
                CreatorNFT as any,
                signer
            );

            // mintNFT(address to, string tokenURI)
            const tx = await (contract as any).mintNFT(from, uri);
            const receipt = await tx.wait();

            // Pull tokenId from the Transfer event
            let tokenId = null as null | string;
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
            setStatus(`❌ Error: ${err?.message || String(err)}`);
            console.error(err);
        }
    }


    return (
        <main className="mx-auto max-w-3xl px-4 py-16">
            <h1 className="text-4xl font-bold mb-6">Create NFT</h1>

            <form onSubmit={handleMint} className="space-y-4">
                <div>
                    <label className="block text-sm mb-1">Name (optional)</label>
                    <input
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full px-3 py-2 rounded-md bg-zinc-900 border border-zinc-700 focus:outline-none focus:ring-2 focus:ring-fuchsia-500"
                        placeholder="Test 1"
                    />
                </div>

                <div>
                    <label className="block text-sm mb-1">Metadata URI</label>
                    <input
                        value={uri}
                        onChange={(e) => setUri(e.target.value)}
                        className="w-full px-3 py-2 rounded-md bg-zinc-900 border border-zinc-700 focus:outline-none focus:ring-2 focus:ring-fuchsia-500"
                        placeholder="ipfs://test"
                        required
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
