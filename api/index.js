import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export default async function handler(req, res) {
  // ============================================================
  // CORS
  // ============================================================

  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  // Réponse aux requêtes preflight du navigateur
  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  // L'API accepte uniquement POST
  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Method not allowed",
    });
  }

  try {
    // ============================================================
    // RÉCUPÉRATION DE LA DEMANDE UTILISATEUR
    // ============================================================

    const { query } = req.body || {};

    if (!query || typeof query !== "string") {
      return res.status(400).json({
        error: "Missing query",
        message: "La propriété 'query' est obligatoire.",
      });
    }

    // Protection simple contre une entrée extrêmement longue
    const userQuery = query.trim().slice(0, 5000);

    if (!userQuery) {
      return res.status(400).json({
        error: "Empty query",
      });
    }

    // ============================================================
    // ANALYSE SPEARMATCH
    // ============================================================

    const response = await client.responses.create({
      model: "gpt-5.6-luna",

      instructions: `
Tu es le moteur d'analyse des demandes de SpearMatch.

============================================================
MISSION
============================================================

SpearMatch est un système intelligent de recommandation de matériel de chasse sous-marine.

L'utilisateur n'a aucun questionnaire prédéfini.

Il écrit librement ce qu'il recherche, avec son propre vocabulaire, ses contraintes, ses préférences, ses priorités et éventuellement son niveau.

Ta mission est de transformer cette demande en critères structurés, précis et exploitables par le moteur de recommandation SpearMatch.

IMPORTANT :

Tu NE dois PAS choisir de produit.

Tu NE dois PAS comparer les produits.

Tu NE dois PAS consulter ou inventer les caractéristiques d'un produit.

Tu NE dois PAS calculer le classement final.

Tu NE dois PAS calculer le score d'un produit.

Tu NE dois PAS inventer une information absente.

Tu dois uniquement analyser la demande du client.

La sortie sera ensuite utilisée par un autre système qui :

1. applique les filtres éliminatoires ;
2. élimine les produits incompatibles ;
3. calcule le score de correspondance ;
4. pondère les critères selon les priorités du client ;
5. classe les produits ;
6. affiche les cinq meilleurs résultats.

============================================================
PRINCIPE CENTRAL
============================================================

Chaque information importante détectée dans la demande doit être représentée par :

- une valeur ;
- un statut strict ou souple ;
- une importance ;
- éventuellement une cible, une limite ou une plage.

STRICT et IMPORTANCE sont deux notions totalement différentes.

STRICT répond à :

"Est-ce que cette condition doit éliminer un produit ?"

IMPORTANCE répond à :

"À quel point cette préférence doit-elle influencer le classement ?"

Une condition peut donc être à la fois :

strict = true
importance = 5

Exemple :

"Je veux absolument un roller."

Cela signifie :

configuration = roller
strict = true
importance = 5

Une préférence peut également être souple :

"Je préférerais un roller."

Cela signifie :

configuration = roller
strict = false
importance = 3

============================================================
ÉCHELLE D'IMPORTANCE
============================================================

Utilise exclusivement cette échelle :

0 = critère non mentionné ou aucune préférence identifiable

1 = préférence très faible

2 = préférence secondaire

3 = préférence importante

4 = préférence très importante

5 = priorité absolue exprimée explicitement

L'importance doit venir de la formulation du client.

NE donne PAS automatiquement une importance élevée à un critère simplement parce que ce critère est généralement important.

============================================================
DÉTECTION DU CARACTÈRE STRICT
============================================================

Une demande est STRICTE lorsqu'il est clair que le client considère la condition comme obligatoire.

Indicateurs fréquents :

"absolument"
"obligatoirement"
"impérativement"
"uniquement"
"exclusivement"
"je veux"
"il me faut"
"je refuse"
"je ne veux pas"
"pas plus de"
"maximum"
"au maximum"
"pas moins de"
"minimum"
"au minimum"
"exactement"
"sans exception"

Mais ne te base jamais uniquement sur un mot isolé.

Le contexte et l'intention du client sont prioritaires.

============================================================
PRÉFÉRENCE SOUPLE
============================================================

Une préférence est SOUPLE lorsque le client indique ce qu'il préfère sans rendre la condition obligatoire.

Exemples :

"je préférerais"
"plutôt"
"de préférence"
"si possible"
"j'aimerais"
"ça serait bien"
"ça serait idéal"
"je cherche plutôt"
"je privilégie"
"j'aimerais bien"

Une préférence souple ne doit jamais éliminer un produit.

Elle sert uniquement au classement.

============================================================
BUDGET
============================================================

Le budget est une contrainte prioritaire.

Lorsqu'un client donne un maximum explicite, le maximum est STRICT et ÉLIMINATOIRE.

Exemples :

"maximum 250 €"
"pas plus de 250 €"
"je ne veux pas dépasser 250 €"
"mon budget maximum est de 250 €"

→ maximum = 250
→ strict = true

Un produit dont le prix dépasse ce maximum doit être éliminé par le futur moteur.

Lorsqu'un client donne un budget approximatif :

"autour de 250 €"
"environ 250 €"
"je pensais mettre 250 €"

→ target = 250
→ strict = false

Ne jamais inventer un budget.

Si aucune devise n'est indiquée mais que le contexte utilise clairement l'euro, utiliser EUR.

============================================================
CONFIGURATION
============================================================

La configuration est un critère majeur de SpearMatch.

Les valeurs doivent correspondre aux catégories disponibles dans le CMS.

Les catégories peuvent notamment inclure :

- simple
- double
- triple
- roller
- invert roller
- roller hybride
- pneumatique
- autres catégories réellement présentes dans le CMS

Comprends les synonymes et formulations naturelles.

Exemples :

"roller"
"fusil roller"
"arbalète roller"
→ roller

"double sandow"
"deux sandows"
→ double

"triple sandow"
"trois sandows"
→ triple

Si le client dit :

"je veux absolument un roller"

→ values = ["roller"]
→ strict = true
→ importance = 5

Si le client dit :

"plutôt roller"

→ values = ["roller"]
→ strict = false
→ importance >= 2

Si le client dit :

"roller ou double"

et qu'il présente réellement ces deux possibilités comme acceptables :

→ values = ["roller", "double"]

Si le client interdit une configuration :

"je ne veux surtout pas de roller"

→ excluded = ["roller"]
→ strict = true

Une exclusion stricte doit être traitée comme une contrainte éliminatoire.

============================================================
LONGUEUR
============================================================

Normalise toutes les longueurs en centimètres.

Comprends :

"90 cm"
"90"
"une 90"
"fusil de 90"
"environ 90"
"autour de 90"
"entre 85 et 95"
"au moins 90"
"pas plus de 90"
"exactement 90"

Exemples :

"environ 90 cm"

→ target = 90
→ strict = false

"autour de 90 cm"

→ target = 90
→ strict = false

"entre 85 et 95 cm"

→ minimum = 85
→ maximum = 95

"au moins 90 cm"

→ minimum = 90
→ strict = true

"maximum 90 cm"

→ maximum = 90
→ strict = true

"exactement 90 cm"

→ target = 90
→ strict = true

Ne transforme jamais une approximation en contrainte stricte.

============================================================
PUISSANCE
============================================================

Comprends les formulations naturelles :

"puissant"
"très puissant"
"grosse puissance"
"beaucoup de puissance"
"ça doit taper fort"
"je veux de la puissance"
"je privilégie la puissance"
"puissance moyenne"
"pas besoin de beaucoup de puissance"
"plutôt faible"

Lorsqu'aucune mesure objective n'est fournie, utilise un niveau qualitatif.

Ne fabrique jamais une valeur numérique.

L'importance dépend de la formulation.

Exemples :

"je veux quelque chose de puissant"

→ importance = 3 ou 4

"la puissance est le plus important"

→ importance = 5

"la puissance m'importe peu"

→ importance = 1

============================================================
PRÉCISION
============================================================

Comprends :

"précis"
"très précis"
"bonne précision"
"je privilégie la précision"
"la précision est importante"
"je veux quelque chose de précis"

Ne transforme jamais automatiquement "précis" en distance ou valeur numérique.

Ne crée jamais une distance de tir qui n'a pas été donnée.

============================================================
MANIABILITÉ
============================================================

Comprends :

"maniable"
"très maniable"
"facile à manier"
"facile à utiliser"
"compact"
"léger"
"je privilégie la maniabilité"
"je veux quelque chose de maniable"

Attention :

"léger" et "maniable" sont liés mais ne sont pas synonymes parfaits.

Si le client demande explicitement les deux, conserve les deux préférences.

============================================================
NIVEAU DU CLIENT
============================================================

Détecte le niveau lorsque le client le mentionne.

Catégories :

- débutant
- intermédiaire
- expérimenté
- expert

Exemples :

"je suis débutant"
"je débute"
"je commence"

→ débutant

"je suis expérimenté"

→ expérimenté

"je suis expert"

→ expert

IMPORTANT :

Le niveau du client n'est PAS automatiquement une contrainte éliminatoire.

Il sert principalement de contexte permettant de mieux interpréter ses besoins et ses priorités.

Exemple :

"Je suis débutant et je veux quelque chose de très maniable."

→ niveau = débutant
→ maniabilité = importance élevée

Ne pas transformer automatiquement "débutant" en :

maniabilité = 5

si le client ne l'a pas demandé.

============================================================
HIÉRARCHIE DES PRÉFÉRENCES
============================================================

Le client peut comparer directement plusieurs critères.

Exemples :

"la maniabilité est plus importante que la puissance"

→ maniabilité > puissance

"je privilégie surtout la précision mais je veux aussi de la puissance"

→ précision > puissance

"la puissance est essentielle, la maniabilité secondaire"

→ puissance = 5
→ maniabilité = 2

Lorsque le client donne une hiérarchie explicite, elle doit être respectée.

============================================================
FORMULATIONS D'INTENSITÉ
============================================================

Interprète approximativement les formulations suivantes :

"un peu"
→ importance 1-2

"j'aimerais"
→ importance 2

"je préfère"
→ importance 2-3

"je privilégie"
→ importance 3-4

"important"
→ importance 3

"très important"
→ importance 4

"énormément"
→ importance 5

"essentiel"
→ importance 5

"le plus important"
→ importance 5

"priorité absolue"
→ importance 5

Ces valeurs sont indicatives : le contexte complet de la phrase est prioritaire.

============================================================
PLUSIEURS CRITÈRES
============================================================

Une seule phrase peut contenir plusieurs critères.

Exemple :

"Je suis débutant, je veux un roller de 90 cm maximum 250 €, plutôt puissant et surtout très maniable."

Extraire séparément :

niveau = débutant

configuration = roller

longueur = 90

budget maximum = 250

puissance = préférence

maniabilité = priorité élevée

Ne jamais fusionner plusieurs critères différents en une seule information.

============================================================
LANGAGE FAMILIER ET FAUTES
============================================================

Le client peut utiliser :

- fautes ;
- langage familier ;
- abréviations ;
- phrases incomplètes ;
- termes techniques ;
- formulations approximatives.

Comprends l'intention.

Exemple :

"jsuis débutant jveux un truc qui tape fort mais facile à manier genre 90"

doit être interprété comme :

niveau = débutant
puissance = importante
maniabilité = importante
longueur = environ 90 cm

============================================================
ABSENCE D'INFORMATION
============================================================

C'est une règle ABSOLUE.

Si le client ne parle pas d'un critère :

- ne pas inventer de valeur ;
- ne pas inventer une préférence ;
- ne pas attribuer une importance artificielle.

Le critère doit rester vide ou à null.

Exemple :

"Je veux un roller de 90 cm à moins de 250 €."

Ne pas inventer :

puissance
précision
maniabilité
niveau
matériau
sandows
usage

============================================================
CONTRADICTIONS
============================================================

Si le client se contredit :

NE choisis PAS arbitrairement une version.

Exemple :

"Je veux absolument un roller mais surtout pas un roller."

Conserve les informations contradictoires et ajoute une entrée dans contradictions.

============================================================
AMBIGUÏTÉS
============================================================

Si une formulation est ambiguë :

- ne transforme pas une supposition en fait ;
- choisis l'interprétation la plus raisonnable ;
- indique l'ambiguïté dans ambiguities si nécessaire.

Ne jamais inventer une information pour remplir un champ.

============================================================
AUTRES PRÉFÉRENCES
============================================================

Tout élément pertinent qui ne rentre pas dans les critères principaux doit être conservé dans autres_preferences.

Exemples :

"facile à transporter"
"polyvalent"
"je chasse principalement à trou"
"je veux quelque chose de polyvalent"
"je plonge principalement en Méditerranée"

Ne pas inventer de préférence.

============================================================
RÈGLE DE PRIORITÉ
============================================================

Lorsque plusieurs informations sont présentes, respecte cet ordre logique :

1. contraintes strictes explicites ;
2. exclusions explicites ;
3. budget maximum ;
4. configuration obligatoire ;
5. autres contraintes strictes ;
6. préférences souples ;
7. priorités explicites ;
8. contexte utilisateur ;
9. informations secondaires.

Attention :

Cet ordre ne signifie PAS que les préférences souples sont ignorées.

Il sert à distinguer ce qui élimine de ce qui classe.

============================================================
OBJECTIF DE LA SORTIE
============================================================

La sortie doit être une représentation fidèle de la demande du client.

Elle doit permettre au moteur SpearMatch de répondre à la question :

"Parmi les produits disponibles dans le CMS, lesquels correspondent le mieux à cette demande ?"

L'IA fournit les données.

Le moteur de recommandation prendra ensuite la décision.

NE choisis jamais toi-même les cinq meilleurs produits.

NE donne jamais de produit dans la réponse.

NE donne jamais de score final.

NE donne jamais de classement.

============================================================
RÈGLE FINALE
============================================================

FIDÉLITÉ > SUPPOSITION.

Si tu sais : indique-le.

Si le client le préfère : indique-le comme préférence.

Si le client l'exige : indique-le comme strict.

Si le client l'interdit : indique-le comme exclusion.

Si le client ne le dit pas : ne l'invente pas.
`,

      input: userQuery,

      // ==========================================================
      // SORTIE JSON STRICTEMENT STRUCTURÉE
      // ==========================================================

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
                  },
                  importance: {
                    type: "number"
                  }
                },
                required: [
                  "minimum",
                  "maximum",
                  "target",
                  "currency",
                  "strict",
                  "importance"
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
              },

              ambiguities: {
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
              "contradictions",
              "ambiguities"
            ],

            additionalProperties: false
          }
        }
      }
    });

    // ============================================================
    // RÉCUPÉRATION DU JSON
    // ============================================================

    const result = JSON.parse(response.output_text);

    // ============================================================
    // PETITE NORMALISATION DE SÉCURITÉ
    // ============================================================

    // On s'assure que les niveaux d'importance restent entre 0 et 5.
    const clampImportance = (value) => {
      if (typeof value !== "number" || Number.isNaN(value)) {
        return 0;
      }

      return Math.max(0, Math.min(5, value));
    };

    if (result.budget) {
      result.budget.importance = clampImportance(
        result.budget.importance
      );
    }

    if (result.configuration) {
      result.configuration.importance = clampImportance(
        result.configuration.importance
      );
    }

    if (result.longueur) {
      result.longueur.importance = clampImportance(
        result.longueur.importance
      );
    }

    if (result.puissance) {
      result.puissance.importance = clampImportance(
        result.puissance.importance
      );
    }

    if (result.precision) {
      result.precision.importance = clampImportance(
        result.precision.importance
      );
    }

    if (result.maniabilite) {
      result.maniabilite.importance = clampImportance(
        result.maniabilite.importance
      );
    }

    if (result.niveau) {
      result.niveau.importance = clampImportance(
        result.niveau.importance
      );
    }

    const WEBFLOW_COLLECTION_ID = "6a92ded472714f0a5fb52611";
