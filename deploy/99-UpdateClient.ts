import { DeployFunction } from 'hardhat-deploy/types'
import fs from 'fs'

const UPDATE_CLIENT = process.env.UPDATE_CLIENT
const CLIENT_ADDRESSES_FILE = '../smartcontract-lottery-client/constants/contractAddresses.json'
const CLIENT_ABI_FILE = '../smartcontract-lottery-client/constants/abi.json'

const updateABI = async () => {}

const UpdateClient: DeployFunction = async ({ ethers, network }) => {
    if (!UPDATE_CLIENT) return

    const chainId = network.config.chainId!
    const raffle = await ethers.getContract('Raffle')
    const contractAddresses = JSON.parse(fs.readFileSync(CLIENT_ADDRESSES_FILE, 'utf8'))

    if (contractAddresses[chainId] && !contractAddresses[chainId].includes(raffle.address)) {
        contractAddresses[chainId].push(raffle.address)
    } else {
        contractAddresses[chainId] = [raffle.address]
    }

    fs.writeFileSync(CLIENT_ADDRESSES_FILE, JSON.stringify(contractAddresses))
    fs.writeFileSync(
        CLIENT_ABI_FILE,
        raffle.interface.format(ethers.utils.FormatTypes.json) as string
    )
}

UpdateClient.tags = ['client']
export default UpdateClient
