// TokenRegistry contract address on Arc Testnet
// TODO: Deploy TokenRegistry và cập nhật address này
export const REGISTRY_ADDRESS = ''; // Sẽ được cập nhật sau khi deploy

// TokenRegistry ABI (minimal - chỉ các functions cần thiết)
export const REGISTRY_ABI = [
  {
    inputs: [
      { internalType: 'address', name: 'tokenAddress', type: 'address' },
      { internalType: 'string', name: 'name', type: 'string' },
      { internalType: 'string', name: 'symbol', type: 'string' },
      { internalType: 'uint8', name: 'decimals', type: 'uint8' },
      { internalType: 'uint256', name: 'initialSupply', type: 'uint256' },
    ],
    name: 'registerToken',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'address', name: 'deployer', type: 'address' }],
    name: 'getTokensByDeployer',
    outputs: [
      { internalType: 'address[]', name: 'addresses', type: 'address[]' },
      {
        components: [
          { internalType: 'address', name: 'tokenAddress', type: 'address' },
          { internalType: 'address', name: 'deployer', type: 'address' },
          { internalType: 'string', name: 'name', type: 'string' },
          { internalType: 'string', name: 'symbol', type: 'string' },
          { internalType: 'uint8', name: 'decimals', type: 'uint8' },
          { internalType: 'uint256', name: 'initialSupply', type: 'uint256' },
          { internalType: 'uint256', name: 'deployTimestamp', type: 'uint256' },
        ],
        internalType: 'struct TokenRegistry.TokenInfo[]',
        name: 'infos',
        type: 'tuple[]',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
];