const webflowToken = process.env.WEBFLOW_API_TOKEN;

if (!webflowToken) {
  throw new Error("WEBFLOW_API_TOKEN is missing");
}

const webflowResponse = await fetch(
  `https://api.webflow.com/v2/collections/${WEBFLOW_COLLECTION_ID}/items`,
  {
    method: "GET",
    headers: {
      Authorization: `Bearer ${webflowToken}`,
      Accept: "application/json"
    }
  }
);

if (!webflowResponse.ok) {
  const errorText = await webflowResponse.text();

  throw new Error(
    `Webflow API ${webflowResponse.status}: ${errorText}`
  );
}

const webflowData = await webflowResponse.json();
const products = webflowData.items || [];
// ============================================================
// SPEARMATCH — MATCHING ENGINE
// ============================================================

function normalizeText(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function toNumber(value) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }

  const cleaned = String(value)
    .replace(/\s/g, "")
    .replace(",", ".")
    .replace(/[^\d.-]/g, "");

  if (!cleaned) return null;

  const number = Number(cleaned);

  return Number.isFinite(number) ? number : null;
}

function clamp(value, min = 0, max = 100) {
  return Math.max(min, Math.min(max, value));
}

function getField(fieldData, names) {
  for (const name of names) {
    if (
      fieldData[name] !== undefined &&
      fieldData[name] !== null &&
      fieldData[name] !== ""
    ) {
      return fieldData[name];
    }
  }

  return null;
}

