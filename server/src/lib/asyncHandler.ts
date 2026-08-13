import type { NextFunction, Request, RequestHandler, Response } from "express";

/**
 * O Express 4 não captura rejeições de handlers `async`: um `throw` dentro de
 * uma rota assíncrona vira `unhandledRejection` e, no Node 18+, **derruba o
 * processo**. Na prática o servidor morria na primeira query que falhasse e o
 * navegador via ERR_CONNECTION_REFUSED em vez de um erro HTTP.
 *
 * Este wrapper encaminha a rejeição para o middleware de erro.
 */
export function asyncHandler(handler: RequestHandler): RequestHandler {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(handler(req, res, next)).catch(next);
  };
}
