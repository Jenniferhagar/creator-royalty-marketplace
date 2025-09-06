// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/common/ERC2981.sol";

contract CreatorNFT is ERC721URIStorage, Ownable, ERC2981 {
    uint256 private _tokenIds;
    uint96 private constant ROYALTY_FEE_BPS = 500; // 5%

    // OpenZeppelin v4: Ownable has NO constructor args
    constructor(
        address royaltyReceiver
    ) ERC721("CreatorNFT", "CRNFT") Ownable() {
        _setDefaultRoyalty(royaltyReceiver, ROYALTY_FEE_BPS);
    }

    // Matches your frontend call: mintNFT(address to, string tokenURI)
    function mintNFT(
        address to,
        string memory tokenURI_
    ) external returns (uint256) {
        _tokenIds += 1;
        uint256 tokenId = _tokenIds;
        _safeMint(to, tokenId);
        _setTokenURI(tokenId, tokenURI_);
        return tokenId;
    }

    function setRoyaltyReceiver(address receiver) external onlyOwner {
        _setDefaultRoyalty(receiver, ROYALTY_FEE_BPS);
    }

    // IMPORTANT: override the right parents (ERC721URIStorage + ERC2981)
    function supportsInterface(
        bytes4 interfaceId
    ) public view virtual override(ERC721URIStorage, ERC2981) returns (bool) {
        return super.supportsInterface(interfaceId);
    }
}
