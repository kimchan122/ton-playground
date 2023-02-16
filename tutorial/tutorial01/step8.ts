// Step 8: Read wallet state from the chain
// 라이브 지갑에서 TON 코인 잔액을 읽어올 것이다.

// TON Access: 제한 없는 API 액세스를 무료로 제공하는 멋진 서비스
// npm install @orbs-network/ton-access

import { getHttpEndpoint } from "@orbs-network/ton-access";
import { mnemonicToWalletKey } from "ton-crypto";
import { WalletContractV4, TonClient, fromNano } from "ton";

async function main() {
    // open wallet v4
    // open wallet v4
    const mnemonic = "<YOUR_MNEMONIC>";
    const key = await mnemonicToWalletKey(mnemonic.split(" "));
    const wallet = WalletContractV4.create({ publicKey: key.publicKey, workchain: 0 }); // 지갑이 wallet v4 r2와 다른 버전인 경우, 코드를 수정해야 함.(예: WalletContractV3R2)

    // initialize ton rpc client on testnet
    const endpoint = await getHttpEndpoint({ network: "testnet" });
    const client = new TonClient({ endpoint });

    // query balance from chain
    const balance = await client.getBalance(wallet.address);
    console.log("balance: ", fromNano(balance));

    // query seqno from chain
    const walletContract = client.open(wallet);
    const seqno = await walletContract.getSeqno();
    console.log("seqno: ", seqno);
}

main();

// === Command ===
// npx ts-node step8.ts

// === Result ===
// balance:  2
// seqno:  0