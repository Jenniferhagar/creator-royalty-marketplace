"use client";


import React, { createContext, useState, useEffect } from "react";
import { ethers } from "ethers";
import Web3Modal from "web3modal";

export const Web3Context = createContext();

export const Web3Provider = ({ children }) => {
    const [provider, setProvider] = useState(null);
    const [signer, setSigner] = useState(null);
    const [address, setAddress] = useState(null);

    useEffect(() => {
        if (window.ethereum) {
            const web3Modal = new Web3Modal({
                cacheProvider: true,
            });

            if (web3Modal.cachedProvider) {
                connectWallet();
            }
        }
    }, []);

    const connectWallet = async () => {
        try {
            const web3Modal = new Web3Modal();
            const instance = await web3Modal.connect();
            const provider = new ethers.BrowserProvider(instance);
            const signer = await provider.getSigner();
            const address = await signer.getAddress();

            setProvider(provider);
            setSigner(signer);
            setAddress(address);
        } catch (error) {
            console.error("Wallet connection failed", error);
        }
    };

    return (
        <Web3Context.Provider
            value={{ provider, signer, address, connectWallet }}
        >
            {children}
        </Web3Context.Provider>
    );
};
