import { PartialType } from '@nestjs/mapped-types';
import { CreateAssetMovementDto } from './create-asset-movement.dto';

export class UpdateAssetMovementDto extends PartialType(CreateAssetMovementDto) {}
