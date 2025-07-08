import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { UsersService } from './users.service';
import { User } from './entities/user.entity';
import * as bcrypt from 'bcryptjs';

jest.mock('bcryptjs');

describe('UsersService', () => {
  let service: UsersService;

  const mockUser = {
    id: 'user-id-1',
    email: 'test2@example.com',
    passwordHash: 'hashedPassword',
    createdAt: new Date(),
    updatedAt: new Date()
  };

  const mockRepository = {
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn()
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: getRepositoryToken(User),
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);

    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a new user with success', async () => {
      const email = 'test2@example.com';
      const password = 'Password123@';
      const hashedPassword = 'hashedPassword';

      mockRepository.findOne.mockResolvedValue(null);
      (bcrypt.hash as jest.Mock).mockResolvedValue(hashedPassword);
      mockRepository.create.mockReturnValue({ email, passwordHash: hashedPassword });
      mockRepository.save.mockResolvedValue(mockUser);

      const result = await service.create(email, password);

      expect(mockRepository.findOne).toHaveBeenCalledWith({ where: { email } });
      expect(bcrypt.hash).toHaveBeenCalledWith(password, 12);
      expect(mockRepository.create).toHaveBeenCalledWith({
        email,
        passwordHash: hashedPassword
      });
      expect(mockRepository.save).toHaveBeenCalled();
      expect(result).toEqual(mockUser);
    });

    it('should throw ConflictException if user already exists', async () => {
      const email = 'test2@example.com';
      const password = 'Password123@';

      mockRepository.findOne.mockResolvedValue(mockUser);

      await expect(service.create(email, password)).rejects.toThrow(
        ConflictException,
      );
      expect(mockRepository.findOne).toHaveBeenCalledWith({ where: { email } });
      expect(mockRepository.create).not.toHaveBeenCalled();
    });
  });

  describe('findByEmail', () => {
    it('should return user if found', async () => {
      const email = 'test2@example.com';
      mockRepository.findOne.mockResolvedValue(mockUser);

      const result = await service.findByEmail(email);

      expect(mockRepository.findOne).toHaveBeenCalledWith({ where: { email } });
      expect(result).toEqual(mockUser);
    });

    it('should return null if user not found', async () => {
      const email = 'nonuser@example.com';
      mockRepository.findOne.mockResolvedValue(null);

      const result = await service.findByEmail(email);

      expect(result).toBeNull();
    });
  });

  describe('findById', () => {
    it('should return user if found', async () => {
      const id = 'user-id-1';
      mockRepository.findOne.mockResolvedValue(mockUser);

      const result = await service.findById(id);

      expect(mockRepository.findOne).toHaveBeenCalledWith({ where: { id } });
      expect(result).toEqual(mockUser);
    });

    it('should throw NotFoundException if user not found', async () => {
      const id = 'nonexistent-id';
      mockRepository.findOne.mockResolvedValue(null);

      await expect(service.findById(id)).rejects.toThrow(NotFoundException);
    });
  });

  describe('validatePassword', () => {
    it('should return true for valid password', async () => {
      const password = 'Password123@';
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const result = await service.validatePassword(mockUser as User, password);

      expect(bcrypt.compare).toHaveBeenCalledWith(password, mockUser.passwordHash);
      expect(result).toBe(true);
    });

    it('should return false for invalid password', async () => {
      const password = 'wrongpassword';
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      const result = await service.validatePassword(mockUser as User, password);

      expect(result).toBe(false);
    });
  });
});