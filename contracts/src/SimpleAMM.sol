// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

/**
 * @title SimpleAMM
 * @notice Simple Automated Market Maker using constant product formula (x * y = k)
 * @dev Each pool pairs a token with USDC (native token on Arc)
 */
contract SimpleAMM {
    // Pool structure: stores reserves for token and USDC
    struct Pool {
        address token;
        uint256 tokenReserve;
        uint256 usdcReserve;
        uint256 totalLiquidity; // Total LP tokens issued
    }
    
    // Mapping from token address to pool
    mapping(address => Pool) public pools;
    
    // Mapping from token address to whether pool exists
    mapping(address => bool) public poolExists;
    
    // Events
    event PoolCreated(address indexed token, uint256 tokenAmount, uint256 usdcAmount);
    event LiquidityAdded(address indexed token, address indexed provider, uint256 tokenAmount, uint256 usdcAmount, uint256 lpTokens);
    event LiquidityRemoved(address indexed token, address indexed provider, uint256 tokenAmount, uint256 usdcAmount, uint256 lpTokens);
    event Swap(address indexed token, address indexed user, bool tokenIn, uint256 amountIn, uint256 amountOut);
    
    /**
     * @notice Create a new liquidity pool for a token
     * @param token Address of the token
     * @param tokenAmount Initial amount of tokens to add
     * @param usdcAmount Initial amount of USDC to add
     * @dev User must approve this contract to spend tokens first
     */
    function createPool(address token, uint256 tokenAmount, uint256 usdcAmount) external payable {
        require(token != address(0), "Invalid token address");
        require(!poolExists[token], "Pool already exists");
        require(tokenAmount > 0 && usdcAmount > 0, "Amounts must be greater than 0");
        
        // Transfer tokens from user
        (bool success, bytes memory data) = token.call(
            abi.encodeWithSignature("transferFrom(address,address,uint256)", msg.sender, address(this), tokenAmount)
        );
        require(success && (data.length == 0 || abi.decode(data, (bool))), "Token transfer failed");
        
        // Transfer USDC (native token) from user
        require(msg.value >= usdcAmount, "Insufficient USDC sent");
        
        // Create pool
        pools[token] = Pool({
            token: token,
            tokenReserve: tokenAmount,
            usdcReserve: usdcAmount,
            totalLiquidity: sqrt(tokenAmount * usdcAmount) // Initial LP tokens
        });
        poolExists[token] = true;
        
        // Refund excess USDC
        if (msg.value > usdcAmount) {
            payable(msg.sender).transfer(msg.value - usdcAmount);
        }
        
        emit PoolCreated(token, tokenAmount, usdcAmount);
    }
    
    /**
     * @notice Add liquidity to an existing pool
     * @param token Address of the token
     * @param tokenAmount Amount of tokens to add
     * @param usdcAmount Amount of USDC to add
     * @return lpTokens Amount of LP tokens minted
     */
    function addLiquidity(address token, uint256 tokenAmount, uint256 usdcAmount) external payable returns (uint256 lpTokens) {
        require(poolExists[token], "Pool does not exist");
        require(tokenAmount > 0 && usdcAmount > 0, "Amounts must be greater than 0");
        
        Pool storage pool = pools[token];
        
        // Maintain ratio: tokenAmount/usdcAmount should equal tokenReserve/usdcReserve
        uint256 expectedUsdc = (tokenAmount * pool.usdcReserve) / pool.tokenReserve;
        require(usdcAmount >= expectedUsdc * 99 / 100, "Amounts not in correct ratio"); // Allow 1% slippage
        
        // Use minimum to maintain ratio
        uint256 actualUsdc = usdcAmount <= expectedUsdc ? usdcAmount : expectedUsdc;
        uint256 actualToken = (actualUsdc * pool.tokenReserve) / pool.usdcReserve;
        
        if (actualToken < tokenAmount) {
            // Refund excess tokens (would need approval/transfer, simplified here)
            tokenAmount = actualToken;
        }
        
        // Transfer tokens
        (bool success, bytes memory data) = token.call(
            abi.encodeWithSignature("transferFrom(address,address,uint256)", msg.sender, address(this), tokenAmount)
        );
        require(success && (data.length == 0 || abi.decode(data, (bool))), "Token transfer failed");
        
        // Transfer USDC
        require(msg.value >= actualUsdc, "Insufficient USDC sent");
        
        // Calculate LP tokens to mint
        lpTokens = (tokenAmount * pool.totalLiquidity) / pool.tokenReserve;
        
        // Update reserves
        pool.tokenReserve += tokenAmount;
        pool.usdcReserve += actualUsdc;
        pool.totalLiquidity += lpTokens;
        
        // Refund excess USDC
        if (msg.value > actualUsdc) {
            payable(msg.sender).transfer(msg.value - actualUsdc);
        }
        
        emit LiquidityAdded(token, msg.sender, tokenAmount, actualUsdc, lpTokens);
        return lpTokens;
    }
    
    /**
     * @notice Swap USDC for tokens
     * @param token Address of the token
     * @param usdcAmount Amount of USDC to swap
     * @return tokenAmount Amount of tokens received
     */
    function buyTokens(address token, uint256 usdcAmount) external payable returns (uint256 tokenAmount) {
        require(poolExists[token], "Pool does not exist");
        require(usdcAmount > 0, "Amount must be greater than 0");
        
        uint256 actualUsdc = msg.value > 0 ? msg.value : usdcAmount;
        require(actualUsdc >= usdcAmount, "Insufficient USDC sent");
        
        Pool storage pool = pools[token];
        
        // Calculate output using constant product formula: (x * y = k)
        // After swap: (tokenReserve - tokenAmount) * (usdcReserve + actualUsdc) = tokenReserve * usdcReserve
        // tokenAmount = (tokenReserve * actualUsdc) / (usdcReserve + actualUsdc)
        tokenAmount = (pool.tokenReserve * actualUsdc) / (pool.usdcReserve + actualUsdc);
        
        require(tokenAmount > 0, "Insufficient liquidity");
        require(tokenAmount <= pool.tokenReserve, "Insufficient token reserve");
        
        // Update reserves
        pool.usdcReserve += actualUsdc;
        pool.tokenReserve -= tokenAmount;
        
        // Transfer tokens to user
        (bool success, bytes memory data) = token.call(
            abi.encodeWithSignature("transfer(address,uint256)", msg.sender, tokenAmount)
        );
        require(success && (data.length == 0 || abi.decode(data, (bool))), "Token transfer failed");
        
        // Refund excess USDC
        if (msg.value > actualUsdc) {
            payable(msg.sender).transfer(msg.value - actualUsdc);
        }
        
        emit Swap(token, msg.sender, false, actualUsdc, tokenAmount);
        return tokenAmount;
    }
    
    /**
     * @notice Swap tokens for USDC
     * @param token Address of the token
     * @param tokenAmount Amount of tokens to swap
     * @return usdcAmount Amount of USDC received
     */
    function sellTokens(address token, uint256 tokenAmount) external returns (uint256 usdcAmount) {
        require(poolExists[token], "Pool does not exist");
        require(tokenAmount > 0, "Amount must be greater than 0");
        
        Pool storage pool = pools[token];
        
        // Calculate output using constant product formula
        // After swap: (tokenReserve + tokenAmount) * (usdcReserve - usdcAmount) = tokenReserve * usdcReserve
        // usdcAmount = (usdcReserve * tokenAmount) / (tokenReserve + tokenAmount)
        usdcAmount = (pool.usdcReserve * tokenAmount) / (pool.tokenReserve + tokenAmount);
        
        require(usdcAmount > 0, "Insufficient liquidity");
        require(usdcAmount <= pool.usdcReserve, "Insufficient USDC reserve");
        
        // Transfer tokens from user
        (bool success, bytes memory data) = token.call(
            abi.encodeWithSignature("transferFrom(address,address,uint256)", msg.sender, address(this), tokenAmount)
        );
        require(success && (data.length == 0 || abi.decode(data, (bool))), "Token transfer failed");
        
        // Update reserves
        pool.tokenReserve += tokenAmount;
        pool.usdcReserve -= usdcAmount;
        
        // Transfer USDC to user
        payable(msg.sender).transfer(usdcAmount);
        
        emit Swap(token, msg.sender, true, tokenAmount, usdcAmount);
        return usdcAmount;
    }
    
    /**
     * @notice Get current price of token in USDC (amount of USDC per 1 token)
     * @param token Address of the token
     * @return price Price per token (scaled by 1e18)
     */
    function getPrice(address token) external view returns (uint256 price) {
        require(poolExists[token], "Pool does not exist");
        Pool memory pool = pools[token];
        
        if (pool.tokenReserve == 0) return 0;
        
        // Price = usdcReserve / tokenReserve (scaled by 1e18)
        price = (pool.usdcReserve * 1e18) / pool.tokenReserve;
        return price;
    }
    
    /**
     * @notice Get reserves for a token pool
     * @param token Address of the token
     * @return tokenReserve Token reserve
     * @return usdcReserve USDC reserve
     */
    function getReserves(address token) external view returns (uint256 tokenReserve, uint256 usdcReserve) {
        require(poolExists[token], "Pool does not exist");
        Pool memory pool = pools[token];
        return (pool.tokenReserve, pool.usdcReserve);
    }
    
    /**
     * @notice Calculate amount of tokens received for a given USDC amount (without executing swap)
     * @param token Address of the token
     * @param usdcAmount Amount of USDC
     * @return tokenAmount Amount of tokens that would be received
     */
    function getBuyQuote(address token, uint256 usdcAmount) external view returns (uint256 tokenAmount) {
        require(poolExists[token], "Pool does not exist");
        Pool memory pool = pools[token];
        
        if (usdcAmount == 0 || pool.usdcReserve == 0) return 0;
        
        tokenAmount = (pool.tokenReserve * usdcAmount) / (pool.usdcReserve + usdcAmount);
        return tokenAmount;
    }
    
    /**
     * @notice Calculate amount of USDC received for a given token amount (without executing swap)
     * @param token Address of the token
     * @param tokenAmount Amount of tokens
     * @return usdcAmount Amount of USDC that would be received
     */
    function getSellQuote(address token, uint256 tokenAmount) external view returns (uint256 usdcAmount) {
        require(poolExists[token], "Pool does not exist");
        Pool memory pool = pools[token];
        
        if (tokenAmount == 0 || pool.tokenReserve == 0) return 0;
        
        usdcAmount = (pool.usdcReserve * tokenAmount) / (pool.tokenReserve + tokenAmount);
        return usdcAmount;
    }
    
    /**
     * @notice Internal function to calculate square root (for initial LP calculation)
     */
    function sqrt(uint256 x) internal pure returns (uint256) {
        if (x == 0) return 0;
        uint256 z = (x + 1) / 2;
        uint256 y = x;
        while (z < y) {
            y = z;
            z = (x / z + z) / 2;
        }
        return y;
    }
    
    // Allow contract to receive USDC (native token)
    receive() external payable {}
}
