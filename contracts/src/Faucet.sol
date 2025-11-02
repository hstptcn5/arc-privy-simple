// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

/**
 * @title ArcOnboardFaucet
 * @notice Simple faucet contract for onboarding users on Arc Testnet
 * @dev This contract holds USDC and distributes it to users
 */
contract ArcOnboardFaucet {
    // USDC contract address on Arc Testnet
    address public constant USDC = 0x3600000000000000000000000000000000000000;
    
    // Amount to distribute per user (5 USDC with 6 decimals)
    uint256 public constant AMOUNT_PER_USER = 5_000_000;
    
    // Owner of the faucet
    address public owner;
    
    // Track if address has already received funds
    mapping(address => bool) public hasReceived;
    
    // Event emitted when funds are distributed
    event Onboarded(address indexed user, uint256 amount);
    
    /**
     * @notice Constructor sets the owner
     */
    constructor() {
        owner = msg.sender;
    }
    
    /**
     * @notice Allows owner to fund the faucet
     */
    function fund() external payable {
        require(msg.sender == owner, "Only owner can fund");
        require(msg.value > 0, "Must send USDC");
    }
    
    /**
     * @notice Onboard a user by transferring 5 USDC
     * @param user Address of the user to onboard
     */
    function onboard(address user) external {
        require(!hasReceived[user], "User already received funds");
        
        // Transfer USDC to user
        (bool success, ) = USDC.call(
            abi.encodeWithSignature(
                "transfer(address,uint256)",
                user,
                AMOUNT_PER_USER
            )
        );
        require(success, "Transfer failed");
        
        hasReceived[user] = true;
        emit Onboarded(user, AMOUNT_PER_USER);
    }
    
    /**
     * @notice Batch onboard multiple users
     * @param users Array of user addresses
     */
    function onboardBatch(address[] calldata users) external {
        for (uint256 i = 0; i < users.length; i++) {
            if (!hasReceived[users[i]]) {
                onboard(users[i]);
            }
        }
    }
    
    /**
     * @notice Get USDC balance of this contract
     * @return Balance in USDC (6 decimals)
     */
    function getBalance() external view returns (uint256) {
        // On Arc, USDC is native so we check balance
        return address(this).balance;
    }
    
    /**
     * @notice Allow owner to withdraw funds
     */
    function withdraw() external {
        require(msg.sender == owner, "Only owner can withdraw");
        (bool success, ) = payable(owner).call{value: address(this).balance}("");
        require(success, "Withdraw failed");
    }
    
    /**
     * @notice Allow contract to receive native USDC
     */
    receive() external payable {}
}

