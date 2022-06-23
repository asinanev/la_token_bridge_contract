import { ethers } from "hardhat";
import { expect } from "chai";
import { Contract } from "ethers";

describe("BridgeWrapper", function () {
  let bridgeWrapperFactory;
  let bridgeWrapper: Contract;

  let bridgeTokenFactory;
  let BRGAddress;
  let bridgeToken: Contract;

  before(async () => {
    bridgeWrapperFactory = await ethers.getContractFactory("BridgeWrapper");
    bridgeWrapper = await bridgeWrapperFactory.deploy();
    await bridgeWrapper.deployed();
    bridgeTokenFactory = await ethers.getContractFactory("BridgeToken");
    BRGAddress = await bridgeWrapper.BRGToken();
    bridgeToken = await bridgeTokenFactory.attach(BRGAddress);
  });

  it("Should revert with reason 'We need to lock at least 1 wei'", async function () {
    const [, addr1] = await ethers.getSigners();
    await expect(bridgeWrapper.connect(addr1).lock()).to.be.revertedWith(
      "We need to lock at least 1 wei"
    );
  });

  it("Should emit LogETHLocked event with senders address and the amount of ETH locked", async function () {
    const [, addr1] = await ethers.getSigners();
    const lockETHTx = await bridgeWrapper.connect(addr1).lock({ value: 50 });
    await lockETHTx.wait();
    expect(lockETHTx.from).to.equal(addr1.address);
    expect(lockETHTx.value).to.equal(50);
    expect(await bridgeWrapper.viewLockedETH()).to.equal(
      ethers.BigNumber.from("50")
    );
  });

  it("Should revert with reason 'We need to lock at least 1 wei'", async function () {
    const [, addr1] = await ethers.getSigners();
    await expect(bridgeWrapper.connect(addr1).mint(0)).to.be.revertedWith(
      "We need to mint at least 1 wei"
    );
  });

  it("Should emit LogETHMinted event with senders address and the amount of BRG minted", async function () {
    const [, addr1] = await ethers.getSigners();
    const mintETHTx = await bridgeWrapper.connect(addr1).mint(50);
    await mintETHTx.wait();
    expect(mintETHTx.from).to.equal(addr1.address);
  });

  it("Addr1 should have 50 ERC20 tokens", async function () {
    const [, addr1] = await ethers.getSigners();
    await expect(
      await bridgeWrapper.connect(addr1).getBalanceOf(addr1.address)
    ).to.equal(ethers.BigNumber.from("50"));
  });

  it("Should revert with reason 'We need to unwrap at least 1 wei'", async function () {
    const [, addr1] = await ethers.getSigners();
    await expect(bridgeWrapper.connect(addr1).unwrap(0)).to.be.revertedWith(
      "We need to unwrap at least 1 wei"
    );
  });

  it("Should emit LogETHUnwrapped event with senders address and the amount of BRG unwrapped", async function () {
    const [, addr1] = await ethers.getSigners();
    const approveTx = await bridgeToken
      .connect(addr1)
      .approve(bridgeWrapper.address, 30);
    await approveTx.wait();
    const unwrapETHTx = await bridgeWrapper.connect(addr1).unwrap(30);
    await unwrapETHTx.wait();
    expect(unwrapETHTx.from).to.equal(addr1.address);
    expect(await bridgeWrapper.getBalanceOf(addr1.address)).to.equal(
      ethers.BigNumber.from("20")
    );
  });

  it("Should revert with reason 'We need to unlock at least 1 wei'", async function () {
    const [, addr1] = await ethers.getSigners();
    await expect(bridgeWrapper.connect(addr1).withdraw(0)).to.be.revertedWith(
      "We need to unlock at least 1 wei"
    );
  });

  it("Should revert with message 'Not sufficient funds in contract'", async function () {
    const [, addr1] = await ethers.getSigners();
    await expect(bridgeWrapper.connect(addr1).withdraw(100)).to.be.revertedWith(
      "Not sufficient funds in contract"
    );
  });

  it("Should emit LogETHWithdrawn event with senders address and the amount of ETH withdrawn", async function () {
    const [, addr1] = await ethers.getSigners();
    const unlockETHTx = await bridgeWrapper.connect(addr1).withdraw(30);
    await unlockETHTx.wait();
    expect(unlockETHTx.from).to.equal(addr1.address);
    expect(await bridgeWrapper.viewLockedETH()).to.equal(
      ethers.BigNumber.from("20")
    );
  });
});
