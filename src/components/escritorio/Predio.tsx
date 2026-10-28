"use client";

// O prédio: pisos, paredes, divisórias de vidro com caixilho e portas, janelões com a cidade, forro com luminárias
// (visível só de baixo: de cima, o corte mostra as salas), placas com o ícone de cada sala e paredes de destaque.
import { memo, useMemo } from "react";
import * as THREE from "three";
import {
  ALTURA_PAREDE, CORREDORES, ESPINHA, PREDIO, SALA, SALAS, type Sala,
} from "@/lib/escritorio/modelo";
import { Lote, type Item } from "./kit";
import {
  aluminio, emissivo, mat, materialPiso, parede, texturaCeu, texturaForro, texturaParedeSetor, texturaPlaca,
  vidro, vidroFosco,
} from "./materiais";
import { KITS, geometriaCaixa as CAIXA, geometriaPlano as plano } from "./Moveis";

const H = ALTURA_PAREDE;
const ESP = 0.12;
const PORTA = 1.0;
const ALTURA_PORTA = 2.2;
const PEITORIL = 0.5;
const VERGA = 2.62;

type V3 = [number, number, number];

export function Caixa({ p, s, m, sombra = false, recebe = false, r }: { p: V3; s: V3; m: THREE.Material; sombra?: boolean; recebe?: boolean; r?: V3 }) {
  return <mesh geometry={CAIXA} material={m} position={p} scale={s} rotation={r} castShadow={sombra} receiveShadow={recebe} />;
}

function Plano({ p, s, m, r }: { p: V3; s: [number, number]; m: THREE.Material; r?: V3 }) {
  return <mesh geometry={plano()} material={m} position={p} scale={[s[0], s[1], 1]} rotation={r} receiveShadow />;
}

const rodape = () => mat("#3a3d42", 0.6);
const roda = () => mat("#9c968e", 0.8);

// ---------- pisos ----------
function Pisos() {
  const cx = (PREDIO.x0 + PREDIO.x1) / 2;
  const w = PREDIO.x1 - PREDIO.x0;
  return (
    <group>
      {SALAS.map((s) => (
        <Plano key={s.id} p={[(s.x0 + s.x1) / 2, 0.002, (s.z0 + s.z1) / 2]} s={[s.x1 - s.x0, s.z1 - s.z0]} r={[-Math.PI / 2, 0, 0]}
          m={materialPiso(s.piso, s.x1 - s.x0, s.z1 - s.z0)} />
      ))}
      {Object.values(CORREDORES).map((c) => (
        <Plano key={c.z0} p={[cx, 0.002, (c.z0 + c.z1) / 2]} s={[w, c.z1 - c.z0]} r={[-Math.PI / 2, 0, 0]}
          m={materialPiso("porcelanato", w, c.z1 - c.z0)} />
      ))}
      <Plano p={[(ESPINHA.x0 + ESPINHA.x1) / 2, 0.002, (ESPINHA.z0 + ESPINHA.z1) / 2]} s={[ESPINHA.x1 - ESPINHA.x0, ESPINHA.z1 - ESPINHA.z0]}
        r={[-Math.PI / 2, 0, 0]} m={materialPiso("concreto", ESPINHA.x1 - ESPINHA.x0, ESPINHA.z1 - ESPINHA.z0)} />
      {/* faixas de piso tátil/guia no meio dos corredores */}
      {Object.values(CORREDORES).map((c) => (
        <Plano key={`g${c.z0}`} p={[cx, 0.004, c.faixa]} s={[w - 1, 0.08]} r={[-Math.PI / 2, 0, 0]} m={mat("#b9b3aa", 0.4)} />
      ))}
    </group>
  );
}

