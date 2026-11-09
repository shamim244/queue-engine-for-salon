import { isMySqlConnected, getDb } from '../mysql';
import type { Wallet, WalletTransaction, WalletType } from '../../engine/types';
import { memoryStore, toMySqlDatetime } from './store';

function mapRowToWallet(r: any): Wallet {
  return {
    id: r.id,
    walletType: r.wallet_type,
    ownerOrgId: r.owner_org_id || null,
    consumerPhone: r.consumer_phone || null,
    salonId: r.salon_id || null,
    balance: Number(r.balance),
    currency: r.currency || 'INR',
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

function mapRowToTransaction(r: any): WalletTransaction {
  return {
    id: r.id,
    walletId: r.wallet_id,
    walletType: r.wallet_type,
    ownerOrgId: r.owner_org_id || null,
    consumerPhone: r.consumer_phone || null,
    salonId: r.salon_id || null,
    type: r.type,
    amount: Number(r.amount),
    balanceAfter: Number(r.balance_after),
    reason: r.reason,
    referenceId: r.reference_id || null,
    createdAt: r.created_at,
  };
}

export const walletRepo = {
  async getOrCreateWallet(
    walletType: WalletType,
    identifier: string,
    salonId?: string | null
  ): Promise<Wallet> {
    const cleanId = identifier.trim();

    // 1. Check in MySQL if connected
    if (isMySqlConnected) {
      try {
        const db = getDb();
        let rows: any[] = [];
        if (walletType === 'OWNER') {
          [rows] = await db.query<any[]>(
            'SELECT * FROM wallets WHERE wallet_type = "OWNER" AND owner_org_id = ? LIMIT 1',
            [cleanId]
          );
        } else {
          [rows] = await db.query<any[]>(
            'SELECT * FROM wallets WHERE wallet_type = "CONSUMER" AND salon_id = ? AND consumer_phone = ? LIMIT 1',
            [salonId || null, cleanId]
          );
        }

        if (rows && rows.length > 0) {
          const w = mapRowToWallet(rows[0]);
          memoryStore.wallets.set(w.id, w);
          return w;
        }

        // Create new wallet
        const newId = `w_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
        await db.query(
          `INSERT INTO wallets (id, wallet_type, owner_org_id, consumer_phone, salon_id, balance, currency)
           VALUES (?, ?, ?, ?, ?, 0.00, 'INR')`,
          [
            newId,
            walletType,
            walletType === 'OWNER' ? cleanId : null,
            walletType === 'CONSUMER' ? cleanId : null,
            walletType === 'CONSUMER' ? salonId || null : null,
          ]
        );

        const newWallet: Wallet = {
          id: newId,
          walletType,
          ownerOrgId: walletType === 'OWNER' ? cleanId : null,
          consumerPhone: walletType === 'CONSUMER' ? cleanId : null,
          salonId: walletType === 'CONSUMER' ? salonId || null : null,
          balance: 0,
          currency: 'INR',
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        memoryStore.wallets.set(newWallet.id, newWallet);
        return newWallet;
      } catch (err: any) {
        console.warn(`[walletRepo.getOrCreateWallet] MySQL error: ${err.message}`);
      }
    }

    // Fallback: memoryStore
    for (const w of memoryStore.wallets.values()) {
      if (walletType === 'OWNER' && w.walletType === 'OWNER' && w.ownerOrgId === cleanId) {
        return w;
      }
      if (
        walletType === 'CONSUMER' &&
        w.walletType === 'CONSUMER' &&
        w.consumerPhone === cleanId &&
        (!salonId || w.salonId === salonId)
      ) {
        return w;
      }
    }

    const newId = `w_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const newWallet: Wallet = {
      id: newId,
      walletType,
      ownerOrgId: walletType === 'OWNER' ? cleanId : null,
      consumerPhone: walletType === 'CONSUMER' ? cleanId : null,
      salonId: walletType === 'CONSUMER' ? salonId || null : null,
      balance: 0,
      currency: 'INR',
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    memoryStore.wallets.set(newWallet.id, newWallet);
    return newWallet;
  },

  async creditWallet(
    walletId: string,
    amount: number,
    reason: string,
    referenceId?: string | null
  ): Promise<{ wallet: Wallet; transaction: WalletTransaction }> {
    if (amount <= 0) {
      throw new Error('Credit amount must be greater than zero.');
    }

    let wallet = memoryStore.wallets.get(walletId);

    if (isMySqlConnected) {
      try {
        const db = getDb();
        const [rows] = await db.query<any[]>('SELECT * FROM wallets WHERE id = ? FOR UPDATE', [
          walletId,
        ]);
        if (rows && rows.length > 0) {
          wallet = mapRowToWallet(rows[0]);
        }
      } catch (err: any) {
        console.warn(`[walletRepo.creditWallet] MySQL lock error: ${err.message}`);
      }
    }

    if (!wallet) {
      throw new Error(`Wallet not found: ${walletId}`);
    }

    const balanceAfter = Math.round((wallet.balance + amount) * 100) / 100;
    wallet.balance = balanceAfter;
    wallet.updatedAt = new Date();

    const txId = `tx_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const tx: WalletTransaction = {
      id: txId,
      walletId,
      walletType: wallet.walletType,
      ownerOrgId: wallet.ownerOrgId || null,
      consumerPhone: wallet.consumerPhone || null,
      salonId: wallet.salonId || null,
      type: 'CREDIT',
      amount,
      balanceAfter,
      reason,
      referenceId: referenceId || null,
      createdAt: new Date(),
    };

    memoryStore.wallets.set(walletId, wallet);
    memoryStore.walletTransactions.set(tx.id, tx);

    if (isMySqlConnected) {
      try {
        const db = getDb();
        await db.query('UPDATE wallets SET balance = ?, updated_at = NOW() WHERE id = ?', [
          balanceAfter,
          walletId,
        ]);
        await db.query(
          `INSERT INTO wallet_transactions (id, wallet_id, wallet_type, owner_org_id, consumer_phone, salon_id, type, amount, balance_after, reason, reference_id)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            tx.id,
            tx.walletId,
            tx.walletType,
            tx.ownerOrgId,
            tx.consumerPhone,
            tx.salonId,
            tx.type,
            tx.amount,
            tx.balanceAfter,
            tx.reason,
            tx.referenceId,
          ]
        );
      } catch (err: any) {
        console.warn(`[walletRepo.creditWallet] MySQL persist error: ${err.message}`);
      }
    }

    return { wallet, transaction: tx };
  },

  async debitWallet(
    walletId: string,
    amount: number,
    reason: string,
    referenceId?: string | null
  ): Promise<{ wallet: Wallet; transaction: WalletTransaction }> {
    if (amount <= 0) {
      throw new Error('Debit amount must be greater than zero.');
    }

    let wallet = memoryStore.wallets.get(walletId);

    if (isMySqlConnected) {
      try {
        const db = getDb();
        const [rows] = await db.query<any[]>('SELECT * FROM wallets WHERE id = ? FOR UPDATE', [
          walletId,
        ]);
        if (rows && rows.length > 0) {
          wallet = mapRowToWallet(rows[0]);
        }
      } catch (err: any) {
        console.warn(`[walletRepo.debitWallet] MySQL lock error: ${err.message}`);
      }
    }

    if (!wallet) {
      throw new Error(`Wallet not found: ${walletId}`);
    }

    // Anti-overdraft check (Review Focus #1)
    if (wallet.balance < amount) {
      throw new Error(
        `Insufficient wallet balance. Available: ₹${wallet.balance.toFixed(2)}, Requested: ₹${amount.toFixed(2)}.`
      );
    }

    const balanceAfter = Math.round((wallet.balance - amount) * 100) / 100;
    wallet.balance = balanceAfter;
    wallet.updatedAt = new Date();

    const txId = `tx_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const tx: WalletTransaction = {
      id: txId,
      walletId,
      walletType: wallet.walletType,
      ownerOrgId: wallet.ownerOrgId || null,
      consumerPhone: wallet.consumerPhone || null,
      salonId: wallet.salonId || null,
      type: 'DEBIT',
      amount,
      balanceAfter,
      reason,
      referenceId: referenceId || null,
      createdAt: new Date(),
    };

    memoryStore.wallets.set(walletId, wallet);
    memoryStore.walletTransactions.set(tx.id, tx);

    if (isMySqlConnected) {
      try {
        const db = getDb();
        await db.query('UPDATE wallets SET balance = ?, updated_at = NOW() WHERE id = ?', [
          balanceAfter,
          walletId,
        ]);
        await db.query(
          `INSERT INTO wallet_transactions (id, wallet_id, wallet_type, owner_org_id, consumer_phone, salon_id, type, amount, balance_after, reason, reference_id)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            tx.id,
            tx.walletId,
            tx.walletType,
            tx.ownerOrgId,
            tx.consumerPhone,
            tx.salonId,
            tx.type,
            tx.amount,
            tx.balanceAfter,
            tx.reason,
            tx.referenceId,
          ]
        );
      } catch (err: any) {
        console.warn(`[walletRepo.debitWallet] MySQL persist error: ${err.message}`);
      }
    }

    return { wallet, transaction: tx };
  },

  async getPassbook(walletId: string, limit: number = 50): Promise<WalletTransaction[]> {
    if (isMySqlConnected) {
      try {
        const db = getDb();
        const [rows] = await db.query<any[]>(
          'SELECT * FROM wallet_transactions WHERE wallet_id = ? ORDER BY created_at DESC LIMIT ?',
          [walletId, limit]
        );
        if (rows) {
          return rows.map((r) => mapRowToTransaction(r));
        }
      } catch (err: any) {
        console.warn(`[walletRepo.getPassbook] MySQL error: ${err.message}`);
      }
    }

    return Array.from(memoryStore.walletTransactions.values())
      .filter((tx) => tx.walletId === walletId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, limit);
  },
};
