import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { transformSync } from 'esbuild';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '../../');

function loadTs(modulePath, fromDir = projectRoot) {
  let abs;
  if (modulePath.startsWith('@/')) {
    abs = path.join(projectRoot, 'src', modulePath.slice(2));
  } else {
    abs = path.resolve(fromDir, modulePath);
  }
  if (!abs.endsWith('.ts') && !abs.endsWith('.js')) {
    abs += '.ts';
  }
  const ts = fs.readFileSync(abs, 'utf8');
  const { code } = transformSync(ts, { loader: 'ts', format: 'cjs', target: 'es2019' });
  const module = { exports: {} };
  const requireFunc = (p) => {
    if (p.endsWith('.vue')) {
      return {};
    }
    return loadTs(p, path.dirname(abs));
  };
  const fn = new Function('require', 'module', 'exports', code);
  fn(requireFunc, module, module.exports);
  return module.exports;
}

const { parseStudyset } = loadTs('@/FlashcardParser/FlashcardsParser');
const { PageRef } = loadTs('@/Commands/all/PageRef');

test('parses resources with alias and path-only entries and sets default', () => {
  const lines = `[Title]\nSet\n[Resources]\nalias1: path1.pdf\npath2.pdf\n[Cards]\nQ1 .. 1`.split('\n');
  const study = parseStudyset(lines);
  assert.deepEqual(study.resources, {
    alias1: 'path1.pdf',
    'path2.pdf': 'path2.pdf'
  });
  assert.equal(study.defaultResource, 'alias1');
});

test('PageRef extracts alias and pages string', () => {
  const pr = new PageRef('alias1:1,2-4');
  assert.equal(pr.resourceAlias, 'alias1');
  assert.equal(pr.pagesString, '1,2-4');
  assert.deepEqual(pr.allPageRefs, [1, 2, 3, 4]);
});

test('flashcard with aliased PageRef selects correct resource', () => {
  const lines = `[Title]\nSet\n[Resources]\na1: r1.pdf\na2: r2.pdf\n[Cards]\nCard1 .. 1\nCard2 .. a2:2`.split('\n');
  const study = parseStudyset(lines);
  const card = study.flashcards[1];
  const component = card.subParts.find((sp) => sp.name === 'pageref');
  const alias = component.resourceAlias || study.defaultResource;
  const chosen = study.resources[alias];
  assert.equal(chosen, 'r2.pdf');
  assert.equal(component.ref, 2);
});
