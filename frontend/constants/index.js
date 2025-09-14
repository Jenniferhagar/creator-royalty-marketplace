import { ethers } from "ethers";
import CreatorNFT from "./abi/CreatorNFT.json";
import Marketplace from "./abi/Marketplace.json";

// Contract addresses (single source of truth)
export const NFT_ADDRESS = "0xDc64a140Aa3E981100a9becA4E685f962f0cF6C9";
export const MARKET_ADDRESS = "0x5FC8d32690cc91D4c39d9d3abcBD16989F875707";

export const loadContracts = (signerOrProvider) => {
    return {
        creatorNft: new ethers.Contract(NFT_ADDRESS, CreatorNFT.abi, signerOrProvider),
        marketplace: new ethers.Contract(MARKET_ADDRESS, Marketplace.abi, signerOrProvider)
    };
};

