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

## Commandes attendues

Les commandes exactes seront confirmees apres initialisation du projet. Cibles :

```bash
npm test
npm run build
npm run lint
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
