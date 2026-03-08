import { expect } from "chai";
import hre from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-toolbox-viem/network-helpers";
import { parseEther, getAddress, zeroAddress } from "viem";

// Fee: 250 basis points = 2.5%
const FEE_BPS = 250n;

// Helper: calculate net payment after 2.5% fee
function netOf(gross: bigint): bigint {
  return gross - (gross * FEE_BPS) / 10000n;
}
function feeOf(gross: bigint): bigint {
  return (gross * FEE_BPS) / 10000n;
}

// ─── Fixtures ───────────────────────────────────────────────

async function deployFixture() {
  const [deployer, payee1, payee2, payee3, outsider, feeWallet] =
    await hre.viem.getWalletClients();
  const publicClient = await hre.viem.getPublicClient();

  const splitter = await hre.viem.deployContract("RoyaltySplitter", [
    [payee1.account.address, payee2.account.address, payee3.account.address],
    [5000n, 3000n, 2000n], // 50%, 30%, 20%
    feeWallet.account.address,
    FEE_BPS,
  ]);

  return { splitter, deployer, payee1, payee2, payee3, outsider, feeWallet, publicClient };
}

async function deployTwoPayeeFixture() {
  const [deployer, payee1, payee2, , , feeWallet] = await hre.viem.getWalletClients();
  const publicClient = await hre.viem.getPublicClient();

  const splitter = await hre.viem.deployContract("RoyaltySplitter", [
    [payee1.account.address, payee2.account.address],
    [7000n, 3000n], // 70%, 30%
    feeWallet.account.address,
    FEE_BPS,
  ]);

  return { splitter, deployer, payee1, payee2, feeWallet, publicClient };
}

async function deployWithMockTokenFixture() {
  const [deployer, payee1, payee2, payee3, , feeWallet] =
    await hre.viem.getWalletClients();
  const publicClient = await hre.viem.getPublicClient();

  const splitter = await hre.viem.deployContract("RoyaltySplitter", [
    [payee1.account.address, payee2.account.address, payee3.account.address],
    [5000n, 3000n, 2000n],
    feeWallet.account.address,
    FEE_BPS,
  ]);

  const mockToken = await hre.viem.deployContract("MockERC20", [
    "Mock USDC",
    "mUSDC",
  ]);

  return {
    splitter,
    mockToken,
    deployer,
    payee1,
    payee2,
    payee3,
    feeWallet,
    publicClient,
  };
}

async function deployZeroFeeFixture() {
  const [deployer, payee1, payee2, , , feeWallet] = await hre.viem.getWalletClients();
  const publicClient = await hre.viem.getPublicClient();

  const splitter = await hre.viem.deployContract("RoyaltySplitter", [
    [payee1.account.address, payee2.account.address],
    [6000n, 4000n],
    feeWallet.account.address,
    0n, // 0% fee
  ]);

  return { splitter, deployer, payee1, payee2, feeWallet, publicClient };
}

// ─── Tests ───────────────────────────────────────────────

