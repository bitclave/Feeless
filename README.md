# Feeless

[![Build Status](https://travis-ci.org/bitclave/Feeless.svg?branch=master)](https://travis-ci.org/bitclave/Feeless)
[![Coverage Status](https://coveralls.io/repos/github/bitclave/Feeless/badge.svg)](https://coveralls.io/github/bitclave/Feeless)

Solidity Contract that allows anyone trustless pay fees for anyone

# Installation

1. Install [truffle](http://truffleframework.com) globally with `npm install -g truffle`
2. Install [ganache-cli](https://github.com/trufflesuite/ganache-cli) globally with `npm install -g ganache-cli`
3. Install local packages with `npm install`
4. Run ganache in separate terminal `scripts/rpc.sh`
5. Run tests with `npm test`

On macOS you also need to install watchman: `brew install watchman`

# Usage

1. Inherit your smart contract from `Feeless` smaert contract
2. Add `feeless` modifier for any methods you wanna allow to call indirectly
3. Use `msgSender` instead of `msg.sender` in these methods and methods internally called by them

For example token smart contract allowing to delegate transfers:
```
contract MyToken is StandardToken, Feeless {

    string public constant symbol = "XXX";
    string public constant name = "MyToken";
    uint8 public constant decimals = 18;
    string public constant version = "1.0";

    function transfer(address _to, uint256 _value) public feeless returns (bool) {
        balances[msgSender] = balances[msgSender].sub(_value);
        balances[_to] = balances[_to].add(_value);
        Transfer(msgSender, _to, _value);
        return true;
    }

}
```

Now you can delegate anyone to perform your (wallet1) transaction:
```
const nonce = await myToken.methods.nonces(wallet1).call();
const data = await myToken.methods.transfer(wallet2, 5 * 10**18).encodeABI();
const hash = web3.utils.sha3(data + web3.utils.toBN(nonce).toString(16,64));
const sig = await web3.eth.accounts.sign(hash, wallet1PrivateKey);
```

Now receiver (wallet2) is able to pay transaction fees for sender (wallet1):
```
await myToken.performFeelessTransaction(wallet1, data, nonce, sig).send({ from: wallet2 });
```

# Future

- **Do not have replay-protection**, delegated call can be performed in multiple chains (networks). To implement protection we need to introduce `block.chain_id` variable to EVM: https://github.com/ethereum/EIPs/issues/901
- Wanna get rid of `msgSender` by adding something like `target.indirectcall(data, nonce, sig)` to EVM
