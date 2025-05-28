import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Cruise } from './entities/cruise.entity';
import { CruiseService } from './cruise.service';
import { CruiseController } from './cruise.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Cruise])],
  controllers: [CruiseController],
  providers: [CruiseService],
})
export class CruiseModule {}
