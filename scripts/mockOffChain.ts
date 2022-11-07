import { ethers, network } from 'hardhat'
import { Raffle, VRFCoordinatorV2Mock } from '../typechain-types'

const mockKeepers = async () => {
    const raffle: Raffle = await ethers.getContract('Raffle')
    const checkData = ethers.utils.keccak256(ethers.utils.toUtf8Bytes(''))
    const { upkeepNeeded } = await raffle.callStatic.checkUpkeep(checkData)
    if (upkeepNeeded) {
        const tx = await raffle.performUpkeep(checkData)
        const txReceipt = await tx.wait(1)
        const requestId = txReceipt.events![1].args!.requestId

        console.log(`Performed upkeep with RequestId: ${requestId}`)
        if (!network.config.live) {
            const vrfCoordinatorV2Mock: VRFCoordinatorV2Mock = await ethers.getContract(
                'VRFCoordinatorV2Mock'
            )
            await vrfCoordinatorV2Mock.fulfillRandomWords(requestId, raffle.address)
            const recentWinner = await raffle.getRecentWinner()
            console.log(`The winner is: ${recentWinner}`)
        }
    } else {
        console.log('No upkeep needed!')
    }
}

mockKeepers()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error)
        process.exit(1)
    })
