import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export default async function handler(req, res) {
  // =========================
  // CORS
  // =========================

  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Method not allowed",
    });
  }

  try {
    const { query } = req.body || {};

    if (!query || typeof query !== "string") {
      return res.status(400).json({
        error: "Missing query",
      });
    }

    // =========================
    // IA SPEARMATCH
    // =========================

    const response = await client.responses.create({
      model: "gpt-5.6-luna",

      instructions: `
Tu es le moteur d'analyse des demandes de SpearMatch.

SpearMatch est un système de recommandation d'arbalètes de chasse sous-marine.

L'utilisateur n'a PAS de questionnaire prédéfini.
Il écrit librement ce qu'il recherche dans une zone de texte.

Ta mission est de comprendre cette demande en langage naturel et de la transformer en critères structurés.

IMPORTANT :

Tu ne choisis PAS les arbalètes.
Tu ne fais PAS le classement.
Tu ne calcules PAS le score final.
Tu ne dois PAS inventer de caractéristiques concernant les produits.

Ton unique rôle est de transformer la demande du client en une représentation structurée qui sera ensuite utilisée par un moteur de filtrage et de scoring.

━━━━━━━━━━━━━━━━━━━━
1. STRICT VS SOUPLE
━━━━━━━━━━━━━━━━━━━━

Chaque préférence doit être classée comme :

STRICTE :
Le client considère cette condition comme obligatoire.
Un produit qui ne respecte pas cette condition devra être éliminé.

SOUPLE :
Le client exprime une préférence.
Elle ne doit jamais éliminer un produit.
Elle influence uniquement son score.

Exemples :

"Je veux absolument un roller"
→ configuration roller
→ strict true

"Il me faut obligatoirement un roller"
→ configuration roller
→ strict true

"Je cherche un roller"
→ configuration roller
→ strict false

"Je préférerais un roller"
→ configuration roller
→ strict false

"Plutôt un roller"
→ configuration roller
→ strict false

"Un roller serait idéal"
→ configuration roller
→ strict false

"Je ne veux surtout pas de roller"
→ configuration roller
→ excluded true
→ strict true

Les mots suivants indiquent généralement une contrainte forte :

absolument
obligatoirement
impérativement
exclusivement
uniquement
maximum
au maximum
pas plus de
minimum
au minimum
pas moins de
exactement
je refuse
je ne veux pas

Mais le contexte prime toujours sur un mot isolé.

━━━━━━━━━━━━━━━━━━━━
2. BUDGET
━━━━━━━━━━━━━━━━━━━━

Le budget est un critère prioritaire.

Lorsqu'un maximum explicite est donné, il est éliminatoire.

"maximum 250 €"
→ maximum 250
→ strict true

"je ne veux pas dépasser 300 €"
→ maximum 300
→ strict true

"mon budget est de 250 €"
→ maximum 250
→ strict true

"autour de 250 €"
→ cible 250
→ strict false

"environ 250 €"
→ cible 250
→ strict false

Ne jamais inventer un budget.

━━━━━━━━━━━━━━━━━━━━
3. CONFIGURATION
━━━━━━━━━━━━━━━━━━━━

La configuration est un critère majeur.

Les catégories peuvent notamment être :

simple
double
triple
roller
invert roller
roller hybride
pneumatique
autres configurations présentes dans le CMS

Comprends les formulations naturelles.

"fusil roller"
"arbalète roller"
"roller"
→ roller

"double sandow"
"deux sandows"
→ double

"triple sandow"
"trois sandows"
→ triple

Si plusieurs configurations sont possibles et qu'elles sont présentées comme des alternatives :
→ conserver toutes les configurations.

Si une configuration est obligatoire :
→ strict true.

Si elle est seulement préférée :
→ strict false.

Si elle est interdite :
→ excluded true.

━━━━━━━━━━━━━━━━━━━━
4. LONGUEUR
━━━━━━━━━━━━━━━━━━━━

Normalise les longueurs en centimètres.

"90 cm"
"90"
"une 90"
→ cible 90

"environ 90 cm"
"autour de 90 cm"
→ cible 90
→ strict false

"entre 85 et 95 cm"
→ minimum 85
→ maximum 95

"au moins 90 cm"
→ minimum 90
→ strict true

"maximum 90 cm"
→ maximum 90
→ strict true

"exactement 90 cm"
→ cible 90
→ strict true

Ne transforme pas une approximation en contrainte stricte.

━━━━━━━━━━━━━━━━━━━━
5. PUISSANCE
━━━━━━━━━━━━━━━━━━━━

Comprends notamment :

puissant
très puissant
grosse puissance
beaucoup de puissance
puissance importante
peu puissant
puissance moyenne
je veux quelque chose qui tape fort

Utilise une évaluation qualitative lorsqu'aucune valeur numérique n'est fournie.

Ne jamais inventer une valeur numérique.

━━━━━━━━━━━━━━━━━━━━
6. PRÉCISION
━━━━━━━━━━━━━━━━━━━━

Comprends notamment :

précis
très précis
bonne précision
précision importante
je privilégie la précision
je veux quelque chose de précis

Ne jamais inventer une distance de tir.

━━━━━━━━━━━━━━━━━━━━
7. MANIABILITÉ
━━━━━━━━━━━━━━━━━━━━

Comprends notamment :

maniable
très maniable
facile à manier
facile à utiliser
compact
léger
je privilégie la maniabilité

Attention :

"léger" et "maniable" sont liés mais ne sont pas exactement synonymes.

Si les deux sont demandés, conserve les deux informations.

━━━━━━━━━━━━━━━━━━━━
8. NIVEAU
━━━━━━━━━━━━━━━━━━━━

Détecte :

débutant
intermédiaire
expérimenté
expert

Exemples :

"je suis débutant"
"je commence"
→ débutant

"je suis expérimenté"
→ expérimenté

Le niveau n'est PAS automatiquement éliminatoire.

Il peut influencer la pertinence de certaines caractéristiques.

━━━━━━━━━━━━━━━━━━━━
9. PRIORITÉS
━━━━━━━━━━━━━━━━━━━━

Le client peut hiérarchiser ses préférences.

"Je privilégie la maniabilité"
→ maniabilité importance 4

"Le plus important pour moi est la précision"
→ précision importance 5

"Je veux surtout quelque chose de puissant"
→ puissance importance 4

"La maniabilité est plus importante que la puissance"
→ maniabilité > puissance

"Je veux surtout de la précision, mais aussi de la puissance"
→ précision > puissance

Utilise cette échelle :

0 = non mentionné
1 = faible
2 = moyenne
3 = importante
4 = très importante
5 = priorité absolue

Ne donne jamais artificiellement une importance élevée à un critère simplement parce qu'il est généralement important.

L'importance doit venir de la demande du client.

━━━━━━━━━━━━━━━━━━━━
10. AUTRES PRÉFÉRENCES
━━━━━━━━━━━━━━━━━━━━

Tout élément pertinent qui ne correspond pas aux critères principaux doit être conservé.

Exemples :

facile à transporter
polyvalent
chasse à trou
chasse à l'agachon
usage particulier
préférence personnelle

Ne rien inventer.

━━━━━━━━━━━━━━━━━━━━
11. INFORMATIONS ABSENTES
━━━━━━━━━━━━━━━━━━━━

Si un critère n'est pas mentionné :

ne lui attribue aucune valeur ;
ne suppose pas que le client s'en fiche ;
ne crée aucune préférence ;
importance = 0.

Exemple :

"Je veux un roller de 90 cm à moins de 250 €."

Ne pas inventer :

puissance
précision
maniabilité
niveau
matériaux
sandows

━━━━━━━━━━━━━━━━━━━━
12. CONTRADICTIONS
━━━━━━━━━━━━━━━━━━━━

Si la demande contient une contradiction, ne choisis pas arbitrairement.

Exemple :

"Je veux absolument un roller mais surtout pas un roller."

Conserve l'information contradictoire et signale-la dans contradictions.

━━━━━━━━━━━━━━━━━━━━
13. LANGAGE NATUREL
━━━━━━━━━━━━━━━━━━━━

Le client peut utiliser :

fautes d'orthographe
abréviations
langage familier
phrases incomplètes
vocabulaire technique
synonymes
formulations approximatives

Comprends l'intention plutôt que de rechercher uniquement des mots exacts.

Exemple :

"jsuis débutant, jveux un truc qui tape fort mais facile à manier, genre 90"

doit devenir :

niveau = débutant
puissance = importante
maniabilité = importante
longueur = environ 90 cm

━━━━━━━━━━━━━━━━━━━━
14. UNITÉS
━━━━━━━━━━━━━━━━━━━━

Normalise les longueurs en centimètres.

Normalise les budgets en euros lorsque la devise est identifiable.

Ne convertis pas arbitrairement une devise inconnue.

━━━━━━━━━━━━━━━━━━━━
15. RÈGLE ABSOLUE : NE JAMAIS INVENTER
━━━━━━━━━━━━━━━━━━━━

Ne jamais inventer :

budget
longueur
configuration
puissance
précision
maniabilité
niveau
préférence
caractéristique produit

Si une information n'est pas présente ou raisonnablement déductible :
elle reste absente.

━━━━━━━━━━━━━━━━━━━━
16. OBJECTIF FINAL
━━━━━━━━━━━━━━━━━━━━

La sortie sera utilisée par un moteur SpearMatch qui effectuera ensuite :

1. filtres éliminatoires ;
2. contraintes strictes ;
3. calcul du score de correspondance ;
4. pondération selon les priorités ;
5. classement ;
6. affichage des cinq meilleurs produits.

Tu ne réalises aucune de ces étapes.

Tu fournis uniquement les critères structurés.
`,

      input: query,

      text: {
        format: {
          type: "json_schema",
          name: "spearmatch_criteria",
          strict: true,

          schema: {
            type: "object",

            properties: {
              budget: {
                type: "object",
                properties: {
                  minimum: {
                    type: ["number", "null"]
                  },
                  maximum: {
                    type: ["number", "null"]
                  },
                  target: {
                    type: ["number", "null"]
                  },
                  currency: {
                    type: ["string", "null"]
                  },
                  strict: {
                    type: "boolean"
                  }
                },
                required: [
                  "minimum",
                  "maximum",
                  "target",
                  "currency",
                  "strict"
                ],
                additionalProperties: false
              },

              configuration: {
                type: "object",
                properties: {
                  values: {
                    type: "array",
                    items: {
                      type: "string"
                    }
                  },
                  excluded: {
                    type: "array",
                    items: {
                      type: "string"
                    }
                  },
                  strict: {
                    type: "boolean"
                  },
                  importance: {
                    type: "number"
                  }
                },
                required: [
                  "values",
                  "excluded",
                  "strict",
                  "importance"
                ],
                additionalProperties: false
              },

              longueur: {
                type: "object",
                properties: {
                  minimum: {
                    type: ["number", "null"]
                  },
                  maximum: {
                    type: ["number", "null"]
                  },
                  target: {
                    type: ["number", "null"]
                  },
                  strict: {
                    type: "boolean"
                  },
                  importance: {
                    type: "number"
                  }
                },
                required: [
                  "minimum",
                  "maximum",
                  "target",
                  "strict",
                  "importance"
                ],
                additionalProperties: false
              },

              puissance: {
                type: "object",
                properties: {
                  level: {
                    type: ["string", "null"]
                  },
                  importance: {
                    type: "number"
                  }
                },
                required: [
                  "level",
                  "importance"
                ],
                additionalProperties: false
              },

              precision: {
                type: "object",
                properties: {
                  level: {
                    type: ["string", "null"]
                  },
                  importance: {
                    type: "number"
                  }
                },
                required: [
                  "level",
                  "importance"
                ],
                additionalProperties: false
              },

              maniabilite: {
                type: "object",
                properties: {
                  level: {
                    type: ["string", "null"]
                  },
                  importance: {
                    type: "number"
                  }
                },
                required: [
                  "level",
                  "importance"
                ],
                additionalProperties: false
              },

              niveau: {
                type: "object",
                properties: {
                  value: {
                    type: ["string", "null"]
                  },
                  importance: {
                    type: "number"
                  }
                },
                required: [
                  "value",
                  "importance"
                ],
                additionalProperties: false
              },

              autres_preferences: {
                type: "array",
                items: {
                  type: "string"
                }
              },

              contradictions: {
                type: "array",
                items: {
                  type: "string"
                }
              }
            },

            required: [
              "budget",
              "configuration",
              "longueur",
              "puissance",
              "precision",
              "maniabilite",
              "niveau",
              "autres_preferences",
              "contradictions"
            ],

            additionalProperties: false
          }
        }
      }
    });

    const result = JSON.parse(response.output_text);

    return res.status(200).json(result);

  } catch (error) {
    console.error(error);

    return res.status(500).json({
      error: "Internal server error",
      details: error.message
    });
  }
}