function levelToScore(level) {
  const value = normalizeText(level);

  if (!value) return null;

  if (
    value.includes("tres faible") ||
    value.includes("tres leger") ||
    value.includes("tres legere")
  ) {
    return 1;
  }

  if (
    value === "faible" ||
    value.includes("faible") ||
    value.includes("legere") ||
    value.includes("leger")
  ) {
    return 2;
  }

  if (
    value.includes("moyenne") ||
    value.includes("moyen") ||
    value.includes("moderee") ||
    value.includes("modere")
  ) {
    return 3;
  }

  if (
    value.includes("tres elevee") ||
    value.includes("tres eleve") ||
    value.includes("exceptionnelle") ||
    value.includes("maximale")
  ) {
    return 5;
  }

  if (
    value.includes("elevee") ||
    value.includes("eleve") ||
    value.includes("forte") ||
    value.includes("fort")
  ) {
    return 4;
  }

  return null;
}

function normalizeConfiguration(value) {
  const config = normalizeText(value);

  if (!config) return "";

  if (config.includes("invert")) {
    return "invert roller";
  }

  if (
    config.includes("roller hybride") ||
    config.includes("hybrid roller")
  ) {
    return "roller hybride";
  }

  if (config.includes("roller")) {
    return "roller";
  }

  if (
    config.includes("pneumatique") ||
    config.includes("pneumatic")
  ) {
    return "pneumatique";
  }

  if (
    config.includes("triple") ||
    config.includes("3 sandow")
  ) {
    return "triple";
  }

  if (
    config.includes("double") ||
    config.includes("2 sandow")
  ) {
    return "double";
  }

  if (
    config.includes("classique") ||
    config.includes("simple") ||
    config.includes("ferme") ||
    config.includes("ouvert")
  ) {
    return "classique";
  }

  return config;
}
function normalizeWebflowProduct(item) {
  const f = item.fieldData || {};

  return {
    id: item.id || null,

    name: getField(f, [
      "name",
      "nom",
      "nom-du-produit",
      "produit"
    ]),

    slug: getField(f, [
      "slug"
    ]),

    price: toNumber(
      getField(f, [
        "prix",
        "price"
      ])
    ),

    length: toNumber(
      getField(f, [
        "longueur",
        "longueur-tube",
        "longueur-cm"
      ])
    ),

    power: toNumber(
      getField(f, [
        "puissance"
      ])
    ),

    precision: toNumber(
      getField(f, [
        "précision",
        "precision"
      ])
    ),

    handling: toNumber(
      getField(f, [
        "maniabilité",
        "maniabilite"
      ])
    ),

    configuration: normalizeConfiguration(
      getField(f, [
        "type-de-configuration",
        "configuration",
        "config"
      ])
    ),

    bands: toNumber(
      getField(f, [
        "nombre-de-sandows",
        "nombre-de-sandow",
        "sandows"
      ])
    ),

    bandDiameter: toNumber(
      getField(f, [
        "diamètre-des-sandows",
        "diametre-des-sandows",
        "diametre-des-sandow"
      ])
    ),

    brand: getField(f, [
      "marque",
      "brand"
    ]),

    material: getField(f, [
      "matériaux",
      "materiaux",
      "material"
    ]),

    image: getField(f, [
      "image",
      "image-url"
    ]),

    offerLink: getField(f, [
      "lien-de-loffre",
      "lien-de-l-offre",
      "lien-offre",
      "url"
    ]),

    raw: item
  };
}

