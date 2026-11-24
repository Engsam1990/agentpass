// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {Strings} from "@openzeppelin/contracts/utils/Strings.sol";

/**
 * @title MockAgentId
 * @notice Test-only stand-in for the Binance "SPACE ID Agent ID" ERC-721.
 * @dev    NEVER deployed to a public network. Used only by the Hardhat test
 *         suite to simulate Agent ID ownership.
 */
contract MockAgentId is ERC721 {
    using Strings for uint256;

    constructor() ERC721("SPACE ID Agent ID", "AI") {}

    function mint(address to, uint256 tokenId) external {
        _safeMint(to, tokenId);
    }

    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        _requireOwned(tokenId);
        return string.concat("https://name.ai/", tokenId.toString(), ".ai");
    }
}
