CREATE UNIQUE INDEX "usuarios_perfis_usuario_id_perfil_id_key"
ON "usuarios_perfis"("usuario_id", "perfil_id");

CREATE UNIQUE INDEX "usuarios_setores_usuario_id_setor_id_key"
ON "usuarios_setores"("usuario_id", "setor_id");

CREATE UNIQUE INDEX "perfis_permissoes_perfil_id_permissao_id_key"
ON "perfis_permissoes"("perfil_id", "permissao_id");