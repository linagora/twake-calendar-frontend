# Déclaration d'accessibilité — Twake Calendar

> **État de conformité : non conforme (aucun audit de conformité n'a encore été réalisé).**
>
> *Accessibilité : non conforme.*

*Autres langues : [English](ACCESSIBILITY_STATEMENT-en.md), [русский](ACCESSIBILITY_STATEMENT-ru.md),
[tiếng Việt](ACCESSIBILITY_STATEMENT-vi.md).*

La présente déclaration s'applique à l'application web Twake Calendar publiée depuis ce dépôt :

- l'application d'agenda authentifiée (`apps/private`) ;
- les pages publiques : pages de prise de rendez-vous et aperçus publics d'événements (`apps/public`).

Elle est maintenue dans le dépôt des sources afin que chaque version soit livrée avec une
déclaration à jour. **Une administration qui déploie Twake Calendar reste responsable de la
publication de la déclaration de son propre service** : copier ce document, compléter les sections
marquées *[déployeur]*, le publier et y faire pointer l'application (voir
[Pour les déployeurs](#pour-les-déployeurs)).

## Engagement

LINAGORA s'engage à rendre Twake Calendar accessible conformément à l'article 47 de la loi
n° 2005-102 du 11 février 2005 et au décret n° 2019-768 du 24 juillet 2019. À cette fin, elle publie :

- un [schéma pluriannuel de mise en accessibilité](MULTI_YEAR_PLAN.md) ;
- le plan d'action de l'année en cours : [`A10Y_REMEDIATIONS-2026-10-01.md`](A10Y_REMEDIATIONS-2026-10-01.md).

## État de conformité

Twake Calendar est **non conforme** avec le RGAA 4.1.2.

**Aucun audit de conformité RGAA n'a encore été réalisé.** Aucun taux de conformité ne peut donc
être indiqué. Un pré-audit (revue du code source de l'ensemble de l'application et tests
automatisés des pages publiques) a été mené le 1er octobre 2026 ; ses résultats sont publics :
[`A10Y_AUDIT-2026-10-01.md`](A10Y_AUDIT-2026-10-01.md). Les corrections ont fait l'objet d'un
nouveau pré-audit le même jour : [`A10Y_REAUDIT-2026-10-01.md`](A10Y_REAUDIT-2026-10-01.md),
[`A10Y_REAUDIT-2026-10-01-batch2.md`](A10Y_REAUDIT-2026-10-01-batch2.md).

## Mode contraste élevé

Twake Calendar propose une version accessible de son interface : le **mode contraste élevé**. Il
s'active depuis le pied de la barre latérale (agenda et paramètres), depuis le pied des pages
publiques ou depuis *Paramètres › Accessibilité* ; survoler ou atteindre l'interrupteur au
clavier en affiche la description. Il est enregistré sur l'appareil et désactivé par défaut.

Mode activé : les couleurs atteignent les contrastes requis, le focus clavier est nettement
visible, un lien « Aller au contenu » apparaît au premier appui sur la touche Tab, les champs ont
une étiquette visible et les champs obligatoires sont signalés, les messages restent affichés
suffisamment longtemps et tous les textes de l'interface suivent la langue choisie. Sauf mention
contraire, les obstacles listés ci-dessous concernent l'affichage par défaut.

## Contenus non accessibles

Le pré-audit a notamment relevé les obstacles suivants (liste complète et localisation dans
[`A10Y_AUDIT-2026-10-01.md`](A10Y_AUDIT-2026-10-01.md), avancement dans [`A10Y_REMEDIATIONS-2026-10-01.md`](A10Y_REMEDIATIONS-2026-10-01.md)) :

- La prise de focus clavier est peu visible sur la plupart des éléments interactifs.
- Plusieurs couleurs (boutons principaux, textes secondaires, liens, messages d'erreur, événements)
  n'atteignent pas le contraste requis.
- La fiche de contact d'un participant n'est pas atteignable au clavier depuis les fenêtres
  d'événement.
- Plusieurs champs de formulaire n'ont pas d'étiquette visible (seulement un texte indicatif, leur
  nom est transmis aux technologies d'assistance) et les champs obligatoires ne sont pas signalés
  visuellement.
- Certains états (statut de participation, caractère privé) ne sont transmis que par la couleur ou
  une icône, et les événements de l'agenda sont restitués sans leur plage horaire complète ni leur
  statut.
- Il n'y a pas de lien d'évitement ; le focus n'est pas déplacé lors du passage entre l'agenda, les
  paramètres et la recherche.
- Certains messages disparaissent au bout de 2 secondes.

### Dérogations pour charge disproportionnée

Aucune.

### Contenus non soumis à l'obligation d'accessibilité

Aucun identifié.

### Limites connues et alternatives

- **Glisser-déposer dans la grille de l'agenda** (créer, déplacer ou redimensionner un événement
  avec la souris) : le même résultat s'obtient au clavier avec le bouton *Créer* et le formulaire
  d'événement (dates, heures, durée).
- **Navigation aux flèches dans la grille de l'agenda** : non fournie par le composant d'agenda ;
  les événements sont atteints avec la touche Tab et la vue Planning les liste de façon séquentielle.
- **Couleurs d'agenda choisies par les utilisateurs** : elles peuvent manquer de contraste ; le
  statut des événements est (ou sera) également transmis sous forme de texte.

L'utilisation au clavier est documentée (en anglais) dans [`KEYBOARD.md`](KEYBOARD.md) et dans
*Paramètres › Accessibilité › Clavier*.

## Établissement de cette déclaration

- Déclaration établie le **1er octobre 2026**, mise à jour le **1er octobre 2026**.
- Technologies utilisées : HTML5, CSS, JavaScript (React, MUI, FullCalendar), WAI-ARIA.
- Outils du pré-audit : revue du code source, axe-core (via un scanner d'accessibilité automatisé) sur Chromium.
- Pages examinées par le pré-audit : voir l'échantillon proposé dans
  [`A10Y_REMEDIATIONS-2026-10-01.md`](A10Y_REMEDIATIONS-2026-10-01.md) (action R-01).

## Retour d'information et contact

Si vous n'arrivez pas à accéder à un contenu ou à un service, vous pouvez nous contacter pour être
orienté vers une alternative accessible ou obtenir le contenu sous une autre forme :

- ouvrir un ticket avec l'étiquette `accessibility` :
  <https://github.com/linagora/twake-calendar-frontend/issues/new?labels=accessibility> ;
- *[déployeur]* : indiquer le contact accessibilité de votre service (adresse électronique,
  formulaire, adresse postale).

## Voies de recours

Cette procédure est à utiliser dans le cas suivant : vous avez signalé au responsable du service un
défaut d'accessibilité qui vous empêche d'accéder à un contenu ou à un service, et vous n'avez pas
obtenu de réponse satisfaisante. Vous pouvez :

- écrire un message au Défenseur des droits : <https://formulaire.defenseurdesdroits.fr/> ;
- contacter le délégué du Défenseur des droits dans votre région :
  <https://www.defenseurdesdroits.fr/carte-des-delegues> ;
- envoyer un courrier par la poste (gratuit, ne pas mettre de timbre) :
  Défenseur des droits — Libre réponse 71120 — 75342 Paris CEDEX 07.

## Pour les déployeurs

1. Copier ce fichier et le [schéma pluriannuel](MULTI_YEAR_PLAN.md), puis compléter les sections *[déployeur]*.
2. Les publier sur votre site.
3. Une fois l'audit RGAA de votre déploiement réalisé, mettre à jour dans votre copie l'état de
   conformité et les résultats de l'audit (date, auditeur, échantillon, taux).
