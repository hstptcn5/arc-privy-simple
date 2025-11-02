const solc = require('solc');
const fs = require('fs');
const path = require('path');

// Read the source file
const contractPath = path.join(__dirname, 'src/SimpleToken.sol');
const sourceCode = fs.readFileSync(contractPath, 'utf8');

// Compile the contract
const input = {
  language: 'Solidity',
  sources: {
    'SimpleToken.sol': {
      content: sourceCode
    }
  },
  settings: {
    outputSelection: {
      '*': {
        '*': ['abi', 'evm.bytecode']
      }
    }
  }
};

console.log('Compiling SimpleToken.sol...');
const output = JSON.parse(solc.compile(JSON.stringify(input)));

// Check for errors
if (output.errors) {
  for (const error of output.errors) {
    if (error.severity === 'error') {
      console.error('Compilation error:', error.message);
      process.exit(1);
    }
  }
}

// Get the contract info
const contract = output.contracts['SimpleToken.sol'].SimpleToken;
const abi = contract.abi;
const bytecode = contract.evm.bytecode.object;

console.log('\n✅ Compilation successful!');
console.log('\nBytecode:', bytecode);
console.log('\nABI:', JSON.stringify(abi, null, 2));

// Save to JSON file
const outputPath = path.join(__dirname, 'SimpleToken.json');
fs.writeFileSync(outputPath, JSON.stringify({ abi, bytecode }, null, 2));
console.log('\n💾 Saved to:', outputPath);

