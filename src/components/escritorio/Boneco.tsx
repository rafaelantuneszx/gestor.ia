"use client";

import { ID_GESTOR } from "@/lib/banco";
import { useEffect, useMemo, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import * as THREE from "three";
import { CADEIRA_GESTOR, viagemPausa, type EstadoAgente, type LugarReuniao, type Vec2, type Viagem } from "@/lib/escritorio/modelo";
import { COR_STATUS, situacaoDe } from "./status";
import { aparenciaDe, Corpo, poseAndando, poseConversando, poseSentado, type Juntas } from "./Corpo";
import { mat, materialSombra } from "./materiais";

const VELOCIDADE = 2.0; // m/s
const PASSADA = 0.72; // m por meio ciclo de passo
const PAUSA_DESTINO = 1.6; // s parado no destino
const GIRO = 10; // quão rápido vira para a direção do passo

// sentado na própria mesa · viagem (ida, pausa, volta) · reunião (ida, sentado na sala, volta)
type Fase = "sentado" | "indo" | "pausa" | "voltando" | "indoReuniao" | "naReuniao" | "voltandoReuniao";

function semente(id: string) {
  let h = 0;
  for (const c of id) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return h;
}

// Comprimento acumulado de um caminho, para andar a velocidade constante.
function medir(caminho: Vec2[]) {
  const acum = [0];
  for (let i = 1; i < caminho.length; i++) {
    const [x1, z1] = caminho[i - 1];
    const [x2, z2] = caminho[i];
    acum.push(acum[i - 1] + Math.hypot(x2 - x1, z2 - z1));
  }
  return acum;
}

function pontoEm(caminho: Vec2[], acum: number[], d: number): { p: Vec2; dir: Vec2 } {
  const total = acum[acum.length - 1];
  const dd = Math.max(0, Math.min(total, d));
  let i = 1;
  while (i < acum.length - 1 && acum[i] < dd) i++;
  const [x1, z1] = caminho[i - 1];
  const [x2, z2] = caminho[i];
  const seg = acum[i] - acum[i - 1] || 1;
  const t = (dd - acum[i - 1]) / seg;
  return { p: [x1 + (x2 - x1) * t, z1 + (z2 - z1) * t], dir: [x2 - x1, z2 - z1] };
}

function girarPara(atual: number, alvo: number, k: number) {
  const d = Math.atan2(Math.sin(alvo - atual), Math.cos(alvo - atual));
  return atual + d * k;
}

const PAPEL = new THREE.BoxGeometry(0.24, 0.32, 0.012);

const SOMBRA = new THREE.PlaneGeometry(0.9, 0.9).rotateX(-Math.PI / 2);

// Aro de status sobre a cabeça: inteiro quando parado, aberto e girando quando está trabalhando.
const ARO = new THREE.TorusGeometry(0.21, 0.024, 8, 40).rotateX(Math.PI / 2);
const ARCO = new THREE.TorusGeometry(0.21, 0.03, 8, 40, Math.PI * 1.4).rotateX(Math.PI / 2);
const materiaisAro = new Map<string, THREE.MeshBasicMaterial>();
function materialAro(cor: string) {
  let m = materiaisAro.get(cor);
  if (!m) { m = new THREE.MeshBasicMaterial({ color: cor, toneMapped: false }); materiaisAro.set(cor, m); }
  return m;
}
const ALTURA_ARO_SENTADO = 1.68;
const ALTURA_ARO_EM_PE = 2.02;

export function Boneco({
  id, nome, cor, cadeira, temMesa = true, estado, viagem, reuniao, selecionado, onClick, onViagemFim, falando = null, rotulos = true, demandas = 0,
}: {
  id: string;
  nome: string;
  cor: string;
  cadeira: Vec2; // onde o boneco fica quando não está andando (a cadeira da mesa, ou a entrada para quem não tem mesa)
  temMesa?: boolean; // sem mesa: só aparece enquanto vai, fica ou volta da reunião ou de uma viagem
  estado: EstadoAgente;
  viagem: Viagem | null;
  reuniao: LugarReuniao | null;
  selecionado: boolean;
  onClick: () => void;
  onViagemFim: (viagemId: string) => void;
  falando?: string | null; // o que está dizendo agora (balão sobre a cabeça)
  rotulos?: boolean; // nome e legenda em HTML (o mosaico desliga)
  demandas?: number; // demandas abertas com este agente
}) {
  const s = semente(id);
  const selecionadoRef = useRef(selecionado);
  selecionadoRef.current = selecionado;
  const falandoRef = useRef(falando);
  falandoRef.current = falando;
  const ap = useMemo(() => aparenciaDe(id, cor), [id, cor]);

  const raiz = useRef<THREE.Group>(null);
  const rotulo = useRef<THREE.Group>(null);
  const anel = useRef<THREE.Mesh>(null);
  const juntas = useRef<Juntas>({});
  const papel = useRef<THREE.Mesh>(null);
  const aro = useRef<THREE.Group>(null);
  const proximaPausa = useRef<number | null>(null);
  const pausas = useRef(0);
  const [concluiu, setConcluiu] = useState(false);
  const statusAnterior = useRef(estado.status);
  useEffect(() => {
    const antes = statusAnterior.current;
    statusAnterior.current = estado.status;
    if (antes !== "trabalhando" || estado.status !== "disponivel") return;
    setConcluiu(true);
    const t = setTimeout(() => setConcluiu(false), 9000);
    return () => clearTimeout(t);
  }, [estado.status]);

  const fase = useRef<Fase>("sentado");
  const dist = useRef(0);
  const pausa = useRef(0);
  const caminho = useRef<Vec2[]>([]);
  const acum = useRef<number[]>([0]);
  const viagemAtual = useRef<Viagem | null>(null);
  const viagemFeita = useRef<string | null>(null);
  const reuniaoAtual = useRef<LugarReuniao | null>(null);
  // as props mais recentes, lidas dentro do useFrame
  const viagemProp = useRef(viagem);
  const reuniaoProp = useRef(reuniao);
  useEffect(() => { viagemProp.current = viagem; }, [viagem]);
  useEffect(() => { reuniaoProp.current = reuniao; }, [reuniao]);
  // legenda e visibilidade só mudam nas trocas de fase (não a cada quadro)
  const [legendaFora, setLegendaFora] = useState<string | null>(null);
  const [fora, setFora] = useState(false);

  const comecar = (novaFase: Fase, rota: Vec2[], legenda: string) => {
    fase.current = novaFase;
    caminho.current = rota;
    acum.current = medir(rota);
    dist.current = 0;
    setLegendaFora(legenda);
    setFora(true);
  };
  const sentarEmCasa = () => {
    fase.current = "sentado";
    viagemAtual.current = null;
    reuniaoAtual.current = null;
    setLegendaFora(null);
    setFora(false);
  };

  // Em câmeras baixas (dentro das salas), esconde os nomes de quem está longe, para não poluir a imagem.
  const caixaRotulo = useRef<HTMLDivElement>(null);
  const longe = useRef(false);
  const compacto = useRef<boolean | null>(null);
  const v = useMemo(() => new THREE.Vector3(), []);
  useFrame(({ camera }) => {
    const g = raiz.current;
    if (!g || !caixaRotulo.current) return;
    g.getWorldPosition(v);
    const distancia = camera.position.distanceTo(v);
    const fazerCompacto = distancia > 34 && !selecionadoRef.current;
    if (fazerCompacto !== compacto.current) {
      compacto.current = fazerCompacto;
      caixaRotulo.current.dataset.compacto = fazerCompacto ? "1" : "0";
    }
    const esconder = camera.position.y < 6 && distancia > 15;
    if (esconder !== longe.current) {
      longe.current = esconder;
      caixaRotulo.current.style.visibility = esconder ? "hidden" : "visible";
    }
  });

  useFrame(({ clock }, dtBruto) => {
    const g = raiz.current;
    const j = juntas.current;
    if (!g) return;
    const dt = Math.min(dtBruto, 0.1); // aba em segundo plano: não teleporta ao voltar
    const t = clock.elapsedTime + (s % 100) * 0.13;
    const trabalhando = estado.status === "trabalhando";

    // Na mesa: a reunião tem prioridade; depois, a próxima viagem da fila.
    if (fase.current === "sentado") {
      const r = reuniaoProp.current;
      const v = viagemProp.current;
      if (r && r.caminho.length > 1) {
        reuniaoAtual.current = r;
        comecar("indoReuniao", r.caminho, `em reunião: ${r.titulo}`);
      } else if (v && v.id !== viagemFeita.current && v.caminho.length > 1) {
        viagemAtual.current = v;
        comecar("indo", v.caminho, v.rotulo);
      } else if (temMesa && estado.status === "disponivel" && (proximaPausa.current ??= clock.elapsedTime + 45 + (s % 280)) < clock.elapsedTime) {
        // quem está livre há um tempo dá uma volta até a copa
        proximaPausa.current = clock.elapsedTime + 240 + (s % 300);
        const pausa = viagemPausa(id, s + pausas.current++);
        viagemAtual.current = pausa;
        comecar("indo", pausa.caminho, pausa.rotulo);
      } else {
        g.visible = temMesa;
        g.position.set(cadeira[0], 0, cadeira[1]);
        g.rotation.y = Math.PI; // de frente para o monitor
        poseSentado(j, trabalhando ? ((s + Math.floor(t / 13)) % 4 === 0 ? "lendo" : "digitando") : (s + Math.floor(t / 19)) % 3 === 0 ? "lendo" : "relaxado", t);
        if (papel.current) papel.current.visible = false;
        if (rotulo.current) rotulo.current.position.y = 1.95;
        return;
      }
    }
    g.visible = true;
    const total = acum.current[acum.current.length - 1];

    // ---- reunião ----
    if (fase.current === "indoReuniao" || fase.current === "naReuniao" || fase.current === "voltandoReuniao") {
      const alvo = reuniaoProp.current;
      const atual = reuniaoAtual.current;
      const mesma = !!alvo && !!atual && alvo.chave === atual.chave;
      if (fase.current !== "voltandoReuniao" && !mesma) {
        // a reunião acabou (ou mudou de cadeira): volta para a mesa pelo mesmo caminho
        if (fase.current === "naReuniao") dist.current = total;
        fase.current = "voltandoReuniao";
        setLegendaFora("voltando da reunião");
      } else if (fase.current === "voltandoReuniao" && mesma) {
        fase.current = "indoReuniao"; // recomeçou antes de chegar à mesa
        setLegendaFora(`em reunião: ${atual!.titulo}`);
      }

      if (fase.current === "naReuniao") {
        g.position.set(atual!.assento[0], 0, atual!.assento[1]);
        g.rotation.y = girarPara(g.rotation.y, atual!.rotacao, 1 - Math.exp(-GIRO * dt));
        poseSentado(j, falandoRef.current ? "relaxado" : (s + Math.floor(t / 9)) % 3 === 0 ? "lendo" : "relaxado", t);
        if (falandoRef.current) gesticular(j, t);
        if (papel.current) papel.current.visible = false;
        if (rotulo.current) rotulo.current.position.y = 1.95;
        return;
      }
      if (fase.current === "indoReuniao") {
        dist.current += VELOCIDADE * dt;
        if (dist.current >= total) {
          dist.current = total;
          fase.current = "naReuniao";
        }
      } else {
        dist.current -= VELOCIDADE * dt;
        if (dist.current <= 0) {
          sentarEmCasa();
          return;
        }
      }
      andar(g, j, fase.current === "voltandoReuniao" ? -1 : 1, false, dt);
      if (papel.current) papel.current.visible = false;
      return;
    }

    // ---- viagem (documento, demanda, buscar decisão) ----
    const v = viagemAtual.current;
    if (!v) {
      sentarEmCasa();
      return;
    }
    if (fase.current === "indo") {
      dist.current += VELOCIDADE * dt;
      if (dist.current >= total) {
        dist.current = total;
        fase.current = "pausa";
        pausa.current = 0;
      }
    } else if (fase.current === "pausa") {
      pausa.current += dt;
      if (pausa.current >= (v.espera ?? PAUSA_DESTINO)) fase.current = "voltando";
    } else if (fase.current === "voltando") {
      dist.current -= VELOCIDADE * dt;
      if (dist.current <= 0) {
        viagemFeita.current = v.id;
        sentarEmCasa();
        onViagemFim(v.id);
        return;
      }
    }
    // leva o papel na ida (documento/demanda) ou na volta (buscar decisão)
    const levando = (v.tipo !== "buscar" && v.tipo !== "pausa" && fase.current === "indo") || (v.tipo === "buscar" && fase.current === "voltando");
    if (papel.current) papel.current.visible = levando;
    if (fase.current === "pausa") {
      const { p } = pontoEm(caminho.current, acum.current, dist.current);
      g.position.set(p[0], 0, p[1]);
      poseConversando(j, t);
    } else {
      andar(g, j, fase.current === "voltando" ? -1 : 1, levando, dt);
    }
    if (rotulo.current) rotulo.current.position.y = 2.12;
  });

  // Um passo no caminho atual: posição, giro para a direção do passo e pose de caminhada.
  function andar(g: THREE.Group, j: Juntas, sentido: 1 | -1, levando: boolean, dt: number) {
    const { p, dir } = pontoEm(caminho.current, acum.current, dist.current);
    g.position.set(p[0], 0, p[1]);
    if (dir[0] !== 0 || dir[1] !== 0) {
      const alvo = Math.atan2(dir[0] * sentido, dir[1] * sentido);
      g.rotation.y = girarPara(g.rotation.y, alvo, 1 - Math.exp(-GIRO * dt));
    }
    poseAndando(j, (dist.current / PASSADA) * Math.PI, levando);
    if (rotulo.current) rotulo.current.position.y = 2.12;
  }

  useFrame(({ clock }, dt) => {
    if (anel.current) anel.current.scale.setScalar(1 + Math.sin(clock.elapsedTime * 4) * 0.06);
    if (aro.current) {
      const emPe = fase.current !== "sentado" && fase.current !== "naReuniao";
      aro.current.position.y = emPe ? ALTURA_ARO_EM_PE : ALTURA_ARO_SENTADO;
      if (estado.status === "trabalhando") aro.current.rotation.y += dt * 3.2;
    }
  });

  const emPausa = legendaFora === "pausa na copa";
  const andando = fora && !reuniao && !emPausa;
  const sit = situacaoDe(estado, !!reuniao, andando, emPausa);
  const corStatus = concluiu && sit.tipo === "livre" ? "#34d399" : COR_STATUS[sit.tipo];
  const textoStatus = concluiu && sit.tipo === "livre" ? "concluiu ✓" : sit.texto;
  const legenda = emPausa ? null : legendaFora ?? (estado.status === "trabalhando" ? estado.passo ?? estado.rotina ?? "trabalhando" : null);
  const mostrar = (temMesa || fora) && rotulos;

  return (
    <group ref={raiz} visible={temMesa}
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      onPointerOver={(e) => { e.stopPropagation(); document.body.style.cursor = "pointer"; }}
      onPointerOut={() => { document.body.style.cursor = ""; }}>
      <Corpo ap={ap} juntas={juntas}
        noTronco={
          <mesh ref={papel} geometry={PAPEL} material={mat("#fbfaf7", 0.9)} position={[0, 0.22, 0.36]} rotation-x={-1.1}
            visible={false} castShadow />
        } />
      <mesh geometry={SOMBRA} material={materialSombra()} position={[0, 0.007, 0]} />
      {mostrar && (
        <group ref={aro} position={[0, ALTURA_ARO_SENTADO, 0]}>
          <mesh geometry={sit.tipo === "trabalhando" ? ARCO : ARO} material={materialAro(corStatus)} />
        </group>
      )}
      {selecionado && mostrar && (
        <mesh ref={anel} position={[0, 0.012, 0]} rotation-x={-Math.PI / 2}>
          <ringGeometry args={[0.45, 0.54, 40]} />
          <meshBasicMaterial color="#3dd6f5" transparent opacity={0.9} toneMapped={false} />
        </mesh>
      )}
      <group ref={rotulo} position={[0, 1.95, 0]}>
        {(
          <Html zIndexRange={[20, 0]}>
            <div onClick={onClick} ref={caixaRotulo}
              style={{ display: mostrar ? "flex" : "none", flexDirection: "column", alignItems: "center", gap: 3, fontFamily: "system-ui", cursor: "pointer",
                transform: "translate(-50%, -100%)", width: "max-content" }}>
              <div style={{
                display: "flex", alignItems: "center", gap: 5, padding: "2px 8px", borderRadius: 999, whiteSpace: "nowrap",
                background: selecionado ? "#0a6fdc" : "rgba(8,13,24,0.86)", color: "#f1f5f9",
                border: `1px solid ${corStatus}`, fontSize: 12, fontWeight: 600, boxShadow: `0 0 10px ${corStatus}55`,
              }}>
                <span style={{ width: 7, height: 7, borderRadius: 999, background: corStatus, boxShadow: `0 0 6px ${corStatus}` }} />
                {nome}
                <span className="boneco-extra" style={{ fontWeight: 500, color: corStatus }}>{textoStatus}</span>
                {demandas > 0 && (
                  <span title={`${demandas} demandas abertas`} style={{ padding: "0 5px", borderRadius: 999, background: "#a78bfa", color: "#0b111c", fontSize: 10.5, fontWeight: 700 }}>{demandas}</span>
                )}
              </div>
              {falando && (
                <div style={{
                  position: "relative", maxWidth: 260, minWidth: 140, padding: "7px 11px", borderRadius: 14, marginBottom: 2,
                  background: "#0b1220", color: "#f1f5f9", fontSize: 12.5, lineHeight: 1.35, fontWeight: 500,
                  boxShadow: "0 6px 18px rgba(0,0,0,0.4)", border: "2px solid #3dd6f5", order: -1,
                  display: "-webkit-box", WebkitLineClamp: 4, WebkitBoxOrient: "vertical", overflow: "hidden",
                }}>
                  {falando}
                </div>
              )}
              {legenda && !falando && (
                <div className="boneco-extra" style={{
                  maxWidth: 190, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontSize: 10.5,
                  padding: "1px 7px", borderRadius: 6, background: "rgba(8,13,24,0.86)", color: "#7dd3fc",
                }}>
                  {legenda}
                </div>
              )}
            </div>
          </Html>
        )}
      </group>
    </group>
  );
}

// Sentado e falando: mexe a mão e a cabeça, como quem explica.
function gesticular(j: Juntas, t: number) {
  j.ombroD?.rotation.set(-0.75 + Math.sin(t * 4.2) * 0.18, 0, -0.25);
  j.cotoveloD?.rotation.set(-1.1 + Math.sin(t * 5.1) * 0.25, 0, 0.3);
  if (j.cabeca) j.cabeca.rotation.set(Math.sin(t * 3.3) * 0.06, Math.sin(t * 1.4) * 0.18, 0);
}

// ---------- o gestor, na sala dele ----------

export function Gestor({ pendentes, onClick, rotulos = true }: { pendentes: number; onClick: () => void; rotulos?: boolean }) {
  const ap = useMemo(() => aparenciaDe(ID_GESTOR, "#1f2a44"), []);
  const juntas = useRef<Juntas>({});
  useFrame(({ clock }) => {
    poseSentado(juntas.current, "lendo", clock.elapsedTime);
  });
  return (
    <group position={[CADEIRA_GESTOR[0], 0, CADEIRA_GESTOR[1]]}
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      onPointerOver={(e) => { e.stopPropagation(); document.body.style.cursor = "pointer"; }}
      onPointerOut={() => { document.body.style.cursor = ""; }}>
      <Corpo ap={ap} juntas={juntas}
        noTronco={
          <mesh geometry={PAPEL} material={mat("#fbfaf7", 0.9)} position={[0, 0.2, 0.42]} rotation-x={-1.15} castShadow />
        } />
      <mesh geometry={SOMBRA} material={materialSombra()} position={[0, 0.007, 0]} />
      <group position={[0, 1.78, 0]}>
        <Html center zIndexRange={[20, 0]}>
          <div onClick={onClick} style={{
            display: rotulos ? "flex" : "none", alignItems: "center", gap: 6, padding: "3px 10px", borderRadius: 999, whiteSpace: "nowrap",
            fontFamily: "system-ui", fontSize: 12.5, fontWeight: 700, cursor: "pointer",
            background: "rgba(8,13,24,0.88)", color: pendentes > 0 ? "#fbbf24" : "#f1f5f9",
            border: `1px solid ${pendentes > 0 ? "#fbbf24" : "#3dd6f5"}`, boxShadow: "0 1px 3px rgba(0,0,0,0.3)",
          }}>
            Você · {pendentes > 0 ? `${pendentes} aguardando você` : "nada pendente"}
          </div>
        </Html>
      </group>
    </group>
  );
}