function configurationMatches(product, requestedConfiguration) {
  const wanted = normalizeConfiguration(
    requestedConfiguration
  );

  if (!wanted) return false;

  if (product.configuration === wanted) {
    return true;
  }

  if (
    wanted === "double" &&
    product.bands === 2
  ) {
    return true;
  }

  if (
    wanted === "triple" &&
    product.bands === 3
  ) {
    return true;
  }

  return false;
}

// ============================================================
// FILTRES STRICTS
// ============================================================

function passesStrictFilters(product, criteria) {

  // ----------------------------
  // BUDGET
  // ----------------------------

  if (criteria.budget?.strict) {

    if (
      criteria.budget.maximum !== null &&
      criteria.budget.maximum !== undefined
    ) {
      if (
        product.price === null ||
        product.price > criteria.budget.maximum
      ) {
        return false;
      }
    }

    if (
      criteria.budget.minimum !== null &&
      criteria.budget.minimum !== undefined
    ) {
      if (
        product.price === null ||
        product.price < criteria.budget.minimum
      ) {
        return false;
      }
    }
  }

  // ----------------------------
  // CONFIGURATION
  // ----------------------------

  if (criteria.configuration?.strict) {

    const requestedValues =
      criteria.configuration.values || [];

    const excludedValues =
      criteria.configuration.excluded || [];

    if (requestedValues.length > 0) {

      const matchesAtLeastOne =
        requestedValues.some(value =>
          configurationMatches(product, value)
        );

      if (!matchesAtLeastOne) {
        return false;
      }
    }

    if (excludedValues.length > 0) {

      const isExcluded =
        excludedValues.some(value =>
          configurationMatches(product, value)
        );

      if (isExcluded) {
        return false;
      }
    }
  }

  // ----------------------------
  // LONGUEUR
  // ----------------------------

  if (criteria.longueur?.strict) {

    if (
      criteria.longueur.minimum !== null &&
      criteria.longueur.minimum !== undefined
    ) {
      if (
        product.length === null ||
        product.length < criteria.longueur.minimum
      ) {
        return false;
      }
    }

    if (
      criteria.longueur.maximum !== null &&
      criteria.longueur.maximum !== undefined
    ) {
      if (
        product.length === null ||
        product.length > criteria.longueur.maximum
      ) {
        return false;
      }
    }

    if (
      criteria.longueur.target !== null &&
      criteria.longueur.target !== undefined
    ) {
      if (
        product.length === null ||
        product.length !== criteria.longueur.target
      ) {
        return false;
      }
    }
  }

  return true;
}
// ============================================================
// SCORES DES CRITÈRES
// ============================================================

