import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Ship } from './entities/ship.entity';
import { ShipService } from './ship.service';
import { ShipController } from './ship.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Ship])],
  controllers: [ShipController],
  providers: [ShipService],
})
export class ShipModule {}
