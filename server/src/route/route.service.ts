import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Route } from './entities/route.entity';
import { CreateRouteDto } from './dto/create-route.dto';
import { UpdateRouteDto } from './dto/update-route.dto';

interface RouteFilter {
  shipId?: string;
  dateFrom?: string;
  dateTo?: string;
}

@Injectable()
export class RouteService {
  constructor(
    @InjectRepository(Route)
    private routeRepository: Repository<Route>,
  ) {}

  create(createRouteDto: CreateRouteDto) {
    return 'This action adds a new route';
  }

  async findAll(filter: RouteFilter = {}) {
    const qb = this.routeRepository.createQueryBuilder('route')
      .leftJoinAndSelect('route.ship', 'ship')
      .leftJoinAndSelect('ship.company', 'company')
      .leftJoinAndSelect('route.point', 'point');
    if (filter.shipId) {
      const ids = filter.shipId.split(',').map(id => id.trim()).filter(Boolean);
      if (ids.length > 1) {
        qb.andWhere('ship.id IN (:...ids)', { ids });
      } else {
        qb.andWhere('ship.id = :shipId', { shipId: ids[0] });
      }
    }
    if (filter.dateFrom) {
      qb.andWhere('route.date >= :dateFrom', { dateFrom: filter.dateFrom });
    }
    if (filter.dateTo) {
      qb.andWhere('route.date <= :dateTo', { dateTo: filter.dateTo });
    }
    return qb.getMany();
  }

  findOne(id: number) {
    return `This action returns a #${id} route`;
  }

  update(id: number, updateRouteDto: UpdateRouteDto) {
    return `This action updates a #${id} route`;
  }

  remove(id: number) {
    return `This action removes a #${id} route`;
  }
}
