import { expect } from 'chai'
import { BigNumber } from 'ethers'
import { deployments, ethers, getNamedAccounts, network } from 'hardhat'
import { Raffle } from '../../typechain-types/contracts/Raffle'

network.config.live
    ? describe.skip
    : describe('Raffle', () => {
          let deployer: string
          let raffle: Raffle
          let entranceFee: BigNumber
          let interval: BigNumber

          beforeEach(async () => {
              await deployments.fixture()

              deployer = (await getNamedAccounts()).deployer
              raffle = await ethers.getContract('Raffle')
              entranceFee = await raffle.getEntranceFee()
              interval = await raffle.interval()
          })

          describe('enterRaffle', () => {
              it('should enter raffle when exact entrance fee', async () => {
                  expect(await raffle.enterRaffle({ value: entranceFee }))
                      .to.emit(raffle, 'RaffleEnter')
                      .withArgs(deployer)

                  const raffleBalance = await raffle.callStatic.getRaffleBalance()
                  const rafflePlayer = await raffle.getPlayer(0)
                  expect(raffleBalance).to.equal(entranceFee)
                  expect(deployer).to.equal(rafflePlayer)
              })

              it('should be reverted wrong entrance fee', async () => {
                  await expect(raffle.enterRaffle()).to.be.revertedWithCustomError(
                      raffle,
                      'Raffle__WrongEnterRaffle'
                  )
              })

              it('should be reverted when raffle is calculating', async () => {
                  await raffle.enterRaffle({ value: entranceFee })

                  await network.provider.send('evm_increaseTime', [interval.toNumber() + 1])
                  await network.provider.send('evm_mine')

                  await raffle.performUpkeep([])
                  await expect(
                      raffle.enterRaffle({ value: entranceFee })
                  ).to.be.revertedWithCustomError(raffle, 'Raffle__NotOpen')
              })
          })

          describe('checkUpkeep', () => {
              it('need upkeep', async () => {
                  await raffle.enterRaffle({ value: entranceFee })

                  await network.provider.send('evm_increaseTime', [interval.toNumber() + 1])
                  await network.provider.send('evm_mine')

                  const checkedData = (await raffle.callStatic.checkUpkeep([]))[0]
                  expect(checkedData).to.be.true
              })

              it('no need upkeep as raffle is calculating', async () => {
                  await raffle.enterRaffle({ value: entranceFee })

                  await network.provider.send('evm_increaseTime', [interval.toNumber() + 1])
                  await network.provider.send('evm_mine')

                  await raffle.performUpkeep([])

                  const checkedData = (await raffle.callStatic.checkUpkeep([]))[0]
                  expect(checkedData).to.be.false
              })

              it('no need upkeep as not enough time passed', async () => {
                  await raffle.enterRaffle({ value: entranceFee })
                  const checkedData = (await raffle.callStatic.checkUpkeep([]))[0]
                  expect(checkedData).to.be.false
              })

              it('no need upkeep as no players and balance', async () => {
                  await network.provider.send('evm_increaseTime', [interval.toNumber() + 1])
                  await network.provider.send('evm_mine')

                  const checkedData = (await raffle.callStatic.checkUpkeep([]))[0]
                  expect(checkedData).to.be.false
              })
          })

          describe('performUpkeep', () => {
              it('success if checkUpkeep true', async () => {
                  await raffle.enterRaffle({ value: entranceFee })

                  await network.provider.send('evm_increaseTime', [interval.toNumber() + 1])
                  await network.provider.send('evm_mine')

                  await expect(raffle.performUpkeep([]))
                      .to.emit(raffle, 'RequestedRaffleWinner')
                      .withArgs(1)
                  const raffleState = await raffle.getRaffleState()
                  await expect(raffleState).to.be.equal(1)
              })

              it('should revert if checkUpkeep false', async () => {
                  await expect(raffle.performUpkeep([]))
                      .to.be.revertedWithCustomError(raffle, 'Raffle__UpkeepNotNeeded')
                      .withArgs(0, 0, 0)
              })
          })

          describe('fulfillRandomWords', () => {
              let vrfCoordinatorV2Mock: any
              beforeEach(async () => {
                  await raffle.enterRaffle({ value: entranceFee })
                  await network.provider.send('evm_increaseTime', [interval.toNumber() + 1])
                  await network.provider.send('evm_mine')
                  vrfCoordinatorV2Mock = await ethers.getContract('VRFCoordinatorV2Mock')
              })

              it('should pick a winner, resets and sends money', async () => {
                  const additionalEntrances = 3
                  const startingIndex = 2
                  const accounts = await ethers.getSigners()

                  for (let i = startingIndex; i < startingIndex + additionalEntrances; i++) {
                      raffle = raffle.connect(accounts[i])
                      await raffle.enterRaffle({ value: entranceFee })
                  }

                  await new Promise<void>(async (resolve, reject) => {
                      raffle.once('WinnerPicked', async () => {
                          try {
                              const recentWinner = await raffle.callStatic.getRecentWinner()
                              const raffleState = await raffle.getRaffleState()
                              const winnerBalance = await accounts[2].getBalance()

                              await expect(raffle.getPlayer(0)).to.be.reverted
                              expect(recentWinner).to.be.equal(accounts[2].address)
                              expect(raffleState).to.be.equal(0)
                              expect(winnerBalance).to.be.equal(
                                  startingBalance.add(
                                      entranceFee.mul(additionalEntrances).add(entranceFee)
                                  )
                              )
                              resolve()
                          } catch (e) {
                              reject(e)
                          }
                      })

                      const tx = await raffle.performUpkeep([])
                      const txReceipt = await tx.wait(1)
                      const startingBalance = await accounts[2].getBalance()
                      await vrfCoordinatorV2Mock.fulfillRandomWords(
                          txReceipt.events![1].args!.requestId,
                          raffle.address
                      )
                  })
              })

              it('can not be called before performUpkeep', async () => {
                  await expect(
                      vrfCoordinatorV2Mock.fulfillRandomWords(0, raffle.address)
                  ).to.be.revertedWith('nonexistent request')
              })
          })
      })
