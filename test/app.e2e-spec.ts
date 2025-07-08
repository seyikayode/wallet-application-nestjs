import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from './../src/app.module';

describe('Wallet Application (e2e)', () => {
  let app: INestApplication;
  let authToken: string;
  let userId: string;
  let walletId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Authentication', () => {
    it('/auth/signup (POST)', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/signup')
        .send({
          email: 'test6@example.com',
          password: 'Testpassword123@'
        })
        .expect(201);

      expect(response.body).toHaveProperty('access_token');
      expect(response.body.user).toHaveProperty('email', 'test6@example.com');
      authToken = response.body.access_token;
      userId = response.body.user.id;
    });

    it('/auth/login (POST)', async () => {
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'test6@example.com',
          password: 'Testpassword123@',
        })
        .expect(201);
    });
  });

  describe('Wallet Management', () => {
    it('/wallet (POST) - Create wallet', async () => {
      const response = await request(app.getHttpServer())
        .post('/wallet')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.balance).toBe('0.00');
      walletId = response.body.id;
    });

    it('/wallet/balance (GET) - Get wallet balance', async () => {
      const response = await request(app.getHttpServer())
        .get('/wallet/balance')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('balance');
    });

    it('/wallet/deposit (POST) - Deposit funds', async () => {
      await request(app.getHttpServer())
        .post('/wallet/deposit')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          amount: 500,
          transactionId: 'deposit-test-1',
        })
        .expect(201);
    });

    it('/wallet/withdraw (POST) - Withdraw funds', async () => {
      await request(app.getHttpServer())
        .post('/wallet/withdraw')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          amount: 200,
          transactionId: 'withdraw-test-1',
        })
        .expect(201);
    });
  });

  describe('Transaction History', () => {
    it('/transactions (GET) - Get transaction history', async () => {
      const response = await request(app.getHttpServer())
        .get('/transactions?page=1&limit=10')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('transactions');
      expect(response.body).toHaveProperty('pagination');
    });
  });
});