import { Controller, Get, Param, Query, UseGuards, Request } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { TransactionsService } from './transactions.service';
import { GetTransactionsDto } from './dto/transaction.dto';

@ApiTags('transactions')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('transactions')
export class TransactionsController {
  constructor(private readonly transactionsService: TransactionsService) {}

  @Get()
  @ApiOperation({ summary: 'Get transaction history' })
  @ApiResponse({ status: 200, description: 'Transaction history retrieved successfully' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'type', required: false, enum: ['DEPOSIT', 'WITHDRAWAL', 'DEBIT', 'CREDIT'] })
  @ApiQuery({ name: 'status', required: false, enum: ['PENDING', 'COMPLETED', 'FAILED'] })
  getTransactionHistory(@Request() req, @Query() getTransactionsDto: GetTransactionsDto) {
    return this.transactionsService.getTransactionHistory(req.user.id, getTransactionsDto);
  };

  @Get(':id')
  @ApiOperation({ summary: 'Get specific transaction' })
  @ApiResponse({ status: 200, description: 'Transaction retrieved successfully' })
  getTransaction(@Request() req, @Param('id') id: string) {
    return this.transactionsService.getTransactionById(req.user.id, id);
  };
};