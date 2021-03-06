// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `npx hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.
const hre = require('hardhat');
const { time } = require('@openzeppelin/test-helpers');

// eslint-disable-next-line space-before-function-paren
async function main() {
  // Hardhat always runs the compile task when running scripts with its command
  // line interface.
  //
  // If this script is run directly using `node` you may want to call compile
  // manually to make sure everything is compiled
  // await hre.run('compile');

  // We get the contract to deploy
  const DecubateVesting = await hre.ethers.getContractFactory('DecubateVesting');
  const vesting = DecubateVesting.attach('0x6edA60dFBa919e2fe24Bdf1b2bd609855D93F7FB');
  const getAllVestingPools = await vesting.getAllVestingPools();

  console.log('GET token' + await vesting.getToken());

  console.log(getAllVestingPools);

  const getWhitelistPool = await vesting.getWhitelistPool(0);
  console.log(getWhitelistPool);

}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