describe("RoyaltySplitter", function () {
  // ── 1. Constructor Validation ──

  describe("Constructor", function () {
    it("rejects empty payee array", async function () {
      const [, , , , , feeWallet] = await hre.viem.getWalletClients();
      await expect(
        hre.viem.deployContract("RoyaltySplitter", [[], [], feeWallet.account.address, FEE_BPS])
      ).to.be.rejectedWith("RoyaltySplitter: no payees");
    });

    it("rejects mismatched array lengths", async function () {
      const [, payee1, , , , feeWallet] = await hre.viem.getWalletClients();
      await expect(
        hre.viem.deployContract("RoyaltySplitter", [
          [payee1.account.address],
          [5000n, 5000n],
          feeWallet.account.address,
          FEE_BPS,
        ])
      ).to.be.rejectedWith("RoyaltySplitter: length mismatch");
    });

    it("rejects zero address", async function () {
      const [, payee1, , , , feeWallet] = await hre.viem.getWalletClients();
      await expect(
        hre.viem.deployContract("RoyaltySplitter", [
          [zeroAddress, payee1.account.address],
          [5000n, 5000n],
          feeWallet.account.address,
          FEE_BPS,
        ])
      ).to.be.rejectedWith("RoyaltySplitter: zero address");
    });

    it("rejects zero shares", async function () {
      const [, payee1, payee2, , , feeWallet] = await hre.viem.getWalletClients();
      await expect(
        hre.viem.deployContract("RoyaltySplitter", [
          [payee1.account.address, payee2.account.address],
          [0n, 10000n],
          feeWallet.account.address,
          FEE_BPS,
        ])
      ).to.be.rejectedWith("RoyaltySplitter: zero shares");
    });

    it("rejects duplicate payees", async function () {
      const [, payee1, , , , feeWallet] = await hre.viem.getWalletClients();
      await expect(
        hre.viem.deployContract("RoyaltySplitter", [
          [payee1.account.address, payee1.account.address],
          [5000n, 5000n],
          feeWallet.account.address,
          FEE_BPS,
        ])
      ).to.be.rejectedWith("RoyaltySplitter: duplicate payee");
    });

    it("rejects shares not totaling 10000", async function () {
      const [, payee1, payee2, , , feeWallet] = await hre.viem.getWalletClients();
      await expect(
        hre.viem.deployContract("RoyaltySplitter", [
          [payee1.account.address, payee2.account.address],
          [5000n, 4000n], // total = 9000, not 10000
          feeWallet.account.address,
          FEE_BPS,
        ])
      ).to.be.rejectedWith("RoyaltySplitter: shares must total 10000");
    });

    it("rejects zero fee recipient", async function () {
      const [, payee1, payee2] = await hre.viem.getWalletClients();
      await expect(
        hre.viem.deployContract("RoyaltySplitter", [
          [payee1.account.address, payee2.account.address],
          [5000n, 5000n],
          zeroAddress,
          FEE_BPS,
        ])
      ).to.be.rejectedWith("RoyaltySplitter: zero fee recipient");
    });

    it("rejects fee > 10% (1000 bps)", async function () {
      const [, payee1, payee2, , , feeWallet] = await hre.viem.getWalletClients();
      await expect(
        hre.viem.deployContract("RoyaltySplitter", [
          [payee1.account.address, payee2.account.address],
          [5000n, 5000n],
          feeWallet.account.address,
          1001n, // 10.01% — too high
        ])
      ).to.be.rejectedWith("RoyaltySplitter: fee too high");
    });

    it("accepts 0% fee", async function () {
      const { splitter, feeWallet } = await loadFixture(deployZeroFeeFixture);
      expect(await splitter.read.feeBasisPoints()).to.equal(0n);
      expect(await splitter.read.feeRecipient()).to.equal(
        getAddress(feeWallet.account.address)
      );
    });

    it("sets correct shares, payees, and fee config", async function () {
      const { splitter, payee1, payee2, payee3, feeWallet } = await loadFixture(
        deployFixture
      );
      expect(await splitter.read.totalShares()).to.equal(10000n);
      expect(await splitter.read.shares([payee1.account.address])).to.equal(5000n);
      expect(await splitter.read.shares([payee2.account.address])).to.equal(3000n);
      expect(await splitter.read.shares([payee3.account.address])).to.equal(2000n);

      const payees = await splitter.read.getPayees();
      expect(payees.length).to.equal(3);

      expect(await splitter.read.feeRecipient()).to.equal(
        getAddress(feeWallet.account.address)
      );
      expect(await splitter.read.feeBasisPoints()).to.equal(FEE_BPS);
    });
  });

  // ── 2. Receive ──

  describe("Receive", function () {
    it("accepts native AVAX and emits PaymentReceived", async function () {
      const { splitter, deployer, publicClient } = await loadFixture(deployFixture);

      const hash = await deployer.sendTransaction({
        to: splitter.address,
        value: parseEther("1"),
      });
      await publicClient.waitForTransactionReceipt({ hash });

      const balance = await publicClient.getBalance({
        address: splitter.address,
      });
      expect(balance).to.equal(parseEther("1"));
    });
  });

  // ── 3. distributeAll() ──

  describe("distributeAll", function () {
    it("distributes net amounts (minus 2.5% fee) to all payees", async function () {
      const { splitter, deployer, payee1, payee2, payee3, feeWallet, publicClient } =
        await loadFixture(deployFixture);

      // Send 10 AVAX to the splitter
      const hash = await deployer.sendTransaction({
        to: splitter.address,
        value: parseEther("10"),
      });
      await publicClient.waitForTransactionReceipt({ hash });

      // Record balances before
      const before1 = await publicClient.getBalance({ address: payee1.account.address });
      const before2 = await publicClient.getBalance({ address: payee2.account.address });
      const before3 = await publicClient.getBalance({ address: payee3.account.address });
      const beforeFee = await publicClient.getBalance({ address: feeWallet.account.address });

      // Distribute
      await splitter.write.distributeAll();

      const after1 = await publicClient.getBalance({ address: payee1.account.address });
      const after2 = await publicClient.getBalance({ address: payee2.account.address });
      const after3 = await publicClient.getBalance({ address: payee3.account.address });
      const afterFee = await publicClient.getBalance({ address: feeWallet.account.address });

      // Gross: 5, 3, 2 AVAX. Net = gross × 0.975. Fee = gross × 0.025.
      const gross1 = parseEther("5");
      const gross2 = parseEther("3");
      const gross3 = parseEther("2");

      expect(after1 - before1).to.equal(netOf(gross1)); // 4.875
      expect(after2 - before2).to.equal(netOf(gross2)); // 2.925
      expect(after3 - before3).to.equal(netOf(gross3)); // 1.95

      // Fee wallet receives total fee
      const totalFee = feeOf(gross1) + feeOf(gross2) + feeOf(gross3);
      expect(afterFee - beforeFee).to.equal(totalFee); // 0.25
    });

    it("is a no-op when no balance", async function () {
      const { splitter } = await loadFixture(deployFixture);
      // Should not revert, just do nothing
      await splitter.write.distributeAll();
    });

    it("works across multiple deposits (cumulative accounting)", async function () {
      const { splitter, deployer, payee1, feeWallet, publicClient } = await loadFixture(
        deployTwoPayeeFixture
      );

      // Deposit 1: 1 AVAX
      let hash = await deployer.sendTransaction({
        to: splitter.address,
        value: parseEther("1"),
      });
      await publicClient.waitForTransactionReceipt({ hash });
      await splitter.write.distributeAll();

      const after1 = await publicClient.getBalance({ address: payee1.account.address });

      // Deposit 2: 2 more AVAX
      hash = await deployer.sendTransaction({
        to: splitter.address,
        value: parseEther("2"),
      });
      await publicClient.waitForTransactionReceipt({ hash });
      await splitter.write.distributeAll();

      const after2 = await publicClient.getBalance({ address: payee1.account.address });

      // Payee1 gets 70% of 2 = 1.4 gross, net = 1.4 * 0.975 = 1.365
      const gross = parseEther("1.4");
      expect(after2 - after1).to.equal(netOf(gross));
    });

    it("handles one reverting payee (others still get paid)", async function () {
      const [deployer, , goodPayee, , , feeWallet] = await hre.viem.getWalletClients();
      const publicClient = await hre.viem.getPublicClient();

      // Deploy a reverting contract as one of the payees
      const revertingReceiver = await hre.viem.deployContract("RevertingReceiver");

      const splitter = await hre.viem.deployContract("RoyaltySplitter", [
        [revertingReceiver.address, goodPayee.account.address],
        [5000n, 5000n],
        feeWallet.account.address,
        FEE_BPS,
      ]);

      // Send 2 AVAX
      const hash = await deployer.sendTransaction({
        to: splitter.address,
        value: parseEther("2"),
      });
      await publicClient.waitForTransactionReceipt({ hash });

      const beforeGood = await publicClient.getBalance({ address: goodPayee.account.address });

      // distributeAll should NOT revert — reverting payee is skipped
      await splitter.write.distributeAll();

      const afterGood = await publicClient.getBalance({ address: goodPayee.account.address });

      // Good payee got their 50% = 1 AVAX gross, net = 0.975
      expect(afterGood - beforeGood).to.equal(netOf(parseEther("1")));

      // Reverting payee's GROSS share is still available via releasable
      const pending = await splitter.read.releasable([revertingReceiver.address]);
      expect(pending).to.equal(parseEther("1"));
    });

    it("sends correct total fee to feeWallet across multiple payees", async function () {
      const { splitter, deployer, feeWallet, publicClient } =
        await loadFixture(deployFixture);

      const hash = await deployer.sendTransaction({
        to: splitter.address,
        value: parseEther("10"),
      });
      await publicClient.waitForTransactionReceipt({ hash });

      const beforeFee = await publicClient.getBalance({ address: feeWallet.account.address });
      await splitter.write.distributeAll();
      const afterFee = await publicClient.getBalance({ address: feeWallet.account.address });

      // Total fee = 2.5% of 10 AVAX = 0.25 AVAX
      expect(afterFee - beforeFee).to.equal(parseEther("0.25"));

      // Verify totalFeesCollected
      expect(await splitter.read.totalFeesCollected()).to.equal(parseEther("0.25"));
      expect(await splitter.read.pendingFees()).to.equal(0n);
    });
  });

  // ── 4. release() (Pull) ──

  describe("release", function () {
    it("allows a single payee to pull their net share (minus fee)", async function () {
      const { splitter, deployer, payee1, feeWallet, publicClient } = await loadFixture(
        deployTwoPayeeFixture
      );

      const hash = await deployer.sendTransaction({
        to: splitter.address,
        value: parseEther("10"),
      });
      await publicClient.waitForTransactionReceipt({ hash });

      const before = await publicClient.getBalance({ address: payee1.account.address });
      const beforeFee = await publicClient.getBalance({ address: feeWallet.account.address });

      // Payee1 calls release for themselves
      const releaseHash = await splitter.write.release(
        [payee1.account.address],
        { account: payee1.account }
      );
      const receipt = await publicClient.waitForTransactionReceipt({ hash: releaseHash });

      const after = await publicClient.getBalance({ address: payee1.account.address });
      const afterFee = await publicClient.getBalance({ address: feeWallet.account.address });

      // 70% of 10 = 7 AVAX gross, net = 7 * 0.975 = 6.825, minus gas
      const gross = parseEther("7");
      const gasCost = receipt.gasUsed * receipt.effectiveGasPrice;
      expect(after - before + gasCost).to.equal(netOf(gross));

      // Fee wallet received 2.5% of 7 = 0.175
      expect(afterFee - beforeFee).to.equal(feeOf(gross));
    });

    it("reverts when no shares", async function () {
      const { splitter, outsider } = await loadFixture(deployFixture);
      await expect(
        splitter.write.release([outsider.account.address], {
          account: outsider.account,
        })
      ).to.be.rejectedWith("RoyaltySplitter: no shares");
    });

    it("reverts when nothing due", async function () {
      const { splitter, payee1 } = await loadFixture(deployFixture);
      await expect(
        splitter.write.release([payee1.account.address], {
          account: payee1.account,
        })
      ).to.be.rejectedWith("RoyaltySplitter: nothing due");
    });
  });

  // ── 5. Reentrancy ──

  describe("Reentrancy protection", function () {
    it("prevents reentrancy attack on distributeAll", async function () {
      const [deployer, goodPayee, , , , feeWallet] = await hre.viem.getWalletClients();
      const publicClient = await hre.viem.getPublicClient();

      const [, , attackerWallet] = await hre.viem.getWalletClients();

      const splitter = await hre.viem.deployContract("RoyaltySplitter", [
        [goodPayee.account.address, attackerWallet.account.address],
        [5000n, 5000n],
        feeWallet.account.address,
        FEE_BPS,
      ]);

      const hash = await deployer.sendTransaction({
        to: splitter.address,
        value: parseEther("2"),
      });
      await publicClient.waitForTransactionReceipt({ hash });

      // First call succeeds
      await splitter.write.distributeAll();

      // Second call does nothing (no balance)
      await splitter.write.distributeAll();

      // Verify both payees got their share
      const releasable1 = await splitter.read.releasable([goodPayee.account.address]);
      const releasable2 = await splitter.read.releasable([attackerWallet.account.address]);
      expect(releasable1).to.equal(0n);
      expect(releasable2).to.equal(0n);
    });

    it("prevents reentrancy on release via nonReentrant modifier", async function () {
      const { splitter, deployer, payee1, publicClient } = await loadFixture(deployFixture);

      const hash = await deployer.sendTransaction({
        to: splitter.address,
        value: parseEther("3"),
      });
      await publicClient.waitForTransactionReceipt({ hash });

      // Release succeeds
      await splitter.write.release([payee1.account.address]);

      // Second release has nothing due
      await expect(
        splitter.write.release([payee1.account.address])
      ).to.be.rejectedWith("RoyaltySplitter: nothing due");
    });
  });

  // ── 6. ERC-20 ──

  describe("ERC-20 tokens", function () {
    it("distributeAllToken distributes net amounts (minus fee)", async function () {
      const { splitter, mockToken, deployer, payee1, payee2, payee3, feeWallet } =
        await loadFixture(deployWithMockTokenFixture);

      const total = 10000n * 10n ** 18n;
      await mockToken.write.mint([splitter.address, total]);

      // Distribute
      await splitter.write.distributeAllToken([mockToken.address]);

      // Check payee balances: 50%, 30%, 20% gross → net = gross × 0.975
      const bal1 = await mockToken.read.balanceOf([payee1.account.address]);
      const bal2 = await mockToken.read.balanceOf([payee2.account.address]);
      const bal3 = await mockToken.read.balanceOf([payee3.account.address]);
      const balFee = await mockToken.read.balanceOf([feeWallet.account.address]);

      const gross1 = 5000n * 10n ** 18n;
      const gross2 = 3000n * 10n ** 18n;
      const gross3 = 2000n * 10n ** 18n;

      expect(bal1).to.equal(netOf(gross1));
      expect(bal2).to.equal(netOf(gross2));
      expect(bal3).to.equal(netOf(gross3));

      // Fee wallet got total fee
      const totalFee = feeOf(gross1) + feeOf(gross2) + feeOf(gross3);
      expect(balFee).to.equal(totalFee);
    });

    it("releaseToken sends net to payee and fee to feeWallet", async function () {
      const { splitter, mockToken, payee1, feeWallet } = await loadFixture(
        deployWithMockTokenFixture
      );

      await mockToken.write.mint([splitter.address, 10000n * 10n ** 18n]);

      await splitter.write.releaseToken(
        [mockToken.address, payee1.account.address],
        { account: payee1.account }
      );

      const gross = 5000n * 10n ** 18n;
      const bal = await mockToken.read.balanceOf([payee1.account.address]);
      expect(bal).to.equal(netOf(gross));

      const balFee = await mockToken.read.balanceOf([feeWallet.account.address]);
      expect(balFee).to.equal(feeOf(gross));
    });

    it("releasableToken returns correct gross pending amount", async function () {
      const { splitter, mockToken, payee1, payee2 } = await loadFixture(
        deployWithMockTokenFixture
      );

      await mockToken.write.mint([splitter.address, 10000n * 10n ** 18n]);

      const pending1 = await splitter.read.releasableToken([
        mockToken.address,
        payee1.account.address,
      ]);
      const pending2 = await splitter.read.releasableToken([
        mockToken.address,
        payee2.account.address,
      ]);

      expect(pending1).to.equal(5000n * 10n ** 18n);
      expect(pending2).to.equal(3000n * 10n ** 18n);
    });
  });

  // ── 7. View Functions ──

  describe("View functions", function () {
    it("releasable returns correct gross pending amount", async function () {
      const { splitter, deployer, payee1, payee2, payee3, publicClient } =
        await loadFixture(deployFixture);

      const hash = await deployer.sendTransaction({
        to: splitter.address,
        value: parseEther("10"),
      });
      await publicClient.waitForTransactionReceipt({ hash });

      expect(await splitter.read.releasable([payee1.account.address])).to.equal(
        parseEther("5")
      );
      expect(await splitter.read.releasable([payee2.account.address])).to.equal(
        parseEther("3")
      );
      expect(await splitter.read.releasable([payee3.account.address])).to.equal(
        parseEther("2")
      );
    });

    it("releasable updates after partial distribution", async function () {
      const { splitter, deployer, payee1, publicClient } = await loadFixture(deployFixture);

      const hash = await deployer.sendTransaction({
        to: splitter.address,
        value: parseEther("10"),
      });
      await publicClient.waitForTransactionReceipt({ hash });

      // Release payee1's share
      await splitter.write.release([payee1.account.address]);

      // Payee1 should have 0 pending
      expect(await splitter.read.releasable([payee1.account.address])).to.equal(0n);

      // released tracks the GROSS amount
      expect(await splitter.read.released([payee1.account.address])).to.equal(
        parseEther("5")
      );
      expect(await splitter.read.totalReleased()).to.equal(parseEther("5"));
    });

    it("fee view functions return correct values", async function () {
      const { splitter, feeWallet } = await loadFixture(deployFixture);

      expect(await splitter.read.feeRecipient()).to.equal(
        getAddress(feeWallet.account.address)
      );
      expect(await splitter.read.feeBasisPoints()).to.equal(FEE_BPS);
      expect(await splitter.read.pendingFees()).to.equal(0n);
      expect(await splitter.read.totalFeesCollected()).to.equal(0n);
    });
  });

  // ── 8. Basis Point Rounding ──

  describe("Basis point rounding", function () {
    it("handles 33.33% / 33.33% / 33.34% split with fee correctly", async function () {
      const [deployer, p1, p2, p3, , feeWallet] = await hre.viem.getWalletClients();
      const publicClient = await hre.viem.getPublicClient();

      const splitter = await hre.viem.deployContract("RoyaltySplitter", [
        [p1.account.address, p2.account.address, p3.account.address],
        [3333n, 3333n, 3334n], // 33.33% + 33.33% + 33.34% = 100%
        feeWallet.account.address,
        FEE_BPS,
      ]);

      // Send 1 AVAX
      const hash = await deployer.sendTransaction({
        to: splitter.address,
        value: parseEther("1"),
      });
      await publicClient.waitForTransactionReceipt({ hash });

      const r1 = await splitter.read.releasable([p1.account.address]);
      const r2 = await splitter.read.releasable([p2.account.address]);
      const r3 = await splitter.read.releasable([p3.account.address]);

      // Gross amounts (same as before — fee is deducted on release/distribute, not on releasable)
      expect(r1).to.equal(333300000000000000n);
      expect(r2).to.equal(333300000000000000n);
      expect(r3).to.equal(333400000000000000n);

      // Verify dust is negligible
      const totalReleasable = r1 + r2 + r3;
      const dust = parseEther("1") - totalReleasable;
      expect(dust < 10000n).to.be.true;
    });
  });

  // ── 9. Force-Send via Selfdestruct ──

  describe("Force-send via selfdestruct", function () {
    it("handles unexpected balance increase gracefully", async function () {
      const { splitter, deployer, payee1, publicClient } = await loadFixture(
        deployTwoPayeeFixture
      );

      // Send 1 AVAX normally
      let hash = await deployer.sendTransaction({
        to: splitter.address,
        value: parseEther("1"),
      });
      await publicClient.waitForTransactionReceipt({ hash });

      // Force-send 1 more AVAX via selfdestruct
      const forceSender = await hre.viem.deployContract("ForceSender", [], {
        value: parseEther("1"),
      });
      hash = await forceSender.write.forceSend([splitter.address]);
      await publicClient.waitForTransactionReceipt({ hash });

      // Contract should now have 2 AVAX
      const balance = await publicClient.getBalance({ address: splitter.address });
      expect(balance).to.equal(parseEther("2"));

      // Payee1 gets 70% of 2 = 1.4 AVAX gross
      const releasable = await splitter.read.releasable([payee1.account.address]);
      expect(releasable).to.equal(parseEther("1.4"));
    });
  });

  // ── 10. Stress Test ──

  describe("Stress test", function () {
    it("works with 18 payees and fee", async function () {
      const wallets = await hre.viem.getWalletClients();
      const publicClient = await hre.viem.getPublicClient();
      const deployer = wallets[0];
      const feeWallet = wallets[19]; // last wallet

      // Use 18 wallets as payees (wallets 1-18), leaving 0 for deployer and 19 for fee
      const numPayees = 18;
      const payeeAddresses = wallets
        .slice(1, numPayees + 1)
        .map((w) => w.account.address);

      // Distribute shares evenly
      const sharePerPayee = BigInt(Math.floor(10000 / numPayees));
      const remainder = 10000n - sharePerPayee * BigInt(numPayees);
      const shares = payeeAddresses.map((_, i) =>
        i === numPayees - 1 ? sharePerPayee + remainder : sharePerPayee
      );

      const splitter = await hre.viem.deployContract("RoyaltySplitter", [
        payeeAddresses,
        shares,
        feeWallet.account.address,
        FEE_BPS,
      ]);

      // Send 10 AVAX
      const hash = await deployer.sendTransaction({
        to: splitter.address,
        value: parseEther("10"),
      });
      await publicClient.waitForTransactionReceipt({ hash });

      const beforeFee = await publicClient.getBalance({ address: feeWallet.account.address });

      // Distribute — should not run out of gas
      const distHash = await splitter.write.distributeAll();
      const receipt = await publicClient.waitForTransactionReceipt({ hash: distHash });

      expect(receipt.status).to.equal("success");
      expect(receipt.gasUsed < 3000000n).to.be.true; // Well under block limit

      const afterFee = await publicClient.getBalance({ address: feeWallet.account.address });

      // Fee wallet should receive 2.5% of 10 = 0.25 AVAX
      expect(afterFee - beforeFee).to.equal(parseEther("0.25"));
    });
  });

  // ── 11. _executeTokenTransfer Access Control ──

  describe("_executeTokenTransfer access control", function () {
    it("reverts when called by non-contract address", async function () {
      const { splitter, mockToken, payee1 } = await loadFixture(
        deployWithMockTokenFixture
      );

      await expect(
        splitter.write._executeTokenTransfer(
          [mockToken.address, payee1.account.address, 1000n],
          { account: payee1.account }
        )
      ).to.be.rejectedWith("RoyaltySplitter: internal only");
    });
  });

  // ── 12. Zero Fee Mode ──

  describe("Zero fee mode", function () {
    it("sends 100% to payees when fee is 0%", async function () {
      const { splitter, deployer, payee1, payee2, feeWallet, publicClient } =
        await loadFixture(deployZeroFeeFixture);

      const hash = await deployer.sendTransaction({
        to: splitter.address,
        value: parseEther("10"),
      });
      await publicClient.waitForTransactionReceipt({ hash });

      const before1 = await publicClient.getBalance({ address: payee1.account.address });
      const before2 = await publicClient.getBalance({ address: payee2.account.address });
      const beforeFee = await publicClient.getBalance({ address: feeWallet.account.address });

      await splitter.write.distributeAll();

      const after1 = await publicClient.getBalance({ address: payee1.account.address });
      const after2 = await publicClient.getBalance({ address: payee2.account.address });
      const afterFee = await publicClient.getBalance({ address: feeWallet.account.address });

      // 60% of 10 = 6, 40% of 10 = 4 — no fee deducted
      expect(after1 - before1).to.equal(parseEther("6"));
      expect(after2 - before2).to.equal(parseEther("4"));
      expect(afterFee - beforeFee).to.equal(0n);
    });
  });

  // ── 13. collectFees ──

  describe("collectFees", function () {
    it("reverts when no pending fees", async function () {
      const { splitter } = await loadFixture(deployFixture);
      await expect(
        splitter.write.collectFees()
      ).to.be.rejectedWith("RoyaltySplitter: no pending fees");
    });
  });

  // ── 14. Fee accumulation across distributions ──

  describe("Fee accumulation", function () {
    it("accumulates correct total fees across multiple distributions", async function () {
      const { splitter, deployer, feeWallet, publicClient } =
        await loadFixture(deployTwoPayeeFixture);

      const beforeFee = await publicClient.getBalance({ address: feeWallet.account.address });

      // Distribution 1: 4 AVAX
      let hash = await deployer.sendTransaction({
        to: splitter.address,
        value: parseEther("4"),
      });
      await publicClient.waitForTransactionReceipt({ hash });
      await splitter.write.distributeAll();

      // Distribution 2: 6 AVAX
      hash = await deployer.sendTransaction({
        to: splitter.address,
        value: parseEther("6"),
      });
      await publicClient.waitForTransactionReceipt({ hash });
      await splitter.write.distributeAll();

      const afterFee = await publicClient.getBalance({ address: feeWallet.account.address });

      // Total fees = 2.5% of 10 = 0.25 AVAX
      expect(afterFee - beforeFee).to.equal(parseEther("0.25"));
      expect(await splitter.read.totalFeesCollected()).to.equal(parseEther("0.25"));
    });
  });
});
