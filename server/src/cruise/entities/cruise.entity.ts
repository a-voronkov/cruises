import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, Index } from 'typeorm';
import { Ship } from '../../ship/entities/ship.entity';

@Index('idx_cruise_ship_cruise_dates', ['ship', 'cruiseDateFrom', 'cruiseDateTo'])
@Index('idx_cruise_ship_travel_dates', ['ship', 'travelDateFrom', 'travelDateTo'])
@Entity()
export class Cruise {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Ship, ship => ship.cruises)
  ship: Ship;

  @Column({ type: 'date' })
  travelDateFrom: string;

  @Column({ type: 'date' })
  travelDateTo: string;

  @Column({ type: 'date' })
  cruiseDateFrom: string;

  @Column({ type: 'date' })
  cruiseDateTo: string;

  @Column({ nullable: true })
  description: string;

  @Column('json', { nullable: true })
  extraInfo: any;
}
