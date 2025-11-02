// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import "forge-std/Test.sol";
import "forge-std/console.sol";
import "../src/Faucet.sol";

contract FaucetTest is Test {
    ArcOnboardFaucet faucet;
    address constant USDC = 0x3600000000000000000000000000000000000000;
    
    address owner = address(0x1);
    address user1 = address(0x2);
    address user2 = address(0x3);
    
    function setUp() public {
        vm.startPrank(owner);
        faucet = new ArcOnboardFaucet();
        vm.stopPrank();
    }
    
    function testDeployment() public {
        assertEq(faucet.owner(), owner);
        assertEq(faucet.USDC(), USDC);
        assertEq(faucet.AMOUNT_PER_USER(), 5_000_000);
    }
    
    function testOnboardUser() public {
        vm.deal(address(faucet), 100_000_000); // Fund faucet
        
        vm.startPrank(owner);
        faucet.onboard(user1);
        vm.stopPrank();
        
        assertTrue(faucet.hasReceived(user1));
        assertEq(address(user1).balance, 5_000_000);
    }
    
    function testCannotReceiveTwice() public {
        vm.deal(address(faucet), 100_000_000);
        
        vm.startPrank(owner);
        faucet.onboard(user1);
        
        vm.expectRevert("User already received funds");
        faucet.onboard(user1);
        vm.stopPrank();
    }
    
    function testBatchOnboard() public {
        vm.deal(address(faucet), 100_000_000);
        
        address[] memory users = new address[](2);
        users[0] = user1;
        users[1] = user2;
        
        vm.startPrank(owner);
        faucet.onboardBatch(users);
        vm.stopPrank();
        
        assertTrue(faucet.hasReceived(user1));
        assertTrue(faucet.hasReceived(user2));
        assertEq(address(user1).balance, 5_000_000);
        assertEq(address(user2).balance, 5_000_000);
    }
}

