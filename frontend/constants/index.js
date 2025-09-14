import { ethers } from "ethers";
import CreatorNFT from "./abi/CreatorNFT.json";
import Marketplace from "./abi/Marketplace.json";

// Contract addresses (single source of truth)
export const NFT_ADDRESS = "0xf5059a5D33d5853360D16C683c16e67980206f36";
export const MARKET_ADDRESS = "0x95401dc811bb5740090279Ba06cfA8fcF6113778";

export const loadContracts = (signerOrProvider) => {
    return {
        creatorNft: new ethers.Contract(NFT_ADDRESS, CreatorNFT.abi, signerOrProvider),
        marketplace: new ethers.Contract(MARKET_ADDRESS, Marketplace.abi, signerOrProvider)
    };
};

