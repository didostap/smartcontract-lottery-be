import { ethers } from 'ethers'
import { DeployFunction } from 'hardhat-deploy/types'
import { networkConfig } from '../helper.hardhat.config'

const BASE_FEE = ethers.utils.parseEther('0.25')
const GAS_PRICE_LINK = 1e9

const deployMocks: DeployFunction = async ({ deployments, network, getNamedAccounts }) => {
    const { deploy } = deployments
    const { deployer } = await getNamedAccounts()

    await deploy('VRFCoordinatorV2Mock', {
        args: [BASE_FEE, GAS_PRICE_LINK],
        from: deployer,
        log: true,
        waitConfirmations: networkConfig[network.config.chainId!].blockConfirmations,
    })
}

deployMocks.tags = ['mocks']
deployMocks.skip = async (env) => env.network.live

export default deployMocks
