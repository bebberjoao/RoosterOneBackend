import { PartialType } from '@nestjs/swagger';
import { CreateBlocoDto } from './create-bloco.dto';

export class UpdateBlocoDto extends PartialType(CreateBlocoDto) {}
