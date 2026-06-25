import { ethers, network } from "hardhat";

async function main() {
  if (network.name === "sepolia") {
    const privateKey = process.env.PRIVATE_KEY;
    if (!privateKey || privateKey === "your_private_key_here") {
      throw new Error("Missing or invalid PRIVATE_KEY in contracts/.env! Please edit the file and paste your real private key.");
    }
  }

  let linkTokenAddress = "0x779877A7B0D9E8603169DdbD7836e478b4624789"; // Sepolia LINK default

  if (network.name === "hardhat" || network.name === "localhost") {
    console.log("Local network detected. Deploying MockToken first...");
    const MockToken = await ethers.getContractFactory("MockToken");
    const mockToken = await MockToken.deploy();
    await mockToken.waitForDeployment();
    linkTokenAddress = await mockToken.getAddress();
    console.log(`MockToken (LINK) deployed to: ${linkTokenAddress}`);
  }

  const TicketNFT = await ethers.getContractFactory("TicketNFT");
  const ticketNFT = await TicketNFT.deploy(linkTokenAddress);
  await ticketNFT.waitForDeployment();

  console.log(`TicketNFT deployed to: ${await ticketNFT.getAddress()}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
