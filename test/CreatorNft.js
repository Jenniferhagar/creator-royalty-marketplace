// test/ethers-test.js
const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Ethers v6 sanity", function () {
    it("Should have ethers.parseEther", function () {
        expect(typeof ethers.parseEther).to.equal("function");
        const wei = ethers.parseEther("1");
        expect(wei).to.equal(1000000000000000000n); // 1 ETH in wei (BigInt)
    });
});
