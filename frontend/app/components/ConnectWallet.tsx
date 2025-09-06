"use client";
import { useEffect, useState } from "react";
import { ethers } from "ethers";

export default function ConnectWallet() {
    const [account, setAccount] = useState<string | null>(null);
    const [chain, setChain] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [connecting, setConnecting] = useState(false);

    async function connect() {
        setError(null);
        setConnecting(true);
        try {
            const { ethereum } = window as any;
            if (!ethereum) {
                setError("MetaMask not found");
                return;
            }
            // Known fix: use 'any' and await network before calls
            const provider = new ethers.providers.Web3Provider(ethereum, "any");
            await provider.send("eth_requestAccounts", []);
            const signer = provider.getSigner();
            const addr = await signer.getAddress();
            const net = await provider.getNetwork();
            setAccount(addr);
            setChain(net?.name ?? `chainId ${net?.chainId}`);
        } catch (e: any) {
            setError(e?.message ?? "Failed to connect wallet");
        } finally {
            setConnecting(false);
        }
    }

    // react to account/chain changes
    useEffect(() => {
        const { ethereum } = window as any;
        if (!ethereum) return;
        const onAccounts = (accs: string[]) => setAccount(accs?.[0] ?? null);
        const onChain = () => window.location.reload();
        ethereum.on?.("accountsChanged", onAccounts);
        ethereum.on?.("chainChanged", onChain);
        return () => {
            ethereum.removeListener?.("accountsChanged", onAccounts);
            ethereum.removeListener?.("chainChanged", onChain);
        };
    }, []);

    return (
        <div className="flex flex-col gap-1">
            {!account ? (
                <button
                    onClick={connect}
                    disabled={connecting}
                    className="rounded-xl px-4 py-2 bg-fuchsia-500/80 hover:bg-fuchsia-400 text-black font-semibold transition disabled:opacity-60"
                >
                    {connecting ? "Connecting…" : "Connect Wallet"}
                </button>
            ) : (
                <div className="text-sm text-zinc-300">
                    Connected: <span className="font-mono">{account.slice(0, 6)}…{account.slice(-4)}</span>
                    {chain ? <span className="ml-2 opacity-80">({chain})</span> : null}
                </div>
            )}
            {error ? <div className="text-red-400 text-xs">{error}</div> : null}
        </div>
    );
}
