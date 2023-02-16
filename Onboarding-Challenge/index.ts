import dotenv from "dotenv";
dotenv.config({ path: "./.env" });

import { Address, TonClient } from "ton";
import { BN } from 'bn.js';
import { unixNow } from "./ton-onboarding-challenge/src/lib/utils";
import { MineMessageParams, Queries } from "./ton-onboarding-challenge/src/giver/NftGiver.data";
import { toNano } from "ton";

async function main() { // 나중에 공개 API에 요청을 할 것이므로, API 응답을 기다리기 위해 필요하다. Promise 방식에 비해 코드 단순성을 줄일 수 있다.

    const wallet = Address.parse(process.env.WALLET!); // 보상을 받을 지갑 주소
    const collection = Address.parse('EQDk8N7xM5D669LC2YACrseBJtDyFqwtSPCNhRWXU7kjEptX'); // NFT를 채굴하기 위한 collection address smart contract

    // toncenter.com에서 호스팅되는 TonCenter API 공급자에 연결해야 함.
    const client = new TonClient({
        endpoint: 'https://testnet.toncenter.com/api/v2/jsonRPC',
        apiKey: process.env.APIKEY,
    });

    // TON에서 smart contract method를 실행하는 방법
    // callGetMethod(SMART_CONTRACT_ADDRESS, METHOD) 함수를 통해 실행할 수 있다.
    const miningData = await client.callGetMethod(collection, 'get_mining_data');
    console.log(miningData);

    // === Command ===
    // npm run start

    // === Output ===
    // {
    //     gas_used: 2374,
    //         stack: [
    //             [
    //                 'num',
    //                 '0x3a1bdcd7634874b38fcc3d78cab1d65d624c97f36dba09c30dbdaec1495f2e5'
    //             ],
    //             ['num', '0x63ec563b'],
    //             ['num', '0xade9fd868f779fb7fdd800b95821f515'],
    //             ['num', '0x1e'],
    //             ['num', '0xab'],
    //             ['num', '0xfc']
    //         ]
    // }

    // 이제 위에서 얻은 원시 데이터 hex값을 이해하고 사용 가능한 것으로 변환해야 한다.
    // 다만 JavaScript 제한 때문에, 변수로 이동하여 사용할 수가 없다.
    // 여기서 우리는 bn.js라는 라이브러리를 추가하여, 최대 JavaScript 정수 값보다 큰 Big Numbers와 함께 작동하도록 한다.

    const parseStackNum = (sn: any) => new BN(sn[1].substring(2), 'hex');

    const complexity = parseStackNum(miningData.stack[0]);
    const last_success = parseStackNum(miningData.stack[1]);
    const seed = parseStackNum(miningData.stack[2]);
    const target_delta = parseStackNum(miningData.stack[3]);
    const min_cpl = parseStackNum(miningData.stack[4]);
    const max_cpl = parseStackNum(miningData.stack[5]);

    console.log('complexity', complexity);
    console.log('last_success', last_success.toString());
    console.log('seed', seed);
    console.log('target_delta', target_delta.toString());
    console.log('min_cpl', min_cpl.toString());
    console.log('max_cpl', max_cpl.toString());

    // miningData는 16진수 숫자가 있는 stack 배열이다.
    // parseStackNum 함수를 추가하여 16진수에서 BN 객체를 생성하여 값을 얻도록 한다.
    // 콘솔에 값을 출력해 보자.

    // === Command ===
    // npm run start

    // === Output ===
    // complexity <BN: 3a1bdcd7634874b38fcc3d78cab1d65d624c97f36dba09c30dbdaec1495f2e5>
    // last_success 1676432955
    // seed <BN: ade9fd868f779fb7fdd800b95821f515>
    // target_delta 30
    // min_cpl 171
    // max_cpl 252

    // complexity: 채굴자에게 가장 중요한 숫자. 값에 대한 Proof-of-Work 복잡성이다. final hash가 complexity보다 작으면 성공한 것이다.
    // last_success: 마지막 채굴 트랜잭션의 unixtime이다. last_success가 변경될 때마다 시드도 변경되기에, 채굴기를 다시 실행해야 한다.
    // seed: 해시를 계산하기 위해 smart contract에 의해 생성된 고유한 값이다.
    // target_delta, min_cpl, max_cpl: 이 자습서에서는 사용되지 않음.

    // NftGiver.data.ts에 있는 MineMessageParams 객체를 사용해서 Queries의 트랜잭션을 생성하자.

    const mineParams: MineMessageParams = {
        expire: unixNow() + 300, // 5 min is enough to make a transaction
        mintTo: wallet, // your wallet
        data1: new BN(0), // temp variable to increment in the miner
        seed // unique seed from get_mining_data
    };

    let msg = Queries.mine(mineParams); // transaction builder
    let progress = 0;

    // 채굴의 아이디어는 마지막으로 msg.hash()에서 get_mining_data()보다 작은 해시를 찾는 것이다.
    // 우리는 data1을 필요한 만큼 증가시킬 수 있다.
    // 그래서 순수한 채굴기는 msg.hash() > complexity 라면 무한히 실행된다.

    while (new BN(msg.hash(), 'be').gt(complexity)) {
        progress += 1;
        console.clear();
        console.log(`Mining started: please, wait for 30-60 seconds to mine your NFT!`);
        console.log(' ');
        console.log(`⛏ Mined ${progress} hashes! Last: `, new BN(msg.hash(), 'be').toString());

        mineParams.expire = unixNow() + 300;
        mineParams.data1.iaddn(1);
        msg = Queries.mine(mineParams);
    }

    // BN 함수에 대한 내용은 다음과 같다.
    // 우리는 'be' 속성을 가진 msg.hash()로부터 big-endian BN 객체를 생성한다.
    // gt()는 BigNumbers를 비교하기 위해 무언가(complexity)보다 큼을 의미합니다.
    // iaddn(1)은 값을 증가시키는 것을 의미합니다.

    console.log(' ');
    console.log('💎 Mission completed: msg_hash less than pow_complexity found!');;
    console.log(' ');
    console.log('msg_hash: ', new BN(msg.hash(), 'be').toString());
    console.log('pow_complexity: ', complexity.toString());
    console.log('msg_hash < pow_complexity: ', new BN(msg.hash(), 'be').lt(complexity));

    // === Command ===
    // npm run start

    // === Output ===
    // {
    //     gas_used: 2374,
    //     stack: [
    //       [
    //         'num',
    //         '0x3a1bdcd7634874b38fcc3d78cab1d65d624c97f36dba09c30dbdaec1495f2e5'
    //       ],
    //       [ 'num', '0x63ec563b' ],
    //   Mining started: please, wait for 30-60 seconds to mine your NFT!

    //   ⛏ Mined 6 hashes! Last:  16475952958009400794140568958384350514684634834161177968191288751850415962872

    //   💎 Mission completed: msg_hash less than pow_complexity found!

    //   msg_hash:  1100234754325609093072934083887630870343586940173156042168882650577927670404
    //   pow_complexity:  1642710892476188609570721362948968264331333457511842233832010214392389300965
    //   msg_hash < pow_complexity:  true

    // 결제 URL을 구축해 보자.
    // 메시지를 작성하고, Tonkeeper 지갑을 사용하여 smart contract으로 보내 보자.
    console.log(' ');
    console.log("💣 WARNING! As soon as you find the hash, you should quickly make a transaction.");
    console.log("If someone else makes a transaction, the seed changes, and you have to find a hash again!");
    console.log(' ');

    // flags work only in user-friendly address form
    const collectionAddr = collection.toFriendly({
        urlSafe: true,
        bounceable: true,
    });
    // we must convert TON to nanoTON
    const amountToSend = toNano('0.05').toString();
    // BOC means Bag Of Cells here
    const preparedBodyCell = msg.toBoc().toString('base64url');

    // final method to build a payment url
    const tonDeepLink = (address: string, amount: string, body: string) => {
        return `ton://transfer/${address}?amount=${amount}&bin=${body}`;
    };

    const link = tonDeepLink(collectionAddr, amountToSend, preparedBodyCell);

    console.log('🚀 Link to receive an NFT:');
    console.log(link);

    // === Command ===
    // npm run start

    // === Output ===
    // ...
    // 💣 WARNING! As soon as you find the hash, you should quickly make a transaction.
    // If someone else makes a transaction, the seed changes, and you have to find a hash again!
    //
    // 🚀 Link to receive an NFT:
    // ton://transfer/EQDk8N7xM5D669LC2YACrseBJtDyFqwtSPCNhRWXU7kjEptX?amount=50000000&bin=te6ccsEBAQEAfAB8APNNaW5lY-5UNoAZ4vfllNOLcpONvwa-Pf4a3MvXQdPOwKdDgitTbUILQKAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAlb0_sNHu8_b_uwAXKwQ-oqAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAkGA15QI

    // smart phone 전용 변환 링크 작성하기
    // Tonkeeper 지갑에서 결제 링크를 스캔하여 거래를 완료할 수 있다.
    // npm install qrcode-terminal

    // 마지막으로 링크를 QR 코드로 인코딩하고 콘솔에 인쇄해야 한다.

    const qrcode = require('qrcode-terminal');

    qrcode.generate(link, { small: true }, function (qrcode: any) {
        console.log('🚀 Link to mine your NFT (use Tonkeeper in testnet mode):')
        console.log(qrcode);
        console.log('* If QR is still too big, please run script from the terminal. (or make the font smaller)')
    });

    // === Command ===
    // npm run start

    // === Output ===
    // ...
    // 🚀 Link to mine your NFT (use Tonkeeper in testnet mode):
    // ▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
    // █ ▄▄▄▄▄ █▄▀ ▄▀█ ▀█▀█ █ ▄  ▄▀██   ▀██▀  ▀███  ▀▄▄ ██ ▄▄▄▄▄ █
    // █ █   █ █ ▀█▄  ██ ▀▀▄▄██▄  █ █▀▀ ██▄ ▀ ██▄ ▀ ▄█▄ ██ █   █ █
    // █ █▄▄▄█ █▄▄  ▄██ ▀▄█▄▄█ ▀██ ▄▄▄ ▀█▄▀▄▄ ▄ ▀███▄█▀▄██ █▄▄▄█ █
    // █▄▄▄▄▄▄▄█▄█ █ █ ▀▄█▄█ ▀▄▀▄█ █▄█ █ █▄▀▄█ █▄▀▄█ █ █▄█▄▄▄▄▄▄▄█
    // █ ▄▄▄▀▀▄▀ ▀   █▀██▄▀ █ ▄▀▀▄▄▄▄  ▀█▄▄ ▀▀█▄▄ ▀▀██▄█ ▄█▀▄  █▄█
    // █▄██▄▄▄▄▀ ▄▀█▀▀ ▄  █ ▄▀▀██▄▄ █▄█▀▄██▄██▄█▀▄▀█▄▀▀▄█▄█▀█ █▄ █
    // ███▄█▄ ▄█  ██ ▄█▀█ ▄  ████  █▀▄▄ ▀▀█▄▄█▀▀█ █▄█ ▄██▀▀▀▀█▀▀██
    // █  ▄ █▀▄▄ █ ▀█▄▀▄ █▄█▄▀█▀ ▀▄ ▄██ ▀▀▄▀██▄▀▄  ▄▀██▄ ██ ▀▀  ██
    // █▄▀▀▄▀ ▄▀▄██▀██ ▀ ████ ▀ █▀█ ▀ ▄█  ▀▄▀▄▄▄█ ▄ ▄▀ ▀███ ██▄▀ █
    // █▄█▀▀ ▀▄█▄ ▄▄▄ █▀ ▄▀  █▄ █ ▀▄█▄▀▄▀███ █▀ ▀▀▀▄▀ ▄ ▄ ▀█ ▄█ ▀█
    // ██▄▀▄▄▀▄▄███▄ ▄█ █▄▀ █  ▀▀▄█▄▄▀▀▀█▄▄▀█▀██▄ ▀▀██▄▀  █▄▄▀█▀▀█
    // █ ▄█▀▀▀▄ ▀▄▀▀   ▄█ █ ▄▀▀██▄▄▀▀██ ▄█▀▄█▀▄▄ ▄██ █▄█  █▀█ ▄▄ █
    // █▀█▀▀▀▄▄▄▄██▄█ ▀ █ ▄▀▀███▄▀▀▀█▄▄ ▀▀█▄▄ ▀▀█▄▄ █▀▄ ██▀▄██  ▄█
    // █ █ ▀ ▄▄▄  ▄ ▀▀▄ ▄▀████▄▄▀▀ ▄▄▄ ▄█▀▄█▀ █▀▄███ ▄██ ▄▄▄   ▀▀█
    // █▀▄▀▀ █▄█ ▄ █  ▄█ █▀██▄▀▀▄█ █▄█ ▄▄ ▀▀█▀█ ▀ █ ▄ ▀▄ █▄█  ▄ ▀█
    // ██▀█▄▄ ▄  ▀ ▄ █▀██▄▄▀█▄▀█▄ ▄ ▄ ▄▀▀▄█▀▄  ▄█▀▄ ██▄▄  ▄▄▄▀▄▄▀█
    // █ ▄▀▀█ ▄█▄ █ █▄▀ █ ██▄▄▄▀▀█ █▄▀▀▀██▄ ▀▀█▄▄  ▀███▀█▄█▀█ ▄▀▀█
    // ███▀█▄▄▄▀ █▄█▀▄ ███ ▄▄▄ ▄█▀█▄███▀ █▀▄█▀▄▄▀  ▄█▀ █▀ ▄ ▄▀█▄ █
    // ██▀▀█▀▄▄▀▄███ ▄ ▀▄▄ ▀▀███▄██ █ ▄ █▀█ ▄ ▀███▄ ▀▀▄█▀ ▄▀█ ▀▄ █
    // ██▄▀ █▄▄▄▄ ▄▄█▄█▄█▀▀███▄▄▀▄▄ ▄▄▀▄█▀▄▄ ▄█▀█▄▀█▀████▀▀▀ ▀▀ ██
    // ██ ▀ ▀ ▄█▄▀█▄  ▄▀▀███▄▄▀ █▀ ▀▀ ▄▄▄ ▀▀█▄▄ ▀▀█▄▄    ▀  ▀▀ █▄█
    // █ ██▀▄█▄▀▀▀ ▀ ▀▀███ ▄▀ █ ▄█ ██▀ █▀▄█▀▄▀▀▄██   ████▄█▄▀▀█▄▀█
    // █ ▀███▄▄▄ █▀█▄▀███▄▀ █ ▄▄ ▄▄ █▀▀▀█▄█ ▀▄▄▄ █ ██▀██▀▄█ █ ▄ ▀█
    // █ ▀ ▀▀▄▄▄▀ █▄ ▀   ▄█▄▀ █▄ ▀▀ ███▀  ▄▄█ ██ █▄▄ █▄ ▀█  ▀██▀ █
    // ███████▄▄▀▀▄▀▄▄▀▀█▄  ▀▀█▄▄█ ▄▄▄ ▄█ ▄   ▀▀▀▄███▀██ ▄▄▄ ▄█▄██
    // █ ▄▄▄▄▄ ██▄▀█▄▀ █▄▄█▄▀ ▀▄ █ █▄█ ▀ ▀▄▄▀▄▄█ ▄ █▄▀▀█ █▄█ ▀ ▀██
    // █ █   █ █▀██▀▄ █▀ ▀▀█▄▄▀ █▄▄ ▄▄▄   ▀▀█▄▄ █▀█▄  ▀  ▄ ▄▄▀█ ██
    // █ █▄▄▄█ █ █▄▄▀▀▄█▄█▄▄▀ █ ▄▀▀██▄▄█▀▄█▀██▀██▀▄▄▄█▄▄▄  ▄▀ ▄█▀█
    // █▄▄▄▄▄▄▄█▄▄▄▄▄▄▄█▄▄█▄█▄▄████▄▄████▄▄▄███▄▄▄█▄█▄▄▄██▄██▄▄███
    //
    // * If QR is still too big, please run script from the terminal. (or make the font smaller)
}

main();