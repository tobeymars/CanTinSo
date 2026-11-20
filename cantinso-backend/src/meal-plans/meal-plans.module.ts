import { Module } from '@nestjs/common';
import { MealPlansController } from './meal-plans.controller';
import { MealPlansService } from './meal-plans.service';
import { DishQrService } from './dish-qr.service';
import { PublicDishQrController } from './public-dish-qr.controller';

@Module({ controllers: [MealPlansController, PublicDishQrController], providers: [MealPlansService, DishQrService] })
export class MealPlansModule {}
