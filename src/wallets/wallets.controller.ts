import { Controller, Get, Post, Body, UseGuards, Request } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { WalletsService } from './wallets.service';
import { DepositDto, WithdrawDto, TransferDto } from './dto/wallet.dto';

@ApiTags('wallet')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('wallet')
export class WalletsController {
  constructor(private readonly walletsService: WalletsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new wallet' })
  @ApiResponse({ status: 201, description: 'Wallet created successfully' })
  create(@Request() req) {
    return this.walletsService.createWallet(req.user.id);
  };

  @Get('balance')
  @ApiOperation({ summary: 'Get wallet balance' })
  @ApiResponse({ status: 200, description: 'Balance retrieved successfully' })
  getBalance(@Request() req) {
    return this.walletsService.getBalance(req.user.id);
  };

  @Post('deposit')
  @ApiOperation({ summary: 'Deposit funds to wallet' })
  @ApiResponse({ status: 201, description: 'Deposit initiated successfully' })
  deposit(@Request() req, @Body() depositDto: DepositDto) {
    return this.walletsService.deposit(req.user.id, depositDto);
  };

  @Post('withdraw')
  @ApiOperation({ summary: 'Withdraw funds from wallet' })
  @ApiResponse({ status: 201, description: 'Withdrawal initiated successfully' })
  withdraw(@Request() req, @Body() withdrawDto: WithdrawDto) {
    return this.walletsService.withdraw(req.user.id, withdrawDto);
  };

  @Post('transfer')
  @ApiOperation({ summary: 'Transfer funds to another wallet' })
  @ApiResponse({ status: 200, description: 'Transfer initiated successfully' })
  transfer(@Request() req, @Body() transferDto: TransferDto) {
    return this.walletsService.transfer(req.user.id, transferDto);
  };
}