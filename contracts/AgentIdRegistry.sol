// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IAgentId} from "./interfaces/IAgentId.sol";
import {AgentPassToken} from "./AgentPassToken.sol";
import {AgentReceipt} from "./AgentReceipt.sol";

/**
 * @title AgentIdRegistry
 * @notice AgentPass — the on-chain passport & access registry for Agent ID holders.
 *
 * @dev    Agent ID (the `name.ai` on-chain identity of an Agentic Wallet) is the
 *         core identity primitive of this dApp:
 *
 *         1. `register(agentTokenId)` proves on-chain that the caller really owns
 *            the Agent ID (`ownerOf(agentTokenId) == msg.sender`) and that the
 *            wallet holds one (`balanceOf(msg.sender) > 0`). A passport can only
 *            be created by a genuine Agent ID holder.
 *         2. `checkIn()` — the daily engagement loop — re-verifies Agent ID
 *            ownership before allowing activity, so the whole product is gated
 *            by Agent ID.
 *         3. `purchaseSlot()` — the payment path — is also Agent ID gated and
 *            unlocks time-limited premium access to gated on-chain content.
 *
 *         Owner permissions (fully disclosed, see docs/COMPLIANCE.md):
 *         - `withdrawFees(address)`: withdraws collected BNB fees.
 *         - `setGatedContent(uint256,bytes32)`: publishes gated content hashes.
 *         - `setSlotPrice(uint256)`: changes the price of the premium slot.
 *         - `transferOwnership(address)`: hands over administration.
 *         - The owner CANNOT mint PASS, mint receipts, forge passports, bypass
 *           the Agent ID requirement, pause the registry or move user funds
 *           automatically. There are no scheduled or automatic transfers.
 */
