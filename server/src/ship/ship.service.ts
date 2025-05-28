import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Ship } from './entities/ship.entity';
import { CreateShipDto } from './dto/create-ship.dto';
import { UpdateShipDto } from './dto/update-ship.dto';

@Injectable()
export class ShipService {
  constructor(
    @InjectRepository(Ship)
    private shipRepository: Repository<Ship>,
  ) {}

  create(createShipDto: CreateShipDto) {
    return 'This action adds a new ship';
  }

  async findAll() {
    return this.shipRepository.find({ relations: ['company'] });
  }

  findOne(id: number) {
    return `This action returns a #${id} ship`;
  }

  update(id: number, updateShipDto: UpdateShipDto) {
    return `This action updates a #${id} ship`;
  }

  remove(id: number) {
    return `This action removes a #${id} ship`;
  }
}
