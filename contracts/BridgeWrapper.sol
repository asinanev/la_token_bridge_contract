//SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import "./BridgeToken.sol";

contract BridgeWrapper {

    BridgeToken public BRGToken;

    uint256 private lockedETH;

    mapping(bytes32 => uint256) private availableETH;
    
    event LogETHLocked(address sender, uint256 amount);
    event LogETHMinted(address sender, uint256 amount);
	event LogETHUnwrapped(address sender, uint256 amount);
    event LogETHWithdrawn(address sender, uint256 amount);

    constructor() {
        BRGToken = new BridgeToken();
    }

    function lock() public payable {
		require(msg.value > 0, "We need to lock at least 1 wei");
        lockedETH = lockedETH + msg.value;
		
		emit LogETHLocked(msg.sender, msg.value);
	}

    function mint(uint value) public {
        require(value > 0, "We need to mint at least 1 wei");
        BRGToken.mint(msg.sender, value);
        emit LogETHMinted(msg.sender, value);
    }

    function unwrap(uint value) public {
        require(value > 0, "We need to unwrap at least 1 wei");
        BRGToken.transferFrom(msg.sender, address(this), value);
		BRGToken.burn(value);
        emit LogETHUnwrapped(msg.sender, value);
    }

	function withdraw(uint value) public {
		require(value > 0, "We need to unlock at least 1 wei");
        require(value < lockedETH, "Not sufficient funds in contract");
        lockedETH = lockedETH - value;
		payable(msg.sender).transfer(value);
		emit LogETHWithdrawn(msg.sender, value);
	}

    function viewLockedETH() external view returns (uint256) {
        return lockedETH;
    }

    function getBalanceOf(address account) external view returns (uint256) {
        return BRGToken.balanceOf(account);
    }
}