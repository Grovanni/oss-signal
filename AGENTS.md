# Conventions de developpement - repo public OSS Signal

Toujours repondre en francais dans les echanges avec le proprietaire du projet.

## Mission du repo

Ce depot public contient OSS Signal : une CLI open source qui transforme une Pull Request GitHub en brief de decision deterministe pour mainteneurs humains et agents de code.

Ce fichier ne contient que les conventions techniques publiques du depot.

## Contraintes produit

- Pas d'IA integree dans le runtime MVP.
- Pas de cle API obligatoire.
- Pas d'envoi de code a une API externe.
- Pas de commentaire automatique sur GitHub par defaut.
- Pas de verdict approve/reject.
- Pas de score numerique de qualite.
- Chaque signal doit avoir une preuve.
- Le rapport doit orienter l'attention, pas juger la PR.

## Qualite attendue

Pour toute modification comportementale :

- ajouter ou mettre a jour les tests ;
- mettre a jour la documentation si la CLI ou les sorties changent ;
- garder les rapports courts ;
- verifier que les signaux restent explicables.

## Commandes

Installer les dependances :

```bash
npm install
```

Verifier le projet :

```bash
npm run build
npm test
npm run lint
npm run check
```

Verifier la CLI sans reseau :

```bash
node dist/cli/index.js pr https://github.com/org/repo/pull/123 --dry-run
node dist/cli/index.js pr https://github.com/org/repo/pull/123 --fixture tests/fixtures/github-basic
```

Verifier la recuperation GitHub sur une PR publique :

```bash
node dist/cli/index.js pr https://github.com/org/repo/pull/123
```

## Style

- TypeScript strict.
- Modules petits.
- Noms explicites.
- Pas de dependance lourde sans justification.
- Pas de reseau dans les tests unitaires.

## Securite

- Ne jamais logguer `GITHUB_TOKEN`.
- Ne jamais ecrire un token dans un fichier genere.
- Ne jamais executer du code issu d'une PR analysee.
- Valider les URLs GitHub.
- Ne pas imprimer le diff complet dans la sortie terminal.