// ---------- forro com luminárias ----------
function Forro() {
  const areas = useMemo(() => {
    const out: { x0: number; x1: number; z0: number; z1: number }[] = SALAS.map((s) => ({ x0: s.x0, x1: s.x1, z0: s.z0, z1: s.z1 }));
    for (const c of Object.values(CORREDORES)) out.push({ x0: PREDIO.x0, x1: PREDIO.x1, z0: c.z0, z1: c.z1 });
    out.push({ x0: ESPINHA.x0, x1: ESPINHA.x1, z0: ESPINHA.z0, z1: ESPINHA.z1 });
    return out;
  }, []);
  const luzes = useMemo(() => {
    const it: Item[] = [];
    for (const a of areas) {
      const w = a.x1 - a.x0;
      const d = a.z1 - a.z0;
      const nx = Math.max(1, Math.round(w / 2.6));
      const nz = Math.max(1, Math.round(d / 2.4));
      for (let i = 0; i < nx; i++) for (let k = 0; k < nz; k++) {
        it.push({ x: a.x0 + (w * (i + 0.5)) / nx, z: a.z0 + (d * (k + 0.5)) / nz, y: H - 0.004, r: d > w * 1.6 ? Math.PI / 2 : 0 });
      }
    }
    return it;
  }, [areas]);
  const materiais = useMemo(() => areas.map((a) => {
    const t = texturaForro().clone();
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set((a.x1 - a.x0) / 0.625, (a.z1 - a.z0) / 0.625);
    t.needsUpdate = true;
    return new THREE.MeshStandardMaterial({ map: t, roughness: 0.9, emissive: "#ffffff", emissiveMap: t, emissiveIntensity: 0.62 });
  }), [areas]);
  return (
    <group>
      {areas.map((a, i) => (
        <mesh key={i} geometry={plano()} material={materiais[i]} position={[(a.x0 + a.x1) / 2, H, (a.z0 + a.z1) / 2]}
          rotation-x={Math.PI / 2} scale={[a.x1 - a.x0, a.z1 - a.z0, 1]} />
      ))}
      <Lote kit={KITS.luminaria()} itens={luzes} />
    </group>
  );
}

// ---------- janelões (paredes externas) ----------
// Parede externa ao longo de um eixo, com peitoril, faixa de vidro com montantes, verga e pilares nos pontos dados.
function Fachada({ eixo, fixo, de, ate, pilares, lado }: { eixo: "x" | "z"; fixo: number; de: number; ate: number; pilares: number[]; lado: 1 | -1 }) {
  const len = ate - de;
  const meio = (de + ate) / 2;
  const pos = (ao: number, y: number, fora = 0): V3 => (eixo === "x" ? [ao, y, fixo + fora * lado] : [fixo + fora * lado, y, ao]);
  const esc = (comp: number, alt: number, esp: number): V3 => (eixo === "x" ? [comp, alt, esp] : [esp, alt, comp]);
  const rot: V3 = eixo === "x" ? [0, 0, 0] : [0, Math.PI / 2, 0];
  const montantes: number[] = [];
  const marcos = [de, ...pilares, ate];
  for (let i = 0; i < marcos.length - 1; i++) {
    const a = marcos[i] + 0.25;
    const b = marcos[i + 1] - 0.25;
    const n = Math.max(1, Math.round((b - a) / 1.5));
    for (let k = 1; k < n; k++) montantes.push(a + ((b - a) * k) / n);
  }
  const ceu = texturaCeu();
  const ceuMat = useMemo(() => new THREE.MeshBasicMaterial({ map: ceu, toneMapped: false }), [ceu]);
  return (
    <group>
      <Caixa p={pos(meio, PEITORIL / 2)} s={esc(len + 0.2, PEITORIL, 0.22)} m={parede()} sombra recebe />
      <Caixa p={pos(meio, (VERGA + H) / 2 + 0.05)} s={esc(len + 0.2, H - VERGA + 0.1, 0.22)} m={parede()} sombra recebe />
      <Caixa p={pos(meio, H + 0.1)} s={esc(len + 0.24, 0.02, 0.26)} m={roda()} />
      {marcos.map((v, i) => <Caixa key={`p${i}`} p={pos(v, H / 2)} s={esc(0.5, H, 0.26)} m={parede()} sombra recebe />)}
      {montantes.map((v) => <Caixa key={v} p={pos(v, (PEITORIL + VERGA) / 2)} s={esc(0.05, VERGA - PEITORIL, 0.08)} m={aluminio()} />)}
      <Caixa p={pos(meio, PEITORIL + 0.02, -0.18)} s={esc(len - 0.4, 0.04, 0.22)} m={mat("#ece9e3", 0.4)} recebe />
      <Caixa p={pos(meio, PEITORIL, 0)} s={esc(len, 0.04, 0.1)} m={aluminio()} />
      <Caixa p={pos(meio, VERGA, 0)} s={esc(len, 0.04, 0.1)} m={aluminio()} />
      <mesh geometry={plano()} material={vidro()} position={pos(meio, (PEITORIL + VERGA) / 2)} rotation={rot} scale={[len, VERGA - PEITORIL, 1]} />
      {/* a cidade lá fora */}
      <mesh geometry={plano()} material={ceuMat} position={pos(meio, 1.4, 0.9)} rotation={[0, eixo === "x" ? (lado > 0 ? Math.PI : 0) : (lado > 0 ? -Math.PI / 2 : Math.PI / 2), 0]}
        scale={[len + 2, 3.1, 1]} />
    </group>
  );
}

