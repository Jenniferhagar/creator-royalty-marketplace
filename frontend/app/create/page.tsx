"use client";

import React, { useMemo, useRef, useState } from "react";
import { ethers } from "ethers";
import CreatorNFT from "../../constants/abi/CreatorNFT.json";
import { NFT_ADDRESS } from "../../constants";

function ipfsToHttp(uri?: string) {
    if (!uri) return "";
    return uri.startsWith("ipfs://")
        ? `https://ipfs.io/ipfs/${uri.replace("ipfs://", "")}`
        : uri;
}

type MintResult = {
    tokenId?: string;
    txHash?: string;
    tokenURI?: string;
    imageURI?: string;
    animationURI?: string;
};

// A field that LOOKS like a text input, but accepts files (click or drag & drop)
function FileField({
    label,
    required = false,
    accept,
    file,
    setFile,
    help,
}: {
    label: string;
    required?: boolean;
    accept: string;
    file: File | null;
    setFile: (f: File | null) => void;
    help?: string;
}) {
    const ref = useRef<HTMLInputElement | null>(null);
    const [drag, setDrag] = useState(false);

    return (
        <div>
            <label className="block text-sm mb-1">
                {label} {required && <span className="text-red-400">*</span>}
            </label>

            {/* Hidden native input, so we don't see any browser 'Choose File' button */}
            <input
                ref={ref}
                type="file"
                accept={accept}
                className="sr-only"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />

            {/* Faux input field (clickable, focusable, supports drag & drop) */}
            <div
                role="button"
                tabIndex={0}
                onClick={() => ref.current?.click()}
                onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") ref.current?.click();
                }}
                onDragOver={(e) => {
                    e.preventDefault();
                    setDrag(true);
                }}
                onDragLeave={() => setDrag(false)}
                onDrop={(e) => {
                    e.preventDefault();
                    setDrag(false);
                    const f = e.dataTransfer.files?.[0];
                    if (f) setFile(f);
                }}
                className={`w-full px-3 py-2 rounded border bg-zinc-900 text-white
          placeholder-zinc-400 border-zinc-700 focus:outline-none
          focus:ring-2 focus:ring-purple-500 transition
          ${drag ? "ring-2 ring-purple-500 border-purple-500" : ""}`}
            >
                <div className="flex items-center justify-between">
                    <span className={`truncate ${file ? "text-white" : "text-zinc-400"}`}>
                        {file ? file.name : "Drag & drop or click to select a file"}
                    </span>
                    <span className="text-xs text-zinc-400 ml-3">({accept})</span>
                </div>
            </div>

            {help && <p className="mt-1 text-xs text-zinc-400">{help}</p>}
        </div>
    );
}