contract AgentIdRegistry {
    // ---------------------------------------------------------------------
    // Immutables
    // ---------------------------------------------------------------------

    /// @notice Binance Agent ID ERC-721 collection on BNB Chain.
    IAgentId public immutable agentId;

    /// @notice PASS reputation token, deployed by this registry.
    AgentPassToken public immutable points;

    /// @notice Non-transferable proof-of-activity receipts, deployed by this registry.
    AgentReceipt public immutable receipts;

    // ---------------------------------------------------------------------
    // Types
    // ---------------------------------------------------------------------

    struct Passport {
        uint256 agentTokenId;
        string agentTokenURI;
        uint64 joinedAt;
        uint64 lastCheckIn;
        uint32 streak;
        uint32 checkIns;
        uint256 score;
        bool registered;
        bool premium;
        uint64 premiumUntil;
    }

    // ---------------------------------------------------------------------
    // Storage
    // ---------------------------------------------------------------------

    address public owner;

    /// @notice Registered Agent ID addresses, in registration order.
    address[] private _agents;

    mapping(address => Passport) private _passports;

    /// @notice Reputation score per Agent ID address.
    mapping(address => uint256) public scoreOf;

    /// @notice Hash of the gated content published for a content id.
    mapping(uint256 => bytes32) public gatedContent;

    /// @notice Whether an address already redeemed a content id.
    mapping(uint256 => mapping(address => bool)) public contentRedeemed;

    // ---------------------------------------------------------------------
    // Parameters
    // ---------------------------------------------------------------------

    /// @notice Minimum delay between two check-ins (4 hours).
    uint256 public constant CHECK_IN_COOLDOWN = 4 hours;

    /// @notice Streak window: a check-in within this window continues the streak.
    uint256 public constant STREAK_WINDOW = 24 hours;

    /// @notice Duration of a premium slot.
    uint256 public constant SLOT_DURATION = 30 days;

    /// @notice PASS points awarded for a check-in (before streak bonus).
    uint256 public constant POINTS_PER_CHECK_IN = 10 ether;

    /// @notice Extra PASS points per streak level.
    uint256 public constant STREAK_BONUS = 2 ether;

    /// @notice Current price of the premium slot, in BNB wei. Owner-adjustable.
    uint256 public slotPrice;

    // ---------------------------------------------------------------------
    // Metrics
    // ---------------------------------------------------------------------

    /// @notice Number of registered Agent ID addresses (unique passports).
    uint256 public totalAgents;

    /// @notice Number of check-ins performed across all passports.
    uint256 public totalCheckIns;

    /// @notice Total BNB volume collected from premium slots.
    uint256 public totalVolume;

    /// @notice Number of receipts minted.
    uint256 public totalReceipts;

    // ---------------------------------------------------------------------
    // Events
    // ---------------------------------------------------------------------

    event Registered(address indexed agent, uint256 indexed agentTokenId);
    event CheckedIn(address indexed agent, uint32 streak, uint256 reward, uint256 score);
    event SlotPurchased(address indexed agent, uint256 amount, uint64 premiumUntil);
    event ContentRedeemed(address indexed agent, uint256 indexed contentId, bytes32 contentHash);
    event GatedContentSet(uint256 indexed contentId, bytes32 contentHash);
    event SlotPriceUpdated(uint256 oldPrice, uint256 newPrice);
    event FeesWithdrawn(address indexed to, uint256 amount);
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);

    // ---------------------------------------------------------------------
    // Errors
    // ---------------------------------------------------------------------

    error NotOwner();
    error NotAgentIdOwner();
    error NoAgentId();
    error AlreadyRegistered();
    error NotRegistered();
    error CheckInTooSoon();
    error WrongPrice();
    error NotPremium();
    error ZeroAddress();
    error NothingToWithdraw();

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    constructor(address agentIdAddress) {
        if (agentIdAddress == address(0)) revert ZeroAddress();
        agentId = IAgentId(agentIdAddress);
        points = new AgentPassToken(address(this));
        receipts = new AgentReceipt(address(this));
        slotPrice = 0.005 ether;
        owner = msg.sender;
        emit OwnershipTransferred(address(0), msg.sender);
    }

    // ---------------------------------------------------------------------
    // Agent ID integration
    // ---------------------------------------------------------------------

    /// @notice True when the address holds at least one Agent ID.
    function hasAgentId(address account) public view returns (bool) {
        return agentId.balanceOf(account) > 0;
    }

    /// @notice Agent ID token id registered by an address (0 when unregistered).
    function agentTokenIdOf(address account) external view returns (uint256) {
        return _passports[account].agentTokenId;
    }

    /// @notice Creates a passport. Requires on-chain proof of Agent ID ownership.
    function register(uint256 agentTokenId) external {
        Passport storage p = _passports[msg.sender];
        if (p.registered) revert AlreadyRegistered();
        if (agentId.ownerOf(agentTokenId) != msg.sender) revert NotAgentIdOwner();

        p.agentTokenId = agentTokenId;
        p.agentTokenURI = agentId.tokenURI(agentTokenId);
        p.joinedAt = uint64(block.timestamp);
        p.registered = true;

        _agents.push(msg.sender);
        totalAgents += 1;

        emit Registered(msg.sender, agentTokenId);
    }

    // ---------------------------------------------------------------------
    // Engagement
    // ---------------------------------------------------------------------

    /// @notice Daily check-in: the core engagement loop, gated by Agent ID.
    function checkIn() external {
        Passport storage p = _passports[msg.sender];
        if (!p.registered) revert NotRegistered();
        if (!hasAgentId(msg.sender)) revert NoAgentId();

        uint256 nextAllowed = uint256(p.lastCheckIn) + CHECK_IN_COOLDOWN;
        if (block.timestamp < nextAllowed) revert CheckInTooSoon();

        uint32 streak = 1;
        if (p.lastCheckIn != 0 && block.timestamp <= uint256(p.lastCheckIn) + STREAK_WINDOW) {
            streak = p.streak + 1;
        }

        uint256 reward = POINTS_PER_CHECK_IN + uint256(streak - 1) * STREAK_BONUS;

        p.lastCheckIn = uint64(block.timestamp);
        p.streak = streak;
        p.checkIns += 1;
        p.score += reward;
        scoreOf[msg.sender] = p.score;

        points.mint(msg.sender, reward);
        totalCheckIns += 1;

        emit CheckedIn(msg.sender, streak, reward, p.score);

        if (p.checkIns == 1 || streak % 7 == 0) {
            string memory milestone = p.checkIns == 1
                ? string.concat("first-check-in")
                : string.concat("streak-", _toString(streak));
            receipts.mint(msg.sender, p.agentTokenId, milestone);
            totalReceipts += 1;
        }
    }

    // ---------------------------------------------------------------------
    // Payment + gated access
    // ---------------------------------------------------------------------

    /// @notice Buys a premium slot (payment use case). Unlocks gated content.
    function purchaseSlot() external payable {
        Passport storage p = _passports[msg.sender];
        if (!p.registered) revert NotRegistered();
        if (!hasAgentId(msg.sender)) revert NoAgentId();
        if (msg.value != slotPrice) revert WrongPrice();

        uint64 until = p.premiumUntil > block.timestamp ? p.premiumUntil : uint64(block.timestamp);
        until += uint64(SLOT_DURATION);
        p.premium = true;
        p.premiumUntil = until;

        totalVolume += msg.value;
        emit SlotPurchased(msg.sender, msg.value, until);
    }

    /// @notice True when the address currently holds an active premium slot.
    function isPremium(address account) public view returns (bool) {
        Passport storage p = _passports[account];
        return p.premium && p.premiumUntil > block.timestamp;
    }

    /// @notice Expiry timestamp of the premium slot.
    function premiumExpiry(address account) external view returns (uint64) {
        return _passports[account].premiumUntil;
    }

    /// @notice Redeems a gated content item. Requires an active premium slot.
    function redeemGatedContent(uint256 contentId) external {
        if (!isPremium(msg.sender)) revert NotPremium();
        if (contentRedeemed[contentId][msg.sender]) {
            emit ContentRedeemed(msg.sender, contentId, gatedContent[contentId]);
            return;
        }
        contentRedeemed[contentId][msg.sender] = true;
        emit ContentRedeemed(msg.sender, contentId, gatedContent[contentId]);
    }

    // ---------------------------------------------------------------------
    // Views
    // ---------------------------------------------------------------------

    function passportOf(address account) external view returns (Passport memory) {
        return _passports[account];
    }

    function agentsCount() external view returns (uint256) {
        return _agents.length;
    }

    function agentAt(uint256 index) external view returns (address) {
        return _agents[index];
    }

    function stats()
        external
        view
        returns (uint256 agents, uint256 checkIns, uint256 volume, uint256 receiptCount)
    {
        return (totalAgents, totalCheckIns, totalVolume, totalReceipts);
    }

    /// @notice Returns every registered address with its score (for the leaderboard).
    function leaderboard() external view returns (address[] memory agents, uint256[] memory scores) {
        uint256 len = _agents.length;
        agents = new address[](len);
        scores = new uint256[](len);
        for (uint256 i = 0; i < len; i++) {
            agents[i] = _agents[i];
            scores[i] = scoreOf[_agents[i]];
        }
    }

    // ---------------------------------------------------------------------
    // Administration (fully disclosed, see docs/COMPLIANCE.md)
    // ---------------------------------------------------------------------

    /// @notice Withdraws collected BNB fees to a chosen address.
    function withdrawFees(address payable to) external onlyOwner {
        if (to == address(0)) revert ZeroAddress();
        uint256 amount = address(this).balance;
        if (amount == 0) revert NothingToWithdraw();
        (bool ok, ) = to.call{value: amount}("");
        if (!ok) revert NothingToWithdraw();
        emit FeesWithdrawn(to, amount);
    }

    /// @notice Publishes the hash of a gated content item.
    function setGatedContent(uint256 contentId, bytes32 contentHash) external onlyOwner {
        gatedContent[contentId] = contentHash;
        emit GatedContentSet(contentId, contentHash);
    }

    /// @notice Updates the premium slot price.
    function setSlotPrice(uint256 newPrice) external onlyOwner {
        emit SlotPriceUpdated(slotPrice, newPrice);
        slotPrice = newPrice;
    }

    /// @notice Transfers administration.
    function transferOwnership(address newOwner) external onlyOwner {
        if (newOwner == address(0)) revert ZeroAddress();
        address previous = owner;
        owner = newOwner;
        emit OwnershipTransferred(previous, newOwner);
    }

    // ---------------------------------------------------------------------
    // Internals
    // ---------------------------------------------------------------------

    function _toString(uint256 value) private pure returns (string memory) {
        if (value == 0) return "0";
        uint256 digits;
        uint256 temp = value;
        while (temp != 0) {
            digits++;
            temp /= 10;
        }
        bytes memory buffer = new bytes(digits);
        while (value != 0) {
            digits -= 1;
            buffer[digits] = bytes1(uint8(48 + uint256(value % 10)));
            value /= 10;
        }
        return string(buffer);
    }
}
