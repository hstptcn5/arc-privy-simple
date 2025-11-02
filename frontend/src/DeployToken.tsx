import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { useWallets } from '@privy-io/react-auth';
import { REGISTRY_ADDRESS, REGISTRY_ABI } from './registryConfig';

interface DeployTokenProps {
  onDeploySuccess?: (address: string, txHash: string, name: string, symbol: string, decimals: number) => void;
}

const SimpleTokenBytecode = `0x608060405234801561000f575f5ffd5b506040516118a13803806118a183398181016040528101906100319190610317565b835f908161003f91906105ba565b50826001908161004f91906105ba565b508160025f6101000a81548160ff021916908360ff1602179055503360045f6101000a81548173ffffffffffffffffffffffffffffffffffffffff021916908373ffffffffffffffffffffffffffffffffffffffff160217905550806003819055508060055f3373ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff1681526020019081526020015f20819055503373ffffffffffffffffffffffffffffffffffffffff165f73ffffffffffffffffffffffffffffffffffffffff167fddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef836040516101509190610698565b60405180910390a3505050506106b1565b5f604051905090565b5f5ffd5b5f5ffd5b5f5ffd5b5f5ffd5b5f601f19601f8301169050919050565b7f4e487b71000000000000000000000000000000000000000000000000000000005f52604160045260245ffd5b6101c08261017a565b810181811067ffffffffffffffff821117156101df576101de61018a565b5b80604052505050565b5f6101f1610161565b90506101fd82826101b7565b919050565b5f67ffffffffffffffff82111561021c5761021b61018a565b5b6102258261017a565b9050602081019050919050565b8281835e5f83830152505050565b5f61025261024d84610202565b6101e8565b90508281526020810184848401111561026e5761026d610176565b5b610279848285610232565b509392505050565b5f82601f83011261029557610294610172565b5b81516102a5848260208601610240565b91505092915050565b5f60ff82169050919050565b6102c3816102ae565b81146102cd575f5ffd5b50565b5f815190506102de816102ba565b92915050565b5f819050919050565b6102f6816102e4565b8114610300575f5ffd5b50565b5f81519050610311816102ed565b92915050565b5f5f5f5f6080858703121561032f5761032e61016a565b5b5f85015167ffffffffffffffff81111561034c5761034b61016e565b5b61035887828801610281565b945050602085015167ffffffffffffffff8111156103795761037861016e565b5b61038587828801610281565b9350506040610396878288016102d0565b92505060606103a787828801610303565b91505092959194509250565b5f81519050919050565b7f4e487b71000000000000000000000000000000000000000000000000000000005f52602260045260245ffd5b5f600282049050600182168061040157607f821691505b602082108103610414576104136103bd565b5b50919050565b5f819050815f5260205f209050919050565b5f6020601f8301049050919050565b5f82821b905092915050565b5f600883026104767fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff8261043b565b610480868361043b565b95508019841693508086168417925050509392505050565b5f819050919050565b5f6104bb6104b66104b1846102e4565b610498565b6102e4565b9050919050565b5f819050919050565b6104d4836104a1565b6104e86104e0826104c2565b848454610447565b825550505050565b5f5f905090565b6104ff6104f0565b61050a8184846104cb565b505050565b5b8181101561052d576105225f826104f7565b600181019050610510565b5050565b601f821115610572576105438161041a565b61054c8461042c565b8101602085101561055b578190505b61056f6105678561042c565b83018261050f565b50505b505050565b5f82821c905092915050565b5f6105925f1984600802610577565b1980831691505092915050565b5f6105aa8383610583565b9150826002028217905092915050565b6105c3826103b3565b67ffffffffffffffff8111156105dc576105db61018a565b5b6105e682546103ea565b6105f1828285610531565b5f60209050601f831160018114610622575f8415610610578287015190505b61061a858261059f565b865550610681565b601f1984166106308661041a565b5f5b8281101561065757848901518255600182019150602085019450602081019050610632565b868310156106745784890151610670601f891682610583565b8355505b6001600288020188555050505b505050505050565b610692816102e4565b82525050565b5f6020820190506106ab5f830184610689565b92915050565b6111e3806106be5f395ff3fe608060405234801561000f575f5ffd5b50600436106100a7575f3560e01c806340c10f191161006f57806340c10f191461016557806370a08231146101815780638da5cb5b146101b157806395d89b41146101cf578063a9059cbb146101ed578063dd62ed3e1461021d576100a7565b806306fdde03146100ab578063095ea7b3146100c957806318160ddd146100f957806323b872dd14610117578063313ce56714610147575b5f5ffd5b6100b361024d565b6040516100c09190610c56565b60405180910390f35b6100e360048036038101906100de9190610d07565b6102d8565b6040516100f09190610d5f565b60405180910390f35b6101016103c5565b60405161010e9190610d87565b60405180910390f35b610131600480360381019061012c9190610da0565b6103cb565b60405161013e9190610d5f565b60405180910390f35b61014f610719565b60405161015c9190610e0b565b60405180910390f35b61017f600480360381019061017a9190610d07565b61072b565b005b61019b60048036038101906101969190610e24565b6108fc565b6040516101a89190610d87565b60405180910390f35b6101b9610911565b6040516101c69190610e5e565b60405180910390f35b6101d7610936565b6040516101e49190610c56565b60405180910390f35b61020760048036038101906102029190610d07565b6109c2565b6040516102149190610d5f565b60405180910390f35b61023760048036038101906102329190610e77565b610bc6565b6040516102449190610d87565b60405180910390f35b5f805461025990610ee2565b80601f016020809104026020016040519081016040528092919081815260200182805461028590610ee2565b80156102d05780601f106102a7576101008083540402835291602001916102d0565b820191905f5260205f20905b8154815290600101906020018083116102b357829003601f168201915b505050505081565b5f8160065f3373ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff1681526020019081526020015f205f8573ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff1681526020019081526020015f20819055508273ffffffffffffffffffffffffffffffffffffffff163373ffffffffffffffffffffffffffffffffffffffff167f8c5be1e5ebec7d5bd14f71427d1e84f3dd0314c0f7b2291e5b200ac8c7c3b925846040516103b39190610d87565b60405180910390a36001905092915050565b60035481565b5f5f73ffffffffffffffffffffffffffffffffffffffff168373ffffffffffffffffffffffffffffffffffffffff160361043a576040517f08c379a000000000000000000000000000000000000000000000000000000000815260040161043190610f5c565b60405180910390fd5b8160055f8673ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff1681526020019081526020015f205410156104ba576040517f08c379a00000000000000000000000000000000000000000000000000000000081526004016104b190610fc4565b60405180910390fd5b8160065f8673ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff1681526020019081526020015f205f3373ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff1681526020019081526020015f20541015610575576040517f08c379a000000000000000000000000000000000000000000000000000000000815260040161056c9061102c565b60405180910390fd5b8160055f8673ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff1681526020019081526020015f205f8282546105c19190611077565b925050819055508160055f8573ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff1681526020019081526020015f205f82825461061491906110aa565b925050819055508160065f8673ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff1681526020019081526020015f205f3373ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff1681526020019081526020015f205f8282546106a29190611077565b925050819055508273ffffffffffffffffffffffffffffffffffffffff168473ffffffffffffffffffffffffffffffffffffffff167fddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef846040516107069190610d87565b60405180910390a3600190509392505050565b60025f9054906101000a900460ff1681565b60045f9054906101000a900473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff163373ffffffffffffffffffffffffffffffffffffffff16146107ba576040517f08c379a00000000000000000000000000000000000000000000000000000000081526004016107b190611127565b60405180910390fd5b5f73ffffffffffffffffffffffffffffffffffffffff168273ffffffffffffffffffffffffffffffffffffffff1603610828576040517f08c379a000000000000000000000000000000000000000000000000000000000815260040161081f9061118f565b60405180910390fd5b8060035f82825461083991906110aa565b925050819055508060055f8473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff1681526020019081526020015f205f82825461088c91906110aa565b925050819055508173ffffffffffffffffffffffffffffffffffffffff165f73ffffffffffffffffffffffffffffffffffffffff167fddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef836040516108f09190610d87565b60405180910390a35050565b6005602052805f5260405f205f915090505481565b60045f9054906101000a900473ffffffffffffffffffffffffffffffffffffffff1681565b6001805461094390610ee2565b80601f016020809104026020016040519081016040528092919081815260200182805461096f90610ee2565b80156109ba5780601f10610991576101008083540402835291602001916109ba565b820191905f5260205f20905b81548152906001019060200180831161099d57829003601f168201915b505050505081565b5f5f73ffffffffffffffffffffffffffffffffffffffff168373ffffffffffffffffffffffffffffffffffffffff1603610a31576040517f08c379a0000000000000000000000000000000000000000000000000000000008152600401610a2890610f5c565b60405180910390fd5b8160055f3373ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff1681526020019081526020015f20541015610ab1576040517f08c379a0000000000000000000000000000000000000000000000000000000008152600401610aa890610fc4565b60405180910390fd5b8160055f3373ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff1681526020019081526020015f205f828254610afd9190611077565b925050819055508160055f8573ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff1681526020019081526020015f205f828254610b5091906110aa565b925050819055508273ffffffffffffffffffffffffffffffffffffffff163373ffffffffffffffffffffffffffffffffffffffff167fddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef84604051610bb49190610d87565b60405180910390a36001905092915050565b6006602052815f5260405f20602052805f5260405f205f91509150505481565b5f81519050919050565b5f82825260208201905092915050565b8281835e5f83830152505050565b5f601f19601f8301169050919050565b5f610c2882610be6565b610c328185610bf0565b9350610c42818560208601610c00565b610c4b81610c0e565b840191505092915050565b5f6020820190508181035f830152610c6e8184610c1e565b905092915050565b5f5ffd5b5f73ffffffffffffffffffffffffffffffffffffffff82169050919050565b5f610ca382610c7a565b9050919050565b610cb381610c99565b8114610cbd575f5ffd5b50565b5f81359050610cce81610caa565b92915050565b5f819050919050565b610ce681610cd4565b8114610cf0575f5ffd5b50565b5f81359050610d0181610cdd565b92915050565b5f5f60408385031215610d1d57610d1c610c76565b5b5f610d2a85828601610cc0565b9250506020610d3b85828601610cf3565b9150509250929050565b5f8115159050919050565b610d5981610d45565b82525050565b5f602082019050610d725f830184610d50565b92915050565b610d8181610cd4565b82525050565b5f602082019050610d9a5f830184610d78565b92915050565b5f5f5f60608486031215610db757610db6610c76565b5b5f610dc486828701610cc0565b9350506020610dd586828701610cc0565b9250506040610de686828701610cf3565b9150509250925092565b5f60ff82169050919050565b610e0581610df0565b82525050565b5f602082019050610e1e5f830184610dfc565b92915050565b5f60208284031215610e3957610e38610c76565b5b5f610e4684828501610cc0565b91505092915050565b610e5881610c99565b82525050565b5f602082019050610e715f830184610e4f565b92915050565b5f5f60408385031215610e8d57610e8c610c76565b5b5f610e9a85828601610cc0565b9250506020610eab85828601610cc0565b9150509250929050565b7f4e487b71000000000000000000000000000000000000000000000000000000005f52602260045260245ffd5b5f6002820490506001821680610ef957607f821691505b602082108103610f0c57610f0b610eb5565b5b50919050565b7f5472616e7366657220746f207a65726f206164647265737300000000000000005f82015250565b5f610f46601883610bf0565b9150610f5182610f12565b602082019050919050565b5f6020820190508181035f830152610f7381610f3a565b9050919050565b7f496e73756666696369656e742062616c616e63650000000000000000000000005f82015250565b5f610fae601483610bf0565b9150610fb982610f7a565b602082019050919050565b5f6020820190508181035f830152610fdb81610fa2565b9050919050565b7f496e73756666696369656e7420616c6c6f77616e6365000000000000000000005f82015250565b5f611016601683610bf0565b915061102182610fe2565b602082019050919050565b5f6020820190508181035f8301526110438161100a565b9050919050565b7f4e487b71000000000000000000000000000000000000000000000000000000005f52601160045260245ffd5b5f61108182610cd4565b915061108c83610cd4565b92508282039050818111156110a4576110a361104a565b5b92915050565b5f6110b482610cd4565b91506110bf83610cd4565b92508282019050808211156110d7576110d661104a565b5b92915050565b7f4f6e6c79206f776e65722063616e206d696e74000000000000000000000000005f82015250565b5f611111601383610bf0565b915061111c826110dd565b602082019050919050565b5f6020820190508181035f83015261113e81611105565b9050919050565b7f4d696e7420746f207a65726f20616464726573730000000000000000000000005f82015250565b5f611179601483610bf0565b915061118482611145565b602082019050919050565b5f6020820190508181035f8301526111a68161116d565b905091905056fea2646970667358221220a30dd543f7a5893395b2435ddacc0a2e25658886f1873081f63b81567836b80c64736f6c634300081e0033`;