function scoreNumericPreference(
  productValue,
  requestedLevel
) {
  if (
    productValue === null ||
    productValue === undefined ||
    requestedLevel === null ||
    requestedLevel === undefined
  ) {
    return null;
  }

  const target = levelToScore(requestedLevel);

  if (target === null) {
    return null;
  }

  const difference =
    Math.abs(productValue - target);

  return clamp(
    100 - (difference * 25)
  );
}

function scoreLength(product, criteria) {

  if (!criteria.longueur) {
    return null;
  }

  if (
    criteria.longueur.target === null ||
    criteria.longueur.target === undefined ||
    product.length === null
  ) {
    return null;
  }

  const target =
    criteria.longueur.target;

  const difference =
    Math.abs(product.length - target);

  return clamp(
    100 - (difference * 5)
  );
}

function scoreBudget(product, criteria) {

  if (!criteria.budget) {
    return null;
  }

  if (
    product.price === null ||
    criteria.budget.target === null ||
    criteria.budget.target === undefined
  ) {
    return null;
  }

  const target =
    criteria.budget.target;

  if (target <= 0) {
    return null;
  }

  if (product.price <= target) {
    return 100;
  }

  const differencePercent =
    ((product.price - target) / target) * 100;

  return clamp(
    100 - differencePercent
  );
}

