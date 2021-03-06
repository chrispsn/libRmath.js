import { dcauchy } from './dcauchy';
import { pcauchy } from './pcauchy';
import { qcauchy } from './qcauchy';
import { rcauchy } from './rcauchy';

import { MersenneTwister } from '../rng/mersenne-twister';

export function Cauchy(rng = new MersenneTwister(0)) {
  return {
    rcauchy: (n: number, location = 0, scale = 1) =>
      rcauchy(n, location, scale, rng),
    dcauchy,
    pcauchy,
    qcauchy
  };
}
