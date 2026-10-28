// Mensagem legível para os erros das RPCs da sala de reunião (inclusive a migration ainda não aplicada).
export function explicarErro(msg: string) {
  if (/could not find the function|function .* does not exist|PGRST202/i.test(msg)) {
    return "A gravação de falas pelo Gestor.IA ainda não está ativa: falta aplicar a migration da sala de reunião.";
  }
  return msg;
}
