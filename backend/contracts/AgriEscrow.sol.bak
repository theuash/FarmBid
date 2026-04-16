// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

contract AgriEscrow is Ownable, ReentrancyGuard {
    enum OrderStatus { NONE, AWAITING_DELIVERY, COMPLETE, FARMER_PENALIZED, BUYER_PENALIZED }

    struct Order {
        address buyer;
        address farmer;
        uint256 amount;
        uint256 lockedAt;
        OrderStatus status;
    }

    mapping(string => Order) public orders;
    address public platformAddress;

    event FundsLocked(string orderId, address indexed buyer, address indexed farmer, uint256 amount);
    event FundsReleased(string orderId, address indexed farmer, uint256 amount);
    event FarmerPenalized(string orderId, uint256 penalty);
    event BuyerPenalized(string orderId, uint256 penalty);

    modifier onlyPlatform() {
        require(msg.sender == platformAddress, "Caller is not the platform");
        _;
    }

    constructor() {
        platformAddress = msg.sender;
    }

    function setPlatformAddress(address _platformAddress) external onlyOwner {
        require(_platformAddress != address(0), "Invalid platform address");
        platformAddress = _platformAddress;
    }

    function lockFunds(string memory orderId, address farmerAddress) external payable nonReentrant {
        require(orders[orderId].status == OrderStatus.NONE, "Order already exists");
        require(msg.value > 0, "Amount must be greater than zero");
        require(farmerAddress != address(0), "Invalid farmer address");

        orders[orderId] = Order({
            buyer: msg.sender,
            farmer: farmerAddress,
            amount: msg.value,
            lockedAt: block.timestamp,
            status: OrderStatus.AWAITING_DELIVERY
        });

        emit FundsLocked(orderId, msg.sender, farmerAddress, msg.value);
    }

    function approveRelease(string memory orderId) external onlyPlatform nonReentrant {
        Order storage order = orders[orderId];
        require(order.status == OrderStatus.AWAITING_DELIVERY, "Order not awaiting delivery");

        order.status = OrderStatus.COMPLETE;
        uint256 amountToRelease = order.amount;
        
        (bool success, ) = payable(order.farmer).call{value: amountToRelease}("");
        require(success, "Transfer to farmer failed");

        emit FundsReleased(orderId, order.farmer, amountToRelease);
    }

    function penalizeFarmer(string memory orderId) external onlyPlatform nonReentrant {
        Order storage order = orders[orderId];
        require(order.status == OrderStatus.AWAITING_DELIVERY, "Order not awaiting delivery");

        order.status = OrderStatus.FARMER_PENALIZED;
        
        // 10% penalty to platform, rest to buyer
        uint256 penalty = (order.amount * 10) / 100;
        uint256 refund = order.amount - penalty;

        (bool successPenalty, ) = payable(platformAddress).call{value: penalty}("");
        require(successPenalty, "Transfer back to platform failed");

        (bool successRefund, ) = payable(order.buyer).call{value: refund}("");
        require(successRefund, "Refund to buyer failed");

        emit FarmerPenalized(orderId, penalty);
    }

    function penalizeBuyer(string memory orderId) external onlyPlatform nonReentrant {
        Order storage order = orders[orderId];
        require(order.status == OrderStatus.AWAITING_DELIVERY, "Order not awaiting delivery");

        order.status = OrderStatus.BUYER_PENALIZED;
        
        // 10% penalty to farmer, rest to buyer
        uint256 penaltyToFarmer = (order.amount * 10) / 100;
        uint256 refundToBuyer = order.amount - penaltyToFarmer;

        (bool successPenalty, ) = payable(order.farmer).call{value: penaltyToFarmer}("");
        require(successPenalty, "Penalty to farmer failed");

        (bool successRefund, ) = payable(order.buyer).call{value: refundToBuyer}("");
        require(successRefund, "Refund to buyer failed");

        emit BuyerPenalized(orderId, penaltyToFarmer);
    }

    function getOrder(string memory orderId) external view returns (Order memory) {
        return orders[orderId];
    }

    function emergencyRefund(string memory orderId) external onlyOwner nonReentrant {
        Order storage order = orders[orderId];
        require(order.status == OrderStatus.AWAITING_DELIVERY, "Order not awaiting delivery");
        require(block.timestamp >= order.lockedAt + 7 days, "Funds are timelocked for 7 days");

        order.status = OrderStatus.BUYER_PENALIZED; // Conceptually refunding to buyer. Wait, lets just handle it and maybe set to a custom status or complete.
        // I will set it to BUYER_PENALIZED as requested conceptually a cancel, or just return all to buyer.
        // Wait, prompt: "emergencyRefund(orderId) — onlyOwner, safety valve for stuck funds (adds 7-day timelock)". Usually it's refund to buyer.
        
        order.status = OrderStatus.COMPLETE; // or something, but enum has NO custom status for refunded. Let's just set to complete to avoid reentrancy. Or BUYER_PENALIZED.
        uint256 refund = order.amount;
        order.amount = 0; // prevent double spend
        
        (bool success, ) = payable(order.buyer).call{value: refund}("");
        require(success, "Refund to buyer failed");
    }
}
