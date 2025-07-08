import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';

describe('AuthService', () => {
  let service: AuthService;
  let usersService: UsersService;
  let jwtService: JwtService;

  const mockUser = {
    id: 'user-id-1',
    email: 'test@example.com',
    passwordHash: 'hashedPassword',
  };

  const mockUsersService = {
    findByEmail: jest.fn(),
    validatePassword: jest.fn(),
    create: jest.fn()
  };

  const mockJwtService = {
    sign: jest.fn()
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: UsersService,
          useValue: mockUsersService
        },
        {
          provide: JwtService,
          useValue: mockJwtService
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    usersService = module.get<UsersService>(UsersService);
    jwtService = module.get<JwtService>(JwtService);

    jest.clearAllMocks();
  });

  describe('validateUser', () => {
    it('should return user data without password if validation succeeds', async () => {
      const email = 'test@example.com';
      const password = 'password123';

      mockUsersService.findByEmail.mockResolvedValue(mockUser);
      mockUsersService.validatePassword.mockResolvedValue(true);

      const result = await service.validateUser(email, password);

      expect(mockUsersService.findByEmail).toHaveBeenCalledWith(email);
      expect(mockUsersService.validatePassword).toHaveBeenCalledWith(mockUser, password);
      expect(result).toEqual({
        id: mockUser.id,
        email: mockUser.email
      });
    });

    it('should return null if user not found', async () => {
      const email = 'nonexistent@example.com';
      const password = 'password123';

      mockUsersService.findByEmail.mockResolvedValue(null);

      const result = await service.validateUser(email, password);

      expect(result).toBeNull();
    });

    it('should return null if password is invalid', async () => {
      const email = 'test@example.com';
      const password = 'wrongpassword';

      mockUsersService.findByEmail.mockResolvedValue(mockUser);
      mockUsersService.validatePassword.mockResolvedValue(false);

      const result = await service.validateUser(email, password);

      expect(result).toBeNull();
    });
  });

  describe('login', () => {
    it('should return access token and user data', async () => {
      const user = { id: 'user-id-1', email: 'test@example.com' };
      const token = 'jwt-token';

      mockJwtService.sign.mockReturnValue(token);

      const result = await service.login(user);

      expect(mockJwtService.sign).toHaveBeenCalledWith({
        email: user.email,
        sub: user.id,
      });
      expect(result).toEqual({
        access_token: token,
        user: {
          id: user.id,
          email: user.email
        }
      });
    });
  });

  describe('signup', () => {
    it('should create user and return login response', async () => {
      const email = 'test@example.com';
      const password = 'password123';
      const token = 'jwt-token';

      mockUsersService.create.mockResolvedValue(mockUser);
      mockJwtService.sign.mockReturnValue(token);

      const result = await service.signup(email, password);

      expect(mockUsersService.create).toHaveBeenCalledWith(email, password);
      expect(result).toEqual({
        access_token: token,
        user: {
          id: mockUser.id,
          email: mockUser.email
        }
      });
    });
  });
});