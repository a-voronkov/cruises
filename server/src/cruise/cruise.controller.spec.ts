import { Test, TestingModule } from '@nestjs/testing';
import { CruiseController } from './cruise.controller';
import { CruiseService } from './cruise.service';

describe('CruiseController', () => {
  let controller: CruiseController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CruiseController],
      providers: [CruiseService],
    }).compile();

    controller = module.get<CruiseController>(CruiseController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
