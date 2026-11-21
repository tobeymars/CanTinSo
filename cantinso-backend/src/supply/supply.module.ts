import { Module } from '@nestjs/common';
import { SupplyController } from './supply.controller';
import { SupplyService } from './supply.service';
import { SupplyFinanceService } from './supply-finance.service';
import { SupplyFinanceController } from './supply-finance.controller';
@Module({controllers:[SupplyController,SupplyFinanceController],providers:[SupplyService,SupplyFinanceService]})
export class SupplyModule {}
