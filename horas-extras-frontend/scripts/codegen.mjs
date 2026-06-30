#!/usr/bin/env node
// ============================================================
// codegen.mjs — Genera hooks de React Query a partir de los
// `*.api.ts` que viven en src/pages/<feature>/.
//
// Para cada archivo `<feature>.api.ts` que exporte el objeto
// `<feature>Api` (convención), produce:
//   src/__generated__/<feature>.hooks.ts
//
// Los hooks incluyen:
//   - useQuery por cada función GET (verbo deducido por nombre)
//   - useMutation para POST/PUT/DELETE (con invalidación)
//
// Es deliberadamente simple: lee la AST con expresiones
// regulares para evitar dependencias extra. La forma final
// de cada hook se ajusta a mano si hace falta lógica especial
// (estos archivos ya están versionados en __generated__).
// ============================================================
import { readdirSync, statSync, existsSync, mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const PAGES = join(ROOT, 'src', 'pages');
const OUT = join(ROOT, 'src', '__generated__');

function findApiFiles(dir) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) {
      out.push(...findApiFiles(full));
    } else if (entry.endsWith('.api.ts')) {
      out.push(full);
    }
  }
  return out;
}

const QUERY_VERBS = ['get', 'list', 'fetch', 'find', 'detalle', 'listar', 'perfil', 'pendientes', 'general', 'empleado', 'trazabilidad'];

function isQuery(fnName) {
  return QUERY_VERBS.some((v) => fnName.toLowerCase().startsWith(v));
}

function parseApiObject(src, exportName) {
  const re = new RegExp(`export\\s+const\\s+${exportName}\\s*=\\s*\\{([\\s\\S]*?)\\n\\}`, 'm');
  const m = re.exec(src);
  if (!m) return [];
  const body = m[1];
  const fnRe = /(\w+)\s*:\s*\(([^)]*)\)\s*=>/g;
  const fns = [];
  let f;
  while ((f = fnRe.exec(body))) {
    fns.push({ name: f[1], params: f[2].trim() });
  }
  return fns;
}

function camelToPascal(s) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function generateHooks(featureName, fns) {
  const apiVar = `${featureName}Api`;
  const lines = [
    `// ============================================================`,
    `// GENERADO — no editar a mano.`,
    `// Regenera con: pnpm codegen`,
    `// Fuente: src/pages/${featureName}/${featureName}.api.ts`,
    `// ============================================================`,
    `import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';`,
    `import { ${apiVar} } from '@/pages/${featureName}/${featureName}.api';`,
    `import type { ApiError } from '@/shared/apiClient';`,
    ``,
    `export const ${featureName}Keys = {`,
    `  all: ['${featureName}'] as const,`,
    `};`,
    ``,
  ];

  for (const fn of fns) {
    const hookName = camelToPascal(fn.name);
    if (isQuery(fn.name)) {
      lines.push(`export function use${hookName}(...args: Parameters<typeof ${apiVar}.${fn.name}>) {`);
      lines.push(`  return useQuery<Awaited<ReturnType<typeof ${apiVar}.${fn.name}>>, ApiError>({`);
      lines.push(`    queryKey: [...${featureName}Keys.all, '${fn.name}', ...args],`);
      lines.push(`    queryFn: () => ${apiVar}.${fn.name}(...args),`);
      lines.push(`  });`);
      lines.push(`}`);
    } else {
      lines.push(`export function use${hookName}Mutation() {`);
      lines.push(`  const qc = useQueryClient();`);
      lines.push(`  return useMutation<Awaited<ReturnType<typeof ${apiVar}.${fn.name}>>, ApiError, Parameters<typeof ${apiVar}.${fn.name}>>({`);
      lines.push(`    mutationKey: [...${featureName}Keys.all, '${fn.name}'],`);
      lines.push(`    mutationFn: (args) => ${apiVar}.${fn.name}(...args),`);
      lines.push(`    onSuccess: () => qc.invalidateQueries({ queryKey: ${featureName}Keys.all }),`);
      lines.push(`  });`);
      lines.push(`}`);
    }
    lines.push('');
  }

  return lines.join('\n');
}

function ensureDir(p) {
  if (!existsSync(p)) mkdirSync(p, { recursive: true });
}

function main() {
  if (!existsSync(PAGES)) {
    console.error(`No existe ${PAGES}`);
    process.exit(1);
  }
  ensureDir(OUT);
  const apiFiles = findApiFiles(PAGES);
  console.log(`codegen: encontrados ${apiFiles.length} archivos *.api.ts`);

  for (const file of apiFiles) {
    const featureName = file.match(/[\\/]([^\\/]+)\.api\.ts$/)?.[1];
    if (!featureName) continue;
    const src = readFileSync(file, 'utf8');
    const apiVarName = `${featureName}Api`;
    const fns = parseApiObject(src, apiVarName);
    if (fns.length === 0) {
      console.warn(`  - ${featureName}: no se detectaron funciones en ${apiVarName}`);
      continue;
    }
    const out = generateHooks(featureName, fns);
    const outFile = join(OUT, `${featureName}.hooks.ts`);
    // No sobreescribir si el archivo ya fue afinado a mano (header marcado @manual)
    if (existsSync(outFile)) {
      const existing = readFileSync(outFile, 'utf8');
      if (existing.includes('@manual')) {
        console.log(`  - ${featureName}: omitido (marcado @manual)`);
        continue;
      }
    }
    writeFileSync(outFile, out);
    console.log(`  ✓ ${featureName} -> ${outFile} (${fns.length} fn)`);
  }
  console.log('codegen: listo.');
}

main();
