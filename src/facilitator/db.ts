import pg from "pg";
import { cfg } from "../config.js";

export const pool = new pg.Pool({ connectionString: cfg.databaseUrl });

export async function initDb() {
  await pool.query(`
    create extension if not exists pgcrypto;
    create table if not exists merchants (
      id uuid primary key default gen_random_uuid(),
      address text unique not null,
      created_at timestamptz default now()
    );
    create table if not exists auth_challenges (
      address text not null,
      message text not null,
      expires_at timestamptz not null
    );
    create table if not exists services (
      id uuid primary key default gen_random_uuid(),
      merchant_id uuid references merchants(id) on delete cascade,
      name text not null,
      xpub text not null,
      deriv_index int not null default 0,
      fee_bps int not null default 1000,
      api_key_hash text unique not null,   -- only the SHA-256 hash is stored, never the raw key
      api_key_prefix text not null,        -- first chars, for display only (e.g. ssk_b946b248)
      created_at timestamptz default now()
    );
    create table if not exists payments (
      id uuid primary key default gen_random_uuid(),
      service_id uuid references services(id) on delete cascade,
      nonce text unique not null,
      resource text not null,
      pay_to text not null,
      amount bigint not null,
      fee_amount bigint not null,
      fee_address text not null,
      status text not null default 'pending',
      txid text,
      payer text,                          -- payer address, when known (for unique-buyer analytics)
      created_at timestamptz default now(),
      paid_at timestamptz
    );
    alter table payments add column if not exists payer text;
    alter table payments add column if not exists binding text;
    create unique index if not exists payments_txid_unique on payments(txid) where txid is not null and status='paid';
  `);
}
