import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CompanyModule } from './company/company.module';
import { ShipModule } from './ship/ship.module';
import { PointModule } from './point/point.module';
import { RouteModule } from './route/route.module';
import { CruiseModule } from './cruise/cruise.module';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'mariadb',
      host: process.env.DB_HOST as string || 'localhost',
      port: parseInt(process.env.DB_PORT || '3306'),
      username: process.env.DB_USER || 'root',
      password: process.env.DB_PASS || 'root',
      database: process.env.DB_NAME || 'cruises',
      autoLoadEntities: true,
      synchronize: true,
    }),
    CompanyModule,
    ShipModule,
    PointModule,
    RouteModule,
    CruiseModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