export default function CreatePage() {
    const [name, setName] = useState("");
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [mediaFile, setMediaFile] = useState<File | null>(null);
    const [status, setStatus] = useState("");
    const [busy, setBusy] = useState(false);
    const [result, setResult] = useState<MintResult | null>(null);

    const imagePreview = useMemo(
        () => (imageFile ? URL.createObjectURL(imageFile) : ""),
        [imageFile]
    );
    const mediaPreview = useMemo(
        () => (mediaFile ? URL.createObjectURL(mediaFile) : ""),
        [mediaFile]
    );

    async function handleMint(e: React.FormEvent) {
        e.preventDefault();
        if (busy) return;

        setResult(null);
        setBusy(true);
        setStatus("Uploading to IPFS…");

        try {
            if (!imageFile) {
                setStatus("❌ Please select a cover image.");
                setBusy(false);
                return;
            }

            // 1) Upload to your Pinata route
            const form = new FormData();
            form.append("title", name || "Untitled");
            form.append("description", name ? `NFT: ${name}` : "");
            form.append("file", imageFile);
            if (mediaFile) form.append("media", mediaFile);

            const up = await fetch("/api/ipfs", { method: "POST", body: form });
            const data = await up.json();
            if (!up.ok) throw new Error(data?.error || "Upload failed");
            const { tokenURI, imageURI, animationURI } = data as {
                tokenURI: string;
                imageURI: string;
                animationURI?: string;
            };

            // 2) Connect & mint
            setStatus("Connecting wallet…");
            const { ethereum } = window as any;
            if (!ethereum) throw new Error("MetaMask not found.");
            const provider = new ethers.providers.Web3Provider(ethereum, "any");
            await provider.send("eth_requestAccounts", []);
            await provider.getNetwork(); // stabilizes connection after tx
            const signer = provider.getSigner();

            const contract = new ethers.Contract(
                NFT_ADDRESS,
                (CreatorNFT as any).abi ?? (CreatorNFT as any),
                signer
            );

            setStatus("Sending transaction…");
            const tx = await contract.mintNFT(await signer.getAddress(), tokenURI);
            const receipt = await tx.wait();

            // 3) Extract tokenId from Transfer event
            let tokenId: string | undefined;
            for (const log of receipt.logs) {
                try {
                    const parsed = contract.interface.parseLog(log);
                    if (parsed?.name === "Transfer") {
                        tokenId = parsed.args.tokenId.toString();
                        break;
                    }
                } catch { }
            }

            setResult({ tokenId, txHash: tx.hash, tokenURI, imageURI, animationURI });
            setStatus("✅ NFT minted!");
        } catch (err: any) {
            console.error(err);
            setStatus(`❌ Error: ${err?.message || String(err)}`);
        } finally {
            setBusy(false);
        }
    }

    return (
        <main className="mx-auto max-w-3xl px-4 py-12">
            <h1 className="text-3xl font-bold mb-0">Mint NFT</h1>
            <h2 className="text-2xl font-bold">(Only .mp4 video files will playback in marketplace)</h2>

            <form onSubmit={handleMint} className="space-y-6 mt-6">
                {/* Name */}
                <div>
                    <label className="block text-sm mb-1">Name (optional)</label>
                    <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full px-3 py-2 rounded bg-zinc-900 text-white placeholder-zinc-400 border border-zinc-700 focus:outline-none focus:ring-2 focus:ring-purple-500"
                        placeholder="e.g., Everyday Witch"
                    />
                </div>

                {/* Cover image (required) */}
                <FileField
                    label="Cover Image (required)"
                    required
                    accept="image/*"
                    file={imageFile}
                    setFile={setImageFile}
                />

                {imagePreview && (
                    <div className="mt-2 w-full flex justify-center">
                        <img
                            src={imagePreview}
                            alt="Preview"
                            className="max-w-full max-h-60 h-auto rounded-lg border border-zinc-700"
                        />
                    </div>
                )}




                {/* Audio/Video (optional) */}
                <FileField
                    label="Audio or Video (optional)"
                    accept="audio/*,video/*"
                    file={mediaFile}
                    setFile={setMediaFile}
                    help="This becomes animation_url in metadata."
                />

                {mediaPreview && (
                    <audio controls src={mediaPreview} className="mt-2 w-full" />
                )}

                <button
                    type="submit"
                    disabled={busy}
                    className={`w-full rounded px-4 py-2 ${busy
                        ? "bg-purple-700/60 cursor-not-allowed"
                        : "bg-purple-600 hover:bg-purple-700"
                        }`}
                >
                    {busy ? "Working…" : "Mint NFT"}
                </button>
            </form>

            {status && <p className="mt-4 text-sm text-zinc-200">{status}</p>}

            {result && (
                <div className="mt-6 rounded-xl border border-white/10 bg-zinc-900/60 p-4 text-sm">
                    <div className="font-semibold mb-2">Mint Result</div>
                    {result.tokenId && (
                        <div>
                            Token ID: <span className="font-mono">#{result.tokenId}</span>
                        </div>
                    )}
                    {result.txHash && (
                        <div className="mt-1 break-all">
                            Tx Hash: <span className="font-mono">{result.txHash}</span>
                        </div>
                    )}
                    {result.tokenURI && (
                        <div className="mt-1 break-all">
                            tokenURI: <span className="font-mono">{result.tokenURI}</span>
                        </div>
                    )}
                    {result.imageURI && (
                        <img
                            src={ipfsToHttp(result.imageURI)}
                            alt="Minted NFT"
                            className="mt-3 h-32 rounded"
                        />
                    )}
                    {result.animationURI && (
                        <audio
                            controls
                            src={ipfsToHttp(result.animationURI)}
                            className="mt-3 w-full"
                        />
                    )}
                </div>
            )}
        </main>
    );
}

