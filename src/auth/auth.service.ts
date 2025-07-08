import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService
  ) {}

  async validateUser(email: string, password: string): Promise<any> {
    const user = await this.usersService.findByEmail(email);
    if (user && await this.usersService.validatePassword(user, password)) {
      const { passwordHash, ...result } = user;
      return result;
    };
    return null;
  };

  async login(user: any) {
    const payload = { email: user.email, sub: user.id };
    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: user.id,
        email: user.email
      }
    };
  };

  async signup(email: string, password: string) {
    const user = await this.usersService.create(email, password);
    return this.login(user);
  };
};