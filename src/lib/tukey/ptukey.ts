/*  AUTHOR
 *  Jacob Bogers, jkfbogers@gmail.com
 *  March 18, 2017
 *
 *  ORIGINAL AUTHOR
 *  Mathlib : A C Library of Special Functions
 *  Copyright (C) 1998       Ross Ihaka
 *  Copyright (C) 2000--2007 The R Core Team
 *
 *  This program is free software; you can redistribute it and/or modify
 *  it under the terms of the GNU General Public License as published by
 *  the Free Software Foundation; either version 2 of the License, or
 *  (at your option) any later version.
 *
 *  This program is distributed in the hope that it will be useful,
 *  but WITHOUT ANY WARRANTY; without even the implied warranty of
 *  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 *  GNU General Public License for more details.
 *
 *  You should have received a copy of the GNU General Public License
 *  along with this program; if not, a copy is available at
 *  https://www.R-project.org/Licenses/
 *
 *  SYNOPSIS
 *
 *    #include <Rmath.h>
 *    double ptukey(q, rr, cc, df, lower_tail, log_p);
 *
 *  DESCRIPTION
 *
 *    Computes the probability that the maximum of rr studentized
 *    ranges, each based on cc means and with df degrees of freedom
 *    for the standard error, is less than q.
 *
 *    The algorithm is based on that of the reference.
 *
 *  REFERENCE
 *
 *    Copenhaver, Margaret Diponzio & Holland, Burt S.
 *    Multiple comparisons of simple effects in
 *    the two-way analysis of variance with fixed effects.
 *    Journal of Statistical Computation and Simulation,
 *    Vol.30, pp.1-15, 1988.
*/

import * as debug from 'debug';
import { wprob } from './wprob';

import {
  //M_1_SQRT_2PI,
  ME,
  ML_ERR_return_NAN,
  ML_ERROR,
  R_DT_0,
  R_DT_1
} from '../common/_general';

import { R_DT_val } from '../common/_general';
import { lgammafn } from '../gamma/lgamma_fn';
import { map } from '../r-func';

const { isNaN: ISNAN, isFinite: R_FINITE } = Number;
const { exp, sqrt, log, LN2: M_LN2 } = Math;

const printer_ptukey = debug('_ptukey');

export function ptukey<T>(
  qq: T,
  rr: number,
  cc: number,
  df: number,
  lower_tail: boolean = true,
  log_p: boolean = false,
 // normal: INormal
): T {
  return map(qq)(q =>
    _ptukey(q, rr, cc, df, lower_tail, log_p)
  ) as any;
}

