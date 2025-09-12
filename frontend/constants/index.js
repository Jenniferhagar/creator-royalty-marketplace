import { ethers } from "ethers";
import CreatorNFT from "./abi/CreatorNFT.json";
import Marketplace from "./abi/Marketplace.json";

// Contract addresses (single source of truth)
export const NFT_ADDRESS = "0x5FbDB2315678afecb367f032d93F642f64180aa3";
export const MARKET_ADDRESS = "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512";

export const loadContracts = (signerOrProvider) => {
    return {
        creatorNft: new ethers.Contract(NFT_ADDRESS, CreatorNFT.abi, signerOrProvider),
        marketplace: new ethers.Contract(MARKET_ADDRESS, Marketplace.abi, signerOrProvider)
    };
};

