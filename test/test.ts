import { expect } from "chai";
import { artifacts, web3 } from "hardhat";

const { BN, constants, expectEvent } = require("@openzeppelin/test-helpers");

const Bridge = artifacts.require("Bridge");
const WrappedToken = artifacts.require("WrappedToken");

describe("Bridge and BridgeToken testing suite", function () {
  let accounts: string[];
  let bridgeSrc: any;
  let bridgeTrg: any;
  let nativeToken: any;
  let remoteToken: any;

  before(async () => {
    accounts = await web3.eth.getAccounts();

    bridgeSrc = await Bridge.new();
    bridgeTrg = await Bridge.new();

    nativeToken = await WrappedToken.new();
  });

  describe("Locking mechanism", function () {
    it("Should revert with reason 'amount is too low' for bridging fees", async function () {
      await expect(
        bridgeSrc.lock(nativeToken.address, 50, { from: accounts[1] })
      ).to.be.revertedWith("amount is too low");
    });

    it("Should revert with reason 'amount is too low' for token amount", async function () {
      await expect(
        bridgeSrc.lock(nativeToken.address, 0, {
          from: accounts[1],
          value: 50,
        })
      ).to.be.revertedWith("amount is too low");
    });

    it("Should emit LogTokensLocked event with senders address and the amount of ETH locked", async function () {
      await nativeToken.mint(accounts[1], 50);
      await nativeToken.approve(bridgeSrc.address, 50, {
        from: accounts[1],
      });

      const lockETHTx = await bridgeSrc.lock(nativeToken.address, 50, {
        from: accounts[1],
        value: 50,
      });

      await expectEvent(lockETHTx, "LogTokensLocked", {
        sender: accounts[1],
        amount: new BN(50),
      });
    });
  });

  describe("Minting mechanism", function () {
    it("Should revert with reason 'cannot use the zero address'", async function () {
      await expect(
        bridgeTrg.claim(
          nativeToken.address,
          "Wrapped Token",
          "WTKN",
          20,
          constants.ZERO_ADDRESS
        )
      ).to.be.revertedWith("cannot use the zero address");
    });
    it("Should revert with reason 'amount is too low'", async function () {
      await expect(
        bridgeTrg.claim(
          nativeToken.address,
          "Wrapped Token",
          "WTKN",
          0,
          accounts[2]
        )
      ).to.be.revertedWith("amount is too low");
    });

    it("Should emit LogTokensClaimed event with senders address and the amount of WTKN minted", async function () {
      const mintETHTx = await bridgeTrg.claim(
        nativeToken.address,
        "Wrapped Token",
        "WTKN",
        25,
        accounts[2]
      );

      await expectEvent(mintETHTx, "LogTokensClaimed");
      remoteToken = await WrappedToken.at(mintETHTx.logs[0].args[0]);
    });

    it("Should emit LogTokensClaimed event with senders address and the amount of WTKN minted", async function () {
      const mintETHTx = await bridgeTrg.claim(
        nativeToken.address,
        "Wrapped Token",
        "WTKN",
        25,
        accounts[2]
      );

      await expectEvent(mintETHTx, "LogTokensClaimed");
      remoteToken = await WrappedToken.at(mintETHTx.logs[0].args[0]);
    });

    it("Should return the remote token address", async function () {
      expect(
        await bridgeTrg.getCorrespondingContract(nativeToken.address)
      ).to.be.equal(remoteToken.address);
    });
  });

  describe("Burning mechanism", async function () {
    it("Should be reverted with reason 'amount is too low'", async function () {
      await expect(
        bridgeTrg.burn(nativeToken.address, 0, { from: accounts[2] })
      ).to.be.revertedWith("amount is too low");
    });

    it("Should be reverted with reason 'token contract unknown'", async function () {
      await expect(
        bridgeTrg.burn(constants.ZERO_ADDRESS, 50, { from: accounts[2] })
      ).to.be.revertedWith("token contract unknown");
    });

    it("Should collect tokens to be burned, burn them and emit a LogTokensBurned event", async function () {
      const approvalTx = await remoteToken.approve(bridgeTrg.address, 50, {
        from: accounts[2],
      });

      await expectEvent(approvalTx, "Approval", {
        owner: accounts[2],
        spender: bridgeTrg.address,
        value: new BN(50),
      });

      const burnTokensTx = await bridgeTrg.burn(nativeToken.address, 25, {
        from: accounts[2],
      });

      await expectEvent(burnTokensTx, "LogTokensBurned", {
        tokenAddress: nativeToken.address,
        sender: accounts[2],
        amount: new BN(25),
      });
    });
  });

  describe("Release mechanism", async function () {
    it("Should revert with reason 'amount is too low'", async function () {
      await expect(
        bridgeSrc.release(nativeToken.address, accounts[1], 0)
      ).to.be.revertedWith("amount is too low");
    });

    it("Should release the locked tokens and send them to the receiver, then emit LogTokensReleased event", async function () {
      const releaseETHTx = await bridgeSrc.release(
        nativeToken.address,
        accounts[1],
        25,
        { from: accounts[1] }
      );

      await expectEvent(releaseETHTx, "LogTokensReleased", {
        receiver: accounts[1],
        amount: new BN(25),
      });
    });
  });
});
