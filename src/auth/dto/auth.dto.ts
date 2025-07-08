import { IsEmail, IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SignupDto {
    @ApiProperty({ example: 'user@example.com' })
    @IsEmail()
    email: string;
  
    @ApiProperty({ example: 'password' })
    @IsString()
    @MinLength(8)
    password: string;
  }
  
  export class LoginDto {
    @ApiProperty({ example: 'user@example.com' })
    @IsEmail()
    email: string;
  
    @ApiProperty({ example: 'password' })
    @IsString()
    password: string;
};