// Step 7: Get the wallet address programmatically

import dotenv from "dotenv";
dotenv.config({ path: "./.env" });

import { mnemonicToWalletKey } from "ton-crypto";
import { WalletContractV4 } from "ton";

async function main() {
    // open wallet v4
    const mnemonic = process.env.MNEMONIC;
    const key = await mnemonicToWalletKey(mnemonic!.split(" "));
    const wallet = WalletContractV4.create({ publicKey: key.publicKey, workchain: 0 }); // 지갑이 wallet v4 r2와 다른 버전인 경우, 코드를 수정해야 함.(예: WalletContractV3R2)

    // print wallet address
    console.log(wallet.address.toString({ testOnly: true }));

    // print wallet workchain
    console.log("workchain: ", wallet.address.workChain);
}

main();

// === Command ===
// npx ts-node step7.ts

// === Result ===
// kQDPF78sppxblJxt-DXx7_DW5l66Dp52BTocEVqbahBaBbit
// workchain:  0

// workchain?
// TON은 workchain이라는 여러 병렬 블록체인 인스턴스를 지원합니다.
// 현재 두 개의 workchain만 존재
// workchain 0: all of regular contracts에서 사용
// workchain -1(the masterchain): validators에 의해 사용