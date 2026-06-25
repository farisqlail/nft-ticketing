import { expect } from "chai";
import { ethers } from "hardhat";

describe("TicketNFT Multi-Token Purchase Test", function () {
  let mockToken: any;
  let ticketNFT: any;
  let owner: any;
  let buyer: any;
  const ticketPriceEth = ethers.parseEther("0.001");
  const ticketPriceLink = ethers.parseEther("5"); // 5 tokens

  beforeEach(async function () {
    [owner, buyer] = await ethers.getSigners();

    // 1. Deploy MockToken (representing LINK)
    const MockToken = await ethers.getContractFactory("MockToken");
    mockToken = await MockToken.deploy();
    await mockToken.waitForDeployment();

    // 2. Deploy TicketNFT passing the MockToken address
    const TicketNFT = await ethers.getContractFactory("TicketNFT");
    ticketNFT = await TicketNFT.deploy(await mockToken.getAddress());
    await ticketNFT.waitForDeployment();

    // 3. Transfer some mock tokens to buyer and verify balance
    await mockToken.transfer(buyer.address, ethers.parseEther("100"));
  });

  it("Should allow buying ticket with ETH", async function () {
    const uri = "https://api.velotix.io/metadata/1";
    
    // Buyer purchases ticket with ETH
    await expect(
      ticketNFT.connect(buyer).buyWithETH(uri, { value: ticketPriceEth })
    ).to.emit(ticketNFT, "TicketMinted")
     .withArgs(buyer.address, 0n, uri, "ETH");

    // Verify buyer owns the NFT (tokenId 0)
    expect(await ticketNFT.ownerOf(0)).to.equal(buyer.address);
    expect(await ticketNFT.tokenURI(0)).to.equal(uri);
  });

  it("Should allow buying ticket with LINK token", async function () {
    const uri = "https://api.velotix.io/metadata/2";
    
    // 1. Approve TicketNFT contract to spend buyer's LINK tokens
    await mockToken.connect(buyer).approve(await ticketNFT.getAddress(), ticketPriceLink);

    // 2. Buyer purchases ticket with LINK
    await expect(
      ticketNFT.connect(buyer).buyWithLINK(uri)
    ).to.emit(ticketNFT, "TicketMinted")
     .withArgs(buyer.address, 0n, uri, "LINK");

    // Verify buyer owns the NFT (tokenId 0)
    expect(await ticketNFT.ownerOf(0)).to.equal(buyer.address);
    expect(await ticketNFT.tokenURI(0)).to.equal(uri);

    // Verify token balance of buyer is reduced and contract has received the tokens
    expect(await mockToken.balanceOf(buyer.address)).to.equal(ethers.parseEther("95"));
    expect(await mockToken.balanceOf(await ticketNFT.getAddress())).to.equal(ticketPriceLink);
  });

  it("Should revert if buyer has insufficient LINK balance", async function () {
    const uri = "https://api.velotix.io/metadata/3";
    const brokeBuyer = (await ethers.getSigners())[2]; // Has 0 mock LINK

    await mockToken.connect(brokeBuyer).approve(await ticketNFT.getAddress(), ticketPriceLink);

    await expect(
      ticketNFT.connect(brokeBuyer).buyWithLINK(uri)
    ).to.be.revertedWith("Insufficient LINK balance");
  });

  it("Should revert if buyer has not approved enough allowance", async function () {
    const uri = "https://api.velotix.io/metadata/4";
    
    // Approve less than required price
    await mockToken.connect(buyer).approve(await ticketNFT.getAddress(), ethers.parseEther("2"));

    await expect(
      ticketNFT.connect(buyer).buyWithLINK(uri)
    ).to.be.revertedWith("LINK allowance too low");
  });
});
