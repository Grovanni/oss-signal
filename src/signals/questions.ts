import type { ReviewQuestion, Signal } from "./types.js";

const questionBySignalId = new Map<string, string>([
  ["code_without_tests", "Quels tests couvrent les fichiers de code modifies ?"],
  [
    "auth_related_change",
    "Le changement d'authentification ou de session est-il couvert par des tests ?"
  ],
  [
    "secret_related_change",
    "Les changements lies aux secrets ou cles evitent-ils d'exposer des valeurs sensibles ?"
  ],
  ["dependency_manifest_changed", "Pourquoi cette dependance est-elle necessaire dans cette PR ?"],
  [
    "dependency_lockfile_changed",
    "Le lockfile a-t-il ete regenere avec la version attendue du gestionnaire de paquets ?"
  ],
  ["ci_changed", "Pourquoi le workflow CI doit-il changer dans cette PR ?"],
  [
    "ci_checks_failed",
    "Quel check CI echoue et doit-il etre corrige avant la review approfondie ?"
  ],
  ["ci_checks_pending", "Quels checks CI restent en attente avant la review approfondie ?"],
  ["ci_status_unavailable", "Les checks GitHub sont-ils disponibles ailleurs pour cette PR ?"],
  ["migration_changed", "La migration est-elle backward compatible et reversible ?"],
  [
    "persistence_data_format_change",
    "Le changement de format ou persistance reste-t-il compatible avec les donnees existantes ?"
  ],
  ["large_pr", "Cette PR peut-elle etre separee en plusieurs changements plus petits ?"],
  [
    "short_description_for_large_pr",
    "Pouvez-vous ajouter contexte, comportement attendu et strategie de test ?"
  ],
  [
    "mixed_concerns",
    "Quels changements doivent etre relus ensemble et lesquels peuvent etre separes ?"
  ]
]);

export function buildReviewQuestions(signals: Signal[], limit = 5): ReviewQuestion[] {
  const questions: ReviewQuestion[] = [];

  for (const signal of signals) {
    const question = questionBySignalId.get(signal.id);

    if (question) {
      questions.push({
        signal_id: signal.id,
        question
      });
    }

    if (questions.length >= limit) {
      break;
    }
  }

  return questions;
}
