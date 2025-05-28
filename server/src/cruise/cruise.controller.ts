import { Controller, Get, Post, Body, Patch, Param, Delete, Query } from '@nestjs/common';
import { CruiseService } from './cruise.service';
import { CreateCruiseDto } from './dto/create-cruise.dto';
import { UpdateCruiseDto } from './dto/update-cruise.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Cruise } from './entities/cruise.entity';
import { Repository } from 'typeorm';

@Controller('cruise')
export class CruiseController {
  constructor(
    private readonly cruiseService: CruiseService,
    @InjectRepository(Cruise)
    private cruiseRepository: Repository<Cruise>,
  ) {}

  @Post()
  create(@Body() createCruiseDto: CreateCruiseDto) {
    return this.cruiseService.create(createCruiseDto);
  }

  @Get()
  async findAll(
    @Query('date_from') dateFrom?: string,
    @Query('date_to') dateTo?: string,
    @Query('ship_id') shipId?: string,
  ) {
    const qb = this.cruiseRepository.createQueryBuilder('cruise')
      .leftJoinAndSelect('cruise.ship', 'ship');

    if (dateFrom) {
      qb.andWhere('cruise.cruiseDateTo > :dateFrom', { dateFrom });
    }
    if (dateTo) {
      qb.andWhere('cruise.cruiseDateFrom < :dateTo', { dateTo });
    }
    if (shipId) {
      qb.andWhere('ship.id = :shipId', { shipId });
    }

    return qb.getMany();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.cruiseService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateCruiseDto: UpdateCruiseDto) {
    return this.cruiseService.update(+id, updateCruiseDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.cruiseService.remove(+id);
  }
}
