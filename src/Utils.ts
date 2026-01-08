export function lerp(a: number, b: number, t: number): number {
    return a + (b - a) * t;
}

export function lerpColor(colorA: number, colorB: number, t: number): number {
    // Clamp t to [0, 1]
    t = Math.max(0, Math.min(1, t));

    const ar: number = (colorA >> 16) & 0xff;
    const ag: number = (colorA >> 8) & 0xff;
    const ab: number = colorA & 0xff;

    const br: number = (colorB >> 16) & 0xff;
    const bg: number = (colorB >> 8) & 0xff;
    const bb: number = colorB & 0xff;

    const r: number = Math.round(lerp(ar, br, t));
    const g: number = Math.round(lerp(ag, bg, t));
    const b: number = Math.round(lerp(ab, bb, t));

    return (r << 16) | (g << 8) | b;
}