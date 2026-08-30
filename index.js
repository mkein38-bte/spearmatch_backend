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
      model: "gpt-5.6",
      input: [
        {
          role: "system",
          content:
            "Tu es le moteur d'analyse de SpearMatch. Transforme la demande libre d'un client en critères structurés pour rechercher une arbalète. Respecte strictement les contraintes exprimées par le client.",
        },
        {
          role: "user",
          content: query,
        },
      ],
    });

    return res.status(200).json({
      result: response.output_text,
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      error: "Internal server error",
    });
  }
}
