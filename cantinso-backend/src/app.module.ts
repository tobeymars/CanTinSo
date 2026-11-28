import { NotificationsModule } from './notifications/notifications.module';
import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { PrismaModule } from "./prisma/prisma.module";
import { AuthModule } from "./auth/auth.module";
import { StudentsModule } from "./students/students.module";
import { AttendanceModule } from "./attendance/attendance.module";
import { UsersModule } from "./users/users.module";
import { SchoolsModule } from "./schools/schools.module";
import { DishesModule } from "./dishes/dishes.module";
import { MealPlansModule } from "./meal-plans/meal-plans.module";
import { SupervisionModule } from "./supervision/supervision.module";
import { SupplyModule } from "./supply/supply.module";
import { KitchenLegalModule } from "./kitchen-legal/kitchen-legal.module";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    NotificationsModule,
    AuthModule,
    StudentsModule,
    AttendanceModule,
    UsersModule,
    SchoolsModule,
    DishesModule,
    MealPlansModule,
    KitchenLegalModule,
    SupervisionModule,
    SupplyModule,
  ],
})
export class AppModule {}
