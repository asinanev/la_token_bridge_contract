const hre = require("hardhat");
const ethers = hre.ethers;

async function deployBridgeContracts() {
  await hre.run("compile");
  const [deployer] = await ethers.getSigners();

  console.log("Deploying contract with the account: ", deployer.address);
  console.log("Account balance: ", (await deployer.getBalance()).toString());

  const bridgeFactory = await ethers.getContractFactory("Bridge");
  const bridge = await bridgeFactory.deploy();
  console.log("Waiting for Bridge deployment...");
  await bridge.deployed();

  console.log("Bridge address: ", bridge.address);
  console.log("Done");
}

module.exports = deployBridgeContracts;
