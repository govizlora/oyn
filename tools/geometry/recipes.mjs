const box = (x, y, z, hx, hy, hz, bevel = 1) => ({ kind: 'box', center: [x, y, z], halfSize: [hx, hy, hz], bevel });
const cylinder = (x, y, z, radius, halfHeight) => ({ kind: 'cylinder', center: [x, y, z], radius, halfHeight });
const sphere = (x, y, z, radius) => ({
    kind: 'sphere',
    center: [x, y, z],
    radius,
});
const difference = (a, b) => ({ kind: 'subtract', a, b });
export const specimens = [
    {
        name: 'Spherical pocket',
        formula: 'ROUNDED BOX − SPHERE',
        label: 'Pocket depth',
        geometry: (v, cut) => {
            const base = box(0, 0, 12, 45, 28, 8, 2);
            const depth = 1 + v * 0.06, radius = (17 * 17 + depth * depth) / (2 * depth);
            return cut
                ? difference(base, sphere(18, 0, 20 + radius - depth, radius))
                : base;
        },
    },
    {
        name: 'Through-ring',
        formula: 'CYLINDER − CYLINDER',
        label: 'Aperture',
        geometry: (v, cut) => {
            const base = cylinder(0, 0, 12, 41, 8);
            return cut
                ? difference(base, cylinder(0, 0, 12, 12 + v * 0.2, 30))
                : base;
        },
    },
    {
        name: 'Open notch',
        formula: 'ROUNDED BOX − CYLINDER',
        label: 'Notch position',
        geometry: (v, cut) => {
            const base = box(0, 0, 12, 43, 28, 8, 3);
            return cut
                ? difference(base, cylinder(v * 0.5 - 25, -27, 12, 15, 25))
                : base;
        },
    },
    {
        name: 'Twin body',
        formula: 'CYLINDER ∪ CYLINDER',
        label: 'Separation',
        geometry: (v, cut) => {
            const distance = 10 + v * 0.17;
            const base = cylinder(-distance, 0, 12, 27, 8);
            return cut
                ? {
                    kind: 'union',
                    a: base,
                    b: cylinder(distance, 0, 12, 27, 8),
                }
                : base;
        },
    },
    {
        name: 'Window key',
        formula: 'ROUNDED BOX − ROUNDED BOX',
        label: 'Window width',
        geometry: (v, cut) => {
            const base = box(0, 0, 12, 44, 32, 8, 3);
            return cut
                ? difference(base, box(0, 0, 12, 13 + v * 0.19, 18, 30, 3))
                : base;
        },
    },
    {
        name: 'Sectioned sphere',
        formula: 'SPHERE ∩ BOX',
        label: 'Section height',
        geometry: (v, cut) => {
            const base = sphere(0, 0, 44, 40);
            return cut
                ? {
                    kind: 'intersect',
                    a: base,
                    b: box(0, 0, 25 + v * 0.3, 44, 44, 12, 0),
                }
                : base;
        },
    },
];
