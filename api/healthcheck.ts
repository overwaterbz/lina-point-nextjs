// API endpoint for health checks
import { NextApiRequest, NextApiResponse } from "next";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  try {
    // Example: Check DB connection, last suggestion/refinement, etc.
    // You can extend this with more checks as needed.
    res.status(200).json({
      status: "ok",
      timestamp: new Date().toISOString(),
      message: "Agentic system healthy.",
    });
  } catch (error) {
    res.status(500).json({ status: "error", error: error?.toString() });
  }
}
