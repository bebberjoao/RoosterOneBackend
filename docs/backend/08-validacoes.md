# Validações

Toda validação de entrada é realizada por DTO com `class-validator` e `class-transformer`, aplicada globalmente pelo
`ValidationPipe` registrado em `configurarApp()` (`src/app-config.ts`):

```ts
new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true })
```

- `whitelist: true`: remove todo campo não declarado no DTO.
- `forbidNonWhitelisted: true`: recusa a requisição (`400`), em vez de apenas remover o campo, quando o corpo contém
  campo não declarado.
- `transform: true`: converte o corpo na instância da classe do DTO antes da chegada ao controller (por exemplo,
  um parâmetro de consulta textual é convertido em `number` quando o DTO assim o declara).

## Padrão de DTO

Há um `Create*Dto` por entidade, com decorators por campo; o `Update*Dto` estende `PartialType(Create*Dto)`,
reaproveitando toda a validação da criação e tornando os campos opcionais.

### Exemplo: `CreateUsuarioDto` (`src/roster-hub/usuarios/dto/create-usuario.dto.ts`)

```ts
@IsString() @Length(2, 150) nome: string;
@IsEmail() @Length(5, 150) email: string;
@IsString() @Length(8, 255) senhaHash: string;        // senha mínima de 8 caracteres na criação
@IsOptional() @IsString() @Matches(/^\d{11}$/) cpf?: string;
@IsOptional() @IsString() @Length(8, 20) telefone?: string;
@IsOptional() @Transform(...) @IsBoolean() ativo?: boolean;
```

**Senha mínima de 8 caracteres em todos os fluxos que definem senha**: `CreateUsuarioDto.senhaHash`,
`RedefinirSenhaDto.novaSenha` e o cadastro público do Boost. `LoginDto.senha` e o login do Boost não impõem
mínimo, por decisão de projeto: senha curta, nesses casos, constitui credencial incorreta (`401`), e não requisição
malformada (`400`), e a recusa por tamanho revelaria a política de senha a quem tenta adivinhá-la.

> **Inconsistência corrigida em setembro de 2026**: `RedefinirSenhaDto` aceitava **6** caracteres, enquanto os
> demais fluxos exigiam 8. Além da divergência, era possível contornar o mínimo de 8 caracteres por meio da
> recuperação de senha. O mínimo foi unificado em 8, com teste de regressão em
> `src/common/validacao-dtos.spec.ts`.

### Exemplo: `CreateReservaDto` (`src/rooster-rooms/dto/create-reserva.dto.ts`)

```ts
@IsString() @Length(2, 120) codigo: string;
@IsUUID() ambienteId: string;
@IsDateString() data: string;
@IsInt() @Min(1) participantes: number;
@IsOptional() @IsIn(['confirmada', 'analise', 'cancelada', 'finalizada', 'andamento']) status?: string;
@IsOptional() @IsIn(['unica', 'diaria', 'semanal', 'mensal']) recorrencia?: string;
```

`@IsIn(...)` é o padrão adotado para os campos de valores enumerados do sistema. Não há enum nativo do Prisma para
esses campos: são colunas `String`, com validação apenas na camada de DTO, e não no banco.

## Validação de arquivos enviados

As rotas de upload aplicam, nesta ordem: verificação de permissão pelo guard (antes do recebimento); limite de
tamanho e lista de mimetypes aceitos (`MIMETYPES_DOCUMENTO` ou `MIMETYPES_VIDEO`, `src/common/storage.config.ts`);
e compatibilidade do conteúdo com o mimetype declarado, verificada pela assinatura binária
(`src/common/assinatura-arquivo.ts`). Conteúdo incompatível resulta em `400`, e o arquivo não é gravado (no caso do
vídeo, o arquivo parcial é removido).

## Validação fora do DTO

As regras de negócio que dependem de consulta ao banco (por exemplo, conflito de horário de reserva, capacidade do
ambiente e permissão do usuário sobre o setor da categoria) **não constituem validação de DTO**: são aplicadas no
service ou no controller, após a aceitação do formato do corpo pelo `ValidationPipe`. Ver
`docs/system/04-regras-de-negocio.md`.
