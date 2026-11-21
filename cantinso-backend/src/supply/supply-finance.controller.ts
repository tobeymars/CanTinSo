import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../common/roles.guard';
import { Roles } from '../common/roles.decorator';
import { AuthUser, CurrentUser } from '../common/current-user.decorator';
import { SupplyFinanceService } from './supply-finance.service';

@Controller('supply')
@UseGuards(JwtAuthGuard,RolesGuard)
@Roles('CENTRAL_KITCHEN','SCHOOL_KITCHEN','SCHOOL_ADMIN','UBND_ADMIN')
export class SupplyFinanceController {
 constructor(private readonly service:SupplyFinanceService){}
 @Get(':kitchenId/finance')
 overview(@CurrentUser() user:AuthUser,@Param('kitchenId') kitchenId:string){return this.service.overview(user,kitchenId);}
 @Post(':kitchenId/purchase-receipts')
 @Roles('CENTRAL_KITCHEN','SCHOOL_KITCHEN')
 receipt(@CurrentUser() user:AuthUser,@Param('kitchenId') kitchenId:string,@Body() body:unknown){return this.service.createReceipt(user,kitchenId,body);}
 @Post(':kitchenId/payments/:paymentId/reverse')
 @Roles('CENTRAL_KITCHEN','SCHOOL_KITCHEN')
 reverse(@CurrentUser() user:AuthUser,@Param('kitchenId') kitchenId:string,@Param('paymentId') paymentId:string,@Body() body:unknown){
   return this.service.reversePayment(user,kitchenId,paymentId,body);
 }
 @Post(':kitchenId/payments')
 @Roles('CENTRAL_KITCHEN','SCHOOL_KITCHEN')
 pay(@CurrentUser() user:AuthUser,@Param('kitchenId') kitchenId:string,@Body() body:unknown){return this.service.pay(user,kitchenId,body);}
}