function scoreConfiguration(
  product,
  criteria
) {

  if (!criteria.configuration) {
    return null;
  }

  const requestedValues =
    criteria.configuration.values || [];

  if (requestedValues.length === 0) {
    return null;
  }

  const matches =
    requestedValues.some(value =>
      configurationMatches(product, value)
    );

  return matches ? 100 : 0;
}

// ============================================================
// SCORE FINAL PONDÉRÉ
// ============================================================

function calculateMatchScore(
  product,
  criteria
) {

  const scores = [];
  const breakdown = {};

  function addScore(
    key,
    score,
    importance
  ) {

    if (
      score === null ||
      score === undefined ||
      !Number.isFinite(score) ||
      !Number.isFinite(importance) ||
      importance <= 0
    ) {
      return;
    }

    scores.push({
      score: clamp(score),
      importance
    });

    breakdown[key] =
      Math.round(
        clamp(score) * 10
      ) / 10;
  }

  // BUDGET
  if (
    criteria.budget?.importance > 0 &&
    !criteria.budget.strict
  ) {

    addScore(
      "budget",
      scoreBudget(product, criteria),
      criteria.budget.importance
    );
  }

  // CONFIGURATION
  if (
    criteria.configuration?.importance > 0 &&
    !criteria.configuration.strict
  ) {

    addScore(
      "configuration",
      scoreConfiguration(
        product,
        criteria
      ),
      criteria.configuration.importance
    );
  }

  // LONGUEUR
  if (
    criteria.longueur?.importance > 0
  ) {

    addScore(
      "longueur",
      scoreLength(
        product,
        criteria
      ),
      criteria.longueur.importance
    );
  }

  // PUISSANCE
  if (
    criteria.puissance?.importance > 0
  ) {

    addScore(
      "puissance",
      scoreNumericPreference(
        product.power,
        criteria.puissance.level
      ),
      criteria.puissance.importance
    );
  }

  // PRÉCISION
  if (
    criteria.precision?.importance > 0
  ) {

    addScore(
      "precision",
      scoreNumericPreference(
        product.precision,
        criteria.precision.level
      ),
      criteria.precision.importance
    );
  }

  // MANIABILITÉ
  if (
    criteria.maniabilite?.importance > 0
  ) {

    addScore(
      "maniabilite",
      scoreNumericPreference(
        product.handling,
        criteria.maniabilite.level
      ),
      criteria.maniabilite.importance
    );
  }

  if (scores.length === 0) {

    return {
      score: 100,
      breakdown
    };
  }

  let weightedTotal = 0;
  let totalImportance = 0;

  for (const item of scores) {

    weightedTotal +=
      item.score * item.importance;

    totalImportance +=
      item.importance;
  }

  const finalScore =
    totalImportance > 0
      ? weightedTotal / totalImportance
      : 100;

  return {
    score:
      Math.round(
        clamp(finalScore) * 10
      ) / 10,

    breakdown
  };
}
// ============================================================
// EXPLICATIONS DU MATCH
// ============================================================

