"use client";

// Móveis repetidos com poucas chamadas de desenho: cada peça (cadeira, mesa em L, planta...) é montada uma vez a
// partir de formas simples, mesclada por material numa geometria só, e desenhada com InstancedMesh em todas as
// posições de uma vez. Uma cadeira de 20 partes vira 3 malhas; 40 cadeiras continuam sendo 3 malhas.
import { useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";

export type Parte = {
  geo: THREE.BufferGeometry;
  p?: [number, number, number];
  r?: [number, number, number];
  s?: [number, number, number];
  mat: THREE.Material;
  sombra?: boolean; // projeta sombra
};

export type PecaKit = { geo: THREE.BufferGeometry; mat: THREE.Material; sombra: boolean };

// Junta as partes por material numa geometria cada.
export function montarKit(partes: Parte[]): PecaKit[] {
  const grupos = new Map<THREE.Material, { geos: THREE.BufferGeometry[]; sombra: boolean }>();
  const o = new THREE.Object3D();
  for (const pt of partes) {
    o.position.set(...(pt.p ?? [0, 0, 0]));
    o.rotation.set(...(pt.r ?? [0, 0, 0]));
    o.scale.set(...(pt.s ?? [1, 1, 1]));
    o.updateMatrix();
    let g = pt.geo.index ? pt.geo.toNonIndexed() : pt.geo.clone();
    g.applyMatrix4(o.matrix);
    // só os atributos que todas têm
    for (const nome of Object.keys(g.attributes)) if (!["position", "normal", "uv"].includes(nome)) g.deleteAttribute(nome);
    if (!g.attributes.uv) g.setAttribute("uv", new THREE.Float32BufferAttribute(new Float32Array((g.attributes.position.count) * 2), 2));
    g = g.index ? g.toNonIndexed() : g;
    const k = grupos.get(pt.mat) ?? { geos: [], sombra: false };
    k.geos.push(g);
    k.sombra ||= !!pt.sombra;
    grupos.set(pt.mat, k);
  }
  return [...grupos.entries()].map(([mat, { geos, sombra }]) => {
    const geo = mergeGeometries(geos, false) ?? geos[0];
    geo.computeBoundingSphere();
    return { geo, mat, sombra };
  });
}

export type Item = { x: number; z: number; y?: number; r?: number; s?: number | [number, number, number]; cor?: string };

// Uma peça do kit em todas as posições (cor por item: o material da parte precisa ser branco).
function LoteParte({ peca, itens, colorir }: { peca: PecaKit; itens: Item[]; colorir: boolean }) {
  const ref = useRef<THREE.InstancedMesh>(null);
  useLayoutEffect(() => {
    const m = ref.current;
    if (!m) return;
    const o = new THREE.Object3D();
    const c = new THREE.Color();
    itens.forEach((it, i) => {
      o.position.set(it.x, it.y ?? 0, it.z);
      o.rotation.set(0, it.r ?? 0, 0);
      if (Array.isArray(it.s)) o.scale.set(...it.s);
      else o.scale.setScalar(it.s ?? 1);
      o.updateMatrix();
      m.setMatrixAt(i, o.matrix);
      if (colorir) m.setColorAt(i, c.set(it.cor ?? "#ffffff"));
    });
    m.instanceMatrix.needsUpdate = true;
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
    m.computeBoundingSphere();
  }, [itens, colorir]);
  return (
    <instancedMesh ref={ref} args={[peca.geo, peca.mat, itens.length]} castShadow={peca.sombra} receiveShadow
      frustumCulled={false} />
  );
}

export function Lote({ kit, itens, colorir }: { kit: PecaKit[]; itens: Item[]; colorir?: THREE.Material }) {
  const chave = useMemo(() => itens.length, [itens.length]);
  if (itens.length === 0) return null;
  return (
    <group>
      {kit.map((peca, k) => (
        <LoteParte key={`${k}-${chave}`} peca={peca} itens={itens} colorir={!!colorir && peca.mat === colorir} />
      ))}
    </group>
  );
}
