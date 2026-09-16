import { PartialType } from '@nestjs/mapped-types';
import { CreateAssetSectorDto } from './create-asset-sector.dto';

export class UpdateAssetSectorDto extends PartialType(CreateAssetSectorDto) {}
