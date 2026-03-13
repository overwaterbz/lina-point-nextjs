type EvalResult<T> = {
  score: number;
  feedback: string;
  data: T;
};

export async function runWithRecursion<T>(
  generate: (iteration: number) => Promise<T>,
  evaluate: (result: T, iteration: number) => Promise<EvalResult<T>>,
  refine: (result: T, feedback: string, iteration: number) => Promise<T>,
  options?: { maxIterations?: number; minScore?: number }
): Promise<{ result: T; score: number; iterations: number; feedback: string }>
{
  const maxIterations = options?.maxIterations ?? 1;
  const minScore = options?.minScore ?? 0.6;

  let iteration = 1;
  let lastResult = await generate(iteration);
  let evalResult = await evaluate(lastResult, iteration);

  while (evalResult.score < minScore && iteration < maxIterations) {
    lastResult = await refine(evalResult.data, evalResult.feedback, iteration);
    iteration += 1;
    evalResult = await evaluate(lastResult, iteration);
  }

  return {
    result: evalResult.data,
    score: evalResult.score,
    iterations: iteration,
    feedback: evalResult.feedback,
  };
}
