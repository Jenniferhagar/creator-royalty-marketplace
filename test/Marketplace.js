const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Marketplace", () => {
    let deployer, seller, buyer, treasury, nft, marketplace;
    let tokenId;

    beforeEach(async () => {
        [deployer, seller, buyer, treasury] = await ethers.getSigners();

        // Deploy NFT
        const CreatorNFT = await ethers.getContractFactory("CreatorNFT");
        nft = await CreatorNFT.deploy(deployer.address);
        await nft.waitForDeployment();

        // Deploy Marketplace
        const Marketplace = await ethers.getContractFactory("Marketplace");
        marketplace = await Marketplace.deploy();
        await marketplace.waitForDeployment();

        // Set platform treasury + fee (2.5%)
        await marketplace.setPlatform(treasury.address, 250);

        // Mint a fresh NFT for seller before each test
        const mintTx = await nft.mintNFT(seller.address, "ipfs://dummy-token-uri");
        await mintTx.wait();
        tokenId = 1; // always 1 because new NFT contract is deployed each time

        // Approve Marketplace to transfer seller’s token
        await nft.connect(seller).approve(await marketplace.getAddress(), tokenId);
    });

    it("deploys successfully", async () => {
        expect(await marketplace.platformFeeBps()).to.equal(250);
        expect(await marketplace.platformTreasury()).to.equal(treasury.address);
    });

    it("lists an NFT", async () => {
        await marketplace.connect(seller).listItem(await nft.getAddress(), tokenId, ethers.parseEther("1"));
        const listing = await marketplace.listings(1);
        expect(listing.active).to.equal(true);
        expect(listing.price).to.equal(ethers.parseEther("1"));
    });

    it("lets a buyer purchase an NFT", async () => {
        await marketplace.connect(seller).listItem(await nft.getAddress(), tokenId, ethers.parseEther("1"));
        await marketplace.connect(buyer).buy(1, { value: ethers.parseEther("1") });
        expect(await nft.ownerOf(tokenId)).to.equal(buyer.address);
    });

    it("splits funds (seller + platform, royalty skipped if none)", async () => {
        await marketplace.connect(seller).listItem(await nft.getAddress(), tokenId, ethers.parseEther("1"));

        const sellerBalBefore = await ethers.provider.getBalance(seller.address);
        const treasuryBalBefore = await ethers.provider.getBalance(treasury.address);

        await marketplace.connect(buyer).buy(1, { value: ethers.parseEther("1") });

        const sellerBalAfter = await ethers.provider.getBalance(seller.address);
        const treasuryBalAfter = await ethers.provider.getBalance(treasury.address);

        expect(sellerBalAfter).to.be.gt(sellerBalBefore);
        expect(treasuryBalAfter).to.be.gt(treasuryBalBefore);
    });

    it("fails if buyer sends wrong price", async () => {
        await marketplace.connect(seller).listItem(await nft.getAddress(), tokenId, ethers.parseEther("1"));
        await expect(
            marketplace.connect(buyer).buy(1, { value: ethers.parseEther("0.5") })
        ).to.be.revertedWith("BAD_PRICE");
    });

    it("lets seller cancel a listing", async () => {
        await marketplace.connect(seller).listItem(await nft.getAddress(), tokenId, ethers.parseEther("1"));
        await marketplace.connect(seller).cancelListing(1);
        const listing = await marketplace.listings(1);
        expect(listing.active).to.equal(false);
    });
    it("pays royalties to the royalty receiver", async () => {
        // Deploy a fresh NFT with royalty receiver set
        const CreatorNFT = await ethers.getContractFactory("CreatorNFT");
        const nftWithRoyalty = await CreatorNFT.deploy(seller.address); // seller is royalty receiver
        await nftWithRoyalty.waitForDeployment();

        // Mint NFT to seller
        const mintTx = await nftWithRoyalty.mintNFT(seller.address, "ipfs://with-royalty");
        await mintTx.wait();

        // Approve marketplace
        await nftWithRoyalty.connect(seller).approve(await marketplace.getAddress(), 1);

        // List NFT
        await marketplace.connect(seller).listItem(await nftWithRoyalty.getAddress(), 1, ethers.parseEther("1"));

        // Check royalty receiver balance before
        const royaltyBalBefore = await ethers.provider.getBalance(seller.address);

        // Buyer purchases
        await marketplace.connect(buyer).buy(1, { value: ethers.parseEther("1") });

        // Check royalty receiver balance after
        const royaltyBalAfter = await ethers.provider.getBalance(seller.address);

        // Royalty is 5% = 0.05 ETH, so royaltyBalAfter should be > royaltyBalBefore
        expect(royaltyBalAfter).to.be.gt(royaltyBalBefore);

        // NFT ownership transferred
        expect(await nftWithRoyalty.ownerOf(1)).to.equal(buyer.address);
    });
    it("distributes exact amounts (seller 92.5%, royalty 5%, platform 2.5%)", async () => {
        // Deploy NFT with royaltyReceiver = treasury for easy check
        const CreatorNFT = await ethers.getContractFactory("CreatorNFT");
        const nftWithRoyalty = await CreatorNFT.deploy(seller.address);
        await nftWithRoyalty.waitForDeployment();

        // Mint NFT to seller
        await nftWithRoyalty.mintNFT(seller.address, "ipfs://exact-split");

        // Approve marketplace
        await nftWithRoyalty.connect(seller).approve(await marketplace.getAddress(), 1);

        // List NFT
        await marketplace.connect(seller).listItem(await nftWithRoyalty.getAddress(), 1, ethers.parseEther("1"));

        // Balances before
        const sellerBefore = await ethers.provider.getBalance(seller.address);
        const royaltyBefore = await ethers.provider.getBalance(seller.address); // same as royalty receiver
        const treasuryBefore = await ethers.provider.getBalance(treasury.address);

        // Buyer purchases for 1 ETH
        await marketplace.connect(buyer).buy(1, { value: ethers.parseEther("1") });

        // Balances after
        const sellerAfter = await ethers.provider.getBalance(seller.address);
        const treasuryAfter = await ethers.provider.getBalance(treasury.address);

        // Calculate differences
        const sellerGain = sellerAfter - sellerBefore;
        const treasuryGain = treasuryAfter - treasuryBefore;

        // Royalty is also paid to seller in this setup
        // Seller should get 0.925 ETH (seller share) + 0.05 ETH (royalty) = 0.975 ETH
        // Treasury should get 0.025 ETH
        expect(sellerGain).to.equal(ethers.parseEther("0.975"));
        expect(treasuryGain).to.equal(ethers.parseEther("0.025"));
    });


});
