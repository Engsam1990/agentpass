// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {Strings} from "@openzeppelin/contracts/utils/Strings.sol";
import {Base64} from "@openzeppelin/contracts/utils/Base64.sol";

/**
 * @title AgentReceipt
 * @notice Non-transferable on-chain receipt that proves an Agent ID holder
 *         performed a milestone action inside the AgentPass dApp.
 *
 * @dev    Owner permissions (fully disclosed):
 *         - The owner CANNOT mint, burn, pause or change existing receipts.
 *         - Receipts are minted only by the `AgentIdRegistry`.
 *         - Receipts are non-transferable by design (see `_update`).
 */
contract AgentReceipt is ERC721 {
    using Strings for uint256;

    address public immutable registry;

    uint256 private _nextTokenId;

    /// @dev tokenId => Agent ID token id that produced the receipt.
    mapping(uint256 => uint256) private _agentTokenIds;

    /// @dev tokenId => milestone key, e.g. "first-check-in" or "streak-7".
    mapping(uint256 => string) private _milestones;

    error NotRegistry();
    error NonTransferable();

    constructor(address registry_) ERC721("AgentPass Receipt", "APRC") {
        registry = registry_;
    }

    function mint(address to, uint256 agentTokenId_, string calldata milestone_) external {
        if (msg.sender != registry) revert NotRegistry();
        _nextTokenId += 1;
        uint256 tokenId = _nextTokenId;
        _agentTokenIds[tokenId] = agentTokenId_;
        _milestones[tokenId] = milestone_;
        _safeMint(to, tokenId);
    }

    /// @notice Agent ID token id behind a receipt.
    function agentTokenIdOf(uint256 tokenId) external view returns (uint256) {
        return _agentTokenIds[tokenId];
    }

    /// @notice Milestone key of a receipt.
    function milestoneOf(uint256 tokenId) external view returns (string memory) {
        return _milestones[tokenId];
    }

    /// @notice Full on-chain metadata for the receipt (data URI, no IPFS needed).
    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        _requireOwned(tokenId);
        string memory milestone = _milestones[tokenId];
        string memory json = string.concat(
            '{"name":"AgentPass Receipt #',
            tokenId.toString(),
            '","description":"Non-transferable proof-of-activity receipt issued to an Agent ID holder on BNB Chain.","attributes":[{"trait_type":"Agent ID Token","value":',
            _agentTokenIds[tokenId].toString(),
            '},{"trait_type":"Milestone","value":"',
            milestone,
            '"}]}'
        );
        return string.concat("data:application/json;base64,", Base64.encode(bytes(json)));
    }

    /// @dev Blocks every transfer and burn: receipts are permanent proof-of-activity.
    ///      `auth == address(0)` marks the initial mint, which stays allowed.
    function _update(address to, uint256 tokenId, address auth) internal override returns (address) {
        if (auth != address(0)) revert NonTransferable();
        return super._update(to, tokenId, auth);
    }
}
