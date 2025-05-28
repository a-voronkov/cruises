import { Entity, PrimaryGeneratedColumn, Column, OneToMany, Index } from 'typeorm';
import { Ship } from '../../ship/entities/ship.entity';

@Index('idx_company_name', ['name'])
@Entity()
export class Company {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column({ nullable: true })
  logoUrl: string;

  @OneToMany(() => Ship, ship => ship.company)
  ships: Ship[];
}
