import { expect } from "chai";
import { artifacts, ethers, web3 } from "hardhat";

const { BN, expectEvent } = require("@openzeppelin/test-helpers");

const Bridge = artifacts.require("Bridge");
const BridgeToken = artifacts.require("BridgeTokenBase");

describe("Bridge and BridgeToken testing suite", function () {
  let accounts: string[];
  let bridgeSrc: any;
  let bridgeTrg: any;
  let bridgeToken: any;

  let currentSrcNonce = 0;
  let currentTrgNonce = 0;

  async function onAttemptToApprove(
    _contractAddress: String,
    _owner: String,
    _spender: String,
    _value: String
  ) {
    const nonce = await bridgeToken.nonces(_owner); // Our Token Contract Nonces
    const deadline = +new Date() + 60 * 60; // Permit with deadline which the permit is valid

    const EIP712Domain = [
      // array of objects -> properties from the contract and the types of them ircwithPermit
      { name: "name", type: "string" },
      { name: "version", type: "string" },
      { name: "verifyingContract", type: "address" },
    ];

    const domain = {
      name: "BridgeTokenBase",
      version: "1",
      verifyingContract: _contractAddress,
    };

    const Permit = [
      // array of objects -> properties from erc20withpermit
      { name: "owner", type: "address" },
      { name: "spender", type: "address" },
      { name: "value", type: "uint256" },
      { name: "nonce", type: "uint256" },
      { name: "deadline", type: "uint256" },
    ];

    const message = {
      owner: _owner, // Wallet Address
      spender: _spender, // This is the address of the spender whe want to give permit to.
      value: _value,
      nonce: nonce.toString(16),
      deadline,
    };

    const data = JSON.stringify({
      types: {
        EIP712Domain,
        Permit,
      },
      domain,
      primaryType: "Permit",
      message,
    });

    const signatureLike = await web3.eth.sign(data || "", accounts[1]);
    console.log(signatureLike);
    const signature = await ethers.utils.splitSignature(signatureLike);

    const preparedSignature = {
      v: signature.v,
      r: signature.r,
      s: signature.s,
      deadline,
    };

    return preparedSignature;
  }

  before(async () => {
    accounts = await web3.eth.getAccounts();

    bridgeSrc = await Bridge.new(accounts[0]);
    bridgeTrg = await Bridge.new(accounts[0]);

    const bridgeAddress = bridgeTrg.address;
    bridgeToken = await BridgeToken.new("BridgeToken", "BRG", bridgeAddress);
  });

  it("Should revert with reason 'amount is too low'", async function () {
    await expect(bridgeSrc.lock({ from: accounts[1] })).to.be.revertedWith(
      "amount is too low"
    );
  });

  it("Should emit LogETHLocked event with senders address and the amount of ETH locked", async function () {
    const lockETHTx = await bridgeSrc.lock({ from: accounts[1], value: 50 });
    await expectEvent(lockETHTx, "LogETHLocked", {
      sender: accounts[1],
      amount: new BN(50),
      nonce: new BN(1),
    });

    currentSrcNonce = lockETHTx.logs[0].args[2];
  });

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
      50,
      accounts[1],
      currentSrcNonce
    );

    await expectEvent(mintETHTx, "LogTokenMinted", {
      tokenAddress: bridgeToken.address,
      receiver: accounts[1],
      amount: new BN(50),
      nonce: new BN(1),
    });
  });

  it("Should revert with reason 'transaction already processed'", async function () {
    await expect(
      bridgeTrg.claim(bridgeToken.address, 50, accounts[1], currentSrcNonce)
    ).to.be.revertedWith("transaction already processed");
  });

  it("Should be reverted with reason 'amount is too low'", async function () {
    const preparedSignature = await onAttemptToApprove(
      bridgeToken.address,
      accounts[1],
      bridgeTrg.address,
      "0"
    );

    await expect(
      bridgeTrg.burnFrom(
        bridgeToken.address,
        accounts[1],
        bridgeTrg.address,
        0,
        preparedSignature.deadline,
        preparedSignature.v,
        preparedSignature.r,
        preparedSignature.s
      )
    ).to.be.revertedWith("amount is too low");
  });

  it("Should be reverted with reason 'only gateway has access'", async function () {
    const preparedSignature = await onAttemptToApprove(
      bridgeToken.address,
      accounts[1],
      bridgeTrg.address,
      "50"
    );

    await expect(
      bridgeTrg.burnFrom(
        bridgeToken.address,
        accounts[1],
        bridgeTrg.address,
        50,
        preparedSignature.deadline,
        preparedSignature.v,
        preparedSignature.r,
        preparedSignature.s,
        { from: accounts[1] }
      )
    ).to.be.revertedWith("only gateway has access");
  });

  it("Should use permits to collect tokens to be burned, burn them and emit a LogTokenBurned event", async function () {
    const preparedSignature = await onAttemptToApprove(
      bridgeToken.address,
      accounts[1],
      bridgeTrg.address,
      "50"
    );

    const burnTokensTx = await bridgeTrg.burnFrom(
      bridgeToken.address,
      accounts[1],
      bridgeTrg.address,
      50,
      preparedSignature.deadline,
      preparedSignature.v,
      preparedSignature.r,
      preparedSignature.s
    );

    await expectEvent(burnTokensTx, "LogTokenBurned", {
      tokenAddress: bridgeToken.address,
      sender: accounts[1],
      amount: new BN(50),
      nonce: new BN(1),
    });

    currentTrgNonce = burnTokensTx.logs[0].args[3];
  });

  it("Should revert with reason 'transaction already processed'", async function () {
    const preparedSignature = await onAttemptToApprove(
      bridgeToken.address,
      accounts[1],
      bridgeTrg.address,
      "50"
    );

    await expect(
      bridgeTrg.burnFrom(
        bridgeToken.address,
        accounts[1],
        bridgeTrg.address,
        50,
        preparedSignature.deadline,
        preparedSignature.v,
        preparedSignature.r,
        preparedSignature.s
      )
    ).to.be.revertedWith("transaction already processed");
  });

  it("Should revert with reason 'only gateway has access'", async function () {
    await expect(
      bridgeSrc.release(0, accounts[1], currentTrgNonce, { from: accounts[1] })
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
