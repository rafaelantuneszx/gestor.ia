// Formatação de horário de Brasília que serve no navegador (dados.ts importa o Supabase do servidor).
const HORA = new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", hour: "2-digit", minute: "2-digit" });
const HORA_SEG = new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", hour: "2-digit", minute: "2-digit", second: "2-digit" });

export const soHoraCliente = (iso: string) => HORA.format(new Date(iso));
export const horaComSegundos = (d = new Date()) => HORA_SEG.format(d);
