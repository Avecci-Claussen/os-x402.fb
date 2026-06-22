// Fractal Bitcoin wallet primitives. FB mainnet == Bitcoin mainnet address/key encoding.
import * as bitcoin from "bitcoinjs-lib";
import { BIP32Factory } from "bip32";
import * as ecc from "tiny-secp256k1";
import { ECPairFactory } from "ecpair";
import * as bip39 from "bip39";

export const FB_NETWORK = bitcoin.networks.bitcoin;
export const bip32 = BIP32Factory(ecc);
export const ECPair = ECPairFactory(ecc);

export function p2wpkh(pubkey: Uint8Array): string {
  return bitcoin.payments.p2wpkh({ pubkey: Buffer.from(pubkey), network: FB_NETWORK }).address!;
}

// Watch-only: derive the i-th receive address (account-xpub / 0 / i). Non-custodial — no private key.
export function addressFromXpub(xpub: string, i: number): string {
  return p2wpkh(bip32.fromBase58(xpub, FB_NETWORK).derive(0).derive(i).publicKey);
}

export interface MerchantHD { mnemonic: string; xpub: string; addressAt(i: number): string; }
export function merchantFromMnemonic(mnemonic: string): MerchantHD {
  const acct = bip32.fromSeed(bip39.mnemonicToSeedSync(mnemonic), FB_NETWORK).derivePath("m/84'/0'/0'");
  return { mnemonic, xpub: acct.neutered().toBase58(), addressAt: (i) => p2wpkh(acct.derive(0).derive(i).publicKey) };
}
export const newMerchant = (): MerchantHD => merchantFromMnemonic(bip39.generateMnemonic());
