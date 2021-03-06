var MindsWire = artifacts.require("./MindsWire.sol");
var MindsWireStorage = artifacts.require("./MindsWireStorage.sol");
var MindsToken = artifacts.require("./MindsToken.sol");

var increaseTimeTo = require('./helpers/increaseTime').increaseTimeTo;
var padding = require('./helpers/padding');
const abi = require('ethereumjs-abi');

contract('MindsWire', (accounts) => {
  let wire,
    storage,
    token,
    sender,
    receiver;

  beforeEach(async () => {
    storage = await MindsWireStorage.new();
    token = await MindsToken.new();
    wire = await MindsWire.new(storage.address, token.address);

    sender = accounts[1];
    receiver = accounts[2];
    //allocate some tokens to our sender
    token.mint(sender, 100);

    //set the storage to allow for wire contract to store
    await storage.modifyContracts(wire.address, true);
  });

  it("should send wire to a receiver using legacy approve", async () => {
    //we need to approve funds to the wire contract first
    token.approve(wire.address, 10, { from: sender });

    await wire.wire(receiver, 10, { from: sender });
    assert.equal(await token.balanceOf(receiver), 10);
  });

  it("should send not allow us to send more funds than approved using legacy approve", async () => {
    token.approve(wire.address, 10, { from: sender });

    let err = false;

    try {
      await wire.wire(receiver, 20, { from: sender });
    } catch (e) {
      err = true;
    }

    assert.equal(err, true);
    assert.equal(await token.balanceOf(receiver), 0);
  });

  it("should allow whitelisted address to able to create a wire", async () => {
    await token.approve(wire.address, 10, { from: sender });

    await wire.addAddressToWhitelist(accounts[5]);

    await wire.wireFromDelegate(sender, receiver, 5, { from: accounts[5] });

    assert.equal(await token.balanceOf(receiver), 5);
  });

  it("should not allow non-whitelisted address create a wire", async () => {
    await token.approve(wire.address, 10, { from: sender });

    let errored = false;

    try {
      await wire.wireFromDelegate(sender, receiver, 5, { from: accounts[6] });
    } catch (err) {
      errored = true;
    }

    assert.equal(errored, true);
    assert.equal(await token.balanceOf(receiver), 0);
  });

  it("should send wire to a receiver using approveAndCall", async () => {

    const bytes = [
      abi.rawEncode(['uint256'], [0x80]).toString('hex'),
      abi.rawEncode(['uint256'], [0x40]).toString('hex'),
      padding.left(receiver.slice(2), 64), //receiver address
    ].join('');

    token.approveAndCall(wire.address, 10, '0x' + bytes, { from: sender });

    assert.equal(await token.balanceOf(receiver), 10);
  });

  it("should confirm that a wire was sent within the last month", async () => {
    const bytes = [
      abi.rawEncode(['uint256'], [0x80]).toString('hex'),
      abi.rawEncode(['uint256'], [0x40]).toString('hex'),
      padding.left(receiver.slice(2), 64), //receiver address
    ].join('');

    token.approveAndCall(wire.address, 10, '0x' + bytes, { from: sender });

    let ts = web3.eth.getBlock('latest').timestamp -  (86400 * 30); //30 days ago
    let has = await wire.hasSent(receiver, 10, ts, { from: sender });
    assert.equal(has, true);
  });

  it("should deny that a wire was sent within the last month", async () => {
    let ts = web3.eth.getBlock('latest').timestamp -  (86400 * 30); //30 days ago
    let has = await wire.hasSent(receiver, 10, ts, { from: sender });
    assert.equal(has, false);
  });

  it("should deny that a wire was sent out of period", async () => {
    const bytes = [
      abi.rawEncode(['uint256'], [0x80]).toString('hex'),
      abi.rawEncode(['uint256'], [0x40]).toString('hex'),
      padding.left(receiver.slice(2), 64), //receiver address
    ].join('');

    token.approveAndCall(wire.address, 10, '0x' + bytes, { from: sender }); 
  
    let ts = web3.eth.getBlock('latest').timestamp +  (86400 * 30); //30 days in the future
    let has = await wire.hasSent(receiver, 10, ts, { from: sender });
    assert.equal(has, false);
  });

  it("should confirm that a multiple wires were sent within the last month", async () => {
    const bytes = [
      abi.rawEncode(['uint256'], [0x80]).toString('hex'),
      abi.rawEncode(['uint256'], [0x40]).toString('hex'),
      padding.left(receiver.slice(2), 64), //receiver address
    ].join('');

    token.approveAndCall(wire.address, 10, '0x' + bytes, { from: sender });
    await token.approveAndCall(wire.address, 10, '0x' + bytes, { from: sender });
    await token.approveAndCall(wire.address, 10, '0x' + bytes, { from: sender });

    let ts = web3.eth.getBlock('latest').timestamp -  (86400 * 30); //30 days ago
    let has = await wire.hasSent(receiver, 30, ts, { from: sender });
    assert.equal(has, true);
  });

});