// ---------- paredes internas ----------
function ParedeX({ x, z0, z1, alt = H }: { x: number; z0: number; z1: number; alt?: number }) {
  const len = z1 - z0;
  const zc = (z0 + z1) / 2;
  return (
    <group>
      <Caixa p={[x, alt / 2, zc]} s={[ESP, alt, len]} m={parede()} sombra recebe />
      <Caixa p={[x, 0.05, zc]} s={[ESP + 0.02, 0.1, len]} m={rodape()} />
      <Caixa p={[x, alt + 0.005, zc]} s={[ESP + 0.01, 0.01, len]} m={roda()} />
    </group>
  );
}

type Trecho = { a: number; b: number; tipo: "vidro" | "solido" | "porta" | "aberto"; sala?: Sala; abre?: 1 | -1 };

// Divisória ao longo de x (z fixo): trechos de vidro com caixilho, paredes, portas de vidro e vãos abertos.
function ParedeZ({ z, trechos }: { z: number; trechos: Trecho[] }) {
  return (
    <group>
      {trechos.map((t) => {
        const len = t.b - t.a;
        const xc = (t.a + t.b) / 2;
        if (t.tipo === "aberto") return null;
        if (t.tipo === "solido") {
          return (
            <group key={t.a}>
              <Caixa p={[xc, H / 2, z]} s={[len, H, ESP]} m={parede()} sombra recebe />
              <Caixa p={[xc, 0.05, z]} s={[len, 0.1, ESP + 0.02]} m={rodape()} />
              <Caixa p={[xc, H + 0.005, z]} s={[len, 0.01, ESP + 0.01]} m={roda()} />
            </group>
          );
        }
        if (t.tipo === "porta") {
          const lado = t.abre ?? 1;
          return (
            <group key={t.a}>
              {[t.a, t.b].map((x) => <Caixa key={x} p={[x, ALTURA_PORTA / 2, z]} s={[0.06, ALTURA_PORTA, 0.1]} m={aluminio()} />)}
              <mesh geometry={plano()} material={vidroFosco()} position={[xc, (H + ALTURA_PORTA) / 2, z]} scale={[len, H - ALTURA_PORTA, 1]} />
              <Caixa p={[xc, ALTURA_PORTA, z]} s={[len, 0.06, 0.1]} m={aluminio()} />
              <Caixa p={[xc, H - 0.04, z]} s={[len, 0.08, 0.08]} m={aluminio()} />
              {/* folha de vidro aberta */}
              <group position={[t.a + 0.03, 0, z]} rotation-y={lado * 1.2}>
                <mesh geometry={plano()} material={vidro()} position={[0.46, ALTURA_PORTA / 2 - 0.02, 0]} scale={[0.92, ALTURA_PORTA - 0.06, 1]} />
                <Caixa p={[0.46, 0.04, 0]} s={[0.92, 0.07, 0.04]} m={aluminio()} />
                <Caixa p={[0.46, ALTURA_PORTA - 0.07, 0]} s={[0.92, 0.04, 0.04]} m={aluminio()} />
                <Caixa p={[0.84, 1.05, 0.05 * lado]} s={[0.025, 0.6, 0.025]} m={mat("#c7ccd1", 0.25, 0.9)} />
              </group>
              {t.sala && <Placa sala={t.sala} x={xc} z={z} />}
            </group>
          );
        }
        const montantes = Math.max(1, Math.round(len / 1.25));
        return (
          <group key={t.a}>
            <mesh geometry={plano()} material={vidro()} position={[xc, H / 2, z]} scale={[len, H - 0.1, 1]} />
            <mesh geometry={plano()} material={vidroFosco()} position={[xc, 1.25, z + 0.004]} scale={[len, 0.14, 1]} />
            <Caixa p={[xc, 0.05, z]} s={[len, 0.1, 0.08]} m={aluminio()} />
            <Caixa p={[xc, H - 0.04, z]} s={[len, 0.08, 0.08]} m={aluminio()} />
            {Array.from({ length: montantes + 1 }).map((_, k) => (
              <Caixa key={k} p={[t.a + (len * k) / montantes, H / 2, z]} s={[0.045, H, 0.07]} m={aluminio()} />
            ))}
          </group>
        );
      })}
    </group>
  );
}

