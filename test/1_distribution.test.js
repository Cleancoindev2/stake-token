const Distribution = artifacts.require('DistributionMock');
const ERC677BridgeToken = artifacts.require('ERC677BridgeToken');
const ERC20 = artifacts.require('ERC20');
const EmptyContract = artifacts.require('EmptyContract');

const { mineBlock } = require('./helpers/ganache');

const { BN, toWei } = web3.utils;

require('chai')
    .use(require('chai-as-promised'))
    .use(require('chai-bn')(BN))
    .should();


contract('Distribution', async accounts => {

    const {
        ERROR_MSG,
        TOKEN_NAME,
        TOKEN_SYMBOL,
        EMPTY_ADDRESS,
        STAKING_EPOCH_DURATION,
        REWARD_FOR_STAKING,
        ECOSYSTEM_FUND,
        PUBLIC_OFFERING,
        PRIVATE_OFFERING,
        FOUNDATION_REWARD,
        EXCHANGE_RELATED_ACTIVITIES,
        owner,
        address,
        stake,
        cliff,
        PRIVATE_OFFERING_PRERELEASE,
        SUPPLY,
        privateOfferingParticipants,
        privateOfferingParticipantsStakes,
    } = require('./constants')(accounts);

    let distribution;
    let token;

    function createToken(distributionAddress) {
        return ERC677BridgeToken.new(
            TOKEN_NAME,
            TOKEN_SYMBOL,
            distributionAddress,
        );
    }

    function createDistribution() {
        return Distribution.new(
            STAKING_EPOCH_DURATION,
            address[REWARD_FOR_STAKING],
            address[ECOSYSTEM_FUND],
            address[PUBLIC_OFFERING],
            address[FOUNDATION_REWARD],
            address[EXCHANGE_RELATED_ACTIVITIES],
            privateOfferingParticipants,
            privateOfferingParticipantsStakes
        ).should.be.fulfilled;
    }

    function calculatePercentage(number, percentage) {
        return new BN(number).mul(new BN(percentage)).div(new BN(100));
    }

    function getBalances(addresses) {
        return Promise.all(addresses.map(addr => token.balanceOf(addr)));
    }

    function random(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    function randomAccount() {
        return accounts[random(0, 9)];
    }

    describe('constructor', async () => {
        it('should be created', async () => {
            distribution = await createDistribution();
            const data = await distribution.getPrivateOfferingParticipantsData.call();
            data[0].forEach((address, index) =>
                address.should.be.equal(privateOfferingParticipants[index])
            );
            data[1].forEach((stake, index) =>
                stake.should.be.bignumber.equal(privateOfferingParticipantsStakes[index])
            );
        });
        it('cannot be created with wrong values', async () => {
            await Distribution.new(
                0,
                address[REWARD_FOR_STAKING],
                address[ECOSYSTEM_FUND],
                address[PUBLIC_OFFERING],
                address[FOUNDATION_REWARD],
                address[EXCHANGE_RELATED_ACTIVITIES],
                privateOfferingParticipants,
                privateOfferingParticipantsStakes
            ).should.be.rejectedWith('staking epoch duration must be more than 0');
            await Distribution.new(
                STAKING_EPOCH_DURATION,
                EMPTY_ADDRESS,
                address[ECOSYSTEM_FUND],
                address[PUBLIC_OFFERING],
                address[FOUNDATION_REWARD],
                address[EXCHANGE_RELATED_ACTIVITIES],
                privateOfferingParticipants,
                privateOfferingParticipantsStakes
            ).should.be.rejectedWith('invalid address');
            await Distribution.new(
                STAKING_EPOCH_DURATION,
                address[REWARD_FOR_STAKING],
                EMPTY_ADDRESS,
                address[PUBLIC_OFFERING],
                address[FOUNDATION_REWARD],
                address[EXCHANGE_RELATED_ACTIVITIES],
                privateOfferingParticipants,
                privateOfferingParticipantsStakes
            ).should.be.rejectedWith('invalid address');
            await Distribution.new(
                STAKING_EPOCH_DURATION,
                address[REWARD_FOR_STAKING],
                address[ECOSYSTEM_FUND],
                EMPTY_ADDRESS,
                address[FOUNDATION_REWARD],
                address[EXCHANGE_RELATED_ACTIVITIES],
                privateOfferingParticipants,
                privateOfferingParticipantsStakes
            ).should.be.rejectedWith('invalid address');
            await Distribution.new(
                STAKING_EPOCH_DURATION,
                address[REWARD_FOR_STAKING],
                address[ECOSYSTEM_FUND],
                address[PUBLIC_OFFERING],
                EMPTY_ADDRESS,
                address[EXCHANGE_RELATED_ACTIVITIES],
                privateOfferingParticipants,
                privateOfferingParticipantsStakes
            ).should.be.rejectedWith('invalid address');
            await Distribution.new(
                STAKING_EPOCH_DURATION,
                address[REWARD_FOR_STAKING],
                address[ECOSYSTEM_FUND],
                address[PUBLIC_OFFERING],
                address[FOUNDATION_REWARD],
                EMPTY_ADDRESS,
                privateOfferingParticipants,
                privateOfferingParticipantsStakes
            ).should.be.rejectedWith('invalid address');
            await Distribution.new(
                STAKING_EPOCH_DURATION,
                address[REWARD_FOR_STAKING],
                address[ECOSYSTEM_FUND],
                address[PUBLIC_OFFERING],
                address[FOUNDATION_REWARD],
                address[EXCHANGE_RELATED_ACTIVITIES],
                [EMPTY_ADDRESS, accounts[5]],
                privateOfferingParticipantsStakes
            ).should.be.rejectedWith('invalid address');
            await Distribution.new(
                STAKING_EPOCH_DURATION,
                address[REWARD_FOR_STAKING],
                address[ECOSYSTEM_FUND],
                address[PUBLIC_OFFERING],
                address[FOUNDATION_REWARD],
                address[EXCHANGE_RELATED_ACTIVITIES],
                [accounts[4], EMPTY_ADDRESS],
                privateOfferingParticipantsStakes
            ).should.be.rejectedWith('invalid address');
            await Distribution.new(
                STAKING_EPOCH_DURATION,
                address[REWARD_FOR_STAKING],
                address[ECOSYSTEM_FUND],
                address[PUBLIC_OFFERING],
                address[FOUNDATION_REWARD],
                address[EXCHANGE_RELATED_ACTIVITIES],
                privateOfferingParticipants,
                [toWei('4000000'), toWei('5000000')]    // sum is bigger than Private Offering stake
            ).should.be.rejectedWith('the sum of participants stakes is more than the whole stake');
            await Distribution.new(
                STAKING_EPOCH_DURATION,
                address[REWARD_FOR_STAKING],
                address[ECOSYSTEM_FUND],
                address[PUBLIC_OFFERING],
                address[FOUNDATION_REWARD],
                address[EXCHANGE_RELATED_ACTIVITIES],
                privateOfferingParticipants,
                [toWei('0'), toWei('5000000')]
            ).should.be.rejectedWith('the participant stake must be more than 0');
            await Distribution.new(
                STAKING_EPOCH_DURATION,
                address[REWARD_FOR_STAKING],
                address[ECOSYSTEM_FUND],
                address[PUBLIC_OFFERING],
                address[FOUNDATION_REWARD],
                address[EXCHANGE_RELATED_ACTIVITIES],
                [accounts[4]],                          // different arrays sizes
                privateOfferingParticipantsStakes
            ).should.be.rejectedWith('different arrays sizes');
        });
        it('should be created with modified Private Offering stake', async () => {
            const newParticipantsStakes = [new BN(toWei('3000000')), new BN(toWei('2500000'))];
            distribution = await Distribution.new(
                STAKING_EPOCH_DURATION,
                address[REWARD_FOR_STAKING],
                address[ECOSYSTEM_FUND],
                address[PUBLIC_OFFERING],
                address[FOUNDATION_REWARD],
                address[EXCHANGE_RELATED_ACTIVITIES],
                privateOfferingParticipants,
                newParticipantsStakes
            ).should.be.fulfilled;
        });
        it('should be created with 50 participants of Private Offering', async () => {
            const participants = await Promise.all([...Array(50)].map(() => web3.eth.personal.newAccount()));
            const stakes = [...Array(50)].map(() => new BN(random(1, 85000)));
            distribution = await Distribution.new(
                STAKING_EPOCH_DURATION,
                address[REWARD_FOR_STAKING],
                address[ECOSYSTEM_FUND],
                address[PUBLIC_OFFERING],
                address[FOUNDATION_REWARD],
                address[EXCHANGE_RELATED_ACTIVITIES],
                participants,
                stakes
            ).should.be.fulfilled;
        });
    });

    describe('initialize', async () => {
        beforeEach(async () => {
            distribution = await createDistribution();
            token = await createToken(distribution.address);
        });
        it('should be initialized', async () => {
            (await token.balanceOf(distribution.address)).should.be.bignumber.equal(SUPPLY);

            const { logs } = await distribution.initialize(token.address).should.be.fulfilled;
            logs[0].args.token.should.be.equal(token.address);
            logs[0].args.caller.should.be.equal(owner);

            const balances = await getBalances([
                address[PUBLIC_OFFERING],
                address[EXCHANGE_RELATED_ACTIVITIES],
                privateOfferingParticipants[0],
                privateOfferingParticipants[1],
            ]);

            balances[0].should.be.bignumber.equal(stake[PUBLIC_OFFERING]);
            balances[1].should.be.bignumber.equal(stake[EXCHANGE_RELATED_ACTIVITIES]);

            const privateOfferingPrepayment = calculatePercentage(stake[PRIVATE_OFFERING], PRIVATE_OFFERING_PRERELEASE);
            const privateOfferingPrepaymentValues = [
                privateOfferingPrepayment.mul(privateOfferingParticipantsStakes[0]).div(stake[PRIVATE_OFFERING]),
                privateOfferingPrepayment.mul(privateOfferingParticipantsStakes[1]).div(stake[PRIVATE_OFFERING]),
            ];
            balances[2].should.be.bignumber.equal(privateOfferingPrepaymentValues[0]);
            balances[3].should.be.bignumber.equal(privateOfferingPrepaymentValues[1]);

            function validateInstallmentEvent(index, pool, value) {
                logs[index].args.pool.toNumber().should.be.equal(pool);
                logs[index].args.value.should.be.bignumber.equal(value);
                logs[index].args.caller.should.be.equal(owner);
            }
            validateInstallmentEvent(1, PUBLIC_OFFERING, stake[PUBLIC_OFFERING]);
            validateInstallmentEvent(2, EXCHANGE_RELATED_ACTIVITIES, stake[EXCHANGE_RELATED_ACTIVITIES]);
            validateInstallmentEvent(3, PRIVATE_OFFERING, privateOfferingPrepayment);
        });
        it('cannot be initialized with not a token address', async () => {
            await distribution.initialize(accounts[9]).should.be.rejectedWith(ERROR_MSG);
        });
        it('cannot be initialized twice', async () => {
            await distribution.initialize(token.address).should.be.fulfilled;
            await distribution.initialize(token.address).should.be.rejectedWith('already initialized');
        });
        it('cannot be initialized with wrong token', async () => {
            token = await ERC20.new();
            await distribution.initialize(token.address).should.be.rejectedWith('wrong contract balance');
        });
    });
    describe('unlockRewardForStaking', async () => {
        let bridge;

        beforeEach(async () => {
            distribution = await createDistribution();
            token = await createToken(distribution.address);
            await distribution.initialize(token.address).should.be.fulfilled;
            bridge = await EmptyContract.new();
            await distribution.setBridgeAddress(bridge.address).should.be.fulfilled;
        });
        async function unlock(timePastFromStart) {
            const distributionStartTimestamp = await distribution.distributionStartTimestamp();
            const nextTimestamp = distributionStartTimestamp.add(timePastFromStart).toNumber();
            await mineBlock(nextTimestamp);
            await token.approve(distribution.address, stake[REWARD_FOR_STAKING], { from: address[REWARD_FOR_STAKING] });
            const caller = randomAccount();
            const { logs } = await distribution.unlockRewardForStaking({ from: caller }).should.be.fulfilled;
            logs[0].args.bridge.should.be.equal(bridge.address);
            logs[0].args.poolAddress.should.be.equal(address[REWARD_FOR_STAKING]);
            logs[0].args.value.should.be.bignumber.equal(stake[REWARD_FOR_STAKING]);
            logs[0].args.caller.should.be.equal(caller);
            (await token.balanceOf(bridge.address)).should.be.bignumber.equal(stake[REWARD_FOR_STAKING]);
        }
        it('should be unlocked', async () => {
            await unlock(cliff[REWARD_FOR_STAKING]);
        });
        it('should be unlocked if time past more than cliff', async () => {
            await unlock(cliff[REWARD_FOR_STAKING].mul(new BN(15)));
        });
        it('should fail if bridge address is not set', async () => {
            distribution = await createDistribution();
            token = await createToken(distribution.address);
            await distribution.initialize(token.address).should.be.fulfilled;
            bridge = await EmptyContract.new();
            const distributionStartTimestamp = await distribution.distributionStartTimestamp();
            const nextTimestamp = distributionStartTimestamp.add(cliff[REWARD_FOR_STAKING]).toNumber();
            await mineBlock(nextTimestamp);
            await distribution.unlockRewardForStaking({
                from: randomAccount()
            }).should.be.rejectedWith('invalid address');
        });
        it('should fail if tokens are not approved', async () => {
            const distributionStartTimestamp = await distribution.distributionStartTimestamp();
            const nextTimestamp = distributionStartTimestamp.add(cliff[REWARD_FOR_STAKING]).toNumber();
            await mineBlock(nextTimestamp);
            await distribution.unlockRewardForStaking().should.be.rejectedWith('SafeMath: subtraction overflow.');
        });
        it('cannot be unlocked before time', async () => {
            const distributionStartTimestamp = await distribution.distributionStartTimestamp();
            const nextTimestamp = distributionStartTimestamp.add(cliff[REWARD_FOR_STAKING]).sub(new BN(1)).toNumber();
            await mineBlock(nextTimestamp);
            await distribution.unlockRewardForStaking({
                from: randomAccount()
            }).should.be.rejectedWith('installments are not active for this pool');
        });
        it('cannot be unlocked if not initialized', async () => {
            distribution = await createDistribution();
            token = await createToken(distribution.address);
            await distribution.unlockRewardForStaking({
                from: randomAccount()
            }).should.be.rejectedWith('not initialized');
        });
        it('cannot be unlocked twice', async () => {
            const distributionStartTimestamp = await distribution.distributionStartTimestamp();
            const nextTimestamp = distributionStartTimestamp.add(cliff[REWARD_FOR_STAKING]).toNumber();
            await mineBlock(nextTimestamp);
            await token.approve(distribution.address, stake[REWARD_FOR_STAKING], { from: address[REWARD_FOR_STAKING] });
            await distribution.unlockRewardForStaking({
                from: randomAccount()
            }).should.be.fulfilled;
            await distribution.unlockRewardForStaking({
                from: randomAccount()
            }).should.be.rejectedWith('installments are not active for this pool');
        });
    });
    describe('changePoolAddress', async () => {
        beforeEach(async () => {
            distribution = await createDistribution();
            token = await createToken(distribution.address);
            await distribution.initialize(token.address).should.be.fulfilled;
        });
        it('should be changed', async () => {
            async function changeAddress(pool, newAddress) {
                const { logs } = await distribution.changePoolAddress(
                    pool,
                    newAddress,
                    { from: address[pool] },
                ).should.be.fulfilled;
                logs[0].args.pool.toNumber().should.be.equal(pool);
                logs[0].args.oldAddress.should.be.equal(address[pool]);
                logs[0].args.newAddress.should.be.equal(newAddress);
                (await distribution.poolAddress(pool)).should.be.equal(newAddress);
            }
            await changeAddress(ECOSYSTEM_FUND, accounts[8]);
            await changeAddress(FOUNDATION_REWARD, accounts[9]);
        });
        it('should fail if wrong pool', async () => {
            await distribution.changePoolAddress(7, accounts[8]).should.be.rejectedWith('wrong pool');
            await distribution.changePoolAddress(0, accounts[8]).should.be.rejectedWith('wrong pool');
        });
        it('should fail if not authorized', async () => {
            await distribution.changePoolAddress(
                ECOSYSTEM_FUND,
                accounts[8],
            ).should.be.rejectedWith('not authorized');
            await distribution.changePoolAddress(
                FOUNDATION_REWARD,
                accounts[8],
            ).should.be.rejectedWith('not authorized');
        });
        it('should fail if invalid address', async () => {
            await distribution.changePoolAddress(
                ECOSYSTEM_FUND,
                EMPTY_ADDRESS,
                { from: address[ECOSYSTEM_FUND] },
            ).should.be.rejectedWith('invalid address');
        });
        it('should fail if not initialized', async () => {
            distribution = await createDistribution();
            await distribution.changePoolAddress(
                ECOSYSTEM_FUND,
                accounts[8],
                { from: address[ECOSYSTEM_FUND] },
            ).should.be.rejectedWith('not initialized');
        });
    });
    describe('setBridgeAddress', async () => {
        let bridge;

        beforeEach(async () => {
            distribution = await createDistribution();
            token = await createToken(distribution.address);
            await distribution.initialize(token.address).should.be.fulfilled;
            bridge = await EmptyContract.new();
        });
        it('should be set', async () => {
            const { logs } = await distribution.setBridgeAddress(bridge.address).should.be.fulfilled;
            logs[0].args.bridge.should.be.equal(bridge.address);
            logs[0].args.caller.should.be.equal(owner);
            (await distribution.bridgeAddress()).should.be.equal(bridge.address);
        });
        it('should fail if not a contract', async () => {
            await distribution.setBridgeAddress(accounts[8]).should.be.rejectedWith('not a contract address');
        });
        it('should fail if not an owner', async () => {
            await distribution.setBridgeAddress(
                bridge.address,
                { from: accounts[8] }
            ).should.be.rejectedWith('Ownable: caller is not the owner');
        });
    });
});