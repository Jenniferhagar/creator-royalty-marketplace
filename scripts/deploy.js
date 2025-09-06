// scripts/deploy.js
const hre = require("hardhat");

async function main() {
    const [deployer] = await hre.ethers.getSigners();
    console.log("Deploying contracts with:", deployer.address);

    // Deploy CreatorNFT
    const CreatorNFT = await hre.ethers.getContractFactory("CreatorNFT");
    const nft = await CreatorNFT.deploy(deployer.address); // only one arg!
    await nft.waitForDeployment();
    console.log("CreatorNFT deployed to:", await nft.getAddress());


    // Deploy Marketplace (assuming it needs the NFT address)
    const Marketplace = await hre.ethers.getContractFactory("Marketplace");
    const marketplace = await Marketplace.deploy(); // no args
    await marketplace.waitForDeployment();
    console.log("Marketplace deployed to:", await marketplace.getAddress());
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
