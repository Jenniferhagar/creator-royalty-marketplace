// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

// ──────────────────────────────────────────────────────────────────────────────
// Imports
// ──────────────────────────────────────────────────────────────────────────────
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/interfaces/IERC2981.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/introspection/IERC165.sol";

// ──────────────────────────────────────────────────────────────────────────────
// Marketplace
// ──────────────────────────────────────────────────────────────────────────────
contract Marketplace is ReentrancyGuard, Ownable {
    // Fee cap (e.g., 1000 = 10%)
    uint96 public constant MAX_FEE_BPS = 1000;

    // Platform settings (set after deploy via setPlatform)
    address public platformTreasury;
    uint96 public platformFeeBps; // e.g., 250 = 2.5%

    // Listings
    struct Listing {
        address nft;
        uint256 tokenId;
        address payable seller;
        uint256 price; // in wei
        bool active;
    }

    mapping(uint256 => Listing) public listings;
    uint256 public nextListingId;

    // Events
    event Listed(
        uint256 indexed listingId,
        address indexed nft,
        uint256 indexed tokenId,
        address seller,
        uint256 price
    );
    event PriceUpdated(
        uint256 indexed listingId,
        uint256 oldPrice,
        uint256 newPrice
    );
    event Canceled(uint256 indexed listingId);
    event Purchased(
        uint256 indexed listingId,
        address buyer,
        uint256 price,
        uint256 sellerAmt,
        uint256 royaltyAmt,
        uint256 feeAmt
    );
    event PlatformUpdated(address indexed treasury, uint96 feeBps);

    // ──────────────────────────────────────────────────────────────────────────
    // Constructor (no params; avoids deploy‐script changes)
    // ──────────────────────────────────────────────────────────────────────────
    constructor() Ownable() {}

    // ──────────────────────────────────────────────────────────────────────────
    // Admin
    // ──────────────────────────────────────────────────────────────────────────
    function setPlatform(address _treasury, uint96 _feeBps) external onlyOwner {
        require(_treasury != address(0), "TREASURY_ZERO");
        require(_feeBps <= MAX_FEE_BPS, "FEE_TOO_HIGH");
        platformTreasury = _treasury;
        platformFeeBps = _feeBps;
        emit PlatformUpdated(_treasury, _feeBps);
    }

    // ──────────────────────────────────────────────────────────────────────────
    // Listing lifecycle
    // ──────────────────────────────────────────────────────────────────────────
    function listItem(
        address nft,
        uint256 tokenId,
        uint256 price
    ) external returns (uint256 listingId) {
        require(price > 0, "PRICE_ZERO");

        // Seller must own the token and approve marketplace
        require(IERC721(nft).ownerOf(tokenId) == msg.sender, "NOT_OWNER");
        require(
            IERC721(nft).getApproved(tokenId) == address(this) ||
                IERC721(nft).isApprovedForAll(msg.sender, address(this)),
            "NOT_APPROVED"
        );

        listingId = ++nextListingId;
        listings[listingId] = Listing({
            nft: nft,
            tokenId: tokenId,
            seller: payable(msg.sender),
            price: price,
            active: true
        });

        emit Listed(listingId, nft, tokenId, msg.sender, price);
    }

    function updatePrice(uint256 listingId, uint256 newPrice) external {
        Listing storage L = listings[listingId];
        require(L.active, "NOT_ACTIVE");
        require(L.seller == msg.sender, "NOT_SELLER");
        require(newPrice > 0, "PRICE_ZERO");

        uint256 old = L.price;
        L.price = newPrice;
        emit PriceUpdated(listingId, old, newPrice);
    }

    function cancelListing(uint256 listingId) external {
        Listing storage L = listings[listingId];
        require(L.active, "NOT_ACTIVE");
        require(L.seller == msg.sender, "NOT_SELLER");
        L.active = false;
        emit Canceled(listingId);
    }

    // ──────────────────────────────────────────────────────────────────────────
    // Buy
    // ──────────────────────────────────────────────────────────────────────────
    function buy(uint256 listingId) external payable nonReentrant {
        Listing storage L = listings[listingId];

        // CHECKS
        require(L.active, "NOT_ACTIVE");
        require(msg.value == L.price, "BAD_PRICE");

        // Ensure still approved at purchase time
        require(
            IERC721(L.nft).getApproved(L.tokenId) == address(this) ||
                IERC721(L.nft).isApprovedForAll(L.seller, address(this)),
            "NOT_APPROVED_NOW"
        );

        // EFFECTS
        L.active = false;

        // INTERACTIONS
        // 1) Transfer the NFT from seller to buyer
        IERC721(L.nft).safeTransferFrom(L.seller, msg.sender, L.tokenId);

        // 2) Split funds (seller + royalty + fee)
        (
            uint256 sellerAmt,
            uint256 royaltyAmt,
            uint256 feeAmt
        ) = _distributeFunds(L.nft, L.tokenId, L.price, L.seller);

        emit Purchased(
            listingId,
            msg.sender,
            L.price,
            sellerAmt,
            royaltyAmt,
            feeAmt
        );
    }

    // ──────────────────────────────────────────────────────────────────────────
    // Internals
    // ──────────────────────────────────────────────────────────────────────────

    function _distributeFunds(
        address nft,
        uint256 tokenId,
        uint256 salePrice,
        address payable seller
    ) internal returns (uint256 sellerAmt, uint256 royaltyAmt, uint256 feeAmt) {
        (address royaltyRecv, uint256 royalty) = _royaltyInfoIfSupported(
            nft,
            tokenId,
            salePrice
        );
        royaltyAmt = royalty;

        feeAmt = (salePrice * platformFeeBps) / 10_000;
        require(salePrice >= royaltyAmt + feeAmt, "OVERFLOW_SPLIT");

        sellerAmt = salePrice - royaltyAmt - feeAmt;

        // Pay seller
        (bool s1, ) = seller.call{value: sellerAmt}("");
        require(s1, "PAY_SELLER_FAIL");

        // Pay royalty (if any)
        if (royaltyAmt > 0 && royaltyRecv != address(0)) {
            (bool s2, ) = payable(royaltyRecv).call{value: royaltyAmt}("");
            require(s2, "PAY_ROYALTY_FAIL");
        }

        // Pay platform fee (if any)
        if (feeAmt > 0 && platformTreasury != address(0)) {
            (bool s3, ) = payable(platformTreasury).call{value: feeAmt}("");
            require(s3, "PAY_FEE_FAIL");
        }
    }

    // Safely read EIP-2981 if the NFT implements it; otherwise return (0,0)
    function _royaltyInfoIfSupported(
        address nft,
        uint256 tokenId,
        uint256 salePrice
    ) internal view returns (address receiver, uint256 amount) {
        // interfaceId for IERC2981 is 0x2a55205a
        if (IERC165(nft).supportsInterface(type(IERC2981).interfaceId)) {
            (receiver, amount) = IERC2981(nft).royaltyInfo(tokenId, salePrice);
        } else {
            receiver = address(0);
            amount = 0;
        }
    }
}
