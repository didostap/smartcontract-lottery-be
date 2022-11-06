import { run } from 'hardhat'

export const verify = async (contractAddress: string, args: any) => {
    try {
        console.log('Veryfing')
        await run('verify:verify', {
            address: contractAddress,
            constructorArguments: args,
        })
    } catch (err) {
        if (err instanceof Error) {
            if (err.message.toLowerCase().includes('already verified')) {
                console.log('Already Verified')
            } else {
                console.log(err)
            }
        } else {
            console.log(err)
        }
    }
}
