import { ethers } from "ethers";
import config from "../config.json";
import CreatorNFT from "./abi/CreatorNFT.json";
import Marketplace from "./abi/Marketplace.json";


export const loadContracts = (chainId, signerOrProvider) => {
    const addresses = config[chainId];
    if (!addresses) throw new Error("No contract addresses for this chain");

    return {
        creatorNft: new ethers.Contract(
            addresses.creatorNft,
            CreatorNFT.abi,
            signerOrProvider
        ),
        marketplace: new ethers.Contract(
            addresses.marketplace,
            Marketplace.abi,
            signerOrProvider
        )
    };
};
