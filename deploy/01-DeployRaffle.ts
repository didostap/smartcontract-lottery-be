import { ethers } from 'hardhat'
import { DeployFunction } from 'hardhat-deploy/types'
import { networkConfig } from '../helper.hardhat.config'
import { verify } from '../utils/verify'

const INTERVAL = '30'
const VRF_SUB_FUND_AMOUNT = ethers.utils.parseEther('2')

const deployRaffle: DeployFunction = async ({ deployments, network, ethers, getNamedAccounts }) => {
    const { deploy } = deployments
    const { deployer } = await getNamedAccounts()
    const chainId = network.config.chainId!

    const entranceFee = ethers.utils.parseEther('0.01')
    const { keyHash, callbackGasLimit, requestConfirmations } = networkConfig[chainId]

    let VRFCoordinatorV2Address: string
    let randomWordsSubscriptionId: string

    if (network.live) {
        VRFCoordinatorV2Address = networkConfig[chainId].VRFCoordinatorV2Address!
        randomWordsSubscriptionId = networkConfig[chainId].randomWordsSubscriptionId
    } else {
        const VRFCoordinatorV2 = await ethers.getContract('VRFCoordinatorV2Mock')
        VRFCoordinatorV2Address = VRFCoordinatorV2.address

        const tsResponse = await VRFCoordinatorV2.createSubscription()
        const tsReceipt = await tsResponse.wait(1)

        randomWordsSubscriptionId = tsReceipt.events[0].args.subId.toNumber()
        await VRFCoordinatorV2.fundSubscription(randomWordsSubscriptionId, VRF_SUB_FUND_AMOUNT)
    }

    const args = [
        entranceFee,
        INTERVAL,
        keyHash,
        randomWordsSubscriptionId,
        callbackGasLimit,
        requestConfirmations,
        VRFCoordinatorV2Address,
    ]
    const raffle = await deploy('Raffle', {
        from: deployer,
        log: true,
        args,
        waitConfirmations: networkConfig[chainId].blockConfirmations,
    })

    if (!network.config.live) {
        const VRFCoordinatorV2Mock = await ethers.getContract('VRFCoordinatorV2Mock')
        VRFCoordinatorV2Mock.addConsumer(randomWordsSubscriptionId, raffle.address)
    } else {
        await verify(raffle.address, args)
    }
}

deployRaffle.tags = ['Raffle']
export default deployRaffle
