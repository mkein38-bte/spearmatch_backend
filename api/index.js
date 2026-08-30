import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export default async function handler(req, res) {
  // CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  // Preflight request
  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Method not allowed",
    });
  }

  try {
    const { query } = req.body;

    if (!query || typeof query !== "string") {
      return res.status(400).json({
        error: "Missing query",
      });
    }

    const response = await client.responses.create({
      model: "gpt-5.6-luna",

      instructions: `
Tu es le moteur d'analyse de SpearMatch.

Ta mission est de transformer une demande libre concernant une arbalète de chasse sous-marine en critères structurés.

RÈGLES FONDAMENTALES :

1. Toute demande explicitement stricte est une contrainte.
2. Le budget maximum est éliminatoire lorsqu'il est indiqué.
3. Une configuration explicitement demandée de manière stricte est éliminatoire.
4. Une préférence souple ne doit jamais éliminer un produit.
5. Une information absente de la demande reste absente.
6. Ne jamais inventer une préférence.
7. Comprendre le langage naturel, les synonymes et les formulations approximatives.
8. Déterminer l'importance des critères à partir de la formulation du client.
9. Le résultat sera utilisé pour comparer la demande avec les produits du CMS SpearMatch.
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
                  maximum: { type: ["number", "null"] },
                  strict: { type: "boolean" }
                },
                required: ["maximum", "strict"],
                additionalProperties: false
              },

              configuration: {
                type: "object",
                properties: {
                  value: { type: ["string", "null"] },
                  strict: { type: "boolean" },
                  importance: { type: "number" }
                },
                required: ["value", "strict", "importance"],
                additionalProperties: false
              },

              longueur: {
                type: "object",
                properties: {
                  minimum: { type: ["number", "null"] },
                  maximum: { type: ["number", "null"] },
                  cible: { type: ["number", "null"] },
                  strict: { type: "boolean" },
                  importance: { type: "number" }
                },
                required: [
                  "minimum",
                  "maximum",
                  "cible",
                  "strict",
                  "importance"
                ],
                additionalProperties: false
              },

              puissance: {
                type: "object",
                properties: {
                  importance: { type: "number" },
                  niveau: { type: ["string", "null"] }
                },
                required: ["importance", "niveau"],
                additionalProperties: false
              },

              precision: {
                type: "object",
                properties: {
                  importance: { type: "number" },
                  niveau: { type: ["string", "null"] }
                },
                required: ["importance", "niveau"],
                additionalProperties: false
              },

              maniabilite: {
                type: "object",
                properties: {
                  importance: { type: "number" },
                  niveau: { type: ["string", "null"] }
                },
                required: ["importance", "niveau"],
                additionalProperties: false
              },

              niveau: {
                type: "object",
                properties: {
                  value: { type: ["string", "null"] },
                  importance: { type: "number" }
                },
                required: ["value", "importance"],
                additionalProperties: false
              },

              autres_preferences: {
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
              "autres_preferences"
            ],

            additionalProperties: false
          }
        }
      }
    });

    return res.status(200).json(
      JSON.parse(response.output_text)
    );

  } catch (error) {
    console.error(error);

    return res.status(500).json({
      error: "Internal server error",
      details: error.message
    });
  }
}
