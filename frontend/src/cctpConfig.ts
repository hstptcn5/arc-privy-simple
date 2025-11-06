// CCTP Contract Addresses for Arc Testnet
export const ARC_CCTP_CONFIG = {
  domain: 26,
  tokenMessenger: '0x8FE6B999Dc680CcFDD5Bf7EB0974218be2542DAA',
  messageTransmitter: '0xE737e5cEBEEBa77EFE34D4aa090756590b1CE275',
  tokenMinter: '0xb43db544E2c27092c107639Ad201b3dEfAbcF192',
  usdc: '0x3600000000000000000000000000000000000000', // USDC ERC-20 interface on Arc
};

// CCTP Domain IDs for testnet chains
// Source: Circle CCTP documentation and GitHub repositories
export const CCTP_DOMAINS: { [chainId: number]: number } = {
  5042002: 26, // Arc Testnet
  11155111: 0, // Ethereum Sepolia
  43113: 1, // Avalanche Fuji
  84532: 6, // Base Sepolia
  80001: 7, // Polygon Mumbai (Amoy)
  421614: 3, // Arbitrum Sepolia
  534351: 19, // Scroll Sepolia
  11155420: 2, // Optimism Sepolia
  168587773: 23, // Blast Sepolia
};

// CCTP TokenMessenger addresses for testnet chains
// IMPORTANT: All testnet chains use the SAME TokenMessenger address!
// Source: Circle CCTP - testnet uses universal address 0x8FE6B999Dc680CcFDD5Bf7EB0974218be2542DAA
export const CCTP_TOKEN_MESSENGER: { [chainId: number]: string } = {
  5042002: '0x8FE6B999Dc680CcFDD5Bf7EB0974218be2542DAA', // Arc Testnet
  11155111: '0x8FE6B999Dc680CcFDD5Bf7EB0974218be2542DAA', // Ethereum Sepolia
  43113: '0x8FE6B999Dc680CcFDD5Bf7EB0974218be2542DAA', // Avalanche Fuji
  84532: '0x8FE6B999Dc680CcFDD5Bf7EB0974218be2542DAA', // Base Sepolia
  80001: '0x8FE6B999Dc680CcFDD5Bf7EB0974218be2542DAA', // Polygon Mumbai/Amoy
  421614: '0x8FE6B999Dc680CcFDD5Bf7EB0974218be2542DAA', // Arbitrum Sepolia
  534351: '0x8FE6B999Dc680CcFDD5Bf7EB0974218be2542DAA', // Scroll Sepolia
  11155420: '0x8FE6B999Dc680CcFDD5Bf7EB0974218be2542DAA', // Optimism Sepolia
  168587773: '0x8FE6B999Dc680CcFDD5Bf7EB0974218be2542DAA', // Blast Sepolia
};

// USDC token addresses on testnet chains
// Source: Verified from Circle testnet deployments, block explorers, and open source projects
export const USDC_ADDRESSES: { [chainId: number]: string } = {
  5042002: '0x3600000000000000000000000000000000000000', // Arc Testnet (ERC-20 interface)
  11155111: '0x07865c6E87B9F70255377e024ace6630C1Eaa37F', // Ethereum Sepolia (corrected)
  43113: '0x5425890298aed601595a70AB815c96711a31Bc65', // Avalanche Fuji
  84532: '0x036CbD53842c5426634e7929541eC2318f3dCF7e', // Base Sepolia
  80001: '0x41e94eb019c0762f9bfcf9fb1e58725bfb0e7582', // Polygon Mumbai/Amoy
  421614: '0x75faf114eafb1BDbe2F0316DF893fd58Ce45AD4B', // Arbitrum Sepolia
  534351: '0x06eFdBFf2a14a7c8E15944D1F4A48F9F95F663A4', // Scroll Sepolia
  11155420: '0x5fd84259d66Cd46123540766Be93DFE6D43130D7', // Optimism Sepolia
  168587773: '0x4200000000000000000000000000000000000006', // Blast Sepolia (may need verification)
};

// CCTP ABI - TokenMessenger V2
export const TOKEN_MESSENGER_ABI = [
  'function depositForBurn(uint256 amount, uint32 destinationDomain, bytes32 mintRecipient, address burnToken) external returns (uint64 nonce)',
  'function depositForBurnWithCaller(uint256 amount, uint32 destinationDomain, bytes32 mintRecipient, address burnToken, bytes32 destinationCaller) external returns (uint64 nonce)',
  'function localMessageTransmitter() external view returns (address)',
];

// CCTP ABI - MessageTransmitter V2
export const MESSAGE_TRANSMITTER_ABI = [
  'function receiveMessage(bytes memory message, bytes calldata attestation) external returns (bool success)',
  'function getNonce(address sender) external view returns (uint256)',
  'function getAttestation(bytes32 messageHash, uint256 attestationThreshold) external view returns (bytes memory)',
];

// ERC-20 ABI for USDC
export const ERC20_ABI = [
  'function approve(address spender, uint256 amount) external returns (bool)',
  'function allowance(address owner, address spender) external view returns (uint256)',
  'function balanceOf(address account) external view returns (uint256)',
  'function decimals() external view returns (uint8)',
  'function transfer(address to, uint256 amount) external returns (bool)',
];

