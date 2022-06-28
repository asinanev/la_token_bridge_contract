//SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import "./IERC20Mintable.sol";

contract Bridge {

    address private gateway;
    uint private nonce;

    mapping(address => bool) private tokenExistance;
    mapping(address => IERC20Mintable) private tokenList;
    mapping(uint => bool) private processedNonces;
    
    event LogETHLocked(address sender, uint256 amount, uint nonce);
    event LogTokenMinted(address tokenAddress, address receiver, uint256 amount, uint nonce);
	event LogTokenBurned(address tokenAddress, address sender, uint256 amount, uint nonce);
    event LogETHReleased(address receiver, uint256 amount, uint nonce);

    constructor(address _gateway) {
        gateway = _gateway;
    }

    function lock() external payable {
		require(msg.value > 0, "amount is too low");
        nonce++;
		emit LogETHLocked(msg.sender, msg.value, nonce);
	}

    function claim(address tokenAddress, uint amount, address to, uint _nonce) external onlyGateway {
        require(to != address(0), "cannot trasfer to zero address");
        require(amount > 0, "amount is too low");
        require(processedNonces[_nonce] == false, "transaction already processed");
        processedNonces[_nonce] = true;

        if (!tokenExistance[tokenAddress]) {
            tokenList[tokenAddress] = IERC20Mintable(tokenAddress);
            tokenExistance[tokenAddress] = true;
        }

        tokenList[tokenAddress].mint(to, amount);

        emit LogTokenMinted(tokenAddress, to, amount, _nonce);
    }
    
    function burnFrom(address tokenAddress, address  owner, address spender, uint256 value, uint256 deadline, uint8 v, bytes32 r, bytes32 s) external onlyGateway {
        require(value > 0, "amount is too low");
		tokenList[tokenAddress].burnFrom(owner, spender, value, deadline, v, r, s);
        nonce++;
        emit LogTokenBurned(tokenAddress, msg.sender, value, nonce);
    }

	function release(uint value, address receiver, uint _nonce) external onlyGateway {
		require(value > 0, "amount is too low");
        require(processedNonces[_nonce] == false, "transaction already processed");
        processedNonces[_nonce] = true;

		payable(receiver).transfer(value);
		
        emit LogETHReleased(receiver, value, _nonce);
	}

    modifier onlyGateway {
      require(msg.sender == gateway, "only gateway has access");
      _;
    }

}