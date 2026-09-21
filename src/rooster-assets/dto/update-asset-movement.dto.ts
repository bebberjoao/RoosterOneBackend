import { PartialType } from '@nestjs/swagger';
import { CreateAssetMovementDto } from './create-asset-movement.dto';

export class UpdateAssetMovementDto extends PartialType(CreateAssetMovementDto) {}
