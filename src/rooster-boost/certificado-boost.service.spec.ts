import { CertificadoBoostService } from './certificado-boost.service';

describe('CertificadoBoostService.aplicarModelo', () => {
  const valores = { aluno: 'Ana', curso: 'Lógica', cargaHoraria: '20', data: '25 de setembro de 2026' };

  it('troca os campos conhecidos, inclusive repetidos', () => {
    expect(CertificadoBoostService.aplicarModelo('{aluno} concluiu {curso} ({cargaHoraria}h). {aluno}!', valores))
      .toBe('Ana concluiu Lógica (20h). Ana!');
  });

  it('mantém como está uma chave desconhecida, em vez de apagar ou quebrar', () => {
    expect(CertificadoBoostService.aplicarModelo('Olá {aluno}, {nota}', valores)).toBe('Olá Ana, {nota}');
  });

  it('texto sem campos sai igual', () => {
    expect(CertificadoBoostService.aplicarModelo('Sem campos', valores)).toBe('Sem campos');
  });
});
