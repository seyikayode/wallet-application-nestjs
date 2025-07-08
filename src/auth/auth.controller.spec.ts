import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

describe('AuthController', () => {
  let controller: AuthController;
  let authService: AuthService;

  const mockAuthService = {
    signup: jest.fn(),
    login: jest.fn(),
  };

  const mockUser = {
    id: 'user-id-1',
    email: 'test@example.com'
  };

  const mockAuthResponse = {
    access_token: 'jwt-token',
    user: mockUser
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: mockAuthService,
        },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    authService = module.get<AuthService>(AuthService);

    jest.clearAllMocks();
  });

  describe('signup', () => {
    it('should register a new user successfully', async () => {
      const signupDto = {
        email: 'test@example.com',
        password: 'password123',
      };

      mockAuthService.signup.mockResolvedValue(mockAuthResponse);
      const result = await controller.signup(signupDto);
      expect(authService.signup).toHaveBeenCalledWith(signupDto.email, signupDto.password);
      expect(result).toEqual(mockAuthResponse);
    });
  });

  describe('login', () => {
    it('should login user successfully', async () => {
      const req = { user: mockUser }
      mockAuthService.login.mockResolvedValue(mockAuthResponse);
      const result = await controller.login(req);

      expect(authService.login).toHaveBeenCalledWith(mockUser);
      expect(result).toEqual(mockAuthResponse);
    });
  });

  describe('getProfile', () => {
    it('should return user profile', () => {
      const req = { user: mockUser };
      const result = controller.getProfile(req);
      expect(result).toEqual(mockUser);
    });
  });
});