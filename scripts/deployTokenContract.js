const hre = require("hardhat");
const ethers = hre.ethers;

async function deployWrappedTokenContract() {
  await hre.run("compile");
  const [deployer] = await ethers.getSigners();

  console.log("Deploying contract with the account: ", deployer.address);
  console.log("Account balance: ", (await deployer.getBalance()).toString());

  const bridgeFactory = await ethers.getContractFactory("WrappedToken");
  const bridge = await bridgeFactory.deploy();
  console.log("Waiting for WrappedToken deployment...");
  await bridge.deployed();

  console.log("WrappedToken address: ", bridge.address);
  console.log("Done");
}

module.exports = deployWrappedTokenContract;
