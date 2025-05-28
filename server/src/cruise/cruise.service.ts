import { Injectable } from '@nestjs/common';
import { CreateCruiseDto } from './dto/create-cruise.dto';
import { UpdateCruiseDto } from './dto/update-cruise.dto';

@Injectable()
export class CruiseService {
  create(createCruiseDto: CreateCruiseDto) {
    return 'This action adds a new cruise';
  }

  findAll() {
    return `This action returns all cruise`;
  }

  findOne(id: number) {
    return `This action returns a #${id} cruise`;
  }

  update(id: number, updateCruiseDto: UpdateCruiseDto) {
    return `This action updates a #${id} cruise`;
  }

  remove(id: number) {
    return `This action removes a #${id} cruise`;
  }
}
