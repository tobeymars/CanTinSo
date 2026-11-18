import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { PrismaModule } from "./prisma/prisma.module";
import { AuthModule } from "./auth/auth.module";
import { StudentsModule } from "./students/students.module";
import { AttendanceModule } from "./attendance/attendance.module";
import { UsersModule } from "./users/users.module";
import { SchoolsModule } from "./schools/schools.module";
import { DishesModule } from "./dishes/dishes.module";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    StudentsModule,
    AttendanceModule,
    UsersModule,
    SchoolsModule,
    DishesModule,
  ],
})
export class AppModule {}
