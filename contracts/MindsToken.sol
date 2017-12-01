pragma solidity ^0.4.13;

import 'zeppelin-solidity/contracts/token/MintableToken.sol';

contract MindsToken is MintableToken {

    string public constant name = "Minds";
    string public constant symbol = "M";
    uint8 public constant decimals = 18;

    function approveAndCall(address _spender, uint256 _value, bytes _extraData) public returns (bool success) {
        allowed[msg.sender][_spender] = _value;
        Approval(msg.sender, _spender, _value);

        //call the spender function
        //receiveApproval(address _from, uint256 _value, address _tokenContract, bytes _extraData)
        require(_spender.call(bytes4(bytes32(keccak256("receiveApproval(address,uint256,address,bytes)"))), msg.sender, _value, this, _extraData));
        return true;
    }

}