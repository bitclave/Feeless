pragma solidity ^0.4.24;

import { ECRecovery } from "zeppelin-solidity/contracts/ECRecovery.sol";


contract Feeless {
    
    address internal msgSender;
    mapping(address => uint256) public nonces;
    
    modifier feeless {
        if (msgSender == address(0)) {
            msgSender = msg.sender;
            _;
            msgSender = address(0);
        } else {
            _;
        }
    }

    function performFeelessTransaction(address sender, address target, bytes data, uint256 nonce, bytes sig) public payable {
        require(this == target);
        
        bytes memory prefix = "\x19Ethereum Signed Message:\n32";
        bytes32 payload = keccak256(abi.encodePacked(target, data, nonce));
        bytes32 hash = keccak256(abi.encodePacked(prefix, payload));
        msgSender = ECRecovery.recover(hash, sig);
        require(msgSender == sender);
        require(nonces[msgSender]++ == nonce);
        
        require(target.call.value(msg.value)(data));
        msgSender = address(0);
    }
    
}
