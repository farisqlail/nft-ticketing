// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract TicketNFT is ERC721URIStorage, Ownable {
    uint256 private _nextTokenId;
    
    // Configurable LINK token address (or mock ERC-20 on local node)
    address public linkToken;
    
    uint256 public ethPrice = 0.001 ether;
    uint256 public linkPrice = 5 * 10**18; // 5 LINK (18 decimals)

    event TicketMinted(address indexed to, uint256 indexed tokenId, string tokenURI, string paymentMethod);

    constructor(address _linkToken) ERC721("Web3EventTicket", "WET") Ownable(msg.sender) {
        require(_linkToken != address(0), "Invalid token address");
        linkToken = _linkToken;
    }

    // Buy ticket with ETH
    function buyWithETH(string memory uri) public payable returns (uint256) {
        require(msg.value >= ethPrice, "Insufficient ETH sent");
        
        uint256 tokenId = _nextTokenId++;
        _safeMint(msg.sender, tokenId);
        _setTokenURI(tokenId, uri);
        
        emit TicketMinted(msg.sender, tokenId, uri, "ETH");
        return tokenId;
    }

    // Buy ticket with LINK
    function buyWithLINK(string memory uri) public returns (uint256) {
        IERC20 link = IERC20(linkToken);
        require(link.balanceOf(msg.sender) >= linkPrice, "Insufficient LINK balance");
        require(link.allowance(msg.sender, address(this)) >= linkPrice, "LINK allowance too low");
        
        // Transfer LINK from user to this contract
        bool success = link.transferFrom(msg.sender, address(this), linkPrice);
        require(success, "LINK transfer failed");

        uint256 tokenId = _nextTokenId++;
        _safeMint(msg.sender, tokenId);
        _setTokenURI(tokenId, uri);
        
        emit TicketMinted(msg.sender, tokenId, uri, "LINK");
        return tokenId;
    }

    // Owner functions to withdraw funds
    function withdrawETH() public onlyOwner {
        payable(owner()).transfer(address(this).balance);
    }

    // Withdraw ERC-20 tokens
    function withdrawERC20(address token) public onlyOwner {
        IERC20 erc20 = IERC20(token);
        erc20.transfer(owner(), erc20.balanceOf(address(this)));
    }

    function setPrices(uint256 _ethPrice, uint256 _linkPrice) public onlyOwner {
        ethPrice = _ethPrice;
        linkPrice = _linkPrice;
    }
}
