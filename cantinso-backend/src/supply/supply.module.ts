import { Module } from '@nestjs/common';
import { SupplyController } from './supply.controller';
import { SupplyService } from './supply.service';
import { SupplyFinanceService } from './supply-finance.service';
import { SupplierDocumentsService } from './supplier-documents.service';
import { SupplierDocumentsController } from './supplier-documents.controller';
import { SupplyFinanceController } from './supply-finance.controller';
@Module({controllers:[SupplyController,SupplyFinanceController,SupplierDocumentsController],providers:[SupplyService,SupplyFinanceService,SupplierDocumentsService]})
export class SupplyModule {}
