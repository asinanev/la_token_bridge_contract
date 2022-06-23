const hre = require("hardhat");
const ethers = hre.ethers;

async function deployBridgeContracts() {
  await hre.run("compile");
  const [deployer] = await ethers.getSigners();

  console.log("Deploying contracts with the account: ", deployer.address);
  console.log("Account balance: ", (await deployer.getBalance()).toString());

  const bridgeWrapperFactory = await ethers.getContractFactory("BridgeWrapper");
  const bridgeWrapper = await bridgeWrapperFactory.deploy();
  console.log("Waiting for BridgeWrapper deployment...");
  await bridgeWrapper.deployed();

  const bridgeTokenFactory = await ethers.getContractFactory("BridgeToken");
  const BRGAddress = await bridgeWrapper.BRGToken();
  const bridgeToken = await bridgeTokenFactory.attach(BRGAddress);

  console.log("BridgeWrapper address: ", bridgeWrapper.address);
  console.log("BridgeToken address: ", bridgeToken.address);
  console.log("Done");
}

module.exports = deployBridgeContracts;
