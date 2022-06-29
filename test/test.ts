import { expect } from "chai";
import { artifacts, web3 } from "hardhat";

const { BN, expectEvent } = require("@openzeppelin/test-helpers");

const Bridge = artifacts.require("Bridge");
const ERC20PresetMinterPauser = artifacts.require("ERC20PresetMinterPauser");

describe("Bridge and BridgeToken testing suite", function () {
  let accounts: string[];
  let bridgeSrc: any;
  let bridgeTrg: any;
  let bridgeToken: any;

  let currentSrcNonce = 0;
  let currentTrgNonce = 0;

  before(async () => {
    accounts = await web3.eth.getAccounts();

    bridgeSrc = await Bridge.new(accounts[0]);
    bridgeTrg = await Bridge.new(accounts[0]);

    bridgeToken = await ERC20PresetMinterPauser.new("BridgeToken", "BRG");
    await bridgeToken.grantRole(
      web3.utils.keccak256("MINTER_ROLE"),
      bridgeTrg.address
    );
  });

  describe("Locking mechanism", function () {
    it("Should revert with reason 'amount is too low'", async function () {
      await expect(
        bridgeSrc.lock(bridgeToken.address, { from: accounts[1] })
      ).to.be.revertedWith("amount is too low");
    });

    it("Should emit LogETHLocked event with senders address and the amount of ETH locked", async function () {
      const lockETHTx = await bridgeSrc.lock(bridgeToken.address, {
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
        bridgeTrg.claim(bridgeToken.address, 0, accounts[1], currentSrcNonce)
      ).to.be.revertedWith("amount is too low");
    });

    it("Should revert with reason 'only gateway has access'", async function () {
      await expect(
        bridgeTrg.claim(bridgeToken.address, 50, accounts[1], currentSrcNonce, {
          from: accounts[1],
        })
      ).to.be.revertedWith("only gateway has access");
    });

    it("Should emit LogETHMinted event with senders address and the amount of BRG minted", async function () {
      const mintETHTx = await bridgeTrg.claim(
        bridgeToken.address,
        25,
        accounts[1],
        currentSrcNonce
      );

      await expectEvent(mintETHTx, "LogTokenMinted", {
        tokenAddress: bridgeToken.address,
        receiver: accounts[1],
        amount: new BN(25),
        nonce: new BN(1),
      });
    });

    it("Should emit LogETHMinted event with senders address and the amount of BRG minted", async function () {
      const mintETHTx = await bridgeTrg.claim(
        bridgeToken.address,
        25,
        accounts[1],
        2
      );

      await expectEvent(mintETHTx, "LogTokenMinted", {
        tokenAddress: bridgeToken.address,
        receiver: accounts[1],
        amount: new BN(25),
        nonce: new BN(2),
      });
    });

    it("Should revert with reason 'transaction already processed'", async function () {
      await expect(
        bridgeTrg.claim(bridgeToken.address, 50, accounts[1], currentSrcNonce)
      ).to.be.revertedWith("transaction already processed");
    });
  });

  describe("Burning mechanism", async function () {
    it("Should be reverted with reason 'amount is too low'", async function () {
      await bridgeToken.approve(bridgeTrg.address, 50, {
        from: accounts[1],
      });

      await expect(
        bridgeTrg.burnFrom(bridgeToken.address, accounts[1], 0)
      ).to.be.revertedWith("amount is too low");
    });

    it("Should be reverted with reason 'only gateway has access'", async function () {
      await bridgeToken.approve(bridgeTrg.address, 50, {
        from: accounts[1],
      });
      await expect(
        bridgeTrg.burnFrom(bridgeToken.address, accounts[1], 50, {
          from: accounts[1],
        })
      ).to.be.revertedWith("only gateway has access");
    });

    it("Should use permits to collect tokens to be burned, burn them and emit a LogTokenBurned event", async function () {
      await bridgeToken.approve(bridgeTrg.address, 50, {
        from: accounts[1],
      });

      const burnTokensTx = await bridgeTrg.burnFrom(
        bridgeToken.address,
        accounts[1],
        50
      );

      await expectEvent(burnTokensTx, "LogTokenBurned", {
        tokenAddress: bridgeToken.address,
        sender: accounts[1],
        amount: new BN(50),
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
        50,
        accounts[1],
        currentTrgNonce
      );
      await expectEvent(releaseETHTx, "LogETHReleased", {
        receiver: accounts[1],
        amount: new BN(50),
        nonce: new BN(1),
      });
    });

    it("Should revert with reason 'transaction already processed'", async function () {
      await expect(bridgeSrc.release(50, accounts[1], 1)).to.be.revertedWith(
        "transaction already processed"
      );
    });
  });
});
