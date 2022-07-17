//SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/presets/ERC20PresetMinterPauser.sol";

contract Bridge {

    mapping(address => address) private nativeToWrapped;

    event LogTokensLocked(address tokenAddress, address indexed sender, uint256 amount);
    event LogTokensClaimed(address tokenAddress, address indexed receiver, uint256 amount);
    event LogTokensBurned(address tokenAddress, address indexed sender, uint256 amount);
    event LogTokensReleased(address indexed receiver, uint256 amount);

    constructor() {}

    function lock(address _nativeTokenAddress, uint256 _amount) external payable checkAmount(msg.value) checkAmount(_amount) {

        ERC20PresetMinterPauser(_nativeTokenAddress).transferFrom(msg.sender, address(this), _amount);

		emit LogTokensLocked(_nativeTokenAddress, msg.sender, _amount);
	}

    function claim(address _nativeTokenAddress, string memory _nativeName, string memory _nativeSymbol, uint _amount, address _recepient) external checkAddress(_recepient) checkAmount(_amount) {
        address wrappedTokenAddress = nativeToWrapped[_nativeTokenAddress];
        ERC20PresetMinterPauser wrappedTokenInstance;

        if (wrappedTokenAddress != address(0)) {
            wrappedTokenInstance = ERC20PresetMinterPauser(wrappedTokenAddress);
        } else {
            wrappedTokenInstance = new ERC20PresetMinterPauser(_nativeName, _nativeSymbol);
            nativeToWrapped[_nativeTokenAddress] = address(
                wrappedTokenInstance
            );
        }

        wrappedTokenInstance.mint(_recepient, _amount);

        emit LogTokensClaimed(nativeToWrapped[_nativeTokenAddress], _recepient, _amount);
    }
    
    function burn(address _nativeTokenAddress, uint256 _value) external checkAmount(_value)  {
        address wrappedTokenAddress = nativeToWrapped[_nativeTokenAddress];
        require(wrappedTokenAddress != address(0), "token contract unknown");

		ERC20PresetMinterPauser(wrappedTokenAddress).burnFrom(msg.sender, _value);

        emit LogTokensBurned(_nativeTokenAddress, msg.sender, _value);
    }

	function release(address _nativeTokenAddress, address _receiver, uint _amount) external checkAddress(_receiver) checkAmount(_amount) {
        ERC20PresetMinterPauser(_nativeTokenAddress).transfer(_receiver, _amount);

        emit LogTokensReleased(_receiver, _amount);
	}

    function getCorrespondingContract(address _nativeTokenAddress) external view returns(address) {
        return nativeToWrapped[_nativeTokenAddress];
    }

    modifier checkAddress(address _address) {
        require(_address != address(0), "cannot use the zero address");
        _;
    }

    modifier checkAmount(uint256 _amount) {
        require(_amount > 0, "amount is too low");
        _;
    }
}
