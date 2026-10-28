"use client";

// Corpo humano articulado, usado pelos agentes e pelo boneco do Rafael. Cada junta é um grupo que gira
// (quadril, tronco, cabeça, ombros, cotovelos, coxas e joelhos); as poses ficam nas funções `pose*`.
// O corpo olha para +z. Em pé, a origem fica no chão, entre os pés.
import type { ReactNode, RefObject } from "react";
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { mat } from "./materiais";
import { APARENCIA, type Aparencia, type EstiloCabelo } from "@/lib/pessoas";

export type Junta =
  | "quadril" | "tronco" | "cabeca" | "ombroE" | "cotoveloE" | "ombroD" | "cotoveloD" | "coxaE" | "joelhoE" | "coxaD" | "joelhoD";
export type Juntas = Partial<Record<Junta, THREE.Group>>;

export type { Aparencia, EstiloCabelo } from "@/lib/pessoas";

// A camisa sai da cor do grupo, um pouco puxada para o cinza para parecer tecido de verdade.
export function aparenciaDe(id: string, corGrupo: string): Aparencia {
  const base = APARENCIA[id] ?? {};
  const camisa = new THREE.Color(corGrupo).lerp(new THREE.Color("#8a8f98"), 0.22);
  return {
    pele: "#e0ac84",
    cabelo: "#2b1d14",
    estilo: "curto",
    camisa: `#${camisa.getHexString()}`,
    calca: "#2f3542",
    sapato: "#2b211b",
    ...base,
  };
}

const G = {
  pelve: new THREE.CapsuleGeometry(0.12, 0.14, 4, 12).rotateZ(Math.PI / 2).scale(1, 1, 0.78),
  cinto: new THREE.CylinderGeometry(0.15, 0.15, 0.035, 20).scale(1.12, 1, 0.75),
  torso: new THREE.CapsuleGeometry(0.155, 0.28, 6, 16).scale(1.15, 1, 0.72),
  ombros: new THREE.CapsuleGeometry(0.075, 0.28, 4, 12).rotateZ(Math.PI / 2),
  gola: new THREE.TorusGeometry(0.055, 0.018, 8, 20).rotateX(Math.PI / 2),
  pescoco: new THREE.CylinderGeometry(0.045, 0.052, 0.1, 12),
  cabeca: new THREE.SphereGeometry(0.115, 28, 20).scale(0.9, 1.08, 1),
  olho: new THREE.SphereGeometry(0.017, 12, 8).scale(1, 0.72, 0.5),
  pupila: new THREE.SphereGeometry(0.0095, 10, 6),
  sobrancelha: new THREE.BoxGeometry(0.038, 0.008, 0.01),
  nariz: new THREE.SphereGeometry(0.017, 10, 8).scale(0.75, 1, 1.3),
  boca: new THREE.CapsuleGeometry(0.0045, 0.03, 2, 6).rotateZ(Math.PI / 2),
  orelha: new THREE.SphereGeometry(0.025, 10, 8).scale(0.45, 1, 0.8),
  capa: new THREE.SphereGeometry(0.124, 28, 16, 0, Math.PI * 2, 0, Math.PI * 0.56).scale(0.94, 1.08, 1.05),
  capaRaspada: new THREE.SphereGeometry(0.118, 24, 14, 0, Math.PI * 2, 0, Math.PI * 0.5).scale(0.92, 1.08, 1.02),
  longo: new THREE.CapsuleGeometry(0.095, 0.2, 4, 12).scale(1.18, 1, 0.55),
  coque: new THREE.SphereGeometry(0.055, 14, 12),
  cacho: new THREE.SphereGeometry(0.05, 12, 10),
  bracoSup: new THREE.CapsuleGeometry(0.052, 0.19, 4, 10),
  antebraco: new THREE.CapsuleGeometry(0.044, 0.19, 4, 10),
  mao: new THREE.SphereGeometry(0.045, 12, 10).scale(0.75, 1.15, 0.5),
  coxa: new THREE.CapsuleGeometry(0.078, 0.3, 4, 12),
  canela: new THREE.CapsuleGeometry(0.062, 0.32, 4, 12),
  sapato: new RoundedBoxGeometry(0.105, 0.075, 0.26, 2, 0.03),
  camisaFrente: new THREE.BoxGeometry(0.1, 0.24, 0.01),
  gravata: new THREE.BoxGeometry(0.035, 0.2, 0.012),
};

export const ALTURA_QUADRIL = 0.95;
export const ALTURA_QUADRIL_SENTADO = 0.52;

