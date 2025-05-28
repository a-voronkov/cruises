import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, Index } from 'typeorm';
import { Ship } from '../../ship/entities/ship.entity';
import { Point } from '../../point/entities/point.entity';

@Index(['ship', 'date'], { unique: true })
@Index('idx_route_point_date', ['point', 'date'])
@Entity()
export class Route {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Ship, ship => ship.routes)
  ship: Ship;

  @ManyToOne(() => Point, point => point.routes)
  point: Point;

  @Column({ type: 'date' })
  date: string;

  @Column({ default: false })
  isTransit: boolean;

  @Column({ nullable: true })
  extraInfo: string;
}
