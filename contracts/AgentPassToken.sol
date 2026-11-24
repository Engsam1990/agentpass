// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/**
 * @title AgentPassToken
 * @notice `PASS` — the reputation points token of the AgentPass dApp.
 *
 * @dev    Owner permissions (fully disclosed):
 *         - The owner CANNOT mint, burn, pause, black-list or rebase.
 *         - `PASS` is minted exclusively by the `AgentIdRegistry` when an
 *           Agent ID holder completes a check-in. There is no admin mint path.
 *         - The registry is the only minter; it is fixed at construction.
 *
 *         PASS has no redemption value and is not an investment. It is a
 *         reputation counter inside the AgentPass dApp only.
 */
contract AgentPassToken is ERC20 {
    address public immutable registry;

    error NotRegistry();

    constructor(address registry_) ERC20("AgentPass Points", "PASS") {
        registry = registry_;
    }

    function mint(address to, uint256 amount) external {
        if (msg.sender != registry) revert NotRegistry();
        _mint(to, amount);
    }
}
