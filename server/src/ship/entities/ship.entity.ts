import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToMany, Index } from 'typeorm';
import { Company } from '../../company/entities/company.entity';
import { Route } from '../../route/entities/route.entity';
import { Cruise } from '../../cruise/entities/cruise.entity';

@Index('idx_ship_name', ['name'])
@Index('idx_ship_company', ['company'])
@Entity()
export class Ship {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @ManyToOne(() => Company, company => company.ships, { onDelete: 'NO ACTION', onUpdate: 'NO ACTION' })
  company: Company;

  @Column('json', { nullable: true })
  characteristics: any;

  @OneToMany(() => Route, route => route.ship)
  routes: Route[];

  @OneToMany(() => Cruise, cruise => cruise.ship)
  cruises: Cruise[];
}
