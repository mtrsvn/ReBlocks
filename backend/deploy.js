require("dotenv").config();
const fs = require("fs");
const path = require("path");
const solc = require("solc");
const { ethers } = require("ethers");

async function main() {
  console.log("Starting deployment...");

  const privateKey = process.env.TEST_PRIVATE_KEY;
  if (!privateKey) {
    throw new Error("TEST_PRIVATE_KEY not found in .env");
  }

  const provider = new ethers.JsonRpcProvider("https://rpc-hoodi.morph.network");
  const wallet = new ethers.Wallet(privateKey, provider);

  console.log(`Deploying from account: ${wallet.address}`);
  const balance = await provider.getBalance(wallet.address);
  console.log(`Account balance: ${ethers.formatEther(balance)} ETH`);

  if (balance === 0n) {
    throw new Error("Account has no ETH for gas. Please get some from the Morph Testnet faucet.");
  }

  // Compile the contract
  console.log("Compiling MockUSDT.sol...");
  const contractPath = path.resolve(__dirname, "MockUSDT.sol");
  const source = fs.readFileSync(contractPath, "utf8");

  const input = {
    language: "Solidity",
    sources: {
      "MockUSDT.sol": {
        content: source,
      },
    },
    settings: {
      outputSelection: {
        "*": {
          "*": ["*"],
        },
      },
    },
  };

  const output = JSON.parse(solc.compile(JSON.stringify(input)));
  
  if (output.errors) {
    output.errors.forEach((err) => console.error(err.formattedMessage));
    if (output.errors.some(err => err.severity === 'error')) {
      throw new Error("Compilation failed");
    }
  }

  const contractFile = output.contracts["MockUSDT.sol"]["MockUSDT"];
  const abi = contractFile.abi;
  const bytecode = contractFile.evm.bytecode.object;

  console.log("Compiled successfully. Deploying to Morph Testnet...");

  const factory = new ethers.ContractFactory(abi, bytecode, wallet);
  const contract = await factory.deploy();
  
  console.log("Waiting for confirmation...");
  await contract.waitForDeployment();

  const address = await contract.getAddress();
  console.log(`Mock USDT deployed to: ${address}`);
  console.log("-------------------------------------------------");
  console.log("Please update your .env file with the following:");
  console.log(`USDT_ADDRESS=${address}`);
  console.log("-------------------------------------------------");
  
  // Save ABI and Address to a JSON file for future reference
  const deploymentInfo = {
    address: address,
    abi: abi
  };
  fs.writeFileSync(path.join(__dirname, "deployment.json"), JSON.stringify(deploymentInfo, null, 2));
  console.log("Saved deployment.json");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
