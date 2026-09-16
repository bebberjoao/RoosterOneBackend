import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { ApiBody, ApiOperation, ApiTags } from '@nestjs/swagger';
import { PermissionGuard } from '../auth/permission.guard';
import { RequirePermission } from '../auth/require-permission.decorator';
import { CreateAmbienteDto } from './dto/create-ambiente.dto';
import { CreateBlocoDto } from './dto/create-bloco.dto';
import { CreateCampusDto } from './dto/create-campus.dto';
import { CreateReservaDto } from './dto/create-reserva.dto';
import { UpdateAmbienteDto } from './dto/update-ambiente.dto';
import { UpdateBlocoDto } from './dto/update-bloco.dto';
import { UpdateCampusDto } from './dto/update-campus.dto';
import { UpdateReservaDto } from './dto/update-reserva.dto';
import { RoomsService } from './rooms.service';

const MODULO = 'Rooster Rooms';

@ApiTags('Rooster Rooms')
@Controller()
@UseGuards(PermissionGuard)
export class RoomsController {
  constructor(private readonly roomsService: RoomsService) {}

  // Campus
  @Post('campus')
  @RequirePermission(MODULO, 'campus', 'manage')
  @ApiOperation({ summary: 'Cria um campus' })
  @ApiBody({ type: CreateCampusDto })
  createCampus(@Body() dto: CreateCampusDto) {
    return this.roomsService.createCampus(dto);
  }

  @Get('campus')
  @RequirePermission(MODULO, 'campus', 'view')
  @ApiOperation({ summary: 'Lista campi' })
  findAllCampus() {
    return this.roomsService.findAllCampus();
  }

  @Get('campus/:id')
  @RequirePermission(MODULO, 'campus', 'view')
  findOneCampus(@Param('id') id: string) {
    return this.roomsService.findOneCampus(id);
  }

  @Patch('campus/:id')
  @RequirePermission(MODULO, 'campus', 'manage')
  @ApiOperation({ summary: 'Atualiza um campus' })
  @ApiBody({ type: UpdateCampusDto })
  updateCampus(@Param('id') id: string, @Body() dto: UpdateCampusDto) {
    return this.roomsService.updateCampus(id, dto);
  }

  @Delete('campus/:id')
  @RequirePermission(MODULO, 'campus', 'manage')
  removeCampus(@Param('id') id: string) {
    return this.roomsService.removeCampus(id);
  }

  // Blocos
  @Post('blocos')
  @RequirePermission(MODULO, 'bloco', 'manage')
  @ApiOperation({ summary: 'Cria um bloco' })
  @ApiBody({ type: CreateBlocoDto })
  createBloco(@Body() dto: CreateBlocoDto) {
    return this.roomsService.createBloco(dto);
  }

  @Get('blocos')
  @RequirePermission(MODULO, 'bloco', 'view')
  findAllBlocos(@Query('campusId') campusId?: string) {
    return this.roomsService.findAllBlocos(campusId);
  }

  @Get('blocos/:id')
  @RequirePermission(MODULO, 'bloco', 'view')
  findOneBloco(@Param('id') id: string) {
    return this.roomsService.findOneBloco(id);
  }

  @Patch('blocos/:id')
  @RequirePermission(MODULO, 'bloco', 'manage')
  updateBloco(@Param('id') id: string, @Body() dto: UpdateBlocoDto) {
    return this.roomsService.updateBloco(id, dto);
  }

  @Delete('blocos/:id')
  @RequirePermission(MODULO, 'bloco', 'manage')
  removeBloco(@Param('id') id: string) {
    return this.roomsService.removeBloco(id);
  }

  // Ambientes
  @Post('ambientes')
  @RequirePermission(MODULO, 'ambiente', 'manage')
  @ApiOperation({ summary: 'Cria um ambiente' })
  @ApiBody({ type: CreateAmbienteDto })
  createAmbiente(@Body() dto: CreateAmbienteDto) {
    return this.roomsService.createAmbiente(dto);
  }

