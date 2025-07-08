import { Processor, Process } from '@nestjs/bull';
import { Injectable, Logger } from '@nestjs/common';
import { Job } from 'bull';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Wallet } from '../wallets/entities/wallet.entity';
import { Transaction, TransactionStatusEnum, TransactionTypeEnum } from '../transactions/entities/transaction.entity';
import { CacheService } from '../cache/cache.service';

@Processor('wallet-transactions')
@Injectable()
export class TransactionProcessor {
  private readonly logger = new Logger(TransactionProcessor.name);

  constructor(
    @InjectRepository(Wallet)
    private walletsRepository: Repository<Wallet>,
    @InjectRepository(Transaction)
    private transactionsRepository: Repository<Transaction>,
    private cacheService: CacheService,
    private dataSource: DataSource,
  ) {}

  @Process('deposit')
  async handleDeposit(job: Job) {
    const { walletId, amount, transactionId } = job.data;
    this.logger.log(`Processing deposit: ${transactionId}`);

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const existingTransaction = await queryRunner.manager.findOne(Transaction, {
            where: { transactionId }
      });
      if (existingTransaction) {
        this.logger.log(`Duplicate transaction detected: ${transactionId}`);
        return existingTransaction;
      };

      const wallet = await queryRunner.manager.findOne(Wallet, {
        where: { id: walletId },
        lock: { mode: 'pessimistic_write' }
      });

      if (!wallet) {
        throw new Error('Wallet not found');
      };

      wallet.balance = Number(wallet.balance) + Number(amount);
      await queryRunner.manager.save(wallet);

      const transaction = queryRunner.manager.create(Transaction, {
        walletId: wallet.id,
        type: TransactionTypeEnum.DEPOSIT,
        amount: Number(amount),
        transactionId,
        status: TransactionStatusEnum.COMPLETED,
        metadata: { jobId: job.id }
      });

      const savedTransaction = await queryRunner.manager.save(transaction);
      await queryRunner.commitTransaction();
      await this.cacheService.invalidateWalletBalance(wallet.id);

      this.logger.log(`Deposit completed: ${transactionId}`);
      return savedTransaction;

    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error(`Deposit failed: ${transactionId}`, error);
      
      try {
        const failedTransaction = this.transactionsRepository.create({
          walletId,
          type: TransactionTypeEnum.DEPOSIT,
          amount: Number(amount),
          transactionId,
          status: TransactionStatusEnum.FAILED,
          metadata: { error: error.message, jobId: job.id }
        });
        await this.transactionsRepository.save(failedTransaction);
      } catch (recordError) {
        this.logger.error('Failed to record failed transaction', recordError);
      }

      throw error;
    } finally {
      await queryRunner.release();
    }
  };


  @Process('withdraw')
  async handleWithdrawal(job: Job) {
    const { walletId, amount, transactionId } = job.data;
    this.logger.log(`Processing withdrawal: ${transactionId}`);

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const existingTransaction = await queryRunner.manager.findOne(Transaction, {
        where: { transactionId },
      });
      if (existingTransaction) {
        this.logger.log(`Duplicate transaction detected: ${transactionId}`);
        return existingTransaction;
      };

      const wallet = await queryRunner.manager.findOne(Wallet, {
        where: { id: walletId },
        lock: { mode: 'pessimistic_write' }
      });

      if (!wallet) {
        throw new Error('Wallet not found');
      };

      if (Number(wallet.balance) < Number(amount)) {
        throw new Error('Insufficient balance');
      }

      wallet.balance = Number(wallet.balance) - Number(amount);
      await queryRunner.manager.save(wallet);

      const transaction = queryRunner.manager.create(Transaction, {
        walletId: wallet.id,
        type: TransactionTypeEnum.WITHDRAWAL,
        amount: Number(amount),
        transactionId,
        status: TransactionStatusEnum.COMPLETED,
        metadata: { jobId: job.id }
      });

      const savedTransaction = await queryRunner.manager.save(transaction);
      await queryRunner.commitTransaction();
      await this.cacheService.invalidateWalletBalance(wallet.id);

      this.logger.log(`Withdrawal completed: ${transactionId}`);
      return savedTransaction;

    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error(`Withdrawal failed: ${transactionId}`, error);
      
      try {
        const failedTransaction = this.transactionsRepository.create({
          walletId,
          type: TransactionTypeEnum.WITHDRAWAL,
          amount: Number(amount),
          transactionId,
          status: TransactionStatusEnum.FAILED,
          metadata: { error: error.message, jobId: job.id }
        });
        await this.transactionsRepository.save(failedTransaction);
      } catch (recordError) {
        this.logger.error('Failed to record failed transaction', recordError);
      }

      throw error;
    } finally {
      await queryRunner.release();
    }
  };


  @Process('transfer')
  async handleTransfer(job: Job) {
    const { fromWalletId, toWalletId, amount, transactionId } = job.data;
    this.logger.log(`Processing transfer: ${transactionId}`);

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const existingTransaction = await queryRunner.manager.findOne(Transaction, {
        where: { transactionId }
      });
      if (existingTransaction) {
         this.logger.log(`Duplicate transaction detected: ${transactionId}`);
        return existingTransaction;
      }

      const sortedWalletIds = [fromWalletId, toWalletId].sort();
      const wallets = await queryRunner.manager.find(Wallet, {
        where: sortedWalletIds.map(id => ({ id })),
        lock: { mode: 'pessimistic_write' }
      });

      const fromWallet = wallets.find(wallet => wallet.id === fromWalletId);
      const toWallet = wallets.find(wallet => wallet.id === toWalletId);

      if (!fromWallet || !toWallet) {
        throw new Error('One or both wallets not found');
      };

      if (Number(fromWallet.balance) < Number(amount)) {
        throw new Error('Insufficient balance');
      };

      fromWallet.balance = Number(fromWallet.balance) - Number(amount);
      toWallet.balance = Number(toWallet.balance) + Number(amount);

      await queryRunner.manager.save([fromWallet, toWallet]);

      const outTransaction = queryRunner.manager.create(Transaction, {
        walletId: fromWallet.id,
        type: TransactionTypeEnum.DEBIT,
        amount: Number(amount),
        transactionId,
        toWalletId: toWallet.id,
        status: TransactionStatusEnum.COMPLETED,
        metadata: { jobId: job.id }
      });

      const inTransaction = queryRunner.manager.create(Transaction, {
        walletId: toWallet.id,
        type: TransactionTypeEnum.CREDIT,
        amount: Number(amount),
        transactionId: `${transactionId}_CREDIT`,
        status: TransactionStatusEnum.COMPLETED,
        metadata: { jobId: job.id, originalTransactionId: transactionId }
      });

      const savedTransactions = await queryRunner.manager.save([outTransaction, inTransaction]);
      await queryRunner.commitTransaction();

      await Promise.all([
        this.cacheService.invalidateWalletBalance(fromWallet.id),
        this.cacheService.invalidateWalletBalance(toWallet.id),
      ]);

      this.logger.log(`Transfer completed: ${transactionId}`);
      return savedTransactions;

    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error(`Transfer failed: ${transactionId}`, error);
      
      try {
        const failedOutTransaction = this.transactionsRepository.create({
          walletId: fromWalletId,
          type: TransactionTypeEnum.DEBIT,
          amount: Number(amount),
          transactionId,
          toWalletId: toWalletId,
          status: TransactionStatusEnum.FAILED,
          metadata: { error: error.message, jobId: job.id }
        });
        await this.transactionsRepository.save(failedOutTransaction);
      } catch (recordError) {
        this.logger.error('Failed to record failed transaction', recordError);
      }

      throw error;
    } finally {
      await queryRunner.release();
    }
  };
};