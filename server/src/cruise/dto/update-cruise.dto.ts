import { PartialType } from '@nestjs/mapped-types';
import { CreateCruiseDto } from './create-cruise.dto';

export class UpdateCruiseDto extends PartialType(CreateCruiseDto) {}
