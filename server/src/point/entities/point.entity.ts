import { Entity, PrimaryGeneratedColumn, Column, OneToMany, Index } from 'typeorm';
import { Route } from '../../route/entities/route.entity';

@Index('idx_point_name', ['name'])
@Index('idx_point_lat_lng', ['lat', 'lng'])
@Entity()
export class Point {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column({ nullable: true })
  country: string;

  @Column('decimal', { precision: 10, scale: 6, nullable: true })
  lat: number;

  @Column('decimal', { precision: 10, scale: 6, nullable: true })
  lng: number;

  @OneToMany(() => Route, route => route.point)
  routes: Route[];
}
