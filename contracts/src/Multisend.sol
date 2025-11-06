// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

/**
 * @title Multisend
 * @notice Efficient batch transfer contract for native tokens and ERC20 tokens
 * @dev Allows sending to multiple recipients in a single transaction
 */
contract Multisend {
    /**
     * @notice Batch transfer native tokens (USDC on Arc) to multiple recipients
     * @param recipients Array of recipient addresses
     * @param amounts Array of amounts to send (in wei)
     */
    function batchSendNative(
        address[] calldata recipients,
        uint256[] calldata amounts
    ) external payable {
        require(recipients.length == amounts.length, "Arrays length mismatch");
        require(recipients.length > 0, "Empty recipients array");
        
        uint256 totalAmount = 0;
        for (uint256 i = 0; i < amounts.length; i++) {
            totalAmount += amounts[i];
        }
        require(msg.value >= totalAmount, "Insufficient value sent");
        
        for (uint256 i = 0; i < recipients.length; i++) {
            (bool success, ) = recipients[i].call{value: amounts[i]}("");
            require(success, "Transfer failed");
        }
        
        // Refund excess if any
        if (msg.value > totalAmount) {
            (bool success, ) = msg.sender.call{value: msg.value - totalAmount}("");
            require(success, "Refund failed");
        }
    }

    /**
     * @notice Batch transfer ERC20 tokens to multiple recipients
     * @param token Address of the ERC20 token contract
     * @param recipients Array of recipient addresses
     * @param amounts Array of amounts to send
     */
    function batchSendERC20(
        address token,
        address[] calldata recipients,
        uint256[] calldata amounts
    ) external {
        require(recipients.length == amounts.length, "Arrays length mismatch");
        require(recipients.length > 0, "Empty recipients array");
        
        // Transfer tokens from sender to this contract first
        // User must approve this contract to spend their tokens
        IERC20 tokenContract = IERC20(token);
        
        uint256 totalAmount = 0;
        for (uint256 i = 0; i < amounts.length; i++) {
            totalAmount += amounts[i];
        }
        
        // Transfer from sender to this contract
        require(
            tokenContract.transferFrom(msg.sender, address(this), totalAmount),
            "Token transfer failed"
        );
        
        // Distribute to recipients
        for (uint256 i = 0; i < recipients.length; i++) {
            require(
                tokenContract.transfer(recipients[i], amounts[i]),
                "Recipient transfer failed"
            );
        }
    }

    /**
     * @notice Batch transfer ERC20 tokens directly (optimized version)
     * @dev This version transfers directly from sender to recipients without intermediate storage
     * @param token Address of the ERC20 token contract
     * @param recipients Array of recipient addresses
     * @param amounts Array of amounts to send
     */
    function batchSendERC20Direct(
        address token,
        address[] calldata recipients,
        uint256[] calldata amounts
    ) external {
        require(recipients.length == amounts.length, "Arrays length mismatch");
        require(recipients.length > 0, "Empty recipients array");
        
        IERC20 tokenContract = IERC20(token);
        
        // Transfer directly from sender to each recipient
        for (uint256 i = 0; i < recipients.length; i++) {
            require(
                tokenContract.transferFrom(msg.sender, recipients[i], amounts[i]),
                "Transfer failed"
            );
        }
    }
}

/**
 * @title IERC20
 * @notice Minimal ERC20 interface for token transfers
 */
interface IERC20 {
    function transfer(address to, uint256 amount) external returns (bool);
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function approve(address spender, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
}

