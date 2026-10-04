import { describe, expect, it } from 'vitest';
import { cellNumber, classOf, positionOf, positionText, quantileBreaks } from '../../src/lib/stats';
import { fmtValue, MISSING, caveatFor } from '../../src/components/maps/format';
import type { LayerT } from '../../src/types';

describe('map computations', () => {
  it('quantile class breaks: five classes over the published values, empty cells left out', () => {
    const vals = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(String).concat(['', '']).map(cellNumber);
    const b = quantileBreaks(vals);
    [2.8, 4.6, 6.4, 8.2].forEach((x, i) => expect(b[i]).toBeCloseTo(x, 9)); // d3 scaleQuantile (R-7)
    expect(classOf(1, b)).toBe(0);
    expect(classOf(3, b)).toBe(1);
    expect(classOf(10, b)).toBe(4);
    expect(classOf(null, b)).toBeNull();
  });
  it('position in the ordered list: ties share a position, missing values are not counted', () => {
    const vals = ['10', '20', '20', '5', ''].map(cellNumber);
    expect(positionOf(20, vals)).toEqual({ position: 1, of: 4, tied: 2 });
    expect(positionOf(10, vals)).toEqual({ position: 3, of: 4, tied: 1 });
    expect(positionText(positionOf(20, vals))).toBe('tied 1st highest of 4');
    expect(positionText(positionOf(5, vals))).toBe('4th highest of 4');
    expect(positionOf(null, vals)).toBeNull();
  });
  it('an empty cell is a missing value, never zero', () => {
    expect(cellNumber('')).toBeNull();
    expect(cellNumber('0')).toBe(0);
    const layer = { id: 'x', unit: 'percent', type: 'numeric', caveats: '', higher_is: 'worse' } as unknown as LayerT;
    expect(fmtValue('', layer)).toBe(MISSING);
    expect(fmtValue('', layer)).not.toMatch(/^0/);
    expect(fmtValue('12.5', layer)).toBe('12.5%');
  });
  it('finds the caveat sentence that names an area', () => {
    const layer = { caveats: 'Coosa and Lamar counties are empty because the file reports 0 primary care physicians there (numerator 0), so no ratio exists; this is not suppression. Connecticut state value is blank in the supplement.' } as LayerT;
    expect(caveatFor(layer, 'Coosa')).toMatch(/^Coosa and Lamar counties are empty/);
    expect(caveatFor(layer, 'Connecticut')).toBe('Connecticut state value is blank in the supplement.');
    expect(caveatFor(layer, 'Madison')).toBe('');
  });
});
