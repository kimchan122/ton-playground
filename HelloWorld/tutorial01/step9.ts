// Step 9: Send transfer transaction to the chain
// 이전 작업은 읽기 전용이었으며, 지갑의 private key가 없더라도 일반적으로 가능해야 한다.
// 이제 지갑에서 일부 TON을 전송할 것이다. 권한이 필요한 쓰기 작업이므로, private key가 필요하다.

// TON Access: 제한 없는 API 액세스를 무료로 제공하는 멋진 서비스
// npm install @orbs-network/ton-access

import dotenv from "dotenv";
dotenv.config({ path: "./.env" });

import { getHttpEndpoint } from "@orbs-network/ton-access";
import { mnemonicToWalletKey } from "ton-crypto";
import { TonClient, WalletContractV4, internal } from "ton";

async function main() {
  // open wallet v4 (notice the correct wallet version here)
  const mnemonic = process.env.MNEMONIC;
  const key = await mnemonicToWalletKey(mnemonic!.split(" "));
  const wallet = WalletContractV4.create({ publicKey: key.publicKey, workchain: 0 });

  // initialize ton rpc client on testnet
  const endpoint = await getHttpEndpoint({ network: "testnet" });
  const client = new TonClient({ endpoint });

  // make sure wallet is deployed
  if (!await client.isContractDeployed(wallet.address)) {
    return console.log("wallet is not deployed");
  }

  // send 0.001 TON to EQDrjaLahLkMB-hMCmkzOyBuHJ139ZUYmPHu6RRBKnbdLIYI
  const walletContract = client.open(wallet);
  const seqno = await walletContract.getSeqno();
  await walletContract.sendTransfer({
    secretKey: key.secretKey,
    seqno: seqno,
    messages: [
      internal({
        to: "EQDrjaLahLkMB-hMCmkzOyBuHJ139ZUYmPHu6RRBKnbdLIYI",
        value: "0.001", // 0.001 TON
        body: "Hello", // optional comment
        bounce: false,
      })
    ]
  });

  // wait until confirmed
  let currentSeqno = seqno;
  while (currentSeqno == seqno) {
    console.log("waiting for transaction to confirm...");
    await sleep(1500);
    currentSeqno = await walletContract.getSeqno();
  }
  console.log("transaction confirmed!");
}

main();

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// === Preset ===
// wallet이 initialized된 상태이어야 한다.
// Tonkeeper의 경우에는 1회의 트랜잭션(전송)을 일으키니, 우선적으로 wallet initialized가 나타난 후에 작업이 실행되었다.

// === Command ===
// npx ts-node step9.ts

// === Result ===
// waiting for transaction to confirm...
// transaction confirmed!