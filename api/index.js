import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export default async function handler(req, res) {
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

1. Toute demande explicitement stricte doit être considérée comme une contrainte.
2. Le budget maximum est toujours éliminatoire lorsqu'il est indiqué.
3. Une configuration explicitement demandée de manière stricte est éliminatoire.
4. Une préférence souple ne doit pas éliminer un produit : elle influence son score.
5. Une information absente de la demande doit rester absente.
6. Ne jamais inventer une préférence que le client n'a pas exprimée.
7. L'IA doit comprendre le langage naturel, les synonymes et les formulations approximatives.
8. L'importance des critères doit être déterminée à partir de la façon dont le client formule sa demande.
9. Le résultat doit permettre ensuite à un moteur de comparer les critères avec les 50 arbalètes du CMS.
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
                  maximum: {
                    type: ["number", "null"]
                  },
                  strict: {
                    type: "boolean"
                  }
                },
                required: ["maximum", "strict"],
                additionalProperties: false
              },

              configuration: {
                type: "object",
                properties: {
                  value: {
                    type: ["string", "null"]
                  },
                  strict: {
                    type: "boolean"
                  },
                  importance: {
                    type: "number"
                  }
                },
                required: ["value", "strict", "importance"],
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
                  cible: {
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
                  "cible",
                  "strict",
                  "importance"
                ],
                additionalProperties: false
              },

              puissance: {
                type: "object",
                properties: {
                  importance: {
                    type: "number"
                  },
                  niveau: {
                    type: ["string", "null"]
                  }
                },
                required: ["importance", "niveau"],
                additionalProperties: false
              },

              precision: {
                type: "object",
                properties: {
                  importance: {
                    type: "number"
                  },
                  niveau: {
                    type: ["string", "null"]
                  }
                },
                required: ["importance", "niveau"],
                additionalProperties: false
              },

              maniabilite: {
                type: "object",
                properties: {
                  importance: {
                    type: "number"
                  },
                  niveau: {
                    type: ["string", "null"]
                  }
                },
                required: ["importance", "niveau"],
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
