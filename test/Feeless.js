// @flow
'use strict'

const BigNumber = web3.BigNumber;
const abi = require('ethereumjs-abi');
const expect = require('chai').expect;
const should = require('chai')
    .use(require('chai-as-promised'))
    .use(require('chai-bignumber')(web3.BigNumber))
    .should();

import ether from './helpers/ether';
import {advanceBlock} from './helpers/advanceToBlock';
import {increaseTimeTo, duration} from './helpers/increaseTime';
import latestTime from './helpers/latestTime';
import EVMRevert from './helpers/EVMRevert';

const ECRecovery = artifacts.require('zeppelin-solidity/contracts/ECRecovery');
const Feeless = artifacts.require('FeelessImpl');

function padLeft(s, n, str){
    return Array(n - String(s).length + 1).join(str || '0') + s;
}

contract('Feeless', function ([_, wallet1, wallet2, wallet3, wallet4, wallet5, wallet6]) {

    var feeless;

    before(async function() {
        Feeless.link('MerkleProof', (await ECRecovery.new()).address);
    });

    beforeEach(async function() {
        feeless = await Feeless.new();
    });

    it('should works without feeless', async function() {
        await feeless.setValue(100);
        (await feeless.value.call()).should.be.bignumber.equal(100);
        (await feeless.who.call()).should.be.equal(_);

        await feeless.setValue(200, { from: wallet1 });
        (await feeless.value.call()).should.be.bignumber.equal(200);
        (await feeless.who.call()).should.be.equal(wallet1);

        await feeless.setValue(300, { from: wallet2 });
        (await feeless.value.call()).should.be.bignumber.equal(300);
        (await feeless.who.call()).should.be.equal(wallet2);
    });

    it('should works with feeless', async function() {
        {
            const nonce = await feeless.nonces.call(wallet1);
            //const data = await feeless.contract.setValue(400, { from: _ }).encodeABI();
            const data = abi.simpleEncode("setValue(uint256)", 400).toString('hex');
            const hash = web3.sha3(feeless.address + data + padLeft(nonce.toString(16), 64), { encoding: 'hex' });
            const sig = await web3.eth.sign(wallet1, hash);

            await feeless.performFeelessTransaction(wallet1, feeless.address, '0x' + data, nonce, sig);
            (await feeless.value.call()).should.be.bignumber.equal(400);
            (await feeless.who.call()).should.be.equal(wallet1);
        }

        {
            const nonce = await feeless.nonces.call(wallet2);
            //const data = await feeless.contract.setValue(500, { from: _ }).encodeABI();
            const data = abi.simpleEncode("setValue(uint256)", 500).toString('hex');
            const hash = web3.sha3(feeless.address + data + padLeft(nonce.toString(16), 64), { encoding: 'hex' });
            const sig = await web3.eth.sign(wallet2, hash);

            await feeless.performFeelessTransaction(wallet2, feeless.address, '0x' + data, nonce, sig);
            (await feeless.value.call()).should.be.bignumber.equal(500);
            (await feeless.who.call()).should.be.equal(wallet2);
        }
    });

    it('should failure with wrong data', async function() {
        const nonce = await feeless.nonces.call(wallet1);
        //const data = await feeless.contract.setValue(400, { from: _ }).encodeABI();
        const data = abi.simpleEncode("setValue(uint256)", 1000).toString('hex');
        const hash = web3.sha3(feeless.address + data + padLeft(nonce.toString(16), 64), { encoding: 'hex' });
        const sig = await web3.eth.sign(wallet1, hash);

        const wrongData = '0x' + abi.simpleEncode("setValue(uint256)", 1001).toString('hex');
        await feeless.performFeelessTransaction(wallet1, feeless.address, wrongData, nonce, sig).should.be.rejectedWith(EVMRevert);
    });

    it('should failure with wrong nonce', async function() {
        const nonce = await feeless.nonces.call(wallet1);
        //const data = await feeless.contract.setValue(400, { from: _ }).encodeABI();
        const data = abi.simpleEncode("setValue(uint256)", 2000).toString('hex');
        const hash = web3.sha3(feeless.address + data + padLeft(nonce.toString(16), 64), { encoding: 'hex' });
        const sig = await web3.eth.sign(wallet1, hash);

        const wrongNonce = nonce + 1;
        await feeless.performFeelessTransaction(wallet1, feeless.address, '0x' + data, wrongNonce, sig).should.be.rejectedWith(EVMRevert);
    });

    it('should failure with wrong signature', async function() {
        const nonce = await feeless.nonces.call(wallet1);
        //const data = await feeless.contract.setValue(400, { from: _ }).encodeABI();
        const data = abi.simpleEncode("setValue(uint256)", 3000).toString('hex');
        const hash = web3.sha3(feeless.address + data + padLeft(nonce.toString(16), 64), { encoding: 'hex' });
        const sig = await web3.eth.sign(wallet1, hash);

        const wrongSig = '0xdeadbeef' + sig.substr(10);
        await feeless.performFeelessTransaction(wallet1, feeless.address, '0x' + data, nonce, wrongSig).should.be.rejectedWith(EVMRevert);
    });

})
