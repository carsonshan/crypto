const MindsBoostStorage = artifacts.require('./MindsBoostStorage.sol');

module.exports = (deployer) => {

  //comment this out once we've deployed once!
  deployer.deploy(MindsBoostStorage);

};