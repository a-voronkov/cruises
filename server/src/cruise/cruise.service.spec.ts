import { Test, TestingModule } from '@nestjs/testing';
import { CruiseService } from './cruise.service';

describe('CruiseService', () => {
  let service: CruiseService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [CruiseService],
    }).compile();

    service = module.get<CruiseService>(CruiseService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