export function Corpo({
  ap, juntas, noTronco,
}: {
  ap: Aparencia;
  juntas: RefObject<Juntas>;
  noTronco?: ReactNode; // algo preso ao tronco (ex.: papel nas mãos)
}) {
  const pele = mat(ap.pele, 0.6);
  const cabelo = mat(ap.cabelo, 0.75);
  const camisa = mat(ap.camisa, 0.85);
  const calca = mat(ap.calca, 0.8);
  const sapato = mat(ap.sapato, 0.35);
  const manga = ap.terno ? camisa : pele; // camisa polo: antebraço de fora; paletó: manga comprida
  const reg = (k: Junta) => (g: THREE.Group | null) => {
    if (g && juntas.current) juntas.current[k] = g;
  };

  return (
    <group ref={reg("quadril")} position={[0, ALTURA_QUADRIL, 0]}>
      <mesh geometry={G.pelve} material={calca} position={[0, 0.02, 0]} castShadow />
      <mesh geometry={G.cinto} material={mat("#1c1a18", 0.4)} position={[0, 0.07, 0]} />

      {/* tronco, pescoço e cabeça */}
      <group ref={reg("tronco")} position={[0, 0.06, 0]}>
        <mesh geometry={G.torso} material={camisa} position={[0, 0.26, 0]} castShadow />
        <mesh geometry={G.ombros} material={camisa} position={[0, 0.44, -0.01]} castShadow />
        {ap.terno ? (
          <>
            <mesh geometry={G.camisaFrente} material={mat("#eef2f7", 0.7)} position={[0, 0.39, 0.108]} rotation-x={-0.1} />
            <mesh geometry={G.gravata} material={mat("#7f1d1d", 0.6)} position={[0, 0.37, 0.116]} rotation-x={-0.1} />
          </>
        ) : (
          <mesh geometry={G.gola} material={mat(ap.camisa, 0.8)} position={[0, 0.5, 0.005]} />
        )}
        <mesh geometry={G.pescoco} material={pele} position={[0, 0.55, 0]} />
        <group ref={reg("cabeca")} position={[0, 0.6, 0]}>
          <mesh geometry={G.cabeca} material={pele} position={[0, 0.12, 0]} castShadow />
          {[-1, 1].map((l) => (
            <group key={l}>
              <mesh geometry={G.olho} material={mat("#f8f8f6", 0.3)} position={[0.038 * l, 0.125, 0.1]} />
              <mesh geometry={G.pupila} material={mat("#1b1410", 0.2)} position={[0.038 * l, 0.125, 0.108]} />
              <mesh geometry={G.sobrancelha} material={cabelo} position={[0.04 * l, 0.152, 0.104]} rotation-z={-0.08 * l} />
              <mesh geometry={G.orelha} material={pele} position={[0.104 * l, 0.115, 0]} />
            </group>
          ))}
          <mesh geometry={G.nariz} material={pele} position={[0, 0.1, 0.114]} />
          <mesh geometry={G.boca} material={mat("#a0524a", 0.6)} position={[0, 0.062, 0.102]} />
          <Cabelo estilo={ap.estilo} material={cabelo} />
        </group>

        {/* braços: pivô no ombro, cotovelo no meio */}
        {(["E", "D"] as const).map((l) => (
          <group key={l} ref={reg(`ombro${l}`)} position={[l === "E" ? 0.2 : -0.2, 0.44, 0]}>
            <mesh geometry={G.bracoSup} material={camisa} position={[0, -0.14, 0]} castShadow />
            <group ref={reg(`cotovelo${l}`)} position={[0, -0.29, 0]}>
              <mesh geometry={G.antebraco} material={manga} position={[0, -0.13, 0]} castShadow />
              <mesh geometry={G.mao} material={pele} position={[0, -0.29, 0]} />
            </group>
          </group>
        ))}
        {noTronco}
      </group>

      {/* pernas: pivô no quadril, joelho no meio */}
      {(["E", "D"] as const).map((l) => (
        <group key={l} ref={reg(`coxa${l}`)} position={[l === "E" ? 0.095 : -0.095, 0, 0]}>
          <mesh geometry={G.coxa} material={calca} position={[0, -0.22, 0]} castShadow />
          <group ref={reg(`joelho${l}`)} position={[0, -0.44, 0]}>
            <mesh geometry={G.canela} material={calca} position={[0, -0.24, 0]} castShadow />
            <mesh geometry={G.sapato} material={sapato} position={[0, -0.475, 0.045]} castShadow />
          </group>
        </group>
      ))}
    </group>
  );
}

function Cabelo({ estilo, material }: { estilo: EstiloCabelo; material: THREE.Material }) {
  if (estilo === "raspado") {
    return <mesh geometry={G.capaRaspada} material={material} position={[0, 0.125, -0.005]} rotation-x={-0.35} />;
  }
  return (
    <group>
      <mesh geometry={G.capa} material={material} position={[0, 0.125, -0.008]} rotation-x={-0.38} castShadow />
      {estilo === "longo" && <mesh geometry={G.longo} material={material} position={[0, 0.02, -0.065]} castShadow />}
      {estilo === "coque" && <mesh geometry={G.coque} material={material} position={[0, 0.2, -0.085]} castShadow />}
      {estilo === "ondulado" && (
        <>
          {[[-0.09, 0.06, -0.04], [0.09, 0.06, -0.04], [-0.06, 0.04, -0.09], [0.06, 0.04, -0.09], [0, 0.05, -0.1]].map(([x, y, z], i) => (
            <mesh key={i} geometry={G.cacho} material={material} position={[x, y, z]} castShadow />
          ))}
        </>
      )}
    </group>
  );
}

