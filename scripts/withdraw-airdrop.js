const hre = require("hardhat");

const AIRDROP_ADDRESS = "0x3f8c10e5e5a67422a6d9e64dde1185e1babfc48b";

const RECEIVER = "0x75ebfd016B71645f959D8f6D8Ff34CCffa87dacc";

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  const Airdrop = await hre.ethers.getContractFactory("Airdrop");
  const airdrop = Airdrop.attach(AIRDROP_ADDRESS);
  const result = await airdrop.withdrawTokens(RECEIVER, { from: deployer.address });
  console.log(result);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
