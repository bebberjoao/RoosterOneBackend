// Declara o contrato de `request.user` que os guards da aplicação preenchem.
//
// Até setembro/2026 essa augmentação vinha por acidente de `@types/passport-jwt`
// (dependência transitiva de um Passport que o projeto nunca usou — a verificação
// do JWT sempre foi manual em `src/auth/jwt-auth.guard.ts`). Ao remover o Passport
// do package.json, os 89 usos de `request.user` nos controllers perderam o tipo.
// Declarar aqui é o correto: o contrato é da aplicação, não de uma biblioteca
// que ela não usa.
//
// Quem preenche:
// - `JwtAuthGuard`       -> o `Usuario` do Hub (rotas internas)
// - `BoostJwtAuthGuard`  -> o `BoostUsuario` (portal público do Boost)
//
// Os dois têm `id`; o restante varia conforme a tabela de origem, por isso o
// índice aberto. Os controllers estreitam para o que precisam (tipicamente
// `(request.user as { id: string }).id`).

declare global {
  namespace Express {
    interface Request {
      user?: { id: string } & Record<string, unknown>;
    }
  }
}

export {};
