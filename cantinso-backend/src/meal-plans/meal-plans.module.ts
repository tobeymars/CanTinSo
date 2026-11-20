import { Module } from '@nestjs/common';
import { DishesModule } from '../dishes/dishes.module';
import { MealPlansController } from './meal-plans.controller';
import { MealPlansService } from './meal-plans.service';
import { DishQrService } from './dish-qr.service';
import { PublicDishQrController } from './public-dish-qr.controller';

@Module({ imports: [DishesModule], controllers: [MealPlansController, PublicDishQrController], providers: [MealPlansService, DishQrService] })
export class MealPlansModule {}
