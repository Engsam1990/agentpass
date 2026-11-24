import { expect } from "chai";
import { ethers } from "hardhat";
import { time } from "@nomicfoundation/hardhat-network-helpers";

describe("AgentIdRegistry", function () {
  let mock: any;
  let registry: any;
  let points: any;
  let receipts: any;
  let owner: string;
  let alice: string;
  let bob: string;
  let carol: string;

  const AGENT_ID_MAINNET = "0x60b9262456de011f7d15a54cdd8c48baaa8b022f";

  beforeEach(async function () {
    [owner, alice, bob, carol] = await ethers.getSigners();
    const Mock = await ethers.getContractFactory("MockAgentId");
    mock = await Mock.deploy();
    await mock.waitForDeployment();

    const Registry = await ethers.getContractFactory("AgentIdRegistry");
    registry = await Registry.deploy(await mock.getAddress());
    await registry.waitForDeployment();

    points = await ethers.getContractAt("AgentPassToken", await registry.points());
    receipts = await ethers.getContractAt("AgentReceipt", await registry.receipts());
  });

  describe("deployment", function () {
    it("wires the Agent ID collection, points token and receipts", async function () {
      expect(await registry.agentId()).to.equal(await mock.getAddress());
      expect(await points.registry()).to.equal(await registry.getAddress());
      expect(await receipts.registry()).to.equal(await registry.getAddress());
      expect(await points.symbol()).to.equal("PASS");
      expect(await receipts.symbol()).to.equal("APRC");
      expect(await registry.owner()).to.equal(owner);
    });

    it("documents the real mainnet Agent ID address in the source", async function () {
      // The interface file must keep pointing at the production collection.
      const iface = await ethers.getContractFactory("AgentIdRegistry");
      expect(iface.interface.deploy.inputs[0].type).to.equal("address");
      expect(AGENT_ID_MAINNET).to.equal("0x60b9262456de011f7d15a54cdd8c48baaa8b022f");
    });
  });

  describe("register", function () {
    beforeEach(async function () {
      await mock.mint(alice, 1);
      await mock.mint(bob, 2);
    });

    it("rejects a caller that does not own the Agent ID", async function () {
      await expect(registry.connect(carol).register(1)).to.be.revertedWithCustomError(
        registry,
        "NotAgentIdOwner"
      );
    });

    it("rejects a wrong token id", async function () {
      await expect(registry.connect(alice).register(2)).to.be.revertedWithCustomError(
        registry,
        "NotAgentIdOwner"
      );
    });

    it("rejects an unknown token id", async function () {
      await expect(registry.connect(alice).register(999)).to.be.revertedWithCustomError(
        mock,
        "ERC721NonexistentToken"
      );
    });

    it("creates a passport for the Agent ID owner and records the handle", async function () {
      await expect(registry.connect(alice).register(1))
        .to.emit(registry, "Registered")
        .withArgs(alice, 1);

      const passport = await registry.passportOf(alice);
      expect(passport.registered).to.equal(true);
      expect(passport.agentTokenId).to.equal(1);
      expect(passport.agentTokenURI).to.equal("https://name.ai/1.ai");
      expect(await registry.agentTokenIdOf(alice)).to.equal(1);
      expect(await registry.totalAgents()).to.equal(1);
      expect(await registry.agentsCount()).to.equal(1);
      expect(await registry.agentAt(0)).to.equal(alice);
    });

    it("rejects a second registration from the same wallet", async function () {
      await registry.connect(alice).register(1);
      await expect(registry.connect(alice).register(1)).to.be.revertedWithCustomError(
        registry,
        "AlreadyRegistered"
      );
    });
  });

  describe("checkIn", function () {
    beforeEach(async function () {
      await mock.mint(alice, 1);
      await registry.connect(alice).register(1);
    });

    it("rejects check-ins from wallets without a passport", async function () {
      await mock.mint(bob, 2);
      await expect(registry.connect(bob).checkIn()).to.be.revertedWithCustomError(
        registry,
        "NotRegistered"
      );
    });

    it("mints points, updates the score and emits the event", async function () {
      const reward = await registry.POINTS_PER_CHECK_IN();
      await expect(registry.connect(alice).checkIn())
        .to.emit(registry, "CheckedIn")
        .withArgs(alice, 1, reward, reward);

      expect(await points.balanceOf(alice)).to.equal(reward);
      expect(await registry.scoreOf(alice)).to.equal(reward);
      expect(await registry.totalCheckIns()).to.equal(1);

      const passport = await registry.passportOf(alice);
      expect(passport.streak).to.equal(1);
      expect(passport.checkIns).to.equal(1);
    });

    it("enforces the cooldown", async function () {
      await registry.connect(alice).checkIn();
      await expect(registry.connect(alice).checkIn()).to.be.revertedWithCustomError(
        registry,
        "CheckInTooSoon"
      );
    });

    it("increases the streak and pays the bonus after the cooldown", async function () {
      await registry.connect(alice).checkIn();
      await time.increase(5 * 60 * 60);
      const base = await registry.POINTS_PER_CHECK_IN();
      const bonus = await registry.STREAK_BONUS();
      await expect(registry.connect(alice).checkIn())
        .to.emit(registry, "CheckedIn")
        .withArgs(alice, 2, base + bonus, 2n * base + bonus);
      expect(await points.balanceOf(alice)).to.equal(2n * base + bonus);
    });

    it("mints a non-transferable receipt on the first check-in", async function () {
      await registry.connect(alice).checkIn();
      expect(await receipts.balanceOf(alice)).to.equal(1);
      expect(await receipts.ownerOf(1)).to.equal(alice);
      expect(await receipts.agentTokenIdOf(1)).to.equal(1);
      expect(await receipts.milestoneOf(1)).to.equal("first-check-in");
      expect(await registry.totalReceipts()).to.equal(1);

      await expect(
        receipts.connect(alice).transferFrom(alice, bob, 1)
      ).to.be.revertedWithCustomError(receipts, "NonTransferable");
    });

    it("mints a streak receipt every 7 check-ins", async function () {
      for (let i = 0; i < 7; i++) {
        if (i > 0) await time.increase(5 * 60 * 60);
        await registry.connect(alice).checkIn();
      }
      expect(await receipts.balanceOf(alice)).to.equal(2);
      expect(await receipts.milestoneOf(2)).to.equal("streak-7");
    });
  });

  describe("premium slot", function () {
    beforeEach(async function () {
      await mock.mint(alice, 1);
      await registry.connect(alice).register(1);
    });

    it("rejects the wrong price", async function () {
      await expect(
        registry.connect(alice).purchaseSlot({ value: ethers.parseEther("0.001") })
      ).to.be.revertedWithCustomError(registry, "WrongPrice");
    });

    it("accepts the exact price and unlocks premium access", async function () {
      const price = await registry.slotPrice();
      const expectedExpiry = (await time.latest()) + 30 * 24 * 60 * 60;
      await expect(registry.connect(alice).purchaseSlot({ value: price })).to.emit(
        registry,
        "SlotPurchased"
      );
      const expiry = await registry.premiumExpiry(alice);
      expect(expiry).to.be.gte(BigInt(expectedExpiry));
      expect(expiry).to.be.lte(BigInt(expectedExpiry + 2));

      expect(await registry.isPremium(alice)).to.equal(true);
      expect(await registry.totalVolume()).to.equal(price);
      expect(await ethers.provider.getBalance(await registry.getAddress())).to.equal(price);
    });

    it("blocks gated content for non-premium wallets", async function () {
      await expect(registry.connect(alice).redeemGatedContent(1)).to.be.revertedWithCustomError(
        registry,
        "NotPremium"
      );
    });

    it("allows gated content for premium wallets", async function () {
      const price = await registry.slotPrice();
      await registry.connect(alice).purchaseSlot({ value: price });
      await registry.setGatedContent(1, ethers.id("content-1"));

      await expect(registry.connect(alice).redeemGatedContent(1))
        .to.emit(registry, "ContentRedeemed")
        .withArgs(alice, 1, ethers.id("content-1"));
      expect(await registry.contentRedeemed(1, alice)).to.equal(true);
    });

    it("expires the slot after the duration", async function () {
      const price = await registry.slotPrice();
      await registry.connect(alice).purchaseSlot({ value: price });
      await time.increase(31 * 24 * 60 * 60);
      expect(await registry.isPremium(alice)).to.equal(false);
    });
  });

  describe("administration", function () {
    it("only lets the owner withdraw fees", async function () {
      await mock.mint(alice, 1);
      await registry.connect(alice).register(1);
      await registry.connect(alice).purchaseSlot({ value: await registry.slotPrice() });

      await expect(registry.connect(alice).withdrawFees(bob)).to.be.revertedWithCustomError(
        registry,
        "NotOwner"
      );

      const balanceBefore = await ethers.provider.getBalance(bob);
      await registry.connect(owner).withdrawFees(bob);
      const balanceAfter = await ethers.provider.getBalance(bob);
      expect(balanceAfter - balanceBefore).to.equal(await registry.slotPrice());
    });

    it("only lets the owner change the slot price and publish content", async function () {
      await expect(registry.connect(alice).setSlotPrice(1)).to.be.revertedWithCustomError(
        registry,
        "NotOwner"
      );
      await expect(
        registry.connect(alice).setGatedContent(1, ethers.id("x"))
      ).to.be.revertedWithCustomError(registry, "NotOwner");

      await registry.connect(owner).setSlotPrice(ethers.parseEther("0.01"));
      expect(await registry.slotPrice()).to.equal(ethers.parseEther("0.01"));
    });

    it("transfers ownership", async function () {
      await registry.connect(owner).transferOwnership(carol);
      expect(await registry.owner()).to.equal(carol);
      await expect(
        registry.connect(owner).setSlotPrice(1)
      ).to.be.revertedWithCustomError(registry, "NotOwner");
    });
  });

  describe("PASS token", function () {
    it("cannot be minted directly", async function () {
      await expect(
        points.connect(alice).mint(alice, 1000)
      ).to.be.revertedWithCustomError(points, "NotRegistry");
    });
  });

  describe("stats and leaderboard", function () {
    it("exposes aggregate metrics", async function () {
      await mock.mint(alice, 1);
      await mock.mint(bob, 2);
      await registry.connect(alice).register(1);
      await registry.connect(bob).register(2);
      await registry.connect(alice).checkIn();

      const stats = await registry.stats();
      expect(stats.agents).to.equal(2);
      expect(stats.checkIns).to.equal(1);
      expect(stats.volume).to.equal(0);
      expect(stats.receiptCount).to.equal(1);

      const [agents, scores] = await registry.leaderboard();
      expect(agents.length).to.equal(2);
      expect(agents[0]).to.equal(alice);
      expect(scores[0]).to.equal(await registry.POINTS_PER_CHECK_IN());
      expect(scores[1]).to.equal(0);
    });
  });
});