const SimpleTokenABI = [
  { inputs: [], stateMutability: 'nonpayable', type: 'constructor' },
  { inputs: [], name: 'name', outputs: [{ type: 'string' }], stateMutability: 'view' },
  { inputs: [], name: 'symbol', outputs: [{ type: 'string' }], stateMutability: 'view' },
  { inputs: [], name: 'decimals', outputs: [{ type: 'uint8' }], stateMutability: 'view' },
  { inputs: [], name: 'totalSupply', outputs: [{ type: 'uint256' }], stateMutability: 'view' },
  { inputs: [], name: 'owner', outputs: [{ type: 'address' }], stateMutability: 'view' },
  { inputs: [{ name: 'to', type: 'address' }], name: 'balanceOf', outputs: [{ type: 'uint256' }], stateMutability: 'view' },
  { inputs: [{ name: 'to', type: 'address' }, { name: 'value', type: 'uint256' }], name: 'transfer', outputs: [{ type: 'bool' }], stateMutability: 'nonpayable' },
  { inputs: [{ name: 'spender', type: 'address' }, { name: 'value', type: 'uint256' }], name: 'approve', outputs: [{ type: 'bool' }], stateMutability: 'nonpayable' },
  { inputs: [{ name: 'from', type: 'address' }, { name: 'to', type: 'address' }, { name: 'value', type: 'uint256' }], name: 'transferFrom', outputs: [{ type: 'bool' }], stateMutability: 'nonpayable' },
  { inputs: [{ name: 'to', type: 'address' }, { name: 'value', type: 'uint256' }], name: 'mint', outputs: [], stateMutability: 'nonpayable' }
];