// Placa da sala sobre a porta, dos dois lados do vidro.
function Placa({ sala, x, z }: { sala: Sala; x: number; z: number }) {
  const t = texturaPlaca(sala.nome, sala.cor, sala.icone);
  return (
    <group position={[x, 2.48, z]}>
      {[1, -1].map((l) => (
        <mesh key={l} geometry={plano()} position={[0, 0, 0.012 * l]} rotation-y={l > 0 ? 0 : Math.PI} scale={[1.15, 0.24, 1]}>
          <meshStandardMaterial map={t} roughness={0.5} />
        </mesh>
      ))}
    </group>
  );
}

// Trechos de uma parede de corredor para uma sala: vidro (ou sólido) com a porta no lugar certo.
function trechosDaSala(s: Sala, tipo: "vidro" | "solido", comPorta: boolean, abre: 1 | -1, solidos: [number, number][] = []): Trecho[] {
  const p0 = s.porta - PORTA / 2;
  const p1 = s.porta + PORTA / 2;
  const cortes = [s.x0 + ESP / 2, s.x1 - ESP / 2, ...(comPorta ? [p0, p1] : []), ...solidos.flat()]
    .filter((v, i, a) => a.indexOf(v) === i).sort((a, b) => a - b);
  const out: Trecho[] = [];
  for (let i = 0; i < cortes.length - 1; i++) {
    const a = cortes[i];
    const b = cortes[i + 1];
    if (b - a < 0.01) continue;
    const m = (a + b) / 2;
    const t: Trecho["tipo"] = comPorta && m > p0 && m < p1 ? "porta" : solidos.some(([x0, x1]) => m > x0 && m < x1) ? "solido" : tipo;
    out.push({ a, b, tipo: t, sala: t === "porta" ? s : undefined, abre });
  }
  return out;
}

// Parede de destaque (supergráfico com o ícone e o nome do setor).
function ParedeDestaque({ sala, x, lado, zc, largura }: { sala: Sala; x: number; lado: 1 | -1; zc: number; largura: number }) {
  const t = texturaParedeSetor(sala.nome, sala.cor, sala.icone);
  return (
    <mesh geometry={plano()} position={[x + lado * (ESP / 2 + 0.004), 1.45, zc]} rotation-y={lado * Math.PI / 2} scale={[largura, largura / 2, 1]}>
      <meshStandardMaterial map={t} roughness={0.85} />
    </mesh>
  );
}