function buildReasons(
  product,
  criteria,
  breakdown
) {

  const reasons = [];

  if (
    criteria.budget?.importance > 0 &&
    product.price !== null &&
    criteria.budget.target !== null &&
    criteria.budget.target !== undefined &&
    product.price <= criteria.budget.target
  ) {

    reasons.push(
      `Budget respecté (${product.price} €)`
    );
  }

  if (
    criteria.configuration?.importance > 0 &&
    criteria.configuration.values?.length > 0 &&
    criteria.configuration.values.some(value =>
      configurationMatches(product, value)
    )
  ) {

    reasons.push(
      `Configuration ${product.configuration} conforme`
    );
  }

  if (
    breakdown.longueur !== undefined &&
    criteria.longueur?.target !== null &&
    criteria.longueur?.target !== undefined &&
    product.length !== null
  ) {

    const difference =
      Math.abs(
        product.length -
        criteria.longueur.target
      );

    if (difference === 0) {

      reasons.push(
        `Longueur exactement de ${product.length} cm`
      );

    } else {

      reasons.push(
        `Longueur proche de la cible (${product.length} cm)`
      );
    }
  }

  if (
    breakdown.puissance !== undefined &&
    criteria.puissance?.level
  ) {

    reasons.push(
      "Puissance adaptée au niveau demandé"
    );
  }

  if (
    breakdown.precision !== undefined &&
    criteria.precision?.level
  ) {

    reasons.push(
      "Précision adaptée au niveau demandé"
    );
  }

  if (
    breakdown.maniabilite !== undefined &&
    criteria.maniabilite?.level
  ) {

    reasons.push(
      "Maniabilité adaptée au niveau demandé"
    );
  }

  return reasons.slice(0, 4);
}

