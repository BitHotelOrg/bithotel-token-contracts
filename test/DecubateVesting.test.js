const { BN, constants, time, expectEvent, expectRevert } = require('@openzeppelin/test-helpers');
const { expect } = require('chai');
const { ZERO_ADDRESS } = constants;

const Bithotel = artifacts.require('Bithotel');
const DecubateVesting = artifacts.require('DecubateVesting');

contract('DecubateVesting', function (accounts) {
  const [ initialHolder, anotherAccount ] = accounts;

  const name = 'My Token';
  const symbol = 'MTKN';

  const initialSupply = new BN(200);

  beforeEach(async function () {
    this.startTime = await time.latest();
    this.cliff = new BN(9327600);
    this.duration = await time.duration.minutes(10);

    this.token = await Bithotel.new(name, symbol, initialSupply, initialSupply);
    this.vesting = await DecubateVesting.new(this.token.address, { from: initialHolder.address });
    await this.token.transfer(this.vesting.address, new BN(100), { from: initialHolder });
  });

  context('initial value', async function () {
    it('has a token', async function () {
      expect(await this.vesting.getToken()).to.equal(this.token.address);
    });

    it('has an owner', async function () {
      expect(await this.vesting.owner()).to.equal(initialHolder);
    });

    it('should have balance', async function () {
      expect(await this.token.balanceOf(this.vesting.address)).to.bignumber.equal(new BN(100));
    });
  });

  it('change a token', async function () {
    await this.vesting.setToken(ZERO_ADDRESS);
    expect(await this.vesting.getToken()).to.equal(ZERO_ADDRESS);
  });

  context('addVestingStrategy', async function () {
    it('should revert non owner', async function () {
      await expect(this.vesting.addVestingStrategy(
        'Reverted Strategy',
        9327600,
        await time.latest(),
        await time.duration.minutes(10),
        1000,
        false,
        { from: anotherAccount },
      )).to.be.revertedWith('Ownable: caller is not the owner');
    });

    it('should add vesting', async function () {
      this.vesting.addVestingStrategy(
        'Added Strategy',
        this.cliff,
        this.startTime,
        this.duration,
        1000,
        false,
        { from: initialHolder },
      );

      const vestingPools = await this.vesting.vestingPools(0);
      expect(vestingPools.name).to.be.equal('Added Strategy');
      expect(vestingPools.cliff).to.be.bignumber.equal(new BN(this.startTime).add(this.cliff));
      expect(vestingPools.start).to.be.bignumber.equal(new BN(this.startTime));
      expect(vestingPools.duration).to.be.bignumber.equal(new BN(this.duration));
      expect(vestingPools.initialUnlockPercent).to.be.bignumber.equal(new BN(1000));
      expect(vestingPools.revocable).to.be.equal(false);

      const vestingInfo = await this.vesting.getVestingInfo(0);
      expect(vestingInfo.name).to.be.equal('Added Strategy');
      expect(vestingInfo.cliff).to.be.bignumber.equal(new BN(this.startTime).add(this.cliff));
      expect(vestingInfo.start).to.be.bignumber.equal(new BN(this.startTime));
      expect(vestingInfo.duration).to.be.bignumber.equal(new BN(this.duration));
      expect(vestingInfo.initialUnlockPercent).to.be.bignumber.equal(new BN(1000));
      expect(vestingInfo.revocable).to.be.equal(false);
    });

    beforeEach(async function () {
      await this.vesting.addVestingStrategy(
        'Added Strategy',
        this.cliff,
        this.startTime,
        this.duration,
        1000,
        false,
        { from: initialHolder },
      );
    });

    it('should have vestingInfo', async function () {
      const vestingInfo = await this.vesting.getVestingInfo(0);
      expect(vestingInfo.name).to.be.equal('Added Strategy');
      expect(vestingInfo.cliff).to.be.bignumber.equal(new BN(this.startTime).add(this.cliff));
      expect(vestingInfo.start).to.be.bignumber.equal(new BN(this.startTime));
      expect(vestingInfo.duration).to.be.bignumber.equal(new BN(this.duration));
      expect(vestingInfo.initialUnlockPercent).to.be.bignumber.equal(new BN(1000));
      expect(vestingInfo.revocable).to.be.equal(false);
    });

    context('setMaxTokenTransfer', async function () {
      it('should revert non owner', async function () {
        await expect(this.vesting.setMaxTokenTransfer(
          100,
          true,
          { from: anotherAccount },
        )).to.be.revertedWith('Ownable: caller is not the owner');
      });

      it('should setMaxTokenTransfer', async function () {
        await this.vesting.setMaxTokenTransfer(200, true, { from: initialHolder });
        const maxTokenTransfer = await this.vesting.maxTokenTransfer();
        expect(maxTokenTransfer.amount).to.be.bignumber.equal(initialSupply);
        expect(maxTokenTransfer.active).to.be.equal(true);
      });
    });

    describe('getReleasableAmount', () => {
      beforeEach(async function () {
        await this.vesting.addWhitelist(initialHolder, initialSupply, 0);
      });

      it('should return the releasable amount', async function () {
        const current = Number(await time.latest());
        await this.vesting.setVestingStrategy(
          0,
          '',
          100000,
          current + 100,
          60 * 60,
          100,
          false,
        );

        const amount = await this.vesting.getReleasableAmount(0, initialHolder);
        assert.equal(amount, 0);
      });
    });

    describe('disable', () => {
      it('should not whitelisted', async function () {
        await expect(
          this.vesting.getWhitelist(0, anotherAccount)).to.be.revertedWith('User is not in whitelist');
      });

      it('should able to whitelist', async function () {
        const { logs } = await this.vesting.addWhitelist(anotherAccount, '1000000', 0);
        expectEvent.inLogs(logs, 'AddWhitelist', {
          wallet: anotherAccount,
        });
        const whitelistArray = await this.vesting.getWhitelist(0, anotherAccount);
        expect(whitelistArray.wallet).to.equal(anotherAccount);
        expect(whitelistArray.dcbAmount).to.equal('1000000');
        expect(whitelistArray.distributedAmount).to.equal('0');
        expect(whitelistArray.revoke).to.equal(false);
        expect(whitelistArray.disabled).to.equal(false);
      });

      it('should disable and enable back a user from claiming vesting', async function () {
        await this.vesting.addWhitelist(anotherAccount, '1000000', 0);
        await this.vesting.setVesting(0, anotherAccount, true);
        const whitelistArray = await this.vesting.getWhitelist(0, anotherAccount);
        expect(whitelistArray.disabled).to.equal(true);
        await this.vesting.setVesting(0, anotherAccount, false);
        const whitelistArray2 = await this.vesting.getWhitelist(0, anotherAccount);
        expect(whitelistArray2.disabled).to.equal(false);
      });
    });

    describe('claimDistribution', () => {
      it('should throw an error as there is not tokens to claim', async function () {
        await expect(
          this.vesting.claimDistribution(0, initialHolder)).to.be.revertedWith(
          'Zero amount to claim',
        );
      });
      it('should throw an error as user is disabled from claiming tokens', async function () {
        await this.vesting.setVesting(0, anotherAccount, true);
        await expectRevert(
          this.vesting.claimDistribution(0, anotherAccount),
          'User is disabled from claiming token',
        );
      });

      it('should successfully claim 1 token as that is the max tranfer amount', async function () {
        const current = Number(await time.latest());
        await this.vesting.setVestingStrategy(
          0,
          '',
          0,
          current,
          0,
          100,
          false,
        );
        await this.vesting.setMaxTokenTransfer(1, true);

        const balBefore = await this.token.balanceOf(initialHolder);

        await this.vesting.claimDistribution(0, initialHolder);
        await this.vesting.setMaxTokenTransfer(0, false);

        const balAfter = await this.token.balanceOf(initialHolder);

        assert.equal(balAfter.sub(balBefore), '1');
      });

      it('should successfully claim tokens', async function () {
        const current = Number(await time.latest());
        await this.vesting.setVestingStrategy(
          0,
          '',
          0,
          current,
          0,
          100,
          false,
        );

        const balBefore = Number(await this.token.balanceOf(initialHolder));

        await this.vesting.claimDistribution(0, initialHolder);

        const balAfter = Number(await this.token.balanceOf(initialHolder));

        assert.equal(balAfter - balBefore, '999999');
      });
    });

    describe('getVestAmount', () => {
      it('should return 0 as start has not been reached', async function () {
        const current = Number(await time.latest());
        await this.vesting.setVestingStrategy(
          0,
          '',
          100000,
          current + 100,
          60 * 60,
          100,
          false,
        );
        const amount = await this.vesting.getVestAmount(0, initialHolder);
        assert.equal(amount, 0);
      });

      it('should return initial unlock as start has been reached', async function () {
        const current = Number(await time.latest());
        await this.vesting.setVestingStrategy(
          0,
          '',
          100000,
          current + 100,
          60 * 60,
          100,
          false,
        );
        await time.increase(101);
        const amount = await this.vesting.getVestAmount(0, initialHolder);
        assert.equal(amount, '100000');
      });

      it('should return full amount as total duration has been reached', async function () {
        const current = Number(await time.latest());
        await this.vesting.setVestingStrategy(
          0,
          '',
          0,
          current,
          0,
          100,
          false,
        );

        const amount = await this.vesting.getVestAmount(0, initialHolder);
        assert.equal(amount, '1000000');
      });

      it('should return the initial unlock and unlock amount at different intervals', async function () {
        const current = Number(await time.latest());
        await this.vesting.setVestingStrategy(
          0,
          '',
          100,
          current + 50,
          1000,
          100,
          false,
        );

        let amount = Number(await this.vesting.getVestAmount(0, initialHolder));
        assert.equal(amount, 0); // Start hasn't been reached, so 0 amount
        await time.increase(50);
        amount = Number(await this.vesting.getVestAmount(0, initialHolder));
        assert.equal(amount, 100000); // Start has reached, so initial unlock
        await time.increase(200);

        amount = Number(await this.vesting.getVestAmount(0, initialHolder));
        assert.isAbove(amount, 109000);
        await time.increase(850);
        amount = Number(await this.vesting.getVestAmount(0, initialHolder));
        assert.isBelow(amount, 1000000); // End date haven't reached, so will not get full amount
        await time.increase(100);
        amount = Number(await this.vesting.getVestAmount(0, initialHolder));
        assert.equal(amount, 1000000);// End date over, so full amount
        await time.increase(60 * 60 * 24 * 7);
        amount = Number(await this.vesting.getVestAmount(0, initialHolder));
        assert.equal(amount, 1000000);// One week passed after enddate, still same amount
      });
    });
  });
});
