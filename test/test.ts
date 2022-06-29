import { expect } from "chai";
import { artifacts, web3 } from "hardhat";

const { BN, expectEvent } = require("@openzeppelin/test-helpers");

const Bridge = artifacts.require("Bridge");
const WrappedToken = artifacts.require("WrappedToken");

describe("Bridge and BridgeToken testing suite", function () {
  let accounts: string[];
  let bridgeSrc: any;
  let bridgeTrg: any;
  let nativeToken: any;
  let remoteToken: any;

  let currentSrcNonce = 0;
  let currentTrgNonce = 0;

  before(async () => {
    accounts = await web3.eth.getAccounts();

    bridgeSrc = await Bridge.new(accounts[0]);
    bridgeTrg = await Bridge.new(accounts[0]);

    nativeToken = await WrappedToken.new();
  });

  describe("Locking mechanism", function () {
    it("Should revert with reason 'amount is too low'", async function () {
      await expect(
        bridgeSrc.lock(nativeToken.address, { from: accounts[1] })
      ).to.be.revertedWith("amount is too low");
    });

    it("Should emit LogETHLocked event with senders address and the amount of ETH locked", async function () {
      const lockETHTx = await bridgeSrc.lock(nativeToken.address, {
        from: accounts[1],
        value: 50,
      });
      await expectEvent(lockETHTx, "LogETHLocked", {
        sender: accounts[1],
        amount: new BN(50),
        nonce: new BN(1),
      });

      currentSrcNonce = lockETHTx.logs[0].args[3];
    });
  });

  describe("Minting mechanism", function () {
    it("Should revert with reason 'amount is too low'", async function () {
      await expect(
        bridgeTrg.claim(nativeToken.address, 0, accounts[2], currentSrcNonce)
      ).to.be.revertedWith("amount is too low");
    });

    it("Should revert with reason 'only gateway has access'", async function () {
      await expect(
        bridgeTrg.claim(nativeToken.address, 50, accounts[2], currentSrcNonce, {
          from: accounts[2],
        })
      ).to.be.revertedWith("only gateway has access");
    });

    it("Should emit LogTokenMinted event with senders address and the amount of BRG minted", async function () {
      const mintETHTx = await bridgeTrg.claim(
        nativeToken.address,
        50,
        accounts[2],
        currentSrcNonce
      );

      await expectEvent(mintETHTx, "LogTokenMinted");
      remoteToken = await WrappedToken.at(mintETHTx.logs[0].args[0]);
    });

    it("Should revert with reason 'transaction already processed'", async function () {
      await expect(
        bridgeTrg.claim(nativeToken.address, 50, accounts[2], currentSrcNonce)
      ).to.be.revertedWith("transaction already processed");
    });
  });

  describe("Burning mechanism", async function () {
    it("Should be reverted with reason 'amount is too low'", async function () {
      await expect(
        bridgeTrg.burnFrom(nativeToken.address, accounts[2], 0)
      ).to.be.revertedWith("amount is too low");
    });

    it("Should be reverted with reason 'only gateway has access'", async function () {
      await expect(
        bridgeTrg.burnFrom(nativeToken.address, accounts[2], 50, {
          from: accounts[2],
        })
      ).to.be.revertedWith("only gateway has access");
    });

    it("Should collect tokens to be burned, burn them and emit a LogTokenBurned event", async function () {
      const approvalTx = await remoteToken.approve(bridgeTrg.address, 50, {
        from: accounts[2],
      });

      await expectEvent(approvalTx, "Approval", {
        owner: accounts[2],
        spender: bridgeTrg.address,
        value: new BN(50),
      });

      const burnTokensTx = await bridgeTrg.burnFrom(
        nativeToken.address,
        accounts[2],
        25
      );

      await expectEvent(burnTokensTx, "LogTokenBurned", {
        tokenAddress: nativeToken.address,
        sender: accounts[2],
        amount: new BN(25),
        nonce: new BN(1),
      });

      currentTrgNonce = burnTokensTx.logs[0].args[3];
    });
  });

  describe("Release mechanism", async function () {
    it("Should revert with reason 'only gateway has access'", async function () {
      await expect(
        bridgeSrc.release(0, accounts[1], currentTrgNonce, {
          from: accounts[1],
        })
      ).to.be.revertedWith("only gateway has access");
    });

    it("Should revert with reason 'amount is too low'", async function () {
      await expect(bridgeSrc.release(0, accounts[1], 1)).to.be.revertedWith(
        "amount is too low"
      );
    });

    it("Should release the locked tokens and send them to the receiver, then emit LogETHReleased event", async function () {
      const releaseETHTx = await bridgeSrc.release(
        25,
        accounts[1],
        currentTrgNonce
      );
      await expectEvent(releaseETHTx, "LogETHReleased", {
        receiver: accounts[1],
        amount: new BN(25),
        nonce: new BN(1),
      });
    });

    it("Should revert with reason 'transaction already processed'", async function () {
      await expect(bridgeSrc.release(25, accounts[1], 1)).to.be.revertedWith(
        "transaction already processed"
      );
    });
  });
});
