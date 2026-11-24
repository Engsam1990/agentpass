// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title IAgentId
 * @notice Minimal interface of the Binance Agent ID ERC-721 collection
 *         ("SPACE ID Agent ID", symbol `AI`) on BNB Chain.
 * @dev    Agent ID contract on BNB Chain (chainId 56):
 *         0x60b9262456de011f7d15a54cdd8c48baaa8b022f
 *
 *         Agent IDs are non-transferable, one per wallet, and represent the
 *         on-chain name of an Agentic Wallet (the `name.ai` form).
 *
 *         - `balanceOf(owner) > 0` => the address holds an Agent ID.
 *         - `ownerOf(tokenId)`      => lets a contract verify that the caller
 *                                      is the true owner of a specific Agent ID.
 *         - `tokenURI(tokenId)`     => metadata pointer, used to resolve the
 *                                      `name.ai` handle for display purposes.
 */
interface IAgentId {
    function balanceOf(address owner) external view returns (uint256);

    function ownerOf(uint256 tokenId) external view returns (address);

    function tokenURI(uint256 tokenId) external view returns (string memory);
}
