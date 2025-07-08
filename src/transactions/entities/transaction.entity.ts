import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, Index } from 'typeorm';
import { Wallet } from '../../wallets/entities/wallet.entity';

export enum TransactionTypeEnum {
  DEPOSIT = 'DEPOSIT',
  WITHDRAWAL = 'WITHDRAWAL',
  DEBIT = 'DEBIT',
  CREDIT = 'CREDIT'
}

export enum TransactionStatusEnum {
  PENDING = 'PENDING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED'
}

@Entity('transactions')
@Index(['walletId', 'createdAt'])
@Index(['transactionId'])
export class Transaction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'wallet_id' })
  @Index()
  walletId: string;

  @Column({ type: 'enum', enum: TransactionTypeEnum })
  type: TransactionTypeEnum;

  @Column('decimal', { precision: 19, scale: 2 })
  amount: number;

  @Column({ name: 'transaction_id', unique: true })
  transactionId: string;

  @Column({ name: 'to_wallet_id', nullable: true })
  toWalletId: string;

  @Column({ type: 'enum', enum: TransactionStatusEnum, default: TransactionStatusEnum.PENDING })
  status: TransactionStatusEnum;

  @Column('jsonb', { nullable: true })
  metadata?: any;

  @ManyToOne(() => Wallet, wallet => wallet.transactions)
  @JoinColumn({ name: 'wallet_id' })
  wallet: Wallet;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
};