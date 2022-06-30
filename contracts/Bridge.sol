//SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import { WrappedToken } from "./WrappedToken.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract Bridge is Ownable{

    address private gateway;
    uint private nonce;

    mapping(address => address) private nativeToWrapped;
    mapping(uint => bool) private processedNonces;
    
    event LogETHLocked(address tokenAddress, address sender, uint256 amount, uint nonce);
    event LogTokenMinted(address tokenAddress, address receiver, uint256 amount, uint nonce);
    event LogTokenBurned(address tokenAddress, address sender, uint256 amount, uint nonce);
    event LogETHReleased(address receiver, uint256 amount, uint nonce);

    constructor(address _gateway) {
        gateway = _gateway;
    }

    function lock(address _tokenAddress) external payable checkAmount(msg.value) {
        nonce++;
		emit LogETHLocked(_tokenAddress, msg.sender, msg.value, nonce);
	}

    function claim(address _tokenAddress, uint _value, address _recepient, uint _nonce) external onlyGateway checkAddress(_recepient) checkStatus(_nonce) checkAmount(_value) {
        processedNonces[_nonce] = true;

        address wrappedTokenAddress = nativeToWrapped[_tokenAddress];
        WrappedToken wrappedTokenInstance;

        if (wrappedTokenAddress != address(0)) {
            wrappedTokenInstance = WrappedToken(wrappedTokenAddress);
        } else {
            wrappedTokenInstance = new WrappedToken();
            nativeToWrapped[_tokenAddress] = address(
                wrappedTokenInstance
            );
        }

        wrappedTokenInstance.mint(_recepient, _value);

        emit LogTokenMinted(nativeToWrapped[_tokenAddress], _recepient, _value, _nonce);
    }
    
    function burnFrom(address _tokenAddress, address  _owner, uint256 _value) external onlyGateway checkAddress(_owner) checkAmount(_value)  {
        address wrappedTokenAddress = nativeToWrapped[_tokenAddress];
        require(wrappedTokenAddress != address(0), "token contract unknown");
        WrappedToken wrappedTokenInstance = WrappedToken(wrappedTokenAddress);
		wrappedTokenInstance.burnFrom(_owner, _value);

        nonce++;
        emit LogTokenBurned(_tokenAddress, _owner, _value, nonce);
    }

	function release(address _receiver, uint _value, uint _nonce) external onlyGateway checkAddress(_receiver) checkStatus(_nonce) checkAmount(_value) {
        processedNonces[_nonce] = true;
		payable(_receiver).transfer(_value);
        emit LogETHReleased(_receiver, _value, _nonce);
	}

    modifier onlyGateway {
      require(msg.sender == gateway, "only gateway has access");
      _;
    }

    modifier checkAddress(address _address) {
        require(_address != address(0), "cannot use the zero address");
        _;
    }

    modifier checkStatus(uint256 _nonce) {
        require(processedNonces[_nonce] == false, "transaction already processed");
        _;
    }

    modifier checkAmount(uint256 _value) {
        require(_value > 0, "amount is too low");
        _;
    }
}