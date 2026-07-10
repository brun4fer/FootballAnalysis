const terms: Record<string, string> = {
  "organização ofensiva": "Organised Attack", "organizacao ofensiva": "Organised Attack",
  "transição ofensiva": "Attacking Transition", "transicao ofensiva": "Attacking Transition",
  "bola parada": "Set Pieces", "saída do gr": "Goalkeeper Distribution", "saida do gr": "Goalkeeper Distribution",
  "construção": "Build-up", "construcao": "Build-up", "criação": "Chance Creation", "criacao": "Chance Creation",
  "finalização": "Finishing", "finalizacao": "Finishing",
  "recuperação meio campo defensivo": "Recovery in the Defensive Half", "recuperacao meio campo defensivo": "Recovery in the Defensive Half",
  "recuperação meio campo ofensivo": "Recovery in the Attacking Half", "recuperacao meio campo ofensivo": "Recovery in the Attacking Half",
  "canto": "Corner", "livre direto": "Direct Free Kick", "livre": "Free Kick", "penalty": "Penalty",
  "penálti": "Penalty", "penalti": "Penalty", "lançamento lateral": "Throw-in", "lancamento lateral": "Throw-in",
  "em organização": "In Possession", "curto para longo": "Short to Long", "bola longa": "Long Ball",
  "ligação por dentro": "Central Progression", "ligacao por dentro": "Central Progression",
  "ligação na largura": "Wide Progression", "ligacao na largura": "Wide Progression",
  "ligação no corredor central": "Central Channel Progression", "ligacao no corredor central": "Central Channel Progression",
  "profundidade": "In Behind", "cruzamento": "Cross", "cruzamento direita": "Cross from the Right",
  "cruzamento esquerda": "Cross from the Left", "remate de fora da área": "Shot from Outside the Box",
  "remate fora de área": "Shot from Outside the Box", "remate fora de area": "Shot from Outside the Box",
  "lançamento para organização": "Throw-in into Organised Attack", "lançamento para a área": "Throw-in into the Box",
  "passagem para organização": "Pass into Organised Attack", "jogador referência": "Reference Player",
  "marcador do canto": "Corner Taker", "marcador da falta": "Free-kick Taker",
  "marcador do penálti": "Penalty Taker", "marcador do penalti": "Penalty Taker",
  "marcador do lançamento": "Throw-in Taker", "marcador do lancamento": "Throw-in Taker",
  "autor do cruzamento": "Cross Provider", "falta sobre": "Player Fouled", "momento anterior": "Previous Phase",
  "aberto": "Inswinging", "fechado": "Outswinging", "combinado": "Routine",
  "canto aberto": "Inswinging Corner", "canto fechado": "Outswinging Corner", "canto combinado": "Corner Routine",
  "livre aberto": "Inswinging Free Kick", "livre fechado": "Outswinging Free Kick", "livre combinado": "Free-kick Routine",
  "indefinido": "Not specified", "outros": "Other", "jogo corrido": "Open Play"
};

export function displayFootballTerm(value: string | null | undefined) {
  if (!value) return value ?? "";
  return terms[value.trim().toLocaleLowerCase("pt-PT")] ?? value;
}