  @Get('ambientes')
  @RequirePermission(MODULO, 'ambiente', 'view')
  findAllAmbientes(
    @Query('campusId') campusId?: string,
    @Query('blocoId') blocoId?: string,
    @Query('tipo') tipo?: string,
    @Query('status') status?: string,
  ) {
    return this.roomsService.findAllAmbientes(campusId, blocoId, tipo, status);
  }

  @Get('ambientes/estrutura')
  @RequirePermission(MODULO, 'ambiente', 'view')
  @ApiOperation({ summary: 'Lista a estrutura física em árvore' })
  getStructureTree() {
    return this.roomsService.getStructureTree();
  }

  @Get('ambientes/:id')
  @RequirePermission(MODULO, 'ambiente', 'view')
  findOneAmbiente(@Param('id') id: string) {
    return this.roomsService.findOneAmbiente(id);
  }

  @Patch('ambientes/:id')
  @RequirePermission(MODULO, 'ambiente', 'manage')
  @ApiOperation({ summary: 'Atualiza um ambiente' })
  @ApiBody({ type: UpdateAmbienteDto })
  updateAmbiente(@Param('id') id: string, @Body() dto: UpdateAmbienteDto) {
    return this.roomsService.updateAmbiente(id, dto);
  }

  @Delete('ambientes/:id')
  @RequirePermission(MODULO, 'ambiente', 'manage')
  removeAmbiente(@Param('id') id: string) {
    return this.roomsService.removeAmbiente(id);
  }

  @Get('ambientes/:id/disponibilidade')
  @RequirePermission(MODULO, 'ambiente', 'view')
  @ApiOperation({ summary: 'Lista os horários livres do ambiente em uma data' })
  disponibilidadeAmbiente(@Param('id') id: string, @Query('data') data?: string) {
    return this.roomsService.getDisponibilidade(id, data);
  }

  // Reservas
  @Post('reservas')
  @RequirePermission(MODULO, 'reserva', 'create')
  @ApiOperation({ summary: 'Cria uma reserva' })
  @ApiBody({ type: CreateReservaDto })
  createReserva(@Body() dto: CreateReservaDto) {
    return this.roomsService.createReserva(dto);
  }

  @Get('reservas')
  @RequirePermission(MODULO, 'reserva', 'view')
  findAllReservas(@Query('ambienteId') ambienteId?: string, @Query('data') data?: string, @Query('status') status?: string) {
    return this.roomsService.findAllReservas(ambienteId, data, status);
  }

  @Get('reservas/:id')
  @RequirePermission(MODULO, 'reserva', 'view')
  findOneReserva(@Param('id') id: string) {
    return this.roomsService.findOneReserva(id);
  }

  @Patch('reservas/:id')
  @RequirePermission(MODULO, 'reserva', 'manage')
  @ApiOperation({ summary: 'Atualiza uma reserva' })
  @ApiBody({ type: UpdateReservaDto })
  updateReserva(@Param('id') id: string, @Body() dto: UpdateReservaDto) {
    return this.roomsService.updateReserva(id, dto);
  }

  @Delete('reservas/:id')
  @RequirePermission(MODULO, 'reserva', 'manage')
  removeReserva(@Param('id') id: string) {
    return this.roomsService.removeReserva(id);
  }

  @Patch('reservas/:id/status')
  @RequirePermission(MODULO, 'reserva', 'approve')
  @ApiOperation({ summary: 'Aprova, recusa ou altera o status de uma reserva' })
  updateReservaStatus(
    @Req() request: Request,
    @Param('id') id: string,
    @Body('status') status: string,
  ) {
    const decididoPor = (request.user as { id?: string } | undefined)?.id;
    return this.roomsService.updateReservaStatus(id, status, decididoPor);
  }
}
