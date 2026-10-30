import { createContext, useContext } from 'react';

/** El momento de la partida que se está pintando y si su tarjeta protagonista acaba de llegar. */
export type Stage = {
  /** Cambia exactamente cuando cambia la fase: la tarjeta se monta de nuevo. */
  key: string;
  /** Entra con «Cambio de fase» (docs/PLAN-8.md §3). */
  entering: boolean;
};

/** Atributo con el que se marcan las tarjetas que salen y entran al cambiar de fase. */
export const STAGE_CARD = 'data-stage-card';

/** Lo que está tapado: sus tarjetas no salen como fantasma, que lo destaparía. */
export const STAGE_HIDDEN = 'data-stage-hidden';

export const StageContext = createContext<Stage>({ key: 'quieta', entering: false });

export function useStage(): Stage {
  return useContext(StageContext);
}
