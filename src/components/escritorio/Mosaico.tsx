"use client";

// Modo "Mosaico" (CFTV): várias câmeras ao vivo na mesma tela, num único Canvas e numa única cena.
// Cada visão tem a sua câmera e uma textura própria (render target); a cada quadro só uma ou duas visões são
// redesenhadas (rodízio), e todas são coladas na tela com uma passada ortográfica barata. O custo fica perto de
// uma ou duas renderizações da cena por quadro, não de seis.
import { useEffect, useMemo } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { CAMERA } from "@/lib/escritorio/modelo";

export type Retangulo = { x: number; y: number; w: number; h: number };

// Grade das visões em pixels CSS do Canvas (o mesmo cálculo posiciona os rótulos em HTML).
export function layoutMosaico(largura: number, altura: number, n: number, topo = 64): Retangulo[] {
  const cols = largura >= 900 ? 3 : largura >= 560 ? 2 : n > 4 ? 2 : 2;
  const linhas = Math.ceil(n / cols);
  const gap = 6;
  const pad = 8;
  const w = (largura - pad * 2 - gap * (cols - 1)) / cols;
  const h = (altura - topo - pad - gap * (linhas - 1)) / linhas;
  return Array.from({ length: n }, (_, i) => ({
    x: pad + (i % cols) * (w + gap),
    y: topo + Math.floor(i / cols) * (h + gap),
    w,
    h,
  }));
}

export function Mosaico({ visoes, topo, porQuadro = 2 }: { visoes: string[]; topo: number; porQuadro?: number }) {
  const { gl, scene, size } = useThree();
  const dpr = Math.min(gl.getPixelRatio(), 1.5);
  const rets = useMemo(() => layoutMosaico(size.width, size.height, visoes.length, topo), [size.width, size.height, visoes.length, topo]);

  const recursos = useMemo(() => {
    const cams = visoes.map((id) => {
      const v = CAMERA[id]?.vista ?? CAMERA.geral.vista;
      const c = new THREE.PerspectiveCamera(52, 1, 0.1, 300);
      c.position.set(v[0], v[1], v[2]);
      c.lookAt(v[3], v[4], v[5]);
      return c;
    });
    // 8 bits em sRGB (funciona em qualquer celular); sem tone mapping no alvo, a imagem fica um pouco mais "crua", como CFTV
    const alvos = visoes.map(() => {
      const rt = new THREE.WebGLRenderTarget(4, 4, { samples: 0 });
      rt.texture.colorSpace = THREE.SRGBColorSpace;
      return rt;
    });
    const tela = new THREE.Scene();
    const orto = new THREE.OrthographicCamera(0, 1, 0, 1, -1, 1);
    const quadros = alvos.map((rt) => {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: rt.texture, toneMapped: false }));
      tela.add(m);
      return m;
    });
    return { cams, alvos, tela, orto, quadros };
  }, [visoes, dpr]);

  // tamanho das texturas, aspecto das câmeras e posição dos quadros (em pixels, y para baixo)
  useEffect(() => {
    const { cams, alvos, orto, quadros } = recursos;
    rets.forEach((r, i) => {
      cams[i].aspect = r.w / r.h;
      cams[i].updateProjectionMatrix();
      alvos[i].setSize(Math.max(4, Math.round(r.w * dpr)), Math.max(4, Math.round(r.h * dpr)));
      quadros[i].position.set(r.x + r.w / 2, r.y + r.h / 2, 0);
      quadros[i].scale.set(r.w, -r.h, 1);
    });
    orto.left = 0;
    orto.right = size.width;
    orto.top = 0;
    orto.bottom = size.height;
    orto.updateProjectionMatrix();
  }, [recursos, rets, size.width, size.height, dpr]);

  useEffect(() => () => {
    recursos.alvos.forEach((a) => a.dispose());
    recursos.quadros.forEach((q) => { q.geometry.dispose(); (q.material as THREE.Material).dispose(); });
  }, [recursos]);

  // sombras: atualizadas uma vez por quadro (e não a cada visão)
  useEffect(() => {
    gl.shadowMap.autoUpdate = false;
    return () => { gl.shadowMap.autoUpdate = true; };
  }, [gl]);

  const prox = useMemo(() => ({ i: 0, primeira: true }), []);
  useFrame(() => {
    const { cams, alvos, tela, orto } = recursos;
    if (!cams.length) return;
    gl.shadowMap.needsUpdate = true;
    const n = prox.primeira ? cams.length : Math.min(porQuadro, cams.length);
    prox.primeira = false;
    for (let k = 0; k < n; k++) {
      const i = prox.i % cams.length;
      prox.i++;
      gl.setRenderTarget(alvos[i]);
      gl.render(scene, cams[i]);
      gl.shadowMap.needsUpdate = false;
    }
    gl.setRenderTarget(null);
    gl.setClearColor("#0b0f14", 1);
    gl.clear();
    gl.render(tela, orto);
  }, 1);

  return null;
}
