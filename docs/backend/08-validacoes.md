# Validações

Toda validação de entrada é feita por DTO com `class-validator` + `class-transformer`, aplicada globalmente por um `ValidationPipe` (`src/main.ts`):

```ts
new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true })
```

- `whitelist: true` — remove silenciosamente qualquer campo não declarado no DTO.
- `forbidNonWhitelisted: true` — na verdade rejeita (400) em vez de só remover, quando o corpo tem um campo extra não declarado.
- `transform: true` — converte o corpo bruto para uma instância real da classe do DTO antes de chegar no controller (ex.: string de query vira `number` se o DTO declarar `number`).

## Padrão de DTO

Um `Create*Dto` por entidade, decorado campo a campo; `Update*Dto` sempre `extends PartialType(Create*Dto)` — reaproveita toda validação do create, só tornando os campos opcionais.

### Exemplo — `CreateUsuarioDto` (`src/roster-hub/usuarios/dto/create-usuario.dto.ts`)

```ts
@IsString() @Length(2, 150) nome: string;
@IsEmail() @Length(5, 150) email: string;
@IsString() @Length(8, 255) senhaHash: string;        // senha mínima de 8 caracteres na criação
@IsOptional() @IsString() @Matches(/^\d{11}$/) cpf?: string;
@IsOptional() @IsString() @Length(8, 20) telefone?: string;
@IsOptional() @Transform(...) @IsBoolean() ativo?: boolean;
```

**Senha mínima: 8 caracteres, em todo fluxo que define senha** — `CreateUsuarioDto.senhaHash`, `RedefinirSenhaDto.novaSenha` e o cadastro público do Boost. `LoginDto.senha` e o login do Boost não impõem mínimo de propósito: senha curta ali é credencial errada (`401`), não requisição malformada (`400`), e recusar por tamanho vazaria a política de senha para quem tenta adivinhar.

> **Inconsistência corrigida (setembro/2026)**: `RedefinirSenhaDto` aceitava **6** caracteres enquanto os demais exigiam 8. Não era só divergência de documentação — dava para contornar o mínimo de 8 usando o fluxo de "esqueci minha senha" para definir uma senha de 6. Unificado em 8, com teste travando a regressão em `src/common/validacao-dtos.spec.ts`.

### Exemplo — `CreateReservaDto` (`src/rooster-rooms/dto/create-reserva.dto.ts`)

```ts
@IsString() @Length(2, 120) codigo: string;
@IsUUID() ambienteId: string;
@IsDateString() data: string;
@IsInt() @Min(1) participantes: number;
@IsOptional() @IsIn(['confirmada', 'analise', 'cancelada', 'finalizada', 'andamento']) status?: string;
@IsOptional() @IsIn(['unica', 'diaria', 'semanal', 'mensal']) recorrencia?: string;
```

`@IsIn(...)` é o padrão usado para todo campo de "enum de texto" do sistema (não há enum nativo do Prisma para esses campos — são `String` com validação só na camada de DTO, não no banco).

## Validação que não está no DTO

Regra de negócio que depende de consultar o banco (ex.: conflito de horário de reserva, capacidade do ambiente, permissão do usuário sobre o setor da categoria) **não é validação de DTO** — acontece dentro do service/controller, depois que o `ValidationPipe` já aceitou o formato do corpo. Ver `docs/system/04-regras-de-negocio.md`.
