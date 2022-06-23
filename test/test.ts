import { ethers } from "hardhat";
import { expect } from "chai";

describe("BridgeWrapper", function () {
  let bridgeWrapperFactory;
  let bridgeWrapper;

  before(async () => {
    bridgeWrapperFactory = await ethers.getContractFactory("BridgeWrapper");
    bridgeWrapper = await bridgeWrapperFactory.deploy();
    await bridgeWrapper.deployed();
  });

  if ("Should emit LogETHLocked event with senders address and the amount of ETH locked", async function () {

  });

});
