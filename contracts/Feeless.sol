pragma solidity ^0.4.23;

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

    function performFeelessTransaction(address sender, bytes data, uint256 nonce, bytes sig) public payable {
        bytes memory prefix = "\x19Ethereum Signed Message:\n32";
        bytes32 hash = keccak256(prefix, keccak256(data, nonce));
        msgSender = ECRecovery.recover(hash, sig);
        require(msgSender == sender);

        require(nonces[msgSender]++ == nonce);
        require(address(this).call.value(msg.value)(data));
        msgSender = address(0);
    }
    
}
