import { base64 } from "./util/import-base-64.js";
import terser from '@rollup/plugin-terser';

const globals = {
    'three': 'THREE'
};

export default [
    {
        input: './src/index.js',
        treeshake: false,
        external: [
            'three'
        ],
        output: [
            {
                name: 'Gaussian Splats 3D',
                extend: true,
                format: 'umd',
                file: './build/gaussian-splats-3d.umd-for-lam.cjs',
                globals: globals,
                sourcemap: true
            },
            {
                name: 'Gaussian Splats 3D',
                extend: true,
                format: 'umd',
                file: './build/gaussian-splats-3d-for-lam.umd.min.cjs',
                globals: globals,
                sourcemap: true,
                plugins: [terser()]
            }
        ],
        plugins: [
            base64({ include: "**/*.wasm" })
        ]
    },
    {
        input: './src/index.js',
        treeshake: false,
        external: [
            'three'
        ],
        output: [
            {
                name: 'Gaussian Splats 3D',
                format: 'esm',
                file: './build/gaussian-splats-3d-for-lam.module.js',
                sourcemap: true
            },
            {
                name: 'Gaussian Splats 3D',
                format: 'esm',
                file: './build/gaussian-splats-3d-for-lam.module.min.js',
                sourcemap: true,
                plugins: [terser()]
            }
        ],
        plugins: [
            base64({ 
                include: "**/*.wasm",
                sourceMap: false
            })
        ]
    }
];