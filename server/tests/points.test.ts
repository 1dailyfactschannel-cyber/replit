import { describe, it, expect, beforeEach } from 'vitest';
import { PostgresStorage } from '../postgres-storage';
import * as schema from '@shared/schema';

describe('Points System', () => {
  let storage: PostgresStorage;

  beforeEach(async () => {
    storage = new PostgresStorage();
    // Clean up test data
    await storage.db.delete(schema.userPointsTransactions);
    await storage.db.delete(schema.shopPurchases);
  });

  describe('Points Settings', () => {
    it('should create points setting', async () => {
      const setting = await storage.createPointsSetting({
        statusName: 'Test Status',
        pointsAmount: 5,
        isActive: true
      });

      expect(setting.statusName).toBe('Test Status');
      expect(setting.pointsAmount).toBe(5);
      expect(setting.isActive).toBe(true);
    });

    it('should get points setting by status name', async () => {
      await storage.createPointsSetting({
        statusName: 'Test Status',
        pointsAmount: 5,
        isActive: true
      });

      const found = await storage.getPointsSetting('Test Status');
      expect(found).toBeDefined();
      expect(found?.pointsAmount).toBe(5);
    });

    it('should update points setting', async () => {
      const created = await storage.createPointsSetting({
        statusName: 'Test Status',
        pointsAmount: 5,
        isActive: true
      });

      const updated = await storage.updatePointsSetting(created.id, {
        pointsAmount: 10
      });

      expect(updated.pointsAmount).toBe(10);
    });

    it('should delete points setting', async () => {
      const created = await storage.createPointsSetting({
        statusName: 'Test Status',
        pointsAmount: 5,
        isActive: true
      });

      await storage.deletePointsSetting(created.id);
      const found = await storage.getPointsSetting('Test Status');
      expect(found).toBeUndefined();
    });
  });

  describe('User Points', () => {
    it('should update user points and calculate level', async () => {
      // Create test user
      const user = await storage.createUser({
        username: 'testuser',
        email: 'test@test.com',
        password: 'password'
      });

      // Award points
      await storage.updateUserPoints(user.id, 1500);

      const points = await storage.getUserPoints(user.id);
      expect(points.balance).toBe(1500);
      expect(points.totalEarned).toBe(1500);
      expect(points.level).toBe(1); // 1500 / 1000 = 1
    });

    it('should not go below zero balance', async () => {
      const user = await storage.createUser({
        username: 'testuser2',
        email: 'test2@test.com',
        password: 'password'
      });

      // Try to spend more than balance
      await storage.updateUserPoints(user.id, 100);
      await storage.updateUserPoints(user.id, -150);

      const points = await storage.getUserPoints(user.id);
      expect(points.balance).toBe(0);
    });

    it('should calculate level correctly', async () => {
      const user = await storage.createUser({
        username: 'testuser3',
        email: 'test3@test.com',
        password: 'password'
      });

      // Level 0: 0-999
      await storage.updateUserPoints(user.id, 500);
      let points = await storage.getUserPoints(user.id);
      expect(points.level).toBe(0);

      // Level 1: 1000-1999
      await storage.updateUserPoints(user.id, 600);
      points = await storage.getUserPoints(user.id);
      expect(points.level).toBe(1);

      // Level 2: 2000-2999
      await storage.updateUserPoints(user.id, 1000);
      points = await storage.getUserPoints(user.id);
      expect(points.level).toBe(2);
    });
  });

  describe('Transactions', () => {
    it('should create earned transaction', async () => {
      const user = await storage.createUser({
        username: 'testuser4',
        email: 'test4@test.com',
        password: 'password'
      });

      const transaction = await storage.createTransaction({
        userId: user.id,
        type: 'earned',
        amount: 10,
        description: 'Test earning'
      });

      expect(transaction.type).toBe('earned');
      expect(transaction.amount).toBe(10);
    });

    it('should prevent duplicate transactions for same task and status', async () => {
      const user = await storage.createUser({
        username: 'testuser5',
        email: 'test5@test.com',
        password: 'password'
      });

      const task = await storage.createTask({
        title: 'Test Task',
        status: 'В работе',
        boardId: 'test-board',
        reporterId: user.id
      });

      // First transaction should succeed
      await storage.createTransaction({
        userId: user.id,
        taskId: task.id,
        statusName: 'В работе',
        type: 'earned',
        amount: 1
      });

      // Second transaction should fail (duplicate)
      await expect(storage.createTransaction({
        userId: user.id,
        taskId: task.id,
        statusName: 'В работе',
        type: 'earned',
        amount: 1
      })).rejects.toThrow();
    });

    it('should get transaction by task, status and type', async () => {
      const user = await storage.createUser({
        username: 'testuser6',
        email: 'test6@test.com',
        password: 'password'
      });

      const task = await storage.createTask({
        title: 'Test Task',
        status: 'Готово',
        boardId: 'test-board',
        reporterId: user.id
      });

      await storage.createTransaction({
        userId: user.id,
        taskId: task.id,
        statusName: 'Готово',
        type: 'earned',
        amount: 1
      });

      const found = await storage.getTransaction(task.id, 'Готово', 'earned');
      expect(found).toBeDefined();
      expect(found?.amount).toBe(1);
    });

    it('should get user transactions with pagination', async () => {
      const user = await storage.createUser({
        username: 'testuser7',
        email: 'test7@test.com',
        password: 'password'
      });

      // Create multiple transactions
      for (let i = 0; i < 5; i++) {
        await storage.createTransaction({
          userId: user.id,
          type: 'earned',
          amount: 1,
          description: `Transaction ${i}`
        });
      }

      const transactions = await storage.getUserTransactions(user.id, { limit: 3 });
      expect(transactions.length).toBe(3);
    });
  });

  describe('Shop', () => {
    it('should create shop item', async () => {
      const item = await storage.createShopItem({
        name: 'Test Item',
        description: 'Test Description',
        cost: 100,
        category: 'Test',
        stock: 10
      });

      expect(item.name).toBe('Test Item');
      expect(item.cost).toBe(100);
    });

    it('should create purchase', async () => {
      const user = await storage.createUser({
        username: 'testuser8',
        email: 'test8@test.com',
        password: 'password'
      });

      const item = await storage.createShopItem({
        name: 'Test Item',
        cost: 100,
        stock: 10
      });

      // Award some points first
      await storage.updateUserPoints(user.id, 500);

      const purchase = await storage.createPurchase({
        userId: user.id,
        itemId: item.id,
        quantity: 2,
        totalCost: 200
      });

      expect(purchase.totalCost).toBe(200);
      expect(purchase.status).toBe('pending');
    });

    it('should get user purchases', async () => {
      const user = await storage.createUser({
        username: 'testuser9',
        email: 'test9@test.com',
        password: 'password'
      });

      const item = await storage.createShopItem({
        name: 'Test Item',
        cost: 100,
        stock: 10
      });

      await storage.updateUserPoints(user.id, 500);
      await storage.createPurchase({
        userId: user.id,
        itemId: item.id,
        quantity: 1,
        totalCost: 100
      });

      const purchases = await storage.getUserPurchases(user.id);
      expect(purchases.length).toBe(1);
      expect(purchases[0].totalCost).toBe(100);
    });
  });

  describe('Integration', () => {
    it('should handle complete points flow', async () => {
      // Create user
      const user = await storage.createUser({
        username: 'integrationuser',
        email: 'integration@test.com',
        password: 'password'
      });

      // Create points setting
      await storage.createPointsSetting({
        statusName: 'Готово',
        pointsAmount: 10,
        isActive: true
      });

      // Create task
      const task = await storage.createTask({
        title: 'Integration Test Task',
        status: 'В планах',
        boardId: 'test-board',
        reporterId: user.id,
        assigneeId: user.id
      });

      // Award points for status change
      await storage.createTransaction({
        userId: user.id,
        taskId: task.id,
        statusName: 'Готово',
        type: 'earned',
        amount: 10
      });

      await storage.updateUserPoints(user.id, 10);

      // Verify balance
      let points = await storage.getUserPoints(user.id);
      expect(points.balance).toBe(10);
      expect(points.totalEarned).toBe(10);

      // Create shop item
      const item = await storage.createShopItem({
        name: 'Integration Item',
        cost: 5,
        stock: 10
      });

      // Make purchase
      await storage.createPurchase({
        userId: user.id,
        itemId: item.id,
        quantity: 1,
        totalCost: 5
      });

      await storage.createTransaction({
        userId: user.id,
        type: 'spent',
        amount: -5,
        description: 'Purchase'
      });

      await storage.updateUserPoints(user.id, -5);

      // Verify final balance
      points = await storage.getUserPoints(user.id);
      expect(points.balance).toBe(5);
      expect(points.totalEarned).toBe(10);
      expect(points.totalSpent).toBe(5);
    });
  });
});
