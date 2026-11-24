export interface MensagemEmail {
  para: string;
  assunto: string;
  html: string;
  texto: string;
}

export interface ResultadoEmail {
  id: string;
  previewUrl?: string;
}

export interface EmailProvider {
  enviar(mensagem: MensagemEmail): Promise<ResultadoEmail>;
}
