import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';

// Prisma client generated specifically for tests using sqlite.
const { PrismaClient } = require('../../../prisma-test-client');

// SQLite não suporta colunas de lista (String[]) como o Postgres do schema
// real — aqui elas viram uma coluna String? com JSON serializado. Os métodos
// abaixo convertem array <-> JSON nas duas pontas para que o código de
// serviço (compartilhado com produção) não precise saber da diferença.
const LIST_FIELDS = ['galeria', 'diasFuncionamento'];

function encodeListFields(data: Record<string, unknown> | undefined) {
  if (!data) return;
  for (const field of LIST_FIELDS) {
    if (Array.isArray(data[field])) data[field] = JSON.stringify(data[field]);
  }
}

function decodeListFields(row: any) {
  if (!row) return row;
  for (const field of LIST_FIELDS) {
    if (typeof row[field] === 'string') {
      try {
        row[field] = JSON.parse(row[field]);
      } catch {
        row[field] = [];
      }
    } else if (field in row && row[field] == null) {
      row[field] = [];
    }
  }
  return row;
}

@Injectable()
export class PrismaTestService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  async onModuleInit(): Promise<void> {
    await this.$connect();
    this.patchAmbienteListFields();
  }

  /** Ambiente é o único modelo com colunas de lista; os demais não precisam desse tratamento. */
  private patchAmbienteListFields() {
    const delegate = (this as any).ambiente;
    const originalCreate = delegate.create.bind(delegate);
    const originalUpdate = delegate.update.bind(delegate);
    const originalFindMany = delegate.findMany.bind(delegate);
    const originalFindUnique = delegate.findUnique.bind(delegate);

    delegate.create = async (args: any) => {
      encodeListFields(args?.data);
      return decodeListFields(await originalCreate(args));
    };
    delegate.update = async (args: any) => {
      encodeListFields(args?.data);
      return decodeListFields(await originalUpdate(args));
    };
    delegate.findMany = async (args?: any) => {
      const rows = await originalFindMany(args);
      rows.forEach(decodeListFields);
      return rows;
    };
    delegate.findUnique = async (args: any) => decodeListFields(await originalFindUnique(args));
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}