// ============================================================
// MATCHING COMPLET
// ============================================================

function matchProducts(
  products,
  criteria
) {

  const normalizedProducts =
    products.map(
      normalizeWebflowProduct
    );

  // 1️⃣ FILTRES STRICTS
  const eligibleProducts =
    normalizedProducts.filter(
      product =>
        passesStrictFilters(
          product,
          criteria
        )
    );

  // 2️⃣ CALCUL DES SCORES
  const scoredProducts =
    eligibleProducts.map(
      product => {

        const result =
          calculateMatchScore(
            product,
            criteria
          );

        return {
          product,
          score: result.score,
          breakdown: result.breakdown,

          reasons: buildReasons(
            product,
            criteria,
            result.breakdown
          )
        };
      }
    );

  // 3️⃣ CLASSEMENT
  scoredProducts.sort(
    (a, b) => {

      // Score principal
      if (b.score !== a.score) {
        return b.score - a.score;
      }

      // Départage par longueur
      const target =
        criteria.longueur?.target;

      if (
        target !== null &&
        target !== undefined &&
        a.product.length !== null &&
        b.product.length !== null
      ) {

        const aDistance =
          Math.abs(
            a.product.length - target
          );

        const bDistance =
          Math.abs(
            b.product.length - target
          );

        if (aDistance !== bDistance) {
          return aDistance - bDistance;
        }
      }

      // Dernier départage : prix
      if (
        a.product.price !== null &&
        b.product.price !== null
      ) {
        return (
          a.product.price -
          b.product.price
        );
      }

      return 0;
    }
  );

  // 4️⃣ TOP 5
  return {
    totalProducts:
      normalizedProducts.length,

    eligibleCount:
      eligibleProducts.length,

    results:
      scoredProducts.slice(0, 5)
  };
}

const matching =
  matchProducts(
    products,
    result
  );

// ============================================================
// RÉPONSE FINALE
// ============================================================

return res.status(200).json({
  criteria: result,
  productsCount: products.length,
  products,
  matching
});
} catch (error) {
  console.error("SpearMatch API error:", error);

  return res.status(500).json({
    error: "Internal server error",
    details: error.message,
  });
}
