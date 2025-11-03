// SimpleAMM contract configuration
// Default deployed address on Arc Testnet: 0x0249C38Cbbf8623CB4BE09d7ad4002B8517ce5b5
// This address will be set after deploying SimpleAMM contract
// Get from localStorage if available (for runtime access), otherwise use default
const DEFAULT_AMM_ADDRESS = '0x0249C38Cbbf8623CB4BE09d7ad4002B8517ce5b5';

const getAMMAddress = () => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('ammAddress') || DEFAULT_AMM_ADDRESS;
  }
  return DEFAULT_AMM_ADDRESS;
};

export const AMM_ADDRESS = getAMMAddress();

// SimpleAMM ABI
export const AMM_ABI = [
  {
    inputs: [
      { internalType: 'address', name: 'token', type: 'address' },
      { internalType: 'uint256', name: 'tokenAmount', type: 'uint256' },
      { internalType: 'uint256', name: 'usdcAmount', type: 'uint256' }
    ],
    name: 'createPool',
    outputs: [],
    stateMutability: 'payable',
    type: 'function'
  },
  {
    inputs: [
      { internalType: 'address', name: 'token', type: 'address' },
      { internalType: 'uint256', name: 'usdcAmount', type: 'uint256' }
    ],
    name: 'buyTokens',
    outputs: [{ internalType: 'uint256', name: 'tokenAmount', type: 'uint256' }],
    stateMutability: 'payable',
    type: 'function'
  },
  {
    inputs: [
      { internalType: 'address', name: 'token', type: 'address' },
      { internalType: 'uint256', name: 'tokenAmount', type: 'uint256' }
    ],
    name: 'sellTokens',
    outputs: [{ internalType: 'uint256', name: 'usdcAmount', type: 'uint256' }],
    stateMutability: 'nonpayable',
    type: 'function'
  },
  {
    inputs: [{ internalType: 'address', name: 'token', type: 'address' }],
    name: 'getPrice',
    outputs: [{ internalType: 'uint256', name: 'price', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [{ internalType: 'address', name: 'token', type: 'address' }],
    name: 'getReserves',
    outputs: [
      { internalType: 'uint256', name: 'tokenReserve', type: 'uint256' },
      { internalType: 'uint256', name: 'usdcReserve', type: 'uint256' }
    ],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [
      { internalType: 'address', name: 'token', type: 'address' },
      { internalType: 'uint256', name: 'usdcAmount', type: 'uint256' }
    ],
    name: 'getBuyQuote',
    outputs: [{ internalType: 'uint256', name: 'tokenAmount', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [
      { internalType: 'address', name: 'token', type: 'address' },
      { internalType: 'uint256', name: 'tokenAmount', type: 'uint256' }
    ],
    name: 'getSellQuote',
    outputs: [{ internalType: 'uint256', name: 'usdcAmount', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [{ internalType: 'address', name: '', type: 'address' }],
    name: 'poolExists',
    outputs: [{ internalType: 'bool', name: '', type: 'bool' }],
    stateMutability: 'view',
    type: 'function'
  }
];

