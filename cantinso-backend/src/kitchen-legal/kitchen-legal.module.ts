import { Module } from '@nestjs/common';
import { KitchenLegalController } from './kitchen-legal.controller';
import { KitchenLegalService } from './kitchen-legal.service';
@Module({ controllers: [KitchenLegalController], providers: [KitchenLegalService] })
export class KitchenLegalModule {}
