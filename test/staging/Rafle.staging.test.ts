import { expect } from 'chai'
import { ethers, getNamedAccounts, network } from 'hardhat'
import { Raffle } from '../../typechain-types/contracts/Raffle'

!network.config.live
    ? describe.skip
    : describe('Raffle', () => {
          describe('fulfillRandomWords', () => {
              it('should pick a winner, resets and sends money', async () => {
                  const deployer = (await getNamedAccounts()).deployer
                  const raffle: Raffle = await ethers.getContract('Raffle', deployer)
                  const accounts = await ethers.getSigners()
                  const entranceFee = await raffle.getEntranceFee()

                  await new Promise<void>(async (resolve, reject) => {
                      try {
                          raffle.once('WinnerPicked', async () => {
                              const recentWinner = await raffle.callStatic.getRecentWinner()
                              const raffleState = await raffle.getRaffleState()
                              const winnerBalance = accounts[0].getBalance()

                              await expect(raffle.getPlayer(0)).to.be.reverted
                              expect(recentWinner).to.be.equal(accounts[0].address)
                              expect(raffleState).to.be.equal(0)
                              expect(winnerBalance).to.be.equal(startingBalance.add(entranceFee))
                          })
                          resolve()
                      } catch (e) {
                          reject(e)
                      }

                      const txResponse = await raffle.enterRaffle({ value: entranceFee })
                      const txReceipt = await txResponse.wait(1)
                      const startingBalance = await accounts[0].getBalance()
                  })
              })
          })
      })
