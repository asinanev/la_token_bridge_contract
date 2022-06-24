//SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import "./IERC20Mintable.sol";

contract Bridge {

    address private gateway;

    mapping(address => bool) private tokenExistance;
    mapping(address => IERC20Mintable) private tokenList;
    
    event LogETHLocked(address sender, uint256 amount);
    event LogTokenMinted(address tokenAddress, address receiver, uint256 amount);
	event LogTokenBurned(address tokenAddress, address sender, uint256 amount);
    event LogETHReleased(address receiver, uint256 amount);

    constructor(address _gateway) {
        gateway = _gateway;
    }

    function lock() external payable {
		require(msg.value > 0, "amount is too low");
		emit LogETHLocked(msg.sender, msg.value);
	}

    function claim(address tokenAddress, uint amount, address to) external onlyGateway {
        require(to != address(0), "cannot trasfer to zero address");
        require(amount > 0, "amount is too low");

        if (!tokenExistance[tokenAddress]) {
            tokenList[tokenAddress] = IERC20Mintable(tokenAddress);
            tokenExistance[tokenAddress] = true;
        }

        tokenList[tokenAddress].mint(to, amount);

        emit LogTokenMinted(tokenAddress, to, amount);
    }
    
    function burn(address tokenAddress, uint amount) external {
        require(amount > 0, "amount is too low");
        // Approve from UI
        tokenList[tokenAddress].transferFrom(msg.sender, address(this), amount);
		tokenList[tokenAddress].burn(amount);

        emit LogTokenBurned(tokenAddress, msg.sender, amount);
    }

	function release(uint amount, address receiver) external onlyGateway {
		require(amount > 0, "amount is too low");
		payable(receiver).transfer(amount);
		emit LogETHReleased(receiver, amount);
	}

    modifier onlyGateway {
      require(msg.sender == gateway, "only gateway can call this function");
      _;
    }

}