/*
> ptukey
function (q, nmeans, df, nranges = 1, lower.tail = TRUE, log.p = FALSE)
.Call(C_ptukey, q, nranges, nmeans, df, lower.tail, log.p)
<bytecode: 0x000000001cde3048>
<environment: namespace:stats>

double ptukey(
	double q, // q
	double rr, // nranges
	double cc, // nmeans
	double df, // df
  int lower_tail, // lowertail
	int log_p //logp
*/
export function _ptukey(
  q: number,
  rr: number,
  cc: number,
  df: number,
  lower_tail: boolean,
  log_p: boolean
): number {
  /*  function ptukey() [was qprob() ]:
    
        q = value of studentized range
        rr = no. of rows or groups
        cc = no. of columns or treatments
        df = degrees of freedom of error term
        ir[0] = error flag = 1 if wprob probability > 1
        ir[1] = error flag = 1 if qprob probability > 1
    
        qprob = returned probability integral over [0, q]
    
        The program will not terminate if ir[0] or ir[1] are raised.
    
        All references in wprob to Abramowitz and Stegun
        are from the following reference:
    
        Abramowitz, Milton and Stegun, Irene A.
        Handbook of Mathematical Functions.
        New York:  Dover publications, Inc. (1970).
    
        All constants taken from this text are
        given to 25 significant digits.
    
        nlegq = order of legendre quadrature
        ihalfq = int ((nlegq + 1) / 2)
        eps = max. allowable value of integral
        eps1 & eps2 = values below which there is
                  no contribution to integral.
    
        d.f. <= dhaf:	integral is divided into ulen1 length intervals.  else
        d.f. <= dquar:	integral is divided into ulen2 length intervals.  else
        d.f. <= deigh:	integral is divided into ulen3 length intervals.  else
        d.f. <= dlarg:	integral is divided into ulen4 length intervals.
    
        d.f. > dlarg:	the range is used to calculate integral.
    
        M_LN2 = log(2)
    
        xlegq = legendre 16-point nodes
        alegq = legendre 16-point coefficients
    
        The coefficients and nodes for the legendre quadrature used in
        qprob and wprob were calculated using the algorithms found in:
    
        Stroud, A. H. and Secrest, D.
        Gaussian Quadrature Formulas.
        Englewood Cliffs,
        New Jersey:  Prentice-Hall, Inc, 1966.
    
        All values matched the tables (provided in same reference)
        to 30 significant digits.
    
        f(x) = .5 + erf(x / sqrt(2)) / 2      for x > 0
    
        f(x) = erfc( -x / sqrt(2)) / 2	      for x < 0
    
        where f(x) is standard normal c. d. f.
    
        if degrees of freedom large, approximate integral
        with range distribution.
     */
  const nlegq = 16;
  const ihalfq = 8;

  /*  const double eps = 1.0; not used if = 1 */
  const eps1 = -30.0;
  const eps2 = 1.0e-14;
  const dhaf = 100.0;
  const dquar = 800.0;
  const deigh = 5000.0;
  const dlarg = 25000.0;
  const ulen1 = 1.0;
  const ulen2 = 0.5;
  const ulen3 = 0.25;
  const ulen4 = 0.125;
  const xlegq = [
    0.98940093499164993259615417345,
    0.944575023073232576077988415535,
    0.865631202387831743880467897712,
    0.755404408355003033895101194847,
    0.617876244402643748446671764049,
    0.458016777657227386342419442984,
    0.28160355077925891323046050146,
    0.95012509837637440185319335425e-1
  ];
  const alegq = [
    0.27152459411754094851780572456e-1,
    0.622535239386478928628438369944e-1,
    0.951585116824927848099251076022e-1,
    0.124628971255533872052476282192,
    0.149595988816576732081501730547,
    0.16915651939500253818931207903,
    0.182603415044923588866763667969,
    0.189450610455068496285396723208
  ];
  //double
  let ans: number;
  let f2: number;
  let f21: number;
  let f2lf: number;
  let ff4: number;
  let otsum: number;
  let qsqz: number;
  let rotsum: number;
  //let t1: number;
  let twa1: number;
  let ulen: number;
  let wprb: number;
  //let j: number;

  if (ISNAN(q) || ISNAN(rr) || ISNAN(cc) || ISNAN(df)) {
    return ML_ERR_return_NAN(printer_ptukey);
  }

  if (q <= 0) {
    return R_DT_0(lower_tail, log_p);
  }

  /* df must be > 1 */
  /* there must be at least two values */

  if (df < 2 || rr < 1 || cc < 2) return ML_ERR_return_NAN(printer_ptukey);

  if (!R_FINITE(q)) return R_DT_1(lower_tail, log_p);

  if (df > dlarg) return R_DT_val(lower_tail, log_p, wprob(q, rr, cc));

  /* calculate leading constant */

  f2 = df * 0.5;
  /* lgammafn(u) = log(gamma(u)) */
  f2lf = f2 * log(df) - df * M_LN2 - lgammafn(f2);
  f21 = f2 - 1.0;

  /* integral is divided into unit, half-unit, quarter-unit, or */
  /* eighth-unit length intervals depending on the value of the */
  /* degrees of freedom. */

  ff4 = df * 0.25;
  if (df <= dhaf) ulen = ulen1;
  else if (df <= dquar) ulen = ulen2;
  else if (df <= deigh) ulen = ulen3;
  else ulen = ulen4;

  f2lf += log(ulen);

  /* integrate over each subinterval */

  ans = 0.0;
  otsum = 0.0; // to let typscript linting know it is used , it is within the for loop
  for (let i = 1; i <= 50; i++) {
    otsum = 0.0;

    /* legendre quadrature with order = nlegq */
    /* nodes (stored in xlegq) are symmetric around zero. */

    twa1 = (2 * i - 1) * ulen;

    for (let jj = 1; jj <= nlegq; jj++) {
      const j = ihalfq < jj ? jj - ihalfq - 1 : jj - 1;
      const t1 =
        ihalfq < jj
          ? f2lf +
            f21 * log(twa1 + xlegq[j] * ulen) -
            (xlegq[j] * ulen + twa1) * ff4
          : f2lf +
            f21 * log(twa1 - xlegq[j] * ulen) +
            (xlegq[j] * ulen - twa1) * ff4;

      /* if exp(t1) < 9e-14, then doesn't contribute to integral */
      if (t1 >= eps1) {
        if (ihalfq < jj) {
          qsqz = q * sqrt((xlegq[j] * ulen + twa1) * 0.5);
        } else {
          qsqz = q * sqrt((-(xlegq[j] * ulen) + twa1) * 0.5);
        }

        /* call wprob to find integral of range portion */

        wprb = wprob(qsqz, rr, cc);
        rotsum = wprb * alegq[j] * exp(t1);
        otsum += rotsum;
      }
      /* end legendre integral for interval i */
      /* L200: */
    } //for

    /* if integral for interval i < 1e-14, then stop.
         * However, in order to avoid small area under left tail,
         * at least  1 / ulen  intervals are calculated.
         */
    if (i * ulen >= 1.0 && otsum <= eps2) break;

    /* end of interval i */
    /* L330: */

    ans += otsum;
  } //for

  if (otsum > eps2) {
    /* not converged */
    ML_ERROR(ME.ME_PRECISION, 'ptukey', printer_ptukey);
  }
  if (ans > 1) ans = 1;
  return R_DT_val(lower_tail, log_p, ans);
}
