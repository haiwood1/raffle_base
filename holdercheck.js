import { AnkrProvider } from "@ankr.com/ankr.js";
import fs from "fs";
const provider = new AnkrProvider("https://rpc.ankr.com/multichain/{api-key}");

const tokenlist = [
    "0x2b0772BEa2757624287ffc7feB92D03aeAE6F12D",
    "0x20ef84969f6d81Ff74AE4591c331858b20AD82CD",
    "0x3e43cB385A6925986e7ea0f0dcdAEc06673d4e10",
];

//LP to exclude
const walletToExclude = [
    "0xF5677B22454dEe978b2Eb908d6a17923F5658a79",
    "0x151f059Cc70B3661587EfB539ee00bd246965237",
    "0x197ecb5c176aD4f6e77894913a94c5145416f148",
    "0x3fdD9A4b3CA4a99e3dfE931e3973C2aC37B45BE9",
    "0xdDCA2ac53c2db6F1bC7E84Dd1071291AC0537c1E",
    "0x2711db0cFef7E3C2E6E3fA6d2C0ED4D4257242dA",
    "0xdbeF754e8be89EfD661fe2c412b3F6365a016223",
];

let holderlist = [];
let totalcsvContent = "address,balance,tokens\n";

async function getCurrentBlock() {
    const blockNumber = await provider.getBlocks({
        blockchain: "base",
        fromBlock: "latest",
    });

    console.log(parseInt(blockNumber.blocks[0].number, 16));
    return parseInt(blockNumber.blocks[0].number, 16);
}

async function getHolders(token) {
    const tokenHolders = async () => {
        return await provider.getTokenHolders({
            blockchain: "base",
            contractAddress: token,
        });
    };
    let csvContent = "address,balance,tokens\n";
    const result = await tokenHolders();
    // console.log(reply.holders);
    // Create CSV header

    result.holders.forEach((x) => {
        //check if x.holderAddress is in walletToExclude
        if (walletToExclude.find((x) => x == x.holderAddress)) {
            return;
        }
        // remove holder less than 1 token
        if (x.balance >= 1) {
            //check if x.holderAddress already exist in holderlist
            if (holderlist.find((x) => x.address == x.holderAddress)) {
                x.balance += holderlist.find(
                    (x) => x.address == x.holderAddress
                ).balance;
                // add token address to holdings
                holderlist
                    .find((x) => x.address == x.holderAddress)
                    .holdings.push(token);
            } else {
                holderlist.push({
                    address: x.holderAddress,
                    balance: x.balance,
                    holdings: [token],
                });
            }
        }
    });

    // Write to file
    // console.log(csvContent);
    fs.writeFileSync(`holders-${token}.csv`, csvContent);
    console.log(`Holders data has been written to holders-${token}.csv`);
}

function randomize(holderlist, numberOfWinners = 100) {
    // Calculate total weight (sum of all balances)
    const totalWeight = holderlist.reduce(
        (sum, holder) => sum + parseFloat(holder.balance),
        0
    );

    // Create array for weighted selection
    let winners = [];
    let remainingHolders = [...holderlist];

    // Select winners without replacement
    for (let i = 0; i < numberOfWinners && remainingHolders.length > 0; i++) {
        // Generate random number between 0 and total remaining weight
        const remainingWeight = remainingHolders.reduce(
            (sum, holder) => sum + parseFloat(holder.balance),
            0
        );
        const random = Math.random() * remainingWeight;

        // Find the winner
        let cumulativeWeight = 0;
        let winnerIndex = 0;

        for (let j = 0; j < remainingHolders.length; j++) {
            cumulativeWeight += parseFloat(remainingHolders[j].balance);
            if (cumulativeWeight > random) {
                winnerIndex = j;
                break;
            }
        }

        // Add winner to list and remove from remaining holders
        winners.push(remainingHolders[winnerIndex]);
        remainingHolders.splice(winnerIndex, 1);
    }

    // Log winners
    console.log("Selected Winners:");
    winners.forEach((winner, index) => {
        console.log(
            `${index + 1}. Address: ${winner.address}, Balance: ${
                winner.balance
            }`
        );
    });

    // Write winners to CSV
    const winnersCSV =
        "address,balance\n" +
        winners.map((w) => `${w.address},${w.balance}`).join("\n");
    fs.writeFileSync("winners.csv", winnersCSV);

    return winners;
}

async function main() {
    const block = await getCurrentBlock();
    await Promise.all(
        tokenlist.map(async (token) => {
            await getHolders(token);
        })
    );

    holderlist.forEach((x) => {
        totalcsvContent += `${x.address},${x.balance},${x.holdings}\n`;
    });
    fs.writeFileSync(`holders-total-block-${block}.csv`, totalcsvContent);

    //loader holder list from csv
    const csv = fs.readFileSync("holders-total.csv", "utf8");
    const lines = csv.split("\n");
    let holder_raffler = [];
    for (let i = 1; i < lines.length; i++) {
        const [address, balance, holdings] = lines[i].split(",");
        holder_raffler.push({
            address: address,
            balance: balance,
        });
    }
    // console.log(holder_raffler);

    randomize(holder_raffler, 100);
}

main();