// ---------- poses ----------
// Convenção das juntas: rotação x negativa leva braço/coxa para a frente (+z); joelho positivo dobra
// a canela para trás; cotovelo negativo dobra o antebraço para a frente.

function rot(g: THREE.Group | undefined, x: number, y = 0, z = 0) {
  g?.rotation.set(x, y, z);
}

export type PoseSentado = "digitando" | "relaxado" | "lendo";

export function poseSentado(j: Juntas, modo: PoseSentado, t: number) {
  if (j.quadril) j.quadril.position.set(0, ALTURA_QUADRIL_SENTADO, 0);
  rot(j.coxaE, -Math.PI / 2, 0, -0.04);
  rot(j.coxaD, -Math.PI / 2, 0, 0.04);
  rot(j.joelhoE, Math.PI / 2 - 0.05);
  rot(j.joelhoD, Math.PI / 2 - 0.05);
  const resp = Math.sin(t * 1.7) * 0.012; // respiração
  if (modo === "digitando") {
    rot(j.tronco, 0.12 + resp);
    rot(j.cabeca, 0.1 + Math.sin(t * 0.7) * 0.03, Math.sin(t * 0.4) * 0.08);
    const dE = Math.sin(t * 17) * 0.07;
    const dD = Math.sin(t * 17 + 1.7) * 0.07;
    rot(j.ombroE, -0.42, 0, 0.12);
    rot(j.ombroD, -0.42, 0, -0.12);
    rot(j.cotoveloE, -1.12 + dE, 0, -0.25);
    rot(j.cotoveloD, -1.12 + dD, 0, 0.25);
  } else if (modo === "lendo") {
    // olha o papel e, de tempos em tempos, levanta a cabeça
    const olha = Math.sin(t * 0.45) > 0.6;
    rot(j.tronco, 0.16 + resp);
    rot(j.cabeca, olha ? -0.05 : 0.26, olha ? Math.sin(t) * 0.15 : 0);
    rot(j.ombroE, -0.55, 0, 0.18);
    rot(j.ombroD, -0.55, 0, -0.18);
    rot(j.cotoveloE, -1.0, 0, -0.35);
    rot(j.cotoveloD, -1.0 + Math.sin(t * 0.9) * 0.04, 0, 0.35);
  } else {
    rot(j.tronco, -0.06 + resp);
    rot(j.cabeca, 0.02, Math.sin(t * 0.3) * 0.35);
    rot(j.ombroE, -0.25, 0, 0.1);
    rot(j.ombroD, -0.25, 0, -0.1);
    rot(j.cotoveloE, -0.95, 0, -0.2);
    rot(j.cotoveloD, -0.95, 0, 0.2);
  }
}

// `fase` em radianos avança com a distância andada; `carregando` deixa os braços à frente.
export function poseAndando(j: Juntas, fase: number, carregando: boolean) {
  const s = Math.sin(fase);
  const passoE = s * 0.5;
  const passoD = -s * 0.5;
  if (j.quadril) j.quadril.position.set(0, ALTURA_QUADRIL - 0.015 + Math.abs(Math.cos(fase)) * 0.03, 0);
  rot(j.coxaE, passoE);
  rot(j.coxaD, passoD);
  // o joelho dobra enquanto a perna vem para a frente
  rot(j.joelhoE, 0.08 + Math.max(0, -Math.cos(fase)) * 0.75);
  rot(j.joelhoD, 0.08 + Math.max(0, Math.cos(fase)) * 0.75);
  rot(j.tronco, 0.05, s * 0.06);
  rot(j.cabeca, -0.02, -s * 0.04);
  if (carregando) {
    rot(j.ombroE, -0.75, 0, 0.12);
    rot(j.ombroD, -0.75, 0, -0.12);
    rot(j.cotoveloE, -0.75, 0, -0.3);
    rot(j.cotoveloD, -0.75, 0, 0.3);
  } else {
    rot(j.ombroE, -passoE * 0.8, 0, 0.06);
    rot(j.ombroD, -passoD * 0.8, 0, -0.06);
    rot(j.cotoveloE, -0.25 - Math.max(0, s) * 0.3);
    rot(j.cotoveloD, -0.25 - Math.max(0, -s) * 0.3);
  }
}

// Parado em pé no destino, gesticulando como quem conversa.
export function poseConversando(j: Juntas, t: number) {
  if (j.quadril) j.quadril.position.set(0, ALTURA_QUADRIL, 0);
  rot(j.coxaE, 0, 0, -0.03);
  rot(j.coxaD, 0, 0, 0.03);
  rot(j.joelhoE, 0.04);
  rot(j.joelhoD, 0.04);
  rot(j.tronco, 0.04);
  rot(j.cabeca, 0.05, Math.sin(t * 1.2) * 0.1);
  rot(j.ombroE, -0.7 + Math.sin(t * 5) * 0.15, 0, 0.15);
  rot(j.cotoveloE, -0.8, 0, -0.2);
  rot(j.ombroD, -0.1, 0, -0.08);
  rot(j.cotoveloD, -0.2);
}
