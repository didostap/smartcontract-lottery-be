// SPDX-License-Identifier: MIT

pragma solidity ^0.8.17;

import '@chainlink/contracts/src/v0.8/VRFConsumerBaseV2.sol';
import '@chainlink/contracts/src/v0.8/interfaces/VRFCoordinatorV2Interface.sol';
import '@chainlink/contracts/src/v0.8/interfaces/AutomationCompatibleInterface.sol';

error Raffle__NotOpen();
error Raffle__TransferFailed();
error Raffle__WrongEnterRaffle();
error Raffle__UpkeepNotNeeded(uint256 balance, uint256 numPlayers, uint8 raffleState);

/** @title A sample Raffle Contract
 * @author didostap
 * @notice This contract is for creating an untamperable decentralized smart contract
 * @dev This implements Chainlink VRF v2 and Chainlink Automation
 */
contract Raffle is VRFConsumerBaseV2, AutomationCompatibleInterface {
    enum RaffleState {
        OPEN,
        CALCULATING
    }

    uint256 internal immutable entranceFee;
    address payable[] private players;
    RaffleState private raffleState;
    bool internal locked;
    address payable internal recentWinner;

    uint256 public immutable interval;
    uint256 public lastTimeStamp;
    bytes32 private immutable keyHash;
    uint64 private immutable subscriptionId;
    uint32 private immutable callbackGasLimit;
    uint16 private immutable requestConfirmations;
    VRFCoordinatorV2Interface COORDINATOR;
    uint8 private constant NUM_WORDS = 1;

    event RaffleEnter(address indexed player);
    event RequestedRaffleWinner(uint256 indexed requestId);
    event WinnerPicked(address indexed winner);

    constructor(
        uint256 _entranceFee,
        uint256 _interval,
        bytes32 _keyHash,
        uint64 _subscriptionId,
        uint32 _callbackGasLimit,
        uint16 _requestConfirmations,
        address _coordinatorAddress
    ) VRFConsumerBaseV2(_coordinatorAddress) {
        raffleState = RaffleState.OPEN;
        entranceFee = _entranceFee;

        interval = _interval;
        lastTimeStamp = block.timestamp;
        keyHash = _keyHash;
        subscriptionId = _subscriptionId;
        callbackGasLimit = _callbackGasLimit;
        requestConfirmations = _requestConfirmations;
        COORDINATOR = VRFCoordinatorV2Interface(_coordinatorAddress);
    }

    fallback() external payable {
        enterRaffle();
    }

    receive() external payable {
        enterRaffle();
    }

    function enterRaffle() public payable {
        if (msg.value != entranceFee) revert Raffle__WrongEnterRaffle();
        if (raffleState != RaffleState.OPEN) revert Raffle__NotOpen();

        players.push(payable(msg.sender));
        emit RaffleEnter(msg.sender);
    }

    /**
     * @dev This is the function that the Chainlink Keeper nodes call
     * they look for `upkeepNeeded` to return True.
     * the following should be true for this to return true:
     * 1. The time interval has passed between raffle runs.
     * 2. The lottery is open.
     * 3. The contract has ETH.
     * 4. Implicity, your subscription is funded with LINK.
     */
    function checkUpkeep(
        bytes memory /* checkData */
    )
        public
        override
        returns (
            bool upkeepNeeded,
            bytes memory /* performData */
        )
    {
        bool isOpen = raffleState == RaffleState.OPEN;
        bool timePassed = (block.timestamp - lastTimeStamp) > interval;
        bool hasPlayers = players.length > 0;
        bool hasBalance = address(this).balance > 0;
        upkeepNeeded = isOpen && timePassed && hasPlayers && hasBalance;
        return (upkeepNeeded, '0x0');
    }

    /**
     * @dev Once `checkUpkeep` is returning `true`, this function is called
     * and it kicks off a Chainlink VRF call to get a random winner.
     */
    function performUpkeep(
        bytes calldata /* performData */
    ) external override {
        (bool upkeepNeeded, ) = checkUpkeep('');
        if (!upkeepNeeded)
            revert Raffle__UpkeepNotNeeded(
                address(this).balance,
                players.length,
                uint8(raffleState)
            );

        raffleState = RaffleState.CALCULATING;
        uint256 requestId = COORDINATOR.requestRandomWords(
            keyHash,
            subscriptionId,
            requestConfirmations,
            callbackGasLimit,
            NUM_WORDS
        );

        emit RequestedRaffleWinner(requestId);
    }

    /**
     * @dev This is the function that Chainlink VRF node
     * calls to send the money to the random winner.
     */
    function fulfillRandomWords(
        uint256, /* requestId */
        uint256[] memory _randomWords
    ) internal override {
        require(!locked, 'No re-entrancy');
        locked = true;

        uint256 indexOfWinner = _randomWords[0] % players.length;
        recentWinner = players[indexOfWinner];
        raffleState = RaffleState.OPEN;
        players = new address payable[](0);
        lastTimeStamp = block.timestamp;

        (bool success, ) = recentWinner.call{value: address(this).balance}('');
        if (!success) revert Raffle__TransferFailed();
        emit WinnerPicked(recentWinner);

        locked = false;
    }

    // Getters
    function getRaffleBalance() public view returns (uint256) {
        return address(this).balance;
    }

    function getEntranceFee() public view returns (uint256) {
        return entranceFee;
    }

    function getRaffleState() public view returns (RaffleState) {
        return raffleState;
    }

    function getPlayer(uint256 index) public view returns (address) {
        return players[index];
    }

    function getRecentWinner() public view returns (address) {
        return recentWinner;
    }

    function getNumPlayers() public view returns (uint256) {
        return players.length;
    }
}
