import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';

// Prisma client generated specifically for tests using sqlite.
const { PrismaClient } = require('../../../prisma-test-client');

// SQLite não suporta colunas de lista (String[]) como o Postgres do schema
// real — aqui elas viram uma coluna String? com JSON serializado. Os métodos
// abaixo convertem array <-> JSON nas duas pontas para que o código de
// serviço (compartilhado com produção) não precise saber da diferença.
const LIST_FIELDS_BY_MODEL: Record<string, string[]> = {
  ambiente: ['galeria', 'diasFuncionamento', 'recursos'],
  ticket: ['tags'],
};

function encodeListFields(data: Record<string, unknown> | undefined, fields: string[]) {
  if (!data) return;
  for (const field of fields) {
    if (Array.isArray(data[field])) data[field] = JSON.stringify(data[field]);
  }
}

function decodeListFields(row: any, fields: string[]) {
  if (!row) return row;
  for (const field of fields) {
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
    for (const [model, fields] of Object.entries(LIST_FIELDS_BY_MODEL)) {
      this.patchListFields(model, fields);
    }
  }

  private patchListFields(modelName: string, fields: string[]) {
    const delegate = (this as any)[modelName];
    const originalCreate = delegate.create.bind(delegate);
    const originalUpdate = delegate.update.bind(delegate);
    const originalFindMany = delegate.findMany.bind(delegate);
    const originalFindUnique = delegate.findUnique.bind(delegate);

    delegate.create = async (args: any) => {
      encodeListFields(args?.data, fields);
      return decodeListFields(await originalCreate(args), fields);
    };
    delegate.update = async (args: any) => {
      encodeListFields(args?.data, fields);
      return decodeListFields(await originalUpdate(args), fields);
    };
    delegate.findMany = async (args?: any) => {
      const rows = await originalFindMany(args);
      rows.forEach((row: any) => decodeListFields(row, fields));
      return rows;
    };
    delegate.findUnique = async (args: any) => decodeListFields(await originalFindUnique(args), fields);
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}
