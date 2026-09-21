import { PartialType } from '@nestjs/swagger';
import { CreateAssetSectorDto } from './create-asset-sector.dto';

export class UpdateAssetSectorDto extends PartialType(CreateAssetSectorDto) {}