export default function DeployToken({ onDeploySuccess }: DeployTokenProps) {
  const { wallets } = useWallets();
  const embeddedWallet = wallets.find(w => w.walletClientType === 'privy');
  
  const [tokenName, setTokenName] = useState('');
  const [tokenSymbol, setTokenSymbol] = useState('');
  const [decimals, setDecimals] = useState('18');
  const [initialSupply, setInitialSupply] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [deployedAddress, setDeployedAddress] = useState('');
  const [tokenBalance, setTokenBalance] = useState<string | null>(null);
  const [registryAddress, setRegistryAddress] = useState(() => 
    REGISTRY_ADDRESS || localStorage.getItem('registryAddress') || ''
  );
  
  // Auto-update registry address when it changes in localStorage
  useEffect(() => {
    const checkRegistry = () => {
      const saved = localStorage.getItem('registryAddress');
      if (saved && saved !== registryAddress && ethers.isAddress(saved)) {
        setRegistryAddress(saved);
      }
    };
    
    // Check on mount and periodically
    checkRegistry();
    const interval = setInterval(checkRegistry, 2000);
    return () => clearInterval(interval);
  }, [registryAddress]);

  const deployToken = async () => {
    if (!embeddedWallet) {
      setError('Please connect wallet first');
      return;
    }

    if (!tokenName || !tokenSymbol || !initialSupply) {
      setError('Please fill in all fields');
      return;
    }

    const decimalsNum = parseInt(decimals);
    if (isNaN(decimalsNum) || decimalsNum < 0 || decimalsNum > 18) {
      setError('Decimals must be between 0 and 18');
      return;
    }

    const initialSupplyNum = parseFloat(initialSupply);
    if (isNaN(initialSupplyNum) || initialSupplyNum <= 0) {
      setError('Initial supply must be a positive number');
      return;
    }

    setLoading(true);
    setError('');
    setDeployedAddress('');
    setTokenBalance(null);

    try {
      const provider = await embeddedWallet.getEthereumProvider();
      const ethersProvider = new ethers.BrowserProvider(provider);
      const signer = await ethersProvider.getSigner();
      
      // Encode constructor parameters
      const abiCoder = ethers.AbiCoder.defaultAbiCoder();
      const encodedParams = abiCoder.encode(
        ['string', 'string', 'uint8', 'uint256'],
        [tokenName, tokenSymbol, decimalsNum, ethers.parseUnits(initialSupplyNum.toString(), decimalsNum)]
      );
      
      // Combine bytecode with encoded params
      const deploymentBytecode = SimpleTokenBytecode + encodedParams.slice(2);
      
      console.log('📦 Deploying token...');
      const tx = await signer.sendTransaction({
        data: deploymentBytecode,
      });

      console.log(`📝 Transaction submitted: ${tx.hash}`);
      const receipt = await tx.wait();
      console.log(`✅ Contract deployed at: ${receipt!.contractAddress}`);
      
      const contractAddress = receipt!.contractAddress!;
      setDeployedAddress(contractAddress);
      
      // Automatically check balance after deployment
      try {
        const contract = new ethers.Contract(contractAddress, SimpleTokenABI, signer);
        const deployerAddress = await signer.getAddress();
        const balance = await contract.balanceOf(deployerAddress);
        const tokenDecimals = await contract.decimals();
        const formatted = ethers.formatUnits(balance, tokenDecimals);
        
        // Format balance properly to show small numbers
        const num = parseFloat(formatted);
        let formattedBalance = formatted;
        if (!isNaN(num)) {
          if (num === 0) {
            formattedBalance = '0';
          } else if (num < 0.000001) {
            // For very small numbers, show full precision
            formattedBalance = num.toFixed(tokenDecimals);
          } else {
            // For normal numbers, show up to 6 decimals but remove trailing zeros
            formattedBalance = num.toFixed(6).replace(/\.?0+$/, '');
          }
        }
        
        setTokenBalance(formattedBalance);
        console.log(`💰 Token balance: ${formattedBalance} ${tokenSymbol}`);
      } catch (balanceErr) {
        console.error('Error checking balance:', balanceErr);
        // Continue even if balance check fails
      }
      
      // Register token in Registry if registry address is provided
      if (registryAddress && ethers.isAddress(registryAddress)) {
        try {
          console.log('📝 Registering token in Registry...');
          const registry = new ethers.Contract(registryAddress, REGISTRY_ABI, signer);
          const initialSupplyWei = ethers.parseUnits(initialSupplyNum.toString(), decimalsNum);
          const registerTx = await registry.registerToken(
            contractAddress,
            tokenName,
            tokenSymbol,
            decimalsNum,
            initialSupplyWei
          );
          await registerTx.wait();
          console.log('✅ Token registered in Registry!');
        } catch (regErr: any) {
          console.error('⚠️ Failed to register in Registry:', regErr);
          // Continue even if registration fails - token is still deployed
        }
      } else {
        console.log('⚠️ No Registry address - token deployed but not registered');
      }
      
      if (onDeploySuccess) {
        onDeploySuccess(contractAddress, receipt!.hash, tokenName, tokenSymbol, decimalsNum);
      }
    } catch (err: any) {
      console.error('❌ Error deploying token:', err);
      setError(`Failed to deploy token: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  if (!embeddedWallet) {
    return (
      <div style={{ padding: '1rem', background: '#f8f9fa', borderRadius: '8px', textAlign: 'center' }}>
        Please connect wallet first
      </div>
    );
  }

  return (
    <div style={{ marginTop: '2rem', paddingTop: '2rem', borderTop: '1px solid #eee' }}>
      <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>Deploy Custom Token</h2>
      
      <div style={{ 
        marginBottom: '1rem', 
        padding: '0.75rem', 
        background: '#f0f7ff', 
        borderRadius: '8px',
        border: '1px solid #b3d9ff'
      }}>
        <div style={{ fontSize: '0.9rem', color: '#666', marginBottom: '0.5rem', fontWeight: 600 }}>
          TokenRegistry Address (optional):
        </div>
        <input
          type="text"
          placeholder="0x... (Leave empty to deploy without registry)"
          value={registryAddress}
          onChange={(e) => {
            setRegistryAddress(e.target.value);
            if (e.target.value && ethers.isAddress(e.target.value)) {
              localStorage.setItem('registryAddress', e.target.value);
            }
          }}
          disabled={loading}
          style={{
            width: '100%',
            padding: '0.5rem',
            fontSize: '0.9rem',
            border: '2px solid #e0e0e0',
            borderRadius: '6px',
            fontFamily: 'monospace',
            outline: 'none'
          }}
        />
        <div style={{ fontSize: '0.8rem', color: '#999', marginTop: '0.25rem' }}>
          If provided, token will be automatically registered in the Registry for on-chain tracking
        </div>
      </div>
      
      <div style={{ marginBottom: '1rem' }}>
        <input
          type="text"
          placeholder="Token Name (e.g. My Token)"
          value={tokenName}
          onChange={(e) => setTokenName(e.target.value)}
          disabled={loading}
          style={{
            width: '100%',
            padding: '0.75rem',
            fontSize: '1rem',
            border: '2px solid #e0e0e0',
            borderRadius: '8px',
            marginBottom: '0.75rem',
            outline: 'none'
          }}
        />
        
        <input
          type="text"
          placeholder="Token Symbol (e.g. MTK)"
          value={tokenSymbol}
          onChange={(e) => setTokenSymbol(e.target.value)}
          disabled={loading}
          style={{
            width: '100%',
            padding: '0.75rem',
            fontSize: '1rem',
            border: '2px solid #e0e0e0',
            borderRadius: '8px',
            marginBottom: '0.75rem',
            outline: 'none'
          }}
        />
        
        <input
          type="number"
          placeholder="Decimals (default: 18)"
          value={decimals}
          onChange={(e) => setDecimals(e.target.value)}
          disabled={loading}
          min="0"
          max="18"
          style={{
            width: '100%',
            padding: '0.75rem',
            fontSize: '1rem',
            border: '2px solid #e0e0e0',
            borderRadius: '8px',
            marginBottom: '0.75rem',
            outline: 'none'
          }}
        />
        
        <input
          type="number"
          placeholder="Initial Supply"
          value={initialSupply}
          onChange={(e) => setInitialSupply(e.target.value)}
          disabled={loading}
          min="0"
          step="0.000001"
          style={{
            width: '100%',
            padding: '0.75rem',
            fontSize: '1rem',
            border: '2px solid #e0e0e0',
            borderRadius: '8px',
            marginBottom: '0.75rem',
            outline: 'none'
          }}
        />
      </div>

      <button 
        onClick={deployToken}
        disabled={loading}
        style={{ 
          padding: '1rem 2rem', 
          fontSize: '1.1rem',
          background: loading ? '#ccc' : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: 'white',
          border: 'none',
          borderRadius: '8px',
          cursor: loading ? 'not-allowed' : 'pointer',
          fontWeight: 600,
          width: '100%',
          transition: 'transform 0.2s',
          marginBottom: '1rem'
        }}
        onMouseEnter={(e) => !loading && (e.currentTarget.style.transform = 'scale(1.02)')}
        onMouseLeave={(e) => !loading && (e.currentTarget.style.transform = 'scale(1)')}
      >
        {loading ? '🔄 Deploying...' : '🚀 Deploy Token'}
      </button>

      {error && (
        <div style={{ 
          marginTop: '1rem', 
          padding: '1rem', 
          background: '#fee',
          borderLeft: '4px solid #e00',
          borderRadius: '4px',
          color: '#c00'
        }}>
          <strong>Error:</strong> {error}
        </div>
      )}

      {deployedAddress && (
        <div style={{ 
          marginTop: '1rem', 
          padding: '1rem', 
          background: '#efe',
          borderLeft: '4px solid #0e0',
          borderRadius: '4px',
          color: '#0a0'
        }}>
          <strong>✅ Token Deployed Successfully!</strong>
          
          <div style={{ marginTop: '0.75rem', fontFamily: 'monospace', fontSize: '0.9rem' }}>
            <div style={{ marginBottom: '0.5rem' }}>
              <strong>Contract Address:</strong><br />
              {deployedAddress}
            </div>
          </div>
          
          {tokenBalance !== null && (
            <div style={{ 
              marginTop: '0.75rem', 
              padding: '0.75rem', 
              background: '#fff',
              borderRadius: '6px',
              border: '2px solid #0e0'
            }}>
              <div style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.25rem' }}>
                🎉 Tokens Minted to Your Wallet!
              </div>
              <div style={{ fontSize: '1.2rem', fontWeight: 700, color: '#0a0' }}>
                {tokenBalance} {tokenSymbol || 'tokens'}
              </div>
              <div style={{ fontSize: '0.85rem', color: '#666', marginTop: '0.25rem' }}>
                Initial supply has been automatically minted to your address
              </div>
            </div>
          )}
          
          <div style={{ marginTop: '0.75rem' }}>
            <a 
              href={`https://testnet.arcscan.app/address/${deployedAddress}`}
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: '#667eea', textDecoration: 'none', fontSize: '0.9rem', fontWeight: 600 }}
            >
              View on Arcscan →
            </a>
          </div>
        </div>
      )}
    </div>
  );
}

