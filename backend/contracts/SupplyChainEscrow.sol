// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/* We define a minimal ReentrancyGuard since we may not have the exact OpenZeppelin version installed locally */
abstract contract ReentrancyGuard {
    uint256 private constant NOT_ENTERED = 1;
    uint256 private constant ENTERED = 2;
    uint256 private _status;

    constructor() {
        _status = NOT_ENTERED;
    }

    modifier nonReentrant() {
        require(_status != ENTERED, "ReentrancyGuard: reentrant call");
        _status = ENTERED;
        _;
        _status = NOT_ENTERED;
    }
}

contract SupplyChainEscrow is ReentrancyGuard {
    address payable public platformOwner;

    struct Order {
        uint256 totalAmount;          
        address payable farmer;       
        address payable transporter;  
        bool deliveryConfirmed;       
        bool escrowReleased;          
    }

    mapping(uint256 => Order) public orders;

    constructor(address payable _platformOwner) {
        platformOwner = _platformOwner;
    }

    function lockFunds(uint256 orderId, address payable _farmer) external payable {
        require(msg.value > 0, "Escrow: Must send MATIC to lock");
        require(orders[orderId].totalAmount == 0, "Escrow: Order already exists");

        orders[orderId] = Order({
            totalAmount: msg.value,
            farmer: _farmer,
            transporter: payable(address(0)), // Can be set later or passed in 
            deliveryConfirmed: false,
            escrowReleased: false
        });
    }

    // Simplification for the backend calling approval 
    function approveRelease(uint256 orderId) external {
        orders[orderId].deliveryConfirmed = true;
        this.releaseEscrow(orderId);
    }

    function releaseEscrow(uint256 orderId) external nonReentrant {
        Order storage order = orders[orderId];
        require(order.totalAmount > 0, "Escrow: Order does not exist");
        require(order.deliveryConfirmed == true, "Escrow: Delivery is not yet confirmed");
        require(order.escrowReleased == false, "Escrow: Funds already released");

        order.escrowReleased = true;

        uint256 farmerShare = (order.totalAmount * 88) / 100;
        uint256 transporterShare = (order.totalAmount * 10) / 100;
        uint256 platformShare = order.totalAmount - farmerShare - transporterShare;
        
        (bool farmerSuccess, ) = order.farmer.call{value: farmerShare}("");
        require(farmerSuccess, "Escrow: Failed to send to farmer");

        if (order.transporter != address(0)) {
            (bool tSuccess, ) = order.transporter.call{value: transporterShare}("");
            require(tSuccess, "Escrow: Failed to send to transporter");
        } else {
            // Send transporter share to platform if no transporter is assigned safely
            platformShare += transporterShare;
        }

        (bool platformSuccess, ) = platformOwner.call{value: platformShare}("");
        require(platformSuccess, "Escrow: Failed to send to platform owner");
    }
}