export const Predio = memo(function Predio() {
  const cx = (PREDIO.x0 + PREDIO.x1) / 2;
  const cz = (PREDIO.z0 + PREDIO.z1) / 2;
  const w = PREDIO.x1 - PREDIO.x0;
  const d = PREDIO.z1 - PREDIO.z0;
  const S = SALA;
  return (
    <group>
      {/* terreno, calçada e laje */}
      <mesh geometry={plano()} rotation-x={-Math.PI / 2} position={[cx, -0.32, cz + 6]} scale={[260, 260, 1]} receiveShadow material={mat("#cfd6d2", 1)} />
      <Caixa p={[cx, -0.16, cz + 1]} s={[w + 3, 0.32, d + 6]} m={mat("#d9d4cc", 0.85)} recebe />
      <Caixa p={[cx, -0.15, PREDIO.z1 + 2.2]} s={[w + 3, 0.3, 0.2]} m={mat("#b9b2a8", 0.8)} />
      <Pisos />
      <Forro />

      {/* fachadas com janelões: fundo e laterais */}
      <Fachada eixo="x" fixo={PREDIO.z0 - 0.11} de={PREDIO.x0} ate={PREDIO.x1} lado={-1}
        pilares={[S.sistemas.x0, S.financeiro.x0, S.custos.x0]} />
      <Fachada eixo="z" fixo={PREDIO.x0 - 0.11} de={PREDIO.z0} ate={PREDIO.z1} lado={-1}
        pilares={[CORREDORES.c1.z0, CORREDORES.c1.z1, CORREDORES.c2.z0, CORREDORES.c2.z1]} />
      <Fachada eixo="z" fixo={PREDIO.x1 + 0.11} de={PREDIO.z0} ate={PREDIO.z1} lado={1}
        pilares={[CORREDORES.c1.z0, CORREDORES.c1.z1, CORREDORES.c2.z0, CORREDORES.c2.z1]} />

      {/* paredes entre as salas */}
      {[S.sistemas.x0, S.financeiro.x0, S.custos.x0].map((x) => <ParedeX key={`a${x}`} x={x} z0={S.direcao.z0} z1={S.direcao.z1} />)}
      {[S.suprimentos.x0, S.reuniao.x0, ESPINHA.x0, ESPINHA.x1, S.copa.x0].map((x) => <ParedeX key={`b${x}`} x={x} z0={-4} z1={6} />)}
      <ParedeX x={S.recepcao.x0} z0={S.rafael.z0} z1={S.rafael.z1} />

      {/* corredor 1: frente das salas do fundo (z = -8) e fundo das salas do meio (z = -4) */}
      <ParedeZ z={CORREDORES.c1.z0} trechos={[S.direcao, S.sistemas, S.financeiro, S.custos].flatMap((s) => trechosDaSala(s, "vidro", true, -1))} />
      <ParedeZ z={CORREDORES.c1.z1} trechos={[
        ...trechosDaSala(S["frota-rh"], "vidro", true, 1),
        ...trechosDaSala(S.suprimentos, "vidro", true, 1),
        ...trechosDaSala(S.reuniao, "solido", false, 1),
        ...trechosDaSala(S.arquivo, "solido", false, 1),
        ...trechosDaSala(S.copa, "solido", false, 1),
      ]} />
      {/* corredor 2: frente das salas do meio (z = 6) e fundo da sua sala (z = 10) */}
      <ParedeZ z={CORREDORES.c2.z0} trechos={[
        ...trechosDaSala(S["frota-rh"], "vidro", false, -1),
        ...trechosDaSala(S.suprimentos, "vidro", false, -1),
        ...trechosDaSala(S.reuniao, "vidro", true, -1),
        ...trechosDaSala(S.arquivo, "vidro", true, -1),
        ...trechosDaSala(S.copa, "vidro", true, -1),
      ]} />
      <ParedeZ z={CORREDORES.c2.z1} trechos={trechosDaSala(S.rafael, "vidro", true, 1, [[-23.2, -14.8]])} />
      {/* placas das salas do meio que abrem para o corredor 1, também do lado da câmera */}
      {[S["frota-rh"], S.suprimentos].map((s) => <Placa key={s.id} sala={s} x={(s.x0 + s.x1) / 2} z={CORREDORES.c2.z0} />)}

      {/* paredes de destaque */}
      <ParedeDestaque sala={S.direcao} x={S.direcao.x1} lado={-1} zc={-11.2} largura={4.6} />
      <ParedeDestaque sala={S.sistemas} x={S.sistemas.x0} lado={1} zc={-11.2} largura={4.6} />
      <ParedeDestaque sala={S.financeiro} x={S.financeiro.x0} lado={1} zc={-11.2} largura={4.6} />
      <ParedeDestaque sala={S.custos} x={S.custos.x0} lado={1} zc={-11.2} largura={4.6} />
      <ParedeDestaque sala={S["frota-rh"]} x={S["frota-rh"].x1} lado={-1} zc={3.3} largura={4.2} />
      <ParedeDestaque sala={S.suprimentos} x={S.suprimentos.x0} lado={1} zc={3.3} largura={4.2} />

      {/* sinalização no teto dos corredores */}
      <mesh geometry={plano()} position={[ESPINHA.faixa, 2.55, CORREDORES.c2.faixa]} scale={[1.4, 0.18, 1]}>
        <meshBasicMaterial color="#16a34a" toneMapped={false} />
      </mesh>
      <mesh geometry={plano()} material={emissivo("#ffffff", 0.9)} position={[ESPINHA.faixa, 2.55, CORREDORES.c2.faixa + 0.002]} scale={[0.9, 0.06, 1]} />
    </group>
  );
});
