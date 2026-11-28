import { Module } from "@nestjs/common";
import { RolesGuard } from "../common/roles.guard";
import { SchoolsController } from "./schools.controller";
import { SchoolsService } from "./schools.service";

@Module({
  controllers: [SchoolsController],
  providers: [SchoolsService, RolesGuard],
})
export class SchoolsModule {}
