import { PartialType } from '@nestjs/mapped-types';
import { CreateSessaoDto } from './create-sessao.dto';

export class UpdateSessaoDto extends PartialType(CreateSessaoDto) {}
