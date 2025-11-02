// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

/**
 * @title TokenRegistry
 * @notice Registry contract to track all deployed tokens on Arc Testnet
 * @dev Stores token information and allows querying by owner
 */
contract TokenRegistry {
    struct TokenInfo {
        address tokenAddress;
        address deployer;
        string name;
        string symbol;
        uint8 decimals;
        uint256 initialSupply;
        uint256 deployTimestamp;
    }

    // Array of all token addresses
    address[] public allTokens;
    
    // Mapping from token address to TokenInfo
    mapping(address => TokenInfo) public tokenInfo;
    
    // Mapping from deployer to array of token addresses
    mapping(address => address[]) public tokensByDeployer;
    
    // Check if token is registered
    mapping(address => bool) public isRegistered;
    
    // Events
    event TokenRegistered(
        address indexed tokenAddress,
        address indexed deployer,
        string name,
        string symbol,
        uint8 decimals,
        uint256 initialSupply
    );
    
    /**
     * @notice Register a new token in the registry
     * @param tokenAddress Address of the deployed token
     * @param name Token name
     * @param symbol Token symbol
     * @param decimals Token decimals
     * @param initialSupply Initial supply of the token
     */
    function registerToken(
        address tokenAddress,
        string memory name,
        string memory symbol,
        uint8 decimals,
        uint256 initialSupply
    ) external {
        require(tokenAddress != address(0), "Invalid token address");
        require(!isRegistered[tokenAddress], "Token already registered");
        
        TokenInfo memory info = TokenInfo({
            tokenAddress: tokenAddress,
            deployer: msg.sender,
            name: name,
            symbol: symbol,
            decimals: decimals,
            initialSupply: initialSupply,
            deployTimestamp: block.timestamp
        });
        
        tokenInfo[tokenAddress] = info;
        isRegistered[tokenAddress] = true;
        allTokens.push(tokenAddress);
        tokensByDeployer[msg.sender].push(tokenAddress);
        
        emit TokenRegistered(tokenAddress, msg.sender, name, symbol, decimals, initialSupply);
    }
    
    /**
     * @notice Get all tokens deployed by a specific address
     * @param deployer Address of the deployer
     * @return addresses Array of token addresses
     * @return infos Array of TokenInfo structs
     */
    function getTokensByDeployer(address deployer) 
        external 
        view 
        returns (address[] memory addresses, TokenInfo[] memory infos) 
    {
        addresses = tokensByDeployer[deployer];
        infos = new TokenInfo[](addresses.length);
        
        for (uint256 i = 0; i < addresses.length; i++) {
            infos[i] = tokenInfo[addresses[i]];
        }
    }
    
    /**
     * @notice Get total number of registered tokens
     * @return count Total number of tokens
     */
    function getTotalTokens() external view returns (uint256 count) {
        return allTokens.length;
    }
    
    /**
     * @notice Get all registered tokens
     * @return addresses Array of all token addresses
     * @return infos Array of TokenInfo structs
     */
    function getAllTokens() 
        external 
        view 
        returns (address[] memory addresses, TokenInfo[] memory infos) 
    {
        addresses = allTokens;
        infos = new TokenInfo[](addresses.length);
        
        for (uint256 i = 0; i < addresses.length; i++) {
            infos[i] = tokenInfo[addresses[i]];
        }
    }
    
    /**
     * @notice Get token count for a specific deployer
     * @param deployer Address of the deployer
     * @return count Number of tokens deployed by this address
     */
    function getTokenCountByDeployer(address deployer) external view returns (uint256 count) {
        return tokensByDeployer[deployer].length;
    }
}

