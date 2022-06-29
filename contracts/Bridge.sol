//SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import { ERC20PresetMinterPauser } from "@openzeppelin/contracts/token/ERC20/presets/ERC20PresetMinterPauser.sol";

contract Bridge {

    address private gateway;
    uint private nonce;

    mapping(address => bool) private tokenExistance;
    mapping(address => bool) private tokenExistanceList;
    mapping(uint => bool) private processedNonces;
    
    event LogETHLocked(address tokenAddress, address sender, uint256 amount, uint nonce);
    event LogTokenMinted(address tokenAddress, address receiver, uint256 amount, uint nonce);
    event LogTokenBurned(address tokenAddress, address sender, uint256 amount, uint nonce);
    event LogETHReleased(address receiver, uint256 amount, uint nonce);

    constructor(address _gateway) {
        gateway = _gateway;
    }

    function lock(address tokenAddress) external payable {
		require(msg.value > 0, "amount is too low");
        nonce++;
		emit LogETHLocked(tokenAddress, msg.sender, msg.value, nonce);
	}

    function claim(address tokenAddress, uint amount, address to, uint _nonce) external onlyGateway {
        require(to != address(0), "cannot transfer to zero address");
        require(amount > 0, "amount is too low");
        require(processedNonces[_nonce] == false, "transaction already processed");
        processedNonces[_nonce] = true;

        if (!tokenExistance[tokenAddress]) {
            tokenExistance[tokenAddress] = true;
        }

        ERC20PresetMinterPauser token = ERC20PresetMinterPauser(tokenAddress);
        token.mint(to, amount);

        emit LogTokenMinted(tokenAddress, to, amount, _nonce);
    }
    
    // Approve from UI
    function burnFrom(address tokenAddress, address  owner, uint256 value) external onlyGateway {
        require(value > 0, "amount is too low");
        ERC20PresetMinterPauser token = ERC20PresetMinterPauser(tokenAddress);
		token.burnFrom(owner, value);
        nonce++;
        emit LogTokenBurned(tokenAddress, owner, value, nonce);
